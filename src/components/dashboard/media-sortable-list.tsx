"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { reorderMedias, deleteMedia } from "@/app/dashboard/screens/[id]/actions";
import { ScreenMediaItem } from "@/components/dashboard/screen-media-item";

interface MediaData {
  id: string;
  title: string;
  fileUrl: string;
  type: string;
  durationSeconds: number;
  startDate: string;
  endDate: string | null;
  isEnabled: boolean;
  orderIndex: number;
  isExpired: boolean;
}

interface OtherScreen {
  id: string;
  name: string;
}

interface Props {
  medias: MediaData[];
  screenId: string;
  otherScreens: OtherScreen[];
}

export function MediaSortableList({ medias: initialMedias, screenId, otherScreens }: Props) {
  const [medias, setMedias] = useState(initialMedias);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const dragIndex = useRef<number | null>(null);
  const dragOverIndex = useRef<number | null>(null);
  const router = useRouter();

  async function handleDeleteMedia(mediaId: string, title: string) {
    if (!confirm(`Excluir "${title}"?`)) return;
    setDeletingId(mediaId);
    try {
      await deleteMedia(mediaId, screenId);
      setMedias((prev) => prev.filter((m) => m.id !== mediaId));
      router.refresh();
    } catch {
      alert("Erro ao excluir mídia");
    } finally {
      setDeletingId(null);
    }
  }

  function handleDragStart(index: number) {
    dragIndex.current = index;
  }

  function handleDragOver(e: React.DragEvent, index: number) {
    e.preventDefault();
    dragOverIndex.current = index;
  }

  async function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    const from = dragIndex.current;
    const to = dragOverIndex.current;

    if (from === null || to === null || from === to) {
      dragIndex.current = null;
      dragOverIndex.current = null;
      return;
    }

    const updated = [...medias];
    const [moved] = updated.splice(from, 1);
    updated.splice(to, 0, moved);

    // Update orderIndex
    const reindexed = updated.map((m, i) => ({ ...m, orderIndex: i }));
    setMedias(reindexed);

    dragIndex.current = null;
    dragOverIndex.current = null;

    // Save to server
    setSaving(true);
    try {
      await reorderMedias(screenId, reindexed.map((m) => m.id));
      router.refresh();
    } catch {
      // Revert on error
      setMedias(initialMedias);
      alert("Erro ao reordenar mídias");
    } finally {
      setSaving(false);
    }
  }

  function handleDragEnd() {
    dragIndex.current = null;
    dragOverIndex.current = null;
  }

  return (
    <div className="space-y-1">
      {saving && (
        <div className="text-xs text-muted-foreground/60 mb-2 flex items-center gap-2">
          <div className="w-3 h-3 border-2 border-orange/30 border-t-orange rounded-full animate-spin" />
          Salvando ordem...
        </div>
      )}
      {medias.map((media, index) => (
        <div
          key={media.id}
          draggable
          onDragStart={() => handleDragStart(index)}
          onDragOver={(e) => handleDragOver(e, index)}
          onDrop={handleDrop}
          onDragEnd={handleDragEnd}
          className="group/drag relative"
        >
          {/* Drop indicator line */}
          <div className="absolute -top-0.5 left-0 right-0 h-1 rounded-full bg-orange opacity-0 group-hover/drag:opacity-0 transition-opacity pointer-events-none [.dragging_&]:opacity-100" />

          <div className="flex items-center gap-2">
            {/* Drag handle */}
            <div className="flex items-center justify-center w-6 shrink-0 cursor-grab active:cursor-grabbing text-muted-foreground/30 hover:text-muted-foreground/60 transition-colors">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 9h16.5m-16.5 6.75h16.5" />
              </svg>
            </div>

            <div className="flex-1 min-w-0">
              <ScreenMediaItem
                media={media}
                screenId={screenId}
                otherScreens={otherScreens}
              />
            </div>

            {/* Delete button */}
            <button
              onClick={() => handleDeleteMedia(media.id, media.title)}
              disabled={deletingId === media.id}
              className="flex items-center justify-center w-8 h-8 shrink-0 rounded-lg text-muted-foreground/30 hover:text-red-400 hover:bg-red-500/10 transition-colors cursor-pointer disabled:opacity-50"
              title="Excluir mídia"
            >
              {deletingId === media.id ? (
                <div className="w-4 h-4 border-2 border-red-400/30 border-t-red-400 rounded-full animate-spin" />
              ) : (
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" />
                </svg>
              )}
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
