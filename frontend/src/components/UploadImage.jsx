import React, { useState, useRef } from "react";

const LISTING_URL = import.meta.env.VITE_API_GATEWAY_URL;

export default function UploadImage({ listingId, onUploaded }) {
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress]   = useState(0);   // 0-100
  const [preview, setPreview]     = useState(null); // object URL while uploading
  const [imageUrl, setImageUrl]   = useState(null); // final URL from server
  const [error, setError]         = useState("");
  const inputRef = useRef(null);

  const handleFileChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Show local preview immediately
    const localUrl = URL.createObjectURL(file);
    setPreview(localUrl);
    setImageUrl(null);
    setError("");

    const token = localStorage.getItem("jwt");
    const formData = new FormData();
    formData.append("image", file);

    setUploading(true);
    setProgress(0);

    try {
      await new Promise((resolve, reject) => {
        const xhr = new XMLHttpRequest();

        xhr.upload.addEventListener("progress", (ev) => {
          if (ev.lengthComputable) {
            setProgress(Math.round((ev.loaded / ev.total) * 100));
          }
        });

        xhr.addEventListener("load", () => {
          try {
            const data = JSON.parse(xhr.responseText);
            if (xhr.status >= 200 && xhr.status < 300) {
              setProgress(100);
              setImageUrl(data.imageUrl);
              setPreview(null);
              URL.revokeObjectURL(localUrl);
              onUploaded?.(data.listing);
              resolve();
            } else {
              reject(new Error(data.details || data.error || "Upload failed"));
            }
          } catch {
            reject(new Error("Invalid server response"));
          }
        });

        xhr.addEventListener("error",  () => reject(new Error("Network error")));
        xhr.addEventListener("abort",  () => reject(new Error("Upload aborted")));

        xhr.open("POST", `${LISTING_URL}/listings/${listingId}/image`);
        xhr.setRequestHeader("Authorization", `Bearer ${token}`);
        xhr.send(formData);
      });
    } catch (err) {
      setError(err.message);
      setPreview(null);
      URL.revokeObjectURL(localUrl);
    } finally {
      setUploading(false);
      // Reset input so the same file can be re-selected after an error
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  const displayUrl = preview;

  return (
    <div className="space-y-3">
      {/* Image preview */}
      {displayUrl && (
        <div className="relative w-full aspect-video rounded-xl overflow-hidden border border-white/10 bg-white/3">
          <img
            src={displayUrl}
            alt="Listing preview"
            className="w-full h-full object-cover"
          />
          {uploading && (
            <div className="absolute inset-0 bg-black/50 flex flex-col items-center justify-center gap-2">
              <span className="text-white text-sm font-semibold">{progress}%</span>
              <div className="w-2/3 h-1.5 rounded-full bg-white/20 overflow-hidden">
                <div
                  className="h-full bg-emerald-400 rounded-full transition-all duration-200"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>
          )}
        </div>
      )}

      {/* Progress bar (no preview yet) */}
      {uploading && !displayUrl && (
        <div className="w-full h-1.5 rounded-full bg-white/10 overflow-hidden">
          <div
            className="h-full bg-emerald-400 rounded-full transition-all duration-200"
            style={{ width: `${progress}%` }}
          />
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="flex items-start gap-2 px-3.5 py-3 rounded-xl bg-red-500/10 border border-red-500/25 text-red-300 text-sm">
          ⚠️ {error}
        </div>
      )}

      {/* Success note */}
      {imageUrl && !uploading && (
        <p className="text-xs text-emerald-400 font-medium">Image uploaded successfully.</p>
      )}

      {/* File input button */}
      <label className={`
        inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold rounded-xl border cursor-pointer transition-all
        ${uploading
          ? "opacity-50 cursor-not-allowed border-white/10 text-slate-500 bg-white/3"
          : "border-white/10 text-slate-300 bg-white/4 hover:bg-emerald-500/10 hover:border-emerald-500/30 hover:text-emerald-400"
        }
      `}>
        <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none"
          stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
          <polyline points="17 8 12 3 7 8" />
          <line x1="12" y1="3" x2="12" y2="15" />
        </svg>
        {uploading ? `Uploading… ${progress}%` : imageUrl ? "Replace Image" : "Upload Image"}
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          className="hidden"
          disabled={uploading}
          onChange={handleFileChange}
        />
      </label>
    </div>
  );
}
