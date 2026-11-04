import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { formatCode, generateUniqueCode, CODE_TTL_MS } from "@/lib/device-codes";

export const dynamic = "force-dynamic";

/**
 * Polled by the device every few seconds.
 * Reads the deviceId from the "device_id" cookie.
 * Returns pairing state. If the code has expired, issues a new one.
 */
export async function GET(req: NextRequest) {
  const deviceId = req.cookies.get("device_id")?.value;
  if (!deviceId) {
    return NextResponse.json({ error: "no_device" }, { status: 404 });
  }

  const device = await prisma.deviceToken.findUnique({
    where: { id: deviceId },
    include: { screen: { select: { slug: true, name: true } }, company: { select: { name: true } } },
  });

  if (!device) {
    return NextResponse.json({ error: "no_device" }, { status: 404 });
  }

  // Already paired → return the slug
  if (device.screenId && device.screen) {
    await prisma.deviceToken
      .update({ where: { id: deviceId }, data: { lastSeenAt: new Date() } })
      .catch(() => {});
    return NextResponse.json({
      paired: true,
      slug: device.screen.slug,
      screenName: device.screen.name,
      companyName: device.company?.name ?? null,
    });
  }

  // Not paired: check code validity, regenerate if expired
  const now = new Date();
  let code = device.code;
  let expiresAt = device.codeExpiresAt;

  if (!code || !expiresAt || expiresAt < now) {
    code = await generateUniqueCode();
    expiresAt = new Date(now.getTime() + CODE_TTL_MS);
    await prisma.deviceToken.update({
      where: { id: deviceId },
      data: { code, codeExpiresAt: expiresAt, lastSeenAt: now },
    });
  } else {
    await prisma.deviceToken
      .update({ where: { id: deviceId }, data: { lastSeenAt: now } })
      .catch(() => {});
  }

  return NextResponse.json({
    paired: false,
    code: formatCode(code),
    expiresAt: expiresAt.toISOString(),
  });
}
