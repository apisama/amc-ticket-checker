import { SHOWTIME_URLS, MIN_CONTIGUOUS_SEATS } from "./config.js";
import { fetchShowtimeSeats } from "./fetchSeats.js";
import { classifyGoodSeats, findAvailableGoodGroups } from "./classifyGoodSeats.js";
import { loadState, saveState, filterNewGroups, toShowtimeState } from "./state.js";
import { notifyGoodSeats } from "./notifyTelegram.js";

async function checkOne(showtimeUrl, state) {
  const snapshot = await fetchShowtimeSeats(showtimeUrl);
  const goodSeats = classifyGoodSeats(snapshot.seats, snapshot.rowOrder);
  const groups = findAvailableGoodGroups(snapshot.seats, snapshot.rowOrder, MIN_CONTIGUOUS_SEATS);
  const newGroups = filterNewGroups(state[showtimeUrl], groups);

  console.log(
    `[${snapshot.movieTitle ?? showtimeUrl}] ${goodSeats.filter((s) => s.available).length}/${goodSeats.length} good seats open, ${groups.length} group(s) of ${MIN_CONTIGUOUS_SEATS}+ together, ${newGroups.length} new`
  );

  if (newGroups.length > 0) {
    await notifyGoodSeats({
      movieTitle: snapshot.movieTitle,
      showtimeInfo: snapshot.showtimeInfo,
      showtimeUrl,
      groups: newGroups,
    });
    console.log(`Notified about: ${newGroups.map((g) => g.seatIds.join("+")).join(", ")}`);
  }

  state[showtimeUrl] = toShowtimeState(goodSeats);
}

async function main() {
  const state = await loadState();
  let hadError = false;

  for (const showtimeUrl of SHOWTIME_URLS) {
    try {
      await checkOne(showtimeUrl, state);
    } catch (err) {
      hadError = true;
      console.error(`Failed checking ${showtimeUrl}:`, err.message);
    }
  }

  await saveState(state);
  if (hadError) process.exitCode = 1;
}

main();
