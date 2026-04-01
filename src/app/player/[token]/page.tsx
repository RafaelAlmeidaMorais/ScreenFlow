import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import { PlayerView } from "@/components/player/player-view";

interface PlayerPageProps {
  params: Promise<{ token: string }>;
}

export default async function PlayerPage({ params }: PlayerPageProps) {
  const { token } = await params;

  const screen = await prisma.screen.findUnique({
    where: { token },
    include: {
      medias: {
        where: { isEnabled: true },
        orderBy: { orderIndex: "asc" },
      },
      company: true,
    },
  });

  if (!screen) return notFound();

  const now = new Date();
  const activeMedias = screen.medias.filter(
    (m) => !m.endDate || new Date(m.endDate) > now
  );

  return (
    <PlayerView
      token={token}
      screenName={screen.name}
      companyName={screen.company.name}
      intervalSeconds={screen.intervalSeconds}
      autoRefreshMinutes={screen.autoRefreshMinutes}
      showProgressBar={screen.showProgressBar}
      medias={activeMedias.map((m) => ({
        id: m.id,
        type: m.type as "IMAGE" | "VIDEO",
        fileUrl: m.fileUrl,
        title: m.title,
        durationSeconds: m.durationSeconds,
      }))}
    />
  );
}
