import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getPresignedUploadUrl } from "@/lib/r2";
import { v4 as uuidv4 } from "uuid";

const ALLOWED_IMAGE = ["image/jpeg", "image/png", "image/webp", "image/gif"];
const ALLOWED_VIDEO = ["video/mp4", "video/webm", "video/ogg"];

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }

  const body = await req.json();
  const { filename, contentType } = body;

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

  const ext = filename.split(".").pop()?.toLowerCase() || "bin";
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
