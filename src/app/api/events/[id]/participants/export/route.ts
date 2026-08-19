import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { formatSheetTime, statusLabel } from "@/lib/events";

// Quote a CSV cell if it contains a delimiter, quote or newline.
function csvCell(value: string | number): string {
  const s = String(value ?? "");
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

// GET /api/events/:id/participants/export — download the roster as CSV
// (organizer only).
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const eventId = Number(id);
  if (!Number.isInteger(eventId)) {
    return NextResponse.json({ error: "invalid id" }, { status: 400 });
  }

  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "authentication required" }, { status: 401 });
  }

  const event = await prisma.event.findUnique({ where: { id: eventId } });
  if (!event) {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }
  if (event.organizerId !== user.id) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const participants = await prisma.participation.findMany({
    where: { eventId },
    orderBy: { createdAt: "asc" },
    include: { user: true },
  });

  const header = ["번호", "이름", "이메일", "상태", "신청시각"];
  const rows = participants.map((p, i) => [
    i + 1,
    p.user.name,
    p.user.email,
    statusLabel(p.status),
    formatSheetTime(p.createdAt),
  ]);

  const csv = [header, ...rows]
    .map((row) => row.map(csvCell).join(","))
    .join("\r\n");

  // Prepend a UTF-8 BOM so Excel detects the encoding for Korean text.
  const BOM = String.fromCharCode(0xfeff);
  const body = BOM + csv;
  const filename = `natten-event-${eventId}-participants.csv`;

  return new NextResponse(body, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}