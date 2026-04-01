"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { updateMedia, deleteMedia, copyMedia, moveMedia } from "@/app/dashboard/screens/[id]/actions";
import { Badge } from "@/components/ui/badge";
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

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

export function ScreenMediaItem({
  media,
  screenId,
  otherScreens,
}: {
  media: MediaData;
  screenId: string;
  otherScreens: OtherScreen[];
}) {
  const [editOpen, setEditOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [type, setType] = useState(media.type);
  const [isEnabled, setIsEnabled] = useState(media.isEnabled);
  const durationRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  function formatDate(iso: string | null) {
    if (!iso) return "";
    return iso.slice(0, 10);
  }

  async function handleUpdate(formData: FormData) {
    formData.set("type", type);
    formData.set("isEnabled", String(isEnabled));
    setLoading(true);
    try {
      await updateMedia(media.id, screenId, formData);
      setEditOpen(false);
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
      router.refresh();
    } catch {
      alert("Erro ao excluir");
    } finally {
      setDeleting(false);
    }
  }

  async function handleCopy(targetScreenId: string) {
    try {
      await copyMedia(media.id, targetScreenId, screenId);
      router.refresh();
    } catch {
      alert("Erro ao copiar mídia");
    }
  }

  async function handleMove(targetScreenId: string) {
    try {
      await moveMedia(media.id, targetScreenId, screenId);
      router.refresh();
    } catch {
      alert("Erro ao mover mídia");
    }
  }

  return (
    <>
      <div className="group flex items-center justify-between rounded-2xl border border-border/50 bg-card/50 backdrop-blur-sm p-4 transition-all duration-200 hover:border-border hover:bg-card/80">
        <div className="flex items-center gap-4 min-w-0">
          {/* Order number */}
          <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-muted/50 text-xs font-semibold text-muted-foreground shrink-0">
            {media.orderIndex + 1}
          </div>

          {/* Thumbnail */}
          <div className="w-16 h-10 rounded-lg bg-muted/50 border border-border/50 shrink-0 overflow-hidden">
            {media.type === "IMAGE" ? (
              <img src={media.fileUrl} alt="" className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <svg className="w-4 h-4 text-muted-foreground" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5.25 5.653c0-.856.917-1.398 1.667-.986l11.54 6.347a1.125 1.125 0 0 1 0 1.972l-11.54 6.347a1.125 1.125 0 0 1-1.667-.986V5.653Z" />
                </svg>
              </div>
            )}
          </div>

          {/* Info */}
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-semibold truncate">{media.title}</h3>
              <Badge
                variant="secondary"
                className={
                  media.isExpired
                    ? "bg-red-500/10 text-red-400 border border-red-500/20 hover:bg-red-500/10"
                    : media.isEnabled
                    ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 hover:bg-emerald-500/10"
                    : "bg-muted text-muted-foreground border border-border/50 hover:bg-muted"
                }
              >
                {media.isExpired ? "Expirada" : media.isEnabled ? "Ativa" : "Desabilitada"}
              </Badge>
              <Badge variant="outline" className="text-xs">
                {media.type === "VIDEO" ? "Vídeo" : "Imagem"}
              </Badge>
            </div>
            <div className="flex items-center gap-3 mt-0.5">
              <span className="text-xs text-muted-foreground/60">{media.durationSeconds}s</span>
              {media.startDate && (
                <span className="text-xs text-muted-foreground/60">
                  {formatDate(media.startDate)}
                  {media.endDate ? ` → ${formatDate(media.endDate)}` : ""}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-1 shrink-0">
          <Dialog open={editOpen} onOpenChange={setEditOpen}>
            <DialogTrigger>
              <Button variant="ghost" size="sm" className="text-xs text-muted-foreground hover:text-orange hover:bg-orange/10 cursor-pointer">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L10.582 16.07a4.5 4.5 0 0 1-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 0 1 1.13-1.897l8.932-8.931Zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0 1 15.75 21H5.25A2.25 2.25 0 0 1 3 18.75V8.25A2.25 2.25 0 0 1 5.25 6H10" />
                </svg>
              </Button>
            </DialogTrigger>
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

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="startDate">Data de início</Label>
                    <Input id="startDate" name="startDate" type="date" defaultValue={formatDate(media.startDate)} className="bg-background/50 border-border/50" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="endDate">Data de fim</Label>
                    <Input id="endDate" name="endDate" type="date" defaultValue={formatDate(media.endDate)} className="bg-background/50 border-border/50" />
                  </div>
                </div>

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
                    <Button type="button" variant="ghost" onClick={() => setEditOpen(false)} className="cursor-pointer">Cancelar</Button>
                    <Button type="submit" disabled={loading} className="bg-orange hover:bg-orange/90 text-orange-foreground font-semibold cursor-pointer">
                      {loading ? "Salvando..." : "Salvar"}
                    </Button>
                  </div>
                </div>
              </form>
            </DialogContent>
          </Dialog>

          {/* Copy / Move dropdown */}
          {otherScreens.length > 0 && (
            <DropdownMenu>
              <DropdownMenuTrigger>
                <Button variant="ghost" size="sm" className="text-xs text-muted-foreground hover:text-foreground cursor-pointer">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 12a.75.75 0 1 1-1.5 0 .75.75 0 0 1 1.5 0ZM12.75 12a.75.75 0 1 1-1.5 0 .75.75 0 0 1 1.5 0ZM18.75 12a.75.75 0 1 1-1.5 0 .75.75 0 0 1 1.5 0Z" />
                  </svg>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-52">
                <DropdownMenuSub>
                  <DropdownMenuSubTrigger>
                    <svg className="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 17.25v3.375c0 .621-.504 1.125-1.125 1.125h-9.75a1.125 1.125 0 0 1-1.125-1.125V7.875c0-.621.504-1.125 1.125-1.125H6.75a9.06 9.06 0 0 1 1.5.124m7.5 10.376h3.375c.621 0 1.125-.504 1.125-1.125V11.25c0-4.46-3.243-8.161-7.5-8.876a9.06 9.06 0 0 0-1.5-.124H9.375c-.621 0-1.125.504-1.125 1.125v3.5m7.5 10.375H9.375a1.125 1.125 0 0 1-1.125-1.125v-9.25m12 6.625v-1.875a3.375 3.375 0 0 0-3.375-3.375h-1.5a1.125 1.125 0 0 1-1.125-1.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H9.75" />
                    </svg>
                    Copiar para...
                  </DropdownMenuSubTrigger>
                  <DropdownMenuSubContent>
                    {otherScreens.map((s) => (
                      <DropdownMenuItem key={s.id} onClick={() => handleCopy(s.id)} className="cursor-pointer">
                        {s.name}
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuSubContent>
                </DropdownMenuSub>
                <DropdownMenuSub>
                  <DropdownMenuSubTrigger>
                    <svg className="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 21 3 16.5m0 0L7.5 12M3 16.5h13.5m0-13.5L21 7.5m0 0L16.5 12M21 7.5H7.5" />
                    </svg>
                    Mover para...
                  </DropdownMenuSubTrigger>
                  <DropdownMenuSubContent>
                    {otherScreens.map((s) => (
                      <DropdownMenuItem key={s.id} onClick={() => handleMove(s.id)} className="cursor-pointer">
                        {s.name}
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuSubContent>
                </DropdownMenuSub>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleDelete} className="text-destructive focus:text-destructive cursor-pointer">
                  <svg className="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" />
                  </svg>
                  Excluir
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      </div>
    </>
  );
}
