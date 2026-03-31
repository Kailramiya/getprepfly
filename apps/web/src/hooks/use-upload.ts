"use client";

import { useState } from "react";

interface UploadResult {
  fileUrl: string;
  fileKey?: string;
}

export function useUpload() {
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const upload = async (
    file: File | Blob,
    folder: string = "uploads",
    fileName?: string
  ): Promise<UploadResult | null> => {
    setUploading(true);
    setProgress(0);
    setError(null);

    try {
      // Step 1: Get presigned URL from our API
      const name = fileName || (file instanceof File ? file.name : `recording-${Date.now()}.webm`);
      const res = await fetch("/api/upload", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fileName: name,
          fileType: file.type || "application/octet-stream",
          folder,
        }),
      });

      const data = await res.json();
      if (!data.success) {
        throw new Error(data.error || "Failed to get upload URL");
      }

      const { uploadUrl, fileUrl, fileKey, method } = data.data;

      if (method === "s3") {
        // Step 2: Upload directly to S3
        const uploadRes = await fetch(uploadUrl, {
          method: "PUT",
          headers: { "Content-Type": file.type || "application/octet-stream" },
          body: file,
        });

        if (!uploadRes.ok) {
          throw new Error("Upload to S3 failed");
        }
      }

      setProgress(100);
      return { fileUrl, fileKey };
    } catch (err: any) {
      setError(err.message || "Upload failed");
      return null;
    } finally {
      setUploading(false);
    }
  };

  // Upload audio blob (from recorder)
  const uploadAudio = (blob: Blob) => upload(blob, "audio", `recording-${Date.now()}.webm`);

  // Upload image
  const uploadImage = (file: File) => upload(file, "images");

  return { upload, uploadAudio, uploadImage, uploading, progress, error };
}
