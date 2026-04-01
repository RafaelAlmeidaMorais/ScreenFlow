"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { refreshScreen } from "@/app/dashboard/screens/actions";
import { Button } from "@/components/ui/button";

interface Props {
  screenId: string;
  lastSeenAt: string | null;
  autoRefreshMinutes: number;
}

export function ScreenPlayerControls({ screenId, lastSeenAt, autoRefreshMinutes }: Props) {
  const [refreshing, setRefreshing] = useState(false);
  const [sent, setSent] = useState(false);
  const router = useRouter();

  const isOnline = lastSeenAt && (Date.now() - new Date(lastSeenAt).getTime()) < 60000;
  const lastSeenText = lastSeenAt
    ? formatRelative(new Date(lastSeenAt))
    : "Nunca conectou";

  async function handleRefresh() {
    setRefreshing(true);
    try {
      await refreshScreen(screenId);
      setSent(true);
      setTimeout(() => setSent(false), 5000);
      router.refresh();
    } catch {
      alert("Erro ao enviar comando");
    } finally {
      setRefreshing(false);
    }
  }

  return (
    <div className="rounded-2xl border border-border/50 bg-card/50 backdrop-blur-sm p-5">
      <h3 className="text-sm font-semibold mb-4">Controle do Player</h3>
      <div className="space-y-4">
        {/* Status */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className={`w-2.5 h-2.5 rounded-full ${isOnline ? "bg-emerald-400 animate-pulse" : "bg-muted-foreground"}`} />
            <span className="text-sm">{isOnline ? "Online" : "Offline"}</span>
          </div>
          <span className="text-xs text-muted-foreground">{lastSeenText}</span>
        </div>

        {/* Auto-refresh info */}
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>Auto-refresh</span>
          <span>{autoRefreshMinutes > 0 ? `a cada ${Math.round(autoRefreshMinutes / 60)}h` : "Desabilitado"}</span>
        </div>

        {/* Actions */}
        <Button
          onClick={handleRefresh}
          disabled={refreshing || sent}
          variant="outline"
          className="w-full cursor-pointer"
        >
          {sent ? (
            <>
              <svg className="w-4 h-4 mr-2 text-emerald-400" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
              </svg>
              Comando enviado
            </>
          ) : refreshing ? (
            <>
              <div className="w-4 h-4 mr-2 border-2 border-muted-foreground/30 border-t-foreground rounded-full animate-spin" />
              Enviando...
            </>
          ) : (
            <>
              <svg className="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0 3.181 3.183a8.25 8.25 0 0 0 13.803-3.7M4.031 9.865a8.25 8.25 0 0 1 13.803-3.7l3.181 3.182" />
              </svg>
              Reiniciar Player
            </>
          )}
        </Button>
        <p className="text-xs text-muted-foreground/50 text-center">
          O player será recarregado na próxima verificação (~30s)
        </p>
      </div>
    </div>
  );
}

function formatRelative(date: Date): string {
  const diff = Date.now() - date.getTime();
  const seconds = Math.floor(diff / 1000);

  if (seconds < 60) return "agora";
  if (seconds < 3600) return `${Math.floor(seconds / 60)}min atrás`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h atrás`;
  return `${Math.floor(seconds / 86400)}d atrás`;
}
