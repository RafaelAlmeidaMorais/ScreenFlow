import Link from "next/link";
import { redirect } from "next/navigation";
import type { Metadata } from "next";
import {
  ArrowRight,
  CalendarClock,
  ChartColumn,
  Check,
  Coins,
  Fuel,
  LayoutGrid,
  Link2,
  LogIn,
  MonitorSmartphone,
  RefreshCw,
  ShieldCheck,
  Store,
  Upload,
  Users,
  UtensilsCrossed,
  Building2,
  Wifi,
} from "lucide-react";
import { auth } from "@/lib/auth";
import { QuoteForm } from "@/components/landing/quote-form";
import { BrandLogo } from "@/components/brand-logo";

export const metadata: Metadata = {
  title: "ScreenFlow — Gestão de TVs e Digital Signage",
  description:
    "Controle todas as TVs da sua empresa de um só painel: mídias, layouts com várias zonas, tabelas de preço e relatórios de exibição. Solicite um orçamento.",
};

export default async function Home() {
  const session = await auth();
  if (session) redirect("/dashboard");

  return (
    <div className="relative min-h-screen overflow-x-hidden bg-background text-foreground">
      <Header />
      <main>
        <Hero />
        <Steps />
        <Features />
        <Segments />
        <Reliability />
        <Quote />
      </main>
      <Footer />
    </div>
  );
}

/* ------------------------------------------------------------------ */

function Logo({ className }: { className?: string }) {
  return (
    <Link href="/" aria-label="ScreenFlow — início" className="flex items-center">
      <BrandLogo className={className ?? "h-6 sm:h-7"} priority />
    </Link>
  );
}

function Header() {
  return (
    <header className="sticky top-0 z-40 border-b border-border/60 bg-background/75 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
        <Logo />
        <nav className="hidden md:flex items-center gap-8 text-sm text-muted-foreground">
          <a href="#como-funciona" className="hover:text-foreground transition-colors">Como funciona</a>
          <a href="#recursos" className="hover:text-foreground transition-colors">Recursos</a>
          <a href="#segmentos" className="hover:text-foreground transition-colors">Segmentos</a>
        </nav>
        <div className="flex items-center gap-2">
          <Link
            href="/login"
            className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-border px-2.5 sm:px-3.5 text-sm font-medium text-foreground hover:bg-secondary transition-colors"
          >
            <LogIn className="h-4 w-4" aria-hidden="true" />
            Entrar
          </Link>
          <a
            href="#orcamento"
            className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-orange px-3 sm:px-4 text-sm font-semibold text-orange-foreground hover:bg-orange/90 transition-colors"
          >
            Orçamento
          </a>
        </div>
      </div>
    </header>
  );
}

/* ------------------------------------------------------------------ */

function Hero() {
  return (
    <section className="relative">
      <div className="pointer-events-none absolute -top-40 left-1/2 h-[520px] w-[820px] -translate-x-1/2 rounded-full bg-orange/10 blur-3xl" />
      <div className="relative mx-auto grid max-w-6xl items-center gap-14 px-4 pt-16 pb-20 sm:px-6 lg:grid-cols-[1.05fr_1fr] lg:pt-24 lg:pb-28">
        <div>
          <span className="inline-flex items-center gap-2 rounded-full border border-orange/25 bg-orange/10 px-3 py-1 text-xs font-medium text-orange">
            <span className="h-1.5 w-1.5 rounded-full bg-orange animate-pulse" />
            Digital signage para empresas
          </span>
          <h1 className="mt-6 text-4xl font-bold leading-[1.1] tracking-tight sm:text-5xl lg:text-[3.4rem]">
            Todas as TVs da sua empresa,{" "}
            <span className="text-orange">controladas de um só lugar.</span>
          </h1>
          <p className="mt-6 max-w-xl text-base leading-relaxed text-muted-foreground sm:text-lg">
            Publique vídeos, imagens, promoções e tabelas de preço em qualquer tela,
            em qualquer unidade — e atualize tudo em segundos, direto do navegador.
          </p>
          <div className="mt-9 flex flex-col gap-3 sm:flex-row">
            <a
              href="#orcamento"
              className="inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-orange px-6 font-semibold text-orange-foreground hover:bg-orange/90 transition-colors"
            >
              Solicitar orçamento <ArrowRight className="h-4 w-4" />
            </a>
            <a
              href="#como-funciona"
              className="inline-flex h-12 items-center justify-center rounded-xl border border-border px-6 font-medium text-foreground hover:bg-secondary transition-colors"
            >
              Ver como funciona
            </a>
          </div>
          <ul className="mt-9 flex flex-wrap gap-x-6 gap-y-2 text-sm text-muted-foreground">
            {["Funciona em TV box Android", "Sem instalação técnica", "Suporte em português"].map((t) => (
              <li key={t} className="flex items-center gap-2">
                <Check className="h-4 w-4 text-orange" /> {t}
              </li>
            ))}
          </ul>
        </div>
        <TvMockup />
      </div>
    </section>
  );
}

