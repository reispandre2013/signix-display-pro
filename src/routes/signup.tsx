import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { Tv, Mail, Lock, User, Building2, ArrowRight, Loader2 } from "lucide-react";
import { useState, FormEvent } from "react";
import { toast } from "sonner";
import { useAuth } from "@/lib/auth-context";

export const Route = createFileRoute("/signup")({
  head: () => ({ meta: [{ title: "Criar conta — Signix" }] }),
  component: SignupPage,
});

function SignupPage() {
  const [name, setName] = useState("");
  const [orgName, setOrgName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const navigate = useNavigate();
  const { signUp } = useAuth();

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (password.length < 6) {
      toast.error("Senha deve ter ao menos 6 caracteres.");
      return;
    }
    setSubmitting(true);
    const { error } = await signUp(email.trim(), password, name.trim(), orgName.trim());
    setSubmitting(false);
    if (error) {
      toast.error(error.message ?? "Não foi possível criar a conta.");
      return;
    }
    toast.success("Conta criada! Verifique seu e-mail se a confirmação estiver ativada.");
    navigate({ to: "/app", replace: true });
  };

  return (
    <div className="min-h-screen grid place-items-center bg-background bg-mesh p-6">
      <div className="w-full max-w-md">
        <div className="mb-8 flex items-center gap-2.5">
          <div className="h-10 w-10 rounded-xl bg-gradient-primary grid place-items-center shadow-glow">
            <Tv className="h-5 w-5 text-primary-foreground" />
          </div>
          <p className="font-display text-xl font-bold">Signix</p>
        </div>
        <h2 className="font-display text-2xl font-bold">Criar nova conta</h2>
        <p className="text-sm text-muted-foreground mt-1">
          Você será o <span className="text-foreground font-semibold">Admin Master</span> da nova organização.
        </p>

        <form onSubmit={onSubmit} className="mt-8 space-y-4">
          <Field icon={User} label="Seu nome" value={name} onChange={setName} required placeholder="Ana Souza" />
          <Field icon={Building2} label="Nome da organização" value={orgName} onChange={setOrgName} required placeholder="Minha Empresa" />
          <Field icon={Mail} label="E-mail" type="email" value={email} onChange={setEmail} required placeholder="voce@empresa.com" />
          <Field icon={Lock} label="Senha (mín. 6 caracteres)" type="password" value={password} onChange={setPassword} required placeholder="••••••••" />

          <button
            type="submit"
            disabled={submitting}
            className="w-full inline-flex items-center justify-center gap-2 rounded-lg bg-gradient-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground shadow-glow hover:opacity-95 disabled:opacity-60"
          >
            {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <>Criar conta <ArrowRight className="h-4 w-4" /></>}
          </button>

          <p className="text-center text-xs text-muted-foreground">
            Já tem conta? <Link to="/login" className="text-primary hover:underline">Entrar</Link>
          </p>
        </form>
      </div>
    </div>
  );
}

function Field({
  icon: Icon, label, value, onChange, type = "text", required, placeholder,
}: {
  icon: typeof Mail;
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  required?: boolean;
  placeholder?: string;
}) {
  return (
    <div>
      <label className="text-xs font-medium text-muted-foreground mb-1.5 block">{label}</label>
      <div className="relative">
        <Icon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <input
          type={type}
          required={required}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className="w-full rounded-lg border border-input bg-surface pl-9 pr-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent"
        />
      </div>
    </div>
  );
}
