// Was hat der Versorger schon auf seiner Website: einen Rechner? Bestandsdaten?
//
// Reine Funktionen — kein Netz. Das Abrufen macht der Aufrufer.
//
// WOZU: Der Befund entscheidet, OB und WOMIT ein Versorger angesprochen wird.
// Ein Haus ohne Werkzeug bekommt ein anderes Anschreiben als eines, das schon
// eines eingekauft hat — und wieder ein anderes als eines, dessen „Rechner" in
// Wahrheit ein Formular zur Kontaktabgabe ist.
//
// DIE DREI ZUSTÄNDE SIND DER GANZE PUNKT. Ein einziges Merkmal „hat einen
// Rechner" würde die beiden gegensätzlichen Fälle vermengen: Der echte Rechner
// heißt „versorgt, aber zahlungsbereit", der als Rechner etikettierte Leadfunnel
// heißt „hier ist unser Argument am stärksten". Wer beides zusammenwirft, zeigt
// in die falsche Richtung — das steht so schon in der Adressen-Recherche vom
// 22.08.2026 und wurde bisher nie erhoben.

import { sichtbarerText } from "./funding-screen-erkennung";
import { findLinkUrl } from "./kommunen-profil";

/** Seiten, auf denen ein Werkzeug dieser Art hängt. */
export const WERKZEUG_MUSTER =
  /rechner|kalkulator|calculator|solarcheck|solar-check|potenzial|potential|eignungs?check|wirtschaftlichkeit|amortisation|photovoltaik-check|pv-check|energiecheck|solarkataster|solardachkataster/i;

/** Seiten, auf denen Bestands- oder Atlas-artige Auswertungen stehen könnten. */
export const BESTANDSDATEN_MUSTER =
  /solaratlas|solar-atlas|energieatlas|energie-atlas|kataster|zahlen-und-fakten|zahlen-daten|energiedaten|energiemix|klimabilanz|energiebilanz|ausbaustand|erzeugungsanlagen|unsere-anlagen/i;

// ─── Merkmale eines echten Rechners ──────────────────────────────────────────

/**
 * Ein Rechner nimmt ZAHLEN entgegen und rechnet damit.
 *
 * Das Merkmal ist deshalb das Eingabefeld für einen Zahlenwert oder ein
 * Schieberegler — nicht das Wort „Rechner" in der Überschrift. Genau daran
 * unterscheiden sich die Zustände (b) und (c): Ein Leadfunnel heißt auch
 * „Rechner", fragt aber nur Name, Adresse und Telefonnummer ab.
 */
const ZAHLENEINGABE = /<input[^>]+type=["'](?:number|range)["']|<input[^>]+(?:min|step)=["'][\d.]/i;

/** Ein eingebettetes fremdes Werkzeug. Der Rahmen verrät den Anbieter. */
const FREMD_EINGEBETTET = /<iframe[^>]+src=["']([^"']+)["']/gi;

/**
 * Anbieter, deren Werkzeuge bei Versorgern nachweislich eingebettet vorkommen.
 *
 * KEINE Vollständigkeit behauptet — das ist eine Erkennungshilfe, kein
 * Marktverzeichnis. Wer hier fehlt, wird trotzdem als „fremdes Werkzeug
 * eingebettet" erkannt, nur ohne Namen.
 */
export const BEKANNTE_ANBIETER: { name: string; re: RegExp }[] = [
  { name: "tetraeder.solar", re: /tetraeder|solare-stadt|solardachkataster/i },
  { name: "Solantiq", re: /solantiq/i },
  { name: "co2online", re: /co2online|energiesparkonto/i },
  { name: "50komma2", re: /50komma2|pv-berechnung/i },
  { name: "ASEW", re: /asew\.de/i },
  { name: "Selfmade Energy", re: /selfmade-?energy/i },
  { name: "Enpal", re: /enpal/i },
  { name: "Zolar", re: /zolar/i },
  { name: "Aroundhome", re: /aroundhome/i },
  { name: "DAA", re: /daa\.net|solaranlagen-portal|taptaphome/i },
  // Gefunden bei Stadtwerke Fürstenfeldbruck (24.08.2026): eigener
  // Rechner unter ffbstromdach.solarmaker.com, verlinkt statt eingebettet.
  { name: "solarmaker", re: /solarmaker/i },
];

