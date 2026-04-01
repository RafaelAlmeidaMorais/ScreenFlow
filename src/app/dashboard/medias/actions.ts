"use server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

export async function createMedia(formData: FormData) {
  const session = await auth();
  if (!session) throw new Error("Não autorizado");

  const screenId = formData.get("screenId") as string;
  const title = formData.get("title") as string;
  const fileUrl = formData.get("fileUrl") as string;
  const type = formData.get("type") as string;
  const durationSeconds = parseInt(formData.get("durationSeconds") as string) || 10;
  const startDate = formData.get("startDate") as string;
  const endDate = formData.get("endDate") as string;

  if (!title?.trim()) throw new Error("Título é obrigatório");
  if (!fileUrl?.trim()) throw new Error("URL do arquivo é obrigatória");
  if (!screenId) throw new Error("Selecione uma tela");

  const lastMedia = await prisma.media.findFirst({
    where: { screenId },
    orderBy: { orderIndex: "desc" },
  });

  await prisma.media.create({
    data: {
      screenId,
      companyId: session.user.companyId,
      title: title.trim(),
      fileUrl: fileUrl.trim(),
      type: type === "VIDEO" ? "VIDEO" : "IMAGE",
      durationSeconds,
      orderIndex: (lastMedia?.orderIndex ?? -1) + 1,
      startDate: startDate ? new Date(startDate) : new Date(),
      endDate: endDate ? new Date(endDate) : null,
      isEnabled: true,
      createdById: session.user.id,
    },
  });

  revalidatePath("/dashboard/medias");
  revalidatePath("/dashboard");
}

export async function updateMedia(mediaId: string, formData: FormData) {
  const session = await auth();
  if (!session) throw new Error("Não autorizado");

  const title = formData.get("title") as string;
  const fileUrl = formData.get("fileUrl") as string;
  const type = formData.get("type") as string;
  const screenId = formData.get("screenId") as string;
  const durationSeconds = parseInt(formData.get("durationSeconds") as string) || 10;
  const startDate = formData.get("startDate") as string;
  const endDate = formData.get("endDate") as string;
  const isEnabled = formData.get("isEnabled") === "true";

  if (!title?.trim()) throw new Error("Título é obrigatório");
  if (!fileUrl?.trim()) throw new Error("URL do arquivo é obrigatória");
  if (!screenId) throw new Error("Selecione uma tela");

  await prisma.media.update({
    where: { id: mediaId, companyId: session.user.companyId },
    data: {
      title: title.trim(),
      fileUrl: fileUrl.trim(),
      type: type === "VIDEO" ? "VIDEO" : "IMAGE",
      screenId,
      durationSeconds,
      startDate: startDate ? new Date(startDate) : new Date(),
      endDate: endDate ? new Date(endDate) : null,
      isEnabled,
    },
  });

  revalidatePath("/dashboard/medias");
  revalidatePath("/dashboard");
}

export async function deleteMedia(mediaId: string) {
  const session = await auth();
  if (!session) throw new Error("Não autorizado");

  await prisma.media.delete({
    where: { id: mediaId, companyId: session.user.companyId },
  });

  revalidatePath("/dashboard/medias");
  revalidatePath("/dashboard");
}
