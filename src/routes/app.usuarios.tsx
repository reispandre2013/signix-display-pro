import { createFileRoute } from "@tanstack/react-router";
import { PageHeader } from "@/components/ui-kit/PageHeader";
import { Panel } from "@/components/ui-kit/Panel";
import { StatusBadge } from "@/components/ui-kit/StatusBadge";
import { LoadingState, EmptyState, ErrorState } from "@/components/ui-kit/States";
import { useUsers } from "@/lib/hooks/use-supabase-data";
import { useAuth } from "@/lib/auth-context";
import { Mail, Users, UserPlus, Loader2 } from "lucide-react";
import { useState, FormEvent } from "react";
import { toast } from "sonner";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { createOrgUser } from "@/lib/server/users.functions";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";

export const Route = createFileRoute("/app/usuarios")({
  head: () => ({ meta: [{ title: "Usuários e permissões — Signix" }] }),
  component: UsersPage,
});

const roleLabel = {
  admin_master: "Admin Master",
  gestor: "Gestor",
  operador: "Operador",
  visualizador: "Visualizador",
} as const;
const roleTone = {
  admin_master: "primary",
  gestor: "success",
  operador: "warning",
  visualizador: "neutral",
} as const;

type Role = keyof typeof roleLabel;

function UsersPage() {
  const q = useUsers();
  const users = q.data ?? [];
  const { profile } = useAuth();
  const isMaster = profile?.role === "admin_master";
  const [open, setOpen] = useState(false);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Usuários e permissões"
        subtitle="Quem tem acesso ao painel e em que nível."
        actions={
          isMaster ? (
            <button
              onClick={() => setOpen(true)}
              className="inline-flex items-center gap-2 rounded-lg bg-gradient-primary px-4 py-2 text-sm font-semibold text-primary-foreground shadow-glow hover:opacity-95"
            >
              <UserPlus className="h-4 w-4" /> Adicionar usuário
            </button>
          ) : null
        }
      />
      <Panel bodyClassName="p-0">
        {q.isLoading ? (
          <LoadingState />
        ) : q.error ? (
          <div className="p-4">
            <ErrorState error={q.error} />
          </div>
        ) : users.length === 0 ? (
          <EmptyState
            title="Nenhum usuário ainda"
            description="Convide pessoas para colaborar na sua organização."
            icon={Users}
          />
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-surface/50 text-[11px] uppercase tracking-wider text-muted-foreground">
                <th className="px-5 py-3 text-left">Usuário</th>
                <th className="px-5 py-3 text-left">Perfil</th>
                <th className="px-5 py-3 text-left">Status</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id} className="border-b border-border/50 hover:bg-surface/40">
                  <td className="px-5 py-3.5">
                    <div className="flex items-center gap-2.5">
                      <div className="h-9 w-9 rounded-full bg-gradient-primary grid place-items-center text-xs font-bold text-primary-foreground">
                        {u.name
                          .split(" ")
                          .map((n) => n[0])
                          .slice(0, 2)
                          .join("")
                          .toUpperCase()}
                      </div>
                      <div>
                        <p className="font-medium">{u.name}</p>
                        <p className="text-[11px] text-muted-foreground inline-flex items-center gap-1">
                          <Mail className="h-3 w-3" /> {u.email}
                        </p>
                      </div>
                    </div>
                  </td>
                  <td className="px-5 py-3.5">
                    <StatusBadge tone={roleTone[u.role]} label={roleLabel[u.role]} withDot={false} />
                  </td>
                  <td className="px-5 py-3.5">
                    <StatusBadge
                      tone={u.status === "active" ? "success" : "neutral"}
                      label={u.status}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Panel>

      <CreateUserDialog open={open} onOpenChange={setOpen} />
    </div>
  );
}

function CreateUserDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  const qc = useQueryClient();
  const createUserFn = useServerFn(createOrgUser);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<Role>("operador");
  const [mode, setMode] = useState<"password" | "invite">("password");
  const [password, setPassword] = useState("");

  const reset = () => {
    setName("");
    setEmail("");
    setRole("operador");
    setMode("password");
    setPassword("");
  };

  const mutation = useMutation({
    mutationFn: async (payload: {
      name: string;
      email: string;
      role: Role;
      mode: "password" | "invite";
      password?: string;
    }) => {
      // Encaminha o JWT do usuário logado pro servidor validar admin_master
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData.session?.access_token;
      if (!token) throw new Error("Sessão expirada. Entre novamente.");
      return createUserFn({
        data: payload,
        headers: { Authorization: `Bearer ${token}` },
      });
    },
    onSuccess: (res) => {
      toast.success(
        res.mode === "invite"
          ? `Convite enviado para ${res.email}.`
          : `Usuário ${res.email} criado com sucesso.`,
      );
      qc.invalidateQueries({ queryKey: ["users_profiles"] });
      reset();
      onOpenChange(false);
    },
    onError: (err: Error) => {
      toast.error(err.message ?? "Não foi possível criar o usuário.");
    },
  });

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (mode === "password" && password.length < 6) {
      toast.error("Senha deve ter ao menos 6 caracteres.");
      return;
    }
    mutation.mutate({ name, email, role, mode, password: mode === "password" ? password : undefined });
  };

  const genPassword = () => {
    const s = Math.random().toString(36).slice(2, 6) + Math.random().toString(36).slice(2, 6);
    setPassword(s);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Adicionar usuário</DialogTitle>
          <DialogDescription>
            O usuário será adicionado à sua organização.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={onSubmit} className="space-y-4">
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Nome</label>
            <input
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Maria Silva"
              className="w-full rounded-lg border border-input bg-surface px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1.5 block">E-mail</label>
            <input
              required
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="maria@empresa.com"
              className="w-full rounded-lg border border-input bg-surface px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Perfil</label>
            <select
              value={role}
              onChange={(e) => setRole(e.target.value as Role)}
              className="w-full rounded-lg border border-input bg-surface px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            >
              <option value="admin_master">Admin Master</option>
              <option value="gestor">Gestor</option>
              <option value="operador">Operador</option>
              <option value="visualizador">Visualizador</option>
            </select>
          </div>

          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1.5 block">
              Forma de acesso
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setMode("password")}
                className={`rounded-lg border px-3 py-2 text-sm transition ${
                  mode === "password"
                    ? "border-primary bg-primary/10 text-foreground"
                    : "border-input bg-surface text-muted-foreground hover:border-primary/50"
                }`}
              >
                Senha temporária
              </button>
              <button
                type="button"
                onClick={() => setMode("invite")}
                className={`rounded-lg border px-3 py-2 text-sm transition ${
                  mode === "invite"
                    ? "border-primary bg-primary/10 text-foreground"
                    : "border-input bg-surface text-muted-foreground hover:border-primary/50"
                }`}
              >
                Convite por e-mail
              </button>
            </div>
          </div>

          {mode === "password" && (
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-medium text-muted-foreground">
                  Senha temporária (mín. 6)
                </label>
                <button
                  type="button"
                  onClick={genPassword}
                  className="text-[11px] text-primary hover:underline"
                >
                  Gerar
                </button>
              </div>
              <input
                required
                type="text"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full rounded-lg border border-input bg-surface px-3 py-2.5 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-ring"
              />
              <p className="text-[11px] text-muted-foreground mt-1">
                Compartilhe com o usuário e peça que troque após entrar.
              </p>
            </div>
          )}

          <DialogFooter>
            <button
              type="button"
              onClick={() => onOpenChange(false)}
              className="rounded-lg border border-input bg-surface px-4 py-2 text-sm hover:bg-surface/70"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={mutation.isPending}
              className="inline-flex items-center justify-center gap-2 rounded-lg bg-gradient-primary px-4 py-2 text-sm font-semibold text-primary-foreground shadow-glow hover:opacity-95 disabled:opacity-60"
            >
              {mutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : mode === "invite" ? (
                "Enviar convite"
              ) : (
                "Criar usuário"
              )}
            </button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
