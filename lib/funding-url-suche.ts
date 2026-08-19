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

/** Version der Bewertung. Wie beim Screening: Wer die Listen ändert, zählt hoch. */
export const SUCH_VERSION = 1;

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

/** Dateiendungen und Pfade, die kein Lesen lohnen. */
const KEIN_ZIEL = /\.(pdf|jpe?g|png|gif|zip|docx?|xlsx?|pptx?)($|\?)|\/(impressum|datenschutz|kontakt|suche|login)\b/;

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
  const adresse = url.toLowerCase();
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
