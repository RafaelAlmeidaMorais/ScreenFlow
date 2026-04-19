"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createWidget } from "@/app/dashboard/widgets/actions";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { PRICE_TABLE_TEMPLATES } from "@/lib/widgets";

interface AddWidgetDialogProps {
  screenId: string;
  slot: string;
  compact?: boolean;
}

export function AddWidgetDialog({ screenId, slot, compact }: AddWidgetDialogProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState<1 | 2>(1);
  const [selectedTemplate, setSelectedTemplate] = useState<string>("");
  const router = useRouter();

  async function handleCreate() {
    if (!selectedTemplate) return;
    setLoading(true);
    try {
      await createWidget(screenId, "PRICE_TABLE", selectedTemplate, slot);
      setOpen(false);
      setStep(1);
      setSelectedTemplate("");
      router.refresh();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Erro ao criar widget");
    } finally {
      setLoading(false);
    }
  }

  function handleOpenChange(value: boolean) {
    setOpen(value);
    if (!value) {
      setStep(1);
      setSelectedTemplate("");
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger
        className={`inline-flex items-center justify-center gap-1.5 rounded-md border border-dashed border-orange/30 text-orange hover:bg-orange/10 cursor-pointer ${compact ? "px-2 py-1 text-xs" : "px-3 py-2 text-sm font-medium"}`}
      >
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
        </svg>
        {compact ? "Widget" : "Adicionar widget"}
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {step === 1 ? "Novo widget" : "Escolher template"}
          </DialogTitle>
        </DialogHeader>

        {step === 1 && (
          <div className="space-y-3 py-2">
            <p className="text-sm text-muted-foreground">Escolha o tipo de widget:</p>
            <button
              type="button"
              onClick={() => setStep(2)}
              className="w-full text-left p-4 rounded-xl border border-border/50 hover:border-orange/40 hover:bg-orange/5 transition-all"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-orange/10 border border-orange/20 flex items-center justify-center">
                  <svg className="w-5 h-5 text-orange" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18.75a60.07 60.07 0 0 1 15.797 2.101c.727.198 1.453-.342 1.453-1.096V18.75M3.75 4.5v.75A.75.75 0 0 1 3 6h-.75m0 0v-.375c0-.621.504-1.125 1.125-1.125H20.25M2.25 6v9m18-10.5v.75c0 .414.336.75.75.75h.75m-1.5-1.5h.375c.621 0 1.125.504 1.125 1.125v9.75c0 .621-.504 1.125-1.125 1.125h-.375m1.5-1.5H21a.75.75 0 0 0-.75.75v.75m0 0H3.75m0 0h-.375a1.125 1.125 0 0 1-1.125-1.125V15m1.5 1.5v-.75A.75.75 0 0 0 3 15h-.75M15 10.5a3 3 0 1 1-6 0 3 3 0 0 1 6 0Zm3 0h.008v.008H18V10.5Zm-12 0h.008v.008H6V10.5Z" />
                  </svg>
                </div>
                <div>
                  <div className="font-semibold text-sm">Tabela de precos</div>
                  <div className="text-xs text-muted-foreground">Combustiveis, cardapio, cambio e mais</div>
                </div>
              </div>
            </button>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-3 py-2">
            <p className="text-sm text-muted-foreground">Escolha um template inicial:</p>
            <div className="grid grid-cols-2 gap-2">
              {PRICE_TABLE_TEMPLATES.map((tmpl) => (
                <button
                  key={tmpl.value}
                  type="button"
                  onClick={() => setSelectedTemplate(tmpl.value)}
                  className={`text-left p-3 rounded-xl border transition-all ${
                    selectedTemplate === tmpl.value
                      ? "border-orange bg-orange/10"
                      : "border-border/50 hover:border-orange/40 hover:bg-muted/30"
                  }`}
                >
                  <div className="font-semibold text-sm">{tmpl.label}</div>
                  <div className="text-xs text-muted-foreground mt-0.5">{tmpl.description}</div>
                </button>
              ))}
            </div>
            <div className="flex gap-2 pt-2">
              <Button variant="outline" size="sm" onClick={() => { setStep(1); setSelectedTemplate(""); }}>
                Voltar
              </Button>
              <Button
                size="sm"
                disabled={!selectedTemplate || loading}
                onClick={handleCreate}
                className="flex-1 bg-orange hover:bg-orange/90"
              >
                {loading ? "Criando..." : "Criar widget"}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
