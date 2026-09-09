/**
 * Lohnt eine Ansprache? — die neun Fragen, jede mit Fundstelle.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * WARUM ES DIESES MODUL GIBT, UND WARUM ES DAS VIERTE IST
 *
 * Drei Anläufe haben dieselbe Frage über die falschen Merkmale zu beantworten
 * versucht: Themenwörter zählen, dann ihre Dichte, dann die Rechtsform im
 * Impressum. Jeder fing das zuletzt genannte Beispiel und verfehlte das
 * nächste. Der Betreiber hat am 05.09.2026 benannt, woran das lag — nicht an
 * der Schwelle, sondern an der Frage:
 *
 *   „Der Beleg beantwortete die falsche Frage. Die Teamseite zeigt, dass es
 *    eine Redaktion gibt. Gefragt war, ob die unsere Zahlen nimmt."
 *
 * Und ein zweites Mal, an derselben Zeile: Als Begründung für Finanztip stand
 * „rechnet selbst" — was ein Ausschlussgrund WÄRE, hier aber nicht einmal
 * stimmte. Finanztip hat keinen eigenen Rechner, sondern empfiehlt auf seiner
 * Photovoltaik-Seite wörtlich den Solarrechner der HTW Berlin. Genau das ist
 * der stärkste denkbare Treffer, und die alte Prüfung konnte ihn nicht sehen.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * DIE REGELN, DIE DARAUS FOLGEN
 *
 * 1. GEPRÜFT WIRD AUF INHALTSSEITEN, nie im Impressum. Das Impressum sagt, wer
 *    verantwortlich ist — nicht, worüber geschrieben wird.
 * 2. KEINE ANTWORT OHNE FUNDSTELLE. Wo nichts gefunden wird, steht „nicht
 *    feststellbar", nicht „nein". Der Unterschied ist der ganze Wert dieser
 *    Erhebung: „wir haben nachgesehen und nichts gefunden" ist etwas anderes
 *    als „es gibt nichts".
 * 3. DIE FRAGEN SIND ABGESTIMMT, NICHT ERFUNDEN (Betreiber, 05.09.2026). Wer
 *    eine ergänzt oder streicht, ändert eine Absprache — nicht eine Heuristik.
 */

import { entities, hostVon } from "./fachbetrieb-extrakt";

/**
 * Sichtbarer Text OHNE Navigation, Kopf- und Fußbereich.
 *
 * DER GEMESSENE FEHLGRIFF (Eichung 05.09.2026): Als Beleg dafür, dass Finanztip
 * die Wärmepumpen-Frage behandelt, stand die Menüleiste da — „Heizkosten sparen
 * Förderung von Heizungen Solarthermie Wärmepumpe". Dasselbe beim Autorennamen.
 * Ein Menü listet auf JEDER Unterseite alle Themen; wer darin sucht, findet
 * überall alles. Exakt dieselbe Falle wie im Förder-Screener, wo eine Stichprobe
 * „48 % der Versorger fördern Balkonkraftwerke" meldete und alle sieben
 * nachgelesenen Fundstellen Menüs waren.
 *
 * Anders als die Fassung im Förderbereich bleibt hier die Groß- und
 * Kleinschreibung erhalten — Personennamen und Monatsnamen hängen daran.
 */
export function inhaltstext(html: string): string {
  return html
    .replace(/<(script|style|noscript|svg|template)[^>]*>[\s\S]*?<\/\1>/gi, " ")
    .replace(/<(nav|header|footer|aside)[^>]*>[\s\S]*?<\/\1>/gi, " ")
    .replace(/<!--[\s\S]*?-->/g, " ")
    .replace(/<br\s*\/?>|<\/(p|div|li|tr|h[1-6]|td)>/gi, "\n")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;|&#160;/gi, " ")
    .replace(/&amp;/gi, "&")
    .split("\n")
    .map((l) => l.replace(/[ \t]+/g, " ").trim())
    .filter(Boolean)
    .join("\n");
}

// ─── Antwort mit Fundstelle ──────────────────────────────────────────────────

export type Antwort = "ja" | "nein" | "unklar";

