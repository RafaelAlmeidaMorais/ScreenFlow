import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sendPasswordResetEmail } from "@/lib/email";
import { rateLimit } from "@/lib/rate-limit";
import crypto from "crypto";

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const email = (body.email || "").toLowerCase().trim();

  if (!email) {
    return NextResponse.json({ error: "Email obrigatório" }, { status: 400 });
  }

  // Rate limit: 3 requests per 15 minutes per email
  const { ok } = rateLimit(`forgot:${email}`, 3, 15 * 60 * 1000);
  if (!ok) {
    // Return success anyway to prevent email enumeration
    return NextResponse.json({ ok: true });
  }

  const user = await prisma.user.findUnique({ where: { email } });

  if (user) {
    // Delete old tokens for this email
    await prisma.passwordResetToken.deleteMany({ where: { email } });

    // Generate secure token
    const token = crypto.randomBytes(32).toString("hex");
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

    await prisma.passwordResetToken.create({
      data: { email, token, expiresAt },
    });

    // Get base URL
    const baseUrl =
      process.env.NEXTAUTH_URL ||
      process.env.AUTH_URL ||
      `${req.nextUrl.protocol}//${req.nextUrl.host}`;

    try {
      await sendPasswordResetEmail(email, token, baseUrl);
    } catch (e) {
      console.error("Failed to send reset email:", e);
    }
  }

  // Always return success (prevent email enumeration)
  return NextResponse.json({ ok: true });
}
