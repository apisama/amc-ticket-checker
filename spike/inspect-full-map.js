import { chromium } from "playwright";

const SHOWTIME_URL = process.argv[2] ?? "https://www.amctheatres.com/showtimes/143822184/seats";

async function main() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  await page.goto(SHOWTIME_URL, { waitUntil: "networkidle", timeout: 45000 });
  await page.waitForTimeout(2000);
  await page
    .locator("button", { hasText: /^(Accept|Close|Got it)/i })
    .first()
    .click({ timeout: 3000 })
    .catch(() => {});
  await page.waitForTimeout(1000);

  const result = await page.evaluate(() => {
    const map = document.querySelector('[aria-label="Seat Selection Map"]');
    const rowEls = Array.from(map.querySelectorAll('[role="row"]'));

    const rows = rowEls.map((rowEl, idx) => {
      const inputs = Array.from(rowEl.querySelectorAll("input"));
      const firstInput = inputs[0];
      const rect = firstInput ? firstInput.getBoundingClientRect() : null;
      const rowLetter = firstInput?.getAttribute("name")?.match(/^[A-Za-z]+/)?.[0] ?? null;
      return {
        domIndex: idx,
        rowLetter,
        seatCount: inputs.length,
        topY: rect ? Math.round(rect.top) : null,
      };
    });

    const allInputs = Array.from(map.querySelectorAll("input"));
    const statusCounts = {};
    const sampleByStatus = {};
    for (const input of allInputs) {
      const label = input.getAttribute("aria-label") || "";
      const status = label.split(" ")[0] || "unknown";
      statusCounts[status] = (statusCounts[status] || 0) + 1;
      if (!sampleByStatus[status]) sampleByStatus[status] = label;
    }

    return {
      totalSeats: allInputs.length,
      rows,
      statusCounts,
      sampleByStatus,
    };
  });
  console.log(JSON.stringify(result, null, 2));

  await browser.close();
}

main().catch((err) => {
  console.error("Spike failed:", err);
  process.exit(1);
});
