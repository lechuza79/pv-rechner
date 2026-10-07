/**
 * Das Versandprotokoll aller Aussendungen an Empfänger außerhalb — eine Tabelle
 * für jede Zielgruppe, in der Datenbank, nie in einer Datei.
 *
 * EINE Tabelle statt einer je Zielgruppe (07.10.2026): Sie entstand als
 * Presse-Protokoll und wurde am selben Tag verallgemeinert. Eine neue
 * Zielgruppe (Solarparks, Gemeinden in der Schweiz) braucht damit keine neue
 * Tabelle und keinen neuen Versandlauf, sondern einen Namen in `zielgruppe`.
 * Gemeinden und Förderstellen behalten ihre eigenen, älteren Protokolle
 * (`kommunen_kontakt`, `funding_anfragen`) — sie dort zusätzlich einzutragen
 * wäre eine zweite Wahrheit.
 *
 * DER ANLASS (07.10.2026): Am 29. und 30.09.2026 gingen 138 Pressemitteilungen
 * an Lokalredaktionen hinaus, am 28.09. sieben Update-Mails. Das Skript dazu lag
 * ungetrackt in einem Arbeitsstand, und sein Protokoll — welche Redaktion was
 * bekommen hat — schrieb es in den temporären Ordner der Sitzung. Der wurde
 * aufgeräumt. Danach wusste weder das Repo noch die Datenbank, wer angeschrieben
 * war; eine andere Sitzung meldete eine Woche später „Regionalpresse nie
 * angeschrieben" und hätte denselben Redaktionen dieselbe Meldung ein zweites
 * Mal geschickt. Zurückgeholt wurde die Liste allein, weil das Skript jede Mail
 * zusätzlich im Gesendet-Ordner ablegte — eine Höflichkeit, kein Protokoll.
 *
 * DIE REGEL: Ein Eintrag entsteht VOR dem Senden. Schlägt er fehl, geht nichts
 * hinaus. Nach dem Senden wird die Kennung des Mailservers nachgetragen. Bricht
 * der Lauf dazwischen ab, steht ein Eintrag ohne Bestätigung da — lieber eine
 * vermerkte Mail, die vielleicht nicht rausging, als eine verschickte, von der
 * niemand weiß. Dieselbe Bauform wie bei Kommunen-Anschreiben und Förder-Anfragen.
 *
 * Doppelt verschickt wird nie: Dieselbe Adresse bekommt denselben Betreff kein
 * zweites Mal (eindeutiger Schlüssel in der Tabelle, nicht bloß eine Prüfung im
 * Skript — die Prüfung im Skript kennt nur, was dieser Lauf weiß).
 */

export const AUSSENDUNG_DDL = `
  create table if not exists aussendungen (
    id bigserial primary key,
    zielgruppe text not null,
    empfaenger text not null,
    domain text not null,
    anlass text not null,
    bezug text[] not null default '{}',
    schub text,
    betreff text not null,
    text text not null,
    message_id text,
    gesendet_am timestamptz,
    vermerkt_am timestamptz not null default now(),
    herkunft text not null default 'versandlauf'
  );
  create unique index if not exists aussendungen_einmal on aussendungen (zielgruppe, lower(empfaenger), betreff);
  create index if not exists aussendungen_domain on aussendungen (zielgruppe, domain);
  alter table aussendungen enable row level security;
  notify pgrst, 'reload schema';
`;

/**
 * Einmaliger Umzug des Presse-Protokolls vom 07.10.2026 in die allgemeine
 * Tabelle. Idempotent: läuft nur, solange die alte Tabelle existiert.
 */
export const AUSSENDUNG_UMZUG_SQL = `
  do $$
  begin
    if to_regclass('public.presse_versand') is not null and to_regclass('public.aussendungen') is null then
      alter table presse_versand rename to aussendungen;
      alter table aussendungen add column zielgruppe text not null default 'presse';
      alter table aussendungen alter column zielgruppe drop default;
      alter table aussendungen rename column kreise to bezug;
      alter table aussendungen drop constraint if exists presse_versand_anlass_check;
      drop index if exists presse_versand_einmal;
      drop index if exists presse_versand_domain;
      alter sequence if exists presse_versand_id_seq rename to aussendungen_id_seq;
    end if;
  end $$;
`;

/** Kurzer Name des Empfängerkreises: "presse", "solarparks", "kommunen-ch" … */
export type Zielgruppe = string;

export type AussendungEintrag = {
  zielgruppe: Zielgruppe;
  empfaenger: string;
  /** Art der Mail innerhalb der Zielgruppe ("pressemitteilung", "update", "erstkontakt" …). */
  anlass: string;
  /** Worauf sich die Mail bezieht — Kreis-, Gemeinde- oder Registerschlüssel. */
  bezug: string[];
  schub: string | null;
  betreff: string;
  text: string;
};

