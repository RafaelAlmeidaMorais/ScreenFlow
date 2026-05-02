import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/role-guards";
import { UserList } from "@/components/dashboard/user-list";
import { CreateUserDialog } from "@/components/dashboard/create-user-dialog";

export default async function UsersPage() {
  const session = await auth();
  if (!session) redirect("/login");
  await requireAdmin();

  const isSuperAdmin = session.user.isSuperAdmin;
  const isCompanyAdmin = session.user.role === "COMPANY_ADMIN";

  const users = await prisma.user.findMany({
    where: isSuperAdmin ? {} : { companyId: session.user.companyId },
    include: { company: { select: { name: true } } },
    orderBy: { createdAt: "desc" },
  });

  const userData = users.map((u) => ({
    id: u.id,
    name: u.name,
    email: u.email,
    role: u.role,
    isSuperAdmin: u.isSuperAdmin,
    companyId: u.companyId,
    companyName: u.company.name,
    createdAt: u.createdAt.toISOString(),
  }));

  const companies = isSuperAdmin
    ? await prisma.company.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true } })
    : [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Usuários</h1>
          <p className="text-muted-foreground mt-1">
            {isSuperAdmin ? "Todos os usuários do sistema" : "Usuários da sua instituição"}
          </p>
        </div>
        <CreateUserDialog
          companies={companies}
          isSuperAdmin={isSuperAdmin}
          defaultCompanyId={session.user.companyId}
        />
      </div>
      <UserList
        users={userData}
        currentUserId={session.user.id}
        isSuperAdmin={isSuperAdmin}
        companies={companies}
      />
    </div>
  );
}
