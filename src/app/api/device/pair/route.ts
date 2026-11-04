import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { normalizeCode } from "@/lib/device-codes";

export const dynamic = "force-dynamic";

/**
 * Authed endpoint used by the dashboard to pair a device code with a screen.
 * Body: { code: string, screenId: string, name?: string }
 */
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  if (!body || typeof body.code !== "string" || typeof body.screenId !== "string") {
    return NextResponse.json({ error: "invalid_payload" }, { status: 400 });
  }

  const code = normalizeCode(body.code);
  if (code.length !== 6) {
    return NextResponse.json({ error: "invalid_code" }, { status: 400 });
  }

  const device = await prisma.deviceToken.findUnique({ where: { code } });
  if (!device) {
    return NextResponse.json({ error: "code_not_found" }, { status: 404 });
  }
  if (!device.codeExpiresAt || device.codeExpiresAt < new Date()) {
    return NextResponse.json({ error: "code_expired" }, { status: 410 });
  }

  const screen = await prisma.screen.findUnique({
    where: { id: body.screenId },
    select: { id: true, companyId: true, name: true },
  });
  if (!screen) {
    return NextResponse.json({ error: "screen_not_found" }, { status: 404 });
  }

  const isSuperAdmin = session.user.isSuperAdmin;
  if (!isSuperAdmin && screen.companyId !== session.user.companyId) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const name = typeof body.name === "string" && body.name.trim().length > 0
    ? body.name.trim().slice(0, 100)
    : null;

  const updated = await prisma.deviceToken.update({
    where: { id: device.id },
    data: {
      screenId: screen.id,
      companyId: screen.companyId,
      pairedAt: new Date(),
      code: null,
      codeExpiresAt: null,
      name,
    },
    include: { screen: { select: { name: true, slug: true } } },
  });

  return NextResponse.json({
    paired: true,
    deviceId: updated.id,
    screen: updated.screen,
  });
}
