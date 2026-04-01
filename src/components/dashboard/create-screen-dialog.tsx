"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createScreen } from "@/app/dashboard/screens/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

function toSlug(text: string) {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
}

export function CreateScreenDialog() {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [slugManual, setSlugManual] = useState(false);
  const router = useRouter();

  function handleNameChange(value: string) {
    setName(value);
    if (!slugManual) {
      setSlug(toSlug(value));
    }
  }

  function handleSlugChange(value: string) {
    setSlugManual(true);
    setSlug(value.toLowerCase().replace(/[^a-z0-9-]/g, ""));
  }

  async function handleSubmit(formData: FormData) {
    formData.set("slug", slug);
    setLoading(true);
    try {
      await createScreen(formData);
      setOpen(false);
      setName("");
      setSlug("");
      setSlugManual(false);
      router.refresh();
    } catch (e) {
      alert(e instanceof Error ? e.message : "Erro ao criar tela");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger>
        <Button className="bg-orange hover:bg-orange/90 text-orange-foreground font-semibold cursor-pointer">
          <svg className="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
          </svg>
          Nova Tela
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md bg-card border-border/50">
        <DialogHeader>
          <DialogTitle>Criar nova tela</DialogTitle>
        </DialogHeader>
        <form action={handleSubmit} className="space-y-4 mt-2">
          <div className="space-y-2">
            <Label htmlFor="name">Nome da tela</Label>
            <Input
              id="name"
              name="name"
              placeholder="Ex: Tela do Lobby"
              value={name}
              onChange={(e) => handleNameChange(e.target.value)}
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
                placeholder="tela-do-lobby"
                value={slug}
                onChange={(e) => handleSlugChange(e.target.value)}
                required
                className="bg-background/50 border-border/50"
              />
            </div>
            <p className="text-xs text-muted-foreground/60">Gerado automaticamente a partir do nome. Pode editar manualmente.</p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="description">Descrição</Label>
            <Textarea
              id="description"
              name="description"
              placeholder="Breve descrição da tela..."
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
              defaultValue={10}
              min={3}
              max={120}
              className="bg-background/50 border-border/50"
            />
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="ghost" onClick={() => setOpen(false)} className="cursor-pointer">
              Cancelar
            </Button>
            <Button type="submit" disabled={loading} className="bg-orange hover:bg-orange/90 text-orange-foreground font-semibold cursor-pointer">
              {loading ? "Criando..." : "Criar tela"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
