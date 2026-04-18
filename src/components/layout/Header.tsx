import { Search, Bell, ChevronDown, HelpCircle, Plus, LogOut } from "lucide-react";
import { Link, useLocation, useNavigate } from "@tanstack/react-router";
import { useState, useRef, useEffect } from "react";
import { useAuth } from "@/lib/auth-context";
import { toast } from "sonner";

const breadcrumbs: Record<string, string> = {
  "/app": "Dashboard",
  "/app/monitoramento": "Monitoramento em tempo real",
  "/app/telas": "Dispositivos",
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

const roleLabel: Record<string, string> = {
  admin_master: "Admin Master",
  gestor: "Gestor",
  operador: "Operador",
  visualizador: "Visualizador",
};

export function Header() {
  const { pathname } = useLocation();
  const router = useRouter();
  const title = breadcrumbs[pathname] ?? "Signix";
  const { profile, user, signOut } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  const displayName = profile?.name ?? user?.email ?? "Usuário";
  const initials = displayName
    .split(" ")
    .map((s) => s[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  const handleLogout = async () => {
    await signOut();
    toast.success("Você saiu da conta.");
    navigate({ to: "/login", replace: true });
  };

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
          <kbd className="hidden md:inline-flex items-center rounded border border-border px-1.5 py-0.5 text-[10px] text-muted-foreground font-mono">⌘K</kbd>
        </div>

        <div className="ml-auto flex items-center gap-2">
          <Link
            to="/app/campanhas"
            className="hidden md:inline-flex items-center gap-1.5 rounded-md bg-gradient-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground shadow-glow hover:opacity-90 transition-smooth"
          >
            <Plus className="h-3.5 w-3.5" /> Nova campanha
          </Link>
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

          <div ref={ref} className="relative ml-2">
            <button
              onClick={() => setOpen((v) => !v)}
              className="flex items-center gap-2.5 rounded-lg border border-border bg-surface pl-1.5 pr-2.5 py-1 hover:bg-accent transition-smooth"
            >
              <div className="h-7 w-7 rounded-md bg-gradient-primary grid place-items-center text-xs font-bold text-primary-foreground">
                {initials || "U"}
              </div>
              <div className="hidden sm:flex flex-col leading-tight text-left">
                <span className="text-xs font-semibold truncate max-w-[140px]">{displayName}</span>
                <span className="text-[10px] text-muted-foreground">
                  {profile ? roleLabel[profile.role] : ""}
                </span>
              </div>
              <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
            </button>
            {open && (
              <div className="absolute right-0 mt-2 w-56 rounded-lg border border-border bg-card shadow-lg overflow-hidden z-40">
                <div className="px-3 py-2.5 border-b border-border">
                  <p className="text-xs font-semibold truncate">{user?.email}</p>
                  <p className="text-[10px] text-muted-foreground mt-0.5">
                    {profile ? roleLabel[profile.role] : "Sem perfil"}
                  </p>
                </div>
                <button
                  onClick={handleLogout}
                  className="w-full flex items-center gap-2 px-3 py-2.5 text-xs hover:bg-surface text-left"
                >
                  <LogOut className="h-3.5 w-3.5" /> Sair da conta
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