export interface Befund {
  frage: string;
  antwort: Antwort;
  /** Der Wortlaut, der die Antwort trägt. Leer nur bei „unklar". */
  fundstelle: string;
}

/**
 * Der Beitrag, auf den sich ein Anschreiben beziehen kann.
 *
 * Betreiber, 05.09.2026: „denk dran, immer einen möglichst aktuellen beitrag
 * als beleg auf den wir uns dann auch beziehen können." Ein Beleg, der nur
 * sagt „behandelt das Thema", trägt keinen ersten Satz. „Ihr Beitrag vom
 * 2. September über den Speicherzubau" trägt einen.
 */
export interface Beitrag {
  titel: string;
  /** Tage vor dem Lauf — kleiner ist besser. */
  alter: number;
  url: string;
}

/**
 * Sammelformeln, die keine Beitragsüberschrift sind.
 *
 * GEMESSEN (05.09.2026): Als Anknüpfung standen „Alle Artikel zum Thema
 * Montage", „Alles zum Thema Energie" und „Inhaltlichen Fehler melden" da. Ein
 * Anschreiben, das sich darauf beruft, beruft sich auf eine Rubrik — und der
 * Empfänger merkt es im ersten Satz.
 */
const KEINE_UEBERSCHRIFT =
  /^(?:alle\s+(?:artikel|beiträge|themen)|alles\s+zum\s+thema|übersicht|startseite|home|archiv|newsletter|suche|inhaltlichen?\s+fehler|kontakt|impressum|datenschutz|podcast|thema\b|themen\b|kategorie)/i;

/** Trägt die Seite einen BEITRAG — Überschrift plus Datum oder Autor? Eine
 *  Rubrikseite trägt beides nicht, sieht aber genauso aus. */
export function istBeitrag(html: string, jetzt: Date): boolean {
  const t = ueberschrift(html);
  if (!t || KEINE_UEBERSCHRIFT.test(t)) return false;
  // Zu kurz ist ein Ortsname oder ein Rubrikwort, kein Beitragstitel.
  if (t.split(/\s+/).length < 4) return false;
  return juengsterBeitragTage(inhaltstext(html), jetzt, html) !== null;
}

/** Die Überschrift der Seite, so wie sie ein Mensch lesen würde. */
export function ueberschrift(html: string): string | null {
  const h1 = html.match(/<h1[^>]*>([\s\S]{1,200}?)<\/h1>/i);
  const roh = h1?.[1] ?? html.match(/<title[^>]*>([\s\S]{1,200}?)<\/title>/i)?.[1];
  if (!roh) return null;
  const t = entities(roh.replace(/<[^>]+>/g, " ")).replace(/\s+/g, " ").trim();
  return t.length >= 8 ? t.slice(0, 140) : null;
}

/** Eine Seite, wie sie geprüft wird. */
export interface Pruefseite {
  url: string;
  html: string;
}

function treffer(frage: string, text: string, muster: RegExp, umfeld = 90): Befund {
  const m = text.match(muster);
  if (!m || m.index === undefined) return { frage, antwort: "unklar", fundstelle: "" };
  const von = Math.max(0, m.index - umfeld);
  const bis = Math.min(text.length, m.index + m[0].length + umfeld);
  return {
    frage,
    antwort: "ja",
    fundstelle: text.slice(von, bis).replace(/\s+/g, " ").trim(),
  };
}

// ─── DAFÜR 1: behandelt eine unserer Kernfragen ──────────────────────────────

/**
 * Die Fragen, die unsere Werkzeuge beantworten — als PHRASEN, nicht als Wörter.
 *
 * Das ist die Lehre aus dem ersten Anlauf: „Photovoltaik" steht auf jeder
 * Energieseite und in jedem Menü; „lohnt sich Photovoltaik" steht dort, wo
 * jemand unsere Frage stellt. Der frühere Wortzähler hielt heise für ein
 * Fachmedium, weil dort dreißig Mal „Test" und „Kosten" vorkamen.
 */
