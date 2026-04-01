"use client";

import { useState, useRef } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";

interface MediaFileInputProps {
  defaultUrl?: string;
  onFileChange: (url: string, detectedType: "IMAGE" | "VIDEO" | null, durationSeconds?: number) => void;
}

function getVideoDuration(src: string): Promise<number> {
  return new Promise((resolve) => {
    const video = document.createElement("video");
    video.preload = "metadata";
    video.onloadedmetadata = () => {
      const dur = Math.ceil(video.duration);
      URL.revokeObjectURL(video.src);
      resolve(dur);
    };
    video.onerror = () => resolve(0);
    video.src = src;
  });
}

export function MediaFileInput({ defaultUrl = "", onFileChange }: MediaFileInputProps) {
  const [mode, setMode] = useState<"upload" | "url">(defaultUrl && !defaultUrl.startsWith("/uploads") ? "url" : "upload");
  const [url, setUrl] = useState(defaultUrl);
  const [uploading, setUploading] = useState(false);
  const [fileName, setFileName] = useState("");
  const [error, setError] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  async function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setError("");
    setUploading(true);
    setFileName(file.name);

    // Read video duration from local file before upload
    let localDuration: number | undefined;
    if (file.type.startsWith("video/")) {
      const objectUrl = URL.createObjectURL(file);
      localDuration = await getVideoDuration(objectUrl);
    }

    const formData = new FormData();
    formData.append("file", file);

    try {
      const res = await fetch("/api/upload", { method: "POST", body: formData });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Erro no upload");
        setUploading(false);
        return;
      }

      setUrl(data.url);
      onFileChange(data.url, data.type, data.type === "VIDEO" ? localDuration : undefined);
    } catch {
      setError("Erro ao enviar arquivo");
    } finally {
      setUploading(false);
    }
  }

  async function handleUrlChange(value: string) {
    setUrl(value);
    const isVideo = /\.(mp4|webm|ogg)(\?|$)/i.test(value);

    if (isVideo && value) {
      onFileChange(value, "VIDEO");
      const dur = await getVideoDuration(value);
      if (dur > 0) {
        onFileChange(value, "VIDEO", dur);
      }
    } else {
      onFileChange(value, value ? "IMAGE" : null);
    }
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <Label>Arquivo</Label>
        <div className="flex gap-1 ml-auto">
          <button
            type="button"
            onClick={() => setMode("upload")}
            className={`text-xs px-2.5 py-1 rounded-lg transition-colors cursor-pointer ${
              mode === "upload"
                ? "bg-orange/10 text-orange border border-orange/20"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Upload
          </button>
          <button
            type="button"
            onClick={() => setMode("url")}
            className={`text-xs px-2.5 py-1 rounded-lg transition-colors cursor-pointer ${
              mode === "url"
                ? "bg-orange/10 text-orange border border-orange/20"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            URL
          </button>
        </div>
      </div>

      {mode === "upload" ? (
        <div>
          <input
            ref={inputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp,image/gif,video/mp4,video/webm,video/ogg"
            onChange={handleFileSelect}
            className="hidden"
          />

          {url && !uploading ? (
            <div className="flex items-center gap-3 rounded-xl border border-border/50 bg-background/50 p-3">
              <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-emerald-500/10 border border-emerald-500/20 shrink-0">
                <svg className="w-5 h-5 text-emerald-400" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
                </svg>
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium truncate">{fileName || url}</p>
                <p className="text-xs text-muted-foreground truncate">{url}</p>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => inputRef.current?.click()}
                className="text-xs shrink-0 cursor-pointer"
              >
                Trocar
              </Button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              disabled={uploading}
              className="w-full flex flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-border/50 bg-background/30 p-6 transition-colors hover:border-orange/30 hover:bg-orange/5 cursor-pointer disabled:opacity-50"
            >
              {uploading ? (
                <>
                  <div className="w-8 h-8 border-2 border-orange/30 border-t-orange rounded-full animate-spin" />
                  <span className="text-sm text-muted-foreground">Enviando {fileName}...</span>
                </>
              ) : (
                <>
                  <svg className="w-8 h-8 text-muted-foreground/50" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5m-13.5-9L12 3m0 0 4.5 4.5M12 3v13.5" />
                  </svg>
                  <span className="text-sm text-muted-foreground">
                    Clique para enviar imagem ou vídeo
                  </span>
                  <span className="text-xs text-muted-foreground/50">
                    JPG, PNG, WebP, GIF, MP4, WebM — até 100MB
                  </span>
                </>
              )}
            </button>
          )}
        </div>
      ) : (
        <Input
          type="url"
          placeholder="https://exemplo.com/imagem.jpg"
          value={url}
          onChange={(e) => handleUrlChange(e.target.value)}
          className="bg-background/50 border-border/50"
        />
      )}

      {error && (
        <p className="text-xs text-destructive">{error}</p>
      )}

      {/* Hidden input to carry the URL value in the form */}
      <input type="hidden" name="fileUrl" value={url} />
    </div>
  );
}
