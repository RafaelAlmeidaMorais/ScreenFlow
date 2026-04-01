"use server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { logAudit } from "@/lib/audit";
import { generateSlug } from "@/lib/slug";
import { revalidatePath } from "next/cache";

export async function createScreen(formData: FormData) {
  const session = await auth();
  if (!session) throw new Error("Não autorizado");

  const name = formData.get("name") as string;
  const slug = formData.get("slug") as string;
  const description = formData.get("description") as string;
  const intervalSeconds = parseInt(formData.get("intervalSeconds") as string) || 10;

  if (!name?.trim()) throw new Error("Nome é obrigatório");

  const finalSlug = slug?.trim() || generateSlug(name);

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

  const name = formData.get("name") as string;
  const slug = formData.get("slug") as string;
  const description = formData.get("description") as string;
  const intervalSeconds = parseInt(formData.get("intervalSeconds") as string) || 10;
  const isActive = formData.get("isActive") === "true";
  const showProgressBar = formData.get("showProgressBar") !== "false";

  if (!name?.trim()) throw new Error("Nome é obrigatório");
  if (!slug?.trim()) throw new Error("Slug é obrigatório");

  // Check slug uniqueness (excluding current screen)
  const existing = await prisma.screen.findUnique({ where: { slug: slug.trim() } });
  if (existing && existing.id !== screenId) throw new Error("Slug já está em uso");

  const whereClause = session.user.isSuperAdmin
    ? { id: screenId }
    : { id: screenId, companyId: session.user.companyId };

  const oldScreen = await prisma.screen.findFirst({ where: whereClause });
  if (!oldScreen) throw new Error("Tela não encontrada");

  const screen = await prisma.screen.update({
    where: { id: screenId },
    data: {
      name: name.trim(),
      slug: slug.trim(),
      description: description?.trim() || null,
      intervalSeconds,
      isActive,
      showProgressBar,
    },
  });

  // Build changes for audit
  const changes: Record<string, unknown> = {};
  if (oldScreen.name !== screen.name) changes.name = { from: oldScreen.name, to: screen.name };
  if (oldScreen.slug !== screen.slug) changes.slug = { from: oldScreen.slug, to: screen.slug };
  if (oldScreen.isActive !== screen.isActive) changes.isActive = { from: oldScreen.isActive, to: screen.isActive };
  if (oldScreen.showProgressBar !== screen.showProgressBar) changes.showProgressBar = { from: oldScreen.showProgressBar, to: screen.showProgressBar };
  if (oldScreen.intervalSeconds !== screen.intervalSeconds) changes.intervalSeconds = { from: oldScreen.intervalSeconds, to: screen.intervalSeconds };

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

export async function deleteScreen(screenId: string) {
  const session = await auth();
  if (!session) throw new Error("Não autorizado");

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
