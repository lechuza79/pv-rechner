import { NextResponse } from "next/server";
import { supabase } from "../../../../lib/supabase-server";
import { SAMMLUNG_TABELLE } from "../../../../lib/angebot-sammlung";
import {
  ANGEBOT_CHECK_NUTZUNG_DDL,
  ANGEBOT_CHECK_NUTZUNG_TABELLE,
  ANGEBOT_CHECK_ZAEHLEN_RPC,
} from "../../../../lib/angebot-check-kontingent";

// Legt die Ablage der geprüften Angebote an. Auth: Bearer $CRON_SECRET.
//
// RLS AN, KEINE POLICY — wie bei allen internen Tabellen dieses Projekts: Die
// Zeilen sind mit dem öffentlichen Schlüssel unsichtbar und nur über den
// Service-Zugang erreichbar. Hier ist das nicht Gewohnheit, sondern der Punkt:
// Auch wenn keine Zeile jemanden benennt, ist die Sammlung nichts, was ein
// Browser abfragen können soll.
//
// Seit 28.09.2026 legt die Route AUSSERDEM das globale Tageskontingent an
// (Zähltabelle + atomare Zählfunktion, lib/angebot-check-kontingent.ts). Sie
// MUSS gelaufen sein, bevor ANGEBOT_CHECK_AKTIV=1 gesetzt wird — ohne die
// Funktion antwortet der Angebots-Check auf jeden Aufruf mit 503 (fail closed).
// Danach einmal /api/security/setup laufen lassen: Deren Selbstauskunft prüft
// die Rechte auf der neuen Funktion mit. Mehrfach ausführbar.

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const SQL = `
create table if not exists ${SAMMLUNG_TABELLE} (
  id bigserial primary key,
  gewerk text not null,
  geraet text,
  marke text,
  groesse numeric,
  gesamtpreis integer,
  spez_kosten integer,
  positionen_mit_preis text[] not null default '{}',
  positionen_gebuendelt text[] not null default '{}',
  positionen_fehlend text[] not null default '{}',
  betraege jsonb not null default '{}'::jsonb,
  region text,
  monat text not null,
  erfasst_am timestamptz not null default now()
);
alter table ${SAMMLUNG_TABELLE} enable row level security;
create index if not exists ${SAMMLUNG_TABELLE}_gewerk_groesse on ${SAMMLUNG_TABELLE} (gewerk, groesse);
`;

export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret) return NextResponse.json({ error: "CRON_SECRET not configured" }, { status: 500 });
  if (req.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!supabase) return NextResponse.json({ error: "no database" }, { status: 500 });

  const { error } = await supabase.rpc("exec_sql", { sql: SQL });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const kontingent = await supabase.rpc("exec_sql", { sql: ANGEBOT_CHECK_NUTZUNG_DDL });
  if (kontingent.error) {
    return NextResponse.json({ error: kontingent.error.message, schritt: "tageskontingent" }, { status: 500 });
  }
  // PostgREST sieht eine neue Funktion erst nach einem Schema-Reload.
  await supabase.rpc("exec_sql", { sql: "NOTIFY pgrst, 'reload schema';" });

  return NextResponse.json({
    ok: true,
    tabelle: SAMMLUNG_TABELLE,
    kontingent: { tabelle: ANGEBOT_CHECK_NUTZUNG_TABELLE, funktion: ANGEBOT_CHECK_ZAEHLEN_RPC },
  });
}
