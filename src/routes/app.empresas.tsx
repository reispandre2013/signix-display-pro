import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { PageHeader } from "@/components/ui-kit/PageHeader";
import { Panel } from "@/components/ui-kit/Panel";
import { LoadingState, ErrorState } from "@/components/ui-kit/States";
import { useOrganization } from "@/lib/hooks/use-supabase-data";
import { useQueryClient, useMutation } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Building2, Globe, Save } from "lucide-react";

export const Route = createFileRoute("/app/empresas")({
  head: () => ({ meta: [{ title: "Empresa — Signix" }] }),
  component: CompaniesPage,
});

function CompaniesPage() {
  const { data: org, isLoading, error } = useOrganization();
  const qc = useQueryClient();
  const [form, setForm] = useState({
    name: "",
    cnpj: "",
    email: "",
    phone: "",
    address: "",
    city: "",
    state: "",
    timezone: "America/Sao_Paulo",
    language: "pt-BR",
  });

  useEffect(() => {
    if (org) {
      setForm({
        name: org.name ?? "",
        cnpj: org.cnpj ?? "",
        email: org.email ?? "",
        phone: org.phone ?? "",
        address: org.address ?? "",
        city: org.city ?? "",
        state: org.state ?? "",
        timezone: org.timezone ?? "America/Sao_Paulo",
        language: org.language ?? "pt-BR",
      });
    }
  }, [org]);

  const save = useMutation({
    mutationFn: async () => {
      if (!org) throw new Error("Organização não carregada.");
      const { error } = await supabase.from("organizations").update(form).eq("id", org.id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["organization"] }),
  });

  if (isLoading) return <LoadingState />;
  if (error) return <ErrorState error={error} />;

  return (
    <div className="space-y-6">
      <PageHeader title="Empresa / Organização" subtitle="Dados da sua organização e identidade visual." />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Panel title="Identidade" className="lg:col-span-1">
          <div className="flex flex-col items-center text-center">
            <div className="h-24 w-24 rounded-2xl bg-gradient-primary grid place-items-center shadow-glow">
              <Building2 className="h-10 w-10 text-primary-foreground" />
            </div>
            <h3 className="mt-4 font-display text-lg font-bold">{form.name || "—"}</h3>
            <p className="text-xs text-muted-foreground">{form.cnpj || "Sem CNPJ"}</p>
          </div>
        </Panel>

        <Panel
          title="Dados cadastrais"
          className="lg:col-span-2"
          actions={
            <button
              onClick={() => save.mutate()}
              disabled={save.isPending}
              className="inline-flex items-center gap-1.5 rounded-md bg-gradient-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground shadow-glow disabled:opacity-60"
            >
              <Save className="h-3.5 w-3.5" /> {save.isPending ? "Salvando…" : "Salvar"}
            </button>
          }
        >
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Field label="Nome da empresa" value={form.name} onChange={(v) => setForm({ ...form, name: v })} />
            <Field label="CNPJ" value={form.cnpj} onChange={(v) => setForm({ ...form, cnpj: v })} />
            <Field label="E-mail corporativo" value={form.email} onChange={(v) => setForm({ ...form, email: v })} />
            <Field label="Telefone" value={form.phone} onChange={(v) => setForm({ ...form, phone: v })} />
            <Field label="Endereço" value={form.address} onChange={(v) => setForm({ ...form, address: v })} />
            <Field label="Cidade" value={form.city} onChange={(v) => setForm({ ...form, city: v })} />
            <Field label="Estado" value={form.state} onChange={(v) => setForm({ ...form, state: v })} />
            <Field label="Idioma" value={form.language} onChange={(v) => setForm({ ...form, language: v })} />
            <div className="md:col-span-2">
              <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Fuso horário</label>
              <div className="relative">
                <Globe className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <input
                  value={form.timezone}
                  onChange={(e) => setForm({ ...form, timezone: e.target.value })}
                  className="w-full rounded-lg border border-input bg-surface pl-9 pr-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                />
              </div>
            </div>
          </div>
          {save.isError && (
            <p className="mt-3 text-xs text-destructive">Erro: {(save.error as Error).message}</p>
          )}
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
