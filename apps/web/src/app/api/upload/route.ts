import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth-utils";
import crypto from "crypto";

// POST /api/upload — generate presigned S3 upload URL
// Client uploads directly to S3 using this URL (no server bandwidth needed)
export async function POST(req: NextRequest) {
  const { user, error } = await requireAuth();
  if (error) return error;

  const body = await req.json();
  const { fileName, fileType, folder } = body;

  if (!fileName || !fileType) {
    return NextResponse.json(
      { success: false, error: "fileName and fileType are required" },
      { status: 400 }
    );
  }

  const bucket = process.env.AWS_S3_BUCKET;
  const region = process.env.AWS_REGION || "ap-south-1";
  const accessKey = process.env.AWS_ACCESS_KEY_ID;
  const secretKey = process.env.AWS_SECRET_ACCESS_KEY;

  if (!bucket || !accessKey || !secretKey) {
    // Fallback: return local upload path for development
    const localPath = `/uploads/${folder || "misc"}/${Date.now()}-${fileName}`;
    return NextResponse.json({
      success: true,
      data: {
        uploadUrl: `/api/upload/local`,
        fileUrl: localPath,
        method: "local",
      },
    });
  }

  // Generate unique file key
  const ext = fileName.split(".").pop() || "bin";
  const fileKey = `${folder || "uploads"}/${user!.id}/${Date.now()}-${crypto.randomBytes(4).toString("hex")}.${ext}`;

  // Generate presigned PUT URL using AWS Signature V4
  const presignedUrl = generatePresignedUrl({
    bucket,
    region,
    accessKey,
    secretKey,
    fileKey,
    fileType,
    expiresIn: 300, // 5 minutes
  });

  const fileUrl = `https://${bucket}.s3.${region}.amazonaws.com/${fileKey}`;

  return NextResponse.json({
    success: true,
    data: {
      uploadUrl: presignedUrl,
      fileUrl,
      fileKey,
      method: "s3",
    },
  });
}

// Simple presigned URL generator (avoids full AWS SDK dependency)
function generatePresignedUrl({
  bucket, region, accessKey, secretKey, fileKey, fileType, expiresIn,
}: {
  bucket: string; region: string; accessKey: string; secretKey: string;
  fileKey: string; fileType: string; expiresIn: number;
}): string {
  const host = `${bucket}.s3.${region}.amazonaws.com`;
  const now = new Date();
  const dateStamp = now.toISOString().replace(/[-:]/g, "").split(".")[0] + "Z";
  const dateOnly = dateStamp.slice(0, 8);
  const credentialScope = `${dateOnly}/${region}/s3/aws4_request`;
  const credential = `${accessKey}/${credentialScope}`;

  const params = new URLSearchParams({
    "X-Amz-Algorithm": "AWS4-HMAC-SHA256",
    "X-Amz-Credential": credential,
    "X-Amz-Date": dateStamp,
    "X-Amz-Expires": String(expiresIn),
    "X-Amz-SignedHeaders": "host;content-type",
  });

  const canonicalRequest = [
    "PUT",
    `/${fileKey}`,
    params.toString(),
    `content-type:${fileType}\nhost:${host}\n`,
    "content-type;host",
    "UNSIGNED-PAYLOAD",
  ].join("\n");

  const stringToSign = [
    "AWS4-HMAC-SHA256",
    dateStamp,
    credentialScope,
    crypto.createHash("sha256").update(canonicalRequest).digest("hex"),
  ].join("\n");

  const signingKey = getSignatureKey(secretKey, dateOnly, region, "s3");
  const signature = crypto.createHmac("sha256", signingKey).update(stringToSign).digest("hex");

  params.set("X-Amz-Signature", signature);

  return `https://${host}/${fileKey}?${params.toString()}`;
}

function getSignatureKey(key: string, dateStamp: string, region: string, service: string): Buffer {
  const kDate = crypto.createHmac("sha256", `AWS4${key}`).update(dateStamp).digest();
  const kRegion = crypto.createHmac("sha256", kDate).update(region).digest();
  const kService = crypto.createHmac("sha256", kRegion).update(service).digest();
  return crypto.createHmac("sha256", kService).update("aws4_request").digest();
}
