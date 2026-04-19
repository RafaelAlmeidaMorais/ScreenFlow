"use server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { logAudit } from "@/lib/audit";
import { getDefaultSlot, isValidSlot } from "@/lib/layouts";
import { revalidatePath } from "next/cache";

const ALLOWED_FILE_DOMAINS = [
  process.env.R2_PUBLIC_URL,
].filter(Boolean).map((u) => new URL(u!).hostname);

function isAllowedFileUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    return ALLOWED_FILE_DOMAINS.includes(parsed.hostname);
  } catch {
    return false;
  }
}

export async function createMedia(screenId: string, formData: FormData) {
  const session = await auth();
  if (!session) throw new Error("Não autorizado");

  // Role check: VIEWER cannot create media
  if (session.user.role === "VIEWER" && !session.user.isSuperAdmin) {
    throw new Error("Sem permissão");
  }

  const title = formData.get("title") as string;
  const fileUrl = formData.get("fileUrl") as string;
  const type = formData.get("type") as string;
  const durationSeconds = parseInt(formData.get("durationSeconds") as string) || 10;
  const startDate = formData.get("startDate") as string;
  const endDate = formData.get("endDate") as string;
  const slotRaw = (formData.get("slot") as string | null)?.trim() || "";

  if (!title?.trim()) throw new Error("Título é obrigatório");
  if (title.trim().length > 200) throw new Error("Título muito longo (máx. 200 caracteres)");
  if (!fileUrl?.trim()) throw new Error("URL do arquivo é obrigatória");

  // Validate fileUrl against allowed domains
  if (!isAllowedFileUrl(fileUrl.trim())) {
    throw new Error("URL do arquivo não é permitida");
  }

  // Clamp duration to valid range
  const clampedDuration = Math.max(3, Math.min(300, durationSeconds));

  // Verify screenId belongs to user's company (IDOR protection)
  const screenWhereClause = session.user.isSuperAdmin
    ? { id: screenId }
    : { id: screenId, companyId: session.user.companyId };

  const screen = await prisma.screen.findFirst({ where: screenWhereClause });
  if (!screen) throw new Error("Tela não encontrada");

  const companyId = screen.companyId;

  // Resolve slot: use provided if valid for this screen's template,
  // otherwise fall back to the template's default slot.
  const slot = slotRaw && isValidSlot(screen.layoutTemplate, slotRaw)
    ? slotRaw
    : getDefaultSlot(screen.layoutTemplate);

  // orderIndex is per-slot so items stack correctly inside each zone.
  const lastMedia = await prisma.media.findFirst({
    where: { screenId, slot },
    orderBy: { orderIndex: "desc" },
  });

  const media = await prisma.media.create({
    data: {
      screenId,
      companyId,
      title: title.trim(),
      fileUrl: fileUrl.trim(),
      type: type === "VIDEO" ? "VIDEO" : "IMAGE",
      durationSeconds: clampedDuration,
      orderIndex: (lastMedia?.orderIndex ?? -1) + 1,
      slot,
      startDate: startDate ? new Date(startDate) : new Date(),
      endDate: endDate ? new Date(endDate) : null,
      isEnabled: true,
      createdById: session.user.id,
    },
  });

  await logAudit({
    userId: session.user.id,
    companyId,
    action: "CREATE",
    entity: "MEDIA",
    entityId: media.id,
    details: { title: media.title, type: media.type, screenId },
  });

  revalidatePath(`/dashboard/screens/${screenId}`);
  revalidatePath("/dashboard");
}

