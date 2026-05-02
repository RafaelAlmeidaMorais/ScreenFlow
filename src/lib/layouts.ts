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
  | "LEFT_RIGHT_50_50";

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
 */
export function getLayoutDefinition(template: string | null | undefined): LayoutDefinition {
  if (!template) return LAYOUT_DEFINITIONS.FULLSCREEN;
  const def = LAYOUT_DEFINITIONS[template as LayoutTemplate];
  return def ?? LAYOUT_DEFINITIONS.FULLSCREEN;
}

/**
 * Returns the list of slot names that exist in a given template.
 * Useful when validating if a Media.slot value is still valid after
 * the user changes the screen's layoutTemplate.
 */
export function getSlotNames(template: string | null | undefined): string[] {
  return getLayoutDefinition(template).slots.map((s) => s.name);
}

/**
 * Checks whether a given slot name is valid for a given template.
 */
export function isValidSlot(template: string | null | undefined, slot: string): boolean {
  return getSlotNames(template).includes(slot);
}

/**
 * Returns the default slot name for a template (always the first slot,
 * which is typically "main").
 */
export function getDefaultSlot(template: string | null | undefined): string {
  return getLayoutDefinition(template).slots[0]?.name ?? "main";
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
