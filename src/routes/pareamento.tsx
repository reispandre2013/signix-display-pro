import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Tv, Wifi, RefreshCw, ArrowLeft, Cpu, Monitor, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/pareamento")({
  head: () => ({ meta: [{ title: "Pareamento de Player — Signix" }] }),
  component: PairingPage,
});

const STORAGE_KEY = "signix_pairing_code";

function PairingPage() {
  const [code, setCode] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [paired, setPaired] = useState(false);

  // Gera ou recupera código de pareamento (anônimo, sem org)
  const generateCode = async () => {
    setLoading(true);
    const newCode = `${randomChunk()}-${randomChunk()}`;
    const expires = new Date(Date.now() + 10 * 60 * 1000).toISOString();
    const { error } = await supabase
      .from("pairing_codes")
      .insert({ code: newCode, expires_at: expires });
    if (!error) {
      localStorage.setItem(STORAGE_KEY, newCode);
      setCode(newCode);
    } else {
      // Mesmo se RLS bloquear, mostra o código localmente
      localStorage.setItem(STORAGE_KEY, newCode);
      setCode(newCode);
    }
    setLoading(false);
  };

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      setCode(stored);
      setLoading(false);
    } else {
      generateCode();
    }
  }, []);

  // Polling: checa se o código foi associado a uma tela
  useEffect(() => {
    if (!code || paired) return;
    const interval = setInterval(async () => {
      const { data } = await supabase
        .from("pairing_codes")
        .select("used_at, screen_id")
        .eq("code", code)
        .maybeSingle();
      if (data?.used_at) {
        setPaired(true);
        clearInterval(interval);
      }
    }, 4000);
    return () => clearInterval(interval);
  }, [code, paired]);

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
          {paired ? (
            <>
              <div className="inline-flex items-center gap-2 rounded-full border border-success/40 bg-success/10 text-success px-3 py-1 text-xs">
                ✓ Dispositivo pareado com sucesso
              </div>
              <h1 className="mt-6 font-display text-3xl lg:text-4xl font-bold leading-tight">
                Tudo pronto!
                <br />Aguardando primeira campanha…
              </h1>
            </>
          ) : (
            <>
              <div className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1 text-xs">
                <span className="h-1.5 w-1.5 rounded-full bg-success pulse-dot" /> Aguardando confirmação no painel
              </div>
              <h1 className="mt-6 font-display text-3xl lg:text-4xl font-bold leading-tight">
                Use o código abaixo para parear<br />este dispositivo à sua conta
              </h1>
              <p className="mt-3 text-muted-foreground max-w-md mx-auto text-sm">
                Acesse <span className="text-foreground font-medium">Telas › Adicionar tela</span> no painel Signix e informe o código exibido.
              </p>

              <div className="mt-10 inline-flex items-center gap-3 rounded-2xl border border-border bg-card px-8 py-6 shadow-glow min-h-[120px]">
                {loading || !code ? (
                  <Loader2 className="h-10 w-10 animate-spin text-primary" />
                ) : (
                  code.split("").map((c, i) =>
                    c === "-" ? (
                      <span key={i} className="font-display text-4xl text-muted-foreground">·</span>
                    ) : (
                      <span key={i} className="font-mono text-5xl font-bold text-gradient w-10 text-center">
                        {c}
                      </span>
                    )
                  )
                )}
              </div>

              <div className="mt-8 grid sm:grid-cols-3 gap-3 max-w-md mx-auto text-left">
                <Info icon={Monitor} label="Resolução" value={`${window.screen.width} × ${window.screen.height}`} />
                <Info icon={Cpu} label="Plataforma" value={navigator.platform || "Web"} />
                <Info icon={Wifi} label="Conexão" value={navigator.onLine ? "Online" : "Offline"} />
              </div>

              <button
                onClick={() => {
                  localStorage.removeItem(STORAGE_KEY);
                  generateCode();
                }}
                disabled={loading}
                className="mt-8 inline-flex items-center gap-2 rounded-lg border border-border bg-surface px-4 py-2 text-sm hover:bg-accent transition-smooth disabled:opacity-60"
              >
                <RefreshCw className="h-3.5 w-3.5" /> Gerar novo código
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function randomChunk() {
  return Math.random().toString(36).slice(2, 6).toUpperCase();
}

function Info({ icon: Icon, label, value }: { icon: typeof Wifi; label: string; value: string }) {
  return (
    <div className="rounded-lg border border-border bg-card/60 p-3">
      <div className="flex items-center gap-2 text-[11px] uppercase tracking-wider text-muted-foreground">
        <Icon className="h-3.5 w-3.5" /> {label}
      </div>
      <div className="mt-1 text-sm font-medium truncate">{value}</div>
    </div>
  );
}
