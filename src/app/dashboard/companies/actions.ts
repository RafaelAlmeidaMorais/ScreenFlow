"use server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { logAudit } from "@/lib/audit";
import { revalidatePath } from "next/cache";

export async function createCompany(formData: FormData) {
  const session = await auth();
  if (!session || !session.user.isSuperAdmin) throw new Error("Não autorizado");

  const name = formData.get("name") as string;
  const slug = formData.get("slug") as string;

  if (!name?.trim()) throw new Error("Nome é obrigatório");
  if (!slug?.trim()) throw new Error("Slug é obrigatório");

  const existing = await prisma.company.findUnique({ where: { slug: slug.trim() } });
  if (existing) throw new Error("Slug já está em uso");

  const company = await prisma.company.create({
    data: {
      name: name.trim(),
      slug: slug.trim(),
    },
  });

  await logAudit({
    userId: session.user.id,
    companyId: company.id,
    action: "CREATE",
    entity: "COMPANY",
    entityId: company.id,
    details: { name: company.name, slug: company.slug },
  });

  revalidatePath("/dashboard/companies");
  revalidatePath("/dashboard");
}

export async function updateCompany(companyId: string, formData: FormData) {
  const session = await auth();
  if (!session || !session.user.isSuperAdmin) throw new Error("Não autorizado");

  const name = formData.get("name") as string;
  const slug = formData.get("slug") as string;

  if (!name?.trim()) throw new Error("Nome é obrigatório");
  if (!slug?.trim()) throw new Error("Slug é obrigatório");

  const existing = await prisma.company.findUnique({ where: { slug: slug.trim() } });
  if (existing && existing.id !== companyId) throw new Error("Slug já está em uso");

  const oldCompany = await prisma.company.findUnique({ where: { id: companyId } });
  if (!oldCompany) throw new Error("Instituição não encontrada");

  const company = await prisma.company.update({
    where: { id: companyId },
    data: {
      name: name.trim(),
      slug: slug.trim(),
    },
  });

  const changes: Record<string, unknown> = {};
  if (oldCompany.name !== company.name) changes.name = { from: oldCompany.name, to: company.name };
  if (oldCompany.slug !== company.slug) changes.slug = { from: oldCompany.slug, to: company.slug };

  await logAudit({
    userId: session.user.id,
    companyId: company.id,
    action: "UPDATE",
    entity: "COMPANY",
    entityId: company.id,
    details: changes,
  });

  revalidatePath("/dashboard/companies");
  revalidatePath(`/dashboard/companies/${companyId}`);
}

export async function deleteCompany(companyId: string) {
  const session = await auth();
  if (!session || !session.user.isSuperAdmin) throw new Error("Não autorizado");

  const company = await prisma.company.findUnique({ where: { id: companyId } });
  if (!company) throw new Error("Instituição não encontrada");

  // Delete all related data
  await prisma.media.deleteMany({ where: { companyId } });
  await prisma.screen.deleteMany({ where: { companyId } });
  await prisma.auditLog.deleteMany({ where: { companyId } });
  await prisma.user.deleteMany({ where: { companyId } });
  await prisma.company.delete({ where: { id: companyId } });

  await logAudit({
    userId: session.user.id,
    companyId: session.user.companyId,
    action: "DELETE",
    entity: "COMPANY",
    entityId: companyId,
    details: { name: company.name, slug: company.slug },
  });

  revalidatePath("/dashboard/companies");
  revalidatePath("/dashboard");
}
