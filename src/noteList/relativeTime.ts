/**
 * The relative "Updated …" time (list-notes R8; plan D11). Pure: `now` is
 * passed in, read by the caller in an effect or handler, never in render.
 */
const SECOND = 1000;
const MINUTE = 60 * SECOND;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

const format = new Intl.RelativeTimeFormat("en-US", { numeric: "always" });

function ago(count: number, unit: Intl.RelativeTimeFormatUnit): string {
  return format.format(-count, unit);
}

/** "just now", "5 minutes ago", …, "2 years ago" for `updatedAt` seen at `now`. */
export function relativeTime(updatedAt: number, now: number): string {
  const elapsed = now - updatedAt;
  if (elapsed < MINUTE) return "just now";
  if (elapsed < HOUR) return ago(Math.floor(elapsed / MINUTE), "minute");
  if (elapsed < DAY) return ago(Math.floor(elapsed / HOUR), "hour");
  const days = Math.floor(elapsed / DAY);
  if (days < 7) return ago(days, "day");
  if (days < 30) return ago(Math.floor(days / 7), "week");
  if (days < 365) return ago(Math.floor(days / 30), "month");
  return ago(Math.floor(days / 365), "year");
}
