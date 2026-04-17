import { createFileRoute } from "@tanstack/react-router";
import { PageHeader } from "@/components/ui-kit/PageHeader";
import { Panel } from "@/components/ui-kit/Panel";
import { Bell, Shield, Globe, Palette, Save, Moon, Sun } from "lucide-react";

export const Route = createFileRoute("/app/configuracoes")({
  head: () => ({ meta: [{ title: "Configurações — Signix" }] }),
  component: SettingsPage,
});

function SettingsPage() {
  return (
    <div className="space-y-6">
      <PageHeader title="Configurações gerais" subtitle="Preferências do sistema, segurança e aparência." />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Panel title="Aparência" actions={<Palette className="h-4 w-4 text-muted-foreground" />}>
          <div className="space-y-4">
            <p className="text-xs text-muted-foreground">Escolha o tema do painel.</p>
            <div className="grid grid-cols-2 gap-3">
              <button className="rounded-lg border-2 border-primary bg-card p-4 text-left ring-glow">
                <Moon className="h-5 w-5 text-primary mb-2" />
                <p className="text-sm font-medium">Dark (padrão)</p>
                <p className="text-[11px] text-muted-foreground">Conforto visual em ambiente operacional.</p>
              </button>
              <button className="rounded-lg border border-border bg-card p-4 text-left hover:border-primary/40">
                <Sun className="h-5 w-5 text-warning mb-2" />
                <p className="text-sm font-medium">Light</p>
                <p className="text-[11px] text-muted-foreground">Tema claro corporativo.</p>
              </button>
            </div>
          </div>
        </Panel>

        <Panel title="Notificações" actions={<Bell className="h-4 w-4 text-muted-foreground" />}>
          <ul className="space-y-3">
            {["Tela ficou offline", "Falha de sincronização", "Nova campanha agendada", "Resumo diário por e-mail"].map((n, i) => (
              <li key={n} className="flex items-center justify-between rounded-md border border-border bg-surface/40 px-3 py-2">
                <span className="text-sm">{n}</span>
                <button className={`relative h-5 w-9 rounded-full ${i % 2 === 0 ? "bg-primary" : "bg-muted"}`}>
                  <span className={`absolute top-0.5 h-4 w-4 rounded-full bg-background transition-all ${i % 2 === 0 ? "left-4" : "left-0.5"}`} />
                </button>
              </li>
            ))}
          </ul>
        </Panel>

        <Panel title="Segurança" actions={<Shield className="h-4 w-4 text-muted-foreground" />}>
          <div className="space-y-3">
            <Toggle label="Autenticação em dois fatores (2FA)" on />
            <Toggle label="Forçar troca de senha a cada 90 dias" />
            <Toggle label="Bloquear sessão após 30min ociosa" on />
            <Toggle label="Logs de IP em cada login" on />
          </div>
        </Panel>

        <Panel title="Localização" actions={<Globe className="h-4 w-4 text-muted-foreground" />}>
          <div className="space-y-3">
            <Field label="Idioma padrão" value="Português (Brasil)" />
            <Field label="Fuso horário" value="America/Sao_Paulo (UTC -03:00)" />
            <Field label="Formato de data" value="DD/MM/YYYY" />
          </div>
        </Panel>
      </div>

      <div className="flex justify-end">
        <button className="inline-flex items-center gap-1.5 rounded-md bg-gradient-primary px-4 py-2 text-xs font-semibold text-primary-foreground shadow-glow">
          <Save className="h-3.5 w-3.5" /> Salvar configurações
        </button>
      </div>
    </div>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <label className="text-xs font-medium text-muted-foreground mb-1.5 block">{label}</label>
      <input defaultValue={value} className="w-full rounded-lg border border-input bg-surface px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
    </div>
  );
}

function Toggle({ label, on = false }: { label: string; on?: boolean }) {
  return (
    <div className="flex items-center justify-between rounded-md border border-border bg-surface/40 px-3 py-2">
      <span className="text-sm">{label}</span>
      <button className={`relative h-5 w-9 rounded-full ${on ? "bg-primary" : "bg-muted"}`}>
        <span className={`absolute top-0.5 h-4 w-4 rounded-full bg-background transition-all ${on ? "left-4" : "left-0.5"}`} />
      </button>
    </div>
  );
}
