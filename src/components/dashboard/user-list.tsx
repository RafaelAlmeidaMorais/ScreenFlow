"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { updateUser, deleteUser } from "@/app/dashboard/users/actions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

const roleLabels: Record<string, string> = {
  COMPANY_ADMIN: "Administrador",
  EDITOR: "Editor",
  VIEWER: "Visualizador",
};

interface UserData {
  id: string;
  name: string;
  email: string;
  role: string;
  isSuperAdmin: boolean;
  companyId: string;
  companyName: string;
  createdAt: string;
}

interface Props {
  users: UserData[];
  currentUserId: string;
  isSuperAdmin: boolean;
  companies: { id: string; name: string }[];
}

export function UserList({ users, currentUserId, isSuperAdmin, companies }: Props) {
  const [editingUser, setEditingUser] = useState<UserData | null>(null);
  const [loading, setLoading] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [role, setRole] = useState("");
  const router = useRouter();

  function openEdit(user: UserData) {
    setEditingUser(user);
    setRole(user.role);
  }

  async function handleSubmit(formData: FormData) {
    if (!editingUser) return;
    formData.set("role", role);
    setLoading(true);
    try {
      await updateUser(editingUser.id, formData);
      setEditingUser(null);
      router.refresh();
    } catch (e) {
      alert(e instanceof Error ? e.message : "Erro ao atualizar");
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete() {
    if (!editingUser) return;
    if (!confirm(`Excluir o usuário "${editingUser.name}"?`)) return;
    setDeleting(true);
    try {
      await deleteUser(editingUser.id);
      setEditingUser(null);
      router.refresh();
    } catch (e) {
      alert(e instanceof Error ? e.message : "Erro ao excluir");
    } finally {
      setDeleting(false);
    }
  }

  if (users.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-border/50 bg-card/30 p-12 text-center">
        <p className="text-muted-foreground text-sm">Nenhum usuário cadastrado</p>
      </div>
    );
  }

  return (
    <>
      <div className="space-y-3">
        {users.map((user) => {
          const initials = user.name
            .split(" ")
            .map((n) => n[0])
            .join("")
            .toUpperCase()
            .slice(0, 2);

          return (
            <div
              key={user.id}
              className="flex items-center justify-between rounded-xl border border-border/50 bg-card/50 px-5 py-4 transition-colors hover:border-orange/20 hover:bg-card/80"
            >
              <div className="flex items-center gap-4">
                <Avatar className="h-11 w-11 border-2 border-orange/20">
                  <AvatarFallback className="bg-orange/10 text-orange text-xs font-semibold">
                    {initials}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <div className="flex items-center gap-2.5">
                    <h3 className="text-sm font-semibold">{user.name}</h3>
                    {user.isSuperAdmin && (
                      <Badge className="bg-purple-500/10 text-purple-400 border border-purple-500/20 hover:bg-purple-500/10">
                        Super Admin
                      </Badge>
                    )}
                    <Badge variant="secondary" className="bg-orange/10 text-orange border border-orange/20 hover:bg-orange/10">
                      {roleLabels[user.role] ?? user.role}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {user.email}
                    {isSuperAdmin && <span className="text-muted-foreground/40"> — {user.companyName}</span>}
                  </p>
                </div>
              </div>

              <Button
                variant="ghost"
                size="sm"
                onClick={() => openEdit(user)}
                className="text-xs text-muted-foreground hover:text-orange hover:bg-orange/10 cursor-pointer"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L10.582 16.07a4.5 4.5 0 0 1-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 0 1 1.13-1.897l8.932-8.931Zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0 1 15.75 21H5.25A2.25 2.25 0 0 1 3 18.75V8.25A2.25 2.25 0 0 1 5.25 6H10" />
                </svg>
              </Button>
            </div>
          );
        })}
      </div>

      {/* Edit User Dialog */}
      <Dialog open={!!editingUser} onOpenChange={(open) => !open && setEditingUser(null)}>
        <DialogContent className="sm:max-w-md bg-card border-border/50">
          <DialogHeader>
            <DialogTitle>Editar usuário</DialogTitle>
          </DialogHeader>
          {editingUser && (
            <form action={handleSubmit} className="space-y-4 mt-2">
              <div className="space-y-2">
                <Label htmlFor="edit-name">Nome</Label>
                <Input id="edit-name" name="name" defaultValue={editingUser.name} required className="bg-background/50 border-border/50" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-email">Email</Label>
                <Input id="edit-email" name="email" type="email" defaultValue={editingUser.email} required className="bg-background/50 border-border/50" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-password">Nova senha</Label>
                <Input id="edit-password" name="password" type="password" placeholder="Deixe em branco para manter" minLength={6} className="bg-background/50 border-border/50" />
                <p className="text-xs text-muted-foreground/60">Mínimo 6 caracteres. Deixe vazio para não alterar.</p>
              </div>

              {/* Only admins can change role, and can't change own role */}
              {editingUser.id !== currentUserId && !editingUser.isSuperAdmin && (
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
              )}

              <div className="flex items-center justify-between pt-2">
                {editingUser.id !== currentUserId && !editingUser.isSuperAdmin ? (
                  <Button type="button" variant="ghost" onClick={handleDelete} disabled={deleting} className="text-destructive hover:text-destructive hover:bg-destructive/10 cursor-pointer">
                    {deleting ? "Excluindo..." : "Excluir"}
                  </Button>
                ) : (
                  <div />
                )}
                <div className="flex gap-3">
                  <Button type="button" variant="ghost" onClick={() => setEditingUser(null)} className="cursor-pointer">Cancelar</Button>
                  <Button type="submit" disabled={loading} className="bg-orange hover:bg-orange/90 text-orange-foreground font-semibold cursor-pointer">
                    {loading ? "Salvando..." : "Salvar"}
                  </Button>
                </div>
              </div>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
