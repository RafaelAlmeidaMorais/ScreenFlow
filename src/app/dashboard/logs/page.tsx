import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/role-guards";
import { Badge } from "@/components/ui/badge";

const actionLabels: Record<string, string> = {
  CREATE: "Criou",
  UPDATE: "Editou",
  DELETE: "Excluiu",
};

const entityLabels: Record<string, string> = {
  COMPANY: "Instituição",
  USER: "Usuário",
  SCREEN: "Tela",
  MEDIA: "Mídia",
};

const actionColors: Record<string, string> = {
  CREATE: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
  UPDATE: "bg-blue-500/10 text-blue-400 border-blue-500/20",
  DELETE: "bg-red-500/10 text-red-400 border-red-500/20",
};

function timeAgo(date: Date) {
  const seconds = Math.floor((Date.now() - date.getTime()) / 1000);
  if (seconds < 60) return "agora";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}min atrás`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h atrás`;
  const days = Math.floor(hours / 24);
  return `${days}d atrás`;
}

export default async function LogsPage() {
  const session = await auth();
  if (!session) redirect("/login");
  await requireAdmin();

  const isSuperAdmin = session.user.isSuperAdmin;
  const isCompanyAdmin = session.user.role === "COMPANY_ADMIN";

  const logs = await prisma.auditLog.findMany({
    where: isSuperAdmin ? {} : { companyId: session.user.companyId },
    include: {
      user: { select: { name: true, email: true } },
      company: { select: { name: true } },
    },
    orderBy: { createdAt: "desc" },
    take: 100,
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Logs de Auditoria</h1>
        <p className="text-muted-foreground mt-1">
          Histórico de ações realizadas no sistema
        </p>
      </div>

      {logs.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border/50 bg-card/30 p-12 text-center">
          <p className="text-muted-foreground text-sm">Nenhum registro encontrado</p>
        </div>
      ) : (
        <div className="space-y-2">
          {logs.map((log) => {
            let details: Record<string, unknown> | null = null;
            try {
              details = log.details ? JSON.parse(log.details) : null;
            } catch { /* ignore */ }

            return (
              <div
                key={log.id}
                className="flex items-start gap-4 rounded-xl border border-border/50 bg-card/50 px-5 py-4"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-medium">{log.user.name}</span>
                    <Badge variant="secondary" className={`text-xs border ${actionColors[log.action] || ""}`}>
                      {actionLabels[log.action] || log.action}
                    </Badge>
                    <Badge variant="secondary" className="text-xs bg-muted/50 border-border/50">
                      {entityLabels[log.entity] || log.entity}
                    </Badge>
                    {isSuperAdmin && (
                      <span className="text-xs text-muted-foreground/40">{log.company.name}</span>
                    )}
                  </div>
                  {details && (
                    <div className="mt-1.5 text-xs text-muted-foreground/60 space-x-3">
                      {Object.entries(details).map(([key, value]) => {
                        if (typeof value === "object" && value !== null && "from" in value && "to" in value) {
                          const v = value as { from: unknown; to: unknown };
                          return (
                            <span key={key}>
                              <span className="text-muted-foreground/40">{key}:</span>{" "}
                              <span className="line-through text-red-400/60">{String(v.from)}</span>
                              {" → "}
                              <span className="text-emerald-400/60">{String(v.to)}</span>
                            </span>
                          );
                        }
                        return (
                          <span key={key}>
                            <span className="text-muted-foreground/40">{key}:</span> {String(value)}
                          </span>
                        );
                      })}
                    </div>
                  )}
                </div>
                <span className="text-xs text-muted-foreground/40 shrink-0 whitespace-nowrap">
                  {timeAgo(log.createdAt)}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