export async function updateMedia(mediaId: string, screenId: string, formData: FormData) {
  const session = await auth();
  if (!session) throw new Error("Não autorizado");

  if (session.user.role === "VIEWER" && !session.user.isSuperAdmin) {
    throw new Error("Sem permissão");
  }

  const title = formData.get("title") as string;
  const fileUrl = formData.get("fileUrl") as string;
  const type = formData.get("type") as string;
  const durationSeconds = parseInt(formData.get("durationSeconds") as string) || 10;
  const startDate = formData.get("startDate") as string;
  const endDate = formData.get("endDate") as string;
  const isEnabled = formData.get("isEnabled") === "true";

  if (!title?.trim()) throw new Error("Título é obrigatório");
  if (!fileUrl?.trim()) throw new Error("URL do arquivo é obrigatória");

  if (!isAllowedFileUrl(fileUrl.trim())) {
    throw new Error("URL do arquivo não é permitida");
  }

  const whereClause = session.user.isSuperAdmin
    ? { id: mediaId }
    : { id: mediaId, companyId: session.user.companyId };

  const oldMedia = await prisma.media.findFirst({ where: whereClause });
  if (!oldMedia) throw new Error("Mídia não encontrada");

  const media = await prisma.media.update({
    where: { id: mediaId },
    data: {
      title: title.trim(),
      fileUrl: fileUrl.trim(),
      type: type === "VIDEO" ? "VIDEO" : "IMAGE",
      durationSeconds,
      startDate: startDate ? new Date(startDate) : new Date(),
      endDate: endDate ? new Date(endDate) : null,
      isEnabled,
    },
  });

  const changes: Record<string, unknown> = {};
  if (oldMedia.title !== media.title) changes.title = { from: oldMedia.title, to: media.title };
  if (oldMedia.isEnabled !== media.isEnabled) changes.isEnabled = { from: oldMedia.isEnabled, to: media.isEnabled };
  if (oldMedia.type !== media.type) changes.type = { from: oldMedia.type, to: media.type };

  await logAudit({
    userId: session.user.id,
    companyId: media.companyId,
    action: "UPDATE",
    entity: "MEDIA",
    entityId: media.id,
    details: changes,
  });

  revalidatePath(`/dashboard/screens/${screenId}`);
  revalidatePath("/dashboard");
}

export async function deleteMedia(mediaId: string, screenId: string) {
  const session = await auth();
  if (!session) throw new Error("Não autorizado");

  if (session.user.role === "VIEWER" && !session.user.isSuperAdmin) {
    throw new Error("Sem permissão");
  }

  const whereClause = session.user.isSuperAdmin
    ? { id: mediaId }
    : { id: mediaId, companyId: session.user.companyId };

  const media = await prisma.media.findFirst({ where: whereClause });
  if (!media) throw new Error("Mídia não encontrada");

  await prisma.media.delete({ where: { id: mediaId } });

  await logAudit({
    userId: session.user.id,
    companyId: media.companyId,
    action: "DELETE",
    entity: "MEDIA",
    entityId: mediaId,
    details: { title: media.title, screenId },
  });

  revalidatePath(`/dashboard/screens/${screenId}`);
  revalidatePath("/dashboard");
}

export async function reorderMedias(
  screenId: string,
  orderedIds: string[],
  slot?: string,
) {
  const session = await auth();
  if (!session) throw new Error("Não autorizado");

  if (session.user.role === "VIEWER" && !session.user.isSuperAdmin) {
    throw new Error("Sem permissão");
  }

  // Verify screen belongs to user's company
  const screenWhereClause = session.user.isSuperAdmin
    ? { id: screenId }
    : { id: screenId, companyId: session.user.companyId };

  const screen = await prisma.screen.findFirst({ where: screenWhereClause });
  if (!screen) throw new Error("Tela não encontrada");

  // Scope reorder to the given slot when provided (prevents cross-slot
  // orderIndex collisions). When slot is omitted, behaves as legacy.
  const updates = orderedIds.map((id, index) =>
    prisma.media.updateMany({
      where: slot ? { id, screenId, slot } : { id, screenId },
      data: { orderIndex: index },
    })
  );

  await prisma.$transaction(updates);

  await logAudit({
    userId: session.user.id,
    companyId: screen.companyId,
    action: "UPDATE",
    entity: "SCREEN",
    entityId: screenId,
    details: { action: "reorder_medias", count: orderedIds.length, slot: slot ?? null },
  });

  revalidatePath(`/dashboard/screens/${screenId}`);
}

export async function moveMediaToSlot(
  mediaId: string,
  screenId: string,
  targetSlot: string,
) {
  const session = await auth();
  if (!session) throw new Error("Não autorizado");

  if (session.user.role === "VIEWER" && !session.user.isSuperAdmin) {
    throw new Error("Sem permissão");
  }

  const whereClause = session.user.isSuperAdmin
    ? { id: mediaId }
    : { id: mediaId, companyId: session.user.companyId };

  const media = await prisma.media.findFirst({ where: whereClause });
  if (!media) throw new Error("Mídia não encontrada");

  // Verify screen and validate target slot against its layout template
  const screenWhere = session.user.isSuperAdmin
    ? { id: screenId }
    : { id: screenId, companyId: session.user.companyId };

  const screen = await prisma.screen.findFirst({ where: screenWhere });
  if (!screen) throw new Error("Tela não encontrada");
  if (media.screenId !== screen.id) throw new Error("Mídia não pertence a esta tela");

  if (!isValidSlot(screen.layoutTemplate, targetSlot)) {
    throw new Error("Slot inválido para o layout atual");
  }

  if (media.slot === targetSlot) return;

  // Append to the end of the target slot
  const lastMedia = await prisma.media.findFirst({
    where: { screenId, slot: targetSlot },
    orderBy: { orderIndex: "desc" },
  });

  await prisma.media.update({
    where: { id: mediaId },
    data: {
      slot: targetSlot,
      orderIndex: (lastMedia?.orderIndex ?? -1) + 1,
    },
  });

  await logAudit({
    userId: session.user.id,
    companyId: media.companyId,
    action: "UPDATE",
    entity: "MEDIA",
    entityId: mediaId,
    details: { action: "move_to_slot", from: media.slot, to: targetSlot },
  });

  revalidatePath(`/dashboard/screens/${screenId}`);
}