export const KERNFRAGEN: { name: string; muster: RegExp; wirtschaftlich?: boolean }[] = [
  {
    name: "Lohnt sich Photovoltaik",
    wirtschaftlich: true,
    muster:
      // Die Nebensatzstellung gehört dazu: „ob sich eine Wärmepumpe rechnet"
      // trägt dieselbe Frage wie „rechnet sich eine Wärmepumpe" — und fiel im
      // ersten Anlauf durch, weil das Muster nur die Hauptsatzstellung kannte.
      /(?:lohnt sich|rentiert sich|rechnet sich|wirtschaftlich(?:keit)?|amortisation|amortisiert)[^.]{0,60}\b(?:photovoltaik|solaranlage|solarstrom|pv-anlage|solar)\b|\bsich\b[^.]{0,40}\b(?:photovoltaik|solaranlage|pv-anlage|solar\w*)\b[^.]{0,40}(?:lohnt|rentiert|rechnet|amortisiert)|\b(?:photovoltaik|solaranlage|pv-anlage)\b[^.]{0,60}(?:lohnt sich|rentiert sich|rechnet sich|amortisiert)/i,
  },
  {
    name: "Lohnt sich eine Wärmepumpe",
    wirtschaftlich: true,
    muster:
      /(?:lohnt sich|rentiert sich|rechnet sich|wirtschaftlich(?:keit)?|amortisation|kosten)[^.]{0,60}\bwärmepumpe\b|\bsich\b[^.]{0,40}\bwärmepumpe\b[^.]{0,40}(?:lohnt|rentiert|rechnet|amortisiert)|\bwärmepumpe\b[^.]{0,60}(?:lohnt sich|rentiert sich|rechnet sich|amortisiert|kostet)/i,
  },
  {
    name: "Balkonkraftwerk",
    muster: /\b(?:balkonkraftwerk|steckersolar|steckerfertige\s+solaranlage)\b/i,
  },
  {
    name: "Speicher",
    // Der Speicher zählt nur mit, wo er GERECHNET wird — „Batteriespeicher"
    // allein ist ein Produktwort und kein Ansatz zur Wirtschaftlichkeit.
    muster: /\b(?:stromspeicher|batteriespeicher|heimspeicher|hausspeicher)\b/i,
  },
  {
    name: "Wirtschaftlichkeit eines Speichers",
    wirtschaftlich: true,
    muster:
      /(?:lohnt sich|rentiert sich|rechnet sich|wirtschaftlich(?:keit)?|amortisation|amortisiert)[^.]{0,60}\b(?:speicher|batterie)\b|\bsich\b[^.]{0,40}\b(?:speicher|batterie)\w*\b[^.]{0,40}(?:lohnt|rentiert|rechnet|amortisiert)|\b(?:stromspeicher|batteriespeicher|heimspeicher)\b[^.]{0,60}(?:lohnt sich|rentiert sich|rechnet sich|amortisiert)/i,
  },
  {
    name: "Strommix und Erzeugung",
    muster:
      /\b(?:strommix|erzeugungsmix|anteil erneuerbarer|erneuerbaren-anteil|börsenstrompreis|netzentgelt)\b|\b(?:erneuerbare|solar|wind)\w*\s+(?:erzeugung|leistung|einspeisung)\b/i,
  },
  {
    name: "Zubau",
    muster: /\b(?:zubau|neu installierte?|neuanlagen|ausbautempo|marktstammdatenregister)\b/i,
  },
  {
    name: "Einspeisevergütung",
    muster: /\b(?:einspeisevergütung|eeg-vergütung|anzulegender wert|eigenverbrauch)\b/i,
  },
  {
    name: "Kommunale Förderung",
    muster: /\b(?:förderprogramm|zuschuss|kommunale förderung|förderung der stadt|kfw|beg)\b/i,
  },
];

/** Die Fragen, bei denen es um die WIRTSCHAFTLICHKEIT geht — sie entscheiden
 *  mehr als jede andere. Betreiber, 05.09.2026: „wenn wir irgendwo einen Ansatz
 *  zur Wirtschaftlichkeit finden, dann die auch. Der Ansatz ist das
 *  Ausschlaggebende." */
export function istWirtschaftlichkeitsfrage(frage: string): boolean {
  return KERNFRAGEN.some((f) => f.wirtschaftlich && frage.includes(f.name));
}

