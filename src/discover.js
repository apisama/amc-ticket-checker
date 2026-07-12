import { readFile, writeFile, mkdir } from "node:fs/promises";
import { dirname } from "node:path";
import { MOVIE_SLUG, THEATRE_SLUG, DISCOVERY_WINDOW_DAYS, DISCOVERED_STATE_FILE } from "./config.js";
import { discoverShowtimeUrls } from "./discoverShowtimes.js";
import { notifyNewShowtime } from "./notifyTelegram.js";

async function loadKnown() {
  try {
    return JSON.parse(await readFile(DISCOVERED_STATE_FILE, "utf8"));
  } catch (err) {
    if (err.code === "ENOENT") return {};
    throw err;
  }
}

async function main() {
  const known = await loadKnown();
  const found = await discoverShowtimeUrls({
    movieSlug: MOVIE_SLUG,
    theatreSlug: THEATRE_SLUG,
    windowDays: DISCOVERY_WINDOW_DAYS,
  });

  const updated = { ...known };
  let newCount = 0;

  for (const [showtimeUrl, dateLabel] of found) {
    if (known[showtimeUrl]) continue;
    newCount++;
    updated[showtimeUrl] = dateLabel;
    console.log(`New showtime found: ${dateLabel} -> ${showtimeUrl}`);
    try {
      await notifyNewShowtime({ dateLabel, showtimeUrl });
    } catch (err) {
      console.error(`Failed to notify about ${showtimeUrl}:`, err.message);
    }
  }

  console.log(`Discovery complete: ${found.size} showtimes seen, ${newCount} new.`);

  await mkdir(dirname(DISCOVERED_STATE_FILE), { recursive: true });
  await writeFile(DISCOVERED_STATE_FILE, JSON.stringify(updated, null, 2) + "\n", "utf8");
}

main().catch((err) => {
  console.error("Discovery run failed:", err);
  process.exitCode = 1;
});
