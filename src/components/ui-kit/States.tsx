import { Inbox, Loader2 } from "lucide-react";
import { ReactNode } from "react";

export function LoadingState({ label = "Carregando…" }: { label?: string }) {
  return (
    <div className="flex items-center justify-center py-16 text-sm text-muted-foreground gap-2">
      <Loader2 className="h-4 w-4 animate-spin" /> {label}
    </div>
  );
}

export function EmptyState({
  title,
  description,
  action,
  icon: Icon = Inbox,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
  icon?: typeof Inbox;
}) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center px-6">
      <div className="h-12 w-12 rounded-full bg-muted/50 grid place-items-center text-muted-foreground mb-3">
        <Icon className="h-5 w-5" />
      </div>
      <p className="text-sm font-semibold">{title}</p>
      {description && <p className="text-xs text-muted-foreground mt-1 max-w-sm">{description}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

export function ErrorState({ error }: { error: unknown }) {
  const msg = error instanceof Error ? error.message : "Erro desconhecido";
  return (
    <div className="rounded-md border border-destructive/30 bg-destructive/10 p-4 text-xs text-destructive">
      Falha ao carregar dados: {msg}
    </div>
  );
}
