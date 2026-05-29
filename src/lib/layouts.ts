/**
 * Layout templates for ScreenFlow screens.
 *
 * Each template defines a set of named "slots" with positions expressed in
 * percentages (0-100). The player renders each slot as an absolutely-positioned
 * container, and each slot runs its own independent slideshow of medias (and,
 * later, widgets).
 *
 * Positions use absolute percentages instead of CSS Grid to maximize browser
 * compatibility (LG WebOS uses old Chromium where CSS Grid may be spotty).
 */

export type LayoutTemplate =
  | "FULLSCREEN"
  | "TOP_BOTTOM_65_35"
  | "TOP_BOTTOM_70_30"
  | "TOP_BOTTOM_80_20"
  | "LEFT_RIGHT_70_30"
  | "LEFT_RIGHT_50_50"
  | "CUSTOM";

// ─── Nested layout tree ───────────────────────────────────────────────
// A layout is either a leaf (content slot) or a split that divides its
// region into two children along a direction with a configurable ratio.

export interface LayoutLeaf {
  type: "leaf";
  name: string;
  label: string;
}

export interface LayoutSplit {
  type: "split";
  direction: "horizontal" | "vertical";
  /** Percentage (1-99) allocated to the first child */
  ratio: number;
  children: [LayoutNode, LayoutNode];
}

export type LayoutNode = LayoutLeaf | LayoutSplit;

export interface CustomLayoutConfig {
  tree: LayoutNode;
}

/**
 * Flatten a layout tree into absolute-positioned SlotDefinitions by
 * recursively subdividing a bounding box.
 */
