"use client";

import { useRef, useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Upload, Link2, Loader2, CheckCircle2, X } from "lucide-react";

interface MediaUploaderProps {
  kind: "image" | "audio";
  value: string;
  onChange: (url: string) => void;
  folder?: string;
}

export function MediaUploader({ kind, value, onChange, folder = "questions" }: MediaUploaderProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  // Audio upload is disabled (Blob store is private); audio is URL-only.
  const [mode, setMode] = useState<"upload" | "url">(kind === "audio" ? "url" : "upload");
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const [warning, setWarning] = useState("");

  const accept = kind === "image" ? "image/*" : "audio/*";
  const maxSizeMB = kind === "image" ? 5 : 15;

  const handleFile = async (file: File) => {
    setError("");
    setWarning("");

    if (kind === "image" && !file.type.startsWith("image/")) {
      setError("Please select an image file");
      return;
    }
    if (kind === "audio" && !file.type.startsWith("audio/")) {
      setError("Please select an audio file");
      return;
    }

    if (file.size > maxSizeMB * 1024 * 1024) {
      setError(`File too large. Max ${maxSizeMB} MB allowed.`);
      return;
    }

    // For audio: enforce 2-minute (120 sec) maximum duration
    if (kind === "audio") {
      try {
        const duration = await getAudioDuration(file);
        if (duration > 120) {
          setError(
            `Audio is ${duration.toFixed(1)} seconds long. Maximum allowed is 2 minutes (120 seconds). Please trim it first.`
          );
          return;
        }
        if (duration > 0) {
          setWarning(`Audio length: ${formatDuration(duration)}`);
        }
      } catch {
        // Couldn't read duration — let server validate
      }
    }

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("folder", folder);

      const res = await fetch("/api/upload-file", {
        method: "POST",
        body: formData,
      });
      const data = await res.json();

      if (data.success) {
        onChange(data.data.url);
        if (data.data.warning) setWarning((prev) => prev ? `${prev} | ${data.data.warning}` : data.data.warning);
      } else {
        setError(data.error || "Upload failed");
      }
    } catch {
      setError("Upload failed. Please try again.");
    } finally {
      setUploading(false);
    }
  };

  const getAudioDuration = (file: File): Promise<number> =>
    new Promise((resolve, reject) => {
      const audio = new Audio();
      audio.preload = "metadata";
      audio.onloadedmetadata = () => {
        URL.revokeObjectURL(audio.src);
        resolve(audio.duration);
      };
      audio.onerror = () => {
        URL.revokeObjectURL(audio.src);
        reject(new Error("Could not read audio duration"));
      };
      audio.src = URL.createObjectURL(file);
    });

  const formatDuration = (sec: number): string => {
    const m = Math.floor(sec / 60);
    const s = Math.floor(sec % 60);
    return `${m}:${s.toString().padStart(2, "0")}`;
  };

  const clearFile = () => {
    onChange("");
    setError("");
    setWarning("");
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const hasValue = !!value;
  const isDataUrl = value.startsWith("data:");

  return (
    <div className="space-y-2">
      {/* Mode Toggle — hidden for audio (URL-only) */}
      {kind !== "audio" && (
        <div className="inline-flex rounded-lg bg-gray-100 p-1">
          <button
            type="button"
            onClick={() => setMode("upload")}
            className={`flex items-center gap-1.5 rounded-md px-3 py-1 text-xs font-medium transition ${
              mode === "upload" ? "bg-white text-indigo-600 shadow-sm" : "text-gray-500"
            }`}
          >
            <Upload className="h-3.5 w-3.5" />
            Upload File
          </button>
          <button
            type="button"
            onClick={() => setMode("url")}
            className={`flex items-center gap-1.5 rounded-md px-3 py-1 text-xs font-medium transition ${
              mode === "url" ? "bg-white text-indigo-600 shadow-sm" : "text-gray-500"
            }`}
          >
            <Link2 className="h-3.5 w-3.5" />
            Paste URL
          </button>
        </div>
      )}

      {/* Upload mode */}
      {mode === "upload" && (
        <div>
          <input
            ref={fileInputRef}
            type="file"
            accept={accept}
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) handleFile(file);
            }}
            className="hidden"
          />
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              className="gap-2"
            >
              {uploading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Uploading...
                </>
              ) : hasValue ? (
                <>
                  <CheckCircle2 className="h-4 w-4 text-green-600" />
                  Replace File
                </>
              ) : (
                <>
                  <Upload className="h-4 w-4" />
                  Choose {kind === "image" ? "Image" : "Audio"} File
                </>
              )}
            </Button>
            {hasValue && (
              <Button type="button" variant="ghost" size="sm" onClick={clearFile}>
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>
          <p className="mt-1 text-xs text-gray-500">
            Max {maxSizeMB} MB. {kind === "image" ? "JPG, PNG, WebP" : "MP3, WAV, OGG, WebM"}.
          </p>
        </div>
      )}

      {/* URL mode */}
      {mode === "url" && (
        <Input
          value={value && !isDataUrl ? value : ""}
          onChange={(e) => onChange(e.target.value)}
          placeholder={
            kind === "image"
              ? "https://example.com/image.jpg"
              : "https://example.com/audio.mp3"
          }
        />
      )}

      {/* Error */}
      {error && (
        <p className="rounded-md bg-red-50 p-2 text-xs text-red-700">⚠ {error}</p>
      )}

      {/* Warning (e.g., fallback method used) */}
      {warning && (
        <p className="rounded-md bg-amber-50 p-2 text-xs text-amber-800">ℹ {warning}</p>
      )}

      {/* Preview */}
      {hasValue && (
        <div className="mt-2 rounded-lg border border-gray-200 bg-gray-50 p-2">
          {kind === "image" ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={value}
              alt="Preview"
              className="max-h-48 rounded border bg-white"
            />
          ) : (
            <audio controls src={value} className="w-full" />
          )}
          <p className="mt-1 truncate text-[10px] text-gray-400">
            {isDataUrl ? "Inline file (no cloud storage)" : value}
          </p>
        </div>
      )}
    </div>
  );
}