export function kernfrageBehandelt(text: string): Befund {
  // Die Wirtschaftlichkeitsfragen zuerst: Trifft eine davon, ist sie die
  // Antwort — auch wenn weiter unten im Text noch ein Produktwort steht.
  for (const f of [...KERNFRAGEN].sort((a, b) => Number(!!b.wirtschaftlich) - Number(!!a.wirtschaftlich))) {
    const b = treffer(`Behandelt „${f.name}“`, text, f.muster);
    if (b.antwort === "ja") return b;
  }
  return { frage: "Behandelt eine unserer Kernfragen", antwort: "unklar", fundstelle: "" };
}

// ─── DAFÜR 2: verweist auf fremde Rechner oder Auswertungen ──────────────────

/**
 * Der stärkste Treffer überhaupt — und der, den die alte Prüfung nicht sehen
 * konnte.
 *
 * Wer schon einen FREMDEN Rechner empfiehlt, hat die Hemmschwelle, auf die es
 * ankommt, bereits überschritten. Gemessen bei Finanztip: „Praxistipp: Nutze
 * den Solarrechner der HTW Berlin." Das ist ein Medium, das genau unsere Sorte
 * Werkzeug weiterreicht.
 *
 * Erkannt wird der VERWEIS auf eine fremde Adresse, nicht das Wort „Rechner" —
 * das steht auch über dem eigenen.
 */
const RECHNER_WORT = /rechner|kalkulator|simulator|calculator|tool\b/i;

export function verweistAufFremdenRechner(seite: Pruefseite): Befund {
  const eigen = hostVon(seite.url) ?? "";
  const re = /<a\b[^>]*href=["']([^"']+)["'][^>]*>([\s\S]{0,200}?)<\/a>/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(seite.html))) {
    const href = entities(m[1]);
    if (!/^https?:/i.test(href)) continue;
    const ziel = hostVon(href) ?? "";
    if (!ziel || ziel === eigen || ziel.endsWith("." + eigen) || eigen.endsWith("." + ziel)) continue;
    const text = entities(m[2].replace(/<[^>]+>/g, " ")).replace(/\s+/g, " ").trim();
    if (!RECHNER_WORT.test(text) && !RECHNER_WORT.test(href)) continue;
    // Werbung und Vergleichsportale sind kein redaktioneller Verweis.
    if (/affiliate|partner|utm_medium=(?:cpc|affiliate)|adserv|doubleclick/i.test(href)) continue;
    return {
      frage: "Verweist auf einen fremden Rechner",
      antwort: "ja",
      fundstelle: `„${text.slice(0, 80)}“ → ${ziel}`,
    };
  }
  return { frage: "Verweist auf einen fremden Rechner", antwort: "unklar", fundstelle: "" };
}

// ─── DAFÜR 3: veröffentlicht fremde Studien mit Quellenangabe ────────────────

export function zitiertFremdeQuelle(text: string): Befund {
  return treffer(
    "Zitiert eine fremde Auswertung",
    text,
    /(?:laut|nach|gemäß)\s+(?:einer?\s+)?(?:studie|analyse|auswertung|erhebung|untersuchung|berechnung)\s+(?:des|der|von|vom)\s+[A-ZÄÖÜ][\wäöüß-]+|(?:studie|auswertung|analyse)\s+(?:des|der|von|vom)\s+[A-ZÄÖÜ][\wäöüß-]+[^.]{0,40}(?:zeigt|ergibt|belegt)|quelle:\s*[A-ZÄÖÜ][\wäöüß-]+/i,
  );
}

// ─── DAFÜR 4 / DAGEGEN 3: läuft der Meldungsbetrieb? ─────────────────────────

const MONATE: Record<string, number> = {
  januar: 1, jan: 1, februar: 2, feb: 2, märz: 3, maerz: 3, mrz: 3, mär: 3,
  april: 4, apr: 4, mai: 5, juni: 6, jun: 6, juli: 7, jul: 7,
  august: 8, aug: 8, september: 9, sep: 9, sept: 9, oktober: 10, okt: 10,
  november: 11, nov: 11, dezember: 12, dez: 12,
};

