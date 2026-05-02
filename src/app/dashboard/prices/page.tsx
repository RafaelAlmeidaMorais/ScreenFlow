import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { PriceItemEditor } from "./price-item-editor";
import type { PriceTableConfig } from "@/lib/widgets";

export default async function PricesPage() {
  const session = await auth();
  if (!session) redirect("/login");

  // Fetch all PRICE_TABLE widgets for the user's company
  const widgets = await prisma.screenWidget.findMany({
    where: {
      companyId: session.user.companyId,
      type: "PRICE_TABLE",
      isEnabled: true,
    },
    include: {
      screen: {
        select: { id: true, name: true, slug: true },
      },
    },
    orderBy: [{ screen: { name: "asc" } }, { orderIndex: "asc" }],
  });

  // Group by screen
  const byScreen = new Map<string, { screen: { id: string; name: string; slug: string }; widgets: typeof widgets }>();
  for (const w of widgets) {
    const key = w.screenId;
    if (!byScreen.has(key)) {
      byScreen.set(key, { screen: w.screen, widgets: [] });
    }
    byScreen.get(key)!.widgets.push(w);
  }

  const groups = Array.from(byScreen.values());

  return (
    <div className="space-y-6 max-w-2xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Precos</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Edite os precos de todas as suas tabelas rapidamente
        </p>
      </div>

      {groups.length === 0 && (
        <div className="rounded-xl border border-dashed border-border/30 bg-card/20 p-12 text-center">
          <p className="text-muted-foreground/60 text-sm">
            Nenhuma tabela de precos encontrada
          </p>
          <p className="text-muted-foreground/40 text-xs mt-1">
            Adicione um widget de tabela de precos em uma tela para comecar
          </p>
        </div>
      )}

      {groups.map(({ screen, widgets: screenWidgets }) => (
        <div key={screen.id} className="space-y-4">
          <div className="flex items-center gap-2">
            <svg className="w-4 h-4 text-orange" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 20.25h12m-7.5-3v3m3-3v3m-10.125-3h17.25c.621 0 1.125-.504 1.125-1.125V4.875c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125Z" />
            </svg>
            <h2 className="font-semibold text-sm">{screen.name}</h2>
          </div>

          {screenWidgets.map((widget) => {
            const config = widget.config as unknown as PriceTableConfig;
            return (
              <div
                key={widget.id}
                className="rounded-xl border border-border/50 bg-card/30 overflow-hidden"
              >
                {config.title && (
                  <div className="px-4 py-2.5 border-b border-border/30 bg-card/50">
                    <h3 className="font-semibold text-sm">{config.title}</h3>
                  </div>
                )}
                <div className="divide-y divide-border/20">
                  {config.items.map((item) => (
                    <PriceItemEditor
                      key={item.id}
                      widgetId={widget.id}
                      item={item}
                      currency={config.currency}
                      decimals={config.decimals}
                    />
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      ))}
    </div>
  );
}
