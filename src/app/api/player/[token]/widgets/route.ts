import { prisma } from "@/lib/prisma";
import { renderPriceTableHTML } from "@/lib/widgets";
import type { PriceTableConfig } from "@/lib/widgets";
import { headers } from "next/headers";

interface WidgetData {
  id: string;
  slot: string;
  type: string;
  orderIndex: number;
  html?: string;
  config?: unknown;
}

/**
 * GET /api/player/[token]/widgets
 *
 * Public endpoint that returns widgets for a screen, with ETag support for caching.
 *
 * Query parameters:
 * - ifNoneMatch: ETag value to check for cache validity (sets 304 if unchanged)
 *
 * Returns:
 * - widgets: Array of enabled widgets grouped by slot with rendered HTML for PRICE_TABLE type
 * - hash: SHA256 hash of the content (used as ETag)
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params;

  // Find screen by token
  const screen = await prisma.screen.findUnique({
    where: { token },
    select: {
      id: true,
      layoutTemplate: true,
      widgets: {
        where: { isEnabled: true },
        orderBy: [{ slot: "asc" }, { orderIndex: "asc" }],
      },
    },
  });

  if (!screen) {
    return new Response(JSON.stringify({ error: "Screen not found" }), {
      status: 404,
      headers: { "Content-Type": "application/json" },
    });
  }

  // Process widgets - render HTML for PRICE_TABLE type
  const widgets: WidgetData[] = screen.widgets.map((w) => {
    const data: WidgetData = {
      id: w.id,
      slot: w.slot,
      type: w.type,
      orderIndex: w.orderIndex,
    };

    if (w.type === "PRICE_TABLE") {
      const config = w.config as unknown as PriceTableConfig;
      data.html = renderPriceTableHTML(config);
    } else {
      // For other widget types, include config
      data.config = w.config;
    }

    return data;
  });

  // Create ETag hash from widget data
  const hash = await generateHash(JSON.stringify(widgets));

  // Check If-None-Match header for cache validation
  const requestHeaders = await headers();
  const ifNoneMatch = requestHeaders.get("if-none-match");

  if (ifNoneMatch === hash) {
    // Content hasn't changed, return 304
    return new Response(null, {
      status: 304,
      headers: {
        ETag: hash,
        "Cache-Control": "public, max-age=60",
      },
    });
  }

  // Return widgets with ETag
  return new Response(
    JSON.stringify({
      widgets,
      hash,
      timestamp: new Date().toISOString(),
    }),
    {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        ETag: hash,
        "Cache-Control": "public, max-age=60",
      },
    }
  );
}

/**
 * Simple SHA256 hash generator for ETag
 * Uses the SubtleCrypto API available in Node.js runtime
 */
async function generateHash(data: string): Promise<string> {
  const encoder = new TextEncoder();
  const buffer = encoder.encode(data);

  // Use Node.js crypto module in runtime
  const crypto = await import("crypto");
  return crypto.createHash("sha256").update(buffer).digest("hex");
}
