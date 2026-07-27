// Profil einer Organisations-Website für den Outreach: Wer ist ansprechbar,
// welche Themen gibt es als Aufhänger, und wird die Stelle von woanders mit
// verwaltet?
//
// Reine Funktionen — kein Netz, kein DB-Zugriff. Das Abrufen macht der Aufrufer
// (scripts/kommunen-kontakt-refresh.ts), damit sich die Auswertung testen lässt.
//
// WARUM DAS SO VORSICHTIG IST (gemessen 27.07.2026 an ~90 Gemeinden in BW/BY):
// Eine falsch zugeordnete Kontaktperson im Anschreiben ist teurer als gar keine.
// Die erste, naive Fassung lieferte in 15 Stichproben genau einen brauchbaren
// Treffer und mehrere falsche — das allgemeine Stadtpostfach als „Klimakontakt",
// den Verlag des Mitteilungsblatts als „Pressestelle", die Website-Agentur als
// Gemeinde. Dagegen helfen drei harte Regeln, die unten erzwungen werden:
//
//   1. NUR Adressen auf der eigenen Domain gelten als die der Organisation.
//      Das entfernt Agentur- und Dienstleister-Adressen (advantic, readspeaker,
//      regiogate, nussbaum-medien) vollständig und ohne Sperrliste.
//   2. Eine Adresse auf FREMDER Domain derselben Gattung ist kein Fehler,
//      sondern ein Fund: sie belegt die gemeinsame Verwaltung
//      (Witzmannsberg → vg-tittling.de).
//   3. HTML-Entities werden VOR dem Entfernen der Tags aufgelöst. Kommunen
//      verschleiern Adressen gegen Spam mit &#114;athaus@… — wer erst die Tags
//      entfernt, liest daraus „athaus@" und verschickt Post ins Leere.
//
// Das Vokabular ist austauschbar (siehe `Vokabular`), die Regeln sind es nicht.
// Eine zweite Kopie des Moduls mit anderen Wörtern wäre ein Fehler, kein
// Duplikat — die drei Regeln oben gingen darin garantiert wieder verloren.

export type Verantwortlich = {
  /** Wie die Angabe im Impressum überschrieben ist. */
  art: "redaktionell" | "inhaltlich" | "vertretung";
  /** Rohzeile, gekürzt — für die Anzeige im Cockpit, damit ein Mensch prüfen kann. */
  zeile: string;
  /** Erkannte Funktion, z. B. „Bürgermeister", „Referentin für Öffentlichkeitsarbeit". */
  funktion: string | null;
  /** Operative Stelle (Redaktion/Kommunikation) oder bloß die gesetzliche
   *  Vertretung? Bei kleinen Gemeinden ist es fast immer Letzteres — die
   *  operative Person wird dort schlicht nicht veröffentlicht. */
  operativ: boolean;
};

/** Offen gehalten: fremde Vokabulare bringen eigene Themen mit (Versorger z. B.
 *  „waermepumpe", „buergerbeteiligung"). Kommunen nutzen „solar" | „klima" |
 *  „blatt" | „presse". */
export type Thema = string;
export type Themenfund = { thema: Thema; url: string; begriff: string };

export type GemeindeProfil = {
  impressumUrl: string | null;
  verantwortlich: Verantwortlich | null;
  /** Rollen-Postfach auf eigener Domain (info@, rathaus@, poststelle@ …). */
  rollenEmail: string | null;
  /** Personen-Adresse auf eigener Domain (vorname.nachname@). */
  personenEmail: string | null;
  /** Fremde Domain derselben Gattung → Beleg für gemeinsame Verwaltung. */
  verwaltungDomain: string | null;
  themen: Themenfund[];
};

// ─── Vokabular ────────────────────────────────────────────────────────────────

export type Vokabular = {
  /** Funktionen einer OPERATIVEN Stelle — jemand, der die Website pflegt. */
  operativ: RegExp;
  /** Funktionen der gesetzlichen VERTRETUNG. Steht fast immer im Impressum, sagt
   *  aber nichts darüber, wer die Website betreut. Die Trennung dieser beiden
   *  Listen ist der Kern des Moduls — wer sie verwischt, schreibt die falsche
   *  Person an. */
  vertreter: RegExp;
  /** Rollen-Postfächer: an eine Funktion gebunden, nicht an eine Person. Nach
   *  der Legal-Leitplanke des Projekts bevorzugt (dämpft den DSGVO-Strang). */
  rolle: RegExp;
  /** Postfächer, die zum Anschreiben nicht taugen. */
  ungeeignet: RegExp;
  /** Themen-Aufhänger in Prioritätsreihenfolge — der erste Treffer ist der
   *  stärkste Aufhänger fürs Anschreiben. */
  themen: { thema: Thema; re: RegExp }[];
};

