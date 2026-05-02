"use server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { logAudit } from "@/lib/audit";
import { generateSlug } from "@/lib/slug";
import {
  LAYOUT_DEFINITIONS,
  getDefaultSlot,
  getSlotNames,
  type AspectRatio,
  type LayoutTemplate,
  type Orientation,
} from "@/lib/layouts";
import { revalidatePath } from "next/cache";

const VALID_ORIENTATIONS: Orientation[] = ["LANDSCAPE", "PORTRAIT"];
const VALID_ASPECT_RATIOS: AspectRatio[] = ["AUTO", "16:9", "9:16", "4:3", "1:1"];
const VALID_LAYOUT_TEMPLATES = Object.keys(LAYOUT_DEFINITIONS) as LayoutTemplate[];

export async function createScreen(formData: FormData) {
  const session = await auth();
  if (!session) throw new Error("Não autorizado");

  if (session.user.role === "VIEWER" && !session.user.isSuperAdmin) {
    throw new Error("Sem permissão");
  }

  const name = formData.get("name") as string;
  const slug = formData.get("slug") as string;
  const description = formData.get("description") as string;
  const intervalSeconds = parseInt(formData.get("intervalSeconds") as string) || 10;

  if (!name?.trim()) throw new Error("Nome é obrigatório");
  if (name.trim().length > 100) throw new Error("Nome muito longo (máx. 100 caracteres)");

  const finalSlug = slug?.trim() || generateSlug(name);

  // Validate slug format
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(finalSlug)) {
    throw new Error("Slug inválido. Use apenas letras minúsculas, números e hífens.");
  }
  if (finalSlug.length > 80) throw new Error("Slug muito longo (máx. 80 caracteres)");

  // Check slug uniqueness
  const existing = await prisma.screen.findUnique({ where: { slug: finalSlug } });
  if (existing) throw new Error("Slug já está em uso");

  const companyId = session.user.isSuperAdmin
    ? (formData.get("companyId") as string) || session.user.companyId
    : session.user.companyId;

  const screen = await prisma.screen.create({
    data: {
      companyId,
      name: name.trim(),
      slug: finalSlug,
      description: description?.trim() || null,
      intervalSeconds,
      isActive: true,
    },
  });

  await logAudit({
    userId: session.user.id,
    companyId,
    action: "CREATE",
    entity: "SCREEN",
    entityId: screen.id,
    details: { name: screen.name, slug: screen.slug },
  });

  revalidatePath("/dashboard/screens");
  revalidatePath("/dashboard");
}

export async function updateScreen(screenId: string, formData: FormData) {
  const session = await auth();
  if (!session) throw new Error("Não autorizado");

  if (session.user.role === "VIEWER" && !session.user.isSuperAdmin) {
    throw new Error("Sem permissão");
  }

  const name = formData.get("name") as string;
  const slug = formData.get("slug") as string;
  const description = formData.get("description") as string;
  const intervalSeconds = parseInt(formData.get("intervalSeconds") as string) || 10;
  const isActive = formData.get("isActive") === "true";
  const showProgressBar = formData.get("showProgressBar") !== "false";
  const orientationRaw = (formData.get("orientation") as string | null)?.trim() || "LANDSCAPE";
  const aspectRatioRaw = (formData.get("aspectRatio") as string | null)?.trim() || "AUTO";
  const layoutTemplateRaw = (formData.get("layoutTemplate") as string | null)?.trim() || "FULLSCREEN";

  const orientation = (VALID_ORIENTATIONS as string[]).includes(orientationRaw)
    ? (orientationRaw as Orientation)
    : "LANDSCAPE";
  const aspectRatio = (VALID_ASPECT_RATIOS as string[]).includes(aspectRatioRaw)
    ? (aspectRatioRaw as AspectRatio)
    : "AUTO";
  const layoutTemplate = (VALID_LAYOUT_TEMPLATES as string[]).includes(layoutTemplateRaw)
    ? (layoutTemplateRaw as LayoutTemplate)
    : "FULLSCREEN";

  if (!name?.trim()) throw new Error("Nome é obrigatório");
  if (name.trim().length > 100) throw new Error("Nome muito longo (máx. 100 caracteres)");
  if (!slug?.trim()) throw new Error("Slug é obrigatório");
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug.trim())) {
    throw new Error("Slug inválido. Use apenas letras minúsculas, números e hífens.");
  }
  if (slug.trim().length > 80) throw new Error("Slug muito longo (máx. 80 caracteres)");

  // Check slug uniqueness (excluding current screen)
  const existing = await prisma.screen.findUnique({ where: { slug: slug.trim() } });
  if (existing && existing.id !== screenId) throw new Error("Slug já está em uso");

  const whereClause = session.user.isSuperAdmin
    ? { id: screenId }
    : { id: screenId, companyId: session.user.companyId };

  const oldScreen = await prisma.screen.findFirst({ where: whereClause });
  if (!oldScreen) throw new Error("Tela não encontrada");

  const templateChanged = oldScreen.layoutTemplate !== layoutTemplate;

  const screen = await prisma.$transaction(async (tx) => {
    const updated = await tx.screen.update({
      where: { id: screenId },
      data: {
        name: name.trim(),
        slug: slug.trim(),
        description: description?.trim() || null,
        intervalSeconds,
        isActive,
        showProgressBar,
        orientation,
        aspectRatio,
        layoutTemplate,
      },
    });

    // If the layout template changed, move any medias whose current
    // slot no longer exists in the new template to the default slot.
    if (templateChanged) {
      const validSlots = getSlotNames(layoutTemplate);
      const defaultSlot = getDefaultSlot(layoutTemplate);
      await tx.media.updateMany({
        where: {
          screenId,
          slot: { notIn: validSlots },
        },
        data: { slot: defaultSlot },
      });
    }

    return updated;
  });

  // Build changes for audit
  const changes: Record<string, unknown> = {};
  if (oldScreen.name !== screen.name) changes.name = { from: oldScreen.name, to: screen.name };
  if (oldScreen.slug !== screen.slug) changes.slug = { from: oldScreen.slug, to: screen.slug };
  if (oldScreen.isActive !== screen.isActive) changes.isActive = { from: oldScreen.isActive, to: screen.isActive };
  if (oldScreen.showProgressBar !== screen.showProgressBar) changes.showProgressBar = { from: oldScreen.showProgressBar, to: screen.showProgressBar };
  if (oldScreen.intervalSeconds !== screen.intervalSeconds) changes.intervalSeconds = { from: oldScreen.intervalSeconds, to: screen.intervalSeconds };
  if (oldScreen.orientation !== screen.orientation) changes.orientation = { from: oldScreen.orientation, to: screen.orientation };
  if (oldScreen.aspectRatio !== screen.aspectRatio) changes.aspectRatio = { from: oldScreen.aspectRatio, to: screen.aspectRatio };
  if (oldScreen.layoutTemplate !== screen.layoutTemplate) changes.layoutTemplate = { from: oldScreen.layoutTemplate, to: screen.layoutTemplate };

  await logAudit({
    userId: session.user.id,
    companyId: screen.companyId,
    action: "UPDATE",
    entity: "SCREEN",
    entityId: screen.id,
    details: changes,
  });

  revalidatePath("/dashboard/screens");
  revalidatePath(`/dashboard/screens/${screenId}`);
  revalidatePath("/dashboard");
}

