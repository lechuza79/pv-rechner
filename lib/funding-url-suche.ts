/**
 * Auf einer kommunalen Verwaltungs-Website die Förderseite finden.
 *
 * WARUM (18.08.2026): Der Abdeckungs-Lauf konnte bisher nur prüfen, was der
 * Kommunen-Outreach ohnehin gesammelt hatte — 1.258 Gemeinden mit erfasster
 * Förderseite. Für rund 9.700 weitere kennen wir die Verwaltungs-Website, aber
 * keine Themenseite: Was dort aufgelegt wird, sieht niemand. Das ist die
 * eigentliche Lücke im Katalog, größer als alles, was das Screening je finden
 * kann.
 *
 * Dieses Modul entscheidet NUR, welche Links einer Website es wert sind,
 * verfolgt zu werden. Ob dort wirklich eine Förderung steht, sagt danach das
 * Screening (`funding-screen-erkennung`), und ob sie in den Katalog kommt,
 * entscheidet erst ein Mensch, der die Amtsseite gelesen hat. Drei Stufen, jede
 * enger als die vorige — eine Adresse aus diesem Modul ist eine Vermutung.
 */

/**
 * Version der Bewertung. Wie beim Screening: Wer die Listen ändert, zählt hoch.
 *
 * 2 (19.08.2026): Zwei Änderungen aus parallelen Ständen, beide mit demselben
 * Effekt auf den Stempel.
 *
 * Erstens die Volltextsuche der Website. Das ist keine Feinheit der Bewertung,
 * sondern mehr REICHWEITE — die 7.863 Gemeinden, die unter Version 1 als
 * „keine-seite" abgelegt wurden, sind damit nicht mehr beantwortet und stehen
 * von selbst wieder an. Genau dafür ist der Stempel da.
 *
 * Zweitens gibt die Suche nicht mehr nur den besten Fund zurück, sondern ALLE
 * Adressen, die für sich eine Förderseite sind. Damit müssen zusätzlich die
 * Gemeinden noch einmal dran, bei denen wir längst eine Seite haben — genau
 * dort liegen die zweiten und dritten Seiten, die vorher auf den Boden fielen.
 */
export const SUCH_VERSION = 2;

/**
 * Wortstämme, die auf eine Förderseite deuten, mit ihrem Gewicht.
 *
 * Gewichtet statt bloß erkannt, weil eine Verwaltungs-Website Dutzende Treffer
 * liefert und wir nur den besten verfolgen: „foerderprogramm" ist fast immer die
 * Seite selbst, „energie" nur ein Themenbereich, in dem sie stehen KÖNNTE.
 */
/**
 * Wörter, die von einer FÖRDERUNG sprechen — Geld, das die Gemeinde gibt.
 */
const FOERDER_SIGNALE: { muster: RegExp; punkte: number }[] = [
  { muster: /foerderprogramm|förderprogramm|foerderrichtlinie|förderrichtlinie/, punkte: 10 },
  { muster: /foerderung|förderung|zuschuss|zuschuesse|zuschüsse|foerdermittel|fördermittel|praemie|prämie/, punkte: 7 },
];

/**
 * Wörter, die vom THEMA sprechen — Energie, Klima, Gebäude.
 */
const THEMA_SIGNALE: { muster: RegExp; punkte: number }[] = [
  { muster: /photovoltaik|solar|balkonkraftwerk|steckersolar|waermepumpe|wärmepumpe/, punkte: 6 },
  { muster: /klimaschutz|klimafoerder|klimaförder|energiespar/, punkte: 5 },
  { muster: /energie|umwelt|sanierung|klima|heizung|gebaeudesanierung|gebäudesanierung/, punkte: 3 },
];

