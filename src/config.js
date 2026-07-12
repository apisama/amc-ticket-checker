import { readFileSync } from "node:fs";

// Manually-pinned showtimes, kept as a fallback/override. Override at runtime
// with AMC_SHOWTIME_URLS="url1,url2" (comma-separated). In normal operation
// this list is combined with whatever discover-showtimes.js has found (see
// DISCOVERED_STATE_FILE below), so it rarely needs hand-editing anymore.
const DEFAULT_SHOWTIME_URLS = [
  "https://www.amctheatres.com/showtimes/134717191/seats", // Thu 7/16 2:00 PM
  "https://www.amctheatres.com/showtimes/143822184/seats", // Thu 7/16 10:00 PM
  "https://www.amctheatres.com/showtimes/134717192/seats", // Fri 7/17 7:00 PM
  "https://www.amctheatres.com/showtimes/134717193/seats", // Sat 7/18 7:00 PM
  "https://www.amctheatres.com/showtimes/134717194/seats", // Sun 7/19 7:00 PM
];

const MANUAL_SHOWTIME_URLS = process.env.AMC_SHOWTIME_URLS
  ? process.env.AMC_SHOWTIME_URLS.split(",").map((s) => s.trim()).filter(Boolean)
  : DEFAULT_SHOWTIME_URLS;

// Where to look for new showtimes, and how far ahead to look. AMC posts new
// dates roughly weekly, so 14 days comfortably covers each posting cycle.
//
// Known limitation: this dedicated "IMAX 70mm Event" listing normally has
// exactly one showtime per day and discovery relies on that. AMC's opening
// day (7/16) added a rare second same-day 70mm showtime that only appears
// under the general "all formats" movie listing, not this one - that page
// mixes in every format (digital, standard IMAX, Dolby, etc.) as a deeply-
// escaped internal payload with no stable public structure to filter on, so
// it isn't worth scraping just for this edge case. That specific showtime is
// already covered via the manual DEFAULT_SHOWTIME_URLS list above; if AMC
// does it again for some other date, discovery would only catch the first
// showtime that day, not a second one.
export const MOVIE_SLUG = "the-odyssey-80679"; // the IMAX 70mm Event listing specifically
export const THEATRE_SLUG = "amc-lincoln-square-13";
export const DISCOVERY_WINDOW_DAYS = 14;

export const DISCOVERED_STATE_FILE = new URL("../data/discovered-showtimes.json", import.meta.url).pathname;

function loadDiscoveredShowtimeUrls() {
  try {
    const raw = readFileSync(DISCOVERED_STATE_FILE, "utf8");
    return Object.keys(JSON.parse(raw));
  } catch (err) {
    if (err.code === "ENOENT") return [];
    throw err;
  }
}

export const SHOWTIME_URLS = [...new Set([...MANUAL_SHOWTIME_URLS, ...loadDiscoveredShowtimeUrls()])];

// "Good seat" zone, expressed as fractions of the auditorium so it adapts to
// any room size. Row 0 is closest to the screen (front), row 1 is the back.
export const GOOD_SEAT_ZONE = {
  // Skip the front ~35% of rows - too close to a 70mm IMAX screen.
  rowMinFraction: 0.35,
  // Skip only the very last row (usually against the back wall).
  rowMaxFraction: 0.95,
  // Middle 50% of each row's seat-number span (aisles/gaps make seat numbers
  // an imperfect proxy for physical position, but a good enough one).
  columnCenterFraction: 0.5,
};

// Never recommend accessible seating as a "good seat" pick - it's reserved
// for guests who need it, regardless of how central it is.
export const EXCLUDE_LABEL_PATTERN = /wheelchair/i;

export const STATE_FILE = new URL("../data/last-seen.json", import.meta.url).pathname;

export const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
export const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID;