function TvMockup() {
  const prices = [
    { label: "Gasolina Comum", tag: "GC", color: "#ef4444", value: "6.09" },
    { label: "Gasolina Aditivada", tag: "GA", color: "#3b82f6", value: "6.29" },
    { label: "Etanol", tag: "ET", color: "#22c55e", value: "4.19" },
    { label: "Diesel S10", tag: "S10", color: "#eab308", value: "6.15" },
  ];

  return (
    <div className="relative mx-auto w-full max-w-xl" aria-hidden="true">
      <div className="absolute -inset-6 rounded-[2rem] bg-orange/10 blur-2xl" />
      <div className="relative rounded-2xl border border-white/10 bg-[#0b0b0f] p-2.5 shadow-2xl shadow-black/60">
        <div className="grid aspect-video grid-cols-[1.55fr_1fr] gap-1.5 overflow-hidden rounded-lg">
          {/* Main zone: promo slide */}
          <div className="relative overflow-hidden rounded-md bg-gradient-to-br from-orange via-orange/80 to-[#7c2d12] p-4 sm:p-6 flex flex-col justify-end">
            <div className="absolute -right-8 -top-8 h-32 w-32 rounded-full bg-white/15" />
            <div className="absolute right-10 top-12 h-16 w-16 rounded-full bg-white/10" />
            <span className="relative w-fit rounded bg-black/25 px-2 py-0.5 text-[9px] sm:text-[10px] font-semibold uppercase tracking-wider text-white">
              Promoção da semana
            </span>
            <p className="relative mt-2 text-lg sm:text-2xl font-bold leading-tight text-white">
              Lavagem completa<br />com 20% off
            </p>
            <div className="relative mt-3 flex gap-1">
              <span className="h-1 w-5 rounded-full bg-white" />
              <span className="h-1 w-2 rounded-full bg-white/40" />
              <span className="h-1 w-2 rounded-full bg-white/40" />
            </div>
          </div>
          {/* Side zone: price table widget */}
          <div className="flex flex-col gap-1 rounded-md bg-[#111318] p-1.5 sm:p-2">
            <p className="px-1 pb-0.5 text-[8px] sm:text-[10px] font-semibold uppercase tracking-wider text-white/50">
              Preços hoje
            </p>
            {prices.map((p) => (
              <div key={p.tag} className="flex flex-1 items-center justify-between rounded bg-white/[0.04] px-1.5">
                <div className="flex items-center gap-1.5 min-w-0">
                  <span
                    className="rounded px-1 text-[7px] sm:text-[9px] font-bold text-white"
                    style={{ background: p.color }}
                  >
                    {p.tag}
                  </span>
                  <span className="truncate text-[7px] sm:text-[9px] text-white/70">{p.label}</span>
                </div>
                <span
                  className="rounded bg-black px-1 text-[11px] sm:text-base text-orange"
                  style={{ fontFamily: '"DSEG7 Classic", monospace' }}
                >
                  {p.value}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
      <div className="mx-auto h-5 w-24 bg-gradient-to-b from-[#1a1a20] to-transparent" />
      <div className="mx-auto -mt-1 h-1.5 w-44 rounded-full bg-white/5" />

      {/* Floating status chip */}
      <div className="absolute -bottom-2 -left-2 sm:-left-6 flex items-center gap-2.5 rounded-xl border border-border bg-card/90 px-3.5 py-2.5 shadow-xl backdrop-blur">
        <span className="relative flex h-2.5 w-2.5">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-60" />
          <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-emerald-400" />
        </span>
        <div className="leading-tight">
          <p className="text-xs font-semibold">12 telas online</p>
          <p className="text-[11px] text-muted-foreground">Atualizado agora</p>
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */

function SectionTitle({ eyebrow, title, text }: { eyebrow: string; title: string; text?: string }) {
  return (
    <div className="mx-auto max-w-2xl text-center">
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-orange">{eyebrow}</p>
      <h2 className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl">{title}</h2>
      {text && <p className="mt-4 text-muted-foreground leading-relaxed">{text}</p>}
    </div>
  );
}

function Steps() {
  const steps = [
    {
      icon: Upload,
      title: "Envie seu conteúdo",
      text: "Suba imagens e vídeos para a biblioteca de mídias e reutilize em quantas telas quiser.",
    },
    {
      icon: LayoutGrid,
      title: "Monte a tela",
      text: "Escolha um layout, divida em zonas e defina o que aparece em cada uma — e por quanto tempo.",
    },
    {
      icon: Link2,
      title: "Conecte a TV",
      text: "Instale o player na TV box, digite o código de pareamento e pronto: a tela já está no ar.",
    },
  ];

  return (
    <section id="como-funciona" className="scroll-mt-20 border-t border-border/60 py-20 sm:py-28">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <SectionTitle
          eyebrow="Como funciona"
          title="Do upload à TV em três passos"
          text="Nada de pendrive, nada de técnico no local. Tudo é feito pelo painel web."
        />
        <div className="mt-14 grid gap-5 md:grid-cols-3">
          {steps.map((s, i) => (
            <div key={s.title} className="relative rounded-2xl border border-border/60 bg-card/50 p-7">
              <span className="absolute right-6 top-5 text-5xl font-bold text-foreground/[0.04]">0{i + 1}</span>
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-orange/10 border border-orange/20">
                <s.icon className="h-5 w-5 text-orange" />
              </div>
              <h3 className="mt-5 text-lg font-semibold">{s.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{s.text}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function Features() {
  const features = [
    {
      icon: LayoutGrid,
      title: "Layouts com várias zonas",
      text: "Tela cheia, topo + rodapé, colunas ou layout personalizado. Cada zona com seu próprio carrossel.",
    },
    {
      icon: Coins,
      title: "Tabelas de preço ao vivo",
      text: "Combustíveis, cardápios ou câmbio. Altere um preço no painel e todas as telas atualizam sozinhas.",
    },
    {
      icon: CalendarClock,
      title: "Agendamento de mídias",
      text: "Defina data de início e fim para cada conteúdo. Promoções entram e saem do ar no horário certo.",
    },
    {
      icon: MonitorSmartphone,
      title: "Monitoramento das telas",
      text: "Veja quais TVs estão online, quando foram vistas pela última vez e o que estão exibindo.",
    },
    {
      icon: ChartColumn,
      title: "Relatórios de exibição",
      text: "Comprove quantas vezes cada mídia foi exibida, com filtros por período e exportação em PDF.",
    },
    {
      icon: Users,
      title: "Multiempresa e permissões",
      text: "Gerencie várias empresas ou filiais, com usuários e perfis de acesso — inclusive só para editar preços.",
    },
  ];

  return (
    <section id="recursos" className="scroll-mt-20 border-t border-border/60 bg-card/30 py-20 sm:py-28">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <SectionTitle
          eyebrow="Recursos"
          title="Tudo o que você precisa para comunicar nas telas"
        />
        <div className="mt-14 grid gap-px overflow-hidden rounded-2xl border border-border/60 bg-border/60 sm:grid-cols-2 lg:grid-cols-3">
          {features.map((f) => (
            <div key={f.title} className="bg-background p-7 transition-colors hover:bg-card/80">
              <f.icon className="h-6 w-6 text-orange" />
              <h3 className="mt-4 font-semibold">{f.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{f.text}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function Segments() {
  const segments = [
    { icon: Fuel, title: "Postos de combustível", text: "Painel de preços com visual de display digital e promoções da conveniência." },
    { icon: UtensilsCrossed, title: "Restaurantes", text: "Menu board com cardápio e preços sempre atualizados." },
    { icon: Store, title: "Varejo", text: "Ofertas, lançamentos e campanhas sincronizadas em todas as lojas." },
    { icon: Building2, title: "Corporativo", text: "Comunicação interna, indicadores e avisos para a equipe." },
  ];

  return (
    <section id="segmentos" className="scroll-mt-20 border-t border-border/60 py-20 sm:py-28">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <SectionTitle
          eyebrow="Segmentos"
          title="Feito para quem precisa da informação certa na tela"
        />
        <div className="mt-14 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {segments.map((s) => (
            <div
              key={s.title}
              className="group rounded-2xl border border-border/60 p-6 transition-colors hover:border-orange/40"
            >
              <s.icon className="h-7 w-7 text-muted-foreground transition-colors group-hover:text-orange" />
              <h3 className="mt-5 font-semibold">{s.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{s.text}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function Reliability() {
  const items = [
    { icon: Wifi, text: "Continua exibindo o conteúdo mesmo com a internet instável" },
    { icon: RefreshCw, text: "Recuperação automática se o player travar" },
    { icon: ShieldCheck, text: "A TV não entra em descanso de tela nem desliga a imagem" },
  ];

  return (
    <section className="border-t border-border/60 bg-card/30 py-20 sm:py-24">
      <div className="mx-auto grid max-w-6xl items-center gap-12 px-4 sm:px-6 lg:grid-cols-2">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-orange">Confiabilidade</p>
          <h2 className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl">
            Tela ligada o dia inteiro, sem dor de cabeça
          </h2>
          <p className="mt-4 text-muted-foreground leading-relaxed">
            O player do ScreenFlow foi pensado para rodar 24/7 em TV boxes Android simples,
            longe de qualquer suporte técnico.
          </p>
        </div>
        <ul className="space-y-3">
          {items.map((i) => (
            <li key={i.text} className="flex items-center gap-4 rounded-xl border border-border/60 bg-background p-4">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-orange/10">
                <i.icon className="h-5 w-5 text-orange" />
              </span>
              <span className="text-sm">{i.text}</span>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

function Quote() {
  return (
    <section id="orcamento" className="relative scroll-mt-20 border-t border-border/60 py-20 sm:py-28">
      <div className="pointer-events-none absolute bottom-0 left-1/2 h-[400px] w-[700px] -translate-x-1/2 rounded-full bg-orange/[0.07] blur-3xl" />
      <div className="relative mx-auto grid max-w-6xl gap-12 px-4 sm:px-6 lg:grid-cols-[0.9fr_1.1fr]">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-orange">Orçamento</p>
          <h2 className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl">
            Vamos colocar suas telas para trabalhar?
          </h2>
          <p className="mt-4 text-muted-foreground leading-relaxed">
            Conte quantas telas você tem e o que quer exibir. Montamos uma proposta sob
            medida para o seu negócio.
          </p>
          <ul className="mt-8 space-y-3 text-sm">
            {[
              "Proposta personalizada pelo número de telas",
              "Ajuda na escolha do hardware",
              "Acompanhamento na instalação das primeiras TVs",
            ].map((t) => (
              <li key={t} className="flex items-start gap-3">
                <Check className="mt-0.5 h-4 w-4 shrink-0 text-orange" />
                <span className="text-muted-foreground">{t}</span>
              </li>
            ))}
          </ul>
        </div>
        <div className="rounded-2xl border border-border/60 bg-card/60 p-6 backdrop-blur-sm sm:p-8">
          <QuoteForm />
        </div>
      </div>
    </section>
  );
}

function Footer() {
  return (
    <footer className="border-t border-border/60">
      <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 px-4 py-8 sm:flex-row sm:px-6">
        <Logo className="h-6" />
        <p className="text-xs text-muted-foreground">
          © {new Date().getFullYear()} ScreenFlow — Gestão de telas corporativas
        </p>
        <Link href="/login" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
          Acessar painel
        </Link>
      </div>
    </footer>
  );
}
