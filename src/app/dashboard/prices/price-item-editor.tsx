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

  if (item.isHidden) {
    return (
      <div className="flex items-center gap-3 px-4 py-3 opacity-40">
        {/* Hidden indicator */}
        <svg className="w-4 h-4 text-muted-foreground shrink-0" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.223A10.477 10.477 0 0 0 1.934 12c1.292 4.338 5.31 7.5 10.066 7.5.993 0 1.953-.138 2.863-.395M6.228 6.228A10.451 10.451 0 0 1 12 4.5c4.756 0 8.773 3.162 10.065 7.498a10.522 10.522 0 0 1-4.293 5.774M6.228 6.228 3 3m3.228 3.228 3.65 3.65m7.894 7.894L21 21m-3.228-3.228-3.65-3.65m0 0a3 3 0 1 0-4.243-4.243m4.242 4.242L9.88 9.88" />
        </svg>
        <div className="flex-1 min-w-0">
          <div className="text-sm font-medium truncate line-through">{item.label}</div>
        </div>
        <span className="text-xs text-muted-foreground">Oculto</span>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-3 px-4 py-3">
      {/* Logo or Badge */}
      {item.logoUrl ? (
        <img
          src={item.logoUrl}
          alt={item.label}
          className="h-9 w-auto max-w-[100px] object-contain shrink-0 rounded"
        />
      ) : item.badge ? (
        <div
          className="w-9 h-9 rounded-lg flex items-center justify-center text-white font-bold text-sm shrink-0"
          style={{ backgroundColor: item.badgeColor || "#666" }}
        >
          {item.badge}
        </div>
      ) : null}

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
