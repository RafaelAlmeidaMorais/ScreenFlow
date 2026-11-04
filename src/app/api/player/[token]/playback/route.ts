import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { rateLimit } from "@/lib/rate-limit";

interface IncomingEvent {
  mediaId?: string;
  playedAt?: string;
  durationMs?: number;
}

const MAX_EVENTS_PER_REQUEST = 200;

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params;

  const { ok } = rateLimit(`playback:${token}`, 60, 60_000);
  if (!ok) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  }

  const body = await req.json().catch(() => null);
  if (!body || !Array.isArray(body.events)) {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  const incoming: IncomingEvent[] = body.events.slice(0, MAX_EVENTS_PER_REQUEST);
  if (incoming.length === 0) {
    return NextResponse.json({ accepted: 0 });
  }

  const screen = await prisma.screen.findUnique({
    where: { token },
    select: { id: true, companyId: true, isActive: true },
  });

  if (!screen) {
    return NextResponse.json({ error: "Tela não encontrada" }, { status: 404 });
  }
  if (!screen.isActive) {
    return NextResponse.json({ accepted: 0 });
  }

  const mediaIds = Array.from(
    new Set(
      incoming
        .map((e) => (typeof e.mediaId === "string" ? e.mediaId : null))
        .filter((v): v is string => !!v)
    )
  );

  if (mediaIds.length === 0) {
    return NextResponse.json({ accepted: 0 });
  }

  const validMedias = await prisma.media.findMany({
    where: { id: { in: mediaIds }, screenId: screen.id },
    select: { id: true },
  });
  const validIds = new Set(validMedias.map((m) => m.id));

  const now = new Date();
  const data = incoming
    .filter((e) => e.mediaId && validIds.has(e.mediaId))
    .map((e) => {
      const playedAt = e.playedAt ? new Date(e.playedAt) : now;
      const safePlayedAt =
        !isNaN(playedAt.getTime()) && playedAt.getTime() <= now.getTime() + 60_000
          ? playedAt
          : now;
      const durationMs =
        typeof e.durationMs === "number" && e.durationMs >= 0 && e.durationMs < 24 * 3600 * 1000
          ? Math.round(e.durationMs)
          : null;
      return {
        mediaId: e.mediaId!,
        screenId: screen.id,
        companyId: screen.companyId,
        playedAt: safePlayedAt,
        durationMs,
      };
    });

  if (data.length === 0) {
    return NextResponse.json({ accepted: 0 });
  }

  await prisma.playbackEvent.createMany({ data });

  return NextResponse.json({ accepted: data.length });
}