export async function copyMedia(mediaId: string, targetScreenId: string, sourceScreenId: string) {
  const session = await auth();
  if (!session) throw new Error("Não autorizado");

  if (session.user.role === "VIEWER" && !session.user.isSuperAdmin) {
    throw new Error("Sem permissão");
  }

  const whereClause = session.user.isSuperAdmin
    ? { id: mediaId }
    : { id: mediaId, companyId: session.user.companyId };

  const media = await prisma.media.findFirst({ where: whereClause });
  if (!media) throw new Error("Mídia não encontrada");

  // Validate targetScreenId belongs to user's company (IDOR protection)
  const targetScreenWhere = session.user.isSuperAdmin
    ? { id: targetScreenId }
    : { id: targetScreenId, companyId: session.user.companyId };

  const targetScreen = await prisma.screen.findFirst({ where: targetScreenWhere });
  if (!targetScreen) throw new Error("Tela de destino não encontrada");

  const lastMedia = await prisma.media.findFirst({
    where: { screenId: targetScreenId },
    orderBy: { orderIndex: "desc" },
  });

  const newMedia = await prisma.media.create({
    data: {
      screenId: targetScreenId,
      companyId: media.companyId,
      type: media.type,
      fileUrl: media.fileUrl,
      title: media.title,
      durationSeconds: media.durationSeconds,
      orderIndex: (lastMedia?.orderIndex ?? -1) + 1,
      startDate: media.startDate,
      endDate: media.endDate,
      isEnabled: media.isEnabled,
      createdById: session.user.id,
    },
  });

  await logAudit({
    userId: session.user.id,
    companyId: media.companyId,
    action: "CREATE",
    entity: "MEDIA",
    entityId: newMedia.id,
    details: { title: media.title, action: "copy", from: sourceScreenId, to: targetScreenId },
  });

  revalidatePath(`/dashboard/screens/${sourceScreenId}`);
  revalidatePath(`/dashboard/screens/${targetScreenId}`);
  revalidatePath("/dashboard");
}

export async function moveMedia(mediaId: string, targetScreenId: string, sourceScreenId: string) {
  const session = await auth();
  if (!session) throw new Error("Não autorizado");

  if (session.user.role === "VIEWER" && !session.user.isSuperAdmin) {
    throw new Error("Sem permissão");
  }

  const whereClause = session.user.isSuperAdmin
    ? { id: mediaId }
    : { id: mediaId, companyId: session.user.companyId };

  const media = await prisma.media.findFirst({ where: whereClause });
  if (!media) throw new Error("Mídia não encontrada");

  // Validate targetScreenId belongs to user's company (IDOR protection)
  const targetScreenWhere = session.user.isSuperAdmin
    ? { id: targetScreenId }
    : { id: targetScreenId, companyId: session.user.companyId };

  const targetScreen = await prisma.screen.findFirst({ where: targetScreenWhere });
  if (!targetScreen) throw new Error("Tela de destino não encontrada");

  const lastMedia = await prisma.media.findFirst({
    where: { screenId: targetScreenId },
    orderBy: { orderIndex: "desc" },
  });

  await prisma.media.update({
    where: { id: mediaId },
    data: {
      screenId: targetScreenId,
      orderIndex: (lastMedia?.orderIndex ?? -1) + 1,
    },
  });

  await logAudit({
    userId: session.user.id,
    companyId: media.companyId,
    action: "UPDATE",
    entity: "MEDIA",
    entityId: mediaId,
    details: { title: media.title, action: "move", from: sourceScreenId, to: targetScreenId },
  });

  revalidatePath(`/dashboard/screens/${sourceScreenId}`);
  revalidatePath(`/dashboard/screens/${targetScreenId}`);
  revalidatePath("/dashboard");
}
