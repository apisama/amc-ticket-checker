import { SHOWTIME_URLS } from "./config.js";
import { fetchShowtimeSeats } from "./fetchSeats.js";
import { classifyGoodSeats } from "./classifyGoodSeats.js";
import { loadState, saveState, diffNewlyAvailable, toShowtimeState } from "./state.js";
import { notifyGoodSeats } from "./notifyTelegram.js";

async function checkOne(showtimeUrl, state) {
  const snapshot = await fetchShowtimeSeats(showtimeUrl);
  const goodSeats = classifyGoodSeats(snapshot.seats, snapshot.rowOrder);
  const newlyAvailable = diffNewlyAvailable(state[showtimeUrl], goodSeats);

  console.log(
    `[${snapshot.movieTitle ?? showtimeUrl}] ${goodSeats.filter((s) => s.available).length}/${goodSeats.length} good seats open, ${newlyAvailable.length} new`
  );

  if (newlyAvailable.length > 0) {
    await notifyGoodSeats({
      movieTitle: snapshot.movieTitle,
      showtimeInfo: snapshot.showtimeInfo,
      showtimeUrl,
      seats: newlyAvailable,
    });
    console.log(`Notified about: ${newlyAvailable.map((s) => s.seatId).join(", ")}`);
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
