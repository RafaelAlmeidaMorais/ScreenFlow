import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";
import { getLayoutDefinition } from "@/lib/layouts";
import { renderPriceTableHTML, type PriceTableConfig } from "@/lib/widgets";

export const dynamic = "force-dynamic";

export async function GET(
  _req: NextRequest,
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
      widgets: {
        where: { isEnabled: true },
        orderBy: [{ slot: "asc" }, { orderIndex: "asc" }],
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

  const layout = getLayoutDefinition(screen.layoutTemplate);
  const isSingleSlot = layout.slots.length === 1;

  // Build a zone for every slot in the template, placing its medias inside.
  // Unknown slot values (from legacy data or stale state) fall back to
  // the first slot so nothing goes missing on screen.
  const mediasBySlot = new Map<string, typeof activeMedias>();
  for (const slot of layout.slots) mediasBySlot.set(slot.name, []);
  for (const m of activeMedias) {
    const target = mediasBySlot.has(m.slot) ? m.slot : layout.slots[0]!.name;
    mediasBySlot.get(target)!.push(m);
  }

  // Group widgets by slot
  const widgetsBySlot = new Map<string, string[]>();
  for (const slot of layout.slots) widgetsBySlot.set(slot.name, []);
  for (const w of screen.widgets) {
    const target = widgetsBySlot.has(w.slot) ? w.slot : layout.slots[0]!.name;
    const arr = widgetsBySlot.get(target)!;
    if (w.type === "PRICE_TABLE") {
      arr.push(renderPriceTableHTML(w.config as unknown as PriceTableConfig));
    }
  }

  const zones = layout.slots.map((slot) => ({
    name: slot.name,
    label: slot.label,
    top: slot.top,
    left: slot.left,
    width: slot.width,
    height: slot.height,
    medias: (mediasBySlot.get(slot.name) ?? []).map((m) => ({
      id: m.id,
      type: m.type,
      fileUrl: m.fileUrl,
      title: m.title,
      durationSeconds: m.durationSeconds,
    })),
    widgetHTML: (widgetsBySlot.get(slot.name) ?? []).join(""),
  }));

  const zonesJSON = JSON.stringify(zones);

  const configJSON = JSON.stringify({
    token: screen.token,
    screenName: screen.name,
    companyName: screen.company.name,
    intervalSeconds: screen.intervalSeconds,
    autoRefreshMinutes: screen.autoRefreshMinutes,
    showProgressBar: screen.showProgressBar && isSingleSlot,
    isSingleSlot,
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
.zone{position:absolute;overflow:hidden;background:#000}
.slide{position:absolute;top:0;left:0;width:100%;height:100%;display:none}
.slide.active{display:block}
.slide img,.slide video{position:absolute;top:0;left:0;width:100%;height:100%;object-fit:contain;display:block}
#overlay{position:absolute;left:0;right:0;bottom:0;height:120px;background:linear-gradient(to top,rgba(0,0,0,0.7),transparent);pointer-events:none;display:none;z-index:1000}
#infobar{position:absolute;left:0;right:0;bottom:0;padding:24px;display:none;z-index:1001}
.title{color:rgba(255,255,255,0.9);font-size:18px;font-weight:600;font-family:sans-serif}
.subtitle{color:rgba(255,255,255,0.4);font-size:14px;margin-top:2px;font-family:sans-serif}
.counter{color:rgba(255,255,255,0.3);font-size:12px;font-family:sans-serif}
.info-row{display:flex;align-items:flex-end;justify-content:space-between}
#progress-container{display:flex;gap:6px;margin-top:16px}
.progress-track{flex:1;height:4px;border-radius:2px;background:rgba(255,255,255,0.1);overflow:hidden}
.progress-fill{height:100%;border-radius:2px;background:#e87b35;width:0%}
.empty-state{position:absolute;top:0;left:0;width:100%;height:100%;display:flex;align-items:center;justify-content:center;background:#0a0a0a}
.empty-state .empty-inner{text-align:center;padding:16px}
.empty-state h1{color:#fff;font-size:20px;font-weight:bold;font-family:sans-serif}
.empty-state p{color:rgba(255,255,255,0.4);font-size:13px;font-family:sans-serif;margin-top:6px}
.empty-state .dim{color:rgba(255,255,255,0.2);font-size:11px}
.widget-container{transition:opacity 0.3s ease}
</style>
</head>
<body>
<div id="player"></div>
<script>
(function(){
  var zones = ${zonesJSON};
  var config = ${configJSON};
  var bootedAt = new Date().toISOString();
  var player = document.getElementById("player");

  // Each zone gets its own independent slideshow state
  var zoneStates = [];

  function buildPlayer(){
    var html = '';
    var z, i, zoneId;

    // If the entire screen has no active medias across any zone, show
    // a single big empty state covering everything.
    var totalMedias = 0;
    for(z = 0; z < zones.length; z++){ totalMedias += zones[z].medias.length; }
    if(totalMedias === 0){
      html += '<div class="empty-state" style="width:100%;height:100%;position:fixed;top:0;left:0">';
      html += '<div class="empty-inner">';
      html += '<h1>' + escapeHtml(config.screenName) + '</h1>';
      html += '<p>' + escapeHtml(config.companyName) + '</p>';
      html += '<p class="dim">Nenhuma midia ativa no momento</p>';
      html += '</div></div>';
      player.innerHTML = html;
      return;
    }

    for(z = 0; z < zones.length; z++){
      var zone = zones[z];
      zoneId = 'zone-' + z;
      html += '<div class="zone" id="' + zoneId + '" style="top:' + zone.top + '%;left:' + zone.left + '%;width:' + zone.width + '%;height:' + zone.height + '%">';

      if(zone.widgetHTML){
        html += '<div class="widget-container" data-slot="' + zone.name + '" style="width:100%;height:100%;overflow:hidden">';
        html += zone.widgetHTML;
        html += '</div>';
      } else if(zone.medias.length === 0){
        html += '<div class="empty-state">';
        html += '<div class="empty-inner">';
        html += '<h1>' + escapeHtml(zone.label) + '</h1>';
        html += '<p class="dim">Sem midia nesta zona</p>';
        html += '</div></div>';
      } else {
        for(i = 0; i < zone.medias.length; i++){
          var m = zone.medias[i];
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
      }

      html += '</div>';
    }

    // Progress bar only in single-slot layouts (would clash with zones)
    if(config.showProgressBar && config.isSingleSlot && zones[0] && zones[0].medias.length > 0){
      var mainMedias = zones[0].medias;
      html += '<div id="overlay"></div>';
      html += '<div id="infobar">';
      html += '<div class="info-row">';
      html += '<div><div class="title" id="media-title"></div>';
      html += '<div class="subtitle" id="media-subtitle"></div></div>';
      html += '<div class="counter" id="media-counter"></div>';
      html += '</div>';
      html += '<div id="progress-container">';
      for(var j = 0; j < mainMedias.length; j++){
        html += '<div class="progress-track"><div class="progress-fill" id="pbar-' + j + '"></div></div>';
      }
      html += '</div></div>';
    }

    player.innerHTML = html;

    if(config.showProgressBar && config.isSingleSlot){
      var ov = document.getElementById("overlay");
      var ib = document.getElementById("infobar");
      if(ov) ov.style.display = "block";
      if(ib) ib.style.display = "block";
    }

    // Initialise a runner for each zone that has medias
    for(z = 0; z < zones.length; z++){
      if(zones[z].medias.length === 0){
        zoneStates.push(null);
        continue;
      }
      var state = {
        index: z,
        el: document.getElementById('zone-' + z),
        medias: zones[z].medias,
        currentIndex: 0,
        advanceTimer: null,
        progressTimer: null
      };
      zoneStates.push(state);
      updateInfoForZone(state);
      startCurrentForZone(state);
    }
  }

  function updateInfoForZone(state){
    // Progress bar info only applies to the primary zone in single-slot mode
    if(!config.showProgressBar || !config.isSingleSlot) return;
    if(state.index !== 0) return;
    var t = document.getElementById("media-title");
    var s = document.getElementById("media-subtitle");
    var c = document.getElementById("media-counter");
    if(t) t.innerHTML = escapeHtml(state.medias[state.currentIndex].title);
    if(s) s.innerHTML = escapeHtml(config.screenName) + " \\u2014 " + escapeHtml(config.companyName);
    if(c) c.innerHTML = (state.currentIndex + 1) + " / " + state.medias.length;
  }

  function updateProgressForZone(state, percent){
    if(!config.showProgressBar || !config.isSingleSlot) return;
    if(state.index !== 0) return;
    for(var i = 0; i < state.medias.length; i++){
      var bar = document.getElementById("pbar-" + i);
      if(!bar) continue;
      if(i < state.currentIndex){
        bar.style.width = "100%";
      } else if(i === state.currentIndex){
        bar.style.width = percent + "%";
      } else {
        bar.style.width = "0%";
      }
    }
  }

  function clearTimersForZone(state){
    if(state.advanceTimer){ clearTimeout(state.advanceTimer); state.advanceTimer = null; }
    if(state.progressTimer){ clearInterval(state.progressTimer); state.progressTimer = null; }
  }

  function showSlideForZone(state, index){
    var slides = state.el.getElementsByClassName("slide");
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

  function goNextForZone(state){
    clearTimersForZone(state);
    if(state.medias.length <= 1){
      restartCurrentForZone(state);
    } else {
      state.currentIndex = (state.currentIndex + 1) % state.medias.length;
      showSlideForZone(state, state.currentIndex);
      updateInfoForZone(state);
      updateProgressForZone(state, 0);
      startCurrentForZone(state);
    }
  }

  function restartCurrentForZone(state){
    var m = state.medias[state.currentIndex];
    if(m.type === "VIDEO"){
      var slides = state.el.getElementsByClassName("slide");
      var activeSlide = null;
      for(var i = 0; i < slides.length; i++){
        if(slides[i].className.indexOf("active") !== -1){ activeSlide = slides[i]; break; }
      }
      if(!activeSlide) return;
      var vid = activeSlide.getElementsByTagName("video")[0];
      if(vid){
        vid.currentTime = 0;
        try{ var p = vid.play(); if(p && p.catch) p.catch(function(){ vid.muted = true; vid.play(); }); }catch(e){ vid.muted = true; try{ vid.play(); }catch(e2){} }
        setupVideoEndForZone(state, vid);
      }
    }
    // single image: stays visible, nothing to do
  }

  function startCurrentForZone(state){
    var m = state.medias[state.currentIndex];
    if(m.type === "VIDEO"){
      var slides = state.el.getElementsByClassName("slide");
      var activeSlide = null;
      for(var i = 0; i < slides.length; i++){
        if(slides[i].className.indexOf("active") !== -1){ activeSlide = slides[i]; break; }
      }
      if(!activeSlide) return;
      var vid = activeSlide.getElementsByTagName("video")[0];
      if(vid){
        vid.currentTime = 0;
        try{ var p = vid.play(); if(p && p.catch) p.catch(function(){ vid.muted = true; vid.play(); }); }catch(e){ vid.muted = true; try{ vid.play(); }catch(e2){} }
        setupVideoEndForZone(state, vid);
        startVideoProgressForZone(state, vid);
      }
    } else {
      if(state.medias.length > 1){
        startImageTimerForZone(state, config.intervalSeconds);
      }
    }
  }

  function startImageTimerForZone(state, seconds){
    var durationMs = seconds * 1000;
    var startTime = new Date().getTime();

    state.progressTimer = setInterval(function(){
      var elapsed = new Date().getTime() - startTime;
      var pct = Math.min((elapsed / durationMs) * 100, 100);
      updateProgressForZone(state, pct);
    }, 50);

    state.advanceTimer = setTimeout(function(){
      clearTimersForZone(state);
      goNextForZone(state);
    }, durationMs);
  }

  function setupVideoEndForZone(state, vid){
    vid.onended = function(){
      clearTimersForZone(state);
      goNextForZone(state);
    };
    vid.onerror = function(){
      clearTimersForZone(state);
      state.advanceTimer = setTimeout(function(){ goNextForZone(state); }, 3000);
    };
    // Safety net: force advance if the video gets stuck
    var maxMs = (state.medias[state.currentIndex].durationSeconds + 15) * 1000;
    if(state.advanceTimer) clearTimeout(state.advanceTimer);
    state.advanceTimer = setTimeout(function(){ goNextForZone(state); }, maxMs);
  }

  function startVideoProgressForZone(state, vid){
    if(!config.showProgressBar || !config.isSingleSlot || state.index !== 0) return;
    state.progressTimer = setInterval(function(){
      if(vid.duration && vid.duration > 0){
        var pct = (vid.currentTime / vid.duration) * 100;
        updateProgressForZone(state, pct);
      }
    }, 100);
  }

  function escapeHtml(text){
    if(text == null) return '';
    return String(text)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
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

  // Widget polling — refresh widget content every 30s without reloading
  var lastWidgetEtag = '';
  function pollWidgets(){
    try{
      var xhr = new XMLHttpRequest();
      xhr.open("GET", "/api/player/" + config.token + "/widgets", true);
      if(lastWidgetEtag) xhr.setRequestHeader("If-None-Match", lastWidgetEtag);
      xhr.onreadystatechange = function(){
        if(xhr.readyState !== 4) return;
        if(xhr.status === 304) return; // unchanged
        if(xhr.status === 200){
          try{
            var etag = xhr.getResponseHeader("ETag");
            if(etag) lastWidgetEtag = etag;
            var data = JSON.parse(xhr.responseText);
            if(data && data.widgets && Array.isArray(data.widgets)){
              // Group widgets by slot
              var widgetsBySlot = {};
              for(var i = 0; i < data.widgets.length; i++){
                var w = data.widgets[i];
                if(w.slot){
                  if(!widgetsBySlot[w.slot]) widgetsBySlot[w.slot] = [];
                  widgetsBySlot[w.slot].push(w);
                }
              }
              // Update each widget container
              var containers = document.getElementsByClassName("widget-container");
              for(var c = 0; c < containers.length; c++){
                var slot = containers[c].getAttribute("data-slot");
                if(slot && widgetsBySlot[slot]){
                  var newHTML = '';
                  for(var w = 0; w < widgetsBySlot[slot].length; w++){
                    if(widgetsBySlot[slot][w].html){
                      newHTML += widgetsBySlot[slot][w].html;
                    }
                  }
                  if(containers[c].innerHTML !== newHTML){
                    containers[c].style.opacity = '0';
                    containers[c].innerHTML = newHTML;
                    setTimeout((function(el){ return function(){ el.style.opacity = '1'; }; })(containers[c]), 50);
                  }
                }
              }
            }
          }catch(e){}
        }
      };
      xhr.send();
    }catch(e){}
  }

  // INIT
  buildPlayer();
  setTimeout(heartbeat, 5000);
  setInterval(heartbeat, 30000);
  setupAutoRefresh();
  // Start widget polling after a short delay, then every 30s
  setTimeout(pollWidgets, 3000);
  setInterval(pollWidgets, 30000);

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
