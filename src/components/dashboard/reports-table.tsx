"use client";

import { useState } from "react";
import { Badge } from "@/components/ui/badge";

export interface ReportsTableRow {
  id: string;
  title: string;
  type: string;
  durationSeconds: number;
  isEnabled: boolean;
  screenName: string;
  companyName: string;
  createdByName: string;
  createdByEmail: string;
  createdAtLabel: string;
  plays: number;
  lastPlayedLabel: string | null;
}

interface Props {
  rows: ReportsTableRow[];
  showCompany: boolean;
  filters: { q: string; screen: string; from: string; to: string };
}

const typeLabels: Record<string, string> = {
  IMAGE: "Imagem",
  VIDEO: "Vídeo",
};

const typeColors: Record<string, string> = {
  IMAGE: "bg-blue-500/10 text-blue-400 border-blue-500/20",
  VIDEO: "bg-purple-500/10 text-purple-400 border-purple-500/20",
};

export function ReportsTable({ rows, showCompany, filters }: Props) {
  const [selected, setSelected] = useState<Set<string>>(new Set());

  // Ticks on rows that a filter change removed from the list don't count.
  const picked = rows.filter((r) => selected.has(r.id));
  const allPicked = picked.length === rows.length;

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleAll() {
    setSelected(allPicked ? new Set() : new Set(rows.map((r) => r.id)));
  }

  const params = new URLSearchParams();
  if (filters.from) params.set("from", filters.from);
  if (filters.to) params.set("to", filters.to);
  if (picked.length > 0 && !allPicked) {
    params.set("ids", picked.map((r) => r.id).join(","));
  } else {
    if (filters.q) params.set("q", filters.q);
    if (filters.screen) params.set("screen", filters.screen);
  }
  const pdfHref = `/api/reports/pdf?${params.toString()}`;

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-xs text-muted-foreground">
          {picked.length > 0
            ? `${picked.length} de ${rows.length} mídias selecionadas para o PDF.`
            : "Marque as mídias do cliente para gerar o PDF só com elas. Sem nada marcado, o PDF leva todas as mídias listadas."}
        </p>
        <a
          href={pdfHref}
          download
          className="inline-flex items-center gap-2 h-10 px-4 rounded-lg bg-orange hover:bg-orange/90 text-orange-foreground font-semibold text-sm transition-colors"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5M16.5 12 12 16.5m0 0L7.5 12m4.5 4.5V3" />
          </svg>
          {picked.length > 0 ? `Baixar PDF (${picked.length})` : "Baixar PDF"}
        </a>
      </div>

      <div className="rounded-xl border border-border/50 bg-card/50 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/30 border-b border-border/50">
              <tr className="text-left text-xs text-muted-foreground">
                <th className="pl-4 py-3 w-8">
                  <input
                    type="checkbox"
                    aria-label="Selecionar todas as mídias"
                    checked={allPicked}
                    onChange={toggleAll}
                    className="w-4 h-4 accent-orange cursor-pointer align-middle"
                  />
                </th>
                <th className="px-4 py-3 font-medium">Mídia</th>
                <th className="px-4 py-3 font-medium">Tipo</th>
                <th className="px-4 py-3 font-medium">Tela</th>
                {showCompany && <th className="px-4 py-3 font-medium">Instituição</th>}
                <th className="px-4 py-3 font-medium">Enviado por</th>
                <th className="px-4 py-3 font-medium">Inserido em</th>
                <th className="px-4 py-3 font-medium text-right">Exibições</th>
                <th className="px-4 py-3 font-medium">Última exibição</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => {
                const isPicked = selected.has(r.id);
                return (
                  <tr
                    key={r.id}
                    onClick={() => toggle(r.id)}
                    className={`border-b border-border/30 last:border-0 cursor-pointer ${
                      isPicked ? "bg-orange/5" : "hover:bg-muted/20"
                    }`}
                  >
                    <td className="pl-4 py-3">
                      <input
                        type="checkbox"
                        aria-label={`Selecionar ${r.title}`}
                        checked={isPicked}
                        onChange={() => toggle(r.id)}
                        onClick={(e) => e.stopPropagation()}
                        className="w-4 h-4 accent-orange cursor-pointer align-middle"
                      />
                    </td>
                    <td className="px-4 py-3">
                      <div className="font-medium truncate max-w-xs" title={r.title}>{r.title}</div>
                      <div className="text-xs text-muted-foreground/60">
                        {r.isEnabled ? "" : "desativada • "}
                        {r.durationSeconds}s
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <Badge variant="secondary" className={`text-xs border ${typeColors[r.type] || ""}`}>
                        {typeLabels[r.type] || r.type}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">{r.screenName}</td>
                    {showCompany && (
                      <td className="px-4 py-3 text-muted-foreground/60 text-xs">{r.companyName}</td>
                    )}
                    <td className="px-4 py-3">
                      <div className="text-sm">{r.createdByName}</div>
                      <div className="text-xs text-muted-foreground/60">{r.createdByEmail}</div>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">{r.createdAtLabel}</td>
                    <td className="px-4 py-3 text-right">
                      <span className={`font-bold ${r.plays > 0 ? "text-emerald-400" : "text-muted-foreground/40"}`}>
                        {r.plays.toLocaleString("pt-BR")}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground text-xs">
                      {r.lastPlayedLabel ?? <span className="text-muted-foreground/40">—</span>}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
