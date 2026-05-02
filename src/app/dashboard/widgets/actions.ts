"use server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { logAudit } from "@/lib/audit";
import { isValidSlot, getDefaultSlot } from "@/lib/layouts";
import {
  PRICE_TABLE_TEMPLATES,
  getPriceTableDefaults,
  validatePriceTableConfig,
  type PriceTableConfig,
  type PriceTableTemplate,
} from "@/lib/widgets";
import { revalidatePath } from "next/cache";

/**
 * Permission helper. Roles allowed to fully manage widgets:
 *  - Super admin
 *  - COMPANY_ADMIN
 * VIEWER and PRICE_EDITOR cannot create/delete/reorder widgets.
 * PRICE_EDITOR has a separate code path that only allows updatePriceItem.
 */
function canManageWidgets(role: string, isSuperAdmin: boolean): boolean {
  if (isSuperAdmin) return true;
  return role === "COMPANY_ADMIN";
}

export async function createWidget(
  screenId: string,
  type: string,
  template: string,
  slot: string,
) {
  const session = await auth();
  if (!session) throw new Error("Não autorizado");

  if (!canManageWidgets(session.user.role, session.user.isSuperAdmin)) {
    throw new Error("Sem permissão");
  }

  if (type !== "PRICE_TABLE") throw new Error("Tipo de widget desconhecido");
  if (!PRICE_TABLE_TEMPLATES.some((t) => t.value === template)) {
    throw new Error("Template inválido");
  }

  const screenWhere = session.user.isSuperAdmin
    ? { id: screenId }
    : { id: screenId, companyId: session.user.companyId };

  const screen = await prisma.screen.findFirst({ where: screenWhere });
  if (!screen) throw new Error("Tela não encontrada");

  // Validate slot against the screen's current layout
  const targetSlot = isValidSlot(screen.layoutTemplate, slot)
    ? slot
    : getDefaultSlot(screen.layoutTemplate);

  // Slot may not contain media + widget at the same time
  const existingMedia = await prisma.media.findFirst({
    where: { screenId, slot: targetSlot },
  });
  if (existingMedia) {
    throw new Error("Esta zona já possui mídias. Mova-as antes de adicionar um widget.");
  }

  const config = getPriceTableDefaults(template as PriceTableTemplate);

  const lastWidget = await prisma.screenWidget.findFirst({
    where: { screenId, slot: targetSlot },
    orderBy: { orderIndex: "desc" },
  });

  const widget = await prisma.screenWidget.create({
    data: {
      screenId,
      companyId: screen.companyId,
      slot: targetSlot,
      type: "PRICE_TABLE",
      config: config as unknown as object,
      orderIndex: (lastWidget?.orderIndex ?? -1) + 1,
      isEnabled: true,
    },
  });

  await logAudit({
    userId: session.user.id,
    companyId: screen.companyId,
    action: "CREATE",
    entity: "WIDGET",
    entityId: widget.id,
    details: { type: widget.type, template, slot: targetSlot, screenId },
  });

  revalidatePath(`/dashboard/screens/${screenId}`);
  revalidatePath("/dashboard/prices");
  return widget.id;
}

export async function updateWidget(widgetId: string, configIn: unknown) {
  const session = await auth();
  if (!session) throw new Error("Não autorizado");

  if (!canManageWidgets(session.user.role, session.user.isSuperAdmin)) {
    throw new Error("Sem permissão");
  }

  const where = session.user.isSuperAdmin
    ? { id: widgetId }
    : { id: widgetId, companyId: session.user.companyId };

  const existing = await prisma.screenWidget.findFirst({ where });
  if (!existing) throw new Error("Widget não encontrado");

  if (existing.type !== "PRICE_TABLE") throw new Error("Tipo desconhecido");

  const validated = validatePriceTableConfig(configIn);

  const widget = await prisma.screenWidget.update({
    where: { id: widgetId },
    data: { config: validated as unknown as object },
  });

  await logAudit({
    userId: session.user.id,
    companyId: widget.companyId,
    action: "UPDATE",
    entity: "WIDGET",
    entityId: widget.id,
    details: { type: widget.type, items: validated.items.length },
  });

  revalidatePath(`/dashboard/screens/${widget.screenId}`);
  revalidatePath("/dashboard/prices");
}

