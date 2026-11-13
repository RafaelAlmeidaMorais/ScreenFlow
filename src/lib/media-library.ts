import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { formatDateTime } from "@/lib/timezone";
import type { MediaRow, MediaStatus } from "@/components/dashboard/medias-manager";

export const MAX_LISTED_MEDIAS = 300;
export const MEDIA_STATUSES: MediaStatus[] = ["active", "scheduled", "disabled", "expired"];

export interface MediaLibraryScope {
  isSuperAdmin: boolean;
  companyId: string;
}

export interface MediaLibraryFilters {
  q?: string;
  screenIds?: string[];
  status?: MediaStatus | "";
}

// Same precedence as the badges: an ended media is "expired" even if switched off.
function statusOf(m: { isEnabled: boolean; startDate: Date; endDate: Date | null }, now: Date): MediaStatus {
  if (m.endDate && m.endDate <= now) return "expired";
  if (!m.isEnabled) return "disabled";
  if (m.startDate > now) return "scheduled";
  return "active";
}

function statusWhere(status: MediaStatus, now: Date): Prisma.MediaWhereInput {
  const notEnded: Prisma.MediaWhereInput = { OR: [{ endDate: null }, { endDate: { gt: now } }] };
  switch (status) {
    case "expired":
      return { endDate: { lte: now } };
    case "disabled":
      return { isEnabled: false, ...notEnded };
    case "scheduled":
      return { isEnabled: true, startDate: { gt: now }, ...notEnded };
    case "active":
      return { isEnabled: true, startDate: { lte: now }, ...notEnded };
  }
}

/**
 * Every media placed on a screen, newest first, with the other screens that
 * show the same uploaded file.
 */
export async function getMediaLibrary(scope: MediaLibraryScope, filters: MediaLibraryFilters) {
  const companyScope = scope.isSuperAdmin ? {} : { companyId: scope.companyId };
  const now = new Date();
  const q = filters.q?.trim();
  const screenIds = filters.screenIds ?? [];
  const status = filters.status || "";

  const where: Prisma.MediaWhereInput = {
    ...companyScope,
    ...(q ? { title: { contains: q, mode: "insensitive" } } : {}),
    ...(screenIds.length ? { screenId: { in: screenIds } } : {}),
    ...(status ? statusWhere(status, now) : {}),
  };

  const [medias, total, screens] = await Promise.all([
    prisma.media.findMany({
      where,
      include: {
        screen: { select: { name: true } },
        company: { select: { name: true } },
        createdBy: { select: { name: true } },
      },
      orderBy: [{ createdAt: "desc" }, { id: "asc" }],
      take: MAX_LISTED_MEDIAS,
    }),
    prisma.media.count({ where }),
    prisma.screen.findMany({
      where: companyScope,
      select: { id: true, name: true, companyId: true, company: { select: { name: true } } },
      orderBy: { name: "asc" },
    }),
  ]);

  // Every screen that shows each listed file, including screens outside the
  // current filter, so "also on" is the whole picture.
  const fileUrls = Array.from(new Set(medias.map((m) => m.fileUrl)));
  const placements = fileUrls.length
    ? await prisma.media.findMany({
        where: { ...companyScope, fileUrl: { in: fileUrls } },
        select: { fileUrl: true, screenId: true, screen: { select: { name: true } } },
      })
    : [];
  const screensByFile = new Map<string, Map<string, string>>();
  for (const p of placements) {
    if (!screensByFile.has(p.fileUrl)) screensByFile.set(p.fileUrl, new Map());
    screensByFile.get(p.fileUrl)!.set(p.screenId, p.screen.name);
  }

  const rows: MediaRow[] = medias.map((m) => {
    const onScreens = screensByFile.get(m.fileUrl) ?? new Map<string, string>();
    return {
      id: m.id,
      title: m.title,
      fileUrl: m.fileUrl,
      type: m.type,
      durationSeconds: m.durationSeconds,
      isEnabled: m.isEnabled,
      startDate: m.startDate.toISOString(),
      endDate: m.endDate?.toISOString() ?? null,
      startLabel: formatDateTime(m.startDate),
      endLabel: m.endDate ? formatDateTime(m.endDate) : null,
      status: statusOf(m, now),
      screenId: m.screenId,
      screenName: m.screen.name,
      companyId: m.companyId,
      companyName: m.company.name,
      createdAtLabel: formatDateTime(m.createdAt),
      createdByName: m.createdBy.name,
      alsoOn: Array.from(onScreens.entries())
        .filter(([id]) => id !== m.screenId)
        .map(([, name]) => name)
        .sort((a, b) => a.localeCompare(b, "pt-BR")),
      fileScreenIds: Array.from(onScreens.keys()),
    };
  });

  const onAir = rows.filter((r) => r.status === "active").length;
  const sharedFiles = fileUrls.filter((url) => (screensByFile.get(url)?.size ?? 0) > 1).length;

  return { rows, screens, total, onAir, sharedFiles };
}
