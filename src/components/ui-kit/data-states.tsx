import { AlertCircle, Inbox, Loader2 } from "lucide-react";
import { Panel } from "@/components/ui-kit/Panel";

export function LoadingPanel({ title = "Carregando…" }: { title?: string }) {
  return (
    <Panel title={title}>
      <div className="flex items-center justify-center gap-2 py-12 text-sm text-muted-foreground">
        <Loader2 className="h-5 w-5 animate-spin" />
        Aguarde…
      </div>
    </Panel>
  );
}

export function ErrorPanel({
  message,
  onRetry,
}: {
  message: string;
  onRetry?: () => void;
}) {
  return (
    <Panel title="Erro">
      <div className="flex flex-col items-center gap-3 py-8 text-center">
        <AlertCircle className="h-10 w-10 text-destructive" />
        <p className="text-sm text-muted-foreground max-w-md">{message}</p>
        {onRetry && (
          <button
            type="button"
            onClick={onRetry}
            className="rounded-md border border-border bg-surface px-3 py-1.5 text-xs font-medium hover:bg-accent"
          >
            Tentar novamente
          </button>
        )}
      </div>
    </Panel>
  );
}

export function EmptyPanel({
  title = "Sem dados",
  hint = "Nada para exibir no momento.",
}: {
  title?: string;
  hint?: string;
}) {
  return (
    <Panel title={title}>
      <div className="flex flex-col items-center gap-2 py-12 text-center text-muted-foreground">
        <Inbox className="h-10 w-10 opacity-50" />
        <p className="text-sm">{hint}</p>
      </div>
    </Panel>
  );
}

export function PreviewModeBanner() {
  return (
    <div className="rounded-lg border border-border bg-muted/50 px-4 py-2 text-xs text-muted-foreground">
      Modo preview: defina <code className="font-mono">VITE_SUPABASE_URL</code> e{" "}
      <code className="font-mono">VITE_SUPABASE_PUBLISHABLE_KEY</code> (ou{" "}
      <code className="font-mono">VITE_SUPABASE_ANON_KEY</code>) para conectar ao Supabase.
    </div>
  );
}
