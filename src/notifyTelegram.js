import { TELEGRAM_BOT_TOKEN, TELEGRAM_CHAT_ID } from "./config.js";

export async function notifyTelegram({ movieTitle, showtimeInfo, showtimeUrl, seats }) {
  if (!TELEGRAM_BOT_TOKEN || !TELEGRAM_CHAT_ID) {
    throw new Error("TELEGRAM_BOT_TOKEN and TELEGRAM_CHAT_ID must be set to send notifications.");
  }

  const seatList = seats.map((s) => s.seatId).join(", ");
  const text =
    `🎬 Good seat${seats.length > 1 ? "s" : ""} just opened up!\n\n` +
    `${movieTitle ?? "Showtime"}\n${showtimeInfo ?? ""}\n\n` +
    `Seats: ${seatList}\n\n` +
    `Book now: ${showtimeUrl}`;

  const res = await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      chat_id: TELEGRAM_CHAT_ID,
      text,
      disable_web_page_preview: false,
    }),
  });

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`Telegram API error ${res.status}: ${body}`);
  }
}
