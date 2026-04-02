"use client";

import { useState, useEffect, useCallback, useRef } from "react";

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

export function PlayerView({
  token,
  screenName,
  companyName,
  intervalSeconds,
  autoRefreshMinutes,
  showProgressBar,
  medias,
}: PlayerViewProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [cycle, setCycle] = useState(0);
  const [progress, setProgress] = useState(0);
  const videoRef = useRef<HTMLVideoElement>(null);
  const bootedAtRef = useRef(new Date().toISOString());
  const videoErrorCountRef = useRef(0);

  const current = medias[currentIndex];
  const duration = current?.type === "VIDEO" ? current.durationSeconds : intervalSeconds;

  const goNext = useCallback(function () {
    if (medias.length <= 1) {
      // Single media: bump cycle to force re-render
      setCycle(function (c) { return c + 1; });
    } else {
      setCurrentIndex(function (prev) { return (prev + 1) % medias.length; });
    }
    setProgress(0);
    videoErrorCountRef.current = 0;
  }, [medias.length]);

  // --- Heartbeat ---
  useEffect(function () {
    var heartbeat = function () {
      fetch("/api/player/" + token + "/heartbeat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bootedAt: bootedAtRef.current }),
      })
        .then(function (res) { return res.json(); })
        .then(function (data) {
          if (data.shouldRefresh) {
            window.location.reload();
          }
        })
        .catch(function () { /* ignore */ });
    };

    var initial = setTimeout(heartbeat, 5000);
    var interval = setInterval(heartbeat, 30000);

    return function () {
      clearTimeout(initial);
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

  // --- Image slideshow timer ---
  useEffect(function () {
    if (!current || medias.length === 0) return;
    if (current.type === "VIDEO") return;
    // Single image: no need to cycle
    if (medias.length === 1) return;

    var tickInterval = 50;
    var totalTicks = (duration * 1000) / tickInterval;
    var tick = 0;

    var timer = setInterval(function () {
      tick++;
      setProgress((tick / totalTicks) * 100);
      if (tick >= totalTicks) {
        goNext();
      }
    }, tickInterval);

    return function () { clearInterval(timer); };
  }, [current, currentIndex, cycle, duration, goNext, medias.length]);

  // --- Video error handler ---
  function handleVideoError() {
    videoErrorCountRef.current++;
    if (videoErrorCountRef.current >= 2) {
      goNext();
    } else {
      if (videoRef.current) {
        videoRef.current.load();
        videoRef.current.play().catch(function () { goNext(); });
      }
    }
  }

  // --- Video stall handler ---
  useEffect(function () {
    if (!current || current.type !== "VIDEO" || !videoRef.current) return;

    var stallTimeout: ReturnType<typeof setTimeout>;

    var handleStall = function () {
      stallTimeout = setTimeout(function () { goNext(); }, 10000);
    };

    var handlePlaying = function () {
      clearTimeout(stallTimeout);
    };

    var video = videoRef.current;
    video.addEventListener("stalled", handleStall);
    video.addEventListener("waiting", handleStall);
    video.addEventListener("playing", handlePlaying);

    var maxTime = setTimeout(function () { goNext(); }, (current.durationSeconds + 10) * 1000);

    return function () {
      clearTimeout(stallTimeout);
      clearTimeout(maxTime);
      video.removeEventListener("stalled", handleStall);
      video.removeEventListener("waiting", handleStall);
      video.removeEventListener("playing", handlePlaying);
    };
  }, [current, currentIndex, cycle, goNext]);

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
          <p style={{ color: "rgba(255,255,255,0.2)", fontSize: "12px", marginTop: "8px" }}>Nenhuma mídia ativa no momento</p>
        </div>
      </div>
    );
  }

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
      {/* Media display */}
      {current.type === "IMAGE" ? (
        <img
          key={current.id + "-" + currentIndex + "-" + cycle}
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
          key={current.id + "-" + currentIndex + "-" + cycle}
          src={current.fileUrl}
          autoPlay
          muted
          playsInline
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
        <>
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

            {/* Progress bar */}
            <div style={{ display: "flex", gap: "6px", marginTop: "16px" }}>
              {medias.map(function (_, i) {
                var barWidth = i < currentIndex
                  ? "100%"
                  : i === currentIndex
                  ? progress + "%"
                  : "0%";

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
                      style={{
                        height: "100%",
                        borderRadius: "2px",
                        backgroundColor: "#e87b35",
                        width: barWidth,
                        transition: "width 100ms linear",
                      }}
                    />
                  </div>
                );
              })}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