/**
 * Wortstämme, die einen Treffer ENTWERTEN — jeder aus einem realen Fehlgriff.
 *
 * „Förderverein" ist der teuerste: Fast jede Gemeinde hat einen für Feuerwehr,
 * Schule oder Museum, und der Wortstamm „foerder" trifft ihn zuverlässig.
 * Diese Liste ist aber nur das zweite Netz — das erste ist die Forderung nach
 * einem Themenwort (siehe {@link istEndergebnis}). Eine Ausschlussliste allein
 * ist ein Wettrennen, das man nicht gewinnt: Gemessen am ersten Lauf lieferte
 * sie Essens Kulturförderung und Dresdens Gesundheitsförderung, weil beide
 * Adressen das Thema getrennt vom Wort „Förderung" führen
 * (`/kultur_/foerderung/`) und kein Ausschlussmuster darauf passte.
 */
const AUSSCHLUSS =
  /foerderverein|förderverein|sportfoerder|sportförder|jugendfoerder|jugendförder|vereinsfoerder|vereinsförder|kulturfoerder|kulturförder|schulfoerder|schulförder|wohnraumfoerder|wohnraumförder|staedtebaufoerder|städtebauförder|foerderschule|förderschule|denkmalfoerder|denkmalförder|gesundheitsfoerder|gesundheitsförder|wirtschaftsfoerder|wirtschaftsförder/;

/**
 * Andere Ressorts einer Verwaltung — sie verteilen ebenfalls Geld.
 *
 * Bewusst KEINE harte Null: Eine Seite kann „Kultur" im Pfad tragen und trotzdem
 * der Weg zur Energieförderung sein. Sie entscheidet nur darüber, ob ein Link
 * als ERGEBNIS taugt (siehe {@link istEndergebnis}). Und sie ist eine
 * geschlossene Liste — die Ressorts einer Kommune sind abzählbar, anders als die
 * offene Menge möglicher Fehlgriffe.
 */
const FREMDES_RESSORT =
  /kultur|gesundheit|sport|jugend|sozial|schule|bildung|tourismus|wirtschaft|verein|senior|familie|kita|kinderbetreuung|integration|sprache|wohnraum|wohnungsbau|wohnbau|staedtebau|städtebau|denkmal|ehrenamt|landwirtschaft/;

/**
 * Dateiendungen und Pfade, die kein Lesen lohnen.
 *
 * Die zweite Hälfte kam am 19.08.2026 dazu und ist die interessantere: Ein
 * DOWNLOAD ist keine Seite. Gemessen an den bis dahin gespeicherten Adressen
 * trugen mehrere die Form `/downloads/datei/YmQxOTYxMzlhMTU4NGIx…` — eine
 * Richtlinien-PDF hinter einer undurchsichtigen Kennung, ganz ohne Endung, und
 * über ihren Linktext auf volle Punktzahl gekommen. Für den Menschen ist das
 * genau das richtige Dokument; als gespeicherte `thema_foerderung_url` ist es
 * wertlos und schädlich zugleich: Der Screening-Lauf verwirft alles, was nicht
 * als HTML ausgeliefert wird, und die Gemeinde gilt trotzdem als „hat eine
 * Förderseite" — der Platz ist belegt, und sie kommt nie wieder in die Suche.
 * Dasselbe gilt für `?file=…pdf`-Adressen, bei denen die Endung im
 * Abfrageteil steht statt im Pfad.
 */
const KEIN_ZIEL =
  /\.(pdf|jpe?g|png|gif|zip|docx?|xlsx?|pptx?)($|\?)|\/(impressum|datenschutz|kontakt|suche|login)\b|\/downloads?\/(datei|file|document)\/|[?&](file|datei|download)=[^&]*\.(pdf|docx?)/i;

/**
 * Nachrichten und Meldungen — nie als Dauer-Adresse.
 *
 * Der Fund landet in `kommunen_kontakt.thema_foerderung_url` und wird von da an
 * bei jedem Screening-Lauf abgerufen. Eine Meldung ist dafür das falsche Ziel:
 * Sie beschreibt einen Stand von damals, verschwindet aus dem Archiv oder meldet
 * gerade das Gegenteil. Gemessen am Testlauf lieferte die Suche für Dortmund
 * „Rekord für den Klimaschutz: 1.100 Anträge" und für Stuttgart „Förderstopp im
 * Energiesparprogramm" — beide inhaltlich einschlägig und als gespeicherte
 * Adresse trotzdem wertlos.
 */
