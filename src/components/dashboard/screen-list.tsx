"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EditScreenDialog } from "@/components/dashboard/edit-screen-dialog";
import { duplicateScreen, deleteScreen } from "@/app/dashboard/screens/actions";

interface Screen {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  token: string;
  isActive: boolean;
  intervalSeconds: number;
  showProgressBar: boolean;
  orientation: string;
  aspectRatio: string;
  layoutTemplate: string;
  mediaCount: number;
  lastSeenAt: string | null;
  companyName?: string;
}

interface Props {
  screens: Screen[];
  showCompany?: boolean;
}

export function ScreenList({ screens, showCompany = false }: Props) {
  const [duplicating, setDuplicating] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const router = useRouter();

  async function handleDelete(screenId: string, screenName: string) {
    if (!confirm(`Excluir a tela "${screenName}" e todas as suas mídias?`)) return;
    setDeletingId(screenId);
    try {
      await deleteScreen(screenId);
      router.refresh();
    } catch {
      alert("Erro ao excluir tela");
    } finally {
      setDeletingId(null);
    }
  }

  async function handleDuplicate(screenId: string) {
    setDuplicating(screenId);
    try {
      const newId = await duplicateScreen(screenId);
      router.push(`/dashboard/screens/${newId}`);
    } catch {
      alert("Erro ao duplicar tela");
    } finally {
      setDuplicating(null);
    }
  }

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
                {showCompany && screen.companyName && (
                  <Badge variant="secondary" className="text-xs bg-muted/50 border-border/50">
                    {screen.companyName}
                  </Badge>
                )}
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
              className="text-xs text-muted-foreground hover:text-foreground hover:bg-muted/50 cursor-pointer"
              onClick={() => handleDuplicate(screen.id)}
              disabled={duplicating === screen.id}
              title="Duplicar tela"
            >
              {duplicating === screen.id ? (
                <div className="w-4 h-4 border-2 border-muted-foreground/30 border-t-muted-foreground rounded-full animate-spin" />
              ) : (
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 17.25v3.375c0 .621-.504 1.125-1.125 1.125h-9.75a1.125 1.125 0 0 1-1.125-1.125V7.875c0-.621.504-1.125 1.125-1.125H6.75a9.06 9.06 0 0 1 1.5.124m7.5 10.376h3.375c.621 0 1.125-.504 1.125-1.125V11.25c0-4.46-3.243-8.161-7.5-8.876a9.06 9.06 0 0 0-1.5-.124H9.375c-.621 0-1.125.504-1.125 1.125v3.5m7.5 10.375H9.375a1.125 1.125 0 0 1-1.125-1.125v-9.25m12 6.625v-1.875a3.375 3.375 0 0 0-3.375-3.375h-1.5a1.125 1.125 0 0 1-1.125-1.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H9.75" />
                </svg>
              )}
            </Button>
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
            <Button
              variant="ghost"
              size="sm"
              className="text-xs text-muted-foreground/40 hover:text-red-400 hover:bg-red-500/10 cursor-pointer"
              onClick={() => handleDelete(screen.id, screen.name)}
              disabled={deletingId === screen.id}
              title="Excluir tela"
            >
              {deletingId === screen.id ? (
                <div className="w-4 h-4 border-2 border-red-400/30 border-t-red-400 rounded-full animate-spin" />
              ) : (
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" />
                </svg>
              )}
            </Button>
          </div>
        </div>
      ))}
    </div>
  );
}
