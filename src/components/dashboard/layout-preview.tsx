"use client";

import { getLayoutDefinition } from "@/lib/layouts";

/**
 * Visual mini-preview of a layout template, showing each slot as a
 * coloured rectangle with its label. Used in the edit-screen dialog
 * so users can see the zones they are choosing.
 */
export function LayoutPreview({
  template,
  orientation = "LANDSCAPE",
  className = "",
}: {
  template: string;
  orientation?: "LANDSCAPE" | "PORTRAIT";
  className?: string;
}) {
  const def = getLayoutDefinition(template);

  // Portrait swaps width/height proportions visually
  const isPortrait = orientation === "PORTRAIT";
  const aspectClass = isPortrait ? "aspect-[9/16] w-24" : "aspect-video w-full max-w-xs";

  // Cycle through subtle colors for slots
  const slotColors = [
    "bg-orange/30 border-orange/60 text-orange",
    "bg-blue-500/25 border-blue-500/60 text-blue-400",
    "bg-emerald-500/25 border-emerald-500/60 text-emerald-400",
    "bg-violet-500/25 border-violet-500/60 text-violet-400",
  ];

  return (
    <div
      className={`relative ${aspectClass} mx-auto rounded-lg border border-border/50 bg-background/50 overflow-hidden ${className}`}
    >
      {def.slots.map((slot, idx) => (
        <div
          key={slot.name}
          className={`absolute border ${slotColors[idx % slotColors.length]} flex items-center justify-center`}
          style={{
            top: `${slot.top}%`,
            left: `${slot.left}%`,
            width: `${slot.width}%`,
            height: `${slot.height}%`,
          }}
        >
          <span className="text-[9px] font-semibold uppercase tracking-wide truncate px-1">
            {slot.label}
          </span>
        </div>
      ))}
    </div>
  );
}
