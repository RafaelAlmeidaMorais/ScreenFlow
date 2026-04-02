import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getPresignedUploadUrl, MAX_IMAGE_SIZE, MAX_VIDEO_SIZE } from "@/lib/r2";
import { rateLimit } from "@/lib/rate-limit";
import { v4 as uuidv4 } from "uuid";

const ALLOWED_IMAGE = ["image/jpeg", "image/png", "image/webp", "image/gif"];
const ALLOWED_VIDEO = ["video/mp4", "video/webm", "video/ogg"];
const ALLOWED_EXTENSIONS = ["jpg", "jpeg", "png", "webp", "gif", "mp4", "webm", "ogg"];

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }

  // VIEWER cannot upload
  if (session.user.role === "VIEWER" && !session.user.isSuperAdmin) {
    return NextResponse.json({ error: "Sem permissão" }, { status: 403 });
  }

  // Rate limit: 30 uploads per minute per user
  const { ok } = rateLimit(`upload:${session.user.id}`, 30, 60_000);
  if (!ok) {
    return NextResponse.json({ error: "Muitas requisições. Aguarde um momento." }, { status: 429 });
  }

  const body = await req.json();
  const { filename, contentType, fileSize } = body;

  if (!filename || !contentType) {
    return NextResponse.json({ error: "filename e contentType são obrigatórios" }, { status: 400 });
  }

  const isImage = ALLOWED_IMAGE.includes(contentType);
  const isVideo = ALLOWED_VIDEO.includes(contentType);

  if (!isImage && !isVideo) {
    return NextResponse.json(
      { error: "Tipo não suportado. Use JPG, PNG, WebP, GIF, MP4, WebM ou OGG." },
      { status: 400 }
    );
  }

  // Validate file size if provided
  if (fileSize) {
    const maxSize = isVideo ? MAX_VIDEO_SIZE : MAX_IMAGE_SIZE;
    if (fileSize > maxSize) {
      const maxMB = Math.round(maxSize / (1024 * 1024));
      return NextResponse.json(
        { error: `Arquivo muito grande. Máximo: ${maxMB}MB` },
        { status: 400 }
      );
    }
  }

  // Sanitize extension — only allow known extensions
  const ext = filename.split(".").pop()?.toLowerCase() || "";
  if (!ALLOWED_EXTENSIONS.includes(ext)) {
    return NextResponse.json(
      { error: "Extensão de arquivo não permitida" },
      { status: 400 }
    );
  }

  const key = `media/${uuidv4()}.${ext}`;

  try {
    const { uploadUrl, publicUrl } = await getPresignedUploadUrl(key, contentType);

    return NextResponse.json({
      uploadUrl,
      publicUrl,
      type: isVideo ? "VIDEO" : "IMAGE",
    });
  } catch (err) {
    console.error("Presign error:", err);
    return NextResponse.json(
      { error: "Erro ao gerar URL de upload" },
      { status: 500 }
    );
  }
}
