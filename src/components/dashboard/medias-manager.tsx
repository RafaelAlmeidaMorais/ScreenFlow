"use client";

import { useEffect, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  assignMediasToScreens,
  deleteMedias,
  setMediasEnabled,
} from "@/app/dashboard/medias/actions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { MediaEditDialog } from "@/components/dashboard/media-edit-dialog";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export type MediaStatus = "active" | "scheduled" | "disabled" | "expired";

export interface MediaRow {
  id: string;
  title: string;
  fileUrl: string;
  type: string;
  durationSeconds: number;
  isEnabled: boolean;
  startDate: string;
  endDate: string | null;
  startLabel: string;
  endLabel: string | null;
  status: MediaStatus;
  screenId: string;
  screenName: string;
  companyId: string;
  companyName: string;
  createdAtLabel: string;
  createdByName: string;
  /** Other screens that show this same file. */
  alsoOn: string[];
  /** Every screen that shows this file, this row's screen included. */
  fileScreenIds: string[];
}

interface ScreenOption {
  id: string;
  name: string;
  companyId: string;
  companyName: string;
}

interface Filters {
  q: string;
  screens: string[];
  status: MediaStatus | "";
}

interface Props {
  rows: MediaRow[];
  screens: ScreenOption[];
  showCompany: boolean;
  filters: Filters;
  /** Medias that match the filter but were left out of the list. */
  hiddenCount: number;
}

const MAX_REPORT_IDS = 150;

const statusLabels: Record<MediaStatus, string> = {
  active: "Ativa",
  scheduled: "Agendada",
  disabled: "Desabilitada",
  expired: "Expirada",
};

const statusColors: Record<MediaStatus, string> = {
  active: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
  scheduled: "bg-blue-500/10 text-blue-400 border-blue-500/20",
  disabled: "bg-muted text-muted-foreground border-border/50",
  expired: "bg-red-500/10 text-red-400 border-red-500/20",
};

function plural(n: number, one: string, many: string) {
  return `${n} ${n === 1 ? one : many}`;
}

