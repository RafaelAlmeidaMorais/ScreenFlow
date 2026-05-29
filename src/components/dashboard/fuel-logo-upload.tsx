"use client";

import { useState, useRef } from "react";

interface FuelLogoUploadProps {
  logoUrl?: string;
  onLogoChange: (url: string | undefined) => void;
}

export function FuelLogoUpload({ logoUrl, onLogoChange }: FuelLogoUploadProps) {
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState("");
  const [dragging, setDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  async function uploadFile(file: File) {
    setError("");

    if (!file.type.startsWith("image/")) {
      setError("Apenas imagens");
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      setError("Máximo 10MB");
      return;
    }

    setUploading(true);
    setProgress(0);

    try {
      const presignRes = await fetch("/api/upload", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          filename: file.name,
          contentType: file.type,
          fileSize: file.size,
        }),
      });

      const presignData = await presignRes.json();
      if (!presignRes.ok) {
        setError(presignData.error || "Erro no upload");
        setUploading(false);
        return;
      }

      await new Promise<void>((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.upload.onprogress = (e) => {
          if (e.lengthComputable) setProgress(Math.round((e.loaded / e.total) * 100));
        };
        xhr.onload = () => (xhr.status >= 200 && xhr.status < 300 ? resolve() : reject(new Error("Upload falhou")));
        xhr.onerror = () => reject(new Error("Erro de rede"));
        xhr.open("PUT", presignData.uploadUrl);
        xhr.setRequestHeader("Content-Type", file.type);
        xhr.send(file);
      });

      onLogoChange(presignData.publicUrl);
    } catch {
      setError("Erro ao enviar");
    } finally {
      setUploading(false);
      setProgress(0);
    }
  }

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) uploadFile(file);
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) uploadFile(file);
  }

  return (
    <div className="w-full">
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        onChange={handleFile}
        className="hidden"
      />

      {logoUrl && !uploading ? (
        <div className="flex items-center gap-2 rounded-lg border border-border/30 bg-card/30 p-1.5">
          <img
            src={logoUrl}
            alt="Logo"
            className="h-8 w-auto max-w-[100px] object-contain rounded"
          />
          <div className="flex gap-1 ml-auto">
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              className="text-[10px] px-1.5 py-0.5 rounded text-muted-foreground hover:text-foreground transition-colors"
            >
              Trocar
            </button>
            <button
              type="button"
              onClick={() => onLogoChange(undefined)}
              className="text-[10px] px-1.5 py-0.5 rounded text-muted-foreground/50 hover:text-red-400 transition-colors"
            >
              Remover
            </button>
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => !uploading && inputRef.current?.click()}
          onDrop={handleDrop}
          onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
          onDragLeave={(e) => { e.preventDefault(); setDragging(false); }}
          disabled={uploading}
          className={`w-full flex items-center justify-center gap-1.5 rounded-lg border border-dashed bg-background/30 px-3 py-2 transition-colors cursor-pointer disabled:opacity-50 text-xs ${
            dragging
              ? "border-orange bg-orange/10"
              : "border-border/50 hover:border-orange/30 hover:bg-orange/5"
          }`}
        >
          {uploading ? (
            <span className="flex items-center gap-2">
              <span className="w-3 h-3 border-2 border-orange/30 border-t-orange rounded-full animate-spin" />
              <span className="text-muted-foreground">{progress}%</span>
            </span>
          ) : (
            <span className="text-muted-foreground">
              <svg className="w-3.5 h-3.5 inline mr-1 -mt-0.5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="m2.25 15.75 5.159-5.159a2.25 2.25 0 0 1 3.182 0l5.159 5.159m-1.5-1.5 1.409-1.409a2.25 2.25 0 0 1 3.182 0l2.909 2.909M3.75 21h16.5A2.25 2.25 0 0 0 22.5 18.75V5.25A2.25 2.25 0 0 0 20.25 3H3.75A2.25 2.25 0 0 0 1.5 5.25v13.5A2.25 2.25 0 0 0 3.75 21Z" />
              </svg>
              Logo (1000x330)
            </span>
          )}
        </button>
      )}

      {error && <p className="text-[10px] text-destructive mt-0.5">{error}</p>}
    </div>
  );
}
