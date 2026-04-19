import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { EditScreenDialog } from "@/components/dashboard/edit-screen-dialog";
import { AddMediaToScreen } from "@/components/dashboard/add-media-to-screen";
import { AddWidgetDialog } from "@/components/dashboard/add-widget-dialog";
import { WidgetPriceTableEditor } from "@/components/dashboard/widget-price-table-editor";
import { MediaSortableList } from "@/components/dashboard/media-sortable-list";
import { ScreenPlayerControls } from "@/components/dashboard/screen-player-controls";
import { getLayoutDefinition } from "@/lib/layouts";
import type { PriceTableConfig } from "@/lib/widgets";

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
      widgets: {
        where: { isEnabled: true },
        orderBy: [{ slot: "asc" }, { orderIndex: "asc" }],
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

  const layout = getLayoutDefinition(screen.layoutTemplate);
  const slotOptions = layout.slots.map((s) => ({ name: s.name, label: s.label }));
  const isSingleSlot = layout.slots.length === 1;

  // Group medias by slot (falling back to main for any legacy rows)
  const mediasBySlot = new Map<string, typeof screen.medias>();
  for (const slot of layout.slots) mediasBySlot.set(slot.name, []);
  for (const m of screen.medias) {
    const target = mediasBySlot.has(m.slot) ? m.slot : layout.slots[0]?.name ?? "main";
    mediasBySlot.get(target)!.push(m);
  }

  // Group widgets by slot
  const widgetsBySlot = new Map<string, typeof screen.widgets>();
  for (const slot of layout.slots) widgetsBySlot.set(slot.name, []);
  for (const w of screen.widgets) {
    const target = widgetsBySlot.has(w.slot) ? w.slot : layout.slots[0]?.name ?? "main";
    widgetsBySlot.get(target)!.push(w);
  }

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
            orientation: screen.orientation,
            aspectRatio: screen.aspectRatio,
            layoutTemplate: screen.layoutTemplate,
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

      {/* Media list grouped by slot */}
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold">Mídias</h2>
            <p className="text-xs text-muted-foreground/60">
              Layout: {layout.label}
            </p>
          </div>
          {isSingleSlot && (
            <AddMediaToScreen
              screenId={screen.id}
              slots={slotOptions}
              defaultSlot={layout.slots[0]?.name}
            />
          )}
        </div>

        {layout.slots.map((slotDef) => {
          const slotMedias = mediasBySlot.get(slotDef.name) ?? [];
          const slotWidgets = widgetsBySlot.get(slotDef.name) ?? [];
          const hasWidgets = slotWidgets.length > 0;
          const hasMedias = slotMedias.length > 0;

          return (
            <div key={slotDef.name} className="space-y-3">
              {!isSingleSlot && (
                <div className="flex items-center justify-between border-b border-border/30 pb-2">
                  <div className="flex items-center gap-2">
                    <span className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-orange">
                      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6A2.25 2.25 0 0 1 6 3.75h2.25A2.25 2.25 0 0 1 10.5 6v2.25a2.25 2.25 0 0 1-2.25 2.25H6a2.25 2.25 0 0 1-2.25-2.25V6ZM3.75 15.75A2.25 2.25 0 0 1 6 13.5h2.25a2.25 2.25 0 0 1 2.25 2.25V18a2.25 2.25 0 0 1-2.25 2.25H6A2.25 2.25 0 0 1 3.75 18v-2.25ZM13.5 6a2.25 2.25 0 0 1 2.25-2.25H18A2.25 2.25 0 0 1 20.25 6v2.25A2.25 2.25 0 0 1 18 10.5h-2.25a2.25 2.25 0 0 1-2.25-2.25V6ZM13.5 15.75a2.25 2.25 0 0 1 2.25-2.25H18a2.25 2.25 0 0 1 2.25 2.25V18A2.25 2.25 0 0 1 18 20.25h-2.25A2.25 2.25 0 0 1 13.5 18v-2.25Z" />
                      </svg>
                      {slotDef.label}
                    </span>
                    <span className="text-xs text-muted-foreground/50">
                      {hasWidgets
                        ? `${slotWidgets.length} widget${slotWidgets.length !== 1 ? "s" : ""}`
                        : `${slotMedias.length} ${slotMedias.length === 1 ? "mídia" : "mídias"}`}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    {!hasWidgets && (
                      <AddMediaToScreen
                        screenId={screen.id}
                        slots={slotOptions}
                        defaultSlot={slotDef.name}
                        triggerLabel="Adicionar"
                        compact
                      />
                    )}
                    {!hasMedias && (
                      <AddWidgetDialog
                        screenId={screen.id}
                        slot={slotDef.name}
                        compact
                      />
                    )}
                  </div>
                </div>
              )}

              {/* Widgets in this slot */}
              {hasWidgets && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {slotWidgets.map((widget) => (
                    <WidgetPriceTableEditor
                      key={widget.id}
                      widgetId={widget.id}
                      config={widget.config as unknown as PriceTableConfig}
                      screenId={screen.id}
                    />
                  ))}
                </div>
              )}

              {/* Medias in this slot */}
              {!hasWidgets && slotMedias.length === 0 ? (
                <div className="rounded-xl border border-dashed border-border/30 bg-card/20 p-8 text-center">
                  <p className="text-muted-foreground/60 text-xs">
                    Nenhuma midia ou widget nesta zona
                  </p>
                  {isSingleSlot && (
                    <div className="flex items-center justify-center gap-3 mt-3">
                      <AddMediaToScreen
                        screenId={screen.id}
                        slots={slotOptions}
                        defaultSlot={slotDef.name}
                      />
                      <AddWidgetDialog
                        screenId={screen.id}
                        slot={slotDef.name}
                      />
                    </div>
                  )}
                </div>
              ) : !hasWidgets ? (
                <MediaSortableList
                  medias={slotMedias.map((media, index) => {
                    const isExpired = media.endDate && new Date(media.endDate) < now;
                    return {
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
                    };
                  })}
                  screenId={screen.id}
                  otherScreens={otherScreens}
                  slot={slotDef.name}
                />
              ) : null}
            </div>
          );
        })}
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
