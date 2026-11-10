"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const DEFAULT_START_TIME = "00:00";
const DEFAULT_END_TIME = "23:59";

function pad(n: number) {
  return String(n).padStart(2, "0");
}

function localDay(d: Date) {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function localParts(iso: string | null | undefined) {
  if (!iso) return null;
  const d = new Date(iso);
  if (isNaN(d.getTime())) return null;
  return { day: localDay(d), time: `${pad(d.getHours())}:${pad(d.getMinutes())}` };
}

// The browser turns the picked local day + time into a UTC instant, so the
// server (which runs in UTC) never has to guess the user's timezone. The end
// covers its whole minute: "23:59" means until 23:59:59.
function toIso(day: string, time: string, isEnd: boolean) {
  if (!day) return "";
  const d = new Date(`${day}T${time}:${isEnd ? "59.999" : "00.000"}`);
  return isNaN(d.getTime()) ? "" : d.toISOString();
}

const END_BEFORE_START = "O fim precisa ser depois do início.";

interface Props {
  /** ISO instants of an existing media. Omit when creating: starts today at 00:00, no end. */
  defaultStart?: string | null;
  defaultEnd?: string | null;
}

/**
 * Start/end day + time pickers. Submits `startDate` and `endDate` as ISO
 * strings through hidden inputs.
 */
export function MediaScheduleFields({ defaultStart, defaultEnd }: Props) {
  const [startDay, setStartDay] = useState(() => localParts(defaultStart)?.day ?? localDay(new Date()));
  const [startTime, setStartTime] = useState(() => localParts(defaultStart)?.time ?? DEFAULT_START_TIME);
  const [endDay, setEndDay] = useState(() => localParts(defaultEnd)?.day ?? "");
  const [endTime, setEndTime] = useState(() => localParts(defaultEnd)?.time ?? DEFAULT_END_TIME);

  const startIso = toIso(startDay, startTime || DEFAULT_START_TIME, false);
  const endIso = toIso(endDay, endTime || DEFAULT_END_TIME, true);
  const endBeforeStart = !!startIso && !!endIso && new Date(endIso) <= new Date(startIso);

  // Native validity blocks the submit in the browser, so the form keeps
  // everything the user typed instead of round-tripping to the server.
  const endDayRef = useRef<HTMLInputElement>(null);
  useEffect(() => {
    endDayRef.current?.setCustomValidity(endBeforeStart ? END_BEFORE_START : "");
  }, [endBeforeStart]);

  const inputClass = "bg-background/50 border-border/50";

  return (
    <div className="space-y-4">
      <input type="hidden" name="startDate" value={startIso} />
      <input type="hidden" name="endDate" value={endIso} />

      <div className="space-y-2">
        <Label htmlFor="startDay">Início da exibição</Label>
        <div className="flex gap-2">
          <Input
            id="startDay"
            type="date"
            value={startDay}
            onChange={(e) => setStartDay(e.target.value)}
            className={`flex-1 min-w-0 ${inputClass}`}
          />
          <Input
            type="time"
            aria-label="Hora de início"
            value={startTime}
            onChange={(e) => setStartTime(e.target.value)}
            className={`w-28 shrink-0 ${inputClass}`}
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="endDay">Fim da exibição (opcional)</Label>
        <div className="flex gap-2">
          <Input
            ref={endDayRef}
            id="endDay"
            type="date"
            value={endDay}
            onChange={(e) => setEndDay(e.target.value)}
            className={`flex-1 min-w-0 ${inputClass}`}
          />
          <Input
            type="time"
            aria-label="Hora de fim"
            value={endTime}
            onChange={(e) => setEndTime(e.target.value)}
            disabled={!endDay}
            className={`w-28 shrink-0 ${inputClass}`}
          />
        </div>
        {endBeforeStart ? (
          <p className="text-[11px] text-red-400">{END_BEFORE_START}</p>
        ) : (
          <p className="text-[11px] text-muted-foreground">
            {endDay
              ? "A mídia sai do ar sozinha no dia e hora de fim."
              : "Sem data de fim, a mídia fica no ar até ser desativada."}
          </p>
        )}
      </div>
    </div>
  );
}

const subscribeNever = () => () => {};

function formatLocal(iso: string) {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "";
  return d
    .toLocaleString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    })
    .replace(",", "");
}

/**
 * Date + time in the viewer's own timezone. Renders empty on the server and
 * fills in on the client so the UTC server never causes a hydration mismatch.
 */
export function LocalDateTime({ iso }: { iso: string }) {
  const text = useSyncExternalStore(subscribeNever, () => formatLocal(iso), () => "");
  return <>{text}</>;
}
