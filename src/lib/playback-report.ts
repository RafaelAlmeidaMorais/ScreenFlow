import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { APP_TIMEZONE, zonedDayEnd, zonedDayStart } from "@/lib/timezone";

export const MAX_REPORT_MEDIAS = 300;
export const MAX_DAILY_ROWS = 1500;

export interface ReportScope {
  isSuperAdmin: boolean;
  companyId: string;
}

export interface ReportFilters {
  q?: string;
  screenId?: string;
  mediaIds?: string[];
  /** Calendar days (YYYY-MM-DD) in the app timezone, both inclusive. */
  from?: string;
  to?: string;
}

export interface ReportRow {
  id: string;
  title: string;
  type: string;
  durationSeconds: number;
  isEnabled: boolean;
  screenName: string;
  companyName: string;
  createdByName: string;
  createdByEmail: string;
  createdAt: Date;
  plays: number;
  durationMs: number;
  lastPlayedAt: Date | null;
}

export interface DailyRow {
  /** YYYY-MM-DD in the app timezone */
  day: string;
  mediaId: string;
  plays: number;
  durationMs: number;
}

export interface PlaybackReport {
  rows: ReportRow[];
  totals: { plays: number; durationMs: number };
  daily: DailyRow[];
  dailyTruncated: boolean;
}

export async function getPlaybackReport(
  scope: ReportScope,
  filters: ReportFilters,
  opts: { daily?: boolean } = {},
): Promise<PlaybackReport> {
  const from = filters.from ? zonedDayStart(filters.from) : null;
  const to = filters.to ? zonedDayEnd(filters.to) : null;
  const q = filters.q?.trim();

  const medias = await prisma.media.findMany({
    where: {
      ...(scope.isSuperAdmin ? {} : { companyId: scope.companyId }),
      ...(q ? { title: { contains: q, mode: "insensitive" } } : {}),
      ...(filters.screenId ? { screenId: filters.screenId } : {}),
      ...(filters.mediaIds?.length ? { id: { in: filters.mediaIds } } : {}),
    },
    include: {
      createdBy: { select: { name: true, email: true } },
      screen: { select: { name: true } },
      company: { select: { name: true } },
    },
    orderBy: { createdAt: "desc" },
    take: MAX_REPORT_MEDIAS,
  });

  const mediaIds = medias.map((m) => m.id);
  if (mediaIds.length === 0) {
    return { rows: [], totals: { plays: 0, durationMs: 0 }, daily: [], dailyTruncated: false };
  }

  const aggregates = await prisma.playbackEvent.groupBy({
    by: ["mediaId"],
    where: {
      mediaId: { in: mediaIds },
      ...(from || to
        ? { playedAt: { ...(from ? { gte: from } : {}), ...(to ? { lte: to } : {}) } }
        : {}),
    },
    _count: { _all: true },
    _sum: { durationMs: true },
    _max: { playedAt: true },
  });
  const byMedia = new Map(aggregates.map((a) => [a.mediaId, a]));

  const rows: ReportRow[] = medias.map((m) => {
    const agg = byMedia.get(m.id);
    return {
      id: m.id,
      title: m.title,
      type: m.type,
      durationSeconds: m.durationSeconds,
      isEnabled: m.isEnabled,
      screenName: m.screen.name,
      companyName: m.company.name,
      createdByName: m.createdBy.name,
      createdByEmail: m.createdBy.email,
      createdAt: m.createdAt,
      plays: agg?._count._all ?? 0,
      durationMs: agg?._sum.durationMs ?? 0,
      lastPlayedAt: agg?._max.playedAt ?? null,
    };
  });

  const totals = rows.reduce(
    (acc, r) => ({ plays: acc.plays + r.plays, durationMs: acc.durationMs + r.durationMs }),
    { plays: 0, durationMs: 0 },
  );

  let daily: DailyRow[] = [];
  let dailyTruncated = false;
  if (opts.daily) {
    // playedAt is a UTC "timestamp without time zone"; shift it to the app
    // timezone before cutting by day so a 22h play doesn't land on the next day.
    daily = await prisma.$queryRaw<DailyRow[]>(Prisma.sql`
      SELECT
        to_char(("playedAt" AT TIME ZONE 'UTC') AT TIME ZONE ${APP_TIMEZONE}, 'YYYY-MM-DD') AS "day",
        "mediaId",
        COUNT(*)::int AS "plays",
        COALESCE(SUM("durationMs"), 0)::float8 AS "durationMs"
      FROM "playback_events"
      WHERE "mediaId" IN (${Prisma.join(mediaIds)})
        ${from ? Prisma.sql`AND "playedAt" >= ${from}::timestamp` : Prisma.empty}
        ${to ? Prisma.sql`AND "playedAt" <= ${to}::timestamp` : Prisma.empty}
      GROUP BY 1, 2
      ORDER BY 1, 2
      LIMIT ${MAX_DAILY_ROWS + 1}
    `);
    if (daily.length > MAX_DAILY_ROWS) {
      daily = daily.slice(0, MAX_DAILY_ROWS);
      dailyTruncated = true;
    }
  }

  return { rows, totals, daily, dailyTruncated };
}

/** `5400000` -> `1h 30min` */
export function formatDuration(ms: number): string {
  const totalSeconds = Math.round(ms / 1000);
  const h = Math.floor(totalSeconds / 3600);
  const min = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;
  if (h > 0) return `${h}h ${String(min).padStart(2, "0")}min`;
  if (min > 0) return `${min}min ${String(s).padStart(2, "0")}s`;
  return `${s}s`;
}
