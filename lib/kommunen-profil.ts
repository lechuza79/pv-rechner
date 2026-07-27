// Profil einer Gemeinde-Website für den Outreach: Wer ist ansprechbar, welche
// Themen gibt es als Aufhänger, und wird die Gemeinde von einer anderen Stelle
// mitverwaltet?
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
//   1. NUR Adressen auf der eigenen Domain der Gemeinde gelten als ihre eigenen.
//      Das entfernt Agentur- und Dienstleister-Adressen (advantic, readspeaker,
//      regiogate, nussbaum-medien) vollständig und ohne Sperrliste.
//   2. Eine Adresse auf FREMDER Gemeinde-Domain ist kein Fehler, sondern ein
//      Fund: sie belegt die gemeinsame Verwaltung (Witzmannsberg → vg-tittling.de).
//   3. HTML-Entities werden VOR dem Entfernen der Tags aufgelöst. Kommunen
//      verschleiern Adressen gegen Spam mit &#114;athaus@… — wer erst die Tags
//      entfernt, liest daraus „athaus@" und verschickt Post ins Leere.

export type Verantwortlich = {
  /** Wie die Angabe im Impressum überschrieben ist. */
  art: "redaktionell" | "inhaltlich" | "vertretung";
  /** Rohzeile, gekürzt — für die Anzeige im Cockpit, damit ein Mensch prüfen kann. */
  zeile: string;
  /** Erkannte Funktion, z. B. „Bürgermeister", „Referentin für Öffentlichkeitsarbeit". */
  funktion: string | null;
  /** Ist das eine operative Stelle (Redaktion/Amtsleitung) oder die gesetzliche
   *  Vertretung? Bei kleinen Gemeinden ist es fast immer Letzteres — die operative
   *  Person wird dort schlicht nicht veröffentlicht. */
  operativ: boolean;
};

export type Themenfund = { thema: Thema; url: string; begriff: string };
export type Thema = "klima" | "solar" | "blatt" | "presse";

export type GemeindeProfil = {
  impressumUrl: string | null;
  verantwortlich: Verantwortlich | null;
  /** Rollen-Postfach auf eigener Domain (info@, rathaus@, poststelle@ …). */
  rollenEmail: string | null;
  /** Personen-Adresse auf eigener Domain (vorname.nachname@). */
  personenEmail: string | null;
  /** Fremde Gemeinde-/VG-Domain aus dem Impressum → Beleg für gemeinsame Verwaltung. */
  verwaltungDomain: string | null;
  themen: Themenfund[];
};

// ─── Text-Aufbereitung ────────────────────────────────────────────────────────

const NAMED: Record<string, string> = {
  amp: "&", lt: "<", gt: ">", quot: '"', apos: "'", nbsp: " ", shy: "", auml: "ä",
  ouml: "ö", uuml: "ü", Auml: "Ä", Ouml: "Ö", Uuml: "Ü", szlig: "ß", ndash: "–", mdash: "—",
};

/** HTML-Entities auflösen — MUSS vor dem Entfernen der Tags laufen (siehe Kopf). */
export function decodeEntities(s: string): string {
  return s
    .replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCodePoint(parseInt(h, 16)))
    .replace(/&#(\d+);/g, (_, d) => String.fromCodePoint(parseInt(d, 10)))
    .replace(/&([a-zA-Z]+);/g, (m, n) => (n in NAMED ? NAMED[n] : m));
}

