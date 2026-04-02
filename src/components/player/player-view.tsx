"use client";

import { useState, useEffect, useRef } from "react";

interface Media {
  id: string;
  type: "IMAGE" | "VIDEO";
  fileUrl: string;
  title: string;
  durationSeconds: number;
}

interface PlayerViewProps {
  token: string;
  screenName: string;
  companyName: string;
  intervalSeconds: number;
  autoRefreshMinutes: number;
  showProgressBar: boolean;
  medias: Media[];
}

export function PlayerView(props: PlayerViewProps) {
  var token = props.token;
  var screenName = props.screenName;
  var companyName = props.companyName;
  var intervalSeconds = props.intervalSeconds;
  var autoRefreshMinutes = props.autoRefreshMinutes;
  var showProgressBar = props.showProgressBar;
  var medias = props.medias;

  var indexRef = useRef(0);
  var cycleRef = useRef(0);
  var timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  var progressTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  var progressBarRef = useRef<HTMLDivElement | null>(null);
  var videoRef = useRef<HTMLVideoElement | null>(null);
  var bootedAtRef = useRef(new Date().toISOString());
  var videoErrorCountRef = useRef(0);

  // Force re-render trigger
  var renderState = useState(0);
  var forceRender = function () {
    renderState[1](function (n) { return n + 1; });
  };

  var currentIndex = indexRef.current;
  var current = medias[currentIndex];
  var duration = current
    ? (current.type === "VIDEO" ? current.durationSeconds : intervalSeconds)
    : intervalSeconds;

  // --- Go to next media ---
  function goNext() {
    clearAllTimers();
    videoErrorCountRef.current = 0;

    if (medias.length <= 1) {
      cycleRef.current = cycleRef.current + 1;
    } else {
      indexRef.current = (indexRef.current + 1) % medias.length;
    }

    forceRender();
  }

  function clearAllTimers() {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    if (progressTimerRef.current) {
      clearTimeout(progressTimerRef.current);
      progressTimerRef.current = null;
    }
  }

  // --- Heartbeat ---
  useEffect(function () {
    function heartbeat() {
      try {
        var xhr = new XMLHttpRequest();
        xhr.open("POST", "/api/player/" + token + "/heartbeat", true);
        xhr.setRequestHeader("Content-Type", "application/json");
        xhr.onload = function () {
          try {
            var data = JSON.parse(xhr.responseText);
            if (data && data.shouldRefresh) {
              window.location.reload();
            }
          } catch (e) { /* ignore parse errors */ }
        };
        xhr.send(JSON.stringify({ bootedAt: bootedAtRef.current }));
      } catch (e) { /* ignore */ }
    }

    var initialTimer = setTimeout(heartbeat, 5000);
    var interval = setInterval(heartbeat, 30000);

    return function () {
      clearTimeout(initialTimer);
      clearInterval(interval);
    };
  }, [token]);

  // --- Auto-refresh ---
  useEffect(function () {
    if (autoRefreshMinutes <= 0) return;
    var timeout = setTimeout(function () {
      window.location.reload();
    }, autoRefreshMinutes * 60 * 1000);
    return function () { clearTimeout(timeout); };
  }, [autoRefreshMinutes]);

  // --- Image slideshow timer (setTimeout chain, not setInterval) ---
  useEffect(function () {
    if (!current || medias.length === 0) return;
    if (current.type === "VIDEO") return;
    // Single image: no timer needed
    if (medias.length <= 1) return;

    var cancelled = false;
    var durationMs = duration * 1000;
    var startTime = Date.now();

    // Progress animation via direct DOM manipulation (no React re-renders)
    function animateProgress() {
      if (cancelled) return;
      var elapsed = Date.now() - startTime;
      var pct = Math.min((elapsed / durationMs) * 100, 100);

      // Update all progress bars via DOM
      var bars = document.querySelectorAll("[data-progress-bar]");
      for (var i = 0; i < bars.length; i++) {
        var bar = bars[i] as HTMLElement;
        var barIndex = parseInt(bar.getAttribute("data-progress-bar") || "0", 10);
        if (barIndex < indexRef.current) {
          bar.style.width = "100%";
        } else if (barIndex === indexRef.current) {
          bar.style.width = pct + "%";
        } else {
          bar.style.width = "0%";
        }
      }

      if (elapsed < durationMs) {
        progressTimerRef.current = setTimeout(animateProgress, 50);
      }
    }

    // Main advance timer using setTimeout (more reliable than setInterval on WebOS)
    timerRef.current = setTimeout(function () {
      if (!cancelled) {
        goNext();
      }
    }, durationMs);

    // Start progress animation
    if (showProgressBar) {
      progressTimerRef.current = setTimeout(animateProgress, 50);
    }

    return function () {
      cancelled = true;
      clearAllTimers();
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentIndex, cycleRef.current, medias.length, duration, showProgressBar]);

  // --- Video error handler ---
  function handleVideoError() {
    videoErrorCountRef.current = videoErrorCountRef.current + 1;
    if (videoErrorCountRef.current >= 2) {
      goNext();
    } else {
      if (videoRef.current) {
        videoRef.current.load();
        try {
          videoRef.current.play();
        } catch (e) {
          goNext();
        }
      }
    }
  }

  // --- Video stall handler ---
  useEffect(function () {
    if (!current || current.type !== "VIDEO" || !videoRef.current) return;

    var stallTimeout: ReturnType<typeof setTimeout> | null = null;
    var video = videoRef.current;

    function handleStall() {
      if (stallTimeout) clearTimeout(stallTimeout);
      stallTimeout = setTimeout(function () { goNext(); }, 10000);
    }

    function handlePlaying() {
      if (stallTimeout) {
        clearTimeout(stallTimeout);
        stallTimeout = null;
      }
    }

    video.addEventListener("stalled", handleStall);
    video.addEventListener("waiting", handleStall);
    video.addEventListener("playing", handlePlaying);

    // Max timeout as safety net
    var maxTime = setTimeout(function () { goNext(); }, (current.durationSeconds + 10) * 1000);

    return function () {
      if (stallTimeout) clearTimeout(stallTimeout);
      clearTimeout(maxTime);
      video.removeEventListener("stalled", handleStall);
      video.removeEventListener("waiting", handleStall);
      video.removeEventListener("playing", handlePlaying);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentIndex, cycleRef.current]);

  // --- Video progress tracking ---
  useEffect(function () {
    if (!current || current.type !== "VIDEO" || !showProgressBar) return;
    if (!videoRef.current) return;

    var cancelled = false;
    var video = videoRef.current;

    function updateVideoProgress() {
      if (cancelled) return;
      if (video.duration && video.duration > 0) {
        var pct = (video.currentTime / video.duration) * 100;
        var bars = document.querySelectorAll("[data-progress-bar]");
        for (var i = 0; i < bars.length; i++) {
          var bar = bars[i] as HTMLElement;
          var barIndex = parseInt(bar.getAttribute("data-progress-bar") || "0", 10);
          if (barIndex < indexRef.current) {
            bar.style.width = "100%";
          } else if (barIndex === indexRef.current) {
            bar.style.width = pct + "%";
          } else {
            bar.style.width = "0%";
          }
        }
      }
      setTimeout(updateVideoProgress, 100);
    }

    setTimeout(updateVideoProgress, 200);

    return function () { cancelled = true; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentIndex, cycleRef.current, showProgressBar]);

  // --- Empty state ---
  if (medias.length === 0) {
    return (
      <div
        style={{
          position: "fixed",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          width: "100%",
          height: "100%",
          backgroundColor: "#000",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          margin: 0,
          padding: 0,
          overflow: "hidden",
        }}
      >
        <div style={{ textAlign: "center" }}>
          <h1 style={{ color: "#fff", fontSize: "24px", fontWeight: "bold" }}>{screenName}</h1>
          <p style={{ color: "rgba(255,255,255,0.4)", fontSize: "14px", marginTop: "8px" }}>{companyName}</p>
          <p style={{ color: "rgba(255,255,255,0.2)", fontSize: "12px", marginTop: "8px" }}>Nenhuma midia ativa no momento</p>
        </div>
      </div>
    );
  }

  var mediaKey = current.id + "-" + currentIndex + "-" + cycleRef.current;

  return (
    <div
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        width: "100vw",
        height: "100vh",
        backgroundColor: "#000",
        overflow: "hidden",
        cursor: "none",
        margin: 0,
        padding: 0,
      }}
    >
      {current.type === "IMAGE" ? (
        <img
          key={mediaKey}
          src={current.fileUrl}
          alt={current.title}
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            width: "100%",
            height: "100%",
            objectFit: "contain",
            display: "block",
            margin: 0,
            padding: 0,
          }}
        />
      ) : (
        <video
          ref={videoRef}
          key={mediaKey}
          src={current.fileUrl}
          autoPlay={true}
          playsInline={true}
          onEnded={goNext}
          onError={handleVideoError}
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            width: "100%",
            height: "100%",
            objectFit: "contain",
            display: "block",
            margin: 0,
            padding: 0,
          }}
        />
      )}

      {showProgressBar && (
        <div>
          {/* Overlay gradient */}
          <div
            style={{
              position: "absolute",
              left: 0,
              right: 0,
              bottom: 0,
              height: "120px",
              background: "linear-gradient(to top, rgba(0,0,0,0.7), transparent)",
              pointerEvents: "none",
            }}
          />

          {/* Bottom info bar */}
          <div
            style={{
              position: "absolute",
              left: 0,
              right: 0,
              bottom: 0,
              padding: "24px",
            }}
          >
            <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between" }}>
              <div>
                <p style={{ color: "rgba(255,255,255,0.9)", fontSize: "18px", fontWeight: 600, margin: 0 }}>
                  {current.title}
                </p>
                <p style={{ color: "rgba(255,255,255,0.4)", fontSize: "14px", marginTop: "2px" }}>
                  {screenName} — {companyName}
                </p>
              </div>
              <div style={{ color: "rgba(255,255,255,0.3)", fontSize: "12px" }}>
                {currentIndex + 1} / {medias.length}
              </div>
            </div>

            {/* Progress bars */}
            <div style={{ display: "flex", gap: "6px", marginTop: "16px" }}>
              {medias.map(function (_, i) {
                return (
                  <div
                    key={i}
                    style={{
                      flex: 1,
                      height: "4px",
                      borderRadius: "2px",
                      backgroundColor: "rgba(255,255,255,0.1)",
                      overflow: "hidden",
                    }}
                  >
                    <div
                      data-progress-bar={i}
                      style={{
                        height: "100%",
                        borderRadius: "2px",
                        backgroundColor: "#e87b35",
                        width: i < currentIndex ? "100%" : "0%",
                      }}
                    />
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