const MELDUNG = /\/(newsroom|nachricht|nachrichten|aktuelles|aktuelle-meldungen|meldung|meldungen|presse|pressemitteilung|news|archiv)\b|\/20\d\d\//;

/** Punkte getrennt nach Gruppe — die Trennung ist der Kern der Bewertung. */
export type LinkWertung = { foerder: number; thema: number; punkte: number; fremdesRessort: boolean };

/**
 * Eine Adresse so, wie die Wortlisten sie lesen können.
 *
 * BLOCKER (19.08.2026): Deutsche Kommunalseiten schreiben Umlaute in den Pfad,
 * und `new URL()` liefert sie prozentkodiert zurück — aus `/förderrichtlinien`
 * wird `/f%c3%b6rderrichtlinien`. Kein einziges Muster oben passt darauf. Die
 * Folge war nicht sichtbar, weil solche Links über ihren LINKTEXT trotzdem
 * Punkte bekamen: Wandlitz' `/seite/623011/förderrichtlinien.html` zählte, weil
 * im Menü „Förderrichtlinien" stand. Wo der Text nichts hergibt — Sitemaps
 * haben gar keinen —, fiel die Seite lautlos durch.
 *
 * Aufgefallen beim Nachzählen: 402 von 2.583 gespeicherten Adressen bekamen
 * ohne Linktext null Punkte, und der erste Blick in die Liste zeigte lauter
 * einwandfreie Förderseiten mit Umlaut im Pfad.
 */
function adresseLesbar(url: string): string {
  const klein = url.toLowerCase();
  try {
    return decodeURIComponent(klein);
  } catch {
    // Kaputte Kodierung („%zz") lässt decodeURIComponent werfen — dann lieber
    // die Rohfassung bewerten als den Link ganz zu verlieren.
    return klein;
  }
}

/**
 * Wie gut passt dieser Link zu „hier steht die kommunale Energieförderung"?
 *
 * Bewertet werden Adresse UND Linktext, und beide zählen gleich viel: Beim
 * Screening ist ein Menü-Treffer ein Fehlalarm, hier ist er der Normalfall — die
 * Förderseite hängt fast immer im Navigationsbaum, und ihr Menü-Eintrag heißt
 * „Förderprogramme", während ihre Adresse `/seite/844796.html` lauten kann
 * (real, Antrifttal). Den Text abzuwerten hieße, ausgerechnet die Gemeinden zu
 * verlieren, deren Website am wenigsten hergibt.
 *
 * Je Gruppe zählt das STÄRKSTE Signal, nicht die Summe aller. Sonst gewinnt
 * schlicht die längste Adresse: Gemessen am ersten Lauf schlug Düsseldorfs
 * `…/beratung-und-foerderung/energie/energiesparen-in-sportvereinen` seine
 * eigene Elternseite, weil jedes weitere Pfadsegment Punkte drauflegte. Ein Wort
 * dreimal zu nennen macht eine Seite nicht dreimal so einschlägig.
 */
export function bewerteLink(url: string, linktext = ""): LinkWertung {
  const leer: LinkWertung = { foerder: 0, thema: 0, punkte: 0, fremdesRessort: false };
  const adresse = adresseLesbar(url);
  const text = linktext.toLowerCase();
  if (KEIN_ZIEL.test(adresse) || MELDUNG.test(adresse)) return leer;
  // Der Ausschluss gilt beiden Seiten: Ein Link namens „Förderverein Feuerwehr"
  // unter einer harmlosen Adresse ist derselbe Fehlgriff wie umgekehrt.
  if (AUSSCHLUSS.test(adresse) || AUSSCHLUSS.test(text)) return leer;

  const staerkstes = (liste: { muster: RegExp; punkte: number }[]) => {
    let p = 0;
    for (const { muster, punkte } of liste) {
      if (muster.test(adresse) || muster.test(text)) p = Math.max(p, punkte);
    }
    return p;
  };
  const foerder = staerkstes(FOERDER_SIGNALE);
  const thema = staerkstes(THEMA_SIGNALE);
  return {
    foerder,
    thema,
    punkte: foerder + thema,
    fremdesRessort: FREMDES_RESSORT.test(adresse) || FREMDES_RESSORT.test(text),
  };
}

