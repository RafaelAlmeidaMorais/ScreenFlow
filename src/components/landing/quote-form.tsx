"use client";

import { useActionState } from "react";
import { CircleCheck, LoaderCircle, Send } from "lucide-react";
import { requestQuote, type QuoteState } from "@/app/actions/quote";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

const initialState: QuoteState = { status: "idle" };

const inputClass =
  "h-11 bg-background/50 border-border/60 focus-visible:border-orange/50 focus-visible:ring-orange/20 placeholder:text-muted-foreground/40";

const selectClass =
  "h-11 w-full rounded-lg border border-border/60 bg-background/50 px-2.5 text-base md:text-sm text-foreground outline-none transition-colors focus-visible:border-orange/50 focus-visible:ring-3 focus-visible:ring-orange/20 dark:bg-input/30";

export function QuoteForm() {
  const [state, formAction, pending] = useActionState(requestQuote, initialState);

  if (state.status === "success") {
    return (
      <div className="flex flex-col items-center justify-center text-center py-16 px-6">
        <div className="w-14 h-14 rounded-full bg-orange/10 border border-orange/30 flex items-center justify-center mb-5">
          <CircleCheck className="w-7 h-7 text-orange" />
        </div>
        <h3 className="text-xl font-semibold">Pedido enviado!</h3>
        <p className="mt-2 text-sm text-muted-foreground max-w-sm">
          Recebemos suas informações. Nossa equipe entra em contato em até 1 dia útil
          com uma proposta sob medida.
        </p>
      </div>
    );
  }

  const err = state.fieldErrors ?? {};
  const v = state.values;

  return (
    <form action={formAction} className="space-y-5" noValidate>
      {/* Honeypot */}
      <div className="hidden" aria-hidden="true">
        <label>
          Website <input type="text" name="website" tabIndex={-1} autoComplete="off" />
        </label>
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        <Field id="name" label="Nome *" error={err.name}>
          <Input id="name" name="name" defaultValue={v?.name} placeholder="Seu nome" required aria-invalid={!!err.name} className={inputClass} />
        </Field>
        <Field id="company" label="Empresa">
          <Input id="company" name="company" defaultValue={v?.company} placeholder="Nome da empresa" className={inputClass} />
        </Field>
        <Field id="email" label="Email *" error={err.email}>
          <Input id="email" name="email" defaultValue={v?.email} type="email" placeholder="voce@empresa.com" required aria-invalid={!!err.email} className={inputClass} />
        </Field>
        <Field id="phone" label="Telefone / WhatsApp *" error={err.phone}>
          <Input id="phone" name="phone" defaultValue={v?.phone} type="tel" placeholder="(00) 00000-0000" required aria-invalid={!!err.phone} className={inputClass} />
        </Field>
        <Field id="screens" label="Quantas telas?">
          <select id="screens" name="screens" defaultValue={v?.screens ?? ""} className={selectClass}>
            <option value="" disabled>Selecione</option>
            <option>1 a 3</option>
            <option>4 a 10</option>
            <option>11 a 30</option>
            <option>Mais de 30</option>
          </select>
        </Field>
        <Field id="segment" label="Segmento">
          <select id="segment" name="segment" defaultValue={v?.segment ?? ""} className={selectClass}>
            <option value="" disabled>Selecione</option>
            <option>Posto de combustível</option>
            <option>Restaurante / Food service</option>
            <option>Varejo / Loja</option>
            <option>Casa de câmbio</option>
            <option>Comunicação interna / Corporativo</option>
            <option>Outro</option>
          </select>
        </Field>
      </div>

      <Field id="message" label="Conte um pouco sobre o projeto">
        <Textarea
          id="message"
          name="message"
          defaultValue={v?.message}
          rows={4}
          placeholder="Ex.: tenho 2 unidades e quero exibir preços e promoções nas TVs..."
          className="min-h-28 bg-background/50 border-border/60 focus-visible:border-orange/50 focus-visible:ring-orange/20 placeholder:text-muted-foreground/40"
        />
      </Field>

      {state.status === "error" && state.message && (
        <div role="alert" className="text-sm text-destructive bg-destructive/10 border border-destructive/20 rounded-lg px-4 py-3">
          {state.message}
        </div>
      )}

      <Button
        type="submit"
        disabled={pending}
        className="w-full h-12 bg-orange text-orange-foreground hover:bg-orange/90 font-semibold text-base"
      >
        {pending ? (
          <>
            <LoaderCircle className="w-4 h-4 animate-spin" /> Enviando...
          </>
        ) : (
          <>
            <Send className="w-4 h-4" /> Solicitar orçamento
          </>
        )}
      </Button>
      <p className="text-xs text-center text-muted-foreground/70">
        Sem compromisso. Usamos seus dados apenas para responder ao seu pedido.
      </p>
    </form>
  );
}

function Field({
  id,
  label,
  error,
  children,
}: {
  id: string;
  label: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-2">
      <Label htmlFor={id} className="text-sm font-medium text-muted-foreground">
        {label}
      </Label>
      {children}
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}
