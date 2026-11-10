import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/role-guards";
import { ReportsFilters } from "@/components/dashboard/reports-filters";
import { ReportsTable } from "@/components/dashboard/reports-table";
import { getPlaybackReport } from "@/lib/playback-report";
import { APP_TIMEZONE, formatDateTime, formatDay, timezoneLabel, zonedDayStart } from "@/lib/timezone";

interface Props {
  searchParams: Promise<{ q?: string; screen?: string; from?: string; to?: string }>;
}

export default async function ReportsPage({ searchParams }: Props) {
  const session = await auth();
  if (!session) redirect("/login");
  await requireAdmin();

  const sp = await searchParams;
  const q = sp.q?.trim() ?? "";
  const screenId = sp.screen ?? "";
  const from = sp.from && zonedDayStart(sp.from) ? sp.from : "";
  const to = sp.to && zonedDayStart(sp.to) ? sp.to : "";

  const isSuperAdmin = session.user.isSuperAdmin;

  const [report, screens] = await Promise.all([
    getPlaybackReport(
      { isSuperAdmin, companyId: session.user.companyId },
      { q, screenId, from, to },
    ),
    prisma.screen.findMany({
      where: isSuperAdmin ? {} : { companyId: session.user.companyId },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
  ]);

  const totalHours = Math.round((report.totals.durationMs / 3600 / 1000) * 10) / 10;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Relatório de Exibição</h1>
        <p className="text-muted-foreground mt-1">
          Quantas vezes cada mídia foi exibida, por quem foi enviada e quando
        </p>
        <p className="text-xs text-muted-foreground/60 mt-1">
          Datas e horários em {timezoneLabel()} ({APP_TIMEZONE})
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="rounded-xl border border-border/50 bg-card/50 p-4">
          <div className="text-xs text-muted-foreground">Mídias listadas</div>
          <div className="text-2xl font-bold mt-1">{report.rows.length}</div>
        </div>
        <div className="rounded-xl border border-border/50 bg-card/50 p-4">
          <div className="text-xs text-muted-foreground">Exibições no período</div>
          <div className="text-2xl font-bold mt-1">{report.totals.plays.toLocaleString("pt-BR")}</div>
        </div>
        <div className="rounded-xl border border-border/50 bg-card/50 p-4">
          <div className="text-xs text-muted-foreground">Horas totais exibidas</div>
          <div className="text-2xl font-bold mt-1">{totalHours.toLocaleString("pt-BR")}h</div>
        </div>
      </div>

      <ReportsFilters screens={screens} />

      {report.rows.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border/50 bg-card/30 p-12 text-center">
          <p className="text-muted-foreground text-sm">Nenhuma mídia encontrada</p>
        </div>
      ) : (
        <ReportsTable
          rows={report.rows.map((r) => ({
            id: r.id,
            title: r.title,
            type: r.type,
            durationSeconds: r.durationSeconds,
            isEnabled: r.isEnabled,
            screenName: r.screenName,
            companyName: r.companyName,
            createdByName: r.createdByName,
            createdByEmail: r.createdByEmail,
            createdAtLabel: formatDay(r.createdAt),
            plays: r.plays,
            lastPlayedLabel: r.lastPlayedAt ? formatDateTime(r.lastPlayedAt) : null,
          }))}
          showCompany={isSuperAdmin}
          filters={{ q, screen: screenId, from, to }}
        />
      )}

      {report.rows.length > 0 && report.totals.plays === 0 && (
        <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-4 text-sm text-amber-200/80">
          Nenhuma exibição registrada para este filtro. As exibições entram no relatório conforme os
          players trocam de mídia.
        </div>
      )}
    </div>
  );
}