/** Ab dieser Punktzahl lohnt es sich, einem Link überhaupt zu folgen. */
export const SCHWELLE = 5;

/**
 * Taugt dieser Link als ERGEBNIS der Suche?
 *
 * Zwei Schwellen statt einer, und das ist die wichtigste Entscheidung dieses
 * Moduls. Zum VERFOLGEN reicht eines von beidem: Ein Link „Klimaschutz und
 * Energie" trägt kein Förderwort und ist trotzdem der richtige Weg zur
 * Förderseite (real: Nürnberg). Als ERGEBNIS gilt dagegen nur, was von Geld UND
 * vom Thema spricht — sonst landen Essens Kulturförderung und Dresdens
 * Gesundheitsförderung im Topf, beide mit sauberem Förderwort und ohne jeden
 * Energiebezug (real, erster Lauf am 18.08.2026).
 */
export function istEndergebnis(w: LinkWertung): boolean {
  if (!w.foerder) return false;
  // Ein Themenwort belegt den Energiebezug direkt. Fehlt es, gilt der Link
  // trotzdem — SOLANGE er nicht erkennbar zu einem anderen Ressort gehört.
  //
  // Beide Richtungen kosten real: Kleine Gemeinden nennen ihre Seite schlicht
  // „Förderprogramme" und führen dort Photovoltaik neben Zisternen und
  // Streuobstwiesen (Antrifttal, Gaimersheim, Linsengericht) — ein erzwungenes
  // Themenwort verlöre genau die. Umgekehrt trugen Essens Kulturförderung und
  // Dresdens Gesundheitsförderung ein sauberes Förderwort und keinerlei
  // Energiebezug. Die Ressortliste trennt beides, ohne eine offene Menge von
  // Fehlgriffen pflegen zu müssen.
  return w.thema > 0 || !w.fremdesRessort;
}

export type LinkKandidat = { url: string; text: string } & LinkWertung;

/**
 * Die verfolgenswerten Links einer Seite, beste zuerst.
 *
 * `basis` ist die Adresse der Seite selbst — relative Links werden daran
 * aufgelöst, und Links auf FREMDE Hosts fliegen raus. Letzteres ist wichtiger,
 * als es klingt: Kommunalseiten verlinken großflächig auf die Förderprogramme
 * von Bund und Land (KfW, BAFA, L-Bank). Die führen wir längst — sie hier
 * einzusammeln hieße, dieselben drei Bundesprogramme elftausendmal zu finden.
 */
export function linkKandidaten(html: string, basis: string): LinkKandidat[] {
  let host: string;
  try {
    host = new URL(basis).host;
  } catch {
    return [];
  }

  const gefunden = new Map<string, LinkKandidat>();
  for (const m of html.matchAll(/<a\b[^>]*href=["']([^"'#]+)["'][^>]*>([\s\S]*?)<\/a>/gi)) {
    let ziel: URL;
    try {
      ziel = new URL(m[1], basis);
    } catch {
      continue;
    }
    if (ziel.host !== host) continue;
    if (!/^https?:$/.test(ziel.protocol)) continue;
    const text = m[2].replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
    const url = ziel.origin + ziel.pathname + ziel.search;
    const w = bewerteLink(url, text);
    if (w.punkte < SCHWELLE) continue;
    // Dieselbe Adresse steht oft mehrfach auf einer Seite (Menü + Fließtext);
    // die Fassung mit dem aussagekräftigeren Linktext gewinnt.
    const vorhanden = gefunden.get(url);
    if (!vorhanden || w.punkte > vorhanden.punkte) gefunden.set(url, { url, text, ...w });
  }
  return [...gefunden.values()].sort((a, b) => b.punkte - a.punkte);
}

