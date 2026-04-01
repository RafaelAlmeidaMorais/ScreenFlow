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
  const [progress, setProgress] = useState(0);
  const videoRef = useRef<HTMLVideoElement>(null);
  const bootedAtRef = useRef(new Date().toISOString());
  const videoErrorCountRef = useRef(0);

  const current = medias[currentIndex];
  const duration = current?.type === "VIDEO" ? current.durationSeconds : intervalSeconds;

  const goNext = useCallback(() => {
    setCurrentIndex((prev) => (prev + 1) % medias.length);
    setProgress(0);
    videoErrorCountRef.current = 0;
  }, [medias.length]);

  // --- Heartbeat: polls server every 30s ---
  useEffect(() => {
    const heartbeat = async () => {
      try {
        const res = await fetch(`/api/player/${token}/heartbeat`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ bootedAt: bootedAtRef.current }),
        });
        const data = await res.json();

        if (data.shouldRefresh) {
          window.location.reload();
        }
      } catch {
        // Silently ignore network errors
      }
    };

    // First heartbeat after 5s
    const initial = setTimeout(heartbeat, 5000);
    const interval = setInterval(heartbeat, 30000);

    return () => {
      clearTimeout(initial);
      clearInterval(interval);
    };
  }, [token]);

  // --- Auto-refresh preventivo ---
  useEffect(() => {
    if (autoRefreshMinutes <= 0) return;
    const timeout = setTimeout(() => {
      window.location.reload();
    }, autoRefreshMinutes * 60 * 1000);

    return () => clearTimeout(timeout);
  }, [autoRefreshMinutes]);

  // --- Image slideshow timer ---
  useEffect(() => {
    if (!current || medias.length === 0) return;
    if (current.type === "VIDEO") return;

    const tick_interval = 50;
    const totalTicks = (duration * 1000) / tick_interval;
    let tick = 0;

    const timer = setInterval(() => {
      tick++;
      setProgress((tick / totalTicks) * 100);
      if (tick >= totalTicks) {
        goNext();
      }
    }, tick_interval);

    return () => clearInterval(timer);
  }, [current, currentIndex, duration, goNext, medias.length]);

  // --- Video error handler: skip after 2 retries ---
  function handleVideoError() {
    videoErrorCountRef.current++;
    if (videoErrorCountRef.current >= 2) {
      goNext();
    } else {
      // Retry: reload the video
      if (videoRef.current) {
        videoRef.current.load();
        videoRef.current.play().catch(() => goNext());
      }
    }
  }

  // --- Video stall handler: if stalled for 10s, skip ---
  useEffect(() => {
    if (!current || current.type !== "VIDEO" || !videoRef.current) return;

    let stallTimeout: ReturnType<typeof setTimeout>;

    const handleStall = () => {
      stallTimeout = setTimeout(() => {
        goNext();
      }, 10000);
    };

    const handlePlaying = () => {
      clearTimeout(stallTimeout);
    };

    const video = videoRef.current;
    video.addEventListener("stalled", handleStall);
    video.addEventListener("waiting", handleStall);
    video.addEventListener("playing", handlePlaying);

    // Safety timeout: if video exceeds duration + 10s, force skip
    const maxTime = setTimeout(() => {
      goNext();
    }, (current.durationSeconds + 10) * 1000);

    return () => {
      clearTimeout(stallTimeout);
      clearTimeout(maxTime);
      video.removeEventListener("stalled", handleStall);
      video.removeEventListener("waiting", handleStall);
      video.removeEventListener("playing", handlePlaying);
    };
  }, [current, currentIndex, goNext]);

  if (medias.length === 0) {
    return (
      <div className="fixed inset-0 bg-black flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-orange/10 border border-orange/20">
            <svg className="w-10 h-10 text-orange" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 20.25h12m-7.5-3v3m3-3v3m-10.125-3h17.25c.621 0 1.125-.504 1.125-1.125V4.875c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125Z" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-white">{screenName}</h1>
          <p className="text-white/40">{companyName}</p>
          <p className="text-white/20 text-sm">Nenhuma mídia ativa no momento</p>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black overflow-hidden cursor-none">
      {/* Media display */}
      {current.type === "IMAGE" ? (
        <img
          key={current.id + currentIndex}
          src={current.fileUrl}
          alt={current.title}
          className="w-full h-full object-cover animate-in fade-in duration-700"
        />
      ) : (
        <video
          ref={videoRef}
          key={current.id + currentIndex}
          src={current.fileUrl}
          autoPlay
          muted
          playsInline
          onEnded={goNext}
          onError={handleVideoError}
          className="w-full h-full object-cover"
        />
      )}

      {showProgressBar && (
        <>
          {/* Overlay gradient bottom */}
          <div className="absolute inset-x-0 bottom-0 h-32 bg-gradient-to-t from-black/70 to-transparent pointer-events-none" />

          {/* Bottom info bar */}
          <div className="absolute inset-x-0 bottom-0 p-6">
            <div className="flex items-end justify-between">
              <div>
                <p className="text-white/90 text-lg font-semibold">{current.title}</p>
                <p className="text-white/40 text-sm mt-0.5">
                  {screenName} — {companyName}
                </p>
              </div>
              <div className="text-white/30 text-xs">
                {currentIndex + 1} / {medias.length}
              </div>
            </div>

            {/* Progress bar */}
            <div className="flex gap-1.5 mt-4">
              {medias.map((_, i) => (
                <div key={i} className="flex-1 h-1 rounded-full bg-white/10 overflow-hidden">
                  <div
                    className="h-full rounded-full bg-orange transition-all duration-100 ease-linear"
                    style={{
                      width:
                        i < currentIndex
                          ? "100%"
                          : i === currentIndex
                          ? `${progress}%`
                          : "0%",
                    }}
                  />
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
