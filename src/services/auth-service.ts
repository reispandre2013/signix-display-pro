import type { Session } from "@supabase/supabase-js";
import { getSupabase, hasSupabaseEnv } from "@/lib/supabase-client";

export interface SignInPayload {
  email: string;
  password: string;
}

export async function signInWithPassword(payload: SignInPayload): Promise<Session | null> {
  const supabase = getSupabase();
  if (!hasSupabaseEnv || !supabase) {
    return null;
  }

  const { data, error } = await supabase.auth.signInWithPassword({
    email: payload.email,
    password: payload.password,
  });

  if (error) {
    throw error;
  }

  return data.session;
}

export async function getCurrentSession(): Promise<Session | null> {
  const supabase = getSupabase();
  if (!hasSupabaseEnv || !supabase) {
    return null;
  }

  const { data, error } = await supabase.auth.getSession();
  if (error) {
    throw error;
  }
  return data.session;
}

export async function signOut(): Promise<void> {
  const supabase = getSupabase();
  if (!hasSupabaseEnv || !supabase) {
    return;
  }

  const { error } = await supabase.auth.signOut();
  if (error) {
    throw error;
  }
}
