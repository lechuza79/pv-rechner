"use client";

import { useEffect, useState } from "react";
import { createClient } from "./supabase-browser";
import type { User } from "@supabase/supabase-js";
import { FEHLERTEXT, fehlerAusMeldung, type AuthFehler } from "./auth-regeln";

export type AuthState =
  | { status: "loading" }
  | { status: "authed"; user: User }
  | { status: "anon" };

export function useAuth(): AuthState {
  const [state, setState] = useState<AuthState>({ status: "loading" });

  useEffect(() => {
    const supabase = createClient();
    // Ohne Zugangsdaten (lokale Arbeitskopie ohne eigene Umgebungsdatei) gibt es
    // keine Anmeldung — die Seite bleibt aber vollständig bedienbar. Vorher
    // warf der Client hier, und weil der Aufruf im Header jeder Seite sitzt,
    // riss das den gesamten Aufbau mit.
    if (!supabase) {
      setState({ status: "anon" });
      return;
    }

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

type AuthAntwort = { fehler?: AuthFehler };

async function ruf(pfad: string, body: unknown): Promise<AuthAntwort> {
  try {
    const res = await fetch(pfad, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (res.ok) return {};
    const daten = await res.json().catch(() => null);
    const kennung = daten?.fehler;
    return { fehler: kennung in FEHLERTEXT ? (kennung as AuthFehler) : "fehlgeschlagen" };
  } catch {
    return { fehler: "fehlgeschlagen" };
  }
}

/**
 * Anmelden mit E-Mail und Passwort.
 *
 * Der Netzaufruf läuft bewusst über den Server (siehe Kopf von
 * `app/api/auth/signin/route.ts`); der Browser übernimmt danach nur noch die
 * fertige Sitzung. Das ist ein reiner Speicher-Schreibvorgang und blockiert
 * keine anderen offenen Tabs.
 */
export async function signInWithPassword(email: string, passwort: string): Promise<AuthAntwort> {
  const supabase = createClient();
  if (!supabase) return { fehler: "nicht_eingerichtet" };

  let res: Response;
  try {
    res = await fetch("/api/auth/signin", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, passwort }),
    });
  } catch {
    return { fehler: "fehlgeschlagen" };
  }

  const daten = await res.json().catch(() => null);
  if (!res.ok) {
    const kennung = daten?.fehler;
    return { fehler: kennung in FEHLERTEXT ? (kennung as AuthFehler) : "fehlgeschlagen" };
  }

  // Die Sitzungs-Cookies stehen serverseitig bereits — sie sind die
  // maßgebliche Quelle. Der Schreibvorgang hier weckt zusätzlich den
  // Anmelde-Zustand IM Tab, damit Kopfzeile und Rechner sofort umschalten,
  // statt erst beim nächsten Seitenwechsel. Schlägt er fehl, ist das kein
  // Grund, die Anmeldung als gescheitert zu melden: Der nächste Seitenaufbau
  // liest die Sitzung ohnehin aus den Cookies.
  //
  // MIT ZEITLIMIT, und das ist kein Übermaß an Vorsicht: Auch dieser
  // Schreibvorgang nimmt die Sperre auf dem Anmelde-Speicher. Sind mehrere
  // Tabs offen, kann er dahinter warten — im Schwesterprojekt bis zum
  // Zehn-Sekunden-Limit, und der Nutzer sah „Anmeldung fehlgeschlagen",
  // obwohl die Sitzung längst stand. Nach zwei Sekunden gehen wir weiter; der
  // nächste Seitenaufbau holt den Zustand aus den Cookies.
  if (daten?.access_token && daten?.refresh_token) {
    try {
      await Promise.race([
        supabase.auth.setSession({
          access_token: daten.access_token,
          refresh_token: daten.refresh_token,
        }),
        new Promise((_, ab) => setTimeout(() => ab(new Error("zeitlimit")), 2000)),
      ]);
    } catch {
      // bewusst geschluckt — siehe oben
    }
  }
  return {};
}

/** Konto anlegen. Der Dienst schickt eine Bestätigungsmail. */
export async function signUpWithPassword(
  email: string,
  passwort: string,
  options?: { next?: string },
): Promise<AuthAntwort> {
  return ruf("/api/auth/signup", { email, passwort, next: options?.next });
}

/**
 * Mail zum Passwort-Setzen anfordern. Auch der Weg für die Konten aus der
 * Zeit vor dem Passwort-Login — sie haben keins und setzen hier ihr erstes.
 */
export async function requestPasswordReset(email: string): Promise<AuthAntwort> {
  return ruf("/api/auth/reset", { email });
}

/** Neues Passwort vergeben. Setzt voraus, dass der Link aus der Mail geöffnet wurde. */
export async function setNewPassword(passwort: string): Promise<AuthAntwort> {
  const supabase = createClient();
  if (!supabase) return { fehler: "nicht_eingerichtet" };
  const { error } = await supabase.auth.updateUser({ password: passwort });
  if (error) return { fehler: fehlerAusMeldung(error.message ?? "") };
  return {};
}

/**
 * Anmeldung über Google.
 *
 * Der Browser wird zu Google umgeleitet und kommt über dieselbe
 * Rückkehr-Adresse zurück wie jede andere Anmeldung. Google erfährt dabei, dass
 * jemand sich hier anmeldet — das steht so in der Datenschutzerklärung
 * (Abschnitt 9).
 */
export async function signInWithGoogle(options?: { next?: string }): Promise<AuthAntwort> {
  const supabase = createClient();
  if (!supabase) return { fehler: "nicht_eingerichtet" };
  const next = options?.next || "/dashboard";
  const { error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: { redirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}` },
  });
  if (error) return { fehler: "fehlgeschlagen" };
  return {};
}

export async function signOut() {
  const supabase = createClient();
  if (!supabase) return;
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
