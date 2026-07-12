import { chromium } from "playwright";

const USER_AGENT =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36";

// Loads one AMC showtime's seat map and returns a normalized snapshot.
// Uses the site's own accessible markup (input[name=seatId], aria-label,
// disabled) rather than any private API - see spike/ for how this was found.
export async function fetchShowtimeSeats(showtimeUrl) {
  const browser = await chromium.launch({ headless: true });
  try {
    const context = await browser.newContext({ userAgent: USER_AGENT });
    const page = await context.newPage();
    await page.goto(showtimeUrl, { waitUntil: "networkidle", timeout: 45000 });

    await page
      .locator("button", { hasText: /^(Accept|Close|Got it)/i })
      .first()
      .click({ timeout: 3000 })
      .catch(() => {});
    await page.waitForTimeout(500);

    const info = await page.evaluate(() => {
      const map = document.querySelector('[aria-label="Seat Selection Map"]');
      if (!map) return null;

      const movieTitle = document.querySelector("h3.headline")?.innerText?.trim() ?? null;
      const infoHeading = Array.from(document.querySelectorAll("h2")).find(
        (el) => el.innerText === "Showtime Information"
      );
      const infoSection = infoHeading?.closest("section, div") ?? null;
      // Drop the two heading lines ("Showtime Information", movie title);
      // what's left is theatre / date / time / format tags, one per line.
      const infoLine = infoSection
        ? infoSection.innerText.split("\n").slice(2).join(" | ")
        : null;

      const rowEls = Array.from(map.querySelectorAll('[role="row"]'));
      const rows = rowEls
        .map((rowEl) => {
          const firstInput = rowEl.querySelector("input");
          const rowLetter = firstInput?.getAttribute("name")?.match(/^[A-Za-z]+/)?.[0] ?? null;
          return { rowLetter, count: rowEl.querySelectorAll("input").length };
        })
        .filter((r) => r.rowLetter && r.count > 0);

      const seats = Array.from(map.querySelectorAll("input")).map((input) => {
        const name = input.getAttribute("name") ?? "";
        const rowLetter = name.match(/^[A-Za-z]+/)?.[0] ?? null;
        const seatNumber = Number(name.match(/\d+$/)?.[0] ?? NaN);
        return {
          seatId: name,
          row: rowLetter,
          seatNumber,
          available: !input.disabled,
          ariaLabel: input.getAttribute("aria-label") ?? "",
        };
      });

      return { movieTitle, infoLine, rows, seats };
    });

    if (!info) {
      const diagnosis = await page.evaluate(() => {
        const text = document.body.innerText.slice(0, 300);
        if (/rate limit|error 1015|checking your browser|attention required/i.test(text)) {
          return `blocked/rate-limited by AMC's site: ${text.split("\n")[0]}`;
        }
        return `unrecognized page (title: "${document.title}"): ${text.slice(0, 150)}`;
      });
      throw new Error(`Seat map container not found - ${diagnosis}`);
    }

    const rowOrder = info.rows.map((r) => r.rowLetter);
    return {
      showtimeUrl,
      fetchedAt: new Date().toISOString(),
      movieTitle: info.movieTitle,
      showtimeInfo: info.infoLine,
      rowOrder,
      seats: info.seats.filter((s) => s.row),
    };
  } finally {
    await browser.close();
  }
}