export function MediasManager({ rows, screens, showCompany, filters, hiddenCount }: Props) {
  const router = useRouter();
  const [, startTransition] = useTransition();

  const [q, setQ] = useState(filters.q);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");
  const [editing, setEditing] = useState<MediaRow | null>(null);
  const [assignFor, setAssignFor] = useState<MediaRow[] | null>(null);
  const [reportFor, setReportFor] = useState<MediaRow[] | null>(null);

  // Ticks on rows that a filter change removed from the list don't count.
  const picked = rows.filter((r) => selected.has(r.id));
  const allPicked = rows.length > 0 && picked.length === rows.length;

  function pushFilters(next: Filters) {
    const params = new URLSearchParams();
    if (next.q) params.set("q", next.q);
    if (next.screens.length) params.set("screens", next.screens.join(","));
    if (next.status) params.set("status", next.status);
    const query = params.toString();
    startTransition(() => {
      router.replace(query ? `?${query}` : "?");
    });
  }

  // Debounce text search
  useEffect(() => {
    if (q === filters.q) return;
    const t = setTimeout(() => pushFilters({ ...filters, q }), 300);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q]);

  function toggleScreen(id: string) {
    const next = filters.screens.includes(id)
      ? filters.screens.filter((s) => s !== id)
      : [...filters.screens, id];
    pushFilters({ ...filters, q, screens: next });
  }

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function run(action: () => Promise<string>) {
    setBusy(true);
    setNotice("");
    try {
      setNotice(await action());
      router.refresh();
      return true;
    } catch {
      alert("Não foi possível concluir a ação. Tente de novo.");
      return false;
    } finally {
      setBusy(false);
    }
  }

  function setEnabled(targets: MediaRow[], enabled: boolean) {
    const expired = targets.filter((t) => t.status === "expired").length;
    if (enabled && expired > 0) {
      const ok = confirm(
        `${plural(expired, "mídia já passou", "mídias já passaram")} da data de fim. ` +
          "Reativar remove a data de fim para que voltem ao ar. Continuar?",
      );
      if (!ok) return;
    }
    void run(async () => {
      const res = await setMediasEnabled(targets.map((t) => t.id), enabled);
      return enabled
        ? `${plural(res.updated, "mídia ativada", "mídias ativadas")}.`
        : `${plural(res.updated, "mídia desativada", "mídias desativadas")}.`;
    });
  }

  function remove(targets: MediaRow[]) {
    const what =
      targets.length === 1
        ? `"${targets[0].title}" da tela "${targets[0].screenName}"`
        : `${targets.length} mídias`;
    const ok = confirm(
      `Excluir ${what}? O histórico de exibições também sai dos relatórios. Não dá para desfazer.`,
    );
    if (!ok) return;
    void run(async () => {
      const res = await deleteMedias(targets.map((t) => t.id));
      setSelected(new Set());
      return `${plural(res.deleted, "mídia excluída", "mídias excluídas")}.`;
    });
  }

  async function assign(targets: MediaRow[], screenIds: string[]) {
    const done = await run(async () => {
      const res = await assignMediasToScreens(targets.map((t) => t.id), screenIds);
      const added = `${plural(res.created, "mídia adicionada", "mídias adicionadas")} sem novo upload.`;
      return res.skipped > 0
        ? `${added} ${plural(res.skipped, "ignorada", "ignoradas")} porque a tela já tinha o arquivo.`
        : added;
    });
    if (done) setAssignFor(null);
  }

  const hasFilters = !!(q || filters.screens.length || filters.status);

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="space-y-3">
        <div className="flex flex-wrap gap-3 items-end">
          <div className="flex-1 min-w-[220px]">
            <label htmlFor="media-search" className="text-xs text-muted-foreground block mb-1">
              Buscar mídia
            </label>
            <Input
              id="media-search"
              placeholder="Nome do vídeo ou imagem..."
              value={q}
              onChange={(e) => setQ(e.target.value)}
            />
          </div>
          <div>
            <label htmlFor="media-status" className="text-xs text-muted-foreground block mb-1">
              Situação
            </label>
            <select
              id="media-status"
              value={filters.status}
              onChange={(e) =>
                pushFilters({ ...filters, q, status: e.target.value as MediaStatus | "" })
              }
              className="h-10 rounded-lg border border-border/50 bg-background px-3 text-sm min-w-[160px]"
            >
              <option value="">Todas</option>
              <option value="active">Ativas</option>
              <option value="scheduled">Agendadas</option>
              <option value="disabled">Desabilitadas</option>
              <option value="expired">Expiradas</option>
            </select>
          </div>
          {hasFilters && (
            <button
              type="button"
              onClick={() => {
                setQ("");
                pushFilters({ q: "", screens: [], status: "" });
              }}
              className="h-10 px-3 rounded-lg border border-border/50 text-sm text-muted-foreground hover:text-foreground cursor-pointer"
            >
              Limpar
            </button>
          )}
        </div>

        {screens.length > 0 && (
          <div>
            <div className="text-xs text-muted-foreground mb-1.5">Telas</div>
            <div className="flex flex-wrap gap-2">
              <FilterChip
                active={filters.screens.length === 0}
                onClick={() => pushFilters({ ...filters, q, screens: [] })}
              >
                Todas
              </FilterChip>
              {screens.map((s) => (
                <FilterChip
                  key={s.id}
                  active={filters.screens.includes(s.id)}
                  onClick={() => toggleScreen(s.id)}
                >
                  {s.name}
                </FilterChip>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Bulk actions */}
      <div className="flex flex-wrap items-center justify-between gap-3 min-h-10">
        <p className="text-xs text-muted-foreground">
          {picked.length > 0
            ? `${plural(picked.length, "mídia selecionada", "mídias selecionadas")} de ${rows.length}.`
            : "Marque mídias para ativar, desativar, adicionar a outras telas, gerar relatório ou excluir em lote."}
        </p>
        {picked.length > 0 && (
          <div className="flex flex-wrap items-center gap-2">
            <BulkButton disabled={busy} onClick={() => setEnabled(picked, true)}>Ativar</BulkButton>
            <BulkButton disabled={busy} onClick={() => setEnabled(picked, false)}>Desativar</BulkButton>
            <BulkButton disabled={busy} onClick={() => setAssignFor(picked)}>Adicionar a outra tela</BulkButton>
            <BulkButton disabled={busy} onClick={() => setReportFor(picked)}>Relatório PDF</BulkButton>
            <BulkButton disabled={busy} danger onClick={() => remove(picked)}>Excluir</BulkButton>
          </div>
        )}
      </div>

      <p role="status" className={notice ? "text-sm text-emerald-400" : "sr-only"}>
        {notice}
      </p>

      {rows.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border/50 bg-card/30 p-12 text-center">
          <p className="text-muted-foreground text-sm">
            {hasFilters ? "Nenhuma mídia encontrada para este filtro" : "Nenhuma mídia cadastrada ainda"}
          </p>
        </div>
      ) : (
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
                      onChange={() =>
                        setSelected(allPicked ? new Set() : new Set(rows.map((r) => r.id)))
                      }
                      className="w-4 h-4 accent-orange cursor-pointer align-middle"
                    />
                  </th>
                  <th className="px-3 py-3 font-medium">Mídia</th>
                  <th className="px-3 py-3 font-medium">Tela</th>
                  <th className="px-3 py-3 font-medium">Inserida em</th>
                  <th className="px-3 py-3 font-medium">Exibição</th>
                  <th className="px-3 py-3 font-medium">Situação</th>
                  <th className="px-3 py-3 font-medium text-right">Ações</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => {
                  const isPicked = selected.has(r.id);
                  const turnOn = r.status === "disabled" || r.status === "expired";
                  return (
                    <tr
                      key={r.id}
                      className={`border-b border-border/30 last:border-0 ${
                        isPicked ? "bg-orange/5" : "hover:bg-muted/20"
                      }`}
                    >
                      <td className="pl-4 py-3">
                        <input
                          type="checkbox"
                          aria-label={`Selecionar ${r.title} em ${r.screenName}`}
                          checked={isPicked}
                          onChange={() => toggle(r.id)}
                          className="w-4 h-4 accent-orange cursor-pointer align-middle"
                        />
                      </td>
                      <td className="px-3 py-3">
                        <div className="flex items-center gap-3 min-w-[180px]">
                          <div className="w-14 h-9 rounded-md bg-muted/50 border border-border/50 shrink-0 overflow-hidden">
                            {r.type === "IMAGE" ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img src={r.fileUrl} alt="" loading="lazy" className="w-full h-full object-cover" />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center">
                                <svg className="w-4 h-4 text-muted-foreground" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" aria-hidden="true">
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M5.25 5.653c0-.856.917-1.398 1.667-.986l11.54 6.347a1.125 1.125 0 0 1 0 1.972l-11.54 6.347a1.125 1.125 0 0 1-1.667-.986V5.653Z" />
                                </svg>
                              </div>
                            )}
                          </div>
                          <div className="min-w-0">
                            <div className="font-medium truncate max-w-[220px]" title={r.title}>{r.title}</div>
                            <div className="text-xs text-muted-foreground/60">
                              {r.type === "VIDEO" ? "Vídeo" : "Imagem"} • {r.durationSeconds}s
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-3 py-3 min-w-[140px]">
                        <Link
                          href={`/dashboard/screens/${r.screenId}`}
                          className="hover:text-orange transition-colors"
                        >
                          {r.screenName}
                        </Link>
                        {showCompany && (
                          <div className="text-xs text-muted-foreground/60">{r.companyName}</div>
                        )}
                        {r.alsoOn.length > 0 && (
                          <div
                            className="text-xs text-muted-foreground/60 max-w-[220px] truncate"
                            title={`Também em: ${r.alsoOn.join(", ")}`}
                          >
                            Também em: {r.alsoOn.join(", ")}
                          </div>
                        )}
                      </td>
                      <td className="px-3 py-3 whitespace-nowrap">
                        <div className="text-muted-foreground">{r.createdAtLabel}</div>
                        <div className="text-xs text-muted-foreground/60">por {r.createdByName}</div>
                      </td>
                      <td className="px-3 py-3 text-xs text-muted-foreground whitespace-nowrap">
                        <div>De {r.startLabel}</div>
                        <div className="text-muted-foreground/60">
                          {r.endLabel ? `até ${r.endLabel}` : "sem data de fim"}
                        </div>
                      </td>
                      <td className="px-3 py-3">
                        <Badge variant="secondary" className={`text-xs border ${statusColors[r.status]}`}>
                          {statusLabels[r.status]}
                        </Badge>
                      </td>
                      <td className="px-3 py-3">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            type="button"
                            disabled={busy}
                            onClick={() => setEnabled([r], turnOn)}
                            className={`h-8 px-2.5 rounded-md text-xs font-medium cursor-pointer disabled:opacity-50 transition-colors ${
                              turnOn
                                ? "text-emerald-400 hover:bg-emerald-500/10"
                                : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                            }`}
                          >
                            {r.status === "expired" ? "Reativar" : turnOn ? "Ativar" : "Desativar"}
                          </button>
                          <DropdownMenu>
                            <DropdownMenuTrigger
                              aria-label={`Mais ações para ${r.title}`}
                              className="inline-flex items-center justify-center w-8 h-8 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted/50 cursor-pointer"
                            >
                              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" aria-hidden="true">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 12a.75.75 0 1 1-1.5 0 .75.75 0 0 1 1.5 0ZM12.75 12a.75.75 0 1 1-1.5 0 .75.75 0 0 1 1.5 0ZM18.75 12a.75.75 0 1 1-1.5 0 .75.75 0 0 1 1.5 0Z" />
                              </svg>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-56">
                              <DropdownMenuItem onClick={() => setEditing(r)} className="cursor-pointer">
                                Editar
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => setAssignFor([r])} className="cursor-pointer">
                                Adicionar a outra tela
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => setReportFor([r])} className="cursor-pointer">
                                Relatório PDF
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                onClick={() => remove([r])}
                                className="text-destructive focus:text-destructive cursor-pointer"
                              >
                                Excluir desta tela
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {hiddenCount > 0 && (
        <p className="text-xs text-muted-foreground">
          Mostrando as {rows.length} mídias mais recentes. Outras {hiddenCount} ficaram de fora: use a
          busca ou os filtros para chegar nelas.
        </p>
      )}

      <p className="text-xs text-muted-foreground/60">
        As TVs aplicam as mudanças no próximo recarregamento do player. Para aplicar na hora, use
        Reiniciar Player na página da tela.
      </p>

      {editing && (
        <MediaEditDialog
          key={editing.id}
          media={editing}
          screenId={editing.screenId}
          open
          onOpenChange={(open) => {
            if (!open) setEditing(null);
          }}
        />
      )}

      {assignFor && (
        <AssignDialog
          medias={assignFor}
          screens={screens}
          showCompany={showCompany}
          busy={busy}
          onClose={() => setAssignFor(null)}
          onConfirm={(screenIds) => assign(assignFor, screenIds)}
        />
      )}

      {reportFor && <ReportDialog medias={reportFor} onClose={() => setReportFor(null)} />}
    </div>
  );
}

function FilterChip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={`h-8 px-3 rounded-full border text-xs font-medium cursor-pointer transition-colors ${
        active
          ? "bg-orange/10 text-orange border-orange/30"
          : "border-border/50 text-muted-foreground hover:text-foreground hover:bg-muted/50"
      }`}
    >
      {children}
    </button>
  );
}

function BulkButton({
  danger,
  children,
  ...props
}: React.ComponentProps<"button"> & { danger?: boolean }) {
  return (
    <button
      type="button"
      {...props}
      className={`h-9 px-3 rounded-lg border text-sm cursor-pointer disabled:opacity-50 transition-colors ${
        danger
          ? "border-red-500/30 text-red-400 hover:bg-red-500/10"
          : "border-border/50 text-foreground hover:bg-muted/50"
      }`}
    >
      {children}
    </button>
  );
}

function AssignDialog({
  medias,
  screens,
  showCompany,
  busy,
  onClose,
  onConfirm,
}: {
  medias: MediaRow[];
  screens: ScreenOption[];
  showCompany: boolean;
  busy: boolean;
  onClose: () => void;
  onConfirm: (screenIds: string[]) => void;
}) {
  const [chosen, setChosen] = useState<Set<string>>(new Set());

  const companyIds = new Set(medias.map((m) => m.companyId));
  const candidates = screens.filter((s) => companyIds.has(s.companyId));
  // Nothing left to add where every selected file is already on the screen.
  const covered = (screenId: string) => medias.every((m) => m.fileScreenIds.includes(screenId));
  const available = candidates.filter((s) => !covered(s.id));

  function toggle(id: string) {
    setChosen((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md bg-card border-border/50">
        <DialogHeader>
          <DialogTitle>Adicionar a outra tela</DialogTitle>
          <DialogDescription>
            {medias.length === 1
              ? `"${medias[0].title}" passa a ser exibida também nas telas marcadas.`
              : `${medias.length} mídias passam a ser exibidas também nas telas marcadas.`}{" "}
            O arquivo não é enviado de novo: a tela usa o mesmo arquivo já armazenado.
          </DialogDescription>
        </DialogHeader>

        {candidates.length === 0 ? (
          <p className="text-sm text-muted-foreground mt-2">Não há outras telas cadastradas.</p>
        ) : (
          <div className="mt-2 max-h-72 overflow-y-auto rounded-lg border border-border/50 divide-y divide-border/30">
            {candidates.map((s) => {
              const done = covered(s.id);
              return (
                <label
                  key={s.id}
                  className={`flex items-center gap-3 px-3 py-2.5 text-sm ${
                    done ? "opacity-50" : "cursor-pointer hover:bg-muted/30"
                  }`}
                >
                  <input
                    type="checkbox"
                    disabled={done}
                    checked={chosen.has(s.id)}
                    onChange={() => toggle(s.id)}
                    className="w-4 h-4 accent-orange"
                  />
                  <span className="flex-1 min-w-0 truncate">
                    {s.name}
                    {showCompany && (
                      <span className="text-xs text-muted-foreground/60"> • {s.companyName}</span>
                    )}
                  </span>
                  {done && <span className="text-xs text-muted-foreground">já está nesta tela</span>}
                </label>
              );
            })}
          </div>
        )}

        <p className="text-xs text-muted-foreground mt-2">
          A mídia entra no fim da fila, com a mesma duração e as mesmas datas. Em telas divididas em
          zonas, entra na primeira zona.
        </p>

        <div className="flex justify-end gap-3 pt-2">
          <Button type="button" variant="ghost" onClick={onClose} className="cursor-pointer">
            Cancelar
          </Button>
          <Button
            type="button"
            disabled={busy || chosen.size === 0 || available.length === 0}
            onClick={() => onConfirm(Array.from(chosen))}
            className="bg-orange hover:bg-orange/90 text-orange-foreground font-semibold cursor-pointer"
          >
            {busy
              ? "Adicionando..."
              : chosen.size > 0
              ? `Adicionar a ${plural(chosen.size, "tela", "telas")}`
              : "Adicionar"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function ReportDialog({ medias, onClose }: { medias: MediaRow[]; onClose: () => void }) {
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");

  const tooMany = medias.length > MAX_REPORT_IDS;
  const invalid = !!from && !!to && to < from;

  const params = new URLSearchParams();
  params.set("ids", medias.map((m) => m.id).join(","));
  if (from) params.set("from", from);
  if (to) params.set("to", to);
  const href = `/api/reports/pdf?${params.toString()}`;

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md bg-card border-border/50">
        <DialogHeader>
          <DialogTitle>Relatório de exibição em PDF</DialogTitle>
          <DialogDescription>
            {medias.length === 1
              ? `Quantas vezes "${medias[0].title}" foi exibida na tela "${medias[0].screenName}".`
              : `Quantas vezes as ${medias.length} mídias selecionadas foram exibidas, por tela e por dia.`}
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-2 gap-3 mt-2">
          <div>
            <label htmlFor="report-from" className="text-xs text-muted-foreground block mb-1">De</label>
            <Input id="report-from" type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
          </div>
          <div>
            <label htmlFor="report-to" className="text-xs text-muted-foreground block mb-1">Até</label>
            <Input id="report-to" type="date" value={to} onChange={(e) => setTo(e.target.value)} />
          </div>
        </div>
        <p className={`text-xs mt-1 ${invalid || tooMany ? "text-red-400" : "text-muted-foreground"}`}>
          {tooMany
            ? `Selecione até ${MAX_REPORT_IDS} mídias por relatório.`
            : invalid
            ? "A data final precisa ser igual ou depois da inicial."
            : "Sem datas, o relatório cobre todo o período."}
        </p>

        <div className="flex justify-end gap-3 pt-2">
          <Button type="button" variant="ghost" onClick={onClose} className="cursor-pointer">
            Fechar
          </Button>
          {tooMany || invalid ? (
            <Button type="button" disabled className="bg-orange text-orange-foreground font-semibold">
              Baixar PDF
            </Button>
          ) : (
            <a
              href={href}
              download
              className="inline-flex items-center h-9 px-4 rounded-lg bg-orange hover:bg-orange/90 text-orange-foreground font-semibold text-sm transition-colors"
            >
              Baixar PDF
            </a>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
