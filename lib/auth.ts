"use client";

import { useEffect, useState } from "react";
import { createClient } from "./supabase-browser";
import type { User } from "@supabase/supabase-js";

export type AuthState =
  | { status: "loading" }
  | { status: "authed"; user: User }
  | { status: "anon" };

export function useAuth(): AuthState {
  const [state, setState] = useState<AuthState>({ status: "loading" });

  useEffect(() => {
    const supabase = createClient();

    supabase.auth.getUser().then(({ data: { user } }) => {
      setState(user ? { status: "authed", user } : { status: "anon" });
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setState(session?.user ? { status: "authed", user: session.user } : { status: "anon" });
    });

    return () => subscription.unsubscribe();
  }, []);

  return state;
}

export async function signInWithMagicLink(email: string, options?: { next?: string }) {
  const supabase = createClient();
  const next = options?.next || "/dashboard";
  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: {
      emailRedirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}`,
    },
  });
  return { error };
}

export async function signOut() {
  const supabase = createClient();
  await supabase.auth.signOut();
}