/** Kommunen: Rathäuser, Gemeinden, Verwaltungsgemeinschaften. */
export const KOMMUNEN_VOKABULAR: Vokabular = {
  operativ:
    /(redaktion|webmaster|öffentlichkeitsarbeit|oeffentlichkeitsarbeit|pressestelle|pressesprecher|referent(?:in)?|geschäftsleit|geschaeftsleit|geschäftsstellenleit|hauptamtsleit|amtsleit|verwaltungsleit|sachbearbeit)/i,
  vertreter:
    /(erste[rn]?\s+bürgermeister(?:in)?|oberbürgermeister(?:in)?|bürgermeister(?:in)?|buergermeister(?:in)?|gemeinschaftsvorsitzende[rn]?|verbandsvorsitzende[rn]?|landrat|landrätin)/i,
  rolle:
    /^(info|rathaus|poststelle|post|gemeinde|stadt|markt|verwaltung|hauptamt|buergermeister|bürgermeister|buergerbuero|kontakt|presse|redaktion|webmaster|webteam|web|online|internet|klimaschutz|klima|umwelt|energie)([.-]?\w+)?@/i,
  ungeeignet: /^(datenschutz|dsb|datenschutzbeauftragter|abuse|noreply|no-reply|postmaster)@/i,
  // Reihenfolge = Priorität: eine eigene Solar-Seite ist der stärkste Aufhänger,
  // danach Klimaschutz, danach das Mitteilungsblatt (bei kleinen Gemeinden
  // häufiger als eine Pressestelle — gemessen 57 % gegen 10 %), zuletzt Presse.
  themen: [
    { thema: "solar", re: /photovoltaik|solaranlage|solarkataster|solaroffensive|solarpotenzial/i },
    // „foerderung" ist ein KANDIDAT, kein Programm. Der Fund heißt nur: auf
    // dieser Website steht irgendwo etwas von Förderung. Ob es ein Programm
    // gibt, wie hoch es ist und ob es noch läuft, entscheidet ausschließlich
    // die Prüfung nach scripts/foerder-verify.md (nur Träger-Seiten gelten als
    // Beleg, Betrag/Bedingungen/Stichtag geprüft, Änderungsdatum mitgeprüft).
    // NIE automatisch nach funding_programs schreiben — das wäre genau die
    // Drift, gegen die der Förder-Wächter gebaut wurde.
    { thema: "foerderung", re: /förderprogramm|foerderprogramm|förderrichtlinie|(förder|foerder)\w*\s*(solar|photovoltaik|energie|klima|sanier)|(solar|photovoltaik|energie|klima|sanier)\w*\s*(förder|foerder)|zuschuss\s*(für\s*)?(solar|photovoltaik|energie|klima)/i },
    { thema: "klima", re: /klimaschutz|klimamanag|klimaanpassung|klimaneutral|nachhaltigkeit|energiewende|energiemanag/i },
    { thema: "blatt", re: /amtsblatt|mitteilungsblatt|gemeindeblatt|gemeindebote|stadtanzeiger/i },
    { thema: "presse", re: /pressestelle|pressearbeit|pressekontakt|öffentlichkeitsarbeit|oeffentlichkeitsarbeit/i },
  ],
};

/** Energieversorger / Stadtwerke (B2B). Vokabular aus der Stadtwerke-Session.
 *  Die Mechanik ist identisch, nur die Wörter unterscheiden sich — wichtig ist
 *  die Zuordnung: Geschäftsführung und Vorstand sind VERTRETUNG, nicht operativ.
 *  Dieselbe Falle wie der Bürgermeister bei den Kommunen. */
export const VERSORGER_VOKABULAR: Vokabular = {
  operativ:
    /(unternehmenskommunikation|presse-?\s*und\s*öffentlichkeitsarbeit|öffentlichkeitsarbeit|oeffentlichkeitsarbeit|pressesprecher(?:in)?|pressestelle|online-?redaktion|web-?redaktion|redaktion|marketing|kommunikation)/i,
  vertreter:
    /(geschäftsführung|geschäftsführer(?:in)?|geschaeftsfuehr\w*|vorstand(?:svorsitzende[rn]?)?|prokurist(?:in)?|aufsichtsrat)/i,
  rolle:
    /^(info|kontakt|service|kundenservice|presse|pressestelle|kommunikation|marketing|redaktion|webmaster|web|online|internet|energie|zentrale|mail|post)([.-]?\w+)?@/i,
  ungeeignet:
    /^(datenschutz|dsb|datenschutzbeauftragter|abuse|noreply|no-reply|postmaster|bewerbung|jobs|karriere)@/i,
  themen: [
    { thema: "solar", re: /photovoltaik|solaranlage|solarpaket|solarstrom|balkonkraftwerk|steckersolar/i },
    { thema: "speicher", re: /(strom|batterie)speicher|heimspeicher/i },
    { thema: "waermepumpe", re: /wärmepumpe|waermepumpe/i },
    { thema: "foerderung", re: /förderprogramm|foerderprogramm|förderung|foerderung/i },
    { thema: "klima", re: /klimaschutz|klimaneutral|energiewende|nachhaltigkeit/i },
    { thema: "buergerbeteiligung", re: /bürgerbeteiligung|buergerbeteiligung|mieterstrom|bürgerenergie/i },
  ],
};

