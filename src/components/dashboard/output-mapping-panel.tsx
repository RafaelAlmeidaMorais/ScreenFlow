"use client";

import { useEffect, useRef, useState } from "react";
import { saveOutputMapping } from "@/app/dashboard/screens/actions";
import { Switch } from "@/components/ui/switch";
import { LocalDateTime } from "@/components/dashboard/media-schedule-fields";
import {
  ADJUST_MODE_MINUTES,
  OUTPUT_SIGNALS,
  parseOutputMapping,
  type OutputFit,
  type OutputMapping,
  type PlayerDisplay,
} from "@/lib/output-mapping";

type Draft = Omit<OutputMapping, "adjustUntil">;

interface ZoneShare {
  label: string;
  /** Share of the screen, in percent. */
  width: number;
  height: number;
}

interface Props {
  screenId: string;
  initial: Draft;
  /** Time left of an adjust mode that was already on when the page loaded. */
  initialAdjustMs: number;
  /** How the TV box last said it draws the page. Null until a player with this version reports. */
  display: PlayerDisplay | null;
  /** Zones of the screen's layout, to show the art size of each one. */
  zones: ZoneShare[];
}

const NATIVE_FITS: { value: OutputFit; label: string; hint: string }[] = [
  { value: "contain", label: "Manter", hint: "Cada mídia mantém a proporção; se não for do formato da área, sobra faixa preta." },
  { value: "cover", label: "Preencher", hint: "Cada mídia preenche a área sem distorcer; o que passar das bordas é cortado." },
  { value: "stretch", label: "Esticar", hint: "Cada mídia é achatada ou esticada para preencher a área inteira." },
];

const LEGACY_FITS: { value: OutputFit; label: string; hint: string }[] = [
  { value: "stretch", label: "Esticar", hint: "A imagem é achatada para preencher a área inteira." },
  { value: "contain", label: "Manter proporção", hint: "A imagem mantém a proporção; pode sobrar faixa preta dentro da área." },
];

const STEPS = [1, 10, 50];

