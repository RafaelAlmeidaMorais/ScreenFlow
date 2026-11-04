import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/role-guards";
import { Badge } from "@/components/ui/badge";
import { ReportsFilters } from "@/components/dashboard/reports-filters";
import type { Prisma } from "@prisma/client";

interface Props {
  searchParams: Promise<{ q?: string; screen?: string; from?: string; to?: string }>;
}

function formatDate(d: Date) {
  return d.toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatDateShort(d: Date) {
  return d.toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

const typeLabels: Record<string, string> = {
  IMAGE: "Imagem",
  VIDEO: "Vídeo",
};

const typeColors: Record<string, string> = {
  IMAGE: "bg-blue-500/10 text-blue-400 border-blue-500/20",
  VIDEO: "bg-purple-500/10 text-purple-400 border-purple-500/20",
};

export default async function ReportsPage({ searchParams }: Props) {
  const session = await auth();
  if (!session) redirect("/login");
  await requireAdmin();

  const sp = await searchParams;
  const q = sp.q?.trim() ?? "";
  const screenId = sp.screen ?? "";
  const from = sp.from ? new Date(sp.from + "T00:00:00") : null;
  const to = sp.to ? new Date(sp.to + "T23:59:59.999") : null;

  const isSuperAdmin = session.user.isSuperAdmin;
  const companyScope: Prisma.MediaWhereInput = isSuperAdmin
    ? {}
    : { companyId: session.user.companyId };

  const mediaWhere: Prisma.MediaWhereInput = {
    ...companyScope,
    ...(q ? { title: { contains: q, mode: "insensitive" } } : {}),
    ...(screenId ? { screenId } : {}),
  };

  const medias = await prisma.media.findMany({
    where: mediaWhere,
    include: {
      createdBy: { select: { name: true, email: true } },
      screen: { select: { id: true, name: true } },
      company: { select: { name: true } },
    },
    orderBy: { createdAt: "desc" },
    take: 300,
  });

  // Fetch playback aggregates for these medias in one go
  const mediaIds = medias.map((m) => m.id);
  const playbackWhere: Prisma.PlaybackEventWhereInput = {
    mediaId: { in: mediaIds },
    ...(from || to
      ? {
          playedAt: {
            ...(from ? { gte: from } : {}),
            ...(to ? { lte: to } : {}),
          },
        }
      : {}),
  };

  const [playbackCounts, lastPlays] = mediaIds.length
    ? await Promise.all([
        prisma.playbackEvent.groupBy({
          by: ["mediaId"],
          where: playbackWhere,
          _count: { _all: true },
          _sum: { durationMs: true },
        }),
        prisma.playbackEvent.groupBy({
          by: ["mediaId"],
          where: playbackWhere,
          _max: { playedAt: true },
        }),
      ])
    : [[], []];

  const countsMap = new Map(playbackCounts.map((c) => [c.mediaId, c]));
  const lastMap = new Map(lastPlays.map((l) => [l.mediaId, l._max.playedAt]));

  const totalPlays = playbackCounts.reduce((acc, c) => acc + c._count._all, 0);
  const totalMedia = medias.length;
  const totalDurationMs = playbackCounts.reduce((acc, c) => acc + (c._sum.durationMs ?? 0), 0);
  const totalHours = Math.round(totalDurationMs / 3600 / 1000 * 10) / 10;

  // Screens list for filter
  const screens = await prisma.screen.findMany({
    where: isSuperAdmin ? {} : { companyId: session.user.companyId },
    select: { id: true, name: true },
    orderBy: { name: "asc" },
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Relatório de Exibição</h1>
        <p className="text-muted-foreground mt-1">
          Quantas vezes cada mídia foi exibida, por quem foi enviada e quando
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="rounded-xl border border-border/50 bg-card/50 p-4">
          <div className="text-xs text-muted-foreground">Mídias listadas</div>
          <div className="text-2xl font-bold mt-1">{totalMedia}</div>
        </div>
        <div className="rounded-xl border border-border/50 bg-card/50 p-4">
          <div className="text-xs text-muted-foreground">Exibições no período</div>
          <div className="text-2xl font-bold mt-1">{totalPlays.toLocaleString("pt-BR")}</div>
        </div>
        <div className="rounded-xl border border-border/50 bg-card/50 p-4">
          <div className="text-xs text-muted-foreground">Horas totais exibidas</div>
          <div className="text-2xl font-bold mt-1">{totalHours.toLocaleString("pt-BR")}h</div>
        </div>
      </div>

      <ReportsFilters screens={screens} />

      {medias.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border/50 bg-card/30 p-12 text-center">
          <p className="text-muted-foreground text-sm">Nenhuma mídia encontrada</p>
        </div>
      ) : (
        <div className="rounded-xl border border-border/50 bg-card/50 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/30 border-b border-border/50">
                <tr className="text-left text-xs text-muted-foreground">
                  <th className="px-4 py-3 font-medium">Mídia</th>
                  <th className="px-4 py-3 font-medium">Tipo</th>
                  <th className="px-4 py-3 font-medium">Tela</th>
                  {isSuperAdmin && <th className="px-4 py-3 font-medium">Instituição</th>}
                  <th className="px-4 py-3 font-medium">Enviado por</th>
                  <th className="px-4 py-3 font-medium">Inserido em</th>
                  <th className="px-4 py-3 font-medium text-right">Exibições</th>
                  <th className="px-4 py-3 font-medium">Última exibição</th>
                </tr>
              </thead>
              <tbody>
                {medias.map((m) => {
                  const count = countsMap.get(m.id)?._count._all ?? 0;
                  const last = lastMap.get(m.id) ?? null;
                  return (
                    <tr key={m.id} className="border-b border-border/30 last:border-0 hover:bg-muted/20">
                      <td className="px-4 py-3">
                        <div className="font-medium truncate max-w-xs" title={m.title}>{m.title}</div>
                        <div className="text-xs text-muted-foreground/60">
                          {m.isEnabled ? "" : "desativada • "}
                          {m.durationSeconds}s
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <Badge variant="secondary" className={`text-xs border ${typeColors[m.type] || ""}`}>
                          {typeLabels[m.type] || m.type}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">{m.screen.name}</td>
                      {isSuperAdmin && (
                        <td className="px-4 py-3 text-muted-foreground/60 text-xs">{m.company.name}</td>
                      )}
                      <td className="px-4 py-3">
                        <div className="text-sm">{m.createdBy.name}</div>
                        <div className="text-xs text-muted-foreground/60">{m.createdBy.email}</div>
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">{formatDateShort(m.createdAt)}</td>
                      <td className="px-4 py-3 text-right">
                        <span className={`font-bold ${count > 0 ? "text-emerald-400" : "text-muted-foreground/40"}`}>
                          {count.toLocaleString("pt-BR")}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-muted-foreground text-xs">
                        {last ? formatDate(last) : <span className="text-muted-foreground/40">—</span>}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {totalPlays === 0 && (
        <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-4 text-sm text-amber-200/80">
          <strong>Aviso:</strong> ainda não há exibições registradas. O player (APK) precisa ser atualizado
          para enviar eventos de exibição em cada troca de mídia. Até lá, os contadores ficam em zero —
          a lista de mídias, uploader e data de inserção já funcionam normalmente.
        </div>
      )}
    </div>
  );
}
