// Showtimes to watch. Each is a full AMC showtime "seats" URL - grab it from
// the theatre's showtimes page (the /showtimes/{id} link) and append /seats.
// Override at runtime with AMC_SHOWTIME_URLS="url1,url2" (comma-separated).
// AMC only opens booking a couple weeks out, so this list needs topping up
// periodically as new Odyssey 70mm dates go on sale at Lincoln Square 13.
const DEFAULT_SHOWTIME_URLS = [
  "https://www.amctheatres.com/showtimes/134717191/seats", // Thu 7/16 2:00 PM
  "https://www.amctheatres.com/showtimes/143822184/seats", // Thu 7/16 10:00 PM
  "https://www.amctheatres.com/showtimes/134717192/seats", // Fri 7/17 7:00 PM
  "https://www.amctheatres.com/showtimes/134717193/seats", // Sat 7/18 7:00 PM
  "https://www.amctheatres.com/showtimes/134717194/seats", // Sun 7/19 7:00 PM
];

export const SHOWTIME_URLS = process.env.AMC_SHOWTIME_URLS
  ? process.env.AMC_SHOWTIME_URLS.split(",").map((s) => s.trim()).filter(Boolean)
  : DEFAULT_SHOWTIME_URLS;

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
