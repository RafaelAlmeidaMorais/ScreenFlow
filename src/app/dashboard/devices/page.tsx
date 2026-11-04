import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/role-guards";
import { PairDeviceForm } from "@/components/dashboard/pair-device-form";
import { DeviceRowActions } from "@/components/dashboard/device-row-actions";

function formatDate(d: Date | null) {
  if (!d) return "—";
  return d.toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function isOnline(lastSeen: Date | null): boolean {
  if (!lastSeen) return false;
  return Date.now() - lastSeen.getTime() < 2 * 60 * 1000;
}

export default async function DevicesPage() {
  const session = await auth();
  if (!session) redirect("/login");
  await requireAdmin();

  const isSuperAdmin = session.user.isSuperAdmin;
  const companyFilter = isSuperAdmin ? {} : { companyId: session.user.companyId };

  const [devices, screens] = await Promise.all([
    prisma.deviceToken.findMany({
      where: { ...companyFilter, pairedAt: { not: null } },
      include: {
        screen: { select: { name: true, slug: true } },
        company: { select: { name: true } },
      },
      orderBy: { pairedAt: "desc" },
    }),
    prisma.screen.findMany({
      where: isSuperAdmin ? {} : { companyId: session.user.companyId },
      include: { company: { select: { name: true } } },
      orderBy: { name: "asc" },
    }),
  ]);

  const screenOptions = screens.map((s) => ({
    id: s.id,
    name: s.name,
    companyName: isSuperAdmin ? s.company.name : undefined,
  }));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Dispositivos</h1>
        <p className="text-muted-foreground mt-1">
          TV boxes pareados. Abra o APK em cada aparelho para ver o código e pareie aqui.
        </p>
      </div>

      <div className="rounded-xl border border-blue-500/20 bg-blue-500/5 p-4 text-sm text-blue-200/80">
        <strong>Como parear:</strong> instale o APK no TV box, abra e digite a URL base{" "}
        <code className="px-1 py-0.5 rounded bg-black/30 text-xs">
          https://seudominio.com/player
        </code>{" "}
        (sem nome da tela). O aparelho vai mostrar um código, e você vem aqui pra pareá-lo com uma tela.
      </div>

      <PairDeviceForm screens={screenOptions} />

      <div>
        <h2 className="text-sm font-semibold text-muted-foreground mb-3">
          Dispositivos pareados ({devices.length})
        </h2>
        {devices.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border/50 bg-card/30 p-12 text-center">
            <p className="text-muted-foreground text-sm">Nenhum dispositivo pareado ainda</p>
          </div>
        ) : (
          <div className="rounded-xl border border-border/50 bg-card/50 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-muted/30 border-b border-border/50">
                  <tr className="text-left text-xs text-muted-foreground">
                    <th className="px-4 py-3 font-medium">Status</th>
                    <th className="px-4 py-3 font-medium">Apelido</th>
                    <th className="px-4 py-3 font-medium">Tela</th>
                    {isSuperAdmin && <th className="px-4 py-3 font-medium">Instituição</th>}
                    <th className="px-4 py-3 font-medium">Pareado em</th>
                    <th className="px-4 py-3 font-medium">Último sinal</th>
                    <th className="px-4 py-3 font-medium text-right">Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {devices.map((d) => {
                    const online = isOnline(d.lastSeenAt);
                    return (
                      <tr key={d.id} className="border-b border-border/30 last:border-0 hover:bg-muted/20">
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <span
                              className={`inline-block w-2 h-2 rounded-full ${
                                online ? "bg-emerald-400 animate-pulse" : "bg-muted-foreground/30"
                              }`}
                            />
                            <span className="text-xs text-muted-foreground">
                              {online ? "online" : "offline"}
                            </span>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <span className="font-medium">
                            {d.name || <span className="text-muted-foreground/50">sem apelido</span>}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-muted-foreground">
                          {d.screen?.name ?? "—"}
                        </td>
                        {isSuperAdmin && (
                          <td className="px-4 py-3 text-muted-foreground/60 text-xs">
                            {d.company?.name ?? "—"}
                          </td>
                        )}
                        <td className="px-4 py-3 text-muted-foreground text-xs">
                          {formatDate(d.pairedAt)}
                        </td>
                        <td className="px-4 py-3 text-muted-foreground text-xs">
                          {formatDate(d.lastSeenAt)}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <DeviceRowActions id={d.id} currentName={d.name} />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