/**
 * Das jüngste Datum, das auf der Seite steht — in Tagen vor `jetzt`.
 *
 * ABGEKÜRZTE MONATSNAMEN GEHÖREN DAZU, und das ist kein Detail: Bei der Eichung
 * schrieb pv magazine „28. Aug. 2026" auf seiner Startseite. Ohne die Kurzform
 * fand die Prüfung dort GAR KEIN Datum, fiel auf eine alte Artikelseite zurück
 * und erklärte das aktivste Fachmagazin des Bestands für eingestellt.
 */
export function juengsterBeitragTage(text: string, jetzt: Date, html?: string): number | null {
  let juengste: number | null = null;
  const nimm = (d: Date) => {
    const tage = Math.floor((jetzt.getTime() - d.getTime()) / 86400000);
    // Ein Datum in der Zukunft ist ein Veranstaltungshinweis, kein Beitrag.
    if (tage < -1 || tage > 4000) return;
    if (juengste === null || tage < juengste) juengste = tage;
  };
  for (const m of Array.from(
    text.matchAll(
      /\b(\d{1,2})\.\s*(januar|jan|februar|feb|märz|maerz|mrz|mär|april|apr|mai|juni|jun|juli|jul|august|aug|september|sept|sep|oktober|okt|november|nov|dezember|dez)\.?\s+(\d{4})\b/gi,
    ),
  )) {
    nimm(new Date(Date.UTC(Number(m[3]), MONATE[m[2].toLowerCase()] - 1, Number(m[1]))));
  }
  for (const m of Array.from(text.matchAll(/\b(\d{1,2})\.(\d{1,2})\.(\d{4})\b/g))) {
    nimm(new Date(Date.UTC(Number(m[3]), Number(m[2]) - 1, Number(m[1]))));
  }
  // Die maschinenlesbare Angabe am Beitrag — sie steht dort, wo der sichtbare
  // Text nur „vor 3 Tagen" sagt.
  if (html) {
    for (const m of Array.from(html.matchAll(/datetime=["'](\d{4})-(\d{2})-(\d{2})/gi))) {
      nimm(new Date(Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3]))));
    }
  }
  return juengste;
}

/** Ab wann gilt der Meldungsbetrieb als laufend? Sechs Wochen — ein Fachtitel
 *  mit Monatsausgabe darf dazwischenliegen, ohne durchzufallen. */
export const AKTUELL_TAGE = 42;
/** Und ab wann gilt er als eingestellt (K.-o.)? Vier Monate. */
export const VERALTET_TAGE = 120;

/**
 * Ein „nein" darf nur die STARTSEITE aussprechen.
 *
 * DER GEMESSENE FEHLGRIFF (05.09.2026): faz.net, iwr.de, haustec.de und haus.de
 * wurden für eingestellt erklärt — mit Werten bis 3.978 Tage. In Wahrheit war
 * ihre Startseite hinter einer Zustimmungsabfrage nicht lesbar, und das Urteil
 * fiel auf einer beliebigen Artikelseite, die per Definition alt ist. Eine alte
 * Artikelseite sagt über den Betrieb nichts; nur eine Startseite ohne frisches
 * Datum tut das. Auf allen anderen Seiten gilt: ein frisches Datum ist ein
 * Beleg, ein altes ist keiner.
 */
export function meldungsbetrieb(
  text: string,
  jetzt: Date,
  html?: string,
  istStartseite = true,
): Befund {
  const tage = juengsterBeitragTage(text, jetzt, html);
  if (tage === null) {
    return { frage: "Laufender Meldungsbetrieb", antwort: "unklar", fundstelle: "" };
  }
  if (tage <= AKTUELL_TAGE) {
    return {
      frage: "Laufender Meldungsbetrieb",
      antwort: "ja",
      fundstelle: `jüngster datierter Beitrag vor ${tage} Tagen`,
    };
  }
  if (tage >= VERALTET_TAGE) {
    return {
      frage: "Laufender Meldungsbetrieb",
      antwort: istStartseite ? "nein" : "unklar",
      fundstelle: istStartseite
        ? `jüngster datierter Beitrag auf der Startseite vor ${tage} Tagen`
        : "",
    };
  }
  return {
    frage: "Laufender Meldungsbetrieb",
    antwort: "unklar",
    fundstelle: `jüngster datierter Beitrag vor ${tage} Tagen`,
  };
}

