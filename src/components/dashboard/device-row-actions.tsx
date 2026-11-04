"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function DeviceRowActions({ id, currentName }: { id: string; currentName: string | null }) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(currentName ?? "");
  const [busy, setBusy] = useState(false);

  async function save() {
    setBusy(true);
    try {
      await fetch(`/api/device/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      });
      setEditing(false);
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  async function unpair() {
    if (!confirm("Desparear este dispositivo? Ele voltará a exibir a tela de código.")) return;
    setBusy(true);
    try {
      await fetch(`/api/device/${id}`, { method: "DELETE" });
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  if (editing) {
    return (
      <div className="flex items-center gap-2">
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="h-8 px-2 rounded border border-border/50 bg-background text-xs w-32"
          placeholder="Apelido"
          autoFocus
        />
        <button
          onClick={save}
          disabled={busy}
          className="text-xs text-emerald-400 hover:text-emerald-300"
        >
          Salvar
        </button>
        <button
          onClick={() => { setEditing(false); setName(currentName ?? ""); }}
          className="text-xs text-muted-foreground hover:text-foreground"
        >
          Cancelar
        </button>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-3">
      <button
        onClick={() => setEditing(true)}
        className="text-xs text-muted-foreground hover:text-foreground"
      >
        Renomear
      </button>
      <button
        onClick={unpair}
        disabled={busy}
        className="text-xs text-red-400 hover:text-red-300"
      >
        Desparear
      </button>
    </div>
  );
}
