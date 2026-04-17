import { createFileRoute } from "@tanstack/react-router";
import { PageHeader } from "@/components/ui-kit/PageHeader";
import { StatusBadge } from "@/components/ui-kit/StatusBadge";
import { LoadingState, EmptyState, ErrorState } from "@/components/ui-kit/States";
import { Modal, FormField, TextInput, TextArea, PrimaryButton, useModalForm } from "@/components/ui-kit/FormControls";
import { useUnits, useCreateUnit, useDeleteUnit } from "@/lib/hooks/use-supabase-data";
import { Plus, MapPin, Phone, User, Trash2, Building2 } from "lucide-react";
import { useState, FormEvent } from "react";
import { toast } from "sonner";

export const Route = createFileRoute("/app/unidades")({
  head: () => ({ meta: [{ title: "Unidades — Signix" }] }),
  component: UnitsPage,
});

function UnitsPage() {
  const unitsQ = useUnits();
  const create = useCreateUnit();
  const del = useDeleteUnit();
  const form = useModalForm({ name: "", address: "", city: "", state: "", manager_name: "", manager_phone: "" });
  const [submitting, setSubmitting] = useState(false);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!form.values.name) return toast.error("Informe o nome.");
    setSubmitting(true);
    try {
      await create.mutateAsync(form.values);
      toast.success("Unidade criada.");
      form.reset();
      form.setOpen(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao criar.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Excluir unidade "${name}"?`)) return;
    try {
      await del.mutateAsync(id);
      toast.success("Excluída.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro.");
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Unidades / Locais"
        subtitle="Locais físicos onde as telas estão instaladas."
        actions={
          <button onClick={() => form.setOpen(true)} className="inline-flex items-center gap-1.5 rounded-md bg-gradient-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground shadow-glow">
            <Plus className="h-3.5 w-3.5" /> Nova unidade
          </button>
        }
      />

      {unitsQ.isLoading ? <LoadingState /> :
       unitsQ.error ? <ErrorState error={unitsQ.error} /> :
       (unitsQ.data?.length ?? 0) === 0 ? (
        <EmptyState
          title="Nenhuma unidade cadastrada"
          description="Cadastre filiais, lojas ou pontos de exibição para organizar suas telas."
          icon={Building2}
          action={<PrimaryButton onClick={() => form.setOpen(true)}><Plus className="h-3.5 w-3.5" /> Criar primeira unidade</PrimaryButton>}
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {unitsQ.data!.map((u) => (
            <article key={u.id} className="rounded-xl border border-border bg-card p-5 shadow-card hover:border-primary/40 transition-smooth">
              <div className="flex items-start justify-between">
                <div className="h-10 w-10 rounded-lg bg-primary/10 grid place-items-center text-primary"><MapPin className="h-5 w-5" /></div>
                <button onClick={() => handleDelete(u.id, u.name)} className="h-7 w-7 grid place-items-center rounded-md hover:bg-destructive/10 text-destructive">
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
              <h3 className="font-display text-base font-semibold mt-3">{u.name}</h3>
              <p className="text-xs text-muted-foreground mt-0.5">{u.address ?? "—"} {u.city && `· ${u.city}`}{u.state && `/${u.state}`}</p>
              <div className="mt-4 grid grid-cols-2 gap-2 text-[11px]">
                <div className="rounded-md bg-surface/50 px-2.5 py-1.5">
                  <div className="flex items-center gap-1 text-muted-foreground"><User className="h-3 w-3" /> Responsável</div>
                  <div className="font-medium mt-0.5 truncate">{u.manager_name ?? "—"}</div>
                </div>
                <div className="rounded-md bg-surface/50 px-2.5 py-1.5">
                  <div className="flex items-center gap-1 text-muted-foreground"><Phone className="h-3 w-3" /> Telefone</div>
                  <div className="font-medium mt-0.5 truncate">{u.manager_phone ?? "—"}</div>
                </div>
              </div>
              <div className="mt-4 pt-4 border-t border-border">
                <StatusBadge tone={u.status === "active" ? "success" : "neutral"} label={u.status} />
              </div>
            </article>
          ))}
        </div>
      )}

      <Modal open={form.open} onClose={() => form.setOpen(false)} title="Nova unidade">
        <form onSubmit={onSubmit} className="space-y-3">
          <FormField label="Nome *"><TextInput value={form.values.name} onChange={(e) => form.set("name", e.target.value)} required /></FormField>
          <FormField label="Endereço"><TextInput value={form.values.address} onChange={(e) => form.set("address", e.target.value)} /></FormField>
          <div className="grid grid-cols-2 gap-3">
            <FormField label="Cidade"><TextInput value={form.values.city} onChange={(e) => form.set("city", e.target.value)} /></FormField>
            <FormField label="Estado (UF)"><TextInput maxLength={2} value={form.values.state} onChange={(e) => form.set("state", e.target.value.toUpperCase())} /></FormField>
          </div>
          <FormField label="Responsável"><TextInput value={form.values.manager_name} onChange={(e) => form.set("manager_name", e.target.value)} /></FormField>
          <FormField label="Telefone"><TextInput value={form.values.manager_phone} onChange={(e) => form.set("manager_phone", e.target.value)} /></FormField>
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={() => form.setOpen(false)} className="rounded-md border border-border px-3 py-2 text-xs">Cancelar</button>
            <PrimaryButton type="submit" disabled={submitting}>{submitting ? "Salvando…" : "Criar unidade"}</PrimaryButton>
          </div>
        </form>
      </Modal>
    </div>
  );
}