/** HTML → Klartext mit erhaltenen Zeilenumbrüchen an Blockgrenzen. */
export function toText(html: string): string {
  let t = html.replace(/<script[\s\S]*?<\/script>/gi, " ").replace(/<style[\s\S]*?<\/style>/gi, " ");
  t = decodeEntities(t);
  t = t.replace(/<br\s*\/?>/gi, "\n").replace(/<\/(p|div|li|tr|h[1-6]|td|section)>/gi, "\n");
  return t.replace(/<[^>]+>/g, " ").replace(/[ \t ]+/g, " ").replace(/\n{3,}/g, "\n\n");
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

/** Link zum Impressum aus der Startseite. Kommunen verlinken es per Gesetz von
 *  jeder Seite aus, meist im Fuß — die Beschriftung ist dabei sehr einheitlich. */
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

/** Funktionsbezeichnungen einer OPERATIVEN Stelle — jemand, der die Website
 *  tatsächlich pflegt. Bewusst getrennt von der gesetzlichen Vertretung. */
const OPERATIV =
  /(redaktion|webmaster|öffentlichkeitsarbeit|oeffentlichkeitsarbeit|pressestelle|pressesprecher|referent(?:in)?|geschäftsleit|geschaeftsleit|geschäftsstellenleit|hauptamtsleit|amtsleit|verwaltungsleit|sachbearbeit)/i;

/** Gesetzliche Vertretung — bei einer Gemeinde per Kommunalrecht der Bürgermeister.
 *  Steht fast immer da, sagt aber NICHTS darüber, wer die Website betreut. */
const VERTRETER =
  /(erste[rn]?\s+bürgermeister(?:in)?|oberbürgermeister(?:in)?|bürgermeister(?:in)?|buergermeister(?:in)?|gemeinschaftsvorsitzende[rn]?|verbandsvorsitzende[rn]?|landrat|landrätin)/i;

const ANKER: { art: Verantwortlich["art"]; re: RegExp }[] = [
  { art: "redaktionell", re: /redaktionell(?:e[rn]?)?\s+verantwortlich[^\n]{0,120}/i },
  { art: "inhaltlich", re: /(?:inhaltlich(?:e[rn]?)?\s+verantwortlich|verantwortlich(?:e[rn]?)?\s+für\s+(?:den\s+inhalt|die\s+inhalte)|verantwortlich\s+(?:i\.?\s*S\.?\s*d\.?|nach)\s*§?\s*(?:18|55)[^\n]{0,20})[^\n]{0,120}/i },
  { art: "vertretung", re: /(?:vertreten\s+durch|gesetzliche[rn]?\s+vertreter)[^\n]{0,120}/i },
];

/** Die aussagekräftigste Verantwortlich-Angabe aus dem Impressum-Klartext.
 *  Reihenfolge ist Absicht: „redaktionell" schlägt „inhaltlich" schlägt
 *  „vertreten durch" — je weiter vorn, desto näher an der Person, die wirklich
 *  entscheidet, was auf der Website steht. */
export function extractVerantwortlich(text: string): Verantwortlich | null {
  for (const { art, re } of ANKER) {
    const m = text.match(re);
    if (!m) continue;
    const zeile = m[0].replace(/\s+/g, " ").trim();
    const funktionMatch = zeile.match(OPERATIV) ?? zeile.match(VERTRETER);
    return {
      art,
      zeile: zeile.slice(0, 180),
      funktion: funktionMatch ? funktionMatch[0] : null,
      operativ: OPERATIV.test(zeile),
    };
  }
  return null;
}

// ─── Adressen ─────────────────────────────────────────────────────────────────

const MAIL_RE = /[\w.+-]+@[\w-]+(?:\.[\w-]+)+/g;
/** Rollen-Postfächer: an eine Funktion gebunden, nicht an eine Person. Nach der
 *  Legal-Leitplanke des Projekts diesen Vorrang geben (dämpft den DSGVO-Strang). */
const ROLLE_RE =
  /^(info|rathaus|poststelle|post|gemeinde|stadt|markt|verwaltung|hauptamt|buergermeister|bürgermeister|buergerbuero|kontakt|presse|redaktion|webmaster|webteam|web|online|internet|klimaschutz|klima|umwelt|energie)([.-]?\w+)?@/i;
/** Offensichtlich nicht zum Anschreiben geeignet. */
const UNGEEIGNET = /^(datenschutz|dsb|datenschutzbeauftragter|abuse|noreply|no-reply|postmaster)@/i;

type Adressen = { rollenEmail: string | null; personenEmail: string | null; verwaltungDomain: string | null };

/**
 * Adressen aus dem Impressum, getrennt nach eigener und fremder Domain.
 *
 * `eigeneDomain` ist die Domain der Gemeinde-Website. Alles darauf gehört der
 * Gemeinde; alles darauf NICHT ist entweder ein Dienstleister (uninteressant)
 * oder eine andere Kommune (= gemeinsame Verwaltung, sehr interessant).
 * `fremdeGemeindeDomains` entscheidet, welcher der beiden Fälle vorliegt — der
 * Aufrufer reicht die bekannten Gemeinde-Domains herein.
 */
export function extractAdressen(
  text: string,
  eigeneDomain: string | null,
  istGemeindeDomain: (domain: string) => boolean,
): Adressen {
  const out: Adressen = { rollenEmail: null, personenEmail: null, verwaltungDomain: null };
  for (const roh of Array.from(new Set(text.match(MAIL_RE) ?? []))) {
    const mail = roh.trim().toLowerCase();
    if (UNGEEIGNET.test(mail)) continue;
    const dom = mail.split("@")[1];
    if (!dom) continue;

    if (eigeneDomain && (dom === eigeneDomain || dom.endsWith(`.${eigeneDomain}`))) {
      if (ROLLE_RE.test(mail)) out.rollenEmail ??= mail;
      else out.personenEmail ??= mail;
      continue;
    }
    // Fremde Domain: nur wenn sie zu einer Kommune gehört, ist sie ein Fund.
    if (!out.verwaltungDomain && istGemeindeDomain(dom)) out.verwaltungDomain = dom;
  }
  return out;
}

// ─── Themen als Aufhänger ─────────────────────────────────────────────────────

// Reihenfolge = Priorität: eine eigene Solar-Seite ist der stärkste Aufhänger,
// danach Klimaschutz, danach das Mitteilungsblatt (bei kleinen Gemeinden häufiger
// als eine Pressestelle), zuletzt die Pressestelle selbst.
const THEMA_MUSTER: { thema: Thema; re: RegExp }[] = [
  { thema: "solar", re: /photovoltaik|solaranlage|solarkataster|solaroffensive|solarpotenzial/i },
  { thema: "klima", re: /klimaschutz|klimamanag|klimaanpassung|klimaneutral|nachhaltigkeit|energiewende|energiemanag/i },
  { thema: "blatt", re: /amtsblatt|mitteilungsblatt|gemeindeblatt|gemeindebote|stadtanzeiger/i },
  { thema: "presse", re: /pressestelle|pressearbeit|pressekontakt|öffentlichkeitsarbeit|oeffentlichkeitsarbeit/i },
];

/**
 * Themen-Aufhänger aus der Navigation.
 *
 * Gemessen: Diese Begriffe stehen im Navigationsmenü, und das ist auf jeder
 * Unterseite identisch — die Kontaktseite liefert bei KEINEM Begriff etwas
 * Zusätzliches (0 % über alle geprüften Begriffe). Ein Seitenabruf genügt also,
 * und weil es ein Menü-Link ist, kennen wir gleich das Ziel: der Aufhänger im
 * Anschreiben wird dadurch überprüfbar statt behauptet.
 */
export function extractThemen(html: string, baseUrl: string): Themenfund[] {
  const gefunden = new Map<Thema, Themenfund>();
  for (const m of Array.from(html.matchAll(/<a[^>]+href=["']([^"']+)["'][^>]*>([\s\S]{0,120}?)<\/a>/gi))) {
    const label = decodeEntities(m[2].replace(/<[^>]*>/g, " ")).replace(/\s+/g, " ").trim();
    if (!label && !m[1]) continue;
    for (const { thema, re } of THEMA_MUSTER) {
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
  return THEMA_MUSTER.map((t) => gefunden.get(t.thema)).filter((x): x is Themenfund => !!x);
}