/**
 * Adressen aus einer sitemap.xml, die verfolgenswert aussehen.
 *
 * Der schnellere Weg, wo es eine gibt: eine Anfrage statt eines Crawls durch die
 * Menüebenen. Linktexte gibt es hier nicht — die Bewertung stützt sich allein
 * auf die Adresse, was bei sprechenden Adressen gut und bei Zahlen-Adressen gar
 * nicht funktioniert. Deshalb ist die Sitemap ein Zusatz, kein Ersatz.
 */
export function sitemapKandidaten(xml: string, basis: string): LinkKandidat[] {
  let host: string;
  try {
    host = new URL(basis).host;
  } catch {
    return [];
  }
  const gefunden = new Map<string, LinkKandidat>();
  for (const m of xml.matchAll(/<loc>\s*([^<\s]+)\s*<\/loc>/gi)) {
    let ziel: URL;
    try {
      ziel = new URL(m[1]);
    } catch {
      continue;
    }
    if (ziel.host !== host) continue;
    const url = ziel.origin + ziel.pathname;
    const w = bewerteLink(url);
    if (w.punkte < SCHWELLE) continue;
    if (!gefunden.has(url)) gefunden.set(url, { url, text: "", ...w });
  }
  return [...gefunden.values()].sort((a, b) => b.punkte - a.punkte);
}

/** Verweise auf weitere Sitemaps in einem Sitemap-Index. */
export function sitemapIndex(xml: string): string[] {
  if (!/<sitemapindex/i.test(xml)) return [];
  return [...xml.matchAll(/<loc>\s*([^<\s]+)\s*<\/loc>/gi)].map((m) => m[1]);
}

// ─── Die Suchfunktion der Website selbst ─────────────────────────────────────
//
// WARUM (19.08.2026): Der Crawl über Startseite und zwei Menüebenen findet auf
// nur 13 % der Gemeinde-Websites eine Förderseite — gemessen an 9.722
// durchsuchten Gemeinden, von denen 7.863 ohne Fund blieben. Bei realistisch
// 5–10 % Programmdichte fehlen dadurch mehrere hundert Programme. Der Grund ist
// keine schlechte Bewertung, sondern die Reichweite: Der Crawl sieht nur, was im
// Menü der Startseite verlinkt ist. Eine Förderseite, die drei Klicks tief unter
// „Bauen und Wohnen → Umwelt → Energie" hängt oder deren Menü per JavaScript
// nachgeladen wird, ist für ihn unsichtbar.
//
// Fast jede kommunale Website hat aber eine eigene Volltextsuche, und die kennt
// ihren Bestand vollständig. Sie zu benutzen ist der direkte Weg zu genau den
// Seiten, die der Crawl verfehlt — und sie kostet EINEN Abruf statt eines
// tieferen Crawls.
//
// KEIN Rateweg über bekannte CMS-Pfade: Deutsche Kommunalseiten laufen auf einem
// Dutzend Systemen (TYPO3, WordPress, verwaltungsportal.de, nolis, advantic,
// kommunix …), jedes mit eigenem Pfad und eigenem Feldnamen. Eine gepflegte
// Liste davon wäre dasselbe Wettrennen wie eine offene Ausschlussliste. Das
// Formular auf der Startseite sagt beides selbst — Adresse und Feldname —, und
// zwar in der Fassung, die dieses eine System gerade wirklich benutzt.

/** Ein auswertbares Suchformular: wohin, welches Feld, welche festen Werte. */
export type SuchFormular = {
  /** Absolute Adresse, an die die Suche geht. */
  action: string;
  /** Name des Eingabefelds — bei TYPO3 gern `tx_solr[q]`, deshalb wörtlich. */
  feld: string;
  /** Versteckte Felder des Formulars; TYPO3 braucht z. B. `id=123`. */
  versteckt: { name: string; wert: string }[];
};

