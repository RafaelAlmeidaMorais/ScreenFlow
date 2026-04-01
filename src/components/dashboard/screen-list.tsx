"use client";

import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EditScreenDialog } from "@/components/dashboard/edit-screen-dialog";

interface Screen {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  token: string;
  isActive: boolean;
  intervalSeconds: number;
  showProgressBar: boolean;
  mediaCount: number;
  lastSeenAt: string | null;
}

export function ScreenList({ screens }: { screens: Screen[] }) {
  if (screens.length === 0) {
    return (
      <div className="rounded-2xl border border-border/50 bg-card/50 p-12 text-center">
        <p className="text-muted-foreground">Nenhuma tela cadastrada ainda.</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {screens.map((screen) => (
        <div
          key={screen.id}
          className="group flex items-center justify-between rounded-2xl border border-border/50 bg-card/50 backdrop-blur-sm p-5 transition-all duration-200 hover:border-border hover:bg-card/80"
        >
          <Link href={`/dashboard/screens/${screen.id}`} className="flex items-center gap-4 min-w-0 flex-1">
            <div className="flex items-center justify-center w-11 h-11 rounded-xl bg-muted/50 border border-border/50 shrink-0">
              <svg className="w-5 h-5 text-muted-foreground" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 20.25h12m-7.5-3v3m3-3v3m-10.125-3h17.25c.621 0 1.125-.504 1.125-1.125V4.875c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125Z" />
              </svg>
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2.5">
                <h3 className="text-sm font-semibold truncate">{screen.name}</h3>
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
              <div className="flex items-center gap-3 mt-1">
                <span className="text-xs text-orange/60">/{screen.slug}</span>
                {screen.description && (
                  <p className="text-xs text-muted-foreground truncate max-w-[200px]">{screen.description}</p>
                )}
                <span className="text-xs text-muted-foreground/60">
                  {screen.mediaCount} {screen.mediaCount === 1 ? "mídia" : "mídias"}
                </span>
                <span className="text-xs text-muted-foreground/60">{screen.intervalSeconds}s</span>
              </div>
            </div>
          </Link>

          <div className="flex items-center gap-1 shrink-0">
            <EditScreenDialog screen={screen} />
            <Button
              variant="ghost"
              size="sm"
              className="text-xs text-muted-foreground hover:text-orange hover:bg-orange/10 cursor-pointer"
              onClick={() => window.open(`/player/${screen.slug}`, "_blank")}
            >
              <svg className="w-4 h-4 mr-1.5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M5.25 5.653c0-.856.917-1.398 1.667-.986l11.54 6.347a1.125 1.125 0 0 1 0 1.972l-11.54 6.347a1.125 1.125 0 0 1-1.667-.986V5.653Z" />
              </svg>
              Player
            </Button>
          </div>
        </div>
      ))}
    </div>
  );
}