/**
 * Lightweight per-item update used by mobile editors and PRICE_EDITOR
 * users. Only the value of a single item is changed; everything else
 * (theme, items list, labels) is preserved.
 *
 * This is the ONLY mutation PRICE_EDITOR users are allowed to make.
 */
export async function updatePriceItem(
  widgetId: string,
  itemId: string,
  newValue: number,
) {
  const session = await auth();
  if (!session) throw new Error("Não autorizado");

  const isPriceEditor = session.user.role === "PRICE_EDITOR";
  const allowed =
    canManageWidgets(session.user.role, session.user.isSuperAdmin) || isPriceEditor;
  if (!allowed) throw new Error("Sem permissão");

  if (!Number.isFinite(newValue)) throw new Error("Valor inválido");

  const where = session.user.isSuperAdmin
    ? { id: widgetId }
    : { id: widgetId, companyId: session.user.companyId };

  const existing = await prisma.screenWidget.findFirst({ where });
  if (!existing) throw new Error("Widget não encontrado");
  if (existing.type !== "PRICE_TABLE") throw new Error("Tipo desconhecido");

  const config = existing.config as unknown as PriceTableConfig;
  const items = Array.isArray(config.items) ? config.items : [];
  const idx = items.findIndex((it) => it.id === itemId);
  if (idx < 0) throw new Error("Item não encontrado");

  const updatedItems = items.map((it, i) => (i === idx ? { ...it, value: newValue } : it));
  const newConfig: PriceTableConfig = { ...config, items: updatedItems };

  // Re-validate to be safe (clamps decimals, sanitises strings, etc.)
  const validated = validatePriceTableConfig(newConfig);

  await prisma.screenWidget.update({
    where: { id: widgetId },
    data: { config: validated as unknown as object },
  });

  await logAudit({
    userId: session.user.id,
    companyId: existing.companyId,
    action: "UPDATE",
    entity: "WIDGET",
    entityId: widgetId,
    details: { action: "update_price_item", itemId, newValue },
  });

  revalidatePath(`/dashboard/screens/${existing.screenId}`);
  revalidatePath("/dashboard/prices");
}

export async function deleteWidget(widgetId: string) {
  const session = await auth();
  if (!session) throw new Error("Não autorizado");

  if (!canManageWidgets(session.user.role, session.user.isSuperAdmin)) {
    throw new Error("Sem permissão");
  }

  const where = session.user.isSuperAdmin
    ? { id: widgetId }
    : { id: widgetId, companyId: session.user.companyId };

  const widget = await prisma.screenWidget.findFirst({ where });
  if (!widget) throw new Error("Widget não encontrado");

  await prisma.screenWidget.delete({ where: { id: widgetId } });

  await logAudit({
    userId: session.user.id,
    companyId: widget.companyId,
    action: "DELETE",
    entity: "WIDGET",
    entityId: widgetId,
    details: { type: widget.type, slot: widget.slot, screenId: widget.screenId },
  });

  revalidatePath(`/dashboard/screens/${widget.screenId}`);
  revalidatePath("/dashboard/prices");
}

export async function reorderWidgets(
  screenId: string,
  slot: string,
  orderedIds: string[],
) {
  const session = await auth();
  if (!session) throw new Error("Não autorizado");

  if (!canManageWidgets(session.user.role, session.user.isSuperAdmin)) {
    throw new Error("Sem permissão");
  }

  const screenWhere = session.user.isSuperAdmin
    ? { id: screenId }
    : { id: screenId, companyId: session.user.companyId };

  const screen = await prisma.screen.findFirst({ where: screenWhere });
  if (!screen) throw new Error("Tela não encontrada");

  const updates = orderedIds.map((id, index) =>
    prisma.screenWidget.updateMany({
      where: { id, screenId, slot },
      data: { orderIndex: index },
    })
  );

  await prisma.$transaction(updates);

  revalidatePath(`/dashboard/screens/${screenId}`);
}
