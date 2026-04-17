import { createFileRoute } from "@tanstack/react-router";
import { PageHeader } from "@/components/ui-kit/PageHeader";
import { Panel } from "@/components/ui-kit/Panel";
import { Building2, Globe, Save } from "lucide-react";

export const Route = createFileRoute("/app/empresas")({
  head: () => ({ meta: [{ title: "Empresas — Signix" }] }),
  component: CompaniesPage,
});

function CompaniesPage() {
  return (
    <div className="space-y-6">
      <PageHeader title="Empresa / Organização" subtitle="Dados da sua organização e identidade visual." />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Panel title="Identidade" className="lg:col-span-1">
          <div className="flex flex-col items-center text-center">
            <div className="h-24 w-24 rounded-2xl bg-gradient-primary grid place-items-center shadow-glow">
              <Building2 className="h-10 w-10 text-primary-foreground" />
            </div>
            <button className="mt-3 text-xs text-primary hover:underline">Trocar logotipo</button>
            <h3 className="mt-4 font-display text-lg font-bold">Signix Demo Corp</h3>
            <p className="text-xs text-muted-foreground">CNPJ 00.000.000/0001-00</p>
          </div>
        </Panel>

        <Panel title="Dados cadastrais" className="lg:col-span-2" actions={
          <button className="inline-flex items-center gap-1.5 rounded-md bg-gradient-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground shadow-glow">
            <Save className="h-3.5 w-3.5" /> Salvar
          </button>
        }>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Field label="Nome da empresa" value="Signix Demo Corp" />
            <Field label="CNPJ" value="00.000.000/0001-00" />
            <Field label="E-mail corporativo" value="contato@signixdemo.com" />
            <Field label="Telefone" value="(11) 4000-0000" />
            <Field label="Endereço" value="Av. Paulista, 1000" />
            <Field label="Cidade" value="São Paulo" />
            <Field label="Estado" value="SP" />
            <Field label="Idioma" value="Português (Brasil)" />
            <div className="md:col-span-2">
              <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Fuso horário</label>
              <div className="relative">
                <Globe className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <input defaultValue="America/Sao_Paulo (UTC -03:00)" className="w-full rounded-lg border border-input bg-surface pl-9 pr-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
              </div>
            </div>
          </div>
        </Panel>
      </div>
    </div>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <label className="text-xs font-medium text-muted-foreground mb-1.5 block">{label}</label>
      <input defaultValue={value} className="w-full rounded-lg border border-input bg-surface px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
    </div>
  );
}
