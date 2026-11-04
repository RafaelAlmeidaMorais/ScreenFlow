"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import { Input } from "@/components/ui/input";

export function ReportsFilters({ screens }: { screens: { id: string; name: string }[] }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [, startTransition] = useTransition();

  const [q, setQ] = useState(searchParams.get("q") ?? "");
  const [screenId, setScreenId] = useState(searchParams.get("screen") ?? "");
  const [from, setFrom] = useState(searchParams.get("from") ?? "");
  const [to, setTo] = useState(searchParams.get("to") ?? "");

  // Debounce text search
  useEffect(() => {
    const current = searchParams.get("q") ?? "";
    if (q === current) return;
    const t = setTimeout(() => {
      push({ q, screen: screenId, from, to });
    }, 300);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q]);

  function push(next: { q: string; screen: string; from: string; to: string }) {
    const params = new URLSearchParams();
    if (next.q) params.set("q", next.q);
    if (next.screen) params.set("screen", next.screen);
    if (next.from) params.set("from", next.from);
    if (next.to) params.set("to", next.to);
    const query = params.toString();
    startTransition(() => {
      router.replace(query ? `?${query}` : "?");
    });
  }

  return (
    <div className="flex flex-wrap gap-3 items-end">
      <div className="flex-1 min-w-[220px]">
        <label className="text-xs text-muted-foreground block mb-1">Buscar mídia</label>
        <Input
          placeholder="Nome do vídeo ou imagem..."
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
      </div>
      <div>
        <label className="text-xs text-muted-foreground block mb-1">Tela</label>
        <select
          value={screenId}
          onChange={(e) => {
            setScreenId(e.target.value);
            push({ q, screen: e.target.value, from, to });
          }}
          className="h-10 rounded-lg border border-border/50 bg-background px-3 text-sm min-w-[180px]"
        >
          <option value="">Todas</option>
          {screens.map((s) => (
            <option key={s.id} value={s.id}>{s.name}</option>
          ))}
        </select>
      </div>
      <div>
        <label className="text-xs text-muted-foreground block mb-1">De</label>
        <Input
          type="date"
          value={from}
          onChange={(e) => {
            setFrom(e.target.value);
            push({ q, screen: screenId, from: e.target.value, to });
          }}
        />
      </div>
      <div>
        <label className="text-xs text-muted-foreground block mb-1">Até</label>
        <Input
          type="date"
          value={to}
          onChange={(e) => {
            setTo(e.target.value);
            push({ q, screen: screenId, from, to: e.target.value });
          }}
        />
      </div>
      {(q || screenId || from || to) && (
        <button
          onClick={() => {
            setQ(""); setScreenId(""); setFrom(""); setTo("");
            push({ q: "", screen: "", from: "", to: "" });
          }}
          className="h-10 px-3 rounded-lg border border-border/50 text-sm text-muted-foreground hover:text-foreground"
        >
          Limpar
        </button>
      )}
    </div>
  );
}
