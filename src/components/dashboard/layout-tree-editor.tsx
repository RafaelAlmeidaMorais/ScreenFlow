"use client";

import { useState } from "react";
import {
  type LayoutNode,
  type LayoutSplit,
  flattenLayoutTree,
} from "@/lib/layouts";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface LayoutTreeEditorProps {
  tree: LayoutNode;
  onChange: (tree: LayoutNode) => void;
  orientation?: "LANDSCAPE" | "PORTRAIT";
}

const SLOT_COLORS = [
  { bg: "rgba(234,139,53,0.3)", border: "rgba(234,139,53,0.7)", text: "#ea8b35" },
  { bg: "rgba(59,130,246,0.25)", border: "rgba(59,130,246,0.6)", text: "#60a5fa" },
  { bg: "rgba(16,185,129,0.25)", border: "rgba(16,185,129,0.6)", text: "#34d399" },
  { bg: "rgba(139,92,246,0.25)", border: "rgba(139,92,246,0.6)", text: "#a78bfa" },
  { bg: "rgba(236,72,153,0.25)", border: "rgba(236,72,153,0.6)", text: "#f472b6" },
  { bg: "rgba(245,158,11,0.25)", border: "rgba(245,158,11,0.6)", text: "#fbbf24" },
];

let colorIdx = 0;
function getSlotColor(idx: number) {
  return SLOT_COLORS[idx % SLOT_COLORS.length];
}

export function LayoutTreeEditor({ tree, onChange, orientation = "LANDSCAPE" }: LayoutTreeEditorProps) {
  const [selectedPath, setSelectedPath] = useState<string | null>(null);
  const slots = flattenLayoutTree(tree);

  colorIdx = 0;

  const isPortrait = orientation === "PORTRAIT";
  const aspectClass = isPortrait ? "aspect-[9/16] w-28" : "aspect-video w-full max-w-sm";

  return (
    <div className="space-y-3">
      {/* Visual preview */}
      <div className={`relative ${aspectClass} mx-auto rounded-lg border border-border/50 bg-background/80 overflow-hidden`}>
        {slots.map((slot, idx) => {
          const color = getSlotColor(idx);
          const isSelected = selectedPath === slot.name;
          return (
            <button
              key={slot.name}
              type="button"
              onClick={() => setSelectedPath(isSelected ? null : slot.name)}
              className="absolute flex items-center justify-center transition-all cursor-pointer"
              style={{
                top: `${slot.top}%`,
                left: `${slot.left}%`,
                width: `${slot.width}%`,
                height: `${slot.height}%`,
                background: color.bg,
                border: `1.5px solid ${isSelected ? "#fff" : color.border}`,
                boxShadow: isSelected ? "0 0 0 2px rgba(234,139,53,0.5)" : "none",
              }}
            >
              <span
                className="text-[9px] font-semibold uppercase tracking-wide truncate px-1"
                style={{ color: color.text }}
              >
                {slot.label}
              </span>
            </button>
          );
        })}
      </div>

      {/* Tree controls */}
      <TreeNodeEditor
        node={tree}
        path=""
        selectedPath={selectedPath}
        onSelect={setSelectedPath}
        onChange={onChange}
        depth={0}
      />
    </div>
  );
}

interface TreeNodeEditorProps {
  node: LayoutNode;
  path: string;
  selectedPath: string | null;
  onSelect: (path: string | null) => void;
  onChange: (node: LayoutNode) => void;
  depth: number;
}