export async function refreshScreen(screenId: string) {
  const session = await auth();
  if (!session) throw new Error("Não autorizado");

  if (session.user.role === "VIEWER" && !session.user.isSuperAdmin) {
    throw new Error("Sem permissão");
  }

  const whereClause = session.user.isSuperAdmin
    ? { id: screenId }
    : { id: screenId, companyId: session.user.companyId };

  await prisma.screen.update({
    where: whereClause,
    data: { refreshRequestedAt: new Date() },
  });

  await logAudit({
    userId: session.user.id,
    companyId: session.user.companyId,
    action: "UPDATE",
    entity: "SCREEN",
    entityId: screenId,
    details: { action: "refresh_requested" },
  });

  revalidatePath(`/dashboard/screens/${screenId}`);
}

export async function duplicateScreen(screenId: string) {
  const session = await auth();
  if (!session) throw new Error("Não autorizado");

  if (session.user.role === "VIEWER" && !session.user.isSuperAdmin) {
    throw new Error("Sem permissão");
  }

  const whereClause = session.user.isSuperAdmin
    ? { id: screenId }
    : { id: screenId, companyId: session.user.companyId };

  const screen = await prisma.screen.findFirst({
    where: whereClause,
    include: { medias: { orderBy: { orderIndex: "asc" } } },
  });

  if (!screen) throw new Error("Tela não encontrada");

  // Generate unique slug
  let baseSlug = screen.slug + "-copia";
  let finalSlug = baseSlug;
  let attempt = 0;
  while (await prisma.screen.findUnique({ where: { slug: finalSlug } })) {
    attempt++;
    finalSlug = baseSlug + "-" + attempt;
  }

  const newScreen = await prisma.screen.create({
    data: {
      companyId: screen.companyId,
      name: screen.name + " (Cópia)",
      slug: finalSlug,
      description: screen.description,
      intervalSeconds: screen.intervalSeconds,
      isActive: screen.isActive,
      showProgressBar: screen.showProgressBar,
      autoRefreshMinutes: screen.autoRefreshMinutes,
      orientation: screen.orientation,
      aspectRatio: screen.aspectRatio,
      layoutTemplate: screen.layoutTemplate,
    },
  });

  // Copy all medias
  if (screen.medias.length > 0) {
    await prisma.media.createMany({
      data: screen.medias.map((m) => ({
        screenId: newScreen.id,
        companyId: m.companyId,
        type: m.type,
        fileUrl: m.fileUrl,
        title: m.title,
        durationSeconds: m.durationSeconds,
        orderIndex: m.orderIndex,
        slot: m.slot,
        startDate: m.startDate,
        endDate: m.endDate,
        isEnabled: m.isEnabled,
        createdById: session.user.id,
      })),
    });
  }

  await logAudit({
    userId: session.user.id,
    companyId: screen.companyId,
    action: "CREATE",
    entity: "SCREEN",
    entityId: newScreen.id,
    details: { name: newScreen.name, slug: newScreen.slug, duplicatedFrom: screen.id, mediasCount: screen.medias.length },
  });

  revalidatePath("/dashboard/screens");
  revalidatePath("/dashboard");

  return newScreen.id;
}

export async function deleteScreen(screenId: string) {
  const session = await auth();
  if (!session) throw new Error("Não autorizado");

  if (session.user.role === "VIEWER" && !session.user.isSuperAdmin) {
    throw new Error("Sem permissão");
  }

  const whereClause = session.user.isSuperAdmin
    ? { id: screenId }
    : { id: screenId, companyId: session.user.companyId };

  const screen = await prisma.screen.findFirst({ where: whereClause });
  if (!screen) throw new Error("Tela não encontrada");

  await prisma.media.deleteMany({ where: { screenId } });
  await prisma.screen.delete({ where: { id: screenId } });

  await logAudit({
    userId: session.user.id,
    companyId: screen.companyId,
    action: "DELETE",
    entity: "SCREEN",
    entityId: screenId,
    details: { name: screen.name, slug: screen.slug },
  });

  revalidatePath("/dashboard/screens");
  revalidatePath("/dashboard");
}
