import { SHOWTIME_URLS, MIN_CONTIGUOUS_SEATS, CHECK_COOLDOWN_FILE } from "./config.js";
import { fetchShowtimeSeats } from "./fetchSeats.js";
import { classifyGoodSeats, findAvailableGoodGroups } from "./classifyGoodSeats.js";
import { loadState, saveState, filterNewGroups, toShowtimeState } from "./state.js";
import { notifyGoodSeats } from "./notifyTelegram.js";
import { RateLimitError, loadCooldownUntil, saveCooldownUntil } from "./rateLimitState.js";

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
  const cooldownUntil = await loadCooldownUntil(CHECK_COOLDOWN_FILE);
  if (cooldownUntil && cooldownUntil > new Date()) {
    console.log(`In cooldown until ${cooldownUntil.toISOString()} (AMC rate-limited us last run) - skipping.`);
    return;
  }

  const state = await loadState();
  let hadError = false;

  for (const showtimeUrl of SHOWTIME_URLS) {
    try {
      await checkOne(showtimeUrl, state);
    } catch (err) {
      hadError = true;
      console.error(`Failed checking ${showtimeUrl}:`, err.message);

      if (err instanceof RateLimitError) {
        const until = new Date(Date.now() + err.retryAfterSeconds * 1000);
        console.error(
          `Rate-limited - backing off until ${until.toISOString()} and skipping remaining showtimes this run.`
        );
        await saveCooldownUntil(CHECK_COOLDOWN_FILE, until);
        break;
      }
    }
  }

  await saveState(state);
  if (hadError) process.exitCode = 1;
}

main();