// ─── DAFÜR 5: namentlicher Autor am Beitrag ──────────────────────────────────

export function autorAmBeitrag(text: string): Befund {
  return treffer(
    "Namentlicher Autor am Beitrag",
    text,
    /\b(?:von|autor(?:in)?:?|text:)\s+(?:Dr\.\s+)?[A-ZÄÖÜ][\wäöüß-]+\s+[A-ZÄÖÜ][\wäöüß-]+\b/,
    60,
  );
}

// ─── DAGEGEN 1: eigener Rechner für dieselbe Frage ───────────────────────────

/**
 * Ein EIGENER Rechner ist der K.-o. — dieses Medium beantwortet die Frage
 * bereits selbst und braucht unsere Zahlen nicht.
 *
 * Erkannt am Formular, nicht am Wort: „Solarrechner" steht auch über einem
 * Verweis auf einen fremden. Ein eigener Rechner hat Eingabefelder für Zahlen
 * und beschriftet sie mit unseren Größen.
 */
export function eigenerRechner(seite: Pruefseite): Befund {
  const html = seite.html;
  if (!/<form|<input/i.test(html)) {
    return { frage: "Eigener Rechner", antwort: "unklar", fundstelle: "" };
  }
  const felder = Array.from(
    html.matchAll(/<(?:input|select)\b[^>]*(?:name|id|placeholder|aria-label)=["']([^"']{2,60})["'][^>]*>/gi),
  ).map((m) => m[1].toLowerCase());
  const einschlaegig = felder.filter((f) =>
    /kwp|kilowatt|verbrauch|dachfl|strompreis|anlagengr|modul|speicher|heizlast|wohnfl/.test(f),
  );
  if (einschlaegig.length >= 2) {
    return {
      frage: "Eigener Rechner",
      antwort: "ja",
      fundstelle: `Eingabefelder: ${einschlaegig.slice(0, 4).join(", ")}`,
    };
  }
  return { frage: "Eigener Rechner", antwort: "unklar", fundstelle: "" };
}

// ─── DAGEGEN 2: erzeugt eigene Daten zum Thema ───────────────────────────────

/**
 * Ein Verband oder Institut verrät sich auf der INHALTSSEITE an seinem
 * Mitglieder- und Veranstaltungsbetrieb, nicht an seiner Rechtsform.
 *
 * Gemessen an solarwirtschaft.de (05.09.2026): Die Startseite wirbt für die
 * Mitgliedschaft, listet Verbandstermine und lässt Mitglieder zu Wort kommen —
 * die Marktzahlen des Verbands sind sein eigenes Erzeugnis. Genau das ist der
 * Ausschlussgrund: Er veröffentlicht seine Zahlen, er nimmt keine fremden auf.
 *
 * Die Rechtsform im Impressum wäre der falsche Ort dafür — an ihr ist die DGS
 * nicht von ihrer eigenen Zeitschrift SONNENENERGIE zu unterscheiden.
 */
export function erzeugtEigeneDaten(text: string): Befund {
  const verband = treffer(
    "Erzeugt eigene Daten zum Thema",
    text,
    /\b(?:mitglied werden|mitgliedschaft im|unsere mitglieder|mitgliedersuche|verbandstermine|mitgliederversammlung|als (?:bsw|verbands)?[- ]?mitglied)\b/i,
  );
  if (verband.antwort === "ja") return verband;
  return treffer(
    "Erzeugt eigene Daten zum Thema",
    text,
    /\b(?:unsere|eigene[nr]?)\s+(?:studie|analyse|auswertung|erhebung|untersuchung|berechnungen?|umfrage|marktdaten|statistik)\b|\bwir\s+haben\s+(?:ausgewertet|analysiert|erhoben|berechnet|untersucht)\b|\b(?:institut|verband|bundesverband)\b[^.]{0,60}\b(?:veröffentlicht|legt vor|erhebt|meldet)\b|\b(?:infografiken|grafiken|zahlen|statistiken|pressematerial|bildmaterial)\s+für\s+(?:journalist|presse|medien)|\bpressemappe\b|\bunsere\s+(?:branchenzahlen|marktzahlen)\b/i,
  );
}

