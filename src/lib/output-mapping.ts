// Output mapping: fits the whole player into a rectangle of the signal the TV
// box sends out, the way the scaler of a video processor does. Useful when a
// LED panel shows only part of the signal or a TV crops the edges.

export type OutputFit = "stretch" | "contain";

export interface OutputMapping {
  enabled: boolean;
  /** Resolution of the signal, in pixels. Positions below are in this scale. */
  refWidth: number;
  refHeight: number;
  /** Rectangle of the signal where the content goes. */
  x: number;
  y: number;
  width: number;
  height: number;
  /** "stretch" squashes the picture to fill the rectangle; "contain" keeps its proportions. */
  fit: OutputFit;
  /** While this instant is in the future the player shows the test grid and follows changes live. */
  adjustUntil: string | null;
}

/** What the player page receives. */
export interface PlayerOutput {
  on: boolean;
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
  refWidth: 1920,
  refHeight: 1080,
  x: 0,
  y: 0,
  width: 1920,
  height: 1080,
  fit: "stretch",
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

  return {
    enabled: r.enabled === true,
    refWidth,
    refHeight,
    // The rectangle may hang off the signal a little, as on a processor.
    x: int(r.x, 0, -refWidth, refWidth),
    y: int(r.y, 0, -refHeight, refHeight),
    width: int(r.width, refWidth, 16, refWidth * 2),
    height: int(r.height, refHeight, 16, refHeight * 2),
    fit: r.fit === "contain" ? "contain" : "stretch",
    adjustUntil,
  };
}

export function toPlayerOutput(raw: unknown, now: Date = new Date()): PlayerOutput {
  const m = parseOutputMapping(raw) ?? DEFAULT_OUTPUT_MAPPING;
  const adjustMs = m.adjustUntil ? new Date(m.adjustUntil).getTime() - now.getTime() : 0;
  return {
    on: m.enabled,
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
