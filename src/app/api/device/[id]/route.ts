import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

export const dynamic = "force-dynamic";

/** Unpair / delete a device (authed). */
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const device = await prisma.deviceToken.findUnique({ where: { id } });
  if (!device) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  const isSuperAdmin = session.user.isSuperAdmin;
  if (!isSuperAdmin && device.companyId !== session.user.companyId) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  await prisma.deviceToken.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}

/** Rename a paired device (authed). Body: { name: string } */
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const body = await req.json().catch(() => null);
  if (!body || typeof body.name !== "string") {
    return NextResponse.json({ error: "invalid_payload" }, { status: 400 });
  }

  const device = await prisma.deviceToken.findUnique({ where: { id } });
  if (!device) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  const isSuperAdmin = session.user.isSuperAdmin;
  if (!isSuperAdmin && device.companyId !== session.user.companyId) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const name = body.name.trim().slice(0, 100) || null;
  await prisma.deviceToken.update({ where: { id }, data: { name } });
  return NextResponse.json({ ok: true });
}
