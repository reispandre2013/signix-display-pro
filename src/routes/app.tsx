import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { AppShell } from "@/components/layout/AppShell";
import { getCurrentSession } from "@/services/auth-service";
import { hasSupabaseEnv } from "@/lib/supabase-client";

export const Route = createFileRoute("/app")({
  head: () => ({ meta: [{ title: "Painel — Signix" }] }),
  beforeLoad: async () => {
    if (!hasSupabaseEnv) return;

    const session = await getCurrentSession();
    if (!session) {
      throw redirect({ to: "/login" });
    }
  },
  component: AppLayout,
});

function AppLayout() {
  return (
    <AppShell>
      <Outlet />
    </AppShell>
  );
}
