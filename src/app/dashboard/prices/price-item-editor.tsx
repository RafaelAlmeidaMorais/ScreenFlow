"use client";

import { useState, useTransition, useRef } from "react";
import { updatePriceItem } from "@/app/dashboard/widgets/actions";
import type { PriceTableItem } from "@/lib/widgets";

interface PriceItemEditorProps {
  widgetId: string;
  item: PriceTableItem;
  currency: string;
  decimals: number;
}

export function PriceItemEditor({ widgetId, item, currency, decimals }: PriceItemEditorProps) {
  const [value, setValue] = useState(item.value);
  const [saved, setSaved] = useState(false);
  const [isPending, startTransition] = useTransition();
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  function handleChange(newValue: number) {
    setValue(newValue);
  }

  function handleSave() {
    if (value === item.value) return;
    startTransition(async () => {
      try {
        await updatePriceItem(widgetId, item.id, value);
        setSaved(true);
        if (timeoutRef.current) clearTimeout(timeoutRef.current);
        timeoutRef.current = setTimeout(() => setSaved(false), 2000);
      } catch (err: unknown) {
        alert(err instanceof Error ? err.message : "Erro ao salvar");
      }
    });
  }

  return (
    <div className="flex items-center gap-3 px-4 py-3">
      {/* Badge */}
      {item.badge && (
        <div
          className="w-9 h-9 rounded-lg flex items-center justify-center text-white font-bold text-sm shrink-0"
          style={{ backgroundColor: item.badgeColor || "#666" }}
        >
          {item.badge}
        </div>
      )}

      {/* Label */}
      <div className="flex-1 min-w-0">
        <div className="text-sm font-medium truncate">{item.label}</div>
        {item.description && (
          <div className="text-xs text-muted-foreground truncate">{item.description}</div>
        )}
      </div>

      {/* Value input */}
      <div className="flex items-center gap-2 shrink-0">
        <span className="text-xs text-muted-foreground">{currency}</span>
        <input
          type="number"
          inputMode="decimal"
          step={Math.pow(10, -decimals)}
          value={value}
          onChange={(e) => handleChange(parseFloat(e.target.value) || 0)}
          onBlur={handleSave}
          onKeyDown={(e) => { if (e.key === "Enter") handleSave(); }}
          className="w-24 h-9 rounded-lg border border-border/50 bg-background px-3 text-right font-mono text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-orange/40 focus:border-orange"
        />

        {/* Status indicator */}
        <div className="w-6 flex items-center justify-center">
          {isPending && (
            <div className="w-4 h-4 border-2 border-orange/30 border-t-orange rounded-full animate-spin" />
          )}
          {saved && !isPending && (
            <svg className="w-4 h-4 text-emerald-400" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
            </svg>
          )}
        </div>
      </div>
    </div>
  );
}
