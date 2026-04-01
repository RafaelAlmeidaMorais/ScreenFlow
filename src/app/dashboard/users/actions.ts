"use server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { logAudit } from "@/lib/audit";
import bcrypt from "bcryptjs";
import { revalidatePath } from "next/cache";

export async function createUser(formData: FormData) {
  const session = await auth();
  if (!session) throw new Error("Não autorizado");

  const isSuperAdmin = session.user.isSuperAdmin;
  const isCompanyAdmin = session.user.role === "COMPANY_ADMIN";
  if (!isSuperAdmin && !isCompanyAdmin) throw new Error("Sem permissão");

  const name = formData.get("name") as string;
  const email = formData.get("email") as string;
  const password = formData.get("password") as string;
  const role = formData.get("role") as string;
  const companyId = isSuperAdmin
    ? (formData.get("companyId") as string) || session.user.companyId
    : session.user.companyId;

  if (!name?.trim()) throw new Error("Nome é obrigatório");
  if (!email?.trim()) throw new Error("Email é obrigatório");
  if (!password || password.length < 6) throw new Error("Senha deve ter ao menos 6 caracteres");

  const existing = await prisma.user.findUnique({ where: { email: email.trim() } });
  if (existing) throw new Error("Email já está em uso");

  const hashedPassword = await bcrypt.hash(password, 12);

  const user = await prisma.user.create({
    data: {
      companyId,
      name: name.trim(),
      email: email.trim().toLowerCase(),
      password: hashedPassword,
      role: role === "COMPANY_ADMIN" ? "COMPANY_ADMIN" : "VIEWER",
    },
  });

  await logAudit({
    userId: session.user.id,
    companyId,
    action: "CREATE",
    entity: "USER",
    entityId: user.id,
    details: { name: user.name, email: user.email, role: user.role },
  });

  revalidatePath("/dashboard/users");
  revalidatePath("/dashboard/companies");
}

export async function updateUser(userId: string, formData: FormData) {
  const session = await auth();
  if (!session) throw new Error("Não autorizado");

  const isSuperAdmin = session.user.isSuperAdmin;
  const isCompanyAdmin = session.user.role === "COMPANY_ADMIN";
  const isSelf = session.user.id === userId;

  // Only super admin, company admin, or self can edit
  if (!isSuperAdmin && !isCompanyAdmin && !isSelf) throw new Error("Sem permissão");

  const name = formData.get("name") as string;
  const email = formData.get("email") as string;
  const password = formData.get("password") as string;
  const role = formData.get("role") as string;

  if (!name?.trim()) throw new Error("Nome é obrigatório");
  if (!email?.trim()) throw new Error("Email é obrigatório");

  // Validate email uniqueness
  const existingEmail = await prisma.user.findUnique({ where: { email: email.trim().toLowerCase() } });
  if (existingEmail && existingEmail.id !== userId) throw new Error("Email já está em uso");

  const oldUser = await prisma.user.findUnique({ where: { id: userId } });
  if (!oldUser) throw new Error("Usuário não encontrado");

  // Non-super-admin can only edit users from their company
  if (!isSuperAdmin && oldUser.companyId !== session.user.companyId) throw new Error("Sem permissão");

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const data: any = {
    name: name.trim(),
    email: email.trim().toLowerCase(),
  };

  // Only admins can change roles
  if ((isSuperAdmin || isCompanyAdmin) && role && !isSelf) {
    data.role = role === "COMPANY_ADMIN" ? "COMPANY_ADMIN" : "VIEWER";
  }

  // Update password if provided
  if (password && password.length >= 6) {
    data.password = await bcrypt.hash(password, 12);
  }

  const user = await prisma.user.update({
    where: { id: userId },
    data,
  });

  const changes: Record<string, unknown> = {};
  if (oldUser.name !== user.name) changes.name = { from: oldUser.name, to: user.name };
  if (oldUser.email !== user.email) changes.email = { from: oldUser.email, to: user.email };
  if (oldUser.role !== user.role) changes.role = { from: oldUser.role, to: user.role };
  if (password && password.length >= 6) changes.password = "changed";

  await logAudit({
    userId: session.user.id,
    companyId: oldUser.companyId,
    action: "UPDATE",
    entity: "USER",
    entityId: user.id,
    details: changes,
  });

  revalidatePath("/dashboard/users");
  revalidatePath("/dashboard/companies");
}

export async function deleteUser(userId: string) {
  const session = await auth();
  if (!session) throw new Error("Não autorizado");

  const isSuperAdmin = session.user.isSuperAdmin;
  const isCompanyAdmin = session.user.role === "COMPANY_ADMIN";
  if (!isSuperAdmin && !isCompanyAdmin) throw new Error("Sem permissão");

  if (userId === session.user.id) throw new Error("Você não pode excluir a si mesmo");

  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) throw new Error("Usuário não encontrado");

  if (!isSuperAdmin && user.companyId !== session.user.companyId) throw new Error("Sem permissão");
  if (user.isSuperAdmin) throw new Error("Não é possível excluir um super admin");

  await prisma.user.delete({ where: { id: userId } });

  await logAudit({
    userId: session.user.id,
    companyId: user.companyId,
    action: "DELETE",
    entity: "USER",
    entityId: userId,
    details: { name: user.name, email: user.email },
  });

  revalidatePath("/dashboard/users");
  revalidatePath("/dashboard/companies");
}
