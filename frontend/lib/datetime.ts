function pad2(value: number): string {
  return String(value).padStart(2, "0");
}

export function formatDateFiNumeric(value: string | Date): string {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  const day = date.getDate();
  const month = date.getMonth() + 1;
  const year = date.getFullYear();
  return `${day}.${month}.${year}`;
}

export function formatDateTimeFiNumeric(value: string | Date): string {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  const day = date.getDate();
  const month = date.getMonth() + 1;
  const year = date.getFullYear();
  const hours = pad2(date.getHours());
  const minutes = pad2(date.getMinutes());
  const seconds = pad2(date.getSeconds());
  return `${day}.${month}.${year} ${hours}:${minutes}:${seconds}`;
}

/** Local wall time HH:mm (no seconds), for compact timelines. */
export function formatTimeLocalHm(value: string | Date): string {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return `${pad2(date.getHours())}:${pad2(date.getMinutes())}`;
}

/** Local wall time for detail views, e.g. "12 May 2026, 14:30". */
export function formatLocalDateTimeLong(value: string | Date): string {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  const datePart = date.toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });
  const timePart = `${pad2(date.getHours())}:${pad2(date.getMinutes())}`;
  return `${datePart}, ${timePart}`;
}

/** Half-open [from, to) for the local calendar day containing `ref`. */
export function getLocalDayRangeIso(ref: Date = new Date()): { from: string; to: string } {
  const y = ref.getFullYear();
  const m = ref.getMonth();
  const d = ref.getDate();
  const start = new Date(y, m, d, 0, 0, 0, 0);
  const end = new Date(y, m, d + 1, 0, 0, 0, 0);
  return { from: start.toISOString(), to: end.toISOString() };
}

/** Half-open [from, to) for the local calendar month containing `ref`. */
export function getLocalMonthRangeIso(ref: Date = new Date()): { from: string; to: string } {
  const y = ref.getFullYear();
  const m = ref.getMonth();
  const start = new Date(y, m, 1, 0, 0, 0, 0);
  const end = new Date(y, m + 1, 1, 0, 0, 0, 0);
  return { from: start.toISOString(), to: end.toISOString() };
}

/** Local calendar day key YYYY-MM-DD (for grouping events by day). */
export function localDateKeyFromIso(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}

/** Local YYYY-MM-DD for a calendar `Date` (wall clock, not UTC). */
export function localCalendarDayKeyFromDate(d: Date): string {
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}

/**
 * Half-open [from, to) for the local Monday–Sunday week containing `ref`
 * (week starts Monday 00:00, ends next Monday 00:00 local).
 */
export function getLocalWeekRangeIso(ref: Date = new Date()): { from: string; to: string } {
  const cal = new Date(ref.getFullYear(), ref.getMonth(), ref.getDate());
  const dow = cal.getDay();
  const deltaMonday = dow === 0 ? -6 : 1 - dow;
  const monday = new Date(cal);
  monday.setDate(cal.getDate() + deltaMonday);
  monday.setHours(0, 0, 0, 0);
  const nextMonday = new Date(monday);
  nextMonday.setDate(monday.getDate() + 7);
  return { from: monday.toISOString(), to: nextMonday.toISOString() };
}

