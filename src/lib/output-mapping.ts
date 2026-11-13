// Output mapping: places the player inside a rectangle of the signal the TV
// box sends out, the way the scaler of a video processor does. Useful when a
// LED panel shows only part of the signal or a TV crops the edges.
//
// Two modes:
// - "native": the screen is laid out directly at the size of the rectangle,
//   so a 4:1 panel gets a 4:1 screen and art made at the panel's resolution
//   is shown pixel for pixel. "fit" says how each media fills its zone.
// - "legacy": the first version. The screen is laid out at the size of the
//   whole signal and then shrunk into the rectangle; "fit" applies to the
//   whole picture. Kept so screens adjusted with it keep showing the same
//   thing until someone switches them.

export type OutputMode = "native" | "legacy";
export type OutputFit = "stretch" | "contain" | "cover";

export interface OutputMapping {
  enabled: boolean;
  mode: OutputMode;
  /** Resolution of the signal, in pixels. Positions below are in this scale. */
  refWidth: number;
  refHeight: number;
  /** Rectangle of the signal where the content goes. */
  x: number;
  y: number;
  width: number;
  height: number;
  /**
   * native: how medias fill their zone (stretch = squash to fill, contain =
   * keep proportions, cover = fill and crop). legacy: how the whole picture
   * fills the rectangle (stretch or contain).
   */
  fit: OutputFit;
  /** While this instant is in the future the player shows the test grid and follows changes live. */
  adjustUntil: string | null;
}

/** What the player page receives. */
export interface PlayerOutput {
  on: boolean;
  mode: OutputMode;
  rw: number;
  rh: number;
  x: number;
  y: number;
  w: number;
  h: number;
  fit: OutputFit;
  adjusting: boolean;
  /** Time left in adjust mode, so the grid goes away even if the player loses the connection. */
  adjustMs: number;
}

export const OUTPUT_SIGNALS = [
  { width: 1920, height: 1080, label: "1920 × 1080 (Full HD)" },
  { width: 1280, height: 720, label: "1280 × 720 (HD)" },
  { width: 3840, height: 2160, label: "3840 × 2160 (4K)" },
  { width: 1080, height: 1920, label: "1080 × 1920 (Full HD em pé)" },
  { width: 720, height: 1280, label: "720 × 1280 (HD em pé)" },
] as const;

export const ADJUST_MODE_MINUTES = 10;

export const DEFAULT_OUTPUT_MAPPING: OutputMapping = {
  enabled: false,
  mode: "native",
  refWidth: 1920,
  refHeight: 1080,
  x: 0,
  y: 0,
  width: 1920,
  height: 1080,
  fit: "contain",
  adjustUntil: null,
};

function int(value: unknown, fallback: number, min: number, max: number): number {
  const n = typeof value === "number" ? value : typeof value === "string" ? Number(value) : NaN;
  if (!Number.isFinite(n)) return fallback;
  return Math.min(max, Math.max(min, Math.round(n)));
}

/**
 * Reads a mapping from untrusted input (database JSON or a form), clamping
 * every number to a sane range. Returns null when there is nothing usable.
 */
export function parseOutputMapping(raw: unknown): OutputMapping | null {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;
  const r = raw as Record<string, unknown>;
  const d = DEFAULT_OUTPUT_MAPPING;

  const refWidth = int(r.refWidth, d.refWidth, 320, 7680);
  const refHeight = int(r.refHeight, d.refHeight, 240, 7680);
  const adjustUntil =
    typeof r.adjustUntil === "string" && !isNaN(new Date(r.adjustUntil).getTime())
      ? new Date(r.adjustUntil).toISOString()
      : null;

  // Mappings saved before modes existed have no "mode": they were made for
  // the legacy behavior and keep it.
  const mode: OutputMode = r.mode === "native" ? "native" : "legacy";
  const fit: OutputFit =
    r.fit === "contain" ? "contain" : r.fit === "cover" && mode === "native" ? "cover" : "stretch";

  return {
    enabled: r.enabled === true,
    mode,
    refWidth,
    refHeight,
    // The rectangle may hang off the signal a little, as on a processor.
    x: int(r.x, 0, -refWidth, refWidth),
    y: int(r.y, 0, -refHeight, refHeight),
    width: int(r.width, refWidth, 16, refWidth * 2),
    height: int(r.height, refHeight, 16, refHeight * 2),
    fit,
    adjustUntil,
  };
}

export function toPlayerOutput(raw: unknown, now: Date = new Date()): PlayerOutput {
  const m = parseOutputMapping(raw) ?? DEFAULT_OUTPUT_MAPPING;
  const adjustMs = m.adjustUntil ? new Date(m.adjustUntil).getTime() - now.getTime() : 0;
  return {
    on: m.enabled,
    mode: m.mode,
    rw: m.refWidth,
    rh: m.refHeight,
    x: m.x,
    y: m.y,
    w: m.width,
    h: m.height,
    fit: m.fit,
    adjusting: adjustMs > 0,
    adjustMs: Math.max(0, adjustMs),
  };
}

/** How the TV box's browser draws the player, as the player reports it. */
export interface PlayerDisplay {
  /** Page size in CSS pixels. */
  width: number;
  height: number;
  /** Device pixels per CSS pixel. */
  dpr: number;
  /** Pixels actually drawn: width × dpr, height × dpr. */
  pixelWidth: number;
  pixelHeight: number;
  /** When the device last reported (ISO). */
  at: string;
}

export function parsePlayerDisplay(raw: unknown, at?: Date): PlayerDisplay | null {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;
  const r = raw as Record<string, unknown>;
  const width = int(r.width ?? r.w, 0, 0, 20000);
  const height = int(r.height ?? r.h, 0, 0, 20000);
  const dprRaw = typeof r.dpr === "number" && Number.isFinite(r.dpr) ? r.dpr : 1;
  const dpr = Math.min(8, Math.max(0.25, Math.round(dprRaw * 1000) / 1000));
  const storedAt = typeof r.at === "string" && !isNaN(new Date(r.at).getTime()) ? r.at : null;
  const when = at ? at.toISOString() : storedAt;
  if (!width || !height || !when) return null;
  return {
    width,
    height,
    dpr,
    pixelWidth: Math.round(width * dpr),
    pixelHeight: Math.round(height * dpr),
    at: when,
  };
}
