import { readFile, writeFile, mkdir } from "node:fs/promises";
import { dirname } from "node:path";

export class RateLimitError extends Error {
  constructor(message, retryAfterSeconds) {
    super(message);
    this.name = "RateLimitError";
    this.retryAfterSeconds = retryAfterSeconds;
  }
}

// Parses a Retry-After header value, which per spec is either an integer
// number of seconds or an HTTP-date. Falls back to `fallbackSeconds` if the
// header is absent or unparseable - AMC's block page isn't guaranteed to
// send one at all.
export function parseRetryAfterSeconds(headerValue, fallbackSeconds) {
  if (!headerValue) return fallbackSeconds;
  if (/^\d+$/.test(headerValue.trim())) return Number(headerValue.trim());
  const asDate = new Date(headerValue);
  if (!Number.isNaN(asDate.getTime())) {
    const seconds = Math.ceil((asDate.getTime() - Date.now()) / 1000);
    if (seconds > 0) return seconds;
  }
  return fallbackSeconds;
}

export async function loadCooldownUntil(file) {
  try {
    const raw = await readFile(file, "utf8");
    const { until } = JSON.parse(raw);
    return until ? new Date(until) : null;
  } catch (err) {
    if (err.code === "ENOENT") return null;
    throw err;
  }
}

export async function saveCooldownUntil(file, untilDate) {
  await mkdir(dirname(file), { recursive: true });
  await writeFile(file, JSON.stringify({ until: untilDate.toISOString() }, null, 2) + "\n", "utf8");
}
