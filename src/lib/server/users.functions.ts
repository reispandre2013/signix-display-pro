import { createServerFn } from "@tanstack/react-start";
import { getRequestHeader } from "@tanstack/react-start/server";
import { createClient } from "@supabase/supabase-js";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

const SUPABASE_URL = process.env.SUPABASE_URL ?? process.env.VITE_SUPABASE_URL ?? "";
const ANON_KEY =
  process.env.SUPABASE_ANON_KEY ??
  process.env.SUPABASE_PUBLISHABLE_KEY ??
  process.env.VITE_SUPABASE_ANON_KEY ??
  "";

type Role = "admin_master" | "gestor" | "operador" | "visualizador";

interface CreateInput {
  email: string;
  name: string;
  role: Role;
  mode: "password" | "invite";
  password?: string;
}

function validate(input: unknown): CreateInput {
  if (typeof input !== "object" || input === null) throw new Error("Payload inválido.");
  const { email, name, role, mode, password } = input as Record<string, unknown>;
  if (typeof email !== "string" || !/^\S+@\S+\.\S+$/.test(email))
    throw new Error("E-mail inválido.");
  if (typeof name !== "string" || name.trim().length < 2) throw new Error("Nome inválido.");
  if (
    role !== "admin_master" &&
    role !== "gestor" &&
    role !== "operador" &&
    role !== "visualizador"
  )
    throw new Error("Perfil inválido.");
  if (mode !== "password" && mode !== "invite") throw new Error("Modo inválido.");
  if (mode === "password" && (typeof password !== "string" || password.length < 6))
    throw new Error("Senha precisa de ao menos 6 caracteres.");
  return {
    email: email.trim().toLowerCase(),
    name: name.trim(),
    role,
    mode,
    password: typeof password === "string" ? password : undefined,
  };
}

export const createOrgUser = createServerFn({ method: "POST" })
  .inputValidator(validate)
  .handler(async ({ data }) => {
    // 1) Identifica o caller via JWT do header Authorization
    const authHeader = getRequestHeader("authorization") ?? "";
    const token = authHeader.replace(/^Bearer\s+/i, "");
    if (!token) throw new Error("Não autenticado.");

    const userClient = createClient(SUPABASE_URL, ANON_KEY, {
      global: { headers: { Authorization: `Bearer ${token}` } },
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const { data: userData, error: userErr } = await userClient.auth.getUser();
    if (userErr || !userData.user) throw new Error("Sessão inválida.");
    const callerAuthId = userData.user.id;

    // 2) Busca o profile do caller pelo admin (bypass RLS) — confirma admin_master
    const { data: callerProfile, error: profileErr } = await supabaseAdmin
      .from("profiles")
      .select("id, role, organization_id")
      .eq("auth_user_id", callerAuthId)
      .maybeSingle();
    if (profileErr) throw new Error(profileErr.message);
    if (!callerProfile) throw new Error("Perfil do solicitante não encontrado.");
    if (callerProfile.role !== "admin_master")
      throw new Error("Apenas Admin Master pode criar usuários.");

    const orgId = callerProfile.organization_id as string;

    // 3) Cria usuário no auth (password) ou envia convite
    let newAuthUserId: string;

    if (data.mode === "password") {
      const { data: created, error: createErr } = await supabaseAdmin.auth.admin.createUser({
        email: data.email,
        password: data.password,
        email_confirm: true,
        user_metadata: { name: data.name, organization_id: orgId, role: data.role },
      });
      if (createErr || !created.user) throw new Error(createErr?.message ?? "Falha ao criar usuário.");
      newAuthUserId = created.user.id;
    } else {
      const redirectTo =
        (process.env.PUBLIC_APP_URL ?? process.env.VITE_PUBLIC_APP_URL ?? "") + "/app";
      const { data: invited, error: inviteErr } = await supabaseAdmin.auth.admin.inviteUserByEmail(
        data.email,
        {
          data: { name: data.name, organization_id: orgId, role: data.role },
          redirectTo: redirectTo || undefined,
        },
      );
      if (inviteErr || !invited.user) throw new Error(inviteErr?.message ?? "Falha ao enviar convite.");
      newAuthUserId = invited.user.id;
    }

    // 4) Garante profile na MESMA organização do Admin Master
    // (tenta atualizar caso o trigger já tenha criado um profile com outra org)
    const { data: existingProfile } = await supabaseAdmin
      .from("profiles")
      .select("id")
      .eq("auth_user_id", newAuthUserId)
      .maybeSingle();

    if (existingProfile) {
      const { error: updErr } = await supabaseAdmin
        .from("profiles")
        .update({
          organization_id: orgId,
          name: data.name,
          email: data.email,
          role: data.role,
          status: "active",
        })
        .eq("id", existingProfile.id);
      if (updErr) throw new Error(updErr.message);
    } else {
      const { error: insErr } = await supabaseAdmin.from("profiles").insert({
        auth_user_id: newAuthUserId,
        organization_id: orgId,
        name: data.name,
        email: data.email,
        role: data.role,
        status: "active",
      });
      if (insErr) throw new Error(insErr.message);
    }

    return { ok: true, mode: data.mode, email: data.email };
  });
