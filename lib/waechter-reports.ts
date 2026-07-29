import { supabase } from "./supabase-server";
import type { AlertPayload } from "./alert-format";

// ─── Wächter-Berichte: Ablage statt Postfach ─────────────────────────────────
//
// WARUM (28.07.2026): Die Schleuse in lib/alert-format.ts entscheidet, ob eine
// Mail rausgeht. Sie löst damit das Postfach-Problem, schafft aber ein zweites:
// Läufe, die NICHT zugestellt werden — selbst repariert, an Claude adressiert,
// nichts zu entscheiden — hinterlassen sonst gar keine Spur mehr. Genau die will
// man aber nachlesen können, wenn eine Woche später eine Zahl komisch aussieht.
//
// Deshalb wird JEDER Lauf abgelegt, auch der stumme, und die Mail trägt nur noch
// den Link. Der eingeklappte Volltext in der Mail war keine Lösung: Gmail wirft
// <details> weg und zeigt den Inhalt ausgeklappt — die Mail wäre wieder so lang
// wie vorher, nur mit Zwischenüberschrift.
//
// Die Ablage darf den Versand nie aufhalten: schlägt sie fehl, geht die Mail
// trotzdem raus und nimmt den Volltext als Notnagel wieder mit (siehe
// buildAlertMail). Ein verlorener Bericht ist schlimmer als eine lange Mail.

export type StoredReport = {
  id: string;
  created_at: string;
  tag: string | null;
  subject: string;
  decisions: string[];
  done: string[];
  details: string | null;
  delivered: boolean;
  skip_reason: string | null;
};

export const WAECHTER_REPORTS_DDL = `
  create table if not exists waechter_reports (
    id uuid primary key default gen_random_uuid(),
    created_at timestamptz not null default now(),
    tag text,
    subject text not null,
    decisions jsonb not null default '[]'::jsonb,
    done jsonb not null default '[]'::jsonb,
    details text,
    delivered boolean not null default false,
    skip_reason text
  );
  create index if not exists waechter_reports_created_idx on waechter_reports (created_at desc);
  alter table waechter_reports enable row level security;
`;

function asStrings(v: unknown): string[] {
  return Array.isArray(v) ? v.filter((s): s is string => typeof s === "string") : [];
}

/**
 * Legt den Lauf ab und gibt seine ID zurück. `null` heißt: nicht abgelegt —
 * der Aufrufer nimmt dann den Volltext wieder in die Mail.
 */
export async function storeReport(
  p: AlertPayload,
  meta: { delivered: boolean; skipReason: string | null },
): Promise<string | null> {
  if (!supabase) return null;

  const details = typeof p.details === "string" ? p.details : typeof p.body === "string" ? p.body : null;

  try {
    const { data, error } = await supabase
      .from("waechter_reports")
      .insert({
        tag: typeof p.tag === "string" ? p.tag.slice(0, 40) : null,
        subject: typeof p.subject === "string" ? p.subject.slice(0, 300) : "(ohne Betreff)",
        decisions: asStrings(p.decisions),
        done: asStrings(p.done),
        details,
        delivered: meta.delivered,
        skip_reason: meta.skipReason,
      })
      .select("id")
      .single();

    if (error) {
      console.error(`[Watcher Alert] Bericht nicht abgelegt: ${error.message}`);
      return null;
    }
    return data?.id ?? null;
  } catch (err) {
    console.error(`[Watcher Alert] Bericht nicht abgelegt: ${err instanceof Error ? err.message : "unbekannt"}`);
    return null;
  }
}