/** Die Domain eines Postfachs, klein geschrieben. */
export function domainVon(adresse: string): string {
  const d = adresse.trim().toLowerCase().split("@")[1];
  if (!d) throw new Error(`Keine Mailadresse: ${adresse}`);
  return d;
}

/** Welche Art Aussendung ein Betreff ist — nur für das Nachtragen alter Mails. */
export function anlassAusBetreff(betreff: string): string | null {
  if (/^Pressemitteilung:/.test(betreff)) return "pressemitteilung";
  if (/^Update: Solar-Zahlen/.test(betreff)) return "update";
  return null;
}

import { PFLICHTANGABEN, platzhalterLoecher } from "./outreach-mail";

/**
 * Was eine Mail vor dem Versand haben muss — für jede Zielgruppe gleich.
 *
 * Dieselben Angaben wie im Gemeinde-Anschreiben (`PFLICHTANGABEN`), mit einer
 * Ausnahme: Den Herkunftshinweis formuliert jede Zielgruppe selbst. Die Presse
 * schreibt „Ihre Adresse stammt aus dem Impressum Ihrer Website" statt des
 * Paragrafen — so am 29.09.2026 abgenommen. Geprüft wird deshalb, DASS die
 * Herkunft genannt ist, nicht in welchen Worten.
 *
 * Dazu jedes Loch einer Vorlage („undefined", „NaN", eine offene Klammer). Ein
 * Befund hält den GANZEN Schub an, bevor die erste Mail hinausgeht.
 */
export function aussendungsMaengel(betreff: string, text: string): string[] {
  const maengel = PFLICHTANGABEN
    .filter((p) => p.was !== "Herkunftshinweis nach Art. 14 DSGVO")
    .filter((p) => !p.pruefe(text))
    .map((p) => p.was);
  if (!/Art\. 14 DSGVO|Adresse stammt aus/.test(text)) maengel.push("Herkunft der Adresse");
  for (const l of platzhalterLoecher(betreff, text)) maengel.push(`Lücke in der Vorlage: ${l}`);
  return maengel;
}

// Minimal shape of the Supabase client we use; keeps this module free of a
// hard dependency so tests can pass a fake.
type Db = {
  from(t: string): any;
};

/**
 * Vor dem Senden vermerken. Gibt die Kennung des Eintrags zurück — oder wirft,
 * und dann darf NICHT gesendet werden.
 */
export async function vermerkeVorVersand(db: Db, e: AussendungEintrag): Promise<number> {
  const empfaenger = e.empfaenger.trim().toLowerCase();
  const { data, error } = await db
    .from("aussendungen")
    .insert({
      zielgruppe: e.zielgruppe,
      empfaenger,
      domain: domainVon(empfaenger),
      anlass: e.anlass,
      bezug: e.bezug,
      schub: e.schub,
      betreff: e.betreff,
      text: e.text,
    })
    .select("id")
    .single();
  if (error) {
    // 23505 = unique violation: this exact mail already went to this address.
    if (error.code === "23505") throw new Error(`${empfaenger} hat „${e.betreff}" schon bekommen`);
    throw new Error(`Vermerk für ${empfaenger} fehlgeschlagen: ${error.message}`);
  }
  return (data as { id: number }).id;
}

/** Nach dem Senden: Kennung des Mailservers und Zeitpunkt nachtragen. */
export async function bestaetigeVersand(db: Db, id: number, messageId: string, am = new Date()): Promise<void> {
  const { error } = await db
    .from("aussendungen")
    .update({ message_id: messageId, gesendet_am: am.toISOString() })
    .eq("id", id);
  if (error) throw new Error(`Bestätigung für Eintrag ${id} fehlgeschlagen: ${error.message}`);
}

/** Alle Empfänger einer Zielgruppe, die schon etwas von uns bekommen haben — je Domain. */
export async function schonAngeschrieben(db: Db, zielgruppe: Zielgruppe): Promise<Map<string, { empfaenger: string; betreff: string; am: string | null }[]>> {
  const raus = new Map<string, { empfaenger: string; betreff: string; am: string | null }[]>();
  for (let von = 0; ; von += 1000) {
    const { data, error } = await db
      .from("aussendungen")
      .select("domain, empfaenger, betreff, gesendet_am, vermerkt_am")
      .eq("zielgruppe", zielgruppe)
      .order("id")
      .range(von, von + 999);
    if (error) throw new Error(`Versandprotokoll lesen: ${error.message}`);
    const zeilen = (data ?? []) as { domain: string; empfaenger: string; betreff: string; gesendet_am: string | null; vermerkt_am: string }[];
    for (const z of zeilen) {
      raus.set(z.domain, [...(raus.get(z.domain) ?? []), { empfaenger: z.empfaenger, betreff: z.betreff, am: z.gesendet_am ?? z.vermerkt_am }]);
    }
    if (zeilen.length < 1000) return raus;
  }
}
