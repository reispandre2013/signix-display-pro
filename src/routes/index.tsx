import { createFileRoute, Link } from "@tanstack/react-router";
import { Tv, ArrowRight, Monitor, Activity, Megaphone, Shield } from "lucide-react";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Signix — Digital Signage Cloud para empresas" },
      {
        name: "description",
        content:
          "Gerencie Smart TVs, players e campanhas em todas as suas unidades a partir de um único painel premium.",
      },
      { property: "og:title", content: "Signix — Digital Signage Cloud" },
      {
        property: "og:description",
        content: "Plataforma SaaS para gestão de Indoor Smart TV e Digital Signage.",
      },
    ],
  }),
  component: Landing,
});

function Landing() {
  return (
    <div className="min-h-screen bg-background bg-mesh flex flex-col">
      <header className="px-6 py-5 flex items-center justify-between max-w-7xl mx-auto w-full">
        <div className="flex items-center gap-2.5">
          <div className="h-9 w-9 rounded-xl bg-gradient-primary grid place-items-center shadow-glow">
            <Tv className="h-5 w-5 text-primary-foreground" />
          </div>
          <span className="font-display text-lg font-bold">Signix</span>
        </div>
        <div className="flex items-center gap-2">
          <Link
            to="/pareamento"
            className="hidden sm:inline-flex rounded-md border border-border bg-surface px-3 py-1.5 text-xs font-medium hover:bg-accent transition-smooth"
          >
            Parear player
          </Link>
          <Link
            to="/login"
            className="inline-flex items-center gap-1 rounded-md bg-gradient-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground shadow-glow"
          >
            Acessar painel <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>
      </header>

      <main className="flex-1 grid place-items-center px-6">
        <div className="max-w-3xl text-center">
          <span className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1 text-xs">
            <span className="h-1.5 w-1.5 rounded-full bg-success pulse-dot" /> SaaS Enterprise ·
            Multi-tenant
          </span>
          <h1 className="mt-6 font-display text-4xl sm:text-5xl lg:text-6xl font-bold leading-[1.05] tracking-tight">
            Cada tela do seu negócio,
            <br />
            <span className="text-gradient">controlada em tempo real.</span>
          </h1>
          <p className="mt-5 text-base text-muted-foreground max-w-xl mx-auto">
            Signix é a plataforma de Digital Signage para empresas que precisam orquestrar Smart
            TVs, Android TVs e players web em escala — com monitoramento, agendamento e relatórios.
          </p>
          <div className="mt-8 flex items-center justify-center gap-3">
            <Link
              to="/login"
              className="inline-flex items-center gap-1.5 rounded-lg bg-gradient-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground shadow-glow"
            >
              Entrar no painel <ArrowRight className="h-4 w-4" />
            </Link>
            <Link
              to="/player"
              className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-surface px-5 py-2.5 text-sm font-medium hover:bg-accent transition-smooth"
            >
              Ver demo do player
            </Link>
          </div>

          <div className="mt-16 grid grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              { i: Monitor, l: "Multi-dispositivo", d: "Android TV, WebOS, Tizen, web" },
              { i: Activity, l: "Tempo real", d: "Status e saúde de cada player" },
              { i: Megaphone, l: "Campanhas", d: "Playlists, prioridade e timeline" },
              { i: Shield, l: "Auditoria", d: "Logs completos e perfis de acesso" },
            ].map((f) => (
              <div
                key={f.l}
                className="rounded-xl border border-border bg-card/60 p-4 text-left shadow-card"
              >
                <f.i className="h-5 w-5 text-primary mb-2" />
                <p className="font-semibold text-sm">{f.l}</p>
                <p className="text-[11px] text-muted-foreground mt-0.5">{f.d}</p>
              </div>
            ))}
          </div>
        </div>
      </main>

      <footer className="px-6 py-6 text-center text-xs text-muted-foreground">
        © 2025 Signix · Digital Signage Cloud
      </footer>
    </div>
  );
}
