// Throwaway spike: figure out how to get real seat-availability data out of
// an AMC seats page. Not part of the real system - just answers two questions:
//   1) Is there a clean JSON endpoint the page calls for seat data?
//   2) Does AMC's bot protection block a plain headless Chromium session?
import { chromium } from "playwright";

const SHOWTIME_URL = process.argv[2] ?? "https://www.amctheatres.com/showtimes/143822184/seats";

const looksLikeSeatData = (url, body) => {
  const urlHit = /seat|availab/i.test(url);
  const bodyHit = typeof body === "string" && /seat/i.test(body);
  return urlHit || bodyHit;
};

async function main() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    userAgent:
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
  });
  const page = await context.newPage();

  const candidates = [];
  page.on("response", async (response) => {
    const url = response.url();
    const status = response.status();
    const contentType = response.headers()["content-type"] ?? "";
    if (!contentType.includes("json")) return;
    let body = null;
    try {
      body = await response.text();
    } catch {
      // response body not available (e.g. redirected/streamed) - skip
    }
    if (looksLikeSeatData(url, body)) {
      candidates.push({ url, status, bodyPreview: body?.slice(0, 500) });
      console.log(`\n[CANDIDATE] ${status} ${url}`);
      console.log(body?.slice(0, 500));
    }
  });

  console.log(`Navigating to ${SHOWTIME_URL} ...`);
  const mainResponse = await page.goto(SHOWTIME_URL, { waitUntil: "networkidle", timeout: 45000 }).catch((e) => {
    console.log(`goto() failed/timed out: ${e.message}`);
    return null;
  });
  console.log(`Main response status: ${mainResponse?.status()}`);

  // Give any lazy XHRs a moment to fire even after networkidle.
  await page.waitForTimeout(3000);

  const title = await page.title();
  console.log(`\nPage title: ${title}`);

  const bodyText = await page.locator("body").innerText().catch(() => "(could not read body text)");
  console.log(`\nVisible body text (first 800 chars):\n${bodyText.slice(0, 800)}`);

  await page.screenshot({ path: "spike/screenshot.png", fullPage: true }).catch(() => {});
  console.log("\nSaved spike/screenshot.png");

  console.log(`\nTotal JSON candidates matching /seat|availab/: ${candidates.length}`);

  await browser.close();
}

main().catch((err) => {
  console.error("Spike failed:", err);
  process.exit(1);
});
