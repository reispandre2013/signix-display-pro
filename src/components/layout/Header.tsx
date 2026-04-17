import { Search, Bell, ChevronDown, HelpCircle, Plus } from "lucide-react";
import { Link, useLocation } from "@tanstack/react-router";

const breadcrumbs: Record<string, string> = {
  "/app": "Dashboard",
  "/app/monitoramento": "Monitoramento em tempo real",
  "/app/telas": "Telas / Players",
  "/app/grupos": "Grupos de telas",
  "/app/midias": "Biblioteca de mídias",
  "/app/playlists": "Playlists",
  "/app/campanhas": "Campanhas",
  "/app/agendamentos": "Agendamentos",
  "/app/preview": "Preview de campanhas",
  "/app/empresas": "Empresas",
  "/app/unidades": "Unidades",
  "/app/usuarios": "Usuários e permissões",
  "/app/relatorios": "Relatórios",
  "/app/alertas": "Alertas e falhas",
  "/app/auditoria": "Logs e auditoria",
  "/app/configuracoes": "Configurações gerais",
};

export function Header() {
  const { pathname } = useLocation();
  const title = breadcrumbs[pathname] ?? "Signix";

  return (
    <header className="sticky top-0 z-30 glass border-b border-border">
      <div className="flex h-16 items-center gap-4 px-6">
        <div className="flex flex-col">
          <span className="text-[11px] uppercase tracking-widest text-muted-foreground">
            Signix · Painel
          </span>
          <h1 className="font-display text-base font-semibold leading-none">{title}</h1>
        </div>

        <div className="ml-6 hidden md:flex items-center gap-2 rounded-lg border border-border bg-surface px-3 py-1.5 w-80 max-w-full">
          <Search className="h-4 w-4 text-muted-foreground" />
          <input
            placeholder="Buscar telas, campanhas, mídias…"
            className="flex-1 bg-transparent text-sm placeholder:text-muted-foreground focus:outline-none"
          />
          <kbd className="hidden md:inline-flex items-center rounded border border-border px-1.5 py-0.5 text-[10px] text-muted-foreground font-mono">
            ⌘K
          </kbd>
        </div>

        <div className="ml-auto flex items-center gap-2">
          <button className="hidden md:inline-flex items-center gap-1.5 rounded-md bg-gradient-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground shadow-glow hover:opacity-90 transition-smooth">
            <Plus className="h-3.5 w-3.5" /> Nova campanha
          </button>
          <button className="h-9 w-9 grid place-items-center rounded-md border border-border hover:bg-surface transition-smooth">
            <HelpCircle className="h-4 w-4 text-muted-foreground" />
          </button>
          <Link
            to="/app/alertas"
            className="relative h-9 w-9 grid place-items-center rounded-md border border-border hover:bg-surface transition-smooth"
          >
            <Bell className="h-4 w-4 text-muted-foreground" />
            <span className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-destructive ring-2 ring-background" />
          </Link>
          <div className="ml-2 flex items-center gap-2.5 rounded-lg border border-border bg-surface pl-1.5 pr-2.5 py-1">
            <div className="h-7 w-7 rounded-md bg-gradient-primary grid place-items-center text-xs font-bold text-primary-foreground">
              AS
            </div>
            <div className="hidden sm:flex flex-col leading-tight">
              <span className="text-xs font-semibold">Ana Souza</span>
              <span className="text-[10px] text-muted-foreground">Admin Master</span>
            </div>
            <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
          </div>
        </div>
      </div>
    </header>
  );
}
