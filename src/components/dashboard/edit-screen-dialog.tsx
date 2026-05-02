"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { updateScreen, deleteScreen } from "@/app/dashboard/screens/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { LayoutPreview } from "@/components/dashboard/layout-preview";
import {
  ASPECT_RATIOS,
  LAYOUT_DEFINITIONS,
  LAYOUT_TEMPLATES,
  ORIENTATIONS,
} from "@/lib/layouts";

interface ScreenData {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  token: string;
  intervalSeconds: number;
  isActive: boolean;
  showProgressBar: boolean;
  orientation: string;
  aspectRatio: string;
  layoutTemplate: string;
}

export function EditScreenDialog({ screen }: { screen: ScreenData }) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [isActive, setIsActive] = useState(screen.isActive);
  const [showProgressBar, setShowProgressBar] = useState(screen.showProgressBar);
  const [orientation, setOrientation] = useState(screen.orientation || "LANDSCAPE");
  const [aspectRatio, setAspectRatio] = useState(screen.aspectRatio || "AUTO");
  const [layoutTemplate, setLayoutTemplate] = useState(
    screen.layoutTemplate || "FULLSCREEN",
  );
  const [copied, setCopied] = useState(false);
  const router = useRouter();

  async function handleSubmit(formData: FormData) {
    formData.set("isActive", String(isActive));
    formData.set("showProgressBar", String(showProgressBar));
    formData.set("orientation", orientation);
    formData.set("aspectRatio", aspectRatio);
    formData.set("layoutTemplate", layoutTemplate);
    setLoading(true);
    try {
      await updateScreen(screen.id, formData);
      setOpen(false);
      router.refresh();
    } catch (e) {
      alert(e instanceof Error ? e.message : "Erro ao atualizar tela");
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete() {
    if (!confirm("Tem certeza? Todas as mídias desta tela também serão excluídas.")) return;
    setDeleting(true);
    try {
      await deleteScreen(screen.id);
      setOpen(false);
      router.push("/dashboard/screens");
      router.refresh();
    } catch {
      alert("Erro ao excluir tela");
    } finally {
      setDeleting(false);
    }
  }

  function copyPlayerUrl() {
    const url = `${window.location.origin}/player/${screen.slug}`;
    navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger className="inline-flex items-center justify-center rounded-md px-2 py-1.5 text-xs text-muted-foreground hover:text-orange hover:bg-orange/10 cursor-pointer">
          <svg className="w-4 h-4 mr-1.5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L10.582 16.07a4.5 4.5 0 0 1-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 0 1 1.13-1.897l8.932-8.931Zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0 1 15.75 21H5.25A2.25 2.25 0 0 1 3 18.75V8.25A2.25 2.25 0 0 1 5.25 6H10" />
          </svg>
          Editar
      </DialogTrigger>
      <DialogContent className="sm:max-w-md bg-card border-border/50">
        <DialogHeader>
          <DialogTitle>Editar tela</DialogTitle>
        </DialogHeader>
        <form action={handleSubmit} className="space-y-4 mt-2">
          <div className="space-y-2">
            <Label htmlFor="name">Nome da tela</Label>
            <Input
              id="name"
              name="name"
              defaultValue={screen.name}
              required
              className="bg-background/50 border-border/50"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="slug">Slug (URL do player)</Label>
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground/60 shrink-0">/player/</span>
              <Input
                id="slug"
                name="slug"
                defaultValue={screen.slug}
                required
                className="bg-background/50 border-border/50"
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="description">Descrição</Label>
            <Textarea
              id="description"
              name="description"
              defaultValue={screen.description ?? ""}
              rows={3}
              className="bg-background/50 border-border/50 resize-none"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="intervalSeconds">Intervalo entre mídias (segundos)</Label>
            <Input
              id="intervalSeconds"
              name="intervalSeconds"
              type="number"
              defaultValue={screen.intervalSeconds}
              min={3}
              max={120}
              className="bg-background/50 border-border/50"
            />
          </div>

          {/* Layout / orientation / aspect ratio */}
          <div className="space-y-3 rounded-xl border border-border/50 bg-background/50 px-4 py-3">
            <p className="text-sm font-medium">Layout e exibição</p>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="orientation" className="text-xs">Orientação</Label>
                <select
                  id="orientation"
                  value={orientation}
                  onChange={(e) => setOrientation(e.target.value)}
                  className="w-full rounded-md border border-border/50 bg-background/50 px-3 py-2 text-sm cursor-pointer"
                >
                  {ORIENTATIONS.map((o) => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                  ))}
                </select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="aspectRatio" className="text-xs">Proporção</Label>
                <select
                  id="aspectRatio"
                  value={aspectRatio}
                  onChange={(e) => setAspectRatio(e.target.value)}
                  className="w-full rounded-md border border-border/50 bg-background/50 px-3 py-2 text-sm cursor-pointer"
                >
                  {ASPECT_RATIOS.map((a) => (
                    <option key={a.value} value={a.value}>{a.label}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="layoutTemplate" className="text-xs">Layout da tela</Label>
              <select
                id="layoutTemplate"
                value={layoutTemplate}
                onChange={(e) => setLayoutTemplate(e.target.value)}
                className="w-full rounded-md border border-border/50 bg-background/50 px-3 py-2 text-sm cursor-pointer"
              >
                {LAYOUT_TEMPLATES.map((t) => (
                  <option key={t} value={t}>{LAYOUT_DEFINITIONS[t].label}</option>
                ))}
              </select>
              <p className="text-[11px] text-muted-foreground">
                {LAYOUT_DEFINITIONS[layoutTemplate as keyof typeof LAYOUT_DEFINITIONS]?.description}
              </p>
            </div>

            <div className="pt-1">
              <LayoutPreview template={layoutTemplate} orientation={orientation as "LANDSCAPE" | "PORTRAIT"} />
            </div>
          </div>

          <div className="flex items-center justify-between rounded-xl border border-border/50 bg-background/50 px-4 py-3">
            <div>
              <p className="text-sm font-medium">Tela ativa</p>
              <p className="text-xs text-muted-foreground">Exibir conteúdo no player</p>
            </div>
            <Switch checked={isActive} onCheckedChange={setIsActive} />
          </div>

          <div className="flex items-center justify-between rounded-xl border border-border/50 bg-background/50 px-4 py-3">
            <div>
              <p className="text-sm font-medium">Barra de progresso</p>
              <p className="text-xs text-muted-foreground">Exibir barra de progresso no player</p>
            </div>
            <Switch checked={showProgressBar} onCheckedChange={setShowProgressBar} />
          </div>

          {/* Player URL */}
          <div className="space-y-2">
            <Label>URL do Player</Label>
            <div className="flex items-center gap-2">
              <code className="flex-1 text-xs bg-background/50 border border-border/50 rounded-lg px-3 py-2.5 truncate text-muted-foreground">
                /player/{screen.slug}
              </code>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={copyPlayerUrl}
                className="shrink-0 text-xs cursor-pointer hover:text-orange hover:bg-orange/10"
              >
                {copied ? (
                  <>
                    <svg className="w-4 h-4 mr-1" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
                    </svg>
                    Copiado
                  </>
                ) : (
                  <>
                    <svg className="w-4 h-4 mr-1" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 17.25v3.375c0 .621-.504 1.125-1.125 1.125h-9.75a1.125 1.125 0 0 1-1.125-1.125V7.875c0-.621.504-1.125 1.125-1.125H6.75a9.06 9.06 0 0 1 1.5.124m7.5 10.376h3.375c.621 0 1.125-.504 1.125-1.125V11.25c0-4.46-3.243-8.161-7.5-8.876a9.06 9.06 0 0 0-1.5-.124H9.375c-.621 0-1.125.504-1.125 1.125v3.5m7.5 10.375H9.375a1.125 1.125 0 0 1-1.125-1.125v-9.25m12 6.625v-1.875a3.375 3.375 0 0 0-3.375-3.375h-1.5a1.125 1.125 0 0 1-1.125-1.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H9.75" />
                    </svg>
                    Copiar
                  </>
                )}
              </Button>
            </div>
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
