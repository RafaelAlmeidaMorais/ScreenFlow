import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";

export default async function SettingsPage() {
  const session = await auth();
  if (!session) redirect("/login");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Configurações</h1>
        <p className="text-muted-foreground mt-1">
          Configurações da sua conta e empresa
        </p>
      </div>

      <div className="rounded-2xl border border-border/50 bg-card/50 backdrop-blur-sm p-8">
        <div className="space-y-6">
          <div>
            <h3 className="text-sm font-semibold mb-1">Empresa</h3>
            <p className="text-sm text-muted-foreground">{session.user.companyName}</p>
          </div>
          <div className="h-px bg-border/50" />
          <div>
            <h3 className="text-sm font-semibold mb-1">Conta</h3>
            <p className="text-sm text-muted-foreground">{session.user.name}</p>
            <p className="text-xs text-muted-foreground/60 mt-0.5">{session.user.email}</p>
          </div>
          <div className="h-px bg-border/50" />
          <div>
            <h3 className="text-sm font-semibold mb-1">Perfil</h3>
            <p className="text-sm text-muted-foreground">{session.user.role}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
