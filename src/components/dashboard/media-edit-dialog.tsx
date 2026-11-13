"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { updateMedia, deleteMedia } from "@/app/dashboard/screens/[id]/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { MediaFileInput } from "@/components/dashboard/media-file-input";
import { MediaScheduleFields } from "@/components/dashboard/media-schedule-fields";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export interface EditableMedia {
  id: string;
  title: string;
  fileUrl: string;
  type: string;
  durationSeconds: number;
  startDate: string;
  endDate: string | null;
  isEnabled: boolean;
}

interface Props {
  media: EditableMedia;
  screenId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

/** Edit form for one media on one screen. Used by the screen page and the Mídias page. */
export function MediaEditDialog({ media, screenId, open, onOpenChange }: Props) {
  const [loading, setLoading] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [type, setType] = useState(media.type);
  const [isEnabled, setIsEnabled] = useState(media.isEnabled);
  const durationRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  async function handleUpdate(formData: FormData) {
    formData.set("type", type);
    formData.set("isEnabled", String(isEnabled));
    setLoading(true);
    try {
      await updateMedia(media.id, screenId, formData);
      onOpenChange(false);
      router.refresh();
    } catch {
      alert("Erro ao atualizar mídia");
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete() {
    if (!confirm("Excluir esta mídia?")) return;
    setDeleting(true);
    try {
      await deleteMedia(media.id, screenId);
      onOpenChange(false);
      router.refresh();
    } catch {
      alert("Erro ao excluir");
    } finally {
      setDeleting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg bg-card border-border/50">
        <DialogHeader>
          <DialogTitle>Editar mídia</DialogTitle>
        </DialogHeader>
        <form action={handleUpdate} className="space-y-4 mt-2">
          <div className="space-y-2">
            <Label htmlFor="title">Título</Label>
            <Input id="title" name="title" defaultValue={media.title} required className="bg-background/50 border-border/50" />
          </div>

          <MediaFileInput
            defaultUrl={media.fileUrl}
            onFileChange={(_url, detectedType, dur) => {
              if (detectedType) setType(detectedType);
              if (detectedType === "VIDEO" && dur && durationRef.current) {
                durationRef.current.value = String(dur);
              }
            }}
          />

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Tipo</Label>
              <Select value={type} onValueChange={(v) => v && setType(v)}>
                <SelectTrigger className="bg-background/50 border-border/50"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="IMAGE">Imagem</SelectItem>
                  <SelectItem value="VIDEO">Vídeo</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="durationSeconds">Duração (s)</Label>
              <Input ref={durationRef} id="durationSeconds" name="durationSeconds" type="number" defaultValue={media.durationSeconds} min={3} max={300} className="bg-background/50 border-border/50" />
            </div>
          </div>

          <MediaScheduleFields defaultStart={media.startDate} defaultEnd={media.endDate} />

          <div className="flex items-center justify-between rounded-xl border border-border/50 bg-background/50 px-4 py-3">
            <div>
              <p className="text-sm font-medium">Mídia ativa</p>
              <p className="text-xs text-muted-foreground">Exibir no player</p>
            </div>
            <Switch checked={isEnabled} onCheckedChange={setIsEnabled} />
          </div>

          <div className="flex items-center justify-between pt-2">
            <Button type="button" variant="ghost" onClick={handleDelete} disabled={deleting} className="text-destructive hover:text-destructive hover:bg-destructive/10 cursor-pointer">
              {deleting ? "Excluindo..." : "Excluir"}
            </Button>
            <div className="flex gap-3">
              <Button type="button" variant="ghost" onClick={() => onOpenChange(false)} className="cursor-pointer">Cancelar</Button>
              <Button type="submit" disabled={loading} className="bg-orange hover:bg-orange/90 text-orange-foreground font-semibold cursor-pointer">
                {loading ? "Salvando..." : "Salvar"}
              </Button>
            </div>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
