"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { updateMedia, deleteMedia } from "@/app/dashboard/medias/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { MediaFileInput } from "@/components/dashboard/media-file-input";
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
  DialogTrigger,
} from "@/components/ui/dialog";

interface Screen {
  id: string;
  name: string;
}

interface MediaData {
  id: string;
  title: string;
  fileUrl: string;
  type: string;
  screenId: string;
  screenName: string;
  durationSeconds: number;
  startDate: string;
  endDate: string | null;
  isEnabled: boolean;
}

export function EditMediaDialog({
  media,
  screens,
}: {
  media: MediaData;
  screens: Screen[];
}) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [screenId, setScreenId] = useState(media.screenId);
  const [type, setType] = useState(media.type);
  const [isEnabled, setIsEnabled] = useState(media.isEnabled);
  const durationRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  function formatDateForInput(isoString: string | null) {
    if (!isoString) return "";
    return isoString.slice(0, 10);
  }

  async function handleSubmit(formData: FormData) {
    formData.set("screenId", screenId);
    formData.set("type", type);
    formData.set("isEnabled", String(isEnabled));
    setLoading(true);
    try {
      await updateMedia(media.id, formData);
      setOpen(false);
      router.refresh();
    } catch {
      alert("Erro ao atualizar mídia");
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete() {
    if (!confirm("Tem certeza que deseja excluir esta mídia?")) return;
    setDeleting(true);
    try {
      await deleteMedia(media.id);
      setOpen(false);
      router.refresh();
    } catch {
      alert("Erro ao excluir mídia");
    } finally {
      setDeleting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger className="inline-flex items-center justify-center rounded-md px-2 py-1.5 text-xs text-muted-foreground hover:text-orange hover:bg-orange/10 cursor-pointer">
          <svg className="w-4 h-4 mr-1.5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L10.582 16.07a4.5 4.5 0 0 1-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 0 1 1.13-1.897l8.932-8.931Zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0 1 15.75 21H5.25A2.25 2.25 0 0 1 3 18.75V8.25A2.25 2.25 0 0 1 5.25 6H10" />
          </svg>
          Editar
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg bg-card border-border/50 ">
        <DialogHeader>
          <DialogTitle>Editar mídia</DialogTitle>
        </DialogHeader>
        <form action={handleSubmit} className="space-y-4 mt-2">
          <div className="space-y-2">
            <Label>Tela</Label>
            <Select value={screenId} onValueChange={(v) => v && setScreenId(v)}>
              <SelectTrigger className="bg-background/50 border-border/50">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {screens.map((s) => (
                  <SelectItem key={s.id} value={s.id}>
                    {s.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="title">Título</Label>
            <Input
              id="title"
              name="title"
              defaultValue={media.title}
              required
              className="bg-background/50 border-border/50"
            />
          </div>

          <MediaFileInput
            defaultUrl={media.fileUrl}
            onFileChange={(_url, detectedType, durationSeconds) => {
              if (detectedType) setType(detectedType);
              if (detectedType === "VIDEO" && durationSeconds && durationRef.current) {
                durationRef.current.value = String(durationSeconds);
              }
            }}
          />

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Tipo</Label>
              <Select value={type} onValueChange={(v) => v && setType(v)}>
                <SelectTrigger className="bg-background/50 border-border/50">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="IMAGE">Imagem</SelectItem>
                  <SelectItem value="VIDEO">Vídeo</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="durationSeconds">Duração (s)</Label>
              <Input
                ref={durationRef}
                id="durationSeconds"
                name="durationSeconds"
                type="number"
                defaultValue={media.durationSeconds}
                min={3}
                max={300}
                className="bg-background/50 border-border/50"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="startDate">Data de início</Label>
              <Input
                id="startDate"
                name="startDate"
                type="date"
                defaultValue={formatDateForInput(media.startDate)}
                className="bg-background/50 border-border/50"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="endDate">Data de fim (opcional)</Label>
              <Input
                id="endDate"
                name="endDate"
                type="date"
                defaultValue={formatDateForInput(media.endDate)}
                className="bg-background/50 border-border/50"
              />
            </div>
          </div>

          <div className="flex items-center justify-between rounded-xl border border-border/50 bg-background/50 px-4 py-3">
            <div>
              <p className="text-sm font-medium">Mídia ativa</p>
              <p className="text-xs text-muted-foreground">Exibir esta mídia no player</p>
            </div>
            <Switch checked={isEnabled} onCheckedChange={setIsEnabled} />
          </div>

          <div className="flex items-center justify-between pt-2">
            <Button
              type="button"
              variant="ghost"
              onClick={handleDelete}
              disabled={deleting}
              className="text-destructive hover:text-destructive hover:bg-destructive/10 cursor-pointer"
            >
              {deleting ? "Excluindo..." : "Excluir"}
            </Button>
            <div className="flex gap-3">
              <Button
                type="button"
                variant="ghost"
                onClick={() => setOpen(false)}
                className="cursor-pointer"
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={loading}
                className="bg-orange hover:bg-orange/90 text-orange-foreground font-semibold cursor-pointer"
              >
                {loading ? "Salvando..." : "Salvar"}
              </Button>
            </div>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
