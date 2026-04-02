"use client";

import { useRouter } from "next/navigation";

interface Props {
  companies: { id: string; name: string }[];
  currentFilter: string;
}

export function ScreenCompanyFilter({ companies, currentFilter }: Props) {
  const router = useRouter();

  function handleChange(value: string) {
    if (value) {
      router.push("/dashboard/screens?company=" + value);
    } else {
      router.push("/dashboard/screens");
    }
  }

  return (
    <div className="flex items-center gap-3">
      <span className="text-sm text-muted-foreground">Filtrar por instituição:</span>
      <select
        value={currentFilter}
        onChange={(e) => handleChange(e.target.value)}
        className="h-9 rounded-md border border-border/50 bg-card/50 px-3 text-sm text-foreground"
      >
        <option value="">Todas as instituições</option>
        {companies.map((c) => (
          <option key={c.id} value={c.id}>{c.name}</option>
        ))}
      </select>
    </div>
  );
}
