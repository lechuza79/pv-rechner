// Erhebung an Versorger-Websites: Erreichen wir den richtigen Schreibtisch,
// und wie lösen sie ihre Stromkennzeichnung?
//
// Reine Funktionen — kein Netz, kein DB-Zugriff (wie `kommunen-profil.ts`, und
// aus demselben Grund: nur so ist die Auswertung ohne Abruf testbar).
//
// WARUM ES DIESES MODUL GIBT — zwei Befunde vom 23.08.2026:
//
//  1. Der Profil-Lauf vom 27.07.2026 hat eine ANDERE Frage gestellt. Er sucht
//     den nach Medienrecht Verantwortlichen (§ 18 MStV) und ein allgemeines
//     Rollen-Postfach. Gemessen an 937 Versorgern: 814 ausgewertet, aber nur 73
//     mit erkannter Funktion, und davon 38 „Redaktion". Wer die Website
//     verantwortet, ist nicht, wer ein Beratungswerkzeug einkauft.
//     `kontaktseite_url` ist in ALLEN 937 Zeilen leer — das Feld existiert, es
//     wurde nie gefüllt. Ausgerechnet das Kontaktformular ist bei Versorgern
//     aber der nach § 7 UWG saubere Erstkontakt (Legal-Checkliste 6).
//
//  2. Das Rollen-Vokabular kennt `vertrieb@` nicht. Die Adressen-Recherche vom
//     22.08.2026 führt `Vertrieb@` bei BeSte Stadtwerke ausdrücklich als Fund —
//     gefunden hat es ein Mensch, nicht der Automat.
//
// Die Trennung „abgerufen / nicht abgerufen" ist die wichtigste Zusage dieses
// Moduls. Ein gescheiterter Abruf ist KEIN Befund „hat keine
// Stromkennzeichnung" — dieselbe Fehlerklasse, gegen die der Förder-Wächter
// seine eigene Kennung `seite-unerreichbar` trägt.

import { decodeEntities, findLinkUrl, toText } from "./kommunen-profil";

// ─── Postfächer ───────────────────────────────────────────────────────────────

/**
 * Postfächer, die erkennbar zum VERTRIEB oder zur Kommunikation gehören — also
 * zu der Stelle, die ein Beratungswerkzeug auf die eigene Website stellt.
 *
 * Bewusst getrennt vom allgemeinen Rollen-Postfach (`info@`, `service@`): Beide
 * sind erreichbar, aber nur dieses landet ohne Weiterleitung am richtigen
 * Schreibtisch. Wer beide in einen Topf wirft, kann die Frage „erreichen wir
 * den Entscheider?" nicht mehr beantworten — und genau die steht hier an.
 */
export const VERTRIEB_ROLLE =
  /^(vertrieb|marketing|presse|pressestelle|kommunikation|unternehmenskommunikation|oeffentlichkeitsarbeit|öffentlichkeitsarbeit|produktmanagement|energieberatung|beratung|privatkunden|kundencenter|kundenzentrum)([.-]?\w+)?@/i;

/** Postfächer des NETZBETRIEBS. Sie sind die Meldeadresse gegenüber der
 *  Bundesnetzagentur und stehen deshalb im Anlagenregister — sie sind der
 *  Grund, warum die Adressliste systematisch danebenzeigt. */
export const NETZ_ROLLE =
  /^(netz|netze|einspeis\w*|einspeisung|netzanschluss|anschluss|zaehler\w*|zähler\w*|messstellenbetrieb|messwesen|marktkommunikation|edifact|technik|entstoerung|entstörung|bereitschaft)([.-]?\w+)?@/i;

export type PostfachArt = "vertrieb" | "allgemein" | "netz" | "person";

/** Einordnung einer einzelnen Adresse. Reihenfolge ist Absicht: Ein
 *  `vertrieb@`-Postfach schlägt die Netz-Einordnung, falls beide Muster
 *  greifen (`vertrieb-netz@` gibt es, `netz-vertrieb@` auch). */
export function postfachArt(mail: string, allgemein: RegExp): PostfachArt {
  const m = mail.trim().toLowerCase();
  if (VERTRIEB_ROLLE.test(m)) return "vertrieb";
  if (NETZ_ROLLE.test(m)) return "netz";
  if (allgemein.test(m)) return "allgemein";
  return "person";
}