/** Feldnamen, die eine Volltextsuche verraten, wenn das Formular sonst nichts sagt. */
const SUCHFELD_NAME =
  /^(q|s|search|suche|suchbegriff|suchwort|searchterm|search_term|query|keywords?|wort)$|\[(sword|q|search|query)\]/i;

/** Merkmale am Formular selbst — Adresse, id oder class. */
const SUCHFORMULAR_MERKMAL = /such|search|solr|kesearch|indexedsearch/i;

/**
 * Das Suchformular einer Seite finden.
 *
 * **Auch POST-Formulare zählen — wir schicken trotzdem ein GET.** Das war
 * zunächst andersherum gebaut, mit dem Argument, ein POST gegen einen fremden
 * Verwaltungsserver sei eine Schreibgeste. Das Argument stimmt, trifft aber
 * nicht: Wir übernehmen aus dem Formular nur Adresse und Feldname und stellen
 * damit eine ganz normale GET-Anfrage. Viele Systeme (TYPO3, WordPress)
 * beantworten die genauso; wo ein Server auf POST besteht, kommt die Suchseite
 * ohne Treffer zurück, und die Bewertung findet dort schlicht nichts. Gemessen
 * am 19.08.2026: Von 39 erreichbaren Gemeinde-Websites trugen nur 14 ein
 * GET-Formular — die POST-Fassungen auszuschließen kostete also mehr, als der
 * vermiedene Irrtum wert war.
 *
 * Der Feldname wird WÖRTLICH übernommen, samt eckiger Klammern. Ihn zu
 * normalisieren wäre der eine Fehler, der die halbe TYPO3-Welt kostet:
 * `tx_solr[q]` und `tx_kesearch_pi1[sword]` sind keine Schreibfehler.
 */
