import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;

  const screen = await prisma.screen.findUnique({
    where: { slug },
    include: {
      medias: {
        where: { isEnabled: true },
        orderBy: { orderIndex: "asc" },
      },
      company: true,
    },
  });

  if (!screen) {
    return new NextResponse("Tela nao encontrada", { status: 404 });
  }

  const now = new Date();
  const activeMedias = screen.medias.filter(
    (m) => !m.endDate || new Date(m.endDate) > now
  );

  const mediasJSON = JSON.stringify(
    activeMedias.map((m) => ({
      id: m.id,
      type: m.type,
      fileUrl: m.fileUrl,
      title: m.title,
      durationSeconds: m.durationSeconds,
    }))
  );

  const configJSON = JSON.stringify({
    token: screen.token,
    screenName: screen.name,
    companyName: screen.company.name,
    intervalSeconds: screen.intervalSeconds,
    autoRefreshMinutes: screen.autoRefreshMinutes,
    showProgressBar: screen.showProgressBar,
  });

  const html = `<!DOCTYPE html>
<html lang="pt">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no">
<title>${escapeHtml(screen.name)}</title>
<style>
*{margin:0;padding:0;box-sizing:border-box}
html,body{width:100%;height:100%;overflow:hidden;background:#000}
#player{position:fixed;top:0;left:0;width:100%;height:100%;background:#000;overflow:hidden;cursor:none}
.slide{position:absolute;top:0;left:0;width:100%;height:100%;display:none}
.slide.active{display:block}
.slide img,.slide video{position:absolute;top:0;left:0;width:100%;height:100%;object-fit:contain;display:block}
#overlay{position:absolute;left:0;right:0;bottom:0;height:120px;background:linear-gradient(to top,rgba(0,0,0,0.7),transparent);pointer-events:none;display:none}
#infobar{position:absolute;left:0;right:0;bottom:0;padding:24px;display:none}
.title{color:rgba(255,255,255,0.9);font-size:18px;font-weight:600;font-family:sans-serif}
.subtitle{color:rgba(255,255,255,0.4);font-size:14px;margin-top:2px;font-family:sans-serif}
.counter{color:rgba(255,255,255,0.3);font-size:12px;font-family:sans-serif}
.info-row{display:flex;align-items:flex-end;justify-content:space-between}
#progress-container{display:flex;gap:6px;margin-top:16px}
.progress-track{flex:1;height:4px;border-radius:2px;background:rgba(255,255,255,0.1);overflow:hidden}
.progress-fill{height:100%;border-radius:2px;background:#e87b35;width:0%}
#empty-state{position:fixed;top:0;left:0;width:100%;height:100%;background:#000;display:flex;align-items:center;justify-content:center}
#empty-state h1{color:#fff;font-size:24px;font-weight:bold;font-family:sans-serif;text-align:center}
#empty-state p{color:rgba(255,255,255,0.4);font-size:14px;font-family:sans-serif;text-align:center;margin-top:8px}
#empty-state .dim{color:rgba(255,255,255,0.2);font-size:12px}
</style>
</head>
<body>
<div id="player"></div>
<script>
(function(){
  var medias = ${mediasJSON};
  var config = ${configJSON};
  var currentIndex = 0;
  var advanceTimer = null;
  var progressTimer = null;
  var bootedAt = new Date().toISOString();
  var player = document.getElementById("player");

  function buildPlayer(){
    if(medias.length === 0){
      player.innerHTML = '<div id="empty-state"><div><h1>' +
        config.screenName + '</h1><p>' + config.companyName +
        '</p><p class="dim">Nenhuma midia ativa no momento</p></div></div>';
      return;
    }

    var html = '';
    var i;

    for(i = 0; i < medias.length; i++){
      var m = medias[i];
      var cls = i === 0 ? 'slide active' : 'slide';
      if(m.type === 'IMAGE'){
        html += '<div class="' + cls + '" data-index="' + i + '">';
        html += '<img src="' + m.fileUrl + '" />';
        html += '</div>';
      } else {
        html += '<div class="' + cls + '" data-index="' + i + '">';
        html += '<video src="' + m.fileUrl + '" playsinline autoplay muted></video>';
        html += '</div>';
      }
    }

    if(config.showProgressBar){
      html += '<div id="overlay"></div>';
      html += '<div id="infobar">';
      html += '<div class="info-row">';
      html += '<div><div class="title" id="media-title"></div>';
      html += '<div class="subtitle" id="media-subtitle"></div></div>';
      html += '<div class="counter" id="media-counter"></div>';
      html += '</div>';
      html += '<div id="progress-container">';
      for(var j = 0; j < medias.length; j++){
        html += '<div class="progress-track"><div class="progress-fill" id="pbar-' + j + '"></div></div>';
      }
      html += '</div></div>';
    }

    player.innerHTML = html;

    if(config.showProgressBar){
      var ov = document.getElementById("overlay");
      var ib = document.getElementById("infobar");
      if(ov) ov.style.display = "block";
      if(ib) ib.style.display = "block";
    }

    updateInfo();
    startCurrent();
  }

  function updateInfo(){
    if(!config.showProgressBar) return;
    var t = document.getElementById("media-title");
    var s = document.getElementById("media-subtitle");
    var c = document.getElementById("media-counter");
    if(t) t.innerHTML = medias[currentIndex].title;
    if(s) s.innerHTML = config.screenName + " \\u2014 " + config.companyName;
    if(c) c.innerHTML = (currentIndex + 1) + " / " + medias.length;
  }

  function updateProgress(percent){
    if(!config.showProgressBar) return;
    for(var i = 0; i < medias.length; i++){
      var bar = document.getElementById("pbar-" + i);
      if(!bar) continue;
      if(i < currentIndex){
        bar.style.width = "100%";
      } else if(i === currentIndex){
        bar.style.width = percent + "%";
      } else {
        bar.style.width = "0%";
      }
    }
  }

  function clearTimers(){
    if(advanceTimer){ clearTimeout(advanceTimer); advanceTimer = null; }
    if(progressTimer){ clearInterval(progressTimer); progressTimer = null; }
  }

  function showSlide(index){
    var slides = player.getElementsByClassName("slide");
    for(var i = 0; i < slides.length; i++){
      if(i === index){
        slides[i].className = "slide active";
      } else {
        slides[i].className = "slide";
        var vid = slides[i].getElementsByTagName("video")[0];
        if(vid){ try{ vid.pause(); }catch(e){} }
      }
    }
  }

  function goNext(){
    clearTimers();
    if(medias.length <= 1){
      restartCurrent();
    } else {
      currentIndex = (currentIndex + 1) % medias.length;
      showSlide(currentIndex);
      updateInfo();
      updateProgress(0);
      startCurrent();
    }
  }

  function restartCurrent(){
    var m = medias[currentIndex];
    if(m.type === "VIDEO"){
      var slides = player.getElementsByClassName("slide active");
      if(slides.length === 0) return;
      var vid = slides[0].getElementsByTagName("video")[0];
      if(vid){
        vid.currentTime = 0;
        try{ var p = vid.play(); if(p && p.catch) p.catch(function(){ vid.muted = true; vid.play(); }); }catch(e){ vid.muted = true; try{ vid.play(); }catch(e2){} }
        setupVideoEnd(vid);
      }
    }
    // single image: stays visible, nothing to do
  }

  function startCurrent(){
    var m = medias[currentIndex];
    if(m.type === "VIDEO"){
      var slides = player.getElementsByClassName("slide active");
      if(slides.length === 0) return;
      var vid = slides[0].getElementsByTagName("video")[0];
      if(vid){
        vid.currentTime = 0;
        try{ var p = vid.play(); if(p && p.catch) p.catch(function(){ vid.muted = true; vid.play(); }); }catch(e){ vid.muted = true; try{ vid.play(); }catch(e2){} }
        setupVideoEnd(vid);
        startVideoProgress(vid);
      }
    } else {
      if(medias.length > 1){
        startImageTimer(config.intervalSeconds);
      }
    }
  }

  function startImageTimer(seconds){
    var durationMs = seconds * 1000;
    var startTime = new Date().getTime();

    progressTimer = setInterval(function(){
      var elapsed = new Date().getTime() - startTime;
      var pct = Math.min((elapsed / durationMs) * 100, 100);
      updateProgress(pct);
    }, 50);

    advanceTimer = setTimeout(function(){
      clearTimers();
      goNext();
    }, durationMs);
  }

  function setupVideoEnd(vid){
    vid.onended = function(){
      clearTimers();
      goNext();
    };
    vid.onerror = function(){
      clearTimers();
      advanceTimer = setTimeout(function(){ goNext(); }, 3000);
    };
    // safety net
    var maxMs = (medias[currentIndex].durationSeconds + 15) * 1000;
    if(advanceTimer) clearTimeout(advanceTimer);
    advanceTimer = setTimeout(function(){ goNext(); }, maxMs);
  }

  function startVideoProgress(vid){
    if(!config.showProgressBar) return;
    progressTimer = setInterval(function(){
      if(vid.duration && vid.duration > 0){
        var pct = (vid.currentTime / vid.duration) * 100;
        updateProgress(pct);
      }
    }, 100);
  }

  function heartbeat(){
    try{
      var xhr = new XMLHttpRequest();
      xhr.open("POST", "/api/player/" + config.token + "/heartbeat", true);
      xhr.setRequestHeader("Content-Type", "application/json");
      xhr.onreadystatechange = function(){
        if(xhr.readyState === 4 && xhr.status === 200){
          try{
            var data = JSON.parse(xhr.responseText);
            if(data && data.shouldRefresh) window.location.reload();
          }catch(e){}
        }
      };
      xhr.send(JSON.stringify({ bootedAt: bootedAt }));
    }catch(e){}
  }

  function setupAutoRefresh(){
    if(config.autoRefreshMinutes > 0){
      setTimeout(function(){ window.location.reload(); }, config.autoRefreshMinutes * 60 * 1000);
    }
  }

  // INIT
  buildPlayer();
  setTimeout(heartbeat, 5000);
  setInterval(heartbeat, 30000);
  setupAutoRefresh();

})();
</script>
</body>
</html>`;

  return new NextResponse(html, {
    status: 200,
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": "no-store, no-cache, must-revalidate",
    },
  });
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