// ─── DAGEGEN 5: verkauft das Produkt → ANDERER KANAL, kein Ausschluss ────────

/**
 * Betreiber-Korrektur vom 05.09.2026: „ein händler usw. kann unser tool
 * natürlich auch verwenden. das wäre nur dann eher nicht presse sondern
 * anderer vertrieb."
 *
 * Ein Händler fliegt deshalb NICHT heraus, er wechselt den Topf. Das ist ein
 * Unterschied mit Folgen: Aus „ungeeignet" wird nie wieder etwas, aus „anderer
 * Kanal" wird der Einbettungsweg, auf dem die Fachbetriebe schon liegen.
 */
export function verkauftDasProdukt(seite: Pruefseite): Befund {
  // HIER bewusst der GANZE Text samt Kopf- und Fußbereich: Ein Warenkorb steht
  // in der Kopfzeile, nicht im Artikel. Bei allen anderen Fragen ist genau das
  // der Fehler — bei dieser ist es die Fundstelle.
  const text = inhaltstext(seite.html) + "\n" + seite.html.replace(/<[^>]+>/g, " ");
  return treffer(
    "Verkauft das Produkt",
    text,
    // „Angebot anfordern" stand hier und war der Fehlgriff: Es trifft die
    // Abo-Werbung eines Verlags und die Spendenseite eines Recherchebüros
    // genauso wie einen Händler — CORRECTIV, electrive und Haufe landeten damit
    // im Vertriebs-Topf. Ein VERKAUF zeigt sich am Warenkorb und an der
    // Artikelnummer, nicht an einer Anfrage.
    // UND es muss UNSER Produkt sein. CORRECTIV betreibt einen Buchshop und
    // wäre sonst ein Vertriebskanal für Solartechnik — ein Nebenshop macht aus
    // einem Recherchebüro keinen Händler. Gefragt ist, wer Module, Speicher
    // oder Balkonkraftwerke verkauft.
    /\b(?:in den warenkorb|zum warenkorb|warenkorb ansehen|jetzt kaufen|artikelnummer|art\.-nr\.|lieferzeit|zzgl\. versand|sofort lieferbar|jetzt bestellen)\b[^.]{0,160}\b(?:solar|photovoltaik|pv-|modul|wechselrichter|speicher|balkonkraftwerk|wärmepumpe)|\b(?:solar|photovoltaik|pv-|modul|wechselrichter|speicher|balkonkraftwerk|wärmepumpe)\w*\b[^.]{0,160}\b(?:in den warenkorb|zum warenkorb|jetzt kaufen|artikelnummer|art\.-nr\.|sofort lieferbar|jetzt bestellen)\b/i,
  );
}

// ─── Das Urteil aus den Antworten ────────────────────────────────────────────

export type Eignung = "vorgemerkt" | "ungeeignet" | "anderer-kanal" | "angesehen";

export interface Urteil {
  eignung: Eignung;
  grund: string;
  /** Die Fundstelle, die das Urteil am stärksten trägt. */
  beleg: Befund | null;
}

/**
 * Die abgestimmte Regel (Betreiber, 05.09.2026):
 *
 *   Dagegen 1–3 sind K.-o. · „verkauft das Produkt" wechselt den Topf ·
 *   „kein redaktioneller Kontakt" ist ein Minus, kein K.-o. ·
 *   vorgemerkt ab ZWEI Treffern auf der Dafür-Seite.
 *
 * Sie steht hier als Code und nicht als Merksatz, damit sie nicht bei der
 * nächsten Durchsicht anders angewandt wird als bei dieser.
 */
export const DAFUER_SCHWELLE = 2;

