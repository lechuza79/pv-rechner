/**
 * Das Versandprotokoll der Presse-Aussendungen — in der Datenbank, nie in einer
 * Datei.
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

export const PRESSE_VERSAND_DDL = `
  create table if not exists presse_versand (
    id bigserial primary key,
    empfaenger text not null,
    domain text not null,
    anlass text not null check (anlass in ('pressemitteilung', 'update')),
    kreise text[] not null default '{}',
    schub text,
    betreff text not null,
    text text not null,
    message_id text,
    gesendet_am timestamptz,
    vermerkt_am timestamptz not null default now(),
    herkunft text not null default 'versandlauf'
  );
  create unique index if not exists presse_versand_einmal on presse_versand (lower(empfaenger), betreff);
  create index if not exists presse_versand_domain on presse_versand (domain);
  alter table presse_versand enable row level security;
  notify pgrst, 'reload schema';
`;

export type PresseAnlass = "pressemitteilung" | "update";

export type PresseVersandEintrag = {
  empfaenger: string;
  anlass: PresseAnlass;
  kreise: string[];
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
export function anlassAusBetreff(betreff: string): PresseAnlass | null {
  if (/^Pressemitteilung:/.test(betreff)) return "pressemitteilung";
  if (/^Update: Solar-Zahlen/.test(betreff)) return "update";
  return null;
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
export async function vermerkeVorVersand(db: Db, e: PresseVersandEintrag): Promise<number> {
  const empfaenger = e.empfaenger.trim().toLowerCase();
  const { data, error } = await db
    .from("presse_versand")
    .insert({
      empfaenger,
      domain: domainVon(empfaenger),
      anlass: e.anlass,
      kreise: e.kreise,
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
    .from("presse_versand")
    .update({ message_id: messageId, gesendet_am: am.toISOString() })
    .eq("id", id);
  if (error) throw new Error(`Bestätigung für Eintrag ${id} fehlgeschlagen: ${error.message}`);
}

/** Alle Redaktionen, die schon etwas von uns bekommen haben — je Domain. */
export async function schonAngeschrieben(db: Db): Promise<Map<string, { empfaenger: string; betreff: string; am: string | null }[]>> {
  const raus = new Map<string, { empfaenger: string; betreff: string; am: string | null }[]>();
  for (let von = 0; ; von += 1000) {
    const { data, error } = await db
      .from("presse_versand")
      .select("domain, empfaenger, betreff, gesendet_am, vermerkt_am")
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
