// Offline mode is opt-in per screen. With it on, the player keeps a copy of
// its page and media on the TV box and reports how that is going in every
// heartbeat, so the dashboard can show which devices need more storage.

export interface OfflineStatus {
  /** False when the TV box's browser has no service worker / Cache storage. */
  supported: boolean;
  /** Medias the screen is showing, and how many of them are saved on the device. */
  total: number;
  cached: number;
  /** Downloads that failed for a reason other than space (retried later). */
  failed: number;
  /** The device refused to store more: out of space. */
  full: boolean;
  /** Bytes this player uses and may use on the device, when the browser tells. */
  usage: number | null;
  quota: number | null;
  /** When the device last reported (ISO). */
  at: string;
}

function count(value: unknown): number {
  return typeof value === "number" && Number.isFinite(value) && value >= 0
    ? Math.min(Math.round(value), 100_000)
    : 0;
}

function bytes(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) && value >= 0 ? Math.round(value) : null;
}

/** Reads the status a player sent (or one stored in the database). */
export function parseOfflineStatus(raw: unknown, at?: Date): OfflineStatus | null {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;
  const r = raw as Record<string, unknown>;
  const storedAt = typeof r.at === "string" && !isNaN(new Date(r.at).getTime()) ? r.at : null;
  const when = at ? at.toISOString() : storedAt;
  if (!when) return null;
  return {
    supported: r.supported === true,
    total: count(r.total),
    cached: count(r.cached),
    failed: count(r.failed),
    full: r.full === true,
    usage: bytes(r.usage),
    quota: bytes(r.quota),
    at: when,
  };
}

/** `190840000` -> `182 MB` */
export function formatBytes(n: number): string {
  if (n >= 1024 ** 3) return `${(n / 1024 ** 3).toLocaleString("pt-BR", { maximumFractionDigits: 1 })} GB`;
  if (n >= 1024 ** 2) return `${Math.round(n / 1024 ** 2).toLocaleString("pt-BR")} MB`;
  return `${Math.max(1, Math.round(n / 1024)).toLocaleString("pt-BR")} KB`;
}
