import { GOOD_SEAT_ZONE, EXCLUDE_LABEL_PATTERN } from "./config.js";

// Per-row seat-number span (min/max), computed from ALL seats in the row
// (available or not) so the "center" of a row doesn't shift as seats sell.
function rowSpans(seats) {
  const spans = new Map();
  for (const seat of seats) {
    const span = spans.get(seat.row) ?? { min: Infinity, max: -Infinity };
    span.min = Math.min(span.min, seat.seatNumber);
    span.max = Math.max(span.max, seat.seatNumber);
    spans.set(seat.row, span);
  }
  return spans;
}

// Pure geometry check: is this seat *position* in the good zone, regardless
// of whether it's currently available? Lets us track the zone's state over
// time even as which specific seats are open changes.
export function isGoodSeatPosition(seat, { rowOrder, spans }) {
  const rowIndex = rowOrder.indexOf(seat.row);
  if (rowIndex === -1) return false;
  const totalRows = rowOrder.length;
  const rowFraction = totalRows <= 1 ? 0 : rowIndex / (totalRows - 1);
  if (rowFraction < GOOD_SEAT_ZONE.rowMinFraction || rowFraction > GOOD_SEAT_ZONE.rowMaxFraction) {
    return false;
  }

  const span = spans.get(seat.row);
  if (!span || span.max === span.min) return false;
  const width = span.max - span.min;
  const margin = ((1 - GOOD_SEAT_ZONE.columnCenterFraction) / 2) * width;
  const lo = span.min + margin;
  const hi = span.max - margin;
  if (seat.seatNumber < lo || seat.seatNumber > hi) return false;

  if (EXCLUDE_LABEL_PATTERN.test(seat.ariaLabel)) return false;

  return true;
}

// Returns every seat in the "good" zone (open or not), tagged with its
// current availability - this is what gets diffed against prior state.
export function classifyGoodSeats(seats, rowOrder) {
  const spans = rowSpans(seats);
  return seats
    .filter((seat) => isGoodSeatPosition(seat, { rowOrder, spans }))
    .map((seat) => ({ seatId: seat.seatId, row: seat.row, available: seat.available }));
}

// Finds runs of physically adjacent, currently-available good-zone seats
// (consecutive seat numbers within a row, so a gap for an aisle correctly
// breaks a run) of at least `minContiguous` seats - e.g. so a single stray
// open seat doesn't count if you need 2+ seats together.
export function findAvailableGoodGroups(seats, rowOrder, minContiguous) {
  const spans = rowSpans(seats);
  const byRow = new Map();
  for (const seat of seats) {
    if (!byRow.has(seat.row)) byRow.set(seat.row, []);
    byRow.get(seat.row).push(seat);
  }

  const groups = [];
  for (const [row, rowSeats] of byRow) {
    const sorted = [...rowSeats].sort((a, b) => a.seatNumber - b.seatNumber);
    let run = [];
    const flushRun = () => {
      if (run.length >= minContiguous) {
        groups.push({ row, seatIds: run.map((s) => s.seatId) });
      }
      run = [];
    };

    for (const seat of sorted) {
      const usable = seat.available && isGoodSeatPosition(seat, { rowOrder, spans });
      const isAdjacent = run.length > 0 && seat.seatNumber === run[run.length - 1].seatNumber + 1;
      if (usable && isAdjacent) {
        run.push(seat);
      } else {
        flushRun();
        run = usable ? [seat] : [];
      }
    }
    flushRun();
  }
  return groups;
}
