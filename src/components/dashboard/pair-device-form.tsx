"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/input";

interface Screen {
  id: string;
  name: string;
  companyName?: string;
}

export function PairDeviceForm({ screens }: { screens: Screen[] }) {
  const router = useRouter();
  const [code, setCode] = useState("");
  const [screenId, setScreenId] = useState("");
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setLoading(true);
    try {
      const res = await fetch("/api/device/pair", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: code.trim(), screenId, name: name.trim() || undefined }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({ error: "erro_desconhecido" }));
        const map: Record<string, string> = {
          code_not_found: "Código não encontrado. Confirme que o TV box ainda está mostrando o código.",
          code_expired: "Código expirou. Volte no TV box — ele gerou um novo automaticamente.",
          invalid_code: "Código inválido. Use o formato ABC-123.",
          screen_not_found: "Tela não encontrada.",
          forbidden: "Esta tela não pertence à sua empresa.",
          unauthorized: "Sessão expirada.",
        };
        setError(map[data.error] || "Falha ao parear");
        return;
      }
      const data = await res.json();
      setSuccess(`Pareado com sucesso em "${data.screen.name}". O TV box já começou a tocar.`);
      setCode("");
      setScreenId("");
      setName("");
      router.refresh();
    } catch {
      setError("Erro de rede");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="rounded-xl border border-border/50 bg-card/50 p-5 space-y-4">
      <div>
        <h3 className="text-base font-semibold">Parear novo dispositivo</h3>
        <p className="text-xs text-muted-foreground mt-1">
          Abra o APK no TV box, veja o código exibido e digite aqui.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <div>
          <label className="text-xs text-muted-foreground block mb-1">Código</label>
          <Input
            placeholder="ABC-123"
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase())}
            maxLength={10}
            className="font-mono tracking-wider uppercase"
            autoFocus
          />
        </div>
        <div>
          <label className="text-xs text-muted-foreground block mb-1">Tela</label>
          <select
            required
            value={screenId}
            onChange={(e) => setScreenId(e.target.value)}
            className="h-10 w-full rounded-lg border border-border/50 bg-background px-3 text-sm"
          >
            <option value="">Selecione...</option>
            {screens.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}{s.companyName ? ` — ${s.companyName}` : ""}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="text-xs text-muted-foreground block mb-1">Apelido (opcional)</label>
          <Input
            placeholder="TV sala"
            value={name}
            onChange={(e) => setName(e.target.value)}
            maxLength={100}
          />
        </div>
      </div>

      {error && (
        <div className="rounded-lg border border-red-500/20 bg-red-500/5 p-3 text-sm text-red-300">
          {error}
        </div>
      )}
      {success && (
        <div className="rounded-lg border border-emerald-500/20 bg-emerald-500/5 p-3 text-sm text-emerald-300">
          {success}
        </div>
      )}

      <button
        type="submit"
        disabled={loading || !code || !screenId}
        className="h-10 px-4 rounded-lg bg-orange hover:bg-orange/90 text-white font-medium text-sm disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
      >
        {loading ? "Pareando..." : "Parear dispositivo"}
      </button>
    </form>
  );
}
