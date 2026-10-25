import "server-only";

/**
 * Sign-in throttle. In memory, so it resets when the server restarts and is per server instance.
 * After MAX failures for the same key inside WINDOW, further attempts are refused until the window ends.
 */
const MAX = 5;
const WINDOW_MS = 15 * 60 * 1000;
const hits = new Map<string, { n: number; first: number }>();

export function isLocked(key: string, max = MAX, now = Date.now()): boolean {
  const h = hits.get(key);
  if (!h) return false;
  if (now - h.first > WINDOW_MS) {
    hits.delete(key);
    return false;
  }
  return h.n >= max;
}

export function recordFailure(key: string, now = Date.now()) {
  const h = hits.get(key);
  if (!h || now - h.first > WINDOW_MS) hits.set(key, { n: 1, first: now });
  else h.n++;
  if (hits.size > 5000) for (const [k, v] of hits) if (now - v.first > WINDOW_MS) hits.delete(k);
}

export function clearFailures(key: string) {
  hits.delete(key);
}

export const LOCK_MINUTES = WINDOW_MS / 60000;
