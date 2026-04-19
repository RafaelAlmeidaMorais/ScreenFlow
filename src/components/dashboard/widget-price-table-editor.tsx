"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { updateWidget, deleteWidget } from "@/app/dashboard/widgets/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import type { PriceTableConfig, PriceTableItem } from "@/lib/widgets";
import { renderPriceTableHTML } from "@/lib/widgets";

interface WidgetPriceTableEditorProps {
  widgetId: string;
  config: PriceTableConfig;
  screenId: string;
}

export function WidgetPriceTableEditor({
  widgetId,
  config: initialConfig,
  screenId,
}: WidgetPriceTableEditorProps) {
  const [open, setOpen] = useState(false);
  const [config, setConfig] = useState<PriceTableConfig>(initialConfig);
  const [isPending, startTransition] = useTransition();
  const [deleting, setDeleting] = useState(false);
  const router = useRouter();

  function updateItem(itemId: string, field: keyof PriceTableItem, value: string | number) {
    setConfig((prev) => ({
      ...prev,
      items: prev.items.map((it) =>
        it.id === itemId ? { ...it, [field]: value } : it
      ),
    }));
  }

  function removeItem(itemId: string) {
    setConfig((prev) => ({
      ...prev,
      items: prev.items.filter((it) => it.id !== itemId),
    }));
  }

  function addItem() {
    const id = "i" + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
    setConfig((prev) => ({
      ...prev,
      items: [
        ...prev.items,
        { id, label: "Novo item", badge: "", badgeColor: "#666666", value: 0 },
      ],
    }));
  }

  function handleSave() {
    startTransition(async () => {
      try {
        await updateWidget(widgetId, config);
        setOpen(false);
        router.refresh();
      } catch (err: unknown) {
        alert(err instanceof Error ? err.message : "Erro ao salvar");
      }
    });
  }

  async function handleDelete() {
    if (!confirm("Tem certeza que deseja excluir este widget?")) return;
    setDeleting(true);
    try {
      await deleteWidget(widgetId);
      setOpen(false);
      router.refresh();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Erro ao excluir");
    } finally {
      setDeleting(false);
    }
  }

  // Preview HTML
  const previewHTML = renderPriceTableHTML(config);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        className="w-full text-left rounded-xl border border-border/50 hover:border-orange/40 transition-all overflow-hidden cursor-pointer"
      >
        {/* Mini preview */}
        <div
          className="w-full aspect-[3/1] overflow-hidden"
          dangerouslySetInnerHTML={{ __html: previewHTML }}
        />
        <div className="px-3 py-2 bg-card/50 border-t border-border/30">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium">{initialConfig.title || "Tabela de precos"}</span>
            <span className="text-xs text-muted-foreground">{initialConfig.items.length} itens</span>
          </div>
        </div>
      </DialogTrigger>
      <DialogContent className="sm:max-w-xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Editar tabela de precos</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Title */}
          <div className="space-y-1.5">
            <Label>Titulo</Label>
            <Input
              value={config.title ?? ""}
              onChange={(e) => setConfig((prev) => ({ ...prev, title: (e.target as HTMLInputElement).value }))}
              placeholder="Ex: Combustiveis"
            />
          </div>

          {/* Currency & Decimals */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Moeda</Label>
              <Input
                value={config.currency}
                onChange={(e) => setConfig((prev) => ({ ...prev, currency: (e.target as HTMLInputElement).value }))}
                maxLength={5}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Casas decimais</Label>
              <Input
                type="number"
                min={0}
                max={4}
                value={config.decimals}
                onChange={(e) => setConfig((prev) => ({ ...prev, decimals: parseInt((e.target as HTMLInputElement).value) || 0 }))}
              />
            </div>
          </div>

          {/* Theme colors */}
          <div className="space-y-1.5">
            <Label>Cores do tema</Label>
            <div className="grid grid-cols-2 gap-2">
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={config.theme.background}
                  onChange={(e) => setConfig((prev) => ({ ...prev, theme: { ...prev.theme, background: e.target.value } }))}
                  className="w-8 h-8 rounded cursor-pointer border border-border/50"
                />
                <span className="text-xs text-muted-foreground">Fundo</span>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={config.theme.textColor}
                  onChange={(e) => setConfig((prev) => ({ ...prev, theme: { ...prev.theme, textColor: e.target.value } }))}
                  className="w-8 h-8 rounded cursor-pointer border border-border/50"
                />
                <span className="text-xs text-muted-foreground">Texto</span>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={config.theme.valueBackground}
                  onChange={(e) => setConfig((prev) => ({ ...prev, theme: { ...prev.theme, valueBackground: e.target.value } }))}
                  className="w-8 h-8 rounded cursor-pointer border border-border/50"
                />
                <span className="text-xs text-muted-foreground">Fundo valor</span>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={config.theme.valueColor}
                  onChange={(e) => setConfig((prev) => ({ ...prev, theme: { ...prev.theme, valueColor: e.target.value } }))}
                  className="w-8 h-8 rounded cursor-pointer border border-border/50"
                />
                <span className="text-xs text-muted-foreground">Texto valor</span>
              </div>
            </div>
          </div>

          {/* Font */}
          <div className="space-y-1.5">
            <Label>Fonte</Label>
            <select
              value={config.theme.fontFamily}
              onChange={(e) => setConfig((prev) => ({ ...prev, theme: { ...prev.theme, fontFamily: e.target.value as "digital" | "sans" | "serif" } }))}
              className="w-full h-9 rounded-md border border-border/50 bg-background px-3 text-sm"
            >
              <option value="digital">Digital (monospace)</option>
              <option value="sans">Sans-serif</option>
              <option value="serif">Serif</option>
            </select>
          </div>

          {/* Items */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Itens</Label>
              <Button type="button" variant="outline" size="sm" onClick={addItem} className="text-xs gap-1">
                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                </svg>
                Adicionar
              </Button>
            </div>

            <div className="space-y-2 max-h-64 overflow-y-auto">
              {config.items.map((item, idx) => (
                <div key={item.id} className="flex items-center gap-2 p-2 rounded-lg border border-border/30 bg-card/30">
                  {/* Badge color */}
                  <input
                    type="color"
                    value={item.badgeColor || "#666666"}
                    onChange={(e) => updateItem(item.id, "badgeColor", e.target.value)}
                    className="w-7 h-7 rounded cursor-pointer border border-border/50 shrink-0"
                  />
                  {/* Badge text */}
                  <Input
                    value={item.badge ?? ""}
                    onChange={(e) => updateItem(item.id, "badge", (e.target as HTMLInputElement).value)}
                    className="w-12 text-center text-xs px-1"
                    maxLength={8}
                    placeholder="-"
                  />
                  {/* Label */}
                  <Input
                    value={item.label}
                    onChange={(e) => updateItem(item.id, "label", (e.target as HTMLInputElement).value)}
                    className="flex-1 text-sm"
                    placeholder="Nome do item"
                  />
                  {/* Value */}
                  <Input
                    type="number"
                    inputMode="decimal"
                    step="0.01"
                    value={item.value}
                    onChange={(e) => updateItem(item.id, "value", parseFloat((e.target as HTMLInputElement).value) || 0)}
                    className="w-24 text-right font-mono text-sm"
                  />
                  {/* Delete */}
                  <button
                    type="button"
                    onClick={() => removeItem(item.id)}
                    className="shrink-0 p-1 text-muted-foreground/50 hover:text-red-400 transition-colors"
                    title="Remover item"
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" />
                    </svg>
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Live preview */}
          <div className="space-y-1.5">
            <Label>Preview</Label>
            <div
              className="w-full aspect-[3/1] rounded-lg overflow-hidden border border-border/30"
              dangerouslySetInnerHTML={{ __html: previewHTML }}
            />
          </div>

          {/* Actions */}
          <div className="flex items-center justify-between pt-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleDelete}
              disabled={deleting}
              className="text-red-400 hover:text-red-300 hover:bg-red-400/10 border-red-400/30"
            >
              {deleting ? "Excluindo..." : "Excluir widget"}
            </Button>
            <div className="flex gap-2">
              <DialogClose
                className="inline-flex items-center justify-center rounded-md px-3 py-1.5 text-sm font-medium border border-border/50 hover:bg-muted/50 cursor-pointer"
              >
                Cancelar
              </DialogClose>
              <Button
                size="sm"
                onClick={handleSave}
                disabled={isPending || config.items.length === 0}
                className="bg-orange hover:bg-orange/90"
              >
                {isPending ? "Salvando..." : "Salvar"}
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
