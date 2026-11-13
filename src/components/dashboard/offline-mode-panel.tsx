"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { setOfflineMode } from "@/app/dashboard/screens/actions";
import { Switch } from "@/components/ui/switch";
import { LocalDateTime } from "@/components/dashboard/media-schedule-fields";
import { formatBytes, type OfflineStatus } from "@/lib/offline-mode";

interface Props {
  screenId: string;
  enabled: boolean;
  /** What the TV box last reported. Null until it reloads with offline mode on. */
  status: OfflineStatus | null;
}

export function OfflineModePanel({ screenId, enabled, status }: Props) {
  const [on, setOn] = useState(enabled);
  const [saving, setSaving] = useState(false);
  const router = useRouter();

  async function toggle(next: boolean) {
    setOn(next);
    setSaving(true);
    try {
      await setOfflineMode(screenId, next);
      router.refresh();
    } catch {
      setOn(!next);
      alert("Erro ao alterar o modo offline");
    } finally {
      setSaving(false);
    }
  }

  // A status from before the last toggle says nothing about the current setting.
  const report = on && enabled ? status : null;

  return (
    <div className="rounded-2xl border border-border/50 bg-card/50 backdrop-blur-sm p-5">
      <div className="flex items-center justify-between gap-3">
        <h3 className="text-sm font-semibold">Modo offline</h3>
        <Switch
          aria-label="Ativar modo offline"
          checked={on}
          disabled={saving}
          onCheckedChange={toggle}
        />
      </div>
      <p className="text-xs text-muted-foreground mt-1">
        {on
          ? "A TV box guarda uma cópia das mídias desta tela e continua exibindo se a internet cair ou se for religada sem conexão."
          : "Desligado: a TV box depende da internet para carregar as mídias. Ligue em locais onde a conexão cai com frequência."}
      </p>

      {on && (
        <div className="mt-4 rounded-xl border border-border/50 bg-background/50 px-3 py-2.5 text-xs">
          {!report ? (
            <p className="text-muted-foreground">
              Aguardando a TV. Ela recarrega o player em até 30 segundos e começa a salvar as mídias.
            </p>
          ) : !report.supported ? (
            <p className="text-amber-300/90">
              Esta TV box não tem suporte ao modo offline (navegador interno antigo). Ela continua
              funcionando só com internet.
            </p>
          ) : (
            <div className="space-y-1.5">
              <div className="flex items-center justify-between gap-2">
                <span className="text-muted-foreground">Mídias salvas na TV box</span>
                <span
                  className={`font-semibold ${
                    report.cached >= report.total ? "text-emerald-400" : "text-foreground"
                  }`}
                >
                  {report.cached} de {report.total}
                </span>
              </div>
              {report.usage !== null && (
                <div className="flex items-center justify-between gap-2">
                  <span className="text-muted-foreground">Espaço usado</span>
                  <span>
                    {formatBytes(report.usage)}
                    {report.quota !== null && ` de ${formatBytes(report.quota)}`}
                  </span>
                </div>
              )}
              {report.full && (
                <p className="text-red-400">
                  Armazenamento cheio: nem todas as mídias couberam. Esta TV box precisa de mais
                  espaço.
                </p>
              )}
              {!report.full && report.failed > 0 && (
                <p className="text-amber-300/90">
                  {report.failed === 1 ? "1 download falhou" : `${report.failed} downloads falharam`}.
                  A TV tenta de novo em até 30 minutos.
                </p>
              )}
              {!report.full && report.failed === 0 && report.cached < report.total && (
                <p className="text-muted-foreground">Baixando as mídias...</p>
              )}
              <p className="text-muted-foreground/60">
                Informado pela TV em <LocalDateTime iso={report.at} />
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
