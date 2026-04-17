import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { Tv, Mail, Lock, ArrowRight, Eye, EyeOff } from "lucide-react";
import { useState, FormEvent } from "react";

export const Route = createFileRoute("/login")({
  head: () => ({
    meta: [
      { title: "Entrar — Signix" },
      { name: "description", content: "Acesse o painel Signix de Digital Signage." },
    ],
  }),
  component: LoginPage,
});

function LoginPage() {
  const [show, setShow] = useState(false);
  const navigate = useNavigate();
  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    navigate({ to: "/app" });
  };

  return (
    <div className="min-h-screen grid lg:grid-cols-2 bg-background bg-mesh">
      <div className="hidden lg:flex relative flex-col justify-between p-12 border-r border-border overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/20 via-transparent to-transparent" />
        <div className="relative flex items-center gap-2.5">
          <div className="h-10 w-10 rounded-xl bg-gradient-primary grid place-items-center shadow-glow">
            <Tv className="h-5 w-5 text-primary-foreground" />
          </div>
          <div>
            <p className="font-display text-xl font-bold">Signix</p>
            <p className="text-[11px] uppercase tracking-widest text-muted-foreground">Digital Signage Cloud</p>
          </div>
        </div>

        <div className="relative space-y-6">
          <h1 className="font-display text-4xl xl:text-5xl font-bold leading-[1.05] tracking-tight">
            Controle <span className="text-gradient">cada tela</span><br />
            do seu negócio em<br />tempo real.
          </h1>
          <p className="text-muted-foreground max-w-md">
            Gerencie playlists, campanhas e dispositivos em todas as unidades a partir de um único painel premium.
          </p>
          <div className="grid grid-cols-3 gap-4 max-w-md pt-6">
            {[
              { v: "12k+", l: "Telas ativas" },
              { v: "99.9%", l: "Uptime SLA" },
              { v: "<2s", l: "Sincronização" },
            ].map((s) => (
              <div key={s.l} className="rounded-lg border border-border bg-card/60 px-3 py-3">
                <div className="font-display text-2xl font-bold text-gradient">{s.v}</div>
                <div className="text-[11px] text-muted-foreground mt-0.5">{s.l}</div>
              </div>
            ))}
          </div>
        </div>

        <div className="relative text-xs text-muted-foreground">© 2025 Signix · SaaS Enterprise</div>
      </div>

      <div className="flex items-center justify-center p-6 lg:p-12">
        <div className="w-full max-w-sm">
          <div className="lg:hidden mb-8 flex items-center gap-2.5">
            <div className="h-10 w-10 rounded-xl bg-gradient-primary grid place-items-center shadow-glow">
              <Tv className="h-5 w-5 text-primary-foreground" />
            </div>
            <p className="font-display text-xl font-bold">Signix</p>
          </div>
          <h2 className="font-display text-2xl font-bold">Bem-vindo de volta</h2>
          <p className="text-sm text-muted-foreground mt-1">Acesse seu painel administrativo.</p>

          <form onSubmit={onSubmit} className="mt-8 space-y-4">
            <Field icon={Mail} label="E-mail" type="email" placeholder="voce@empresa.com" defaultValue="ana@signix.com" />
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-medium text-muted-foreground">Senha</label>
                <Link to="/recuperar-senha" className="text-xs text-primary hover:underline">Esqueci a senha</Link>
              </div>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <input
                  type={show ? "text" : "password"}
                  defaultValue="••••••••"
                  className="w-full rounded-lg border border-input bg-surface pl-9 pr-10 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent transition-smooth"
                />
                <button type="button" onClick={() => setShow(!show)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                  {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <label className="flex items-center gap-2 text-xs">
              <input type="checkbox" className="rounded border-border bg-surface text-primary focus:ring-ring" />
              <span className="text-muted-foreground">Manter conectado por 30 dias</span>
            </label>

            <button type="submit" className="w-full inline-flex items-center justify-center gap-2 rounded-lg bg-gradient-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground shadow-glow hover:opacity-95 transition-smooth">
              Entrar no painel <ArrowRight className="h-4 w-4" />
            </button>

            <div className="relative my-6">
              <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-border" /></div>
              <div className="relative flex justify-center"><span className="bg-background px-3 text-[11px] uppercase tracking-widest text-muted-foreground">ou</span></div>
            </div>

            <Link to="/pareamento" className="block w-full rounded-lg border border-border bg-surface px-4 py-2.5 text-center text-sm font-medium hover:bg-accent transition-smooth">
              Parear um novo player
            </Link>
          </form>
        </div>
      </div>
    </div>
  );
}

function Field({ icon: Icon, label, ...rest }: { icon: typeof Mail; label: string } & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <div>
      <label className="text-xs font-medium text-muted-foreground mb-1.5 block">{label}</label>
      <div className="relative">
        <Icon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <input
          {...rest}
          className="w-full rounded-lg border border-input bg-surface pl-9 pr-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent transition-smooth"
        />
      </div>
    </div>
  );
}
