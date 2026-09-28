// Migrates every Vercel Blob URL referenced in the database to Cloudflare R2, reusing the
// same object path as the R2 key so the mapping is exact — no name-guessing.
//
// Usage (from apps/web):
//   node scripts/migrate-blob-to-r2.mjs                # dry run — reads only, writes nothing
//   node scripts/migrate-blob-to-r2.mjs --apply         # real run — uploads to R2, updates DB
//   node scripts/migrate-blob-to-r2.mjs --apply --limit=20   # real run, first 20 files only
//
// Requires in .env: BLOB_READ_WRITE_TOKEN, R2_ACCOUNT_ID, R2_ACCESS_KEY_ID,
// R2_SECRET_ACCESS_KEY, R2_BUCKET, R2_PUBLIC_URL.
import { createHash, createHmac } from "node:crypto";
import { PrismaClient } from "@prisma/client";

const APPLY = process.argv.includes("--apply");
const LIMIT = Number(process.argv.find((a) => a.startsWith("--limit="))?.split("=")[1] ?? Infinity);

const env = (name) => {
  const v = process.env[name];
  if (!v) throw new Error(`Missing env var ${name}`);
  return v;
};
const BLOB_TOKEN = env("BLOB_READ_WRITE_TOKEN");
const R2_ACCOUNT_ID = env("R2_ACCOUNT_ID");
const R2_ACCESS_KEY_ID = env("R2_ACCESS_KEY_ID");
const R2_SECRET_ACCESS_KEY = env("R2_SECRET_ACCESS_KEY");
const R2_BUCKET = env("R2_BUCKET");
const R2_PUBLIC_URL = env("R2_PUBLIC_URL").replace(/\/$/, "");
const R2_ENDPOINT = `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`;

const db = new PrismaClient();

// ---- minimal AWS SigV4 signer (R2 uses the same scheme as S3) ----
const sha256Hex = (buf) => createHash("sha256").update(buf).digest("hex");
const hmac = (key, data) => createHmac("sha256", key).update(data, "utf8").digest();

function signedPutHeaders(key, body, contentType) {
  const host = `${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`;
  const now = new Date();
  const amzDate = now.toISOString().replace(/[:-]|\.\d{3}/g, "");
  const dateStamp = amzDate.slice(0, 8);
  const payloadHash = sha256Hex(body);

  const canonicalHeaders = `content-type:${contentType}\nhost:${host}\nx-amz-content-sha256:${payloadHash}\nx-amz-date:${amzDate}\n`;
  const signedHeaders = "content-type;host;x-amz-content-sha256;x-amz-date";
  const canonicalRequest = ["PUT", `/${R2_BUCKET}/${key}`, "", canonicalHeaders, signedHeaders, payloadHash].join("\n");

  const scope = `${dateStamp}/auto/s3/aws4_request`;
  const stringToSign = ["AWS4-HMAC-SHA256", amzDate, scope, sha256Hex(Buffer.from(canonicalRequest, "utf8"))].join("\n");

  const kDate = hmac(`AWS4${R2_SECRET_ACCESS_KEY}`, dateStamp);
  const kRegion = hmac(kDate, "auto");
  const kService = hmac(kRegion, "s3");
  const kSigning = hmac(kService, "aws4_request");
  const signature = hmac(kSigning, stringToSign).toString("hex");

  const authorization = `AWS4-HMAC-SHA256 Credential=${R2_ACCESS_KEY_ID}/${scope}, SignedHeaders=${signedHeaders}, Signature=${signature}`;
  return { "content-type": contentType, "x-amz-content-sha256": payloadHash, "x-amz-date": amzDate, authorization };
}

async function putToR2(key, body, contentType) {
  const headers = signedPutHeaders(key, body, contentType);
  const res = await fetch(`${R2_ENDPOINT}/${R2_BUCKET}/${key}`, { method: "PUT", headers, body });
  if (!res.ok) throw new Error(`R2 PUT ${key} -> ${res.status} ${await res.text().catch(() => "")}`);
}

