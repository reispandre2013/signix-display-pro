import { Link, useLocation } from "@tanstack/react-router";
import {
  LayoutDashboard,
  Building2,
  MapPin,
  Monitor,
  Layers,
  ImageIcon,
  ListVideo,
  Megaphone,
  CalendarClock,
  Activity,
  BarChart3,
  Users,
  Settings,
  Bell,
  ScrollText,
  Eye,
  Tv,
  LogOut,
  Sparkles,
} from "lucide-react";
import { cn } from "@/lib/utils";

const sections: {
  title: string;
  items: { to: string; label: string; icon: typeof LayoutDashboard }[];
}[] = [
  {
    title: "Operação",
    items: [
      { to: "/app", label: "Dashboard", icon: LayoutDashboard },
      { to: "/app/monitoramento", label: "Monitoramento", icon: Activity },
      { to: "/app/telas", label: "Telas / Players", icon: Monitor },
      { to: "/app/grupos", label: "Grupos de telas", icon: Layers },
    ],
  },
  {
    title: "Conteúdo",
    items: [
      { to: "/app/midias", label: "Biblioteca de mídias", icon: ImageIcon },
      { to: "/app/playlists", label: "Playlists", icon: ListVideo },
      { to: "/app/campanhas", label: "Campanhas", icon: Megaphone },
      { to: "/app/agendamentos", label: "Agendamentos", icon: CalendarClock },
      { to: "/app/preview", label: "Preview de campanhas", icon: Eye },
    ],
  },
  {
    title: "Organização",
    items: [
      { to: "/app/empresas", label: "Empresas", icon: Building2 },
      { to: "/app/unidades", label: "Unidades", icon: MapPin },
      { to: "/app/usuarios", label: "Usuários", icon: Users },
    ],
  },
  {
    title: "Inteligência",
    items: [
      { to: "/app/relatorios", label: "Relatórios", icon: BarChart3 },
      { to: "/app/alertas", label: "Alertas e falhas", icon: Bell },
      { to: "/app/auditoria", label: "Logs / auditoria", icon: ScrollText },
      { to: "/app/configuracoes", label: "Configurações", icon: Settings },
    ],
  },
];

export function Sidebar() {
  const { pathname } = useLocation();
  return (
    <aside className="hidden lg:flex w-64 shrink-0 flex-col border-r border-sidebar-border bg-sidebar text-sidebar-foreground">
      <div className="px-5 py-5 flex items-center gap-2.5 border-b border-sidebar-border">
        <div className="relative h-9 w-9 rounded-xl bg-gradient-primary grid place-items-center shadow-glow">
          <Tv className="h-5 w-5 text-primary-foreground" />
          <span className="absolute -top-0.5 -right-0.5 h-2.5 w-2.5 rounded-full bg-success ring-2 ring-sidebar pulse-dot" />
        </div>
        <div className="flex flex-col leading-tight">
          <span className="font-display text-lg font-bold tracking-tight">Signix</span>
          <span className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
            Digital Signage
          </span>
        </div>
      </div>

      <nav className="flex-1 overflow-y-auto scrollbar-thin px-3 py-4 space-y-6">
        {sections.map((sec) => (
          <div key={sec.title}>
            <div className="px-3 mb-1.5 text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
              {sec.title}
            </div>
            <div className="space-y-0.5">
              {sec.items.map((it) => {
                const active =
                  pathname === it.to || (it.to !== "/app" && pathname.startsWith(it.to));
                const Icon = it.icon;
                return (
                  <Link
                    key={it.to}
                    to={it.to}
                    className={cn(
                      "flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-smooth",
                      "hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
                      active &&
                        "bg-sidebar-accent text-sidebar-accent-foreground shadow-card relative",
                    )}
                  >
                    {active && (
                      <span className="absolute left-0 top-1.5 bottom-1.5 w-0.5 rounded-r-full bg-primary" />
                    )}
                    <Icon
                      className={cn("h-4 w-4", active ? "text-primary" : "text-muted-foreground")}
                    />
                    <span className="font-medium">{it.label}</span>
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      <div className="m-3 rounded-xl border border-sidebar-border bg-gradient-surface p-4">
        <div className="flex items-center gap-2 text-xs font-semibold">
          <Sparkles className="h-4 w-4 text-primary" />
          <span>Plano Enterprise</span>
        </div>
        <p className="mt-1 text-[11px] text-muted-foreground leading-snug">
          Telas ilimitadas, multi-tenant e SLA 99.9%.
        </p>
        <Link
          to="/login"
          className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-md border border-sidebar-border bg-background/40 px-3 py-1.5 text-xs font-medium hover:bg-background/70 transition-smooth"
        >
          <LogOut className="h-3.5 w-3.5" /> Sair
        </Link>
      </div>
    </aside>
  );
}
