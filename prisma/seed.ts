import "dotenv/config";
import { randomBytes, scryptSync } from "node:crypto";
import Database from "better-sqlite3";

// The generated Prisma client uses bundler-style (extensionless) ESM imports
// that plain Node can't resolve, so we seed with better-sqlite3 directly.
// Prisma's better-sqlite3 adapter reads DateTime columns as pass-through
// strings, so storing ISO-8601 strings is compatible.

const dbPath = (process.env.DATABASE_URL ?? "file:./dev.db").replace(/^file:/, "");
const db = new Database(dbPath);

// Mirror src/lib/auth.ts hashPassword() so seeded accounts can log in.
function hashPassword(password: string): string {
  const salt = randomBytes(16).toString("hex");
  const key = scryptSync(password, salt, 64).toString("hex");
  return `${salt}:${key}`;
}

// Build an ISO timestamp for the festival (around 2026-07-25).
// The offset is explicit (mirrors FESTIVAL_UTC_OFFSET in src/lib/events.ts):
// `new Date(y, m, d, h)` would read the *runtime's* timezone, so seeding
// inside the container (UTC) would push every demo event 9 hours late.
function at(day: number, hour: number, minute = 0): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return new Date(
    `2026-07-${pad(day)}T${pad(hour)}:${pad(minute)}:00+09:00`,
  ).toISOString();
}

const now = new Date().toISOString();

// The organizer service's single fixed admin account (email field = login id).
const ORGANIZER = { name: "축제 사무국", email: "tenadmin", password: "admin1234" };
const ATTENDEES = [
  { name: "김민지", email: "minji@example.com", password: "attend1" },
  { name: "이준호", email: "junho@example.com", password: "attend1" },
  { name: "박서연", email: "seoyeon@example.com", password: "attend1" },
];

const events = [
  { title: "오프닝 공연 — 인디 밴드 라이브", description: "축제의 시작을 알리는 라이브 공연입니다. 메인 스테이지에서 만나요!", category: "PERFORMANCE", location: "메인 스테이지", startAt: at(25, 12, 0), endAt: at(25, 13, 30), capacity: 200 },
  { title: "핸드메이드 마켓 부스", description: "지역 아티스트들의 수공예품을 만나볼 수 있는 부스입니다.", category: "BOOTH", location: "A구역 부스존", startAt: at(25, 11, 0), endAt: at(25, 18, 0), capacity: null },
  { title: "도예 원데이 클래스", description: "직접 흙을 빚어 나만의 컵을 만드는 체험 프로그램. 재료비 포함.", category: "EXPERIENCE", location: "체험관 2층", startAt: at(25, 14, 0), endAt: at(25, 15, 30), capacity: 20 },
  { title: "푸드트럭 존 오픈", description: "다양한 먹거리를 즐길 수 있는 푸드트럭 존입니다.", category: "FOOD", location: "야외 광장", startAt: at(25, 11, 30), endAt: at(25, 21, 0), capacity: null },
  { title: "재즈 나이트", description: "축제 첫날 밤을 마무리하는 재즈 공연.", category: "PERFORMANCE", location: "메인 스테이지", startAt: at(25, 19, 0), endAt: at(25, 20, 30), capacity: 200 },
  { title: "가족 페이스페인팅", description: "아이와 함께 즐기는 페이스페인팅 체험존.", category: "EXPERIENCE", location: "체험관 1층", startAt: at(26, 10, 0), endAt: at(26, 16, 0), capacity: 40 },
  { title: "클로징 불꽃놀이", description: "축제의 대미를 장식하는 불꽃놀이. 야외 광장에서 함께해요.", category: "PERFORMANCE", location: "야외 광장", startAt: at(26, 20, 30), endAt: at(26, 21, 0), capacity: null },
];

const seed = db.transaction(() => {
  db.exec("DELETE FROM Participation; DELETE FROM Event; DELETE FROM Session; DELETE FROM User;");

  const insertUser = db.prepare(
    `INSERT INTO User (name, email, passwordHash, createdAt) VALUES (@name, @email, @passwordHash, @createdAt)`,
  );
  const organizerId = Number(
    insertUser.run({ name: ORGANIZER.name, email: ORGANIZER.email, passwordHash: hashPassword(ORGANIZER.password), createdAt: now }).lastInsertRowid,
  );
  const attendeeIds = ATTENDEES.map((a) =>
    Number(insertUser.run({ name: a.name, email: a.email, passwordHash: hashPassword(a.password), createdAt: now }).lastInsertRowid),
  );

  const insertEvent = db.prepare(
    `INSERT INTO Event (title, description, category, location, startAt, endAt, capacity, organizerId, createdAt, updatedAt)
     VALUES (@title, @description, @category, @location, @startAt, @endAt, @capacity, @organizerId, @createdAt, @updatedAt)`,
  );
  const eventIds = events.map((e) =>
    Number(insertEvent.run({ ...e, organizerId, createdAt: now, updatedAt: now }).lastInsertRowid),
  );

  // Give a couple of events some demo participants so the roster is non-empty.
  const insertPart = db.prepare(
    `INSERT INTO Participation (userId, eventId, status, createdAt) VALUES (@userId, @eventId, 'GOING', @createdAt)`,
  );
  for (const uid of attendeeIds) insertPart.run({ userId: uid, eventId: eventIds[0], createdAt: now });
  insertPart.run({ userId: attendeeIds[0], eventId: eventIds[2], createdAt: now });

  return { organizerId, eventIds };
});

const { eventIds } = seed();
console.log(`Seeded ${events.length} events (organizer: ${ORGANIZER.email} / ${ORGANIZER.password}), 3 attendees.`);
console.log(`Demo: log in as organizer and open /events/${eventIds[0]}/participants (3 participants).`);
db.close();