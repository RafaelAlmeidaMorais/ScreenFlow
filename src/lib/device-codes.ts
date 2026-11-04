import { prisma } from "@/lib/prisma";

// 32 chars, no 0/O/1/I to avoid confusion
const CHARSET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
const CODE_LENGTH = 6;
export const CODE_TTL_MS = 10 * 60 * 1000; // 10 minutes

function randomCode(): string {
  let out = "";
  for (let i = 0; i < CODE_LENGTH; i++) {
    out += CHARSET[Math.floor(Math.random() * CHARSET.length)];
  }
  return out;
}

export function formatCode(code: string): string {
  // ABC123 -> ABC-123
  if (code.length === 6) return code.slice(0, 3) + "-" + code.slice(3);
  return code;
}

export function normalizeCode(input: string): string {
  return input.toUpperCase().replace(/[^A-Z0-9]/g, "");
}

/**
 * Generate a code that is unique among currently-valid (non-expired) codes.
 * We keep trying until we find a free slot; collisions are extremely rare
 * because the search space is 32^6 ≈ 1 billion.
 */
export async function generateUniqueCode(): Promise<string> {
  for (let attempt = 0; attempt < 10; attempt++) {
    const code = randomCode();
    const existing = await prisma.deviceToken.findUnique({ where: { code } });
    if (!existing) return code;
  }
  throw new Error("Could not generate a unique device code");
}
