"use server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

export async function createScreen(formData: FormData) {
  const session = await auth();
  if (!session) throw new Error("Não autorizado");

  const name = formData.get("name") as string;
  const description = formData.get("description") as string;
  const intervalSeconds = parseInt(formData.get("intervalSeconds") as string) || 10;

  if (!name?.trim()) throw new Error("Nome é obrigatório");

  await prisma.screen.create({
    data: {
      companyId: session.user.companyId,
      name: name.trim(),
      description: description?.trim() || null,
      intervalSeconds,
      isActive: true,
    },
  });

  revalidatePath("/dashboard/screens");
  revalidatePath("/dashboard");
}

export async function updateScreen(screenId: string, formData: FormData) {
  const session = await auth();
  if (!session) throw new Error("Não autorizado");

  const name = formData.get("name") as string;
  const description = formData.get("description") as string;
  const intervalSeconds = parseInt(formData.get("intervalSeconds") as string) || 10;
  const isActive = formData.get("isActive") === "true";
  const showProgressBar = formData.get("showProgressBar") !== "false";

  if (!name?.trim()) throw new Error("Nome é obrigatório");

  await prisma.screen.update({
    where: { id: screenId, companyId: session.user.companyId },
    data: {
      name: name.trim(),
      description: description?.trim() || null,
      intervalSeconds,
      isActive,
      showProgressBar,
    },
  });

  revalidatePath("/dashboard/screens");
  revalidatePath(`/dashboard/screens/${screenId}`);
  revalidatePath("/dashboard");
}

export async function refreshScreen(screenId: string) {
  const session = await auth();
  if (!session) throw new Error("Não autorizado");

  await prisma.screen.update({
    where: { id: screenId, companyId: session.user.companyId },
    data: { refreshRequestedAt: new Date() },
  });

  revalidatePath(`/dashboard/screens/${screenId}`);
}

export async function deleteScreen(screenId: string) {
  const session = await auth();
  if (!session) throw new Error("Não autorizado");

  await prisma.media.deleteMany({ where: { screenId, companyId: session.user.companyId } });
  await prisma.screen.delete({ where: { id: screenId, companyId: session.user.companyId } });

  revalidatePath("/dashboard/screens");
  revalidatePath("/dashboard");
}