export function suchFormular(html: string, basis: string): SuchFormular | null {
  let host: string;
  try {
    host = new URL(basis).host;
  } catch {
    return null;
  }

  for (const m of html.matchAll(/<form\b([^>]*)>([\s\S]*?)<\/form>/gi)) {
    const attrs = m[1];
    const inhalt = m[2];

    const actionRoh = attrs.match(/\baction\s*=\s*["']([^"']*)["']/i)?.[1] ?? "";
    // Ohne `action` schickt ein Formular an die Seite selbst — gültig und bei
    // WordPress-Startseiten (`?s=…`) der Normalfall.
    let action: URL;
    try {
      action = new URL(actionRoh || basis, basis);
    } catch {
      continue;
    }
    if (action.host !== host) continue;

    const formularSagtSuche =
      SUCHFORMULAR_MERKMAL.test(attrs) || SUCHFORMULAR_MERKMAL.test(actionRoh);

    // Das Textfeld der Suche. `type="search"` ist der klare Fall; sonst
    // entscheidet der Feldname. Ein beliebiges Textfeld gilt nur, wenn das
    // Formular selbst nach Suche aussieht — sonst kaperten wir Newsletter- und
    // Kontaktformulare, die auf jeder zweiten Startseite stehen.
    let feld: string | null = null;
    let notnagel: string | null = null;
    for (const i of inhalt.matchAll(/<input\b([^>]*)>/gi)) {
      const ia = i[1];
      const typ = ia.match(/\btype\s*=\s*["']?([a-z]+)/i)?.[1]?.toLowerCase() ?? "text";
      const name = ia.match(/\bname\s*=\s*["']([^"']+)["']/i)?.[1];
      if (!name) continue;
      if (typ === "search") { feld = name; break; }
      if (typ !== "text") continue;
      if (SUCHFELD_NAME.test(name)) { feld = name; break; }
      if (formularSagtSuche && !notnagel) notnagel = name;
    }
    feld ??= notnagel;
    if (!feld) continue;

    const versteckt: { name: string; wert: string }[] = [];
    for (const i of inhalt.matchAll(/<input\b([^>]*)>/gi)) {
      const ia = i[1];
      if (!/\btype\s*=\s*["']?hidden/i.test(ia)) continue;
      const name = ia.match(/\bname\s*=\s*["']([^"']+)["']/i)?.[1];
      const wert = ia.match(/\bvalue\s*=\s*["']([^"']*)["']/i)?.[1] ?? "";
      if (name && name !== feld) versteckt.push({ name, wert });
    }

    return { action: action.origin + action.pathname, feld, versteckt };
  }
  return null;
}

/**
 * Die Begriffe, mit denen gesucht wird — kurz, einzeln, treffsicherster zuerst.
 *
 * Viele Kommunalsuchen verknüpfen Wörter mit UND. „förderprogramm photovoltaik"
 * verlöre deshalb genau die kleinen Gemeinden, deren Seite schlicht
 * „Förderprogramme" heißt und Photovoltaik neben Zisternen und Streuobstwiesen
 * führt — dieselben, die {@link istEndergebnis} ausdrücklich behalten will.
 * Also ein Wort je Anfrage.
 *
 * Ein breiter Begriff kostet keine Präzision: Die Trefferliste läuft durch
 * dieselbe Bewertung wie jede andere Seite.
 */
export const SUCH_BEGRIFFE = ["förderprogramm", "photovoltaik"] as const;

/** Die fertige Adresse für eine Anfrage an die Suche der Website. */
export function suchAdresse(f: SuchFormular, begriff: string): string {
  const u = new URL(f.action);
  for (const { name, wert } of f.versteckt) u.searchParams.set(name, wert);
  u.searchParams.set(f.feld, begriff);
  return u.toString();
}

/**
 * Wohin man schaut, wenn die Startseite kein Formular hergibt.
 *
 * Viele Kommunalseiten tragen oben nur ein Lupen-Symbol, das die Suche per
 * JavaScript einblendet — im ausgelieferten HTML steht dann kein `<form>`. Die
 * eigentliche Suchseite hat es aber fast immer, und sie liegt auf einem der
 * wenigen üblichen Pfade. Gemessen am 19.08.2026: Nur 14 von 39 erreichbaren
 * Startseiten trugen ein auswertbares Formular — das ist der Engpass des
 * ganzen Wegs, nicht die Bewertung der Treffer.
 *
 * Bewusst KURZ gehalten: Jeder Pfad ist ein Abruf gegen einen fremden Server,
 * und der Ertrag fällt nach den ersten beiden steil ab.
 */
export const SUCHSEITEN_PFADE = ["/suche", "/search"] as const;

/** Ein Link auf der Startseite, der zur Suchseite führt — besser als raten. */
export function suchseitenLink(html: string, basis: string): string | null {
  let host: string;
  try {
    host = new URL(basis).host;
  } catch {
    return null;
  }
  for (const m of html.matchAll(/<a\b[^>]*href=["']([^"'#]+)["'][^>]*>([\s\S]*?)<\/a>/gi)) {
    let ziel: URL;
    try {
      ziel = new URL(m[1], basis);
    } catch {
      continue;
    }
    if (ziel.host !== host) continue;
    const text = m[2].replace(/<[^>]+>/g, " ").trim();
    // Der Pfad muss die Suche benennen; ein Linktext „Suche" allein reicht
    // nicht, sonst landet man auf der Personensuche im Ratsinformationssystem.
    if (!/\/(suche|search|volltextsuche|suchergebnis)/i.test(ziel.pathname)) continue;
    // Ohne abschließende Wortgrenze — „ratsinfo" und „personensuche" schreiben
    // das Wort mit der Suche zusammen, und genau die sollen raus.
    if (/(^|[/_-])(rats|sitzungs|personen|mitarbeiter|adress|branchen|produkt|stellen)/i.test(ziel.pathname)) continue;
    if (/\b(ratsinfo|personen|ansprechpartner|mitarbeiter|adressen|branchen)/i.test(text)) continue;
    return ziel.origin + ziel.pathname;
  }
  return null;
}
