// ─── Fundstellen: was über eine Aussendung veröffentlicht wurde ─────────────
//
// WHY (07.10.2026): Ten evaluations in a row were reported as complete and
// were not. The evaluation asked two sources — the mailbox and visitors who
// arrived through a link — and both only see a publication that someone
// answered about or clicked through. Missed on this day alone: Niedere Börde
// (own website, same day as the letter), the district of Kaiserslautern (own
// website, no link), and four press articles from the press release (Moers,
// Blieskastel, Mönchengladbach, a second Kaiserslautern article). The backlink
// index already listed three of them; the evaluation printed only their domain
// names under "bitte selbst ansehen", and nobody did.
//
// Two sources were missing, and this module holds their rules:
//   1. the backlink index, page by page instead of domain by domain;
//   2. the websites of every recipient, read for a mention of us — with or
//      without a link.
//
// Pure functions only; the run itself is scripts/outreach-fundstellen.ts.

/** Domain ohne Schema und `www.`. */
export function domainVon(url: string): string {
  return url.replace(/^https?:\/\//i, "").split(/[/?#]/)[0].replace(/^www\./i, "").toLowerCase();
}

/** Adresse ohne Schema, `www.`, Abfrageteil und Schrägstrich am Ende — zum Vergleichen. */
export function normiereUrl(url: string): string {
  const ohne = url.trim().replace(/^https?:\/\//i, "").replace(/^www\./i, "").split("#")[0].split("?")[0];
  let dekodiert = ohne;
  try {
    dekodiert = decodeURI(ohne);
  } catch {
    // A broken escape stays as it is; comparing the raw form is still better than throwing.
  }
  return dekodiert.replace(/\/+$/, "").toLowerCase();
}

/**
 * Nennt dieser Seitentext UNS? Das Wort „Solar-Check" allein reicht nicht:
 * Klimaschutzagenturen und Verbraucherzentralen bieten eine Beratung dieses
 * Namens an (Bad Münder am 07.10.2026, Kelkheim und drei weitere im
 * September). Zählt nur mit unserer Domain — oder mit dem Register, auf das
 * sich jede unserer Zahlen beruft (Radio 90,1 nannte uns ohne Domain:
 * „Solar Check auf Grundlage von Daten aus dem Marktstammdatenregister").
 */
export function nenntUns(text: string): boolean {
  if (/solar-check\.io/i.test(text)) return true;
  return /solar[\s-]?check[\s\S]{0,300}?marktstammdaten/i.test(text) || /marktstammdaten[\s\S]{0,300}?solar[\s-]?check/i.test(text);
}

/** Verlinkt dieser HTML-Text auf uns? */
export function verlinktUns(html: string): boolean {
  return /href=["']https?:\/\/(www\.)?solar-check\.io/i.test(html);
}

/**
 * Ist ein Eintrag aus dem Backlink-Index eine mögliche Veröffentlichung?
 * Der Index führt dutzende Spam-Domains (Casinos, Läden, Linkfarmen), die auf
 * die Startseite zeigen. Eine Veröffentlichung über einen Brief oder eine
 * Pressemitteilung verweist dagegen auf eine Ortsseite oder einen Ratgeber —
 * oder sie kommt von einer Domain, die wir angeschrieben haben. Bewusst KEINE
 * Sperrliste: Die wüchse mit jeder neuen Linkfarm.
 */
export function moeglicheVeroeffentlichung(ziel: string, quelleDomain: string, bekannteDomains: Set<string>): boolean {
  if (bekannteDomains.has(quelleDomain)) return true;
  return /solar-check\.io\/(solar-atlas|ratgeber|balkonkraftwerk|photovoltaik-foerderung)\//i.test(ziel);
}

/**
 * Welche Links einer Startseite lohnen das Nachsehen? Nachrichten-Übersichten
 * und alles, was nach unserem Thema klingt. Eine Gemeindeseite hat hunderte
 * Links; alle zu lesen kostete Stunden und belastete fremde Server.
 */
export const LINK_THEMA = /solar|photovolt|balkon|sonnen|speicher|platz-?\d|spitzen|ranking|energie|klima/i;
export const LINK_UEBERSICHT = /aktuell|news|nachricht|presse|neuigkeit|meldung|artikel/i;

export type Fund = {
  /** Wo wir es gefunden haben. */
  quelle: "verweis" | "website";
  url: string;
  /** Angeschriebene Gemeinde oder Redaktion, deren Website das ist — falls bekannt. */
  empfaenger?: string;
  mitLink: boolean;
};

/**
 * Was ist offen? Ein Fund ist erledigt, sobald seine Adresse belegt ist —
 * eingetragen als Veröffentlichung, oder in einer Notiz verworfen. Eine zweite
 * Liste „gesichtet" wäre eine zweite Wahrheit neben der Notiz.
 */
export function offeneFunde(funde: Fund[], erledigt: Iterable<string>): Fund[] {
  const bekannt = new Set([...erledigt].map(normiereUrl));
  const gesehen = new Set<string>();
  const offen: Fund[] = [];
  for (const f of funde) {
    const n = normiereUrl(f.url);
    if (bekannt.has(n) || gesehen.has(n)) continue;
    gesehen.add(n);
    offen.push(f);
  }
  return offen;
}

/** Alle Adressen, die in einem Notiztext stehen. */
export function adressenIn(text: string | null | undefined): string[] {
  return [...(text ?? "").matchAll(/https?:\/\/[^\s)"'<>]+/g)].map((m) => m[0].replace(/[.,;]+$/, ""));
}

/** Startseite oder Nachrichtenliste — dort steht höchstens ein Anriss. */
export function istUebersicht(url: string): boolean {
  const pfad = normiereUrl(url).split("/").slice(1).join("/");
  if (!pfad) return true;
  if (/(^|[/_-])(topic|kategorie|category|tag|rubrik)([/_-]|$)/i.test(pfad)) return true;
  const letzter = pfad.split("/").pop() ?? "";
  return LINK_UEBERSICHT.test(pfad) && letzter.split(/[-_]/).length < 4;
}

/**
 * Ein Anriss auf der Startseite oder in der Nachrichtenliste ist kein eigener
 * Beitrag, sobald der Artikel dahinter bekannt ist (homburg1.de führte am
 * 07.10.2026 denselben Artikel auf Startseite und Liste — drei „Funde").
 * Steht auf der Domain sonst nichts, bleibt der Anriss stehen: Dann ist er
 * der einzige Hinweis.
 */
export function ohneUebersichten(funde: Fund[], erledigt: Iterable<string>): Fund[] {
  const artikelDomains = new Set<string>();
  for (const u of erledigt) if (!istUebersicht(u)) artikelDomains.add(domainVon(u));
  for (const f of funde) if (!istUebersicht(f.url)) artikelDomains.add(domainVon(f.url));
  return funde.filter((f) => !istUebersicht(f.url) || !artikelDomains.has(domainVon(f.url)));
}
