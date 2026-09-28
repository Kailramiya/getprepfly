import { createHash, createHmac } from "node:crypto";

// Cloudflare R2 is S3-compatible; this is a minimal AWS SigV4 signer for PUT so we don't
// need the full @aws-sdk/client-s3 dependency for a handful of simple uploads.
const sha256Hex = (buf: Buffer) => createHash("sha256").update(buf).digest("hex");
const hmac = (key: Buffer | string, data: string) => createHmac("sha256", key).update(data, "utf8").digest();

export function isR2Configured(): boolean {
  return !!(
    process.env.R2_ACCOUNT_ID &&
    process.env.R2_ACCESS_KEY_ID &&
    process.env.R2_SECRET_ACCESS_KEY &&
    process.env.R2_BUCKET &&
    process.env.R2_PUBLIC_URL
  );
}

function env(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`Missing env var ${name}`);
  return v;
}

/**
 * Uploads a buffer to Cloudflare R2 under `key` and returns its public URL.
 * A PUT to an existing key overwrites it (no accidental duplicates like Blob's
 * addRandomSuffix default), so callers pick a stable or unique key deliberately.
 */
export async function putToR2(key: string, body: Buffer, contentType: string): Promise<string> {
  const accountId = env("R2_ACCOUNT_ID");
  const accessKeyId = env("R2_ACCESS_KEY_ID");
  const secretAccessKey = env("R2_SECRET_ACCESS_KEY");
  const bucket = env("R2_BUCKET");
  const publicUrl = env("R2_PUBLIC_URL").replace(/\/$/, "");

  const host = `${accountId}.r2.cloudflarestorage.com`;
  const now = new Date();
  const amzDate = now.toISOString().replace(/[:-]|\.\d{3}/g, "");
  const dateStamp = amzDate.slice(0, 8);
  const payloadHash = sha256Hex(body);

  const canonicalHeaders = `content-type:${contentType}\nhost:${host}\nx-amz-content-sha256:${payloadHash}\nx-amz-date:${amzDate}\n`;
  const signedHeaders = "content-type;host;x-amz-content-sha256;x-amz-date";
  const canonicalRequest = ["PUT", `/${bucket}/${key}`, "", canonicalHeaders, signedHeaders, payloadHash].join("\n");

  const scope = `${dateStamp}/auto/s3/aws4_request`;
  const stringToSign = ["AWS4-HMAC-SHA256", amzDate, scope, sha256Hex(Buffer.from(canonicalRequest, "utf8"))].join("\n");

  const kDate = hmac(`AWS4${secretAccessKey}`, dateStamp);
  const kRegion = hmac(kDate, "auto");
  const kService = hmac(kRegion, "s3");
  const kSigning = hmac(kService, "aws4_request");
  const signature = hmac(kSigning, stringToSign).toString("hex");

  const authorization = `AWS4-HMAC-SHA256 Credential=${accessKeyId}/${scope}, SignedHeaders=${signedHeaders}, Signature=${signature}`;

  const res = await fetch(`https://${host}/${bucket}/${key}`, {
    method: "PUT",
    headers: { "content-type": contentType, "x-amz-content-sha256": payloadHash, "x-amz-date": amzDate, authorization },
    body: body as BodyInit,
  });
  if (!res.ok) throw new Error(`R2 PUT ${key} -> ${res.status} ${await res.text().catch(() => "")}`);

  return `${publicUrl}/${key}`;
}