export function OutputMappingPanel({ screenId, initial, initialAdjustMs, display, zones }: Props) {
  const [m, setM] = useState<Draft>(initial);
  const [adjusting, setAdjusting] = useState(initialAdjustMs > 0);
  const [adjustMs, setAdjustMs] = useState(initialAdjustMs);
  const [step, setStep] = useState(1);
  const [status, setStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");

  // Nothing is sent until the user changes something.
  const dirty = useRef(false);
  const saveSeq = useRef(0);

  function update(patch: Partial<Draft>) {
    dirty.current = true;
    setM((prev) => {
      const next = parseOutputMapping({ ...prev, ...patch });
      if (!next) return prev;
      const { adjustUntil: _unused, ...draft } = next;
      void _unused;
      return draft;
    });
  }

  function toggleAdjusting(on: boolean) {
    dirty.current = true;
    setAdjusting(on);
  }

  // Save shortly after the last change, so holding a nudge button doesn't
  // send one request per click.
  useEffect(() => {
    if (!dirty.current) return;
    const timer = setTimeout(async () => {
      const seq = ++saveSeq.current;
      setStatus("saving");
      try {
        const res = await saveOutputMapping(screenId, m, adjusting);
        if (seq !== saveSeq.current) return;
        setStatus("saved");
        setAdjustMs(res.adjustUntil ? new Date(res.adjustUntil).getTime() - Date.now() : 0);
      } catch {
        if (seq === saveSeq.current) setStatus("error");
      }
    }, 350);
    return () => clearTimeout(timer);
  }, [m, adjusting, screenId]);

  // The TV drops the grid by itself when the adjust window ends; mirror that here.
  useEffect(() => {
    if (!adjusting || adjustMs <= 0) return;
    const timer = setTimeout(() => setAdjusting(false), adjustMs);
    return () => clearTimeout(timer);
  }, [adjusting, adjustMs]);

  function changeSignal(value: string) {
    const signal = OUTPUT_SIGNALS.find((s) => `${s.width}x${s.height}` === value);
    if (!signal) return;
    // Keep the rectangle in the same place of the picture at the new scale.
    const kx = signal.width / m.refWidth;
    const ky = signal.height / m.refHeight;
    update({
      refWidth: signal.width,
      refHeight: signal.height,
      x: m.x * kx,
      y: m.y * ky,
      width: m.width * kx,
      height: m.height * ky,
    });
  }

  // A mapping made with the first version keeps working as it was until the
  // user moves it to the new mode, which needs the area adjusted again.
  function switchToNative() {
    update({ mode: "native", fit: "contain" });
    toggleAdjusting(true);
  }

  const signalValue = `${m.refWidth}x${m.refHeight}`;
  const knownSignal = OUTPUT_SIGNALS.some((s) => `${s.width}x${s.height}` === signalValue);
  const isFull = m.x === 0 && m.y === 0 && m.width === m.refWidth && m.height === m.refHeight;
  const portrait = m.refHeight > m.refWidth;
  const native = m.mode === "native";
  const fits = native ? NATIVE_FITS : LEGACY_FITS;
  const fitHint = fits.find((f) => f.value === m.fit)?.hint ?? "";
  // The page drawn with fewer pixels than the signal means the TV box blows
  // the picture up on the way out.
  const drawsLess =
    !!display &&
    (Math.max(display.pixelWidth, display.pixelHeight) < Math.max(m.refWidth, m.refHeight) - 1 ||
      Math.min(display.pixelWidth, display.pixelHeight) < Math.min(m.refWidth, m.refHeight) - 1);

  return (
    <div className="rounded-2xl border border-border/50 bg-card/50 backdrop-blur-sm p-5">
      <div className="flex items-center justify-between gap-3">
        <h3 className="text-sm font-semibold">Encaixe da saída</h3>
        <Switch
          aria-label="Ativar encaixe da saída"
          checked={m.enabled}
          onCheckedChange={(on) => {
            // Nothing on air depends on an old mapping that was switched off.
            update(on && !native ? { enabled: on, mode: "native", fit: "contain" } : { enabled: on });
            if (!on) setAdjusting(false);
          }}
        />
      </div>
      <p className="text-xs text-muted-foreground mt-1">
        Posiciona e redimensiona a imagem dentro do sinal da TV box, como numa processadora.
      </p>

      {m.enabled && (
        <div className="space-y-4 mt-4">
          {!native && (
            <div className="rounded-xl border border-amber-500/30 bg-amber-500/5 px-3 py-2.5 text-xs space-y-2">
              <p className="text-amber-200/90">
                Esta tela usa o encaixe antigo: o player monta a tela no tamanho do sinal inteiro e
                depois reduz tudo para caber na área, o que perde nitidez.
              </p>
              <p className="text-muted-foreground">
                No modo novo a tela é montada direto no tamanho da área, como se o painel fosse a
                tela. Ao mudar, ajuste X, Y, Largura e Altura de novo para coincidir com o painel.
              </p>
              <button
                type="button"
                onClick={switchToNative}
                className="h-8 px-3 rounded-md border border-amber-500/40 text-amber-200 hover:bg-amber-500/10 font-medium cursor-pointer"
              >
                Usar o modo novo
              </button>
            </div>
          )}

          <div>
            <label htmlFor="output-signal" className="text-xs text-muted-foreground block mb-1">
              Resolução de saída da TV box (HDMI)
            </label>
            <select
              id="output-signal"
              value={signalValue}
              onChange={(e) => changeSignal(e.target.value)}
              className="w-full h-9 rounded-lg border border-border/50 bg-background px-2 text-sm"
            >
              {!knownSignal && (
                <option value={signalValue}>
                  {m.refWidth} × {m.refHeight}
                </option>
              )}
              {OUTPUT_SIGNALS.map((s) => (
                <option key={s.label} value={`${s.width}x${s.height}`}>
                  {s.label}
                </option>
              ))}
            </select>
            <p className="text-[11px] text-muted-foreground/70 mt-1">
              Use a resolução configurada no Android da TV box. Os valores abaixo são em pixels
              deste sinal.
            </p>
          </div>

          {/* Where the picture lands inside the signal */}
          <div
            aria-hidden="true"
            className="relative mx-auto rounded-md border border-border/60 bg-black overflow-hidden"
            style={{
              width: portrait ? "45%" : "100%",
              aspectRatio: `${m.refWidth} / ${m.refHeight}`,
            }}
          >
            <div
              className="absolute border border-orange bg-orange/25"
              style={{
                left: `${(m.x / m.refWidth) * 100}%`,
                top: `${(m.y / m.refHeight) * 100}%`,
                width: `${(m.width / m.refWidth) * 100}%`,
                height: `${(m.height / m.refHeight) * 100}%`,
              }}
            />
          </div>

          <div className="space-y-2">
            <Stepper label="X (esquerda)" value={m.x} step={step} onChange={(x) => update({ x })} />
            <Stepper label="Y (topo)" value={m.y} step={step} onChange={(y) => update({ y })} />
            <Stepper label="Largura" value={m.width} step={step} onChange={(width) => update({ width })} />
            <Stepper label="Altura" value={m.height} step={step} onChange={(height) => update({ height })} />
          </div>

          <div className="flex items-center justify-between gap-2">
            <span className="text-xs text-muted-foreground">Passo</span>
            <div className="flex gap-1">
              {STEPS.map((s) => (
                <SegmentButton key={s} active={step === s} onClick={() => setStep(s)}>
                  {s} px
                </SegmentButton>
              ))}
            </div>
          </div>

          <div>
            <div className="text-xs text-muted-foreground mb-1">
              {native ? "Mídias na área" : "Conteúdo"}
            </div>
            <div className={`grid gap-1 ${native ? "grid-cols-3" : "grid-cols-2"}`}>
              {fits.map((f) => (
                <SegmentButton key={f.value} active={m.fit === f.value} onClick={() => update({ fit: f.value })}>
                  {f.label}
                </SegmentButton>
              ))}
            </div>
            <p className="text-[11px] text-muted-foreground/70 mt-1">{fitHint}</p>
          </div>

          {native && (
            <div className="rounded-xl border border-border/50 bg-background/50 px-3 py-2.5 text-xs space-y-1.5">
              <div className="flex items-center justify-between gap-2">
                <span className="text-muted-foreground">Tamanho ideal da arte</span>
                <span className="font-semibold tabular-nums">
                  {m.width} × {m.height} px
                </span>
              </div>
              {zones.length > 1 &&
                zones.map((z) => (
                  <div key={z.label} className="flex items-center justify-between gap-2 pl-2">
                    <span className="text-muted-foreground truncate">{z.label}</span>
                    <span className="tabular-nums">
                      {Math.round((m.width * z.width) / 100)} × {Math.round((m.height * z.height) / 100)} px
                    </span>
                  </div>
                ))}
              <p className="text-muted-foreground/70">
                Com a arte neste tamanho, ela é exibida pixel a pixel, sem ser redimensionada.
              </p>
            </div>
          )}

          <div className="rounded-xl border border-border/50 bg-background/50 px-3 py-2.5 text-xs space-y-1">
            {display ? (
              <>
                <div className="flex items-center justify-between gap-2">
                  <span className="text-muted-foreground">A TV box desenha em</span>
                  <span className={`font-semibold tabular-nums ${drawsLess ? "text-amber-300" : "text-emerald-400"}`}>
                    {display.pixelWidth} × {display.pixelHeight} px
                  </span>
                </div>
                <p className={drawsLess ? "text-amber-200/90" : "text-muted-foreground/70"}>
                  {drawsLess
                    ? `Menos que a saída escolhida (${m.refWidth} × ${m.refHeight}): a TV box amplia a imagem ao enviar para a tela e ela perde nitidez. Veja a resolução de tela nas configurações do Android da TV box.`
                    : "Igual ou maior que a saída escolhida: a TV box não precisa ampliar a imagem."}
                </p>
                <p className="text-muted-foreground/60">
                  Informado pela TV em <LocalDateTime iso={display.at} />
                </p>
              </>
            ) : (
              <p className="text-muted-foreground">
                Aguardando a TV informar em que resolução desenha. Aparece em até 30 segundos depois
                que o player carregar esta versão.
              </p>
            )}
          </div>

          <div>
            <button
              type="button"
              aria-pressed={adjusting}
              onClick={() => toggleAdjusting(!adjusting)}
              className={`w-full h-9 rounded-lg border text-sm font-medium cursor-pointer transition-colors ${
                adjusting
                  ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/30"
                  : "border-border/50 hover:bg-muted/50"
              }`}
            >
              {adjusting ? "Esconder grade de teste" : "Mostrar grade de teste na TV"}
            </button>
            <p className="text-[11px] text-muted-foreground/70 mt-1">
              {adjusting
                ? `A grade aparece na TV em até 30 segundos. Com ela ligada, cada ajuste chega em cerca de 1 segundo. Ela some sozinha ${ADJUST_MODE_MINUTES} minutos depois do último ajuste.`
                : "Sem a grade, as mudanças chegam à TV em até 30 segundos."}
            </p>
          </div>

          {!isFull && (
            <button
              type="button"
              onClick={() => update({ x: 0, y: 0, width: m.refWidth, height: m.refHeight })}
              className="text-xs text-muted-foreground hover:text-foreground underline underline-offset-2 cursor-pointer"
            >
              Voltar para tela cheia
            </button>
          )}
        </div>
      )}

      <p
        role="status"
        className={`text-[11px] mt-3 min-h-4 ${status === "error" ? "text-red-400" : "text-muted-foreground/70"}`}
      >
        {status === "saving" && "Salvando..."}
        {status === "saved" && "Salvo"}
        {status === "error" && "Erro ao salvar. Tente de novo."}
      </p>
    </div>
  );
}

function SegmentButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={`h-8 px-2 rounded-md border text-xs font-medium whitespace-nowrap cursor-pointer transition-colors ${
        active
          ? "bg-orange/10 text-orange border-orange/30"
          : "border-border/50 text-muted-foreground hover:text-foreground hover:bg-muted/50"
      }`}
    >
      {children}
    </button>
  );
}

