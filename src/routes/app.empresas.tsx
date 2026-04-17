import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { PageHeader } from "@/components/ui-kit/PageHeader";
import { Panel } from "@/components/ui-kit/Panel";
import { EmptyPanel, ErrorPanel, LoadingPanel, PreviewModeBanner } from "@/components/ui-kit/data-states";
import {
  useOrganizationMutation,
  useOrganizationQuery,
  useProfileQuery,
  useSignageEnabled,
} from "@/hooks/use-signage";
import { Building2, Globe, Save } from "lucide-react";

export const Route = createFileRoute("/app/empresas")({
  head: () => ({ meta: [{ title: "Empresas — Signix" }] }),
  component: CompaniesPage,
});

type OrgForm = {
  name: string;
  cnpj: string;
  email: string;
  phone: string;
  address: string;
  city: string;
  state: string;
  language: string;
  timezone: string;
};

function CompaniesPage() {
  const hasBackend = useSignageEnabled();
  const { data: profile, isLoading: lp, error: pe, refetch: rfP } = useProfileQuery();
  const orgId = profile?.organization_id;
  const { data: org, isLoading: lo, error: oe, refetch: rfO } = useOrganizationQuery(orgId);
  const save = useOrganizationMutation(orgId);

  const [form, setForm] = useState<OrgForm>({
    name: "",
    cnpj: "",
    email: "",
    phone: "",
    address: "",
    city: "",
    state: "",
    language: "pt-BR",
    timezone: "America/Sao_Paulo",
  });

  useEffect(() => {
    if (!org) return;
    const o = org as Record<string, string | null>;
    setForm({
      name: (o.name as string) ?? "",
      cnpj: (o.cnpj as string) ?? "",
      email: (o.email as string) ?? "",
      phone: (o.phone as string) ?? "",
      address: (o.address as string) ?? "",
      city: (o.city as string) ?? "",
      state: (o.state as string) ?? "",
      language: (o.language as string) ?? "pt-BR",
      timezone: (o.timezone as string) ?? "America/Sao_Paulo",
    });
  }, [org]);

  const onSave = () => {
    save.mutate(
      {
        name: form.name,
        cnpj: form.cnpj || null,
        email: form.email || null,
        phone: form.phone || null,
        address: form.address || null,
        city: form.city || null,
        state: form.state || null,
        language: form.language,
        timezone: form.timezone,
      },
      {
        onError: (e) => {
          console.error("[Signix] save org", e);
          window.alert(e instanceof Error ? e.message : "Erro ao salvar");
        },
        onSuccess: () => void rfO(),
      },
    );
  };

  if (!hasBackend) {
    return (
      <div className="space-y-6">
        <PreviewModeBanner />
        <PageHeader title="Empresa / Organização" subtitle="Modo preview." />
        <EmptyPanel title="Organização" hint="Conecte o Supabase." />
      </div>
    );
  }

  if (lp || lo) {
    return (
      <div className="space-y-6">
        <PageHeader title="Empresa / Organização" subtitle="Carregando…" />
        <LoadingPanel />
      </div>
    );
  }

  if (pe || oe) {
    return (
      <div className="space-y-6">
        <PageHeader title="Empresa / Organização" subtitle="Erro" />
        <ErrorPanel message={(pe ?? oe)?.message ?? "Erro"} onRetry={() => { void rfP(); void rfO(); }} />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Empresa / Organização"
        subtitle="Dados da sua organização e identidade visual."
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Panel title="Identidade" className="lg:col-span-1">
          <div className="flex flex-col items-center text-center">
            <div className="h-24 w-24 rounded-2xl bg-gradient-primary grid place-items-center shadow-glow">
              <Building2 className="h-10 w-10 text-primary-foreground" />
            </div>
            <button type="button" className="mt-3 text-xs text-primary hover:underline">
              Trocar logotipo
            </button>
            <h3 className="mt-4 font-display text-lg font-bold">{form.name || "—"}</h3>
            <p className="text-xs text-muted-foreground">{form.cnpj || "—"}</p>
          </div>
        </Panel>

        <Panel
          title="Dados cadastrais"
          className="lg:col-span-2"
          actions={
            <button
              type="button"
              onClick={onSave}
              disabled={save.isPending}
              className="inline-flex items-center gap-1.5 rounded-md bg-gradient-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground shadow-glow disabled:opacity-60"
            >
              <Save className="h-3.5 w-3.5" /> Salvar
            </button>
          }
        >
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Field
              label="Nome da empresa"
              value={form.name}
              onChange={(v) => setForm((f) => ({ ...f, name: v }))}
            />
            <Field label="CNPJ" value={form.cnpj} onChange={(v) => setForm((f) => ({ ...f, cnpj: v }))} />
            <Field
              label="E-mail corporativo"
              value={form.email}
              onChange={(v) => setForm((f) => ({ ...f, email: v }))}
            />
            <Field
              label="Telefone"
              value={form.phone}
              onChange={(v) => setForm((f) => ({ ...f, phone: v }))}
            />
            <Field
              label="Endereço"
              value={form.address}
              onChange={(v) => setForm((f) => ({ ...f, address: v }))}
            />
            <Field label="Cidade" value={form.city} onChange={(v) => setForm((f) => ({ ...f, city: v }))} />
            <Field label="Estado" value={form.state} onChange={(v) => setForm((f) => ({ ...f, state: v }))} />
            <Field
              label="Idioma (código)"
              value={form.language}
              onChange={(v) => setForm((f) => ({ ...f, language: v }))}
            />
            <div className="md:col-span-2">
              <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Fuso horário</label>
              <div className="relative">
                <Globe className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <input
                  value={form.timezone}
                  onChange={(e) => setForm((f) => ({ ...f, timezone: e.target.value }))}
                  className="w-full rounded-lg border border-input bg-surface pl-9 pr-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                />
              </div>
            </div>
          </div>
        </Panel>
      </div>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div>
      <label className="text-xs font-medium text-muted-foreground mb-1.5 block">{label}</label>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-lg border border-input bg-surface px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
      />
    </div>
  );
}
