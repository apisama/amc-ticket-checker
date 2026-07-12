import { RateLimitError, parseRetryAfterSeconds } from "./rateLimitState.js";
import { DEFAULT_RATE_LIMIT_BACKOFF_SECONDS } from "./config.js";

const USER_AGENT =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36";

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

function toDateParam(date) {
  return date.toISOString().slice(0, 10);
}

function toDateLabel(date) {
  return date.toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

// The showtimes listing page is server-rendered, so a plain fetch is enough -
// no headless browser needed here (unlike the seat map itself).
async function fetchShowtimeIdsForDate({ movieSlug, theatreSlug, date }) {
  const url = `https://www.amctheatres.com/movies/${movieSlug}/showtimes?theatre=${theatreSlug}&date=${toDateParam(date)}`;
  const res = await fetch(url, { headers: { "user-agent": USER_AGENT } });

  if (res.status === 429 || res.status === 403) {
    const retryAfterSeconds = parseRetryAfterSeconds(
      res.headers.get("retry-after"),
      DEFAULT_RATE_LIMIT_BACKOFF_SECONDS
    );
    throw new RateLimitError(`${url} -> HTTP ${res.status} (rate-limited)`, retryAfterSeconds);
  }
  if (!res.ok) throw new Error(`${url} -> HTTP ${res.status}`);

  const html = await res.text();
  if (/error 1015|checking your browser|attention required/i.test(html.slice(0, 2000))) {
    throw new RateLimitError(`${url} -> blocked (Cloudflare challenge page)`, DEFAULT_RATE_LIMIT_BACKOFF_SECONDS);
  }
  const ids = new Set();
  for (const match of html.matchAll(/\/showtimes\/(\d+)/g)) {
    ids.add(match[1]);
  }
  return [...ids];
}

// Scans the next `windowDays` days for showtime IDs at the given theatre for
// the given movie slug. One request per day, with a small delay between them
// to be a polite, low-volume caller.
export async function discoverShowtimeUrls({ movieSlug, theatreSlug, windowDays }) {
  const found = new Map(); // showtimeUrl -> dateLabel
  const today = new Date();

  for (let offset = 0; offset < windowDays; offset++) {
    const date = new Date(today);
    date.setDate(date.getDate() + offset);

    try {
      const ids = await fetchShowtimeIdsForDate({ movieSlug, theatreSlug, date });
      for (const id of ids) {
        const showtimeUrl = `https://www.amctheatres.com/showtimes/${id}/seats`;
        if (!found.has(showtimeUrl)) found.set(showtimeUrl, toDateLabel(date));
      }
    } catch (err) {
      if (err instanceof RateLimitError) {
        // Stop hammering AMC once we're blocked - let the caller persist the
        // cooldown and retry the whole scan later instead of ploughing
        // through the remaining days in the window right now.
        throw err;
      }
      console.error(`Discovery failed for ${toDateParam(date)}:`, err.message);
    }

    await sleep(400);
  }

  return found;
}