// ─── Text-Aufbereitung ────────────────────────────────────────────────────────

const NAMED: Record<string, string> = {
  amp: "&", lt: "<", gt: ">", quot: '"', apos: "'", nbsp: " ", shy: "", auml: "ä",
  ouml: "ö", uuml: "ü", Auml: "Ä", Ouml: "Ö", Uuml: "Ü", szlig: "ß", ndash: "–", mdash: "—",
};

/** Zeichen aus einem Zahlwert — außerhalb des gültigen Bereichs bleibt der
 *  Originaltext stehen. `String.fromCodePoint` wirft bei zu großen Werten einen
 *  RangeError, und eine einzige kaputte Seite darf keinen Lauf über 2.000
 *  Gemeinden abbrechen (genau das ist am 27.07.2026 in Bayern passiert:
 *  „Invalid code point 3627867934" nach 75 von 2.056). */
function zeichen(n: number, original: string): string {
  return Number.isFinite(n) && n >= 0 && n <= 0x10ffff ? String.fromCodePoint(n) : original;
}

/** HTML-Entities auflösen — MUSS vor dem Entfernen der Tags laufen (siehe Kopf). */
export function decodeEntities(s: string): string {
  return s
    .replace(/&#x([0-9a-f]+);/gi, (m, h) => zeichen(parseInt(h, 16), m))
    .replace(/&#(\d+);/g, (m, d) => zeichen(parseInt(d, 10), m))
    .replace(/&([a-zA-Z]+);/g, (m, n) => (n in NAMED ? NAMED[n] : m));
}

/** HTML → Klartext mit erhaltenen Zeilenumbrüchen an Blockgrenzen. */
export function toText(html: string): string {
  let t = html.replace(/<script[\s\S]*?<\/script>/gi, " ").replace(/<style[\s\S]*?<\/style>/gi, " ");
  t = decodeEntities(t);
  t = t.replace(/<br\s*\/?>/gi, "\n").replace(/<\/(p|div|li|tr|h[1-6]|td|section)>/gi, "\n");
  return t.replace(/<[^>]+>/g, " ").replace(/[ \t ]+/g, " ").replace(/\n{3,}/g, "\n\n");
}

/** Registrierbare Domain ohne www — der Vergleichsschlüssel für „eigene Adresse". */
export function domainOf(url: string): string | null {
  try {
    return new URL(url.startsWith("http") ? url : `https://${url}`).hostname.replace(/^www\./i, "").toLowerCase();
  } catch {
    return null;
  }
}

// ─── Impressum finden ─────────────────────────────────────────────────────────

/** Link zum Impressum aus der Startseite. Es ist per § 5 DDG von jeder Seite aus
 *  verlinkt, meist im Fuß, und die Beschriftung ist sehr einheitlich. */
export function findImpressumUrl(html: string, baseUrl: string): string | null {
  for (const m of Array.from(html.matchAll(/<a[^>]+href=["']([^"']+)["'][^>]*>([\s\S]{0,120}?)<\/a>/gi))) {
    const label = decodeEntities(m[2].replace(/<[^>]*>/g, " ")).trim();
    if (!/impressum/i.test(label) && !/impressum/i.test(m[1])) continue;
    try {
      const u = new URL(m[1], baseUrl).toString();
      if (u.startsWith("http")) return u;
    } catch {
      /* unbrauchbarer Link */
    }
  }
  return null;
}

// ─── Verantwortliche ──────────────────────────────────────────────────────────

// Die Anker sind Rechtstext-Struktur und deshalb NICHT Teil des Vokabulars:
// § 18 Abs. 2 MStV und § 5 DDG formulieren bei Unternehmen wie bei Kommunen gleich.
const ANKER: { art: Verantwortlich["art"]; re: RegExp }[] = [
  { art: "redaktionell", re: /redaktionell(?:e[rn]?)?\s+verantwortlich[^\n]{0,120}/i },
  {
    art: "inhaltlich",
    re: /(?:inhaltlich(?:e[rn]?)?\s+verantwortlich|verantwortlich(?:e[rn]?)?\s+für\s+(?:den\s+inhalt|die\s+inhalte)|verantwortlich\s+(?:i\.?\s*S\.?\s*d\.?|nach)\s*§?\s*(?:18|55)[^\n]{0,20})[^\n]{0,120}/i,
  },
  { art: "vertretung", re: /(?:vertreten\s+durch|gesetzliche[rn]?\s+vertreter)[^\n]{0,120}/i },
];

/** Die aussagekräftigste Verantwortlich-Angabe aus dem Impressum-Klartext.
 *  Reihenfolge ist Absicht: „redaktionell" schlägt „inhaltlich" schlägt
 *  „vertreten durch" — je weiter vorn, desto näher an der Person, die wirklich
 *  entscheidet, was auf der Website steht. */
export function extractVerantwortlich(text: string, vok: Vokabular = KOMMUNEN_VOKABULAR): Verantwortlich | null {
  for (const { art, re } of ANKER) {
    const m = text.match(re);
    if (!m) continue;
    const zeile = m[0].replace(/\s+/g, " ").trim();
    const funktionMatch = zeile.match(vok.operativ) ?? zeile.match(vok.vertreter);
    return {
      art,
      zeile: zeile.slice(0, 180),
      funktion: funktionMatch ? funktionMatch[0] : null,
      operativ: vok.operativ.test(zeile),
    };
  }
  return null;
}

// ─── Adressen ─────────────────────────────────────────────────────────────────

const MAIL_RE = /[\w.+-]+@[\w-]+(?:\.[\w-]+)+/g;

type Adressen = { rollenEmail: string | null; personenEmail: string | null; verwaltungDomain: string | null };

/**
 * Adressen aus dem Impressum, getrennt nach eigener und fremder Domain.
 *
 * `eigeneDomain` ist die Domain der Organisation. Alles darauf gehört ihr; alles
 * darauf NICHT ist entweder ein Dienstleister (uninteressant) oder eine andere
 * Stelle derselben Gattung (= gemeinsame Verwaltung, sehr interessant).
 * `istVerwandteDomain` entscheidet, welcher der beiden Fälle vorliegt — der
 * Aufrufer reicht die bekannten Domains seiner Grundgesamtheit herein.
 */
export function extractAdressen(
  text: string,
  eigeneDomain: string | null,
  istVerwandteDomain: (domain: string) => boolean,
  vok: Vokabular = KOMMUNEN_VOKABULAR,
): Adressen {
  const out: Adressen = { rollenEmail: null, personenEmail: null, verwaltungDomain: null };
  for (const roh of Array.from(new Set(text.match(MAIL_RE) ?? []))) {
    const mail = roh.trim().toLowerCase();
    if (vok.ungeeignet.test(mail)) continue;
    const dom = mail.split("@")[1];
    if (!dom) continue;

    if (eigeneDomain && (dom === eigeneDomain || dom.endsWith(`.${eigeneDomain}`))) {
      if (vok.rolle.test(mail)) out.rollenEmail ??= mail;
      else out.personenEmail ??= mail;
      continue;
    }
    // Fremde Domain: nur wenn sie zur Grundgesamtheit gehört, ist sie ein Fund.
    if (!out.verwaltungDomain && istVerwandteDomain(dom)) out.verwaltungDomain = dom;
  }
  return out;
}

// ─── Themen als Aufhänger ─────────────────────────────────────────────────────

/**
 * Themen-Aufhänger aus der Navigation.
 *
 * Gemessen: Diese Begriffe stehen im Navigationsmenü, und das ist auf jeder
 * Unterseite identisch — die Kontaktseite liefert bei KEINEM Begriff etwas
 * Zusätzliches (0 % über alle geprüften Begriffe). Ein Seitenabruf genügt also,
 * und weil es ein Menü-Link ist, kennen wir gleich das Ziel: der Aufhänger im
 * Anschreiben wird dadurch überprüfbar statt behauptet.
 */
export function extractThemen(html: string, baseUrl: string, vok: Vokabular = KOMMUNEN_VOKABULAR): Themenfund[] {
  const gefunden = new Map<Thema, Themenfund>();
  for (const m of Array.from(html.matchAll(/<a[^>]+href=["']([^"']+)["'][^>]*>([\s\S]{0,120}?)<\/a>/gi))) {
    const label = decodeEntities(m[2].replace(/<[^>]*>/g, " ")).replace(/\s+/g, " ").trim();
    if (!label && !m[1]) continue;
    for (const { thema, re } of vok.themen) {
      if (gefunden.has(thema)) continue;
      const treffer = label.match(re) ?? m[1].match(re);
      if (!treffer) continue;
      try {
        const url = new URL(m[1], baseUrl).toString();
        if (url.startsWith("http")) gefunden.set(thema, { thema, url, begriff: label || treffer[0] });
      } catch {
        /* unbrauchbarer Link */
      }
    }
  }
  return vok.themen.map((t) => gefunden.get(t.thema)).filter((x): x is Themenfund => !!x);
}