/** Kontaktformular oder Kontaktseite — bei Versorgern der nach § 7 UWG saubere
 *  Erstkontakt, und deshalb kein Notbehelf, sondern der bevorzugte Weg. */
export const KONTAKT_MUSTER = /kontakt|ansprechpartner|kundenservice|schreiben-sie-uns/i;

/**
 * Kann man auf dieser Seite eine Nachricht hinterlassen?
 *
 * Das Merkmal ist das **Mehrzeilenfeld**, nicht das Formular-Element. Zwei
 * Gründe, beide gemessen:
 *
 *  - Eine erste Fassung suchte das Mehrzeilenfeld INNERHALB eines Formulars und
 *    schaute dafür 4.000 Zeichen weit. Ein echtes Kontaktformular ist länger —
 *    bei Stadtwerke Lingen fand sie deshalb nichts, obwohl auf der Kontaktseite
 *    ein Formular mit Mehrzeilenfeld steht (von Hand geprüft, 23.08.2026).
 *  - Ein Suchschlitz und ein Newsletter-Feld haben nie ein Mehrzeilenfeld. Das
 *    Merkmal grenzt also von sich aus ab, wofür die erste Fassung eine
 *    Ausschlussliste brauchte — und Ausschlusslisten veralten.
 *
 * Was es NICHT beweist: dass das Formular an den Vertrieb geht. Es beweist nur,
 * dass es einen Weg gibt, ohne Mail eine Nachricht zu hinterlassen — und genau
 * das ist der nach § 7 UWG saubere Erstkontakt.
 */
export function hatFormular(html: string): boolean {
  return /<textarea[\s>]/i.test(html);
}

// ─── Stromkennzeichnung (§ 42 EnWG) ──────────────────────────────────────────

/**
 * Die Seite, auf der der Energieträgermix steht.
 *
 * Die Begriffe sind bewusst breit: Das Gesetz nennt die Sache nicht beim Namen,
 * und die Branche benutzt mindestens vier Bezeichnungen dafür
 * (Stromkennzeichnung, Strommix, Energieträgermix, Stromherkunft).
 */
export const KENNZEICHNUNG_MUSTER =
  /stromkennzeichnung|strom-kennzeichnung|kennzeichnung\s+(?:der\s+)?strom|energietr[äa]germix|energietraegermix|energiemix|strommix|strom-mix|stromherkunft|herkunft\s*(?:unseres|des)\s*stroms/i;

/**
 * Adressen, unter denen die Kennzeichnung erfahrungsgemäß hängt, wenn sie nicht
 * von der Startseite aus verlinkt ist — nach Aussagekraft geordnet.
 *
 * Kein Rateweg über CMS-Pfade: Das sind Wörter aus der Sache, und sie werden
 * ausschließlich auf Adressen angewandt, die in der Sitemap der Website
 * WIRKLICH stehen.
 *
 * **Die Rangfolge ist der Punkt, nicht die Liste.** Ein erster Versuch nahm
 * einfach die ersten vier Treffer in Sitemap-Reihenfolge — bei Stadtwerke
 * Lingen füllten dreizehn `/strom/stromanbieter-*`-Seiten das Kontingent, und
 * die Seite mit der Kennzeichnung (Grund- und Ersatzversorgung) fiel hinten
 * runter. Ein Kontingent ohne Rangfolge misst die Reihenfolge der fremden
 * Sitemap, nicht die Sache.
 */