/**
 * Ein VERLINKTER fremder Rechner — kein Rahmen, sondern ein Verweis auf eine
 * fremde Adresse.
 *
 * Gemessen an Stadtwerke Fürstenfeldbruck: „Zum PV-Rechner" zeigt auf eine
 * eigens eingerichtete Adresse eines Anbieters. Wer nur Rahmen sucht, sieht
 * dort nichts — dabei ist ein eigens eingerichteter Rechner unter eigener
 * Adresse derselbe Beleg für Zahlungsbereitschaft wie ein eingebetteter.
 */
export function verlinkterFremdrechner(html: string, basis: string): { url: string; anbieter: string | null } | null {
  let eigen = "";
  try {
    eigen = new URL(basis).hostname.replace(/^www\./, "");
  } catch {
    return null;
  }
  for (const m of Array.from(html.matchAll(/<a[^>]+href=["'](https?:\/\/[^"']+)["'][^>]*>([\s\S]{0,200}?)<\/a>/gi))) {
    const label = m[2].replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
    if (!WERKZEUG_MUSTER.test(label) && !WERKZEUG_MUSTER.test(m[1])) continue;
    let fremd = "";
    try {
      fremd = new URL(m[1]).hostname.replace(/^www\./, "");
    } catch {
      continue;
    }
    if (fremd === eigen || fremd.endsWith(`.${eigen}`)) continue;
    // Ein Landes- oder Kreisangebot ist kein gekaufter Rechner.
    if (OEFFENTLICHES_ANGEBOT.test(m[1])) continue;
    return { url: m[1], anbieter: BEKANNTE_ANBIETER.find((a) => a.re.test(m[1]))?.name ?? null };
  }
  return null;
}

// ─── Merkmale eines Leadfunnels ──────────────────────────────────────────────

/**
 * Felder, die einen Menschen identifizieren. Ihr Vorhandensein macht aus einem
 * „Rechner" einen Leadfunnel — und ist zugleich genau das, wogegen dieses
 * Produkt antritt.
 */
const PERSONENFELD =
  /<input[^>]+(?:name|id)=["'][^"']*(?:vorname|nachname|nachnahme|anrede|telefon|hausnummer)[^"']*["']|<input[^>]+type=["']tel["']/i;

/** Nur eine Mailadresse abzufragen macht noch keinen Leadfunnel — das kann ein
 *  Newsletter sein. Erst zusammen mit einem weiteren Personenfeld wird es einer. */
