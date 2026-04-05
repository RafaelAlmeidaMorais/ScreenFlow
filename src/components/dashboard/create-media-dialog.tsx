"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { createMedia } from "@/app/dashboard/medias/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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

export function CreateMediaDialog({ screens }: { screens: Screen[] }) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [screenId, setScreenId] = useState("");
  const [type, setType] = useState("IMAGE");
  const durationRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  async function handleSubmit(formData: FormData) {
    formData.set("screenId", screenId);
    formData.set("type", type);
    setLoading(true);
    try {
      await createMedia(formData);
      setOpen(false);
      setScreenId("");
      setType("IMAGE");
      router.refresh();
    } catch {
      alert("Erro ao criar mídia");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger className="inline-flex items-center justify-center rounded-md px-4 py-2 text-sm font-semibold bg-orange hover:bg-orange/90 text-orange-foreground cursor-pointer">
          <svg className="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
          </svg>
          Nova Mídia
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg bg-card border-border/50 ">
        <DialogHeader>
          <DialogTitle>Adicionar nova mídia</DialogTitle>
        </DialogHeader>
        <form action={handleSubmit} className="space-y-4 mt-2">
          <div className="space-y-2">
            <Label>Tela</Label>
            <Select value={screenId} onValueChange={(v) => v && setScreenId(v)} required>
              <SelectTrigger className="bg-background/50 border-border/50">
                <SelectValue placeholder="Selecione uma tela" />
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
              placeholder="Ex: Banner de boas-vindas"
              required
              className="bg-background/50 border-border/50"
            />
          </div>

          <MediaFileInput
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
                defaultValue={10}
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
                defaultValue={new Date().toISOString().slice(0, 10)}
                className="bg-background/50 border-border/50"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="endDate">Data de fim (opcional)</Label>
              <Input
                id="endDate"
                name="endDate"
                type="date"
                className="bg-background/50 border-border/50"
              />
            </div>
          </div>
          <div className="flex justify-end gap-3 pt-2">
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
              disabled={loading || !screenId}
              className="bg-orange hover:bg-orange/90 text-orange-foreground font-semibold cursor-pointer"
            >
              {loading ? "Adicionando..." : "Adicionar mídia"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