// ---- source ----
// Two shapes are stored in the DB:
//   1. a direct Blob URL (public files)
//   2. "/api/media-proxy?url=<encoded blob url>" (private files, proxied server-side
//      through BLOB_READ_WRITE_TOKEN because the browser has no token of its own)
function realBlobUrlOf(stored) {
  if (!stored) return null;
  if (/^https:\/\/[^/]*blob\.vercel-storage\.com\//.test(stored)) return stored;
  const proxied = stored.match(/^\/api\/media-proxy\?url=(.+)$/);
  if (proxied) {
    const inner = decodeURIComponent(proxied[1]);
    if (/^https:\/\/[^/]*blob\.vercel-storage\.com\//.test(inner)) return inner;
  }
  return null;
}
function blobKeyOf(stored) {
  const url = realBlobUrlOf(stored);
  return url ? decodeURIComponent(new URL(url).pathname.slice(1)) : null;
}

async function downloadFromBlob(stored) {
  const url = realBlobUrlOf(stored);
  const res = await fetch(url, { headers: { Authorization: `Bearer ${BLOB_TOKEN}` } });
  if (!res.ok) throw new Error(`Blob GET ${url} -> ${res.status}`);
  const buf = Buffer.from(await res.arrayBuffer());
  const contentType = res.headers.get("content-type") || "application/octet-stream";
  return { buf, contentType };
}

// ---- rows to migrate: every (model, column) that can hold a Blob URL ----
const SOURCES = [
  { model: "centre", column: "logo" },
  { model: "user", column: "avatar" },
  { model: "question", column: "audioUrl" },
  { model: "question", column: "imageUrl" },
  { model: "attempt", column: "responseAudio" },
];

async function collectTargets() {
  const targets = [];
  for (const { model, column } of SOURCES) {
    const rows = await db[model].findMany({
      where: { [column]: { contains: "blob.vercel-storage.com" } },
      select: { id: true, [column]: true },
    });
    for (const row of rows) targets.push({ model, column, id: row.id, url: row[column] });
  }
  return targets;
}

async function main() {
  const targets = await collectTargets();
  console.log(`Found ${targets.length} DB references to Vercel Blob across ${SOURCES.length} columns.`);

  const byUrl = new Map(); // url -> { key, bytes, contentType, ok, error }
  let bytes = 0;
  let migrated = 0;
  let skipped = 0;
  let failed = 0;
  let clearedDead = 0;

  for (const t of targets) {
    if (migrated + skipped + failed >= LIMIT) break;
    const key = blobKeyOf(t.url);
    if (!key) {
      console.log(`  SKIP (not a Blob URL) ${t.model}.${t.column} ${t.id}: ${t.url}`);
      skipped++;
      continue;
    }

    let result = byUrl.get(t.url);
    if (!result) {
      try {
        const { buf, contentType } = await downloadFromBlob(t.url);
        result = { key, bytes: buf.length, contentType, buf };
        if (APPLY) await putToR2(key, buf, contentType);
        byUrl.set(t.url, result);
        bytes += buf.length;
        migrated++;
        console.log(`  ${APPLY ? "MIGRATED" : "WOULD MIGRATE"} ${key} (${(buf.length / 1024).toFixed(1)} KB)`);
      } catch (err) {
        const isDead404 = /-> 404$/.test(err.message);
        console.error(`  FAIL ${t.model}.${t.column} ${t.id} (${t.url}): ${err.message}`);
        failed++;
        // The source file is gone from Blob, not something this migration can recover.
        // Clear the dangling reference so the UI shows "no recording" instead of a dead link.
        if (isDead404 && APPLY) {
          await db[t.model].update({ where: { id: t.id }, data: { [t.column]: null } });
          clearedDead++;
        }
        continue;
      }
    }

    if (APPLY) {
      const newUrl = `${R2_PUBLIC_URL}/${result.key}`;
      await db[t.model].update({ where: { id: t.id }, data: { [t.column]: newUrl } });
    }
  }

  console.log("\n--- Summary ---");
  console.log(`Mode: ${APPLY ? "APPLY (real run)" : "DRY RUN (nothing written)"}`);
  console.log(`Distinct files: ${byUrl.size}`);
  console.log(`Total size: ${(bytes / 1024 / 1024).toFixed(2)} MB`);
  console.log(`DB references processed: ${migrated + skipped + failed} / ${targets.length}`);
  console.log(`Skipped (not a Blob URL): ${skipped}`);
  console.log(`Failed: ${failed}`);
  console.log(`Dead links cleared (404 from Blob, unrecoverable): ${clearedDead}`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(() => db.$disconnect());