const MAILFELD = /<input[^>]+type=["']email["']/i;

/**
 * Angebote der öffentlichen Hand, die ein Versorger nur einbindet.
 *
 * WARUM DAS EIN EIGENER ZUSTAND IST: Ein eingebettetes Landes- oder
 * Kreis-Solarkataster sieht aus wie ein gekauftes Werkzeug, ist aber keines —
 * **niemand im Haus hat dafür bezahlt, niemand betreut es, es gibt keinen
 * Budgetposten und keinen Zuständigen.** Wer es als „hat Budget" einsortiert,
 * sortiert genau falsch herum. Die Länder bauen und stellen kostenlos bereit.
 *
 * KEINE Vollständigkeit behauptet — jedes Bundesland heißt anders. Was hier
 * fehlt, landet als „fremd eingebettet ohne Anbieter" und damit auf „unklar",
 * nicht fälschlich auf „gekauft".
 */
export const OEFFENTLICHES_ANGEBOT =
  /solare-stadt\.de|energieatlas\.[a-z-]+\.de|solarkataster|solardachkataster|geoportal|\.bayern\.de|lanuv|energieatlas/i;

export type WerkzeugZustand =
  /** Nichts dergleichen auf der Website gefunden. */
  | "keins"
  /** Ein echter Rechner: nimmt Zahlen entgegen, fragt keine Person ab. */
  | "rechner"
  /** Ein eingekauftes Werkzeug eines bekannten Anbieters, eingebettet. Der
   *  Inhalt liegt im Rahmen und ist von außen nicht einsehbar — der Anbieter
   *  ist der Beleg. Gemessen an Stadtwerke Emden (24.08.2026). */
  | "eingekauft"
  /** Kostenloses Angebot der öffentlichen Hand, nur eingebunden. Kein Beleg
   *  für Zahlungsbereitschaft. */
  | "gratis-kataster"
  /** Heißt „Rechner", sammelt aber Kontaktdaten. */
  | "leadfunnel"
  /** Etwas ist da, aber die Bauart ließ sich nicht bestimmen. */
  | "unklar";

/**
 * Worum geht es bei dem gefundenen Werkzeug?
 *
 * DIE TRENNUNG IST DER PUNKT (gemessen 24.08.2026): Von sechs erkannten
 * „Rechnern" waren alle sechs **Tarifrechner** für Strom- und Gaspreise —
 * Schieberegler für den Jahresverbrauch. Die hat fast jedes Stadtwerk, und über
 * Photovoltaik sagen sie nichts. Ohne diese Unterscheidung misst die Erhebung
 * die Verbreitung von Tarifrechnern statt die von Solarwerkzeugen.
 *
 * Der Tarifrechner wird trotzdem festgehalten und nicht weggeworfen: Er ist ein
 * möglicher Andockpunkt (der Jahresverbrauch ist dort bereits eingegeben, genau
 * die Angabe, an der unser Rechner hängt). Ob daraus ein Angebot wird, ist offen
 * — aber ein weggeworfener Befund wäre nur mit einem neuen Abruf wiederzubeschaffen.
 */
export type WerkzeugThema = "solar" | "waermepumpe" | "tarif" | "unbekannt";

const THEMA_SOLAR = /photovoltaik|solarrechner|solar-rechner|solaranlage|solarpotenzial|solarstrom|balkonkraftwerk|steckersolar|\bpv-/i;
const THEMA_WP = /wärmepumpe|waermepumpe|heizungstausch|heizkosten/i;
const THEMA_TARIF = /tarifrechner|preisrechner|tarifvergleich|stromtarif|gastarif|strompreisrechner|verbrauchsrechner|tarif berechnen/i;

/** Das Thema aus Adresse und sichtbarem Text. Solar schlägt Wärmepumpe schlägt
 *  Tarif — ein Werkzeug, das beides anbietet, ist für uns das Solarwerkzeug. */
export function werkzeugThema(html: string, url: string): WerkzeugThema {
  let pfad = url;
  try {
    pfad = decodeURIComponent(url);
  } catch {
    /* bleibt roh */
  }
  // OHNE Navigation, Kopf und Fuss. Ein Menue listet auf jeder Unterseite
  // saemtliche Themen des Hauses auf — gemessen 24.08.2026: Stadtwerke
  // Barmstedt steht auf einer ERDGAS-Tarifrechnerseite und galt als "solar",
  // weil "Photovoltaik" im Menue stand. Dieselbe Ursache wie beim teuersten
  // Falsch-Positiv des Foerder-Screeners; deshalb dessen Funktion, keine zweite.
  // DIE ADRESSE SCHLAEGT DEN TEXT. Eine Seite unter "/erdgas/tarifrechner/"
  // ist ein Tarifrechner, auch wenn im Fliesstext Photovoltaik vorkommt —
  // gemessen an Stadtwerke Barmstedt, das genau so als "solar" galt. Die
  // Adresse ist die Absicht des Betreibers, der Text ist Umgebung.
  for (const [re, thema] of [
    [THEMA_TARIF, "tarif"],
    [THEMA_SOLAR, "solar"],
    [THEMA_WP, "waermepumpe"],
  ] as const) {
    if (re.test(pfad)) return thema;
  }
  const text = sichtbarerText(html);
  if (THEMA_SOLAR.test(text)) return "solar";
  if (THEMA_WP.test(text)) return "waermepumpe";
  if (THEMA_TARIF.test(text)) return "tarif";
  return "unbekannt";
}

export type Werkzeugbefund = {
  zustand: WerkzeugZustand;
  /** Worum geht es — Solar, Wärmepumpe oder nur ein Tarifrechner? */
  thema: WerkzeugThema;
  /** Die Seite, auf der der Fund steht. */
  url: string | null;
  /** Erkannter Anbieter eines eingebetteten Werkzeugs, wenn benennbar. */
  anbieter: string | null;
  /** Fremde Einbettung erkannt, auch ohne Anbieternamen. */
  eingebettet: boolean;
  /** Zeigt die Seite Bestands- oder Atlas-artige Auswertungen? */
  bestandsdaten: boolean;
  /** Wörtliche Belegstelle für die Handprüfung — ohne sie ist der Befund eine
   *  Behauptung. */
  beleg: string | null;
};

export const KEIN_WERKZEUG: Werkzeugbefund = {
  zustand: "keins",
  thema: "unbekannt",
  url: null,
  anbieter: null,
  eingebettet: false,
  bestandsdaten: false,
  beleg: null,
};

/**
 * Einordnung EINER Seite.
 *
 * Die Reihenfolge der Prüfungen ist die Aussage: Personenfelder schlagen
 * Zahlenfelder. Ein Werkzeug, das beides hat — erst rechnen, dann Kontaktdaten
 * abfragen —, ist ein Leadfunnel mit vorgeschalteter Rechnung, und für unsere
 * Ansprache zählt der Funnel, nicht die Rechnung.
 */
/**
 * Seiten, die NIE als Werkzeugseite gelten — egal was auf ihnen steht.
 *
 * Gemessen am Lauf über 50 (24.08.2026): Ohne diese Sperre wurden 26 von 49
 * Versorgern als „Formular-Attrappe" eingestuft, und **kein einziger davon zu
 * Recht**. Die Belege waren Suchschlitze und ganz gewöhnliche
 * Kontaktformulare — die Kontaktseite hat naturgemäß Personenfelder. Wer jede
 * geholte Seite beurteilt, misst die Kontaktseite, nicht das Werkzeug.
 */
const KEINE_WERKZEUGSEITE = /\/(?:kontakt|kontaktformular|impressum|datenschutz|newsletter|suche|karriere|jobs)\b/i;

/**
 * Trägt diese Seite überhaupt ein Werkzeug?
 *
 * Zwei Wege qualifizieren: Die Adresse oder der sichtbare Text spricht von
 * einem Rechner beziehungsweise einer Auswertung — ODER es steckt eine fremde
 * Einbettung darin. Alles andere wird gar nicht erst beurteilt.
 */
export function istWerkzeugSeite(html: string, url: string): boolean {
  if (KEINE_WERKZEUGSEITE.test(url)) return false;
  let pfad = url;
  try {
    pfad = decodeURIComponent(url);
  } catch {
    /* bleibt roh */
  }
  // Auch die reine Themenseite zählt: Bei Stadtwerke Emden hängt das gekaufte
  // Werkzeug unter „Strom / Photovoltaik", nicht unter „Rechner".
  const relevant = (s: string) =>
    WERKZEUG_MUSTER.test(s) || BESTANDSDATEN_MUSTER.test(s) || THEMA_SOLAR.test(s) || THEMA_WP.test(s);
  if (relevant(pfad)) return true;
  if (relevant(sichtbarerText(html))) return true;
  return /<iframe[^>]+src=["']https?:\/\//i.test(html);
}

export function werkzeugAusSeite(html: string, url: string): Werkzeugbefund {
  // Nicht jede Seite ist eine Werkzeugseite. Ohne diese Schranke urteilt die
  // Funktion über Kontaktseiten und Suchschlitze.
  if (!istWerkzeugSeite(html, url)) return KEIN_WERKZEUG;
  const anbieterTreffer = BEKANNTE_ANBIETER.find((a) => a.re.test(html));
  let eingebettet = false;
  let oeffentlich = false;
  for (const m of Array.from(html.matchAll(FREMD_EINGEBETTET))) {
    const src = m[1];
    // Eine Einbettung der eigenen Domain ist keine fremde. Relative Adressen
    // sind immer eigene.
    if (!/^https?:\/\//i.test(src)) continue;
    try {
      const eigen = new URL(url).hostname.replace(/^www\./, "");
      const fremd = new URL(src).hostname.replace(/^www\./, "");
      if (fremd === eigen || fremd.endsWith(`.${eigen}`)) continue;
      eingebettet = true;
      if (OEFFENTLICHES_ANGEBOT.test(src)) oeffentlich = true;
    } catch {
      /* unbrauchbare Adresse */
    }
  }

  const hatZahlen = ZAHLENEINGABE.test(html);
  const hatPerson = PERSONENFELD.test(html) || (MAILFELD.test(html) && PERSONENFELD.test(html));
  const bestandsdaten = BESTANDSDATEN_MUSTER.test(sichtbarerText(html));

  // Reihenfolge = Aussage. Das öffentliche Angebot steht VOR allem anderen:
  // Ein eingebundenes Landeskataster bringt oft eigene Zahlenfelder mit und
  // sähe sonst wie ein eigener Rechner aus — es ist aber gerade der Fall, in
  // dem niemand gezahlt hat.
  const verlinkt = verlinkterFremdrechner(html, url);
  let zustand: WerkzeugZustand;
  if (oeffentlich) zustand = "gratis-kataster";
  else if (verlinkt) zustand = "eingekauft";
  else if (hatPerson) zustand = "leadfunnel";
  else if (eingebettet && anbieterTreffer) zustand = "eingekauft";
  else if (hatZahlen) zustand = "rechner";
  else if (eingebettet || anbieterTreffer) zustand = "unklar";
  else zustand = "keins";

  return {
    zustand,
    thema: werkzeugThema(html, url),
    url: zustand === "keins" ? null : url,
    // Bei einem Gratis-Kataster wird KEIN Anbieter ausgewiesen: Der Name waere
    // technisch richtig (solare-stadt gehoert tetraeder), aber er liest sich wie
    // ein Kaufbeleg — gezahlt hat der Landkreis, nicht das Stadtwerk.
    anbieter: oeffentlich ? null : (verlinkt?.anbieter ?? anbieterTreffer?.name ?? null),
    eingebettet,
    bestandsdaten,
    beleg: verlinkt && !oeffentlich && !hatPerson
      ? `verlinkt: ${verlinkt.url}`
      : beleg(html, hatPerson ? PERSONENFELD : hatZahlen ? ZAHLENEINGABE : WERKZEUG_MUSTER),
  };
}

/** Der Textausschnitt, an dem der Befund hängt — 120 Zeichen, für die
 *  Handprüfung. Ein Befund ohne Belegstelle ist nicht nachprüfbar. */
function beleg(html: string, muster: RegExp): string | null {
  const m = html.match(muster);
  if (!m || m.index === undefined) return null;
  return html
    .slice(Math.max(0, m.index - 30), m.index + 90)
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Der stärkste Befund aus mehreren Seiten.
 *
 * Rangfolge, und sie ist eine inhaltliche Aussage: Ein gefundener Leadfunnel
 * schlägt einen gefundenen Rechner, weil er der interessantere Fall ist — dort
 * ist unser Argument („Ergebnis sofort, ohne Datenabgabe") am stärksten. Ein
 * echter Rechner schlägt „unklar", und alles schlägt „keins".
 */
export function besterBefund(befunde: Werkzeugbefund[]): Werkzeugbefund {
  const rang: Record<WerkzeugZustand, number> = {
    leadfunnel: 5,
    eingekauft: 4,
    rechner: 3,
    "gratis-kataster": 2,
    unklar: 1,
    keins: 0,
  };
  // Bei gleichem Zustand entscheidet das Thema: Ein Solarwerkzeug ist der
  // Befund, um den es geht — ein Tarifrechner daneben darf ihn nicht verdecken.
  const themaRang: Record<WerkzeugThema, number> = { solar: 3, waermepumpe: 2, tarif: 1, unbekannt: 0 };
  const bester = befunde.reduce(
    (a, b) =>
      rang[b.zustand] > rang[a.zustand] || (rang[b.zustand] === rang[a.zustand] && themaRang[b.thema] > themaRang[a.thema])
        ? b
        : a,
    KEIN_WERKZEUG,
  );
  // Bestandsdaten sind ein eigenes Merkmal und dürfen nicht verlorengehen, nur
  // weil sie auf einer anderen Seite standen als das Werkzeug.
  return { ...bester, bestandsdaten: befunde.some((b) => b.bestandsdaten) };
}

/** Die Seiten, die für diese Frage abgerufen werden sollen — aus einem
 *  vorhandenen Seitenverzeichnis, beste zuerst. */
export function werkzeugKandidaten(adressen: string[], hoechstens: number): string[] {
  return adressen
    .map((u) => {
      let pfad = u;
      try {
        pfad = decodeURIComponent(u);
      } catch {
        /* bleibt roh */
      }
      const punkte = (WERKZEUG_MUSTER.test(pfad) ? 2 : 0) + (BESTANDSDATEN_MUSTER.test(pfad) ? 1 : 0);
      return { u, punkte };
    })
    .filter((k) => k.punkte > 0)
    .sort((a, b) => b.punkte - a.punkte || a.u.length - b.u.length)
    .slice(0, hoechstens)
    .map((k) => k.u);
}

/** Der Verweis auf ein Werkzeug von einer beliebigen Seite aus. */
export function werkzeugLink(html: string, basis: string): string | null {
  return findLinkUrl(html, basis, WERKZEUG_MUSTER);
}

/**
 * Die Seite, um die es geht: Photovoltaik, Solar oder Wärmepumpe.
 *
 * DAS IST DER KERN DER ERHEBUNG, und die vorherigen Fassungen haben ihn
 * verfehlt: Sie haben beurteilt, welche Seite gerade zufällig geholt war —
 * meist die Startseite. Eine Startseite enthält alles: einen Tarif-Schieberegler
 * neben einem Photovoltaik-Teaser, und jede Themen-Zuordnung darauf ist Zufall.
 *
 * Die Startseite ist der **Weg** zur Solarseite, nicht das Urteil. Beurteilt
 * wird nur eine Seite, die selbst vom Thema handelt.
 */
export const SOLARSEITE_MUSTER =
  /photovoltaik|solaranlage|solarstrom|solarrechner|solar-rechner|solarcheck|balkonkraftwerk|steckersolar|\bsolar\b|\bpv\b|wärmepumpe|waermepumpe/i;

/** Verweise auf Solar-/Wärmepumpenseiten, beste zuerst. */
export function solarseitenLinks(html: string, basis: string, hoechstens: number): string[] {
  const gefunden = new Map<string, number>();
  for (const m of Array.from(html.matchAll(/<a[^>]+href=["']([^"']+)["'][^>]*>([\s\S]{0,200}?)<\/a>/gi))) {
    let href: string;
    try {
      href = decodeURIComponent(m[1].toLowerCase().replace(/&amp;/g, "&"));
    } catch {
      href = m[1].toLowerCase();
    }
    const label = m[2].replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
    // Die Adresse wiegt schwerer als die Beschriftung: Ein Menüpunkt „Solar"
    // kann auf eine Sammelseite zeigen, eine Adresse mit „photovoltaik" darin
    // ist die Themenseite selbst.
    const punkte = (SOLARSEITE_MUSTER.test(href) ? 2 : 0) + (SOLARSEITE_MUSTER.test(label) ? 1 : 0);
    if (!punkte) continue;
    try {
      const u = new URL(m[1], basis).toString();
      if (!u.startsWith("http")) continue;
      gefunden.set(u, Math.max(gefunden.get(u) ?? 0, punkte));
    } catch {
      /* unbrauchbarer Link */
    }
  }
  return [...gefunden.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].length - b[0].length)
    .slice(0, hoechstens)
    .map(([u]) => u);
}

/**
 * Handelt die Seite SELBST vom Thema — oder ist sie nur eine Seite, auf der das
 * Wort irgendwo vorkommt?
 *
 * Nur solche Seiten werden beurteilt. Die einzige Ausnahme ist eine
 * Einbettung eines bekannten Anbieters: Die ist ein Beleg für sich, egal auf
 * welcher Seite sie steht.
 */
export function istBeurteilbar(html: string, url: string): boolean {
  let pfad = url;
  try {
    pfad = decodeURIComponent(url);
  } catch {
    /* bleibt roh */
  }
  if (SOLARSEITE_MUSTER.test(pfad)) return true;
  return BEKANNTE_ANBIETER.some((a) => a.re.test(html)) && /<iframe[^>]+src=["']https?:\/\//i.test(html);
}