export const KENNZEICHNUNG_NAHBEREICH: { re: RegExp; punkte: number }[] = [
  // Die Pflichtangaben zur Belieferung — hier steht sie am häufigsten.
  { re: /ersatzversorgung|grundversorgung|pflichtangaben|verbraucherinformation/i, punkte: 3 },
  { re: /rechtlich|\bagb\b|downloads?|dokumente|infomaterial/i, punkte: 2 },
  // Produktseiten: schwach, aber besser als nichts.
  { re: /strompreis|stromtarif|\/strom(?:$|[/?#-])/i, punkte: 1 },
];

/** Die aussichtsreichsten Adressen aus einem Seitenverzeichnis, beste zuerst. */
export function nahbereichKandidaten(adressen: string[], hoechstens: number): string[] {
  return adressen
    .map((u) => {
      const punkte = KENNZEICHNUNG_NAHBEREICH.reduce((p, n) => (n.re.test(u) ? Math.max(p, n.punkte) : p), 0);
      return { u, punkte };
    })
    .filter((k) => k.punkte > 0)
    // Bei Gleichstand die kürzere Adresse zuerst: Sie liegt weiter oben im Baum
    // und ist eher die Übersichtsseite als ein einzelner Tarif.
    .sort((a, b) => b.punkte - a.punkte || a.u.length - b.u.length)
    .slice(0, hoechstens)
    .map((k) => k.u);
}

/**
 * Welches Bezugsjahr muss am Stichtag gezeigt werden?
 *
 * § 42 Abs. 1 EnWG: ab dem 1. Juli sind die Werte des VORjahres zu zeigen. Vor
 * dem 1. Juli gilt folglich noch das Jahr davor. Die Grenze wird hereingereicht
 * und nicht aus `new Date()` gezogen — dieselbe Regel wie beim Förder-Verlauf:
 * eine Funktion mit eigener Uhr lässt sich nicht prüfen.
 */
export function pflichtjahr(stichtag: Date): number {
  const j = stichtag.getUTCFullYear();
  // getUTCMonth(): 0 = Januar, also ist 6 der Juli.
  return stichtag.getUTCMonth() >= 6 ? j - 1 : j - 2;
}

/** Das jüngste auf der Seite genannte Bezugsjahr. `null`, wenn keines dasteht.
 *  Obergrenze ist das laufende Jahr — eine „2030" auf einer Seite ist ein
 *  Zielbild, kein Bezugsjahr. */
export function bezugsjahr(text: string, heute: Date): number | null {
  const max = heute.getUTCFullYear();
  let jung: number | null = null;
  for (const m of Array.from(text.matchAll(/\b(20[12]\d)\b/g))) {
    const j = Number(m[1]);
    if (j < 2015 || j > max) continue;
    if (jung === null || j > jung) jung = j;
  }
  return jung;
}

export type KennzeichnungFund = {
  url: string;
  /** Beschriftung des Verweises — sie trägt bei einem PDF das Bezugsjahr. */
  label: string;
  /** Ein PDF ist der häufigste und für den Nutzer schlechteste Fall: Er muss
   *  die Seite verlassen, und eine Grafik im PDF erfüllt § 42 Abs. 2 zwar, ist
   *  aber nicht das, was jemand auf der Website sucht. */
  pdf: boolean;
};

/**
 * Der Verweis auf die Kennzeichnung — als Seite ODER als PDF.
 *
 * Warum PDFs ausdrücklich mitgezählt werden: Bei Stadtwerke Lingen (von Hand
 * geprüft am 23.08.2026) IST die Kennzeichnung ein PDF, verlinkt als
 * „Kennzeichnung der Stromlieferung 2024" unter Grund- und Ersatzversorgung.
 * Wer nur HTML-Seiten sucht, meldet für diesen Versorger „keine
 * Stromkennzeichnung" — eine Aussage, die falsch ist und wie ein Befund aussieht.
 */
export function kennzeichnungFund(html: string, baseUrl: string): KennzeichnungFund | null {
  for (const m of Array.from(html.matchAll(/<a[^>]+href=["']([^"']+)["'][^>]*>([\s\S]{0,200}?)<\/a>/gi))) {
    const label = decodeEntities(m[2].replace(/<[^>]*>/g, " ")).replace(/\s+/g, " ").trim();
    let href: string;
    try {
      href = decodeURIComponent(m[1].toLowerCase().replace(/&amp;/g, "&"));
    } catch {
      href = m[1].toLowerCase();
    }
    if (!KENNZEICHNUNG_MUSTER.test(label) && !KENNZEICHNUNG_MUSTER.test(href)) continue;
    try {
      const u = new URL(m[1], baseUrl).toString();
      if (!u.startsWith("http")) continue;
      return { url: u, label, pdf: /\.pdf(?:$|[?#])/i.test(u) };
    } catch {
      /* unbrauchbarer Link */
    }
  }
  return null;
}

export type KennzeichnungForm = {
  /** Ein Bild, eine SVG oder eine Zeichenfläche auf der Seite. § 42 Abs. 2
   *  verlangt „in grafisch visualisierter Form" — ohne eines davon ist die
   *  Pflicht nicht erfüllt. */
  grafik: boolean;
  /** Eine echte Datentabelle. Häufigste Bauform, erfüllt die Grafikpflicht aber
   *  für sich allein nicht. */
  tabelle: boolean;
  /** Verweis auf ein PDF. Verbreitet, und für den Nutzer der schlechteste Fall
   *  — er muss die Seite verlassen. */
  pdf: string | null;
};

/**
 * Was die Seite an Darstellungsmitteln hergibt.
 *
 * **Das ist Indizienlage, kein Urteil.** Ein `<img>` kann das Logo sein, eine
 * Tabelle das Seitenraster. Die Funktion sammelt, was ein Mensch sonst von Hand
 * zusammensuchen müsste; ob die Pflicht erfüllt ist, entscheidet die
 * Handprüfung an der Stichprobe. Wer aus diesen drei Werten eine
 * Gesetzesverletzung ableitet, behauptet eine Messung, die hier nicht
 * stattfindet.
 */
export function kennzeichnungForm(html: string): KennzeichnungForm {
  const pdf = html.match(/href=["']([^"']+\.pdf(?:\?[^"']*)?)["']/i);
  return {
    grafik: /<svg[\s>]|<canvas[\s>]|<img[^>]+src=["'][^"']*\.(?:svg|png|jpe?g|webp)/i.test(html),
    tabelle: /<table[\s>]/i.test(html),
    pdf: pdf ? pdf[1] : null,
  };
}

// ─── Ein Befund je Versorger ─────────────────────────────────────────────────

const MAIL_RE = /[\w.+-]+@[\w-]+(?:\.[\w-]+)+/g;

/**
 * Adressen aus Klartext UND aus `mailto:`-Verweisen.
 *
 * Der zweite Teil ist der Grund für diese Funktion: Wer nur den Klartext
 * durchsucht, verliert jede Adresse, die ausschließlich im Verweis steht und
 * als Wort beschriftet ist (`<a href="mailto:einspeisung@sw.de">Einspeisung</a>`)
 * — beim Entfernen der Tags bleibt davon nur „Einspeisung" übrig. Gefunden am
 * eigenen Test, 23.08.2026; die Adress-Auswertung der Kommunen hat dieselbe
 * Lücke und sollte sie beim nächsten Lauf mit übernehmen.
 */
export function adressenAus(html: string, text: string): string[] {
  const raus = new Set<string>();
  for (const m of text.match(MAIL_RE) ?? []) raus.add(m);
  for (const m of Array.from(html.matchAll(/href=["']\s*mailto:([^"'?]+)/gi))) {
    const kandidat = decodeEntities(decodeURIComponent(m[1])).trim();
    if (MAIL_RE.test(kandidat)) raus.add(kandidat);
    MAIL_RE.lastIndex = 0; // globales Muster behält sonst seinen Stand
  }
  return [...raus];
}

export type Abruf = "ok" | "unerreichbar";

export type Erhebung = {
  /** Ob die Startseite überhaupt geladen werden konnte. Steht hier `unerreichbar`,
   *  ist JEDES andere Feld ohne Aussage — insbesondere heißt ein fehlender
   *  Kennzeichnungs-Link dann NICHT, dass es keine Kennzeichnung gibt. */
  abruf: Abruf;
  fehler: string | null;
  kontaktseiteUrl: string | null;
  kontaktformular: boolean;
  vertriebEmail: string | null;
  netzEmail: string | null;
  kennzeichnungUrl: string | null;
  /** Die Kennzeichnung ist eine PDF-Datei, keine Seite. */
  kennzeichnungPdf: boolean;
  kennzeichnungForm: KennzeichnungForm | null;
  kennzeichnungJahr: number | null;
  /** Zeigt die Seite das Jahr, das am Stichtag zu zeigen wäre? `null`, solange
   *  kein Jahr erkannt wurde — „unbekannt" ist nicht „veraltet". */
  kennzeichnungAktuell: boolean | null;
};

export const LEER: Erhebung = {
  abruf: "unerreichbar",
  fehler: null,
  kontaktseiteUrl: null,
  kontaktformular: false,
  vertriebEmail: null,
  netzEmail: null,
  kennzeichnungUrl: null,
  kennzeichnungPdf: false,
  kennzeichnungForm: null,
  kennzeichnungJahr: null,
  kennzeichnungAktuell: null,
};

export type SeitenSatz = {
  /** Startseite. */
  start: { url: string; html: string };
  /** Impressum, Kontaktseite, Kennzeichnungsseite — soweit geholt. */
  weitere: { url: string; html: string }[];
};

/**
 * Auswertung aus bereits geholten Seiten. Das Abrufen macht der Aufrufer, damit
 * dieselbe Auswertung im Test ohne Netz läuft.
 */
export function werteAus(
  seiten: SeitenSatz,
  eigeneDomain: string | null,
  allgemeinesRollenmuster: RegExp,
  stichtag: Date,
): Erhebung {
  const alle = [seiten.start, ...seiten.weitere];
  const gesamtHtml = alle.map((s) => s.html).join("\n");
  const gesamtText = toText(gesamtHtml);

  // Postfächer: nur die eigene Domain zählt. Adressen auf fremden Domains sind
  // Agentur oder Dienstleister — dieselbe Regel wie bei den Kommunen, und sie
  // ist dort an ~90 Gemeinden gemessen worden.
  let vertrieb: string | null = null;
  let netz: string | null = null;
  for (const roh of Array.from(new Set(adressenAus(gesamtHtml, gesamtText)))) {
    const mail = decodeEntities(roh).trim().toLowerCase();
    const dom = mail.split("@")[1];
    if (!dom) continue;
    if (eigeneDomain && dom !== eigeneDomain && !dom.endsWith(`.${eigeneDomain}`)) continue;
    const art = postfachArt(mail, allgemeinesRollenmuster);
    if (art === "vertrieb") vertrieb ??= mail;
    if (art === "netz") netz ??= mail;
  }

  const fund = kennzeichnungFund(gesamtHtml, seiten.start.url);
  const kennzeichnungUrl = fund?.url ?? null;
  const kennSeite = kennzeichnungUrl ? alle.find((s) => s.url === kennzeichnungUrl) : undefined;
  const form = kennSeite ? kennzeichnungForm(kennSeite.html) : null;
  // Bei einem PDF ist die Beschriftung die einzige Stelle, an der das Bezugsjahr
  // ohne Öffnen der Datei steht ("Kennzeichnung der Stromlieferung 2024") —
  // hilfsweise der Dateiname. Sie geht deshalb VOR dem Seitentext: Eine
  // Übersichtsseite nennt oft mehrere Jahre, der Verweis nur sein eigenes.
  const jahrAusLabel = fund ? bezugsjahr(`${fund.label} ${fund.url}`, stichtag) : null;
  const jahr = jahrAusLabel ?? (kennSeite ? bezugsjahr(toText(kennSeite.html), stichtag) : null);

  // Das Formular wird auf ALLEN geholten Seiten gesucht, nicht nur auf der, die
  // ein Verweis „Kontakt" nennt. Grund: Wo die Navigation per JavaScript
  // entsteht, kommt die Kontaktseite aus dem Seitenverzeichnis — dann gibt es
  // im HTML gar keinen Verweis auf sie, und eine Suche „nur auf der verlinkten
  // Kontaktseite" fiele auf die Startseite zurück und meldete „kein Formular"
  // für einen Versorger, der eines hat (gemessen an Stadtwerke Lingen).
  const mitFormular = alle.find((s) => hatFormular(s.html));
  const kontaktseiteUrl = mitFormular?.url ?? findLinkUrl(gesamtHtml, seiten.start.url, KONTAKT_MUSTER);

  return {
    abruf: "ok",
    fehler: null,
    kontaktseiteUrl,
    kontaktformular: !!mitFormular,
    vertriebEmail: vertrieb,
    netzEmail: netz,
    kennzeichnungUrl,
    kennzeichnungPdf: fund?.pdf ?? false,
    kennzeichnungForm: form,
    kennzeichnungJahr: jahr,
    kennzeichnungAktuell: jahr === null ? null : jahr >= pflichtjahr(stichtag),
  };
}
