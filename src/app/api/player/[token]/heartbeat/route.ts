import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { rateLimit } from "@/lib/rate-limit";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params;

  // Rate limit: 10 heartbeats per minute per token
  const { ok } = rateLimit(`heartbeat:${token}`, 10, 60_000);
  if (!ok) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  }

  const body = await req.json().catch(() => ({}));
  const bootedAt = body.bootedAt ? new Date(body.bootedAt) : null;

  const screen = await prisma.screen.findUnique({
    where: { token },
    select: {
      id: true,
      intervalSeconds: true,
      autoRefreshMinutes: true,
      refreshRequestedAt: true,
      isActive: true,
    },
  });

  if (!screen) {
    return NextResponse.json({ error: "Tela não encontrada" }, { status: 404 });
  }

  // Update lastSeenAt
  await prisma.screen.update({
    where: { id: screen.id },
    data: { lastSeenAt: new Date() },
  });

  // Check if admin requested a refresh after this player instance booted
  const shouldRefresh =
    screen.refreshRequestedAt &&
    bootedAt &&
    screen.refreshRequestedAt > bootedAt;

  // Check if there are updated medias (content version)
  const mediaCount = await prisma.media.count({
    where: { screenId: screen.id, isEnabled: true },
  });

  return NextResponse.json({
    shouldRefresh: !!shouldRefresh,
    intervalSeconds: screen.intervalSeconds,
    autoRefreshMinutes: screen.autoRefreshMinutes,
    isActive: screen.isActive,
    mediaCount,
  });
}
