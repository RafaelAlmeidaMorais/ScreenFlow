import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { requireSuperAdmin } from "@/lib/role-guards";
import { CreateCompanyDialog } from "@/components/dashboard/create-company-dialog";
import { CompanyList } from "@/components/dashboard/company-list";

export default async function CompaniesPage() {
  const session = await auth();
  if (!session) redirect("/login");
  await requireSuperAdmin();

  const companies = await prisma.company.findMany({
    include: {
      _count: { select: { users: true, screens: true, medias: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  const companyData = companies.map((c) => ({
    id: c.id,
    name: c.name,
    slug: c.slug,
    createdAt: c.createdAt.toISOString(),
    userCount: c._count.users,
    screenCount: c._count.screens,
    mediaCount: c._count.medias,
  }));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Instituições</h1>
          <p className="text-muted-foreground mt-1">
            Gerencie todas as instituições do sistema
          </p>
        </div>
        <CreateCompanyDialog />
      </div>
      <CompanyList companies={companyData} />
    </div>
  );
}
