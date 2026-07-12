import { readFile, writeFile, mkdir } from "node:fs/promises";
import { dirname } from "node:path";
import { STATE_FILE } from "./config.js";

export async function loadState() {
  try {
    const raw = await readFile(STATE_FILE, "utf8");
    return JSON.parse(raw);
  } catch (err) {
    if (err.code === "ENOENT") return {};
    throw err;
  }
}

export async function saveState(state) {
  await mkdir(dirname(STATE_FILE), { recursive: true });
  await writeFile(STATE_FILE, JSON.stringify(state, null, 2) + "\n", "utf8");
}

// Good seats that are available now but weren't last time we checked (or
// weren't tracked at all yet) - i.e. worth alerting on.
export function diffNewlyAvailable(previousShowtimeState, currentGoodSeats) {
  const prev = previousShowtimeState ?? {};
  return currentGoodSeats.filter((seat) => seat.available && !prev[seat.seatId]);
}

export function toShowtimeState(currentGoodSeats) {
  return Object.fromEntries(currentGoodSeats.map((seat) => [seat.seatId, seat.available]));
}
