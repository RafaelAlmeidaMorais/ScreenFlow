import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { rateLimit } from "@/lib/rate-limit";
import { toPlayerOutput } from "@/lib/output-mapping";

export const dynamic = "force-dynamic";

/**
 * Current output mapping of a screen. The player polls this once a second
 * while someone is adjusting the output from the dashboard, so each nudge
 * shows up on the TV right away. Outside adjust mode the heartbeat carries
 * the same data.
 */
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params;

  const { ok } = rateLimit(`output:${token}`, 150, 60_000);
  if (!ok) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  }

  const screen = await prisma.screen.findUnique({
    where: { token },
    select: { outputMapping: true },
  });
  if (!screen) {
    return NextResponse.json({ error: "Tela não encontrada" }, { status: 404 });
  }

  return NextResponse.json(
    { output: toPlayerOutput(screen.outputMapping) },
    { headers: { "Cache-Control": "no-store" } },
  );
}
