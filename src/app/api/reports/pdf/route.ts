import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { formatDuration, getPlaybackReport, MAX_REPORT_MEDIAS } from "@/lib/playback-report";
import { buildPlaybackReportPdf } from "@/lib/report-pdf";
import { formatDateTime, formatDay, formatDayString, timezoneLabel, zonedDayStart } from "@/lib/timezone";

export const dynamic = "force-dynamic";

function periodLabel(from: string, to: string): string {
  if (from && to) return `${formatDayString(from)} a ${formatDayString(to)}`;
  if (from) return `A partir de ${formatDayString(from)}`;
  if (to) return `Até ${formatDayString(to)}`;
  return "Todo o período";
}

/**
 * Downloads the exhibition report as a PDF. Takes the same filters as the
 * reports page (q, screen, from, to) plus `ids`, a comma-separated list of
 * media ids when only some of the listed medias were ticked.
 */
export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const isSuperAdmin = session.user.isSuperAdmin;
  if (!isSuperAdmin && session.user.role !== "COMPANY_ADMIN") {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const sp = req.nextUrl.searchParams;
  const from = sp.get("from") ?? "";
  const to = sp.get("to") ?? "";
  if ((from && !zonedDayStart(from)) || (to && !zonedDayStart(to))) {
    return NextResponse.json({ error: "invalid_date" }, { status: 400 });
  }
  const mediaIds = (sp.get("ids") ?? "")
    .split(",")
    .map((id) => id.trim())
    .filter(Boolean)
    .slice(0, MAX_REPORT_MEDIAS);

  const report = await getPlaybackReport(
    { isSuperAdmin, companyId: session.user.companyId },
    {
      q: sp.get("q") ?? undefined,
      screenId: sp.get("screen") ?? undefined,
      mediaIds,
      from: from || undefined,
      to: to || undefined,
    },
    { daily: true },
  );

  if (report.rows.length === 0) {
    return NextResponse.json({ error: "no_medias" }, { status: 404 });
  }

  const companies = new Set(report.rows.map((r) => r.companyName));
  const byId = new Map(report.rows.map((r) => [r.id, r]));

  const pdf = await buildPlaybackReportPdf({
    companyName: companies.size === 1 ? report.rows[0].companyName : null,
    periodLabel: periodLabel(from, to),
    generatedAtLabel: `${formatDateTime(new Date())} (horários em ${timezoneLabel()})`,
    screenNames: Array.from(new Set(report.rows.map((r) => r.screenName))).sort(),
    totals: {
      plays: report.totals.plays,
      durationLabel: formatDuration(report.totals.durationMs),
    },
    rows: report.rows.map((r) => ({
      title: r.title,
      screenName: r.screenName,
      createdAtLabel: formatDay(r.createdAt),
      plays: r.plays,
      durationLabel: formatDuration(r.durationMs),
      lastPlayedLabel: r.lastPlayedAt ? formatDateTime(r.lastPlayedAt) : "-",
    })),
    daily: report.daily.map((d) => ({
      dayLabel: formatDayString(d.day),
      title: byId.get(d.mediaId)?.title ?? "",
      screenName: byId.get(d.mediaId)?.screenName ?? "",
      plays: d.plays,
      durationLabel: formatDuration(d.durationMs),
    })),
    dailyTruncated: report.dailyTruncated,
  });

  const filename = `relatorio-exibicao${from ? `_${from}` : ""}${to ? `_${to}` : ""}.pdf`;
  return new NextResponse(Buffer.from(pdf), {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store",
    },
  });
}
