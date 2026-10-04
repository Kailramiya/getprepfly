import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** Unbiased Fisher-Yates shuffle (`sort(() => Math.random() - 0.5)` is not uniform). Returns a copy. */
export function shuffle<T>(arr: readonly T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// "Today" for daily goals, streaks and free-scoring limits. The audience is in India and the
// server runs in UTC, so server-local midnight would reset the day at 05:30 IST.
const IST_OFFSET_MS = 5.5 * 60 * 60 * 1000;

/** Start of the current IST day, as an absolute Date. */
export function istDayStart(now: number = Date.now()): Date {
  return new Date(Math.floor((now + IST_OFFSET_MS) / 86400000) * 86400000 - IST_OFFSET_MS);
}

/** IST calendar date (YYYY-MM-DD) of an instant. */
export function istDateKey(d: Date | number): string {
  return new Date(+d + IST_OFFSET_MS).toISOString().slice(0, 10);
}