function TreeNodeEditor({ node, path, selectedPath, onSelect, onChange, depth }: TreeNodeEditorProps) {
  if (node.type === "leaf") {
    const isSelected = selectedPath === node.name;
    return (
      <div
        className={`rounded-lg border p-2 space-y-2 transition-all ${
          isSelected ? "border-orange/60 bg-orange/5" : "border-border/30 bg-card/30"
        }`}
      >
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => onSelect(isSelected ? null : node.name)}
            className="flex-1 flex items-center gap-2 min-w-0 cursor-pointer text-left"
          >
            <div className="w-3 h-3 rounded-sm bg-orange/30 border border-orange/60 shrink-0" />
            <span className="text-xs font-medium truncate">{node.label}</span>
          </button>

          {depth > 0 && (
            <SplitButtons
              onSplit={(direction) => {
                const newName = "zone_" + Date.now().toString(36);
                const split: LayoutSplit = {
                  type: "split",
                  direction,
                  ratio: 50,
                  children: [
                    { ...node },
                    { type: "leaf", name: newName, label: "Nova zona" },
                  ],
                };
                onChange(split);
              }}
            />
          )}
          {depth === 0 && node.type === "leaf" && (
            <SplitButtons
              onSplit={(direction) => {
                const newName = "zone_" + Date.now().toString(36);
                const split: LayoutSplit = {
                  type: "split",
                  direction,
                  ratio: 50,
                  children: [
                    { ...node },
                    { type: "leaf", name: newName, label: "Nova zona" },
                  ],
                };
                onChange(split);
              }}
            />
          )}
        </div>

        {isSelected && (
          <div className="flex items-center gap-2 pt-1">
            <label className="text-[10px] text-muted-foreground shrink-0">Nome:</label>
            <Input
              value={node.label}
              onChange={(e) => onChange({ ...node, label: (e.target as HTMLInputElement).value })}
              className="h-7 text-xs"
              placeholder="Nome da zona"
            />
          </div>
        )}
      </div>
    );
  }

  // Split node
  return (
    <div className="rounded-lg border border-border/30 bg-card/20 p-2 space-y-2">
      <div className="flex items-center gap-2">
        <span className="text-[10px] text-muted-foreground uppercase tracking-wide font-semibold">
          {node.direction === "vertical" ? "Topo / Base" : "Esquerda / Direita"}
        </span>
        <button
          type="button"
          onClick={() => onChange({
            ...node,
            direction: node.direction === "vertical" ? "horizontal" : "vertical",
          } as LayoutSplit)}
          className="text-[10px] px-1.5 py-0.5 rounded border border-border/30 text-muted-foreground hover:text-foreground hover:border-orange/40 transition-colors cursor-pointer"
          title="Alternar direção"
        >
          <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 21 3 16.5m0 0L7.5 12M3 16.5h13.5m0-13.5L21 7.5m0 0L16.5 12M21 7.5H7.5" />
          </svg>
        </button>

        {depth > 0 && (
          <button
            type="button"
            onClick={() => onChange(node.children[0])}
            className="text-[10px] px-1.5 py-0.5 rounded text-muted-foreground/50 hover:text-red-400 transition-colors cursor-pointer ml-auto"
            title="Remover divisão"
          >
            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" />
            </svg>
          </button>
        )}
        {depth === 0 && (
          <button
            type="button"
            onClick={() => onChange(node.children[0])}
            className="text-[10px] px-1.5 py-0.5 rounded text-muted-foreground/50 hover:text-red-400 transition-colors cursor-pointer ml-auto"
            title="Remover divisão"
          >
            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" />
            </svg>
          </button>
        )}
      </div>

      {/* Ratio slider */}
      <div className="flex items-center gap-2">
        <span className="text-[10px] text-muted-foreground w-8 text-right">{node.ratio}%</span>
        <input
          type="range"
          min={10}
          max={90}
          value={node.ratio}
          onChange={(e) => onChange({
            ...node,
            ratio: parseInt(e.target.value),
          } as LayoutSplit)}
          className="flex-1 h-1.5 accent-orange cursor-pointer"
        />
        <span className="text-[10px] text-muted-foreground w-8">{100 - node.ratio}%</span>
      </div>

      {/* Children */}
      <div className="space-y-1.5 pl-2 border-l border-border/20">
        <TreeNodeEditor
          node={node.children[0]}
          path={path + ".0"}
          selectedPath={selectedPath}
          onSelect={onSelect}
          onChange={(child) => onChange({
            ...node,
            children: [child, node.children[1]],
          } as LayoutSplit)}
          depth={depth + 1}
        />
        <TreeNodeEditor
          node={node.children[1]}
          path={path + ".1"}
          selectedPath={selectedPath}
          onSelect={onSelect}
          onChange={(child) => onChange({
            ...node,
            children: [node.children[0], child],
          } as LayoutSplit)}
          depth={depth + 1}
        />
      </div>
    </div>
  );
}

function SplitButtons({ onSplit }: { onSplit: (direction: "vertical" | "horizontal") => void }) {
  return (
    <div className="flex gap-0.5 shrink-0">
      <Button
        type="button"
        variant="ghost"
        size="sm"
        onClick={() => onSplit("vertical")}
        className="h-6 w-6 p-0 text-muted-foreground/60 hover:text-orange hover:bg-orange/10 cursor-pointer"
        title="Dividir verticalmente (topo/base)"
      >
        <svg className="w-3.5 h-3.5" viewBox="0 0 16 16" fill="none" strokeWidth={1.5} stroke="currentColor">
          <rect x="1" y="1" width="14" height="14" rx="1.5" />
          <line x1="1" y1="8" x2="15" y2="8" />
        </svg>
      </Button>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        onClick={() => onSplit("horizontal")}
        className="h-6 w-6 p-0 text-muted-foreground/60 hover:text-orange hover:bg-orange/10 cursor-pointer"
        title="Dividir horizontalmente (esquerda/direita)"
      >
        <svg className="w-3.5 h-3.5" viewBox="0 0 16 16" fill="none" strokeWidth={1.5} stroke="currentColor">
          <rect x="1" y="1" width="14" height="14" rx="1.5" />
          <line x1="8" y1="1" x2="8" y2="15" />
        </svg>
      </Button>
    </div>
  );
}
