import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EditScreenDialog } from "@/components/dashboard/edit-screen-dialog";
import { AddMediaToScreen } from "@/components/dashboard/add-media-to-screen";
import { ScreenMediaItem } from "@/components/dashboard/screen-media-item";
import { ScreenPlayerControls } from "@/components/dashboard/screen-player-controls";

interface Props {
  params: Promise<{ id: string }>;
}

export default async function ScreenDetailPage({ params }: Props) {
  const { id } = await params;
  const session = await auth();
  if (!session) redirect("/login");

  const screen = await prisma.screen.findUnique({
    where: { id, companyId: session.user.companyId },
    include: {
      medias: {
        orderBy: { orderIndex: "asc" },
      },
    },
  });

  if (!screen) notFound();

  const otherScreens = await prisma.screen.findMany({
    where: { companyId: session.user.companyId, id: { not: id } },
    orderBy: { name: "asc" },
    select: { id: true, name: true },
  });

  const now = new Date();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="flex items-center gap-2 mb-2">
            <Link
              href="/dashboard/screens"
              className="text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              Telas
            </Link>
            <svg className="w-3 h-3 text-muted-foreground/50" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="m8.25 4.5 7.5 7.5-7.5 7.5" />
            </svg>
            <span className="text-xs text-muted-foreground">{screen.name}</span>
          </div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold tracking-tight">{screen.name}</h1>
            <Badge
              variant={screen.isActive ? "default" : "secondary"}
              className={
                screen.isActive
                  ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 hover:bg-emerald-500/10"
                  : "bg-muted text-muted-foreground border border-border/50 hover:bg-muted"
              }
            >
              <span className={`w-1.5 h-1.5 rounded-full mr-1.5 ${screen.isActive ? "bg-emerald-400" : "bg-muted-foreground"}`} />
              {screen.isActive ? "Ativa" : "Inativa"}
            </Badge>
          </div>
          {screen.description && (
            <p className="text-sm text-muted-foreground mt-1">{screen.description}</p>
          )}
          <div className="flex items-center gap-4 mt-2">
            <span className="text-xs text-muted-foreground/60">Intervalo: {screen.intervalSeconds}s</span>
            <span className="text-xs text-muted-foreground/60">{screen.medias.length} {screen.medias.length === 1 ? "mídia" : "mídias"}</span>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <EditScreenDialog screen={{
            id: screen.id,
            name: screen.name,
            slug: screen.slug,
            description: screen.description,
            token: screen.token,
            intervalSeconds: screen.intervalSeconds,
            isActive: screen.isActive,
            showProgressBar: screen.showProgressBar,
          }} />
          <a
            href={`/player/${screen.slug}`}
            target="_blank"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs text-muted-foreground hover:text-orange hover:bg-orange/10 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M5.25 5.653c0-.856.917-1.398 1.667-.986l11.54 6.347a1.125 1.125 0 0 1 0 1.972l-11.54 6.347a1.125 1.125 0 0 1-1.667-.986V5.653Z" />
            </svg>
            Player
          </a>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_280px] gap-6">

      {/* Media list */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Mídias</h2>
          <AddMediaToScreen screenId={screen.id} />
        </div>

        {screen.medias.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border/50 bg-card/30 p-12 text-center">
            <svg className="w-10 h-10 text-muted-foreground/30 mx-auto mb-3" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="m2.25 15.75 5.159-5.159a2.25 2.25 0 0 1 3.182 0l5.159 5.159m-1.5-1.5 1.409-1.409a2.25 2.25 0 0 1 3.182 0l2.909 2.909M3.75 21h16.5A2.25 2.25 0 0 0 22.5 18.75V5.25A2.25 2.25 0 0 0 20.25 3H3.75A2.25 2.25 0 0 0 1.5 5.25v13.5A2.25 2.25 0 0 0 3.75 21Z" />
            </svg>
            <p className="text-muted-foreground text-sm">Nenhuma mídia nesta tela</p>
            <p className="text-muted-foreground/50 text-xs mt-1">Adicione imagens ou vídeos para exibir no player</p>
          </div>
        ) : (
          <div className="space-y-3">
            {screen.medias.map((media, index) => {
              const isExpired = media.endDate && new Date(media.endDate) < now;
              return (
                <ScreenMediaItem
                  key={media.id}
                  media={{
                    id: media.id,
                    title: media.title,
                    fileUrl: media.fileUrl,
                    type: media.type,
                    durationSeconds: media.durationSeconds,
                    startDate: media.startDate.toISOString(),
                    endDate: media.endDate?.toISOString() ?? null,
                    isEnabled: media.isEnabled,
                    orderIndex: index,
                    isExpired: !!isExpired,
                  }}
                  screenId={screen.id}
                  otherScreens={otherScreens}
                />
              );
            })}
          </div>
        )}
      </div>

      {/* Player controls sidebar */}
      <div className="space-y-4">
        <ScreenPlayerControls
          screenId={screen.id}
          lastSeenAt={screen.lastSeenAt?.toISOString() ?? null}
          autoRefreshMinutes={screen.autoRefreshMinutes}
        />
      </div>

      </div>
    </div>
  );
}
