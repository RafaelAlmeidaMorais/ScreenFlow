"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createUser } from "@/app/dashboard/users/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

interface Props {
  companies: { id: string; name: string }[];
  isSuperAdmin: boolean;
  defaultCompanyId: string;
}

export function CreateUserDialog({ companies, isSuperAdmin, defaultCompanyId }: Props) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [companyId, setCompanyId] = useState(defaultCompanyId);
  const [role, setRole] = useState("VIEWER");
  const router = useRouter();

  async function handleSubmit(formData: FormData) {
    formData.set("companyId", companyId);
    formData.set("role", role);
    setLoading(true);
    try {
      await createUser(formData);
      setOpen(false);
      router.refresh();
    } catch (e) {
      alert(e instanceof Error ? e.message : "Erro ao criar usuário");
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
          Novo Usuário
      </DialogTrigger>
      <DialogContent className="sm:max-w-md bg-card border-border/50">
        <DialogHeader>
          <DialogTitle>Criar usuário</DialogTitle>
        </DialogHeader>
        <form action={handleSubmit} className="space-y-4 mt-2">
          <div className="space-y-2">
            <Label htmlFor="name">Nome</Label>
            <Input id="name" name="name" placeholder="Nome completo" required className="bg-background/50 border-border/50" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input id="email" name="email" type="email" placeholder="email@exemplo.com" required className="bg-background/50 border-border/50" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">Senha</Label>
            <Input id="password" name="password" type="password" placeholder="Mínimo 6 caracteres" required minLength={6} className="bg-background/50 border-border/50" />
          </div>

          {isSuperAdmin && companies.length > 0 && (
            <div className="space-y-2">
              <Label>Instituição</Label>
              <select
                value={companyId}
                onChange={(e) => setCompanyId(e.target.value)}
                className="w-full h-10 rounded-md border border-border/50 bg-background/50 px-3 text-sm"
              >
                {companies.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>
          )}

          <div className="space-y-2">
            <Label>Perfil</Label>
            <select
              value={role}
              onChange={(e) => setRole(e.target.value)}
              className="w-full h-10 rounded-md border border-border/50 bg-background/50 px-3 text-sm"
            >
              <option value="VIEWER">Visualizador</option>
              <option value="COMPANY_ADMIN">Administrador</option>
            </select>
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="ghost" onClick={() => setOpen(false)} className="cursor-pointer">Cancelar</Button>
            <Button type="submit" disabled={loading} className="bg-orange hover:bg-orange/90 text-orange-foreground font-semibold cursor-pointer">
              {loading ? "Criando..." : "Criar"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
