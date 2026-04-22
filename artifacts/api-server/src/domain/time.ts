export const BR_TZ = "America/Sao_Paulo";

export function toBRDateStr(date: Date): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: BR_TZ, year: "numeric", month: "2-digit", day: "2-digit",
  }).format(date);
}

export function toBRTimeStr(date: Date): string {
  return new Intl.DateTimeFormat("pt-BR", {
    timeZone: BR_TZ, hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false,
  }).format(date);
}

export function nowBR(): { date: string; time: string } {
  const now = new Date();
  return { date: toBRDateStr(now), time: toBRTimeStr(now) };
}

export function timeStrToMinutes(t: string): number {
  const [h, m] = t.split(":").map(Number);
  return (h || 0) * 60 + (m || 0);
}

export type Period = "today" | "week" | "month" | "year";

export function getPeriodDates(period: string): { start: string; end: string; daysInPeriod: number } {
  const now = new Date();
  const today = toBRDateStr(now);

  if (period === "week") {
    const day = now.getDay();
    const monday = new Date(now);
    monday.setDate(now.getDate() - day + (day === 0 ? -6 : 1));
    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6);
    return { start: toBRDateStr(monday), end: toBRDateStr(sunday), daysInPeriod: 7 };
  }
  if (period === "month") {
    const start = new Date(now.getFullYear(), now.getMonth(), 1);
    const end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    return { start: toBRDateStr(start), end: toBRDateStr(end), daysInPeriod: end.getDate() };
  }
  if (period === "year") {
    return { start: `${now.getFullYear()}-01-01`, end: `${now.getFullYear()}-12-31`, daysInPeriod: 365 };
  }
  return { start: today, end: today, daysInPeriod: 1 };
}

export function currentMonthBR(): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: BR_TZ, year: "numeric", month: "2-digit" })
    .format(new Date()).substring(0, 7);
}
