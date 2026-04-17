import { createFileRoute, Link } from "@tanstack/react-router";
import { Tv, Wifi, RefreshCw, ArrowLeft, Cpu, Monitor } from "lucide-react";

export const Route = createFileRoute("/pareamento")({
  head: () => ({ meta: [{ title: "Pareamento de Player — Signix" }] }),
  component: PairingPage,
});

function PairingPage() {
  const code = "K7X2-9MQ4";
  return (
    <div className="min-h-screen flex flex-col bg-background bg-mesh">
      <div className="flex items-center justify-between px-6 py-4 border-b border-border">
        <div className="flex items-center gap-2.5">
          <div className="h-9 w-9 rounded-xl bg-gradient-primary grid place-items-center shadow-glow">
            <Tv className="h-5 w-5 text-primary-foreground" />
          </div>
          <span className="font-display text-lg font-bold">Signix Player</span>
        </div>
        <Link to="/login" className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-3.5 w-3.5" /> Painel administrativo
        </Link>
      </div>

      <div className="flex-1 grid place-items-center p-6">
        <div className="w-full max-w-xl text-center">
          <div className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1 text-xs">
            <span className="h-1.5 w-1.5 rounded-full bg-success pulse-dot" /> Aguardando confirmação no painel
          </div>
          <h1 className="mt-6 font-display text-3xl lg:text-4xl font-bold leading-tight">
            Use o código abaixo para parear<br />este dispositivo à sua conta
          </h1>
          <p className="mt-3 text-muted-foreground max-w-md mx-auto text-sm">
            Acesse <span className="text-foreground font-medium">Telas › Adicionar tela</span> no painel Signix e informe o código exibido.
          </p>

          <div className="mt-10 inline-flex items-center gap-3 rounded-2xl border border-border bg-card px-8 py-6 shadow-glow">
            {code.split("").map((c, i) =>
              c === "-" ? (
                <span key={i} className="font-display text-4xl text-muted-foreground">·</span>
              ) : (
                <span key={i} className="font-mono text-5xl font-bold text-gradient w-10 text-center">{c}</span>
              )
            )}
          </div>

          <div className="mt-8 grid sm:grid-cols-3 gap-3 max-w-md mx-auto text-left">
            <Info icon={Monitor} label="Resolução" value="1920 × 1080" />
            <Info icon={Cpu} label="Plataforma" value="Android TV 12" />
            <Info icon={Wifi} label="Conexão" value="Wi-Fi · 87 Mbps" />
          </div>

          <button className="mt-8 inline-flex items-center gap-2 rounded-lg border border-border bg-surface px-4 py-2 text-sm hover:bg-accent transition-smooth">
            <RefreshCw className="h-3.5 w-3.5" /> Gerar novo código
          </button>
        </div>
      </div>
    </div>
  );
}

function Info({ icon: Icon, label, value }: { icon: typeof Wifi; label: string; value: string }) {
  return (
    <div className="rounded-lg border border-border bg-card/60 p-3">
      <div className="flex items-center gap-2 text-[11px] uppercase tracking-wider text-muted-foreground">
        <Icon className="h-3.5 w-3.5" /> {label}
      </div>
      <div className="mt-1 text-sm font-medium">{value}</div>
    </div>
  );
}
