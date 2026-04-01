import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { StatsCards } from "@/components/dashboard/stats-cards";
import { ScreenList } from "@/components/dashboard/screen-list";

export default async function DashboardPage() {
  const session = await auth();
  if (!session) redirect("/login");

  const isSuperAdmin = session.user.isSuperAdmin;
  const companyFilter = isSuperAdmin ? {} : { companyId: session.user.companyId };

  const [screens, medias] = await Promise.all([
    prisma.screen.findMany({
      where: companyFilter,
      include: { medias: true },
      orderBy: { createdAt: "desc" },
    }),
    prisma.media.findMany({
      where: companyFilter,
    }),
  ]);

  const now = new Date();
  const totalScreens = screens.length;
  const activeScreens = screens.filter((s) => s.isActive).length;
  const scheduledMedias = medias.filter(
    (m) => m.isEnabled && (!m.endDate || new Date(m.endDate) > now)
  ).length;
  const expiredMedias = medias.filter(
    (m) => m.endDate && new Date(m.endDate) < now
  ).length;

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
  }));

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground mt-1">
          {isSuperAdmin ? "Visão geral de todas as instituições" : "Visão geral do seu sistema de telas"}
        </p>
      </div>

      <StatsCards
        totalScreens={totalScreens}
        activeScreens={activeScreens}
        scheduledMedias={scheduledMedias}
        expiredMedias={expiredMedias}
      />

      <div>
        <h2 className="text-lg font-semibold mb-4">Telas cadastradas</h2>
        <ScreenList screens={screenData} />
      </div>
    </div>
  );
}
