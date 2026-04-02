import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { ScreenList } from "@/components/dashboard/screen-list";
import { CreateScreenDialog } from "@/components/dashboard/create-screen-dialog";
import { ScreenCompanyFilter } from "@/components/dashboard/screen-company-filter";

interface Props {
  searchParams: Promise<{ company?: string }>;
}

export default async function ScreensPage({ searchParams }: Props) {
  const session = await auth();
  if (!session) redirect("/login");

  const { company: companyFilter } = await searchParams;
  const isSuperAdmin = session.user.isSuperAdmin;

  const whereClause = isSuperAdmin
    ? companyFilter ? { companyId: companyFilter } : {}
    : { companyId: session.user.companyId };

  const screens = await prisma.screen.findMany({
    where: whereClause,
    include: { medias: true, company: { select: { name: true } } },
    orderBy: { createdAt: "desc" },
  });

  const screenData = screens.map((s) => ({
    id: s.id,
    name: s.name,
    slug: s.slug,
    description: s.description,
    token: s.token,
    isActive: s.isActive,
    intervalSeconds: s.intervalSeconds,
    showProgressBar: s.showProgressBar,
    mediaCount: s.medias.length,
    lastSeenAt: s.lastSeenAt?.toISOString() ?? null,
    companyName: s.company.name,
  }));

  // Get companies for filter (super admin only)
  const companies = isSuperAdmin
    ? await prisma.company.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true } })
    : [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Telas</h1>
          <p className="text-muted-foreground mt-1">
            Gerencie as telas {isSuperAdmin ? "de todas as instituições" : "da sua empresa"}
          </p>
        </div>
        <CreateScreenDialog />
      </div>

      {isSuperAdmin && companies.length > 1 && (
        <ScreenCompanyFilter companies={companies} currentFilter={companyFilter || ""} />
      )}

      <ScreenList screens={screenData} showCompany={isSuperAdmin} />
    </div>
  );
}
