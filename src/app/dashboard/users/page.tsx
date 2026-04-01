import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

const roleLabels: Record<string, string> = {
  COMPANY_ADMIN: "Administrador",
  EDITOR: "Editor",
  VIEWER: "Visualizador",
};

export default async function UsersPage() {
  const session = await auth();
  if (!session) redirect("/login");

  const users = await prisma.user.findMany({
    where: { companyId: session.user.companyId },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Usuários</h1>
        <p className="text-muted-foreground mt-1">
          Gerencie os usuários da sua empresa
        </p>
      </div>

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
              className="flex items-center justify-between rounded-2xl border border-border/50 bg-card/50 backdrop-blur-sm p-5 transition-all duration-200 hover:border-border hover:bg-card/80"
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
                    <Badge
                      variant="secondary"
                      className="bg-orange/10 text-orange border border-orange/20 hover:bg-orange/10"
                    >
                      {roleLabels[user.role] ?? user.role}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">{user.email}</p>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
