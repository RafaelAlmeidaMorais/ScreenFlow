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

  // If this request came from a paired device (has device_id cookie) and the
  // device still exists in the DB, signal the client to leave the player when
  // the pairing no longer matches this screen. A missing cookie or missing DB
  // row (stale cookie from an old test, etc.) is treated as "direct URL mode"
  // — the TV box keeps playing and remote Restart still works normally.
  let shouldUnpair = false;
  const deviceId = req.cookies.get("device_id")?.value;
  if (deviceId) {
    const device = await prisma.deviceToken.findUnique({
      where: { id: deviceId },
      select: { screenId: true },
    });
    if (device && device.screenId !== screen.id) {
      // Device row exists but points elsewhere (null = admin unpaired it, or
      // another screen id = re-paired). Kick it back to the pairing page.
      shouldUnpair = true;
    } else if (device) {
      await prisma.deviceToken
        .update({ where: { id: deviceId }, data: { lastSeenAt: new Date() } })
        .catch(() => {});
    }
  }

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
    shouldUnpair,
    intervalSeconds: screen.intervalSeconds,
    autoRefreshMinutes: screen.autoRefreshMinutes,
    isActive: screen.isActive,
    mediaCount,
  });
}