export function flattenLayoutTree(
  node: LayoutNode,
  bounds: { top: number; left: number; width: number; height: number } = { top: 0, left: 0, width: 100, height: 100 },
): SlotDefinition[] {
  if (node.type === "leaf") {
    return [{
      name: node.name,
      label: node.label,
      top: round2(bounds.top),
      left: round2(bounds.left),
      width: round2(bounds.width),
      height: round2(bounds.height),
    }];
  }

  const { direction, ratio, children } = node;
  let firstBounds: typeof bounds;
  let secondBounds: typeof bounds;

  if (direction === "vertical") {
    const firstH = bounds.height * (ratio / 100);
    firstBounds = { top: bounds.top, left: bounds.left, width: bounds.width, height: firstH };
    secondBounds = { top: bounds.top + firstH, left: bounds.left, width: bounds.width, height: bounds.height - firstH };
  } else {
    const firstW = bounds.width * (ratio / 100);
    firstBounds = { top: bounds.top, left: bounds.left, width: firstW, height: bounds.height };
    secondBounds = { top: bounds.top, left: bounds.left + firstW, width: bounds.width - firstW, height: bounds.height };
  }

  return [
    ...flattenLayoutTree(children[0], firstBounds),
    ...flattenLayoutTree(children[1], secondBounds),
  ];
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

/**
 * Validate a custom layout tree from user input. Returns a sanitised
 * tree or throws on invalid data.
 */
export function validateLayoutTree(input: unknown, depth = 0): LayoutNode {
  if (depth > 5) throw new Error("Layout muito profundo (máximo 5 níveis)");
  if (!input || typeof input !== "object") throw new Error("Nó de layout inválido");
  const obj = input as Record<string, unknown>;

  if (obj.type === "leaf") {
    const name = typeof obj.name === "string" ? obj.name.trim().slice(0, 32) : "";
    const label = typeof obj.label === "string" ? obj.label.trim().slice(0, 50) : "";
    if (!name) throw new Error("Slot sem nome");
    return { type: "leaf", name, label: label || name };
  }

  if (obj.type === "split") {
    const direction = obj.direction === "horizontal" || obj.direction === "vertical" ? obj.direction : "vertical";
    let ratio = typeof obj.ratio === "number" ? obj.ratio : 50;
    ratio = Math.max(10, Math.min(90, Math.round(ratio)));
    if (!Array.isArray(obj.children) || obj.children.length !== 2) {
      throw new Error("Split precisa de exatamente 2 filhos");
    }
    return {
      type: "split",
      direction,
      ratio,
      children: [
        validateLayoutTree(obj.children[0], depth + 1),
        validateLayoutTree(obj.children[1], depth + 1),
      ],
    };
  }

  throw new Error("Tipo de nó desconhecido: " + String(obj.type));
}

/**
 * Collect all leaf names from a layout tree.
 */
export function getTreeSlotNames(node: LayoutNode): string[] {
  if (node.type === "leaf") return [node.name];
  return [...getTreeSlotNames(node.children[0]), ...getTreeSlotNames(node.children[1])];
}

/**
 * Convert a preset layout definition into a layout tree for editing.
 */
export function presetToTree(template: LayoutTemplate): LayoutNode {
  if (template === "CUSTOM") {
    return { type: "leaf", name: "main", label: "Principal" };
  }
  const def = LAYOUT_DEFINITIONS[template] ?? LAYOUT_DEFINITIONS.FULLSCREEN;
  if (def.slots.length === 1) {
    return { type: "leaf", name: def.slots[0].name, label: def.slots[0].label };
  }
  const s0 = def.slots[0];
  const s1 = def.slots[1];
  const isVertical = s0.left === s1.left;
  const ratio = isVertical ? s0.height : s0.width;
  return {
    type: "split",
    direction: isVertical ? "vertical" : "horizontal",
    ratio,
    children: [
      { type: "leaf", name: s0.name, label: s0.label },
      { type: "leaf", name: s1.name, label: s1.label },
    ],
  };
}

export type Orientation = "LANDSCAPE" | "PORTRAIT";

export type AspectRatio = "AUTO" | "16:9" | "9:16" | "4:3" | "1:1";

export interface SlotDefinition {
  /** Internal slot identifier (used as Media.slot value) */
  name: string;
  /** Human-readable label (Portuguese) */
  label: string;
  /** Position in % relative to the screen viewport */
  top: number;
  left: number;
  width: number;
  height: number;
}

export interface LayoutDefinition {
  template: LayoutTemplate;
  label: string;
  description: string;
  slots: SlotDefinition[];
}

export const LAYOUT_DEFINITIONS: Record<LayoutTemplate, LayoutDefinition> = {
  FULLSCREEN: {
    template: "FULLSCREEN",
    label: "Tela cheia",
    description: "Uma única área ocupando toda a tela",
    slots: [
      { name: "main", label: "Principal", top: 0, left: 0, width: 100, height: 100 },
    ],
  },
  CUSTOM: {
    template: "CUSTOM",
    label: "Personalizado",
    description: "Layout livre com zonas aninhadas e proporções customizáveis",
    slots: [
      { name: "main", label: "Principal", top: 0, left: 0, width: 100, height: 100 },
    ],
  },
  TOP_BOTTOM_65_35: {
    template: "TOP_BOTTOM_65_35",
    label: "Topo + Rodapé (65/35)",
    description: "Área principal no topo ocupando 65% e rodapé com 35%",
    slots: [
      { name: "main", label: "Principal (topo)", top: 0, left: 0, width: 100, height: 65 },
      { name: "bottom", label: "Rodapé", top: 65, left: 0, width: 100, height: 35 },
    ],
  },
  TOP_BOTTOM_70_30: {
    template: "TOP_BOTTOM_70_30",
    label: "Topo + Rodapé (70/30)",
    description: "Área principal no topo ocupando 70% e rodapé com 30%",
    slots: [
      { name: "main", label: "Principal (topo)", top: 0, left: 0, width: 100, height: 70 },
      { name: "bottom", label: "Rodapé", top: 70, left: 0, width: 100, height: 30 },
    ],
  },
  TOP_BOTTOM_80_20: {
    template: "TOP_BOTTOM_80_20",
    label: "Topo + Rodapé (80/20)",
    description: "Área principal ocupando 80% e faixa inferior com 20%",
    slots: [
      { name: "main", label: "Principal (topo)", top: 0, left: 0, width: 100, height: 80 },
      { name: "bottom", label: "Rodapé", top: 80, left: 0, width: 100, height: 20 },
    ],
  },
  LEFT_RIGHT_70_30: {
    template: "LEFT_RIGHT_70_30",
    label: "Esquerda + Direita (70/30)",
    description: "Área principal à esquerda com 70% e barra lateral com 30%",
    slots: [
      { name: "main", label: "Principal (esquerda)", top: 0, left: 0, width: 70, height: 100 },
      { name: "sidebar", label: "Barra lateral", top: 0, left: 70, width: 30, height: 100 },
    ],
  },
  LEFT_RIGHT_50_50: {
    template: "LEFT_RIGHT_50_50",
    label: "Esquerda + Direita (50/50)",
    description: "Duas áreas iguais lado a lado",
    slots: [
      { name: "main", label: "Esquerda", top: 0, left: 0, width: 50, height: 100 },
      { name: "right", label: "Direita", top: 0, left: 50, width: 50, height: 100 },
    ],
  },
};

export const LAYOUT_TEMPLATES = Object.keys(LAYOUT_DEFINITIONS) as LayoutTemplate[];

export const ORIENTATIONS: { value: Orientation; label: string }[] = [
  { value: "LANDSCAPE", label: "Paisagem" },
  { value: "PORTRAIT", label: "Retrato" },
];

export const ASPECT_RATIOS: { value: AspectRatio; label: string }[] = [
  { value: "AUTO", label: "Automática (preenche a tela)" },
  { value: "16:9", label: "16:9 (TV widescreen)" },
  { value: "9:16", label: "9:16 (vertical)" },
  { value: "4:3", label: "4:3 (tradicional)" },
  { value: "1:1", label: "1:1 (quadrada)" },
];

/**
 * Safely resolve a layout definition, falling back to FULLSCREEN for
 * unknown templates so the player never crashes.
 *
 * When `template` is "CUSTOM", pass the stored `customLayout` JSON to
 * produce the correct slots. Without it the CUSTOM entry defaults to a
 * single fullscreen slot.
 */
export function getLayoutDefinition(
  template: string | null | undefined,
  customLayout?: unknown,
): LayoutDefinition {
  if (!template) return LAYOUT_DEFINITIONS.FULLSCREEN;

  if (template === "CUSTOM" && customLayout) {
    try {
      const cfg = customLayout as { tree?: unknown };
      if (cfg.tree) {
        const tree = validateLayoutTree(cfg.tree);
        const slots = flattenLayoutTree(tree);
        if (slots.length > 0) {
          return {
            template: "CUSTOM",
            label: "Personalizado",
            description: "Layout livre com zonas aninhadas",
            slots,
          };
        }
      }
    } catch {
      // Fall through to default CUSTOM definition
    }
  }

  const def = LAYOUT_DEFINITIONS[template as LayoutTemplate];
  return def ?? LAYOUT_DEFINITIONS.FULLSCREEN;
}

/**
 * Returns the list of slot names that exist in a given template.
 */
export function getSlotNames(template: string | null | undefined, customLayout?: unknown): string[] {
  return getLayoutDefinition(template, customLayout).slots.map((s) => s.name);
}

/**
 * Checks whether a given slot name is valid for a given template.
 */
export function isValidSlot(template: string | null | undefined, slot: string, customLayout?: unknown): boolean {
  return getSlotNames(template, customLayout).includes(slot);
}

/**
 * Returns the default slot name for a template (always the first slot,
 * which is typically "main").
 */
export function getDefaultSlot(template: string | null | undefined, customLayout?: unknown): string {
  return getLayoutDefinition(template, customLayout).slots[0]?.name ?? "main";
}

/**
 * Compute the container CSS for the given orientation and aspect ratio.
 * This is used by the player to letterbox content when the physical
 * display doesn't match the configured aspect ratio.
 *
 * Returns inline style strings the server-rendered player can drop into
 * the HTML directly.
 */
export function getContainerStyle(
  orientation: Orientation,
  aspectRatio: AspectRatio,
): { outer: string; inner: string } {
  // AUTO = fill the whole viewport, no letterbox
  if (aspectRatio === "AUTO") {
    return {
      outer: "position:fixed;top:0;left:0;width:100%;height:100%;background:#000;overflow:hidden;",
      inner: "position:absolute;top:0;left:0;width:100%;height:100%;",
    };
  }

  // Parse ratio
  const [w, h] = aspectRatio.split(":").map(Number);
  const ratio = w / h;

  // Use CSS to center an inner box that maintains the aspect ratio inside
  // the outer fullscreen container. The inner box uses min() to shrink
  // when the viewport is smaller than the desired ratio on either axis.
  const outer =
    "position:fixed;top:0;left:0;width:100%;height:100%;background:#000;overflow:hidden;display:flex;align-items:center;justify-content:center;";
  const inner =
    `position:relative;width:min(100vw,calc(100vh * ${ratio}));height:min(100vh,calc(100vw / ${ratio}));`;

  // Orientation override: if user forces PORTRAIT but the device is
  // rendering LANDSCAPE (or vice-versa), we can apply a CSS rotate hint
  // via a data-attribute. For now, we keep orientation as metadata only;
  // real rotation requires device-level config.
  void orientation;

  return { outer, inner };
}
