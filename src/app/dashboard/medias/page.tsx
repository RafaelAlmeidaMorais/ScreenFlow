import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/role-guards";
import { MediasManager } from "@/components/dashboard/medias-manager";
import { getMediaLibrary, MEDIA_STATUSES } from "@/lib/media-library";
import { APP_TIMEZONE, timezoneLabel } from "@/lib/timezone";

interface Props {
  searchParams: Promise<{ q?: string; screens?: string; status?: string }>;
}

export default async function MediasPage({ searchParams }: Props) {
  const session = await auth();
  if (!session) redirect("/login");
  await requireAdmin();

  const sp = await searchParams;
  const q = sp.q?.trim() ?? "";
  const screenIds = (sp.screens ?? "").split(",").filter(Boolean);
  const status = MEDIA_STATUSES.find((s) => s === sp.status) ?? "";

  const isSuperAdmin = session.user.isSuperAdmin;
  const { rows, screens, total, onAir, sharedFiles } = await getMediaLibrary(
    { isSuperAdmin, companyId: session.user.companyId },
    { q, screenIds, status },
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Mídias</h1>
        <p className="text-muted-foreground mt-1">
          Todas as mídias inseridas nas telas {isSuperAdmin ? "de todas as instituições" : "da sua empresa"}
        </p>
        <p className="text-xs text-muted-foreground/60 mt-1">
          Datas e horários em {timezoneLabel()} ({APP_TIMEZONE})
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="rounded-xl border border-border/50 bg-card/50 p-4">
          <div className="text-xs text-muted-foreground">Mídias listadas</div>
          <div className="text-2xl font-bold mt-1">{rows.length}</div>
        </div>
        <div className="rounded-xl border border-border/50 bg-card/50 p-4">
          <div className="text-xs text-muted-foreground">No ar agora</div>
          <div className="text-2xl font-bold mt-1">{onAir}</div>
        </div>
        <div className="rounded-xl border border-border/50 bg-card/50 p-4">
          <div className="text-xs text-muted-foreground">Arquivos usados em mais de uma tela</div>
          <div className="text-2xl font-bold mt-1">{sharedFiles}</div>
        </div>
      </div>

      <MediasManager
        rows={rows}
        screens={screens.map((s) => ({
          id: s.id,
          name: s.name,
          companyId: s.companyId,
          companyName: s.company.name,
        }))}
        showCompany={isSuperAdmin}
        filters={{ q, screens: screenIds, status }}
        hiddenCount={Math.max(0, total - rows.length)}
      />
    </div>
  );
}
