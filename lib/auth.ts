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

/**
 * Whether the given signed-in user is an admin. Pass the user id when authed,
 * null otherwise — the check only fires for logged-in users (not the anonymous
 * majority) and caches per user for the tab session, so it costs one request.
 */
export function useIsAdmin(userId: string | null): boolean {
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    if (!userId) {
      setIsAdmin(false);
      return;
    }
    const key = `sc-admin-${userId}`;
    try {
      const cached = sessionStorage.getItem(key);
      if (cached != null) {
        setIsAdmin(cached === "1");
        return;
      }
    } catch {
      // sessionStorage unavailable — fall through to a fetch
    }
    let alive = true;
    fetch("/api/admin/status")
      .then((r) => (r.ok ? r.json() : { isAdmin: false }))
      .then((j) => {
        if (!alive) return;
        const val = !!j.isAdmin;
        setIsAdmin(val);
        try {
          sessionStorage.setItem(key, val ? "1" : "0");
        } catch {
          // ignore
        }
      })
      .catch(() => {
        if (alive) setIsAdmin(false);
      });
    return () => {
      alive = false;
    };
  }, [userId]);

  return isAdmin;
}
