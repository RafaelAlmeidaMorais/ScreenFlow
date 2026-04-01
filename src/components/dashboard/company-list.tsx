"use client";

import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { EditCompanyDialog } from "@/components/dashboard/edit-company-dialog";

interface Company {
  id: string;
  name: string;
  slug: string;
  createdAt: string;
  userCount: number;
  screenCount: number;
  mediaCount: number;
}

export function CompanyList({ companies }: { companies: Company[] }) {
  if (companies.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-border/50 bg-card/30 p-12 text-center">
        <p className="text-muted-foreground text-sm">Nenhuma instituição cadastrada</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {companies.map((company) => (
        <div
          key={company.id}
          className="group flex items-center justify-between gap-4 rounded-xl border border-border/50 bg-card/50 px-5 py-4 transition-colors hover:border-orange/20 hover:bg-card/80"
        >
          <Link
            href={`/dashboard/companies/${company.id}`}
            className="flex-1 min-w-0"
          >
            <div className="flex items-center gap-3">
              <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-orange/10 border border-orange/20 shrink-0">
                <svg className="w-5 h-5 text-orange" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 21h16.5M4.5 3h15M5.25 3v18m13.5-18v18M9 6.75h1.5m-1.5 3h1.5m-1.5 3h1.5m3-6H15m-1.5 3H15m-1.5 3H15M9 21v-3.375c0-.621.504-1.125 1.125-1.125h3.75c.621 0 1.125.504 1.125 1.125V21" />
                </svg>
              </div>
              <div className="min-w-0">
                <p className="font-medium text-sm truncate">{company.name}</p>
                <p className="text-xs text-muted-foreground/60 truncate">/{company.slug}</p>
              </div>
            </div>
          </Link>

          <div className="flex items-center gap-3 shrink-0">
            <Badge variant="secondary" className="text-xs bg-muted/50 border-border/50">
              {company.userCount} {company.userCount === 1 ? "usuário" : "usuários"}
            </Badge>
            <Badge variant="secondary" className="text-xs bg-muted/50 border-border/50">
              {company.screenCount} {company.screenCount === 1 ? "tela" : "telas"}
            </Badge>
            <Badge variant="secondary" className="text-xs bg-muted/50 border-border/50">
              {company.mediaCount} {company.mediaCount === 1 ? "mídia" : "mídias"}
            </Badge>
            <EditCompanyDialog company={company} />
          </div>
        </div>
      ))}
    </div>
  );
}
