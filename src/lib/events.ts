// Shared helpers for the festival event domain.

export const CATEGORIES = [
  { key: "PERFORMANCE", label: "공연" },
  { key: "BOOTH", label: "부스" },
  { key: "EXPERIENCE", label: "체험" },
  { key: "FOOD", label: "먹거리" },
  { key: "GENERAL", label: "기타" },
] as const;

export function categoryLabel(key: string): string {
  return CATEGORIES.find((c) => c.key === key)?.label ?? key;
}

// Participation lifecycle. GOING = signed up, CHECKED_IN = arrived on-site.
export const PARTICIPATION_STATUSES = ["GOING", "CHECKED_IN"] as const;
export type ParticipationStatus = (typeof PARTICIPATION_STATUSES)[number];

export function statusLabel(status: string): string {
  return status === "CHECKED_IN" ? "체크인 완료" : "참여 예정";
}

// ── Time formatting ───────────────────────────────────────────────
// The festival is held in Korea, so every timestamp is rendered in KST no
// matter where the server runs. Containers default to UTC, which would
// otherwise shift every displayed time by 9 hours. Korea has had no DST
// since 1988, so the fixed offset always agrees with the IANA zone — it
// exists because parsing a wall-clock string needs an offset, not a name.
export const FESTIVAL_TZ = "Asia/Seoul";
export const FESTIVAL_UTC_OFFSET = "+09:00";

const timeFmt = new Intl.DateTimeFormat("ko-KR", {
  timeZone: FESTIVAL_TZ,
  month: "long",
  day: "numeric",
  hour: "2-digit",
  minute: "2-digit",
});

const clockFmt = new Intl.DateTimeFormat("ko-KR", {
  timeZone: FESTIVAL_TZ,
  hour: "2-digit",
  minute: "2-digit",
});

// e.g. "7월 20일 오후 02:00 – 03:30"
export function formatEventTime(start: Date, end: Date): string {
  return `${timeFmt.format(start)} – ${clockFmt.format(end)}`;
}

// A single point in time, e.g. "7월 20일 오후 02:00" (roster join times).
export function formatDateTime(d: Date): string {
  return timeFmt.format(d);
}

export function formatClock(d: Date): string {
  return clockFmt.format(d);
}

// "7월 20일" style day header for the schedule view.
const dayFmt = new Intl.DateTimeFormat("ko-KR", {
  timeZone: FESTIVAL_TZ,
  month: "long",
  day: "numeric",
  weekday: "short",
});

export function formatDay(d: Date): string {
  return dayFmt.format(d);
}

// "2026-07-25" in festival time — groups the timetable by calendar day.
// en-CA renders ISO-order dates, so the key also sorts correctly.
const dayKeyFmt = new Intl.DateTimeFormat("en-CA", {
  timeZone: FESTIVAL_TZ,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

export function dayKey(d: Date): string {
  return dayKeyFmt.format(d);
}

// "2026-07-25 12:00" in festival time — friendlier than ISO for spreadsheets.
const sheetFmt = new Intl.DateTimeFormat("en-CA", {
  timeZone: FESTIVAL_TZ,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  hourCycle: "h23", // not hour12:false — that can render midnight as "24:00"
});

export function formatSheetTime(d: Date): string {
  const p: Partial<Record<Intl.DateTimeFormatPartTypes, string>> = {};
  for (const part of sheetFmt.formatToParts(d)) p[part.type] = part.value;
  return `${p.year}-${p.month}-${p.day} ${p.hour}:${p.minute}`;
}

// <input type="datetime-local"> works in wall-clock strings with no zone.
// These two convert between that and a real instant, pinned to festival time
// so an organizer on a laptop set to another timezone still enters KST.
export function festivalInputToDate(value: string): Date {
  return new Date(`${value}:00${FESTIVAL_UTC_OFFSET}`);
}

export function dateToFestivalInput(iso: string): string {
  return formatSheetTime(new Date(iso)).replace(" ", "T");
}

// ── Event artwork ─────────────────────────────────────────────
// Cosmic SVG banners served from /public. Seed events get a bespoke
// per-title illustration; everything else falls back to its category art.

const CATEGORY_IMAGE: Record<string, string> = {
  PERFORMANCE: "performance",
  BOOTH: "booth",
  EXPERIENCE: "experience",
  FOOD: "food",
  GENERAL: "general",
};

const EVENT_IMAGE: Record<string, string> = {
  "오프닝 공연 — 인디 밴드 라이브": "opening-live",
  "핸드메이드 마켓 부스": "handmade-market",
  "도예 원데이 클래스": "pottery-class",
  "푸드트럭 존 오픈": "foodtruck-zone",
  "재즈 나이트": "jazz-night",
  "가족 페이스페인팅": "face-painting",
  "클로징 불꽃놀이": "closing-fireworks",
};

export function categoryImage(category: string): string {
  return `/categories/${CATEGORY_IMAGE[category] ?? "general"}.svg`;
}

// Per-title illustration if we have one, else the category fallback.
export function eventImage(title: string, category: string): string {
  const slug = EVENT_IMAGE[title.trim()];
  return slug ? `/events/${slug}.svg` : categoryImage(category);
}