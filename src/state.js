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

// Groups worth alerting on: at least one seat in the group wasn't available
// last time we checked (or wasn't tracked yet). A group that's fully
// unchanged since the last check is not "new" even if still available.
export function filterNewGroups(previousShowtimeState, groups) {
  const prev = previousShowtimeState ?? {};
  return groups.filter((group) => group.seatIds.some((seatId) => !prev[seatId]));
}

export function toShowtimeState(currentGoodSeats) {
  return Object.fromEntries(currentGoodSeats.map((seat) => [seat.seatId, seat.available]));
}
