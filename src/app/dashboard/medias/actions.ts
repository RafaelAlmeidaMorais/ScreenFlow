"use server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getDefaultSlot } from "@/lib/layouts";
import { revalidatePath } from "next/cache";

const MAX_BATCH = 300;

async function requireAdminSession() {
  const session = await auth();
  if (!session) throw new Error("Não autorizado");
  const isAdmin = session.user.isSuperAdmin || session.user.role === "COMPANY_ADMIN";
  if (!isAdmin) throw new Error("Sem permissão");
  return session;
}

type AdminSession = Awaited<ReturnType<typeof requireAdminSession>>;

function companyScope(session: AdminSession) {
  return session.user.isSuperAdmin ? {} : { companyId: session.user.companyId };
}

function cleanIds(ids: unknown): string[] {
  if (!Array.isArray(ids)) return [];
  const valid = ids.filter((id): id is string => typeof id === "string" && id.length > 0);
  return Array.from(new Set(valid)).slice(0, MAX_BATCH);
}

async function writeAudit(
  session: AdminSession,
  action: "CREATE" | "UPDATE" | "DELETE",
  entries: { companyId: string; entityId: string; details: Record<string, unknown> }[],
) {
  if (entries.length === 0) return;
  try {
    await prisma.auditLog.createMany({
      data: entries.map((e) => ({
        userId: session.user.id,
        companyId: e.companyId,
        action,
        entity: "MEDIA",
        entityId: e.entityId,
        details: JSON.stringify(e.details),
      })),
    });
  } catch (error) {
    console.error("Failed to write audit log:", error);
  }
}

function revalidate(screenIds: Iterable<string>) {
  for (const id of new Set(screenIds)) revalidatePath(`/dashboard/screens/${id}`);
  revalidatePath("/dashboard/medias");
  revalidatePath("/dashboard");
}

/**
 * Turns medias on or off. Turning on a media whose end date already passed
 * also clears that end date, otherwise it would stay off the air.
 */
export async function setMediasEnabled(ids: string[], enabled: boolean) {
  const session = await requireAdminSession();
  const medias = await prisma.media.findMany({
    where: { id: { in: cleanIds(ids) }, ...companyScope(session) },
    select: { id: true, title: true, companyId: true, screenId: true, isEnabled: true, endDate: true },
  });
  if (medias.length === 0) throw new Error("Mídia não encontrada");

  const now = new Date();
  const expiredIds = enabled
    ? medias.filter((m) => m.endDate && m.endDate <= now).map((m) => m.id)
    : [];

  await prisma.$transaction([
    prisma.media.updateMany({
      where: { id: { in: medias.map((m) => m.id) } },
      data: { isEnabled: enabled },
    }),
    ...(expiredIds.length
      ? [prisma.media.updateMany({ where: { id: { in: expiredIds } }, data: { endDate: null } })]
      : []),
  ]);

  await writeAudit(
    session,
    "UPDATE",
    medias
      .filter((m) => m.isEnabled !== enabled || expiredIds.includes(m.id))
      .map((m) => ({
        companyId: m.companyId,
        entityId: m.id,
        details: {
          title: m.title,
          isEnabled: { from: m.isEnabled, to: enabled },
          ...(expiredIds.includes(m.id) ? { endDate: { from: m.endDate, to: null } } : {}),
        },
      })),
  );

  revalidate(medias.map((m) => m.screenId));
  return { updated: medias.length, endDateCleared: expiredIds.length };
}

/** Removes medias from their screens. Their playback history goes with them. */
export async function deleteMedias(ids: string[]) {
  const session = await requireAdminSession();
  const medias = await prisma.media.findMany({
    where: { id: { in: cleanIds(ids) }, ...companyScope(session) },
    select: { id: true, title: true, companyId: true, screenId: true },
  });
  if (medias.length === 0) throw new Error("Mídia não encontrada");

  await prisma.media.deleteMany({ where: { id: { in: medias.map((m) => m.id) } } });

  await writeAudit(
    session,
    "DELETE",
    medias.map((m) => ({
      companyId: m.companyId,
      entityId: m.id,
      details: { title: m.title, screenId: m.screenId },
    })),
  );

  revalidate(medias.map((m) => m.screenId));
  return { deleted: medias.length };
}

/**
 * Puts medias that already exist on some screen onto other screens as well.
 * The new entries point at the same uploaded file, so nothing is uploaded or
 * stored twice. A screen that already shows that file is left alone.
 */
export async function assignMediasToScreens(ids: string[], screenIds: string[]) {
  const session = await requireAdminSession();
  const scope = companyScope(session);

  const [medias, screens] = await Promise.all([
    prisma.media.findMany({
      where: { id: { in: cleanIds(ids) }, ...scope },
      orderBy: [{ createdAt: "asc" }, { id: "asc" }],
    }),
    prisma.screen.findMany({
      where: { id: { in: cleanIds(screenIds) }, ...scope },
      select: { id: true, companyId: true, layoutTemplate: true, customLayout: true },
    }),
  ]);
  if (medias.length === 0) throw new Error("Mídia não encontrada");
  if (screens.length === 0) throw new Error("Tela de destino não encontrada");

  const alreadyThere = await prisma.media.findMany({
    where: {
      screenId: { in: screens.map((s) => s.id) },
      fileUrl: { in: medias.map((m) => m.fileUrl) },
    },
    select: { screenId: true, fileUrl: true },
  });
  const taken = new Set(alreadyThere.map((m) => `${m.screenId}|${m.fileUrl}`));

  const data = [];
  let skipped = 0;
  for (const screen of screens) {
    const slot = getDefaultSlot(screen.layoutTemplate, screen.customLayout);
    const last = await prisma.media.findFirst({
      where: { screenId: screen.id, slot },
      orderBy: { orderIndex: "desc" },
      select: { orderIndex: true },
    });
    let orderIndex = (last?.orderIndex ?? -1) + 1;

    for (const media of medias) {
      const key = `${screen.id}|${media.fileUrl}`;
      if (media.companyId !== screen.companyId || taken.has(key)) {
        skipped++;
        continue;
      }
      taken.add(key);
      data.push({
        screenId: screen.id,
        companyId: screen.companyId,
        type: media.type,
        fileUrl: media.fileUrl,
        title: media.title,
        durationSeconds: media.durationSeconds,
        orderIndex: orderIndex++,
        slot,
        startDate: media.startDate,
        endDate: media.endDate,
        isEnabled: media.isEnabled,
        createdById: session.user.id,
      });
    }
  }

  const created = data.length
    ? await prisma.media.createManyAndReturn({
        data,
        select: { id: true, title: true, companyId: true, screenId: true },
      })
    : [];

  await writeAudit(
    session,
    "CREATE",
    created.map((m) => ({
      companyId: m.companyId,
      entityId: m.id,
      details: { title: m.title, action: "assign", to: m.screenId },
    })),
  );

  revalidate(created.map((m) => m.screenId));
  return { created: created.length, skipped };
}
