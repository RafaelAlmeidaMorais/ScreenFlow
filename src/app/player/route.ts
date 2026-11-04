import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { formatCode, generateUniqueCode, CODE_TTL_MS } from "@/lib/device-codes";
import { randomBytes } from "crypto";

export const dynamic = "force-dynamic";

const COOKIE_NAME = "device_id";
const COOKIE_MAX_AGE = 60 * 60 * 24 * 365 * 5; // 5 years

function cookieHeader(deviceId: string): string {
  return `${COOKIE_NAME}=${deviceId}; Path=/; Max-Age=${COOKIE_MAX_AGE}; HttpOnly; SameSite=Lax`;
}

export async function GET(req: NextRequest) {
  const existing = req.cookies.get(COOKIE_NAME)?.value;
  const now = new Date();
  const userAgent = req.headers.get("user-agent")?.slice(0, 500) ?? null;

  let device = existing
    ? await prisma.deviceToken.findUnique({
        where: { id: existing },
        include: { screen: { select: { slug: true, name: true } }, company: { select: { name: true } } },
      })
    : null;

  // If already paired → redirect to the actual player
  if (device && device.screen) {
    await prisma.deviceToken
      .update({ where: { id: device.id }, data: { lastSeenAt: now } })
      .catch(() => {});
    const url = new URL(`/player/${device.screen.slug}`, req.url);
    return NextResponse.redirect(url, { status: 302 });
  }

  // Create a device if we don't have one yet
  let setCookie: string | null = null;
  if (!device) {
    const newId = randomBytes(16).toString("hex");
    const code = await generateUniqueCode();
    device = await prisma.deviceToken.create({
      data: {
        id: newId,
        code,
        codeExpiresAt: new Date(now.getTime() + CODE_TTL_MS),
        userAgent,
        lastSeenAt: now,
      },
      include: { screen: { select: { slug: true, name: true } }, company: { select: { name: true } } },
    });
    setCookie = cookieHeader(newId);
  } else {
    // Refresh code if expired
    if (!device.code || !device.codeExpiresAt || device.codeExpiresAt < now) {
      const code = await generateUniqueCode();
      device = await prisma.deviceToken.update({
        where: { id: device.id },
        data: {
          code,
          codeExpiresAt: new Date(now.getTime() + CODE_TTL_MS),
          lastSeenAt: now,
          userAgent,
        },
        include: { screen: { select: { slug: true, name: true } }, company: { select: { name: true } } },
      });
    } else {
      await prisma.deviceToken
        .update({ where: { id: device.id }, data: { lastSeenAt: now, userAgent } })
        .catch(() => {});
    }
  }

  const displayCode = device.code ? formatCode(device.code) : "------";

  const html = `<!DOCTYPE html>
<html lang="pt">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no">
<title>Parear dispositivo — ScreenFlow</title>
<style>
*{margin:0;padding:0;box-sizing:border-box;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",system-ui,sans-serif}
html,body{width:100%;height:100%;overflow:hidden;background:#0a0a0a;color:#fff}
.wrap{position:fixed;top:0;left:0;width:100%;height:100%;display:flex;align-items:center;justify-content:center;padding:4vmin;background:radial-gradient(ellipse at top,#1a1a1a 0%,#0a0a0a 60%)}
.card{text-align:center;max-width:90vmin}
.logo{font-size:5vmin;font-weight:700;letter-spacing:-0.5px;margin-bottom:1vmin}
.logo .brand{color:#e87b35}
.sub{color:rgba(255,255,255,0.4);font-size:2.2vmin;margin-bottom:5vmin}
.code-label{color:rgba(255,255,255,0.5);font-size:2vmin;text-transform:uppercase;letter-spacing:2px;margin-bottom:3vmin}
.code{font-family:"SF Mono",Consolas,Monaco,monospace;font-size:18vmin;font-weight:900;letter-spacing:2vmin;color:#e87b35;line-height:1;text-shadow:0 0 30px rgba(232,123,53,0.3);margin-bottom:5vmin}
.instructions{color:rgba(255,255,255,0.75);font-size:2.4vmin;line-height:1.5;max-width:70vmin;margin:0 auto}
.instructions strong{color:#fff}
.hint{margin-top:3vmin;color:rgba(255,255,255,0.3);font-size:1.8vmin}
.spinner{display:inline-block;width:1.5vmin;height:1.5vmin;border:2px solid rgba(255,255,255,0.2);border-top-color:#e87b35;border-radius:50%;animation:spin 1s linear infinite;margin-right:1vmin;vertical-align:middle}
@keyframes spin{to{transform:rotate(360deg)}}
.expired{color:#ff6b6b;margin-top:2vmin;font-size:2vmin}
</style>
</head>
<body>
<div class="wrap">
  <div class="card">
    <div class="logo">Screen<span class="brand">Flow</span></div>
    <div class="sub">Dispositivo não pareado</div>
    <div class="code-label">Código de pareamento</div>
    <div class="code" id="code">${displayCode}</div>
    <div class="instructions">
      Acesse o painel em <strong>${escapeHtml(getDashboardHint(req))}</strong><br>
      vá em <strong>Dispositivos → Parear</strong> e digite o código acima.
    </div>
    <div class="hint" id="hint"><span class="spinner"></span>Aguardando pareamento...</div>
  </div>
</div>
<script>
(function(){
  var pollMs = 3000;
  var expiredShown = false;

  function poll(){
    try{
      var xhr = new XMLHttpRequest();
      xhr.open("GET", "/api/device/status", true);
      xhr.onreadystatechange = function(){
        if(xhr.readyState !== 4) return;
        if(xhr.status === 200){
          try{
            var data = JSON.parse(xhr.responseText);
            if(data.paired && data.slug){
              window.location.replace("/player/" + encodeURIComponent(data.slug));
              return;
            }
            if(data.code){
              var el = document.getElementById("code");
              if(el) el.textContent = data.code;
            }
          }catch(e){}
        }
      };
      xhr.send();
    }catch(e){}
  }

  setInterval(poll, pollMs);

  // Keep APK watchdog alive (DEBUG_SCRIPT forwards console.log to native).
  setInterval(function(){ try{ console.log("tick"); }catch(e){} }, 20000);
})();
</script>
</body>
</html>`;

  const headers: Record<string, string> = {
    "Content-Type": "text/html; charset=utf-8",
    "Cache-Control": "no-store, no-cache, must-revalidate",
  };
  if (setCookie) headers["Set-Cookie"] = setCookie;

  return new NextResponse(html, { status: 200, headers });
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function getDashboardHint(req: NextRequest): string {
  try {
    const url = new URL(req.url);
    return url.host;
  } catch {
    return "seu painel";
  }
}
