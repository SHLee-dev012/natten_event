import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getCurrentUser, isAdmin } from "@/lib/auth";
import { formatDateTime, formatEventTime, statusLabel } from "@/lib/events";
import { CheckInButton } from "@/components/CheckInButton";

export const dynamic = "force-dynamic";

export default async function ParticipantsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const eventId = Number(id);
  if (!Number.isInteger(eventId)) notFound();

  const user = await getCurrentUser();
  if (!user || !isAdmin(user)) redirect("/login");

  const event = await prisma.event.findUnique({ where: { id: eventId } });
  if (!event) notFound();

  // Only the organizer may view the participant list.
  if (event.organizerId !== user.id) {
    redirect(`/events/${eventId}`);
  }

  const participants = await prisma.participation.findMany({
    where: { eventId },
    orderBy: { createdAt: "asc" },
    include: { user: true },
  });

  const checkedInCount = participants.filter(
    (p) => p.status === "CHECKED_IN",
  ).length;

  return (
    <main className="mx-auto w-full max-w-2xl px-6 py-10">
      <Link
        href={`/events/${eventId}`}
        className="text-sm muted transition-colors hover:text-[color:var(--ink)]"
      >
        ← 이벤트로
      </Link>

      <div className="mt-6 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight"><span className="text-nebula">참여자 명단</span></h1>
          <p className="mt-1 text-sm muted">
            {event.title} · {formatEventTime(event.startAt, event.endAt)}
          </p>
        </div>
        {participants.length > 0 && (
          <a
            href={`/api/events/${eventId}/participants/export`}
            download
            className="btn btn-ghost"
          >
            CSV 내보내기
          </a>
        )}
      </div>
      <p className="mt-4 text-sm">
        총 <span className="font-semibold">{participants.length}</span>명
        {event.capacity !== null && ` / 정원 ${event.capacity}명`}
        <span className="muted">
          {" · "}체크인 <span className="font-semibold">{checkedInCount}</span>명
        </span>
      </p>

      <section className="mt-6">
        {participants.length === 0 ? (
          <p className="text-sm muted">아직 참여자가 없습니다.</p>
        ) : (
          <ul className="divide-y divide-[color:var(--line)]">
            {participants.map((p, i) => {
              const checkedIn = p.status === "CHECKED_IN";
              return (
                <li key={p.id} className="flex items-center gap-4 py-3">
                  <span className="w-6 shrink-0 text-sm faint">
                    {i + 1}
                  </span>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <p className="font-medium">{p.user.name}</p>
                      <span
                        className={
                          checkedIn
                            ? "rounded-full border border-emerald-500/30 bg-emerald-500/15 px-2 py-0.5 text-[10px] font-medium text-emerald-300"
                            : "rounded-full border border-[color:var(--line)] bg-white/5 px-2 py-0.5 text-[10px] font-medium faint"
                        }
                      >
                        {statusLabel(p.status)}
                      </span>
                    </div>
                    <p className="text-xs muted">{p.user.email}</p>
                    <time className="text-xs faint">
                      {formatDateTime(p.createdAt)} 신청
                    </time>
                  </div>
                  <CheckInButton
                    eventId={eventId}
                    userId={p.userId}
                    status={p.status}
                  />
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </main>
  );
}