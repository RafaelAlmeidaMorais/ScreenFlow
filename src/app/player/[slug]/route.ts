import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";
import { getLayoutDefinition } from "@/lib/layouts";
import { renderPriceTableHTML, type PriceTableConfig } from "@/lib/widgets";
import { toPlayerOutput } from "@/lib/output-mapping";

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

  // Only medias inside their start/end window. The heartbeat tells the page to
  // reload when a window opens or closes, so this is re-evaluated on time.
  const now = new Date();
  const activeMedias = screen.medias.filter(
    (m) => m.startDate <= now && (!m.endDate || m.endDate > now)
  );

  const layout = getLayoutDefinition(screen.layoutTemplate, screen.customLayout);
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
    renderedAt: now.toISOString(),
    screenName: screen.name,
    companyName: screen.company.name,
    intervalSeconds: screen.intervalSeconds,
    autoRefreshMinutes: screen.autoRefreshMinutes,
    showProgressBar: screen.showProgressBar && isSingleSlot,
    isSingleSlot,
    output: toPlayerOutput(screen.outputMapping, now),
    offline: screen.offlineEnabled,
    pagePath: "/player/" + encodeURIComponent(screen.slug),
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
#player{position:fixed;top:0;left:0;width:100%;height:100%;background:#000;overflow:hidden;cursor:none;-webkit-transform-origin:0 0;transform-origin:0 0}
#output-grid{position:absolute;top:0;left:0;width:100%;height:100%;z-index:5000;display:none;pointer-events:none;box-sizing:border-box;border:4px solid #00e676;background-color:rgba(0,0,0,0.6);background-image:linear-gradient(rgba(255,255,255,0.28) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,0.28) 1px,transparent 1px);background-size:10% 10%;font-family:sans-serif;color:#fff}
#output-grid .og-circle{position:absolute;top:50%;left:50%;width:60vh;height:60vh;margin:-30vh 0 0 -30vh;border:3px solid #fff;border-radius:50%}
#output-grid .og-h{position:absolute;top:50%;left:0;width:100%;height:2px;margin-top:-1px;background:#00e676}
#output-grid .og-v{position:absolute;left:50%;top:0;height:100%;width:2px;margin-left:-1px;background:#00e676}
#output-grid .og-corner{position:absolute;width:9vh;height:9vh;border:0 solid #ff5252}
#output-grid .og-tl{top:0;left:0;border-top-width:1.4vh;border-left-width:1.4vh}
#output-grid .og-tr{top:0;right:0;border-top-width:1.4vh;border-right-width:1.4vh}
#output-grid .og-bl{bottom:0;left:0;border-bottom-width:1.4vh;border-left-width:1.4vh}
#output-grid .og-br{bottom:0;right:0;border-bottom-width:1.4vh;border-right-width:1.4vh}
#output-grid .og-label{position:absolute;top:50%;left:50%;-webkit-transform:translate(-50%,-50%);transform:translate(-50%,-50%);text-align:center;background:rgba(0,0,0,0.75);padding:2vh 3vh;border-radius:1vh;white-space:nowrap}
#output-grid .og-title{font-size:3.4vh;font-weight:bold}
#output-grid .og-values{font-size:2.8vh;margin-top:1vh;color:#00e676}
#output-grid .og-hint{font-size:2vh;margin-top:1vh;color:rgba(255,255,255,0.6)}
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
      recordPlaybackStart(state);
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
    recordPlaybackEnd(state);
    if(state.medias.length <= 1){
      recordPlaybackStart(state);
      restartCurrentForZone(state);
    } else {
      state.currentIndex = (state.currentIndex + 1) % state.medias.length;
      showSlideForZone(state, state.currentIndex);
      updateInfoForZone(state);
      updateProgressForZone(state, 0);
      recordPlaybackStart(state);
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
        if(xhr.readyState !== 4) return;
        // Screen no longer exists: the scheduled reload shows that.
        if(xhr.status === 404 && refreshDue){ window.location.reload(); return; }
        if(xhr.status === 200){
          // Keep APK watchdog alive (DEBUG_SCRIPT forwards console.log to native).
          try{ console.log("hb"); }catch(e){}
          var data = null;
          try{ data = JSON.parse(xhr.responseText); }catch(e){}
          // Restart has priority over unpair — an admin-triggered reload
          // should always win, even if a stale device cookie also matched.
          if((data && data.shouldRefresh) || refreshDue){ window.location.reload(); return; }
          if(data && data.output) setOutput(data.output);
          if(data && data.shouldUnpair){
            // Device was unpaired from the dashboard — flush playback and
            // go back to the pairing page, which will show a fresh code.
            flushOnExit();
            window.location.replace("/player");
            return;
          }
        }
      };
      xhr.send(JSON.stringify({ bootedAt: bootedAt, renderedAt: config.renderedAt, offline: offlineStatus }));
    }catch(e){}
  }

  // Dedicated watchdog ping — the APK kills the WebView if nothing is heard
  // from it for 45s (checks every 30s). Even if heartbeat/polling break, this
  // keeps the page considered "alive" so the user can see the error instead
  // of a silent reload loop.
  setInterval(function(){ try{ console.log("tick"); }catch(e){} }, 20000);

  // The periodic reload waits for the next heartbeat the server answers.
  // Reloading with the connection down would swap a playing screen for a
  // blank error page until the internet comes back.
  var refreshDue = false;
  function setupAutoRefresh(){
    if(config.autoRefreshMinutes > 0){
      setTimeout(function(){ refreshDue = true; }, config.autoRefreshMinutes * 60 * 1000);
    }
  }

  // Playback tracking. A finished play stays in "pending" until the server
  // confirms it, so plays made while offline are delivered when the connection
  // returns. The list is mirrored to localStorage to survive reloads and power
  // cuts. Items are [mediaId, startMs, durationMs].
  var PLAYBACK_URL = "/api/player/" + config.token + "/playback";
  var PENDING_KEY = "sf_playback_" + config.token;
  var MAX_PENDING = 20000; // about 2 days of 10s slides
  var BATCH_SIZE = 200;    // server limit per request
  var pending = loadPending();
  var pendingDirty = false;
  var inFlight = 0;
  var playbackStart = {}; // zoneIndex -> { mediaId, startMs }

  function loadPending(){
    try{
      var raw = window.localStorage.getItem(PENDING_KEY);
      var list = raw ? JSON.parse(raw) : [];
      return (list && list instanceof Array) ? list : [];
    }catch(e){ return []; }
  }

  function savePending(){
    if(!pendingDirty) return;
    try{
      if(pending.length === 0) window.localStorage.removeItem(PENDING_KEY);
      else window.localStorage.setItem(PENDING_KEY, JSON.stringify(pending));
      pendingDirty = false;
    }catch(e){}
  }

  function addPending(mediaId, startMs, durationMs){
    // Ignore absurdly short plays (< 500ms, likely glitch) and keep a cap
    if(durationMs < 500 || durationMs >= 24*3600*1000) return;
    pending.push([mediaId, startMs, durationMs]);
    if(pending.length > MAX_PENDING) pending.splice(0, pending.length - MAX_PENDING);
    pendingDirty = true;
  }

  function recordPlaybackStart(state){
    var m = state.medias[state.currentIndex];
    if(!m || !m.id) return;
    playbackStart[state.index] = { mediaId: m.id, startMs: new Date().getTime() };
  }

  function recordPlaybackEnd(state){
    var entry = playbackStart[state.index];
    if(!entry) return;
    addPending(entry.mediaId, entry.startMs, new Date().getTime() - entry.startMs);
    playbackStart[state.index] = null;
  }

  function toPayload(items){
    var events = [];
    for(var i = 0; i < items.length; i++){
      events.push({
        mediaId: items[i][0],
        playedAt: new Date(items[i][1]).toISOString(),
        durationMs: items[i][2]
      });
    }
    return JSON.stringify({ events: events });
  }

  // Sends the oldest batch and drops it only when the server answers. A
  // failed request leaves everything in place for the next attempt.
  function sendPending(){
    if(inFlight > 0 || pending.length === 0) return;
    var batch = pending.slice(0, BATCH_SIZE);
    var done = false;
    inFlight = batch.length;
    function finish(status){
      if(done) return;
      done = true;
      inFlight = 0;
      // Stored, or refused for good (screen removed, bad payload). 408, 429
      // and 5xx are temporary: keep the batch.
      var settled = (status >= 200 && status < 300) ||
        (status >= 400 && status < 500 && status !== 408 && status !== 429);
      if(!settled) return;
      var removed = 0;
      for(var i = 0; i < batch.length; i++){
        if(pending[removed] === batch[i]) removed++;
      }
      pending.splice(0, removed);
      pendingDirty = true;
      savePending();
      // Drain a backlog without tripping the rate limit of the server.
      if(pending.length > 0) setTimeout(sendPending, 1500);
    }
    try{
      var xhr = new XMLHttpRequest();
      xhr.open("POST", PLAYBACK_URL, true);
      xhr.setRequestHeader("Content-Type", "application/json");
      xhr.timeout = 20000;
      xhr.onreadystatechange = function(){ if(xhr.readyState === 4) finish(xhr.status); };
      xhr.onerror = function(){ finish(0); };
      xhr.ontimeout = function(){ finish(0); };
      xhr.send(toPayload(batch));
    }catch(e){ finish(0); }
  }

  // Page is going away: close the plays on screen, save, and make a last
  // attempt for what is not already on its way. Everything also stays in
  // localStorage for the next load; the server skips plays it already has.
  function flushOnExit(){
    var now = new Date().getTime();
    for(var k in playbackStart){
      if(playbackStart[k]){
        addPending(playbackStart[k].mediaId, playbackStart[k].startMs, now - playbackStart[k].startMs);
        playbackStart[k] = null;
      }
    }
    savePending();
    var rest = pending.slice(inFlight, inFlight + BATCH_SIZE);
    if(rest.length === 0 || !navigator.sendBeacon) return;
    try{
      navigator.sendBeacon(PLAYBACK_URL, new Blob([toPayload(rest)], { type: "application/json" }));
    }catch(e){}
  }

  setInterval(function(){ savePending(); sendPending(); }, 20000);
  // Deliver what a previous session left behind soon after boot.
  setTimeout(sendPending, 8000);
  window.addEventListener('pagehide', flushOnExit);

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

  // Output mapping: fits the whole player into a rectangle of the signal,
  // like the scaler of a video processor. Positions come in pixels of the
  // signal (rw x rh) and are converted to this page's own size.
  var currentOutput = null;
  var outputKey = "";
  var outputPollTimer = null;
  var adjustEndsAt = 0;
  var outputGrid = null;

  function buildOutputGrid(){
    outputGrid = document.createElement("div");
    outputGrid.id = "output-grid";
    outputGrid.innerHTML =
      '<div class="og-h"></div><div class="og-v"></div><div class="og-circle"></div>' +
      '<div class="og-corner og-tl"></div><div class="og-corner og-tr"></div>' +
      '<div class="og-corner og-bl"></div><div class="og-corner og-br"></div>' +
      '<div class="og-label"><div class="og-title"></div><div class="og-values"></div>' +
      '<div class="og-hint">Os 4 cantos vermelhos e a borda verde devem aparecer inteiros</div></div>';
    player.appendChild(outputGrid);
  }

  function renderOutput(){
    var o = currentOutput;
    var t = "none";
    if(o && o.on && o.rw > 0 && o.rh > 0){
      var vw = window.innerWidth, vh = window.innerHeight;
      var sx = o.w / o.rw, sy = o.h / o.rh, x = o.x, y = o.y;
      if(o.fit === "contain"){
        var s = Math.min(sx, sy);
        x += (o.w - o.rw * s) / 2;
        y += (o.h - o.rh * s) / 2;
        sx = s; sy = s;
      }
      t = "translate(" + (x / o.rw * vw) + "px," + (y / o.rh * vh) + "px) scale(" + sx + "," + sy + ")";
    }
    player.style.webkitTransform = t;
    player.style.transform = t;
    if(outputGrid){
      var adjusting = !!(o && o.adjusting);
      outputGrid.style.display = adjusting ? "block" : "none";
      if(adjusting){
        outputGrid.getElementsByClassName("og-title")[0].innerHTML = escapeHtml(config.screenName);
        outputGrid.getElementsByClassName("og-values")[0].innerHTML = o.on
          ? "X " + o.x + " &nbsp; Y " + o.y + " &nbsp; L " + o.w + " &nbsp; A " + o.h + " &nbsp; (sinal " + o.rw + " x " + o.rh + ")"
          : "Tela cheia (encaixe desligado)";
      }
    }
  }

  function stopAdjusting(){
    if(outputPollTimer){ clearInterval(outputPollTimer); outputPollTimer = null; }
    if(currentOutput && currentOutput.adjusting){
      currentOutput.adjusting = false;
      outputKey = "";
      renderOutput();
    }
  }

  function setOutput(o){
    if(!o) return;
    var key = [o.on, o.rw, o.rh, o.x, o.y, o.w, o.h, o.fit, o.adjusting].join("|");
    currentOutput = o;
    if(key !== outputKey){
      outputKey = key;
      renderOutput();
    }
    if(o.adjusting){
      // Follow the dashboard closely while someone is aligning the output.
      adjustEndsAt = new Date().getTime() + (o.adjustMs || 0);
      if(!outputPollTimer) outputPollTimer = setInterval(pollOutput, 1000);
    } else {
      stopAdjusting();
    }
  }

  function pollOutput(){
    // The grid must not stay on screen if the connection drops mid-adjustment.
    if(new Date().getTime() > adjustEndsAt){ stopAdjusting(); return; }
    try{
      var xhr = new XMLHttpRequest();
      xhr.open("GET", "/api/player/" + config.token + "/output", true);
      xhr.timeout = 5000;
      xhr.onreadystatechange = function(){
        if(xhr.readyState !== 4 || xhr.status !== 200) return;
        try{
          var data = JSON.parse(xhr.responseText);
          if(data && data.output) setOutput(data.output);
        }catch(e){}
      };
      xhr.send();
    }catch(e){}
  }

  window.addEventListener("resize", renderOutput);

  // Offline mode (opt-in per screen). With it on, this page keeps a copy of
  // itself and of every media it shows in the device's Cache storage, and the
  // service worker (/player-sw.js) serves those copies when the network is
  // gone. With it off, nothing is kept beyond the browser's normal cache.
  var OFFLINE_PAGES = "sf-pages-v1";
  var OFFLINE_MEDIA = "sf-media-v1";
  var offlineStatus = null; // sent in every heartbeat when offline mode is on

  function offlineSupported(){
    return !!(navigator.serviceWorker && window.caches && window.fetch && window.Promise && window.URL);
  }

  function absoluteUrl(path){
    return new URL(path, window.location.href).href;
  }

  // Every file the screen shows: the medias of each zone plus the images
  // inside widgets (the logos of a price table, for instance).
  function offlineMediaUrls(){
    var urls = [];
    function add(src){
      if(!src || src.indexOf("data:") === 0 || src.indexOf("blob:") === 0) return;
      var u = absoluteUrl(src);
      if(urls.indexOf(u) === -1) urls.push(u);
    }
    for(var z = 0; z < zones.length; z++){
      for(var i = 0; i < zones[z].medias.length; i++) add(zones[z].medias[i].fileUrl);
    }
    var tags = ["img", "video"];
    for(var t = 0; t < tags.length; t++){
      var els = player.getElementsByTagName(tags[t]);
      for(var e = 0; e < els.length; e++) add(els[e].getAttribute("src"));
    }
    return urls;
  }

  function updateStorageEstimate(){
    try{
      if(!navigator.storage || !navigator.storage.estimate) return;
      navigator.storage.estimate().then(function(est){
        if(!offlineStatus) return;
        offlineStatus.usage = est && typeof est.usage === "number" ? est.usage : null;
        offlineStatus.quota = est && typeof est.quota === "number" ? est.quota : null;
      })["catch"](function(){});
    }catch(e){}
  }

  // Saves a fresh copy of this page. Offline the request fails and the copy
  // already saved stays as it is.
  function saveOfflinePage(){
    return fetch(config.pagePath, { credentials: "same-origin", cache: "no-store" }).then(function(res){
      if(!res || res.status !== 200) return null;
      return caches.open(OFFLINE_PAGES).then(function(cache){
        return Promise.all([
          cache.put(absoluteUrl(config.pagePath), res.clone()),
          cache.put(absoluteUrl("/player/__last"), res)
        ]);
      });
    })["catch"](function(){});
  }

  // Downloads the medias that are not saved yet, one at a time, and drops the
  // ones this screen no longer shows.
  function saveOfflineMedia(){
    var urls = offlineMediaUrls();
    var status = { supported: true, total: urls.length, cached: 0, failed: 0, full: false, usage: null, quota: null };
    if(offlineStatus){ status.usage = offlineStatus.usage; status.quota = offlineStatus.quota; }
    offlineStatus = status;
    return caches.open(OFFLINE_MEDIA).then(function(cache){
      return cache.keys().then(function(keys){
        var have = {};
        var removals = [];
        for(var k = 0; k < keys.length; k++){
          if(urls.indexOf(keys[k].url) === -1) removals.push(cache["delete"](keys[k]));
          else have[keys[k].url] = true;
        }
        return Promise.all(removals).then(function(){
          var i = 0;
          function next(){
            if(i >= urls.length || status.full) return null;
            var u = urls[i++];
            if(have[u]){ status.cached++; return next(); }
            return fetch(u, { mode: "cors", credentials: "omit" }).then(function(res){
              if(!res || res.status !== 200) throw new Error("download");
              return cache.put(u, res);
            }).then(function(){
              status.cached++;
            }, function(err){
              if(err && err.name === "QuotaExceededError") status.full = true;
              else status.failed++;
            }).then(function(){
              updateStorageEstimate();
              return next();
            });
          }
          return next();
        });
      });
    })["catch"](function(){}).then(updateStorageEstimate);
  }

  var offlineSyncing = false;
  function offlineSync(){
    if(offlineSyncing) return;
    offlineSyncing = true;
    saveOfflinePage().then(saveOfflineMedia).then(function(){ offlineSyncing = false; }, function(){ offlineSyncing = false; });
  }

  function startOffline(){
    if(!offlineSupported()){
      offlineStatus = { supported: false, total: 0, cached: 0, failed: 0, full: false, usage: null, quota: null };
      return;
    }
    try{
      navigator.serviceWorker.register("/player-sw.js", { scope: "/player" })["catch"](function(){});
      // Asks the device not to evict the copy when it runs low on space.
      if(navigator.storage && navigator.storage.persist) navigator.storage.persist()["catch"](function(){});
    }catch(e){}
    offlineSync();
    // Picks up new prices and playlist changes, and retries failed downloads.
    setInterval(offlineSync, 30 * 60 * 1000);
  }

  // Offline mode was switched off (or never on): leave nothing behind.
  function stopOffline(){
    if(!offlineSupported()) return;
    try{
      navigator.serviceWorker.getRegistrations().then(function(regs){
        for(var i = 0; i < regs.length; i++){
          if(regs[i].scope.indexOf("/player") !== -1) regs[i].unregister();
        }
      })["catch"](function(){});
      caches["delete"](OFFLINE_PAGES)["catch"](function(){});
      caches["delete"](OFFLINE_MEDIA)["catch"](function(){});
    }catch(e){}
  }

  // This page came from the saved copy: go back to the live one as soon as
  // the server answers a heartbeat. The wait grows after repeated saved loads
  // so a connection good enough for the heartbeat but too slow for the page
  // doesn't reload in a loop.
  function reloadWhenBackOnline(){
    var loads = 0;
    try{
      loads = parseInt(window.localStorage.getItem("sf_cache_loads") || "0", 10) || 0;
      window.localStorage.setItem("sf_cache_loads", String(loads + 1));
    }catch(e){}
    var waits = [20, 120, 300, 900, 1800];
    setTimeout(function(){ refreshDue = true; }, waits[Math.min(loads, waits.length - 1)] * 1000);
  }

  // INIT
  buildPlayer();
  buildOutputGrid();
  setOutput(config.output);
  if(window.__sfFromCache){
    reloadWhenBackOnline();
  } else {
    try{ window.localStorage.removeItem("sf_cache_loads"); }catch(e){}
  }
  if(config.offline) startOffline(); else stopOffline();
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
