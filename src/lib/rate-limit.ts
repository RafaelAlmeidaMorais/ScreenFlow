const rateMap = new Map<string, { count: number; resetAt: number }>();

// Clean up stale entries periodically
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of rateMap) {
    if (entry.resetAt < now) rateMap.delete(key);
  }
}, 60_000);

export function rateLimit(
  key: string,
  maxRequests: number,
  windowMs: number
): { ok: boolean; remaining: number } {
  const now = Date.now();
  const entry = rateMap.get(key);

  if (!entry || entry.resetAt < now) {
    rateMap.set(key, { count: 1, resetAt: now + windowMs });
    return { ok: true, remaining: maxRequests - 1 };
  }

  entry.count++;
  if (entry.count > maxRequests) {
    return { ok: false, remaining: 0 };
  }

  return { ok: true, remaining: maxRequests - entry.count };
}
