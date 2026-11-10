// Servers (Vercel, Neon) run in UTC and timestamps are stored in UTC. Anything
// a person reads or filters by day is converted to this zone instead.
export const APP_TIMEZONE = process.env.APP_TIMEZONE || "America/Sao_Paulo";

const DAY_RE = /^(\d{4})-(\d{2})-(\d{2})$/;

function tzOffsetMs(instant: number, timeZone: string): number {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    hourCycle: "h23",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).formatToParts(new Date(instant));
  const get = (type: string) => Number(parts.find((p) => p.type === type)!.value);
  const asUtc = Date.UTC(get("year"), get("month") - 1, get("day"), get("hour"), get("minute"), get("second"));
  return asUtc - Math.floor(instant / 1000) * 1000;
}

/** Instant at which the calendar day `YYYY-MM-DD` begins in the app timezone. */
export function zonedDayStart(day: string, timeZone = APP_TIMEZONE): Date | null {
  const m = DAY_RE.exec(day);
  if (!m) return null;
  const guess = Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
  // Second pass settles days where the offset changes (DST zones).
  const first = guess - tzOffsetMs(guess, timeZone);
  return new Date(guess - tzOffsetMs(first, timeZone));
}

/** Last millisecond of the calendar day `YYYY-MM-DD` in the app timezone. */
export function zonedDayEnd(day: string, timeZone = APP_TIMEZONE): Date | null {
  const m = DAY_RE.exec(day);
  if (!m) return null;
  const nextDay = new Date(Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3]) + 1))
    .toISOString()
    .slice(0, 10);
  const next = zonedDayStart(nextDay, timeZone);
  return next ? new Date(next.getTime() - 1) : null;
}

export function formatDateTime(d: Date, timeZone = APP_TIMEZONE): string {
  return d
    .toLocaleString("pt-BR", {
      timeZone,
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    })
    .replace(",", "");
}

export function formatDay(d: Date, timeZone = APP_TIMEZONE): string {
  return d.toLocaleDateString("pt-BR", {
    timeZone,
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

/** Short UTC offset of the app timezone right now, e.g. `GMT-3`. */
export function timezoneLabel(timeZone = APP_TIMEZONE): string {
  const part = new Intl.DateTimeFormat("en-US", { timeZone, timeZoneName: "shortOffset" })
    .formatToParts(new Date())
    .find((p) => p.type === "timeZoneName");
  return part?.value ?? timeZone;
}

/** `2026-11-10` -> `10/11/2026` */
export function formatDayString(day: string): string {
  const m = DAY_RE.exec(day);
  return m ? `${m[3]}/${m[2]}/${m[1]}` : day;
}