function Stepper({
  label,
  value,
  step,
  onChange,
}: {
  label: string;
  value: number;
  step: number;
  onChange: (value: number) => void;
}) {
  // While focused the field shows what is being typed and commits on blur or
  // Enter. A half-typed number ("5" on the way to "500") is never applied.
  const [editing, setEditing] = useState(false);
  const [text, setText] = useState("");

  function commit() {
    setEditing(false);
    const n = Number(text);
    if (text.trim() !== "" && Number.isFinite(n) && n !== value) onChange(n);
  }

  const id = `output-${label.replace(/[^a-z]/gi, "").toLowerCase()}`;
  const buttonClass =
    "w-8 h-8 shrink-0 rounded-md border border-border/50 text-sm text-muted-foreground hover:text-foreground hover:bg-muted/50 cursor-pointer";

  return (
    <div className="flex items-center justify-between gap-2">
      <label htmlFor={id} className="text-xs text-muted-foreground">
        {label}
      </label>
      <div className="flex items-center gap-1">
        <button
          type="button"
          aria-label={`Diminuir ${label}`}
          onClick={() => onChange(value - step)}
          className={buttonClass}
        >
          −
        </button>
        <input
          id={id}
          inputMode="numeric"
          value={editing ? text : String(value)}
          onFocus={() => {
            setText(String(value));
            setEditing(true);
          }}
          onChange={(e) => setText(e.target.value)}
          onBlur={commit}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.currentTarget.blur();
            } else if (e.key === "ArrowUp" || e.key === "ArrowDown") {
              e.preventDefault();
              const next = value + (e.key === "ArrowUp" ? step : -step);
              setText(String(next));
              onChange(next);
            }
          }}
          className="w-16 h-8 rounded-md border border-border/50 bg-background px-2 text-sm text-center tabular-nums"
        />
        <button
          type="button"
          aria-label={`Aumentar ${label}`}
          onClick={() => onChange(value + step)}
          className={buttonClass}
        >
          +
        </button>
      </div>
    </div>
  );
}
