import { createFileRoute, Link } from "@tanstack/react-router";
import { Tv, Mail, ArrowLeft } from "lucide-react";

export const Route = createFileRoute("/recuperar-senha")({
  head: () => ({ meta: [{ title: "Recuperar senha — Signix" }] }),
  component: RecoverPage,
});

function RecoverPage() {
  return (
    <div className="min-h-screen grid place-items-center bg-background bg-mesh p-6">
      <div className="w-full max-w-md rounded-2xl border border-border bg-card p-8 shadow-elegant">
        <div className="flex items-center gap-2.5 mb-6">
          <div className="h-10 w-10 rounded-xl bg-gradient-primary grid place-items-center shadow-glow">
            <Tv className="h-5 w-5 text-primary-foreground" />
          </div>
          <p className="font-display text-xl font-bold">Signix</p>
        </div>
        <h1 className="font-display text-2xl font-bold">Recuperar senha</h1>
        <p className="text-sm text-muted-foreground mt-1.5">
          Informe seu e-mail. Enviaremos um link seguro para redefinir sua senha.
        </p>

        <form onSubmit={(e) => e.preventDefault()} className="mt-6 space-y-4">
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1.5 block">E-mail</label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <input
                type="email"
                placeholder="voce@empresa.com"
                className="w-full rounded-lg border border-input bg-surface pl-9 pr-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring transition-smooth"
              />
            </div>
          </div>
          <button className="w-full rounded-lg bg-gradient-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground shadow-glow hover:opacity-95 transition-smooth">
            Enviar link de recuperação
          </button>
        </form>

        <Link to="/login" className="mt-6 inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-smooth">
          <ArrowLeft className="h-3.5 w-3.5" /> Voltar para login
        </Link>
      </div>
    </div>
  );
}
