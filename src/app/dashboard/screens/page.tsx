import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { ScreenList } from "@/components/dashboard/screen-list";
import { CreateScreenDialog } from "@/components/dashboard/create-screen-dialog";

export default async function ScreensPage() {
  const session = await auth();
  if (!session) redirect("/login");

  const screens = await prisma.screen.findMany({
    where: { companyId: session.user.companyId },
    include: { medias: true },
    orderBy: { createdAt: "desc" },
  });

  const screenData = screens.map((s) => ({
    id: s.id,
    name: s.name,
    description: s.description,
    token: s.token,
    isActive: s.isActive,
    intervalSeconds: s.intervalSeconds,
    showProgressBar: s.showProgressBar,
    mediaCount: s.medias.length,
    lastSeenAt: s.lastSeenAt?.toISOString() ?? null,
  }));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Telas</h1>
          <p className="text-muted-foreground mt-1">
            Gerencie as telas da sua empresa
          </p>
        </div>
        <CreateScreenDialog />
      </div>
      <ScreenList screens={screenData} />
    </div>
  );
}
