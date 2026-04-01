"use client";

interface StatsCardsProps {
  totalScreens: number;
  activeScreens: number;
  scheduledMedias: number;
  expiredMedias: number;
}

const stats = [
  {
    key: "totalScreens",
    label: "Total de Telas",
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M6 20.25h12m-7.5-3v3m3-3v3m-10.125-3h17.25c.621 0 1.125-.504 1.125-1.125V4.875c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125Z" />
      </svg>
    ),
    color: "text-blue-400",
    bgColor: "bg-blue-400/10",
    borderColor: "border-blue-400/20",
  },
  {
    key: "activeScreens",
    label: "Telas Ativas",
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
      </svg>
    ),
    color: "text-emerald-400",
    bgColor: "bg-emerald-400/10",
    borderColor: "border-emerald-400/20",
  },
  {
    key: "scheduledMedias",
    label: "Mídias Programadas",
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
      </svg>
    ),
    color: "text-orange",
    bgColor: "bg-orange/10",
    borderColor: "border-orange/20",
  },
  {
    key: "expiredMedias",
    label: "Mídias Expiradas",
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9 3.75h.008v.008H12v-.008Z" />
      </svg>
    ),
    color: "text-red-400",
    bgColor: "bg-red-400/10",
    borderColor: "border-red-400/20",
  },
];

export function StatsCards({
  totalScreens,
  activeScreens,
  scheduledMedias,
  expiredMedias,
}: StatsCardsProps) {
  const values: Record<string, number> = {
    totalScreens,
    activeScreens,
    scheduledMedias,
    expiredMedias,
  };

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {stats.map((stat) => (
        <div
          key={stat.key}
          className="group relative rounded-2xl border border-border/50 bg-card/50 backdrop-blur-sm p-5 transition-all duration-300 hover:border-border hover:bg-card/80"
        >
          <div className="flex items-center justify-between mb-4">
            <div
              className={`flex items-center justify-center w-10 h-10 rounded-xl ${stat.bgColor} border ${stat.borderColor}`}
            >
              <span className={stat.color}>{stat.icon}</span>
            </div>
          </div>
          <div className="space-y-1">
            <p className="text-3xl font-bold tracking-tight">{values[stat.key]}</p>
            <p className="text-sm text-muted-foreground">{stat.label}</p>
          </div>
          {/* Subtle glow on hover */}
          <div className={`absolute inset-0 rounded-2xl ${stat.bgColor} opacity-0 group-hover:opacity-[0.03] transition-opacity duration-300`} />
        </div>
      ))}
    </div>
  );
}