export function urteile(befunde: Befund[], hatRedaktionellenKontakt: boolean): Urteil {
  const finde = (frage: string) => befunde.find((b) => b.frage.startsWith(frage));

  const rechner = finde("Eigener Rechner");
  if (rechner?.antwort === "ja") {
    return { eignung: "ungeeignet", grund: "hat einen eigenen Rechner für dieselbe Frage", beleg: rechner };
  }
  // ── Der Ansatz schlägt die Herkunft ──────────────────────────────────────
  //
  // Betreiber, 05.09.2026: „bei den instituten und verbänden: wenn wir irgendwo
  // einen ansatz zur wirtschaftlichkeit finden, dann die auch. der ansatz ist
  // das ausschlaggebende."
  //
  // Ein Institut, das über die Wirtschaftlichkeit einer Wärmepumpe schreibt,
  // stellt dieselbe Frage wie wir — dass es daneben eigene Studien
  // veröffentlicht, macht es nicht zum falschen Gegenüber. Der Ausschluss gilt
  // deshalb nur dort, wo NUR eigene Zahlen stehen und kein Rechenansatz.
  const kern = finde("Behandelt");
  const ansatz = kern?.antwort === "ja" && istWirtschaftlichkeitsfrage(kern.frage);
  const daten = finde("Erzeugt eigene Daten");
  if (daten?.antwort === "ja" && !ansatz) {
    return { eignung: "ungeeignet", grund: "erzeugt eigene Daten zum Thema, ohne eigenen Rechenansatz", beleg: daten };
  }
  const meldung = finde("Laufender Meldungsbetrieb");
  if (meldung?.antwort === "nein") {
    return { eignung: "ungeeignet", grund: `kein laufender Meldungsbetrieb (${meldung.fundstelle})`, beleg: meldung };
  }
  const shop = finde("Verkauft das Produkt");
  if (shop?.antwort === "ja") {
    return {
      eignung: "anderer-kanal",
      grund: "verkauft das Produkt — gehört auf den Einbettungsweg, nicht in den Presseverteiler",
      beleg: shop,
    };
  }

  const dafuer = befunde.filter(
    (b) =>
      b.antwort === "ja" &&
      (b.frage.startsWith("Behandelt") ||
        b.frage.startsWith("Verweist") ||
        b.frage.startsWith("Zitiert") ||
        b.frage.startsWith("Laufender") ||
        b.frage.startsWith("Namentlicher")),
  );
  // MINDESTENS EIN INHALTLICHER TREFFER. „Laufender Meldungsbetrieb" und
  // „namentlicher Autor" sagen etwas über den Betrieb, nichts über das Thema —
  // zusammen ergäben sie zwei Treffer und damit ein Vorgemerkt für jedes
  // beliebige Nachrichtenangebot der Welt. Gemessen an agora-energiewende.de,
  // das genau so durchkam. Der Betreiber am 05.09.2026: „der ansatz ist das
  // ausschlaggebende."
  const inhaltlich = dafuer.some(
    (b) => b.frage.startsWith("Behandelt") || b.frage.startsWith("Verweist") || b.frage.startsWith("Zitiert"),
  );
  if (dafuer.length >= DAFUER_SCHWELLE && inhaltlich) {
    const zusatz = ansatz && daten?.antwort === "ja"
      ? " — Verband/Institut, aber mit eigenem Rechenansatz"
      : "";
    // Der stärkste Beleg zuerst: ein Verweis auf einen fremden Rechner schlägt
    // alles andere — dort hat jemand genau unsere Sorte Werkzeug weitergereicht.
    const rang = (b: Befund) =>
      b.frage.startsWith("Verweist") ? 0 : b.frage.startsWith("Behandelt") ? 1 : b.frage.startsWith("Zitiert") ? 2 : 3;
    const beste = [...dafuer].sort((a, b) => rang(a) - rang(b))[0];
    const minus = hatRedaktionellenKontakt ? "" : " (kein redaktioneller Kontakt gefunden)";
    return {
      eignung: "vorgemerkt",
      grund: dafuer.map((b) => b.frage).join(" · ") + minus + zusatz,
      beleg: beste,
    };
  }

  return {
    eignung: "angesehen",
    grund:
      dafuer.length >= DAFUER_SCHWELLE && !inhaltlich
        ? "läuft und nennt Autoren, behandelt aber keine unserer Fragen — zu wenig für ein Urteil"
        : dafuer.length === 1
          ? `nur ein Treffer (${dafuer[0].frage}) — zu wenig für ein Urteil`
          : "auf den gelesenen Inhaltsseiten nichts gefunden, was für oder gegen spricht",
    beleg: dafuer[0] ?? null,
  };
}
