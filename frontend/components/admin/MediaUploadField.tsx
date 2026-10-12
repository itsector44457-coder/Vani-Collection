"use client";

import { useState } from "react";
import { ApiError, uploadAdminMedia } from "@/lib/api-client";

export default function MediaUploadField({
  type,
  onUploaded,
  disabled = false,
  multiple,
}: {
  type: "image" | "video";
  onUploaded: (urls: string[]) => void;
  disabled?: boolean;
  multiple?: boolean;
}) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const isImage = type === "image";

  const handleFiles = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files ?? []);
    event.target.value = "";
    setError(null);
    if (!files.length) return;
    if (files.some((file) => !file.type.startsWith(`${type}/`))) {
      setError(`Choose ${isImage ? "image" : "video"} files only.`);
      return;
    }
    const maxSize = isImage ? 8 * 1024 * 1024 : 50 * 1024 * 1024;
    if (files.some((file) => file.size > maxSize)) {
      setError(`Each ${type} must be no larger than ${isImage ? "8 MB" : "50 MB"}.`);
      return;
    }
    setUploading(true);
    try {
      onUploaded(await uploadAdminMedia(files, type));
    } catch (cause) {
      setError(cause instanceof ApiError ? cause.message : `Could not upload ${type} files.`);
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="mt-2">
      <label className="inline-flex cursor-pointer items-center rounded-lg border border-[#ebe6de] bg-white px-3 py-2 text-xs font-semibold text-stone-700 transition hover:border-[#dfc28c] has-[:disabled]:cursor-not-allowed has-[:disabled]:opacity-60">
        <input
          type="file"
          accept={isImage ? "image/*" : "video/*"}
          multiple={multiple ?? isImage}
          disabled={disabled || uploading}
          onChange={handleFiles}
          className="sr-only"
          aria-label={`Upload ${isImage ? "images" : "a video"}`}
        />
        {uploading ? "Uploading…" : `Upload ${isImage ? "image(s)" : "video"}`}
      </label>
      <span className="ml-2 text-[11px] text-stone-500">
        {isImage ? "Up to 6 files, 8 MB each" : "One video, up to 50 MB"}
      </span>
      {error && <p role="alert" className="mt-1 text-xs text-rose-700">{error}</p>}
    </div>
  );
}
