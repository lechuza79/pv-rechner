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

import { entwirreAdressen, istPersonenAdresse } from "./personen-fund";
import { lesbarMachen } from "./website-abruf";
import {
  type Verantwortlich,
  VERSORGER_VOKABULAR,
  decodeEntities,
  extractVerantwortlich,
  findLinkUrl,
  toText,
} from "./kommunen-profil";

// ─── Postfächer ───────────────────────────────────────────────────────────────

/**
 * Postfächer der Stelle, die **die Website verantwortet** — Kommunikation,
 * Presse, Marketing, Online-Redaktion.
 *
 * WARUM DAS NICHT „VERTRIEB" HEISST (Korrektur vom 23.08.2026, Einwand des
 * Betreibers): Eine erste Fassung warf `vertrieb@`, `kundencenter@` und
 * `privatkunden@` mit `marketing@` in einen Topf und nannte das Ganze
 * „Vertriebspostfach". Das ist falsch herum gedacht. `vertrieb@` bei einem
 * Stadtwerk ist der EINGANG für Leute, die dort Strom kaufen wollen — eine
 * Warteschlange des Kundendienstes, nicht der Schreibtisch, an dem jemand
 * entscheidet, was auf die eigene Website kommt. Wer dort anfragt, landet bei
 * jemandem, der Tarife verkauft.
 *
 * Gemessen an der Stichprobe: 5 vermeintliche Treffer, davon 3 × `vertrieb@`,
 * 1 × `kundencenter@` und nur 1 × `marketing@`. Vier von fünf zeigten auf die
 * falsche Stelle, und die Zahl „5 von 20 erreichen den Entscheider" war damit
 * eine Selbsttäuschung.
 */
export const WEBSITE_ROLLE =
  /^(marketing|presse|pressestelle|pressekontakt|kommunikation|unternehmenskommunikation|oeffentlichkeitsarbeit|öffentlichkeitsarbeit|redaktion|onlineredaktion|webredaktion|webmaster|web|online|internet|digital)([.-]?\w+)?@/i;

/**
 * Postfächer der KUNDEN-Warteschlange. Erreichbar, aber der falsche
 * Schreibtisch: Dort sitzt, wer Tarife verkauft und Rechnungen erklärt.
 *
 * Sie werden trotzdem festgehalten statt verworfen — bei einem kleinen
 * Stadtwerk ist es oft dieselbe Person, und ohne die Adresse ließe sich das
 * später nicht mehr prüfen, ohne alles neu abzurufen.
 */
export const KUNDENANFRAGE_ROLLE =
  /^(vertrieb|privatkunden|geschaeftskunden|geschäftskunden|kundenservice|kundenbetreuung|kundencenter|kundenzentrum|energieberatung|beratung|angebot|tarife?)([.-]?\w+)?@/i;

/** Postfächer des NETZBETRIEBS. Sie sind die Meldeadresse gegenüber der
 *  Bundesnetzagentur und stehen deshalb im Anlagenregister — sie sind der
 *  Grund, warum die Adressliste systematisch danebenzeigt. */
export const NETZ_ROLLE =
  /^(netz|netze|einspeis\w*|einspeisung|netzanschluss|anschluss|zaehler\w*|zähler\w*|messstellenbetrieb|messwesen|marktkommunikation|edifact|technik|entstoerung|entstörung|bereitschaft)([.-]?\w+)?@/i;

/**
 * Postfächer, die es zwar gibt, die aber niemals angeschrieben werden — der
 * Datenschutzbeauftragte, die Bewerbungsstelle, ein Nicht-Antworten-Postfach.
 *
 * WARUM DAS EINE EIGENE ART IST UND KEIN FILTER (Gegenprüfung 05.09.2026): Das
 * Vokabular führt diese Liste seit jeher, der Versorger-Weg hat sie aber nie
 * angewandt — nur der Kommunen-Weg tat das. Folge: `datenschutz@` (44x),
 * `bewerbung@` (10x) und `spam@` (3x) landeten als „person" in den Funden und
 * zählten in der Kennzahl „hat einen schriftlichen Weg zu uns" mit. Das ist die
 * Fehlerklasse „Beschriftung sagt etwas anderes, als die Zahl misst".
 *
 * Verworfen wird trotzdem nichts: Der Fund bleibt erhalten und trägt nur sein
 * Etikett — sonst kostet jede spätere Neubewertung wieder einen vollen Abruf.
 */
export const UNGEEIGNETE_ROLLE =
  /^(datenschutz|dsb|datenschutzbeauftragter|abuse|noreply|no-reply|donotreply|postmaster|spam|bewerbung|bewerbungen|jobs|karriere|ausbildung|personal|webmaster-?report)([.-]?\w+)?@/i;

/**
 * Ein Funktionspostfach ohne erkennbare Zuständigkeit für uns —
 * `planauskunft@`, `hausanschluss@`, `beschwerdemanagement@`.
 *
 * Es ist der Auffangkorb und heißt deshalb ausdrücklich NICHT „person": Von den
 * 1.613 so eingeordneten Adressen waren die allermeisten Funktionspostfächer,
 * und wer eine Liste „namentliche Ansprechpartner" daraus baut, baut sie aus
 * Abteilungskürzeln.
 */
export type PostfachArt =
  | "website"
  | "kundenanfrage"
  | "allgemein"
  | "netz"
  | "person"
  | "funktion"
  | "ungeeignet"
  /** Die Adresse gehört gar nicht dem Versorger: eine Behörde, eine
   *  Schlichtungsstelle, ein Freimail-Anbieter — oder sie ist kaputt. */
  | "fremd";

/**
 * Adressen, die nie einem Versorger gehören, erkannt am Domain-Teil.
 *
 * Drei Klassen, alle am 05.09.2026 in den gespeicherten Funden nachgewiesen:
 *  - Freimail-Anbieter: hinter `t-online.de` sitzt kein Stadtwerk.
 *  - Platzhalter aus einer nie ausgefüllten Vorlage (`yourdomain.com`) — bei
 *    zwei Versorgern stand das als einziger Kontaktweg.
 *  - Kaputtes: `mwike.nrw_de` entsteht, wenn beim Einsammeln ein Punkt
 *    verlorengeht. Eine Domain ohne Punkt ist keine.
 */
export const UNBRAUCHBARE_DOMAIN =
  /^(t-online|gmx|web|gmail|googlemail|outlook|hotmail|yahoo|aol|freenet|mail)\.[a-z.]+$|yourdomain|example\.(com|org|net)|muster(mann|firma)|\.(test|invalid|localhost)$|_/i;

/**
 * Stellen, die im Impressum eines Versorgers stehen MUESSEN oder regelmaessig
 * stehen — und die nie unser Adressat sind.
 *
 * Gemessen 24.08.2026 ueber alle Versorger: Von 232 Adressen auf fremder Domain
 * waren die haeufigsten die Bundesnetzagentur (40x) und die Schlichtungsstelle
 * Energie (38x). Beide schreibt das Energiewirtschaftsgesetz vor; dazu kommen
 * Landesregulierungsbehoerden und die Webagentur des Hauses. Eine Adresse aus
 * dem Impressum ungeprueft zu uebernehmen hiesse, dem Betreiber die
 * Bundesnetzagentur als Kontakt anzubieten.
 */
export const FREMDE_STELLE = new RegExp(
  [
    // Bundesnetzagentur und die Schlichtungsstellen — beide schreibt das EnWG vor.
    /bnetza\.de|bundesnetzagentur|schlichtungsstelle|universalschlichtung|clearingstelle/.source,
    // Regulierungsbehörden der Länder.
    /regulierungskammer|landesregulierungsbehoerde|landeskartellbehoerde/.source,
    // Verbraucherschutz und Datenschutzaufsicht.
    /verbraucherzentrale|verbraucher-?schlichter|datenschutz\w*\.de$/.source,
    // Kammern: Sie stehen als Aufsicht im Impressum, sind aber nie der Adressat.
    /(^|\.)(ihk|hwk|handwerkskammer)[.-]/.source,
    /\.(ihk|hwk)\.de$/.source,
    // Behörden von Bund und Ländern. Die Bundesländer standen bisher einzeln und
    // unvollständig da (nur sechs von sechzehn) — gemessen 05.09.2026 sind so
    // `wirtschaft.saarland.de` (8x), `tmuen.thueringen.de` und
    // `mu.niedersachsen.de` (6x) als Kontaktweg durchgerutscht. Statt die Liste
    // weiter zu pflegen, deckt EIN Muster alle Landes- und Bundesdomains ab.
    /(^|\.)(bund|bayern|berlin|brandenburg|bremen|hamburg|hessen|mv-regierung|niedersachsen|nrw|rlp|saarland|sachsen|sachsen-anhalt|schleswig-holstein|thueringen|bwl|baden-wuerttemberg)\.de$/.source,
    /(^|\.)[a-z-]+\.(bund|bayern|berlin|brandenburg|bremen|hamburg|hessen|niedersachsen|nrw|rlp|saarland|sachsen|sachsen-anhalt|schleswig-holstein|thueringen|bwl)\.de$/.source,
  ].join("|"),
  "i",
);

/**
 * Dienstleister, die ihre eigene Adresse ins Impressum setzen (Webagentur,
 * Hoster, Rechtsberatung). Erkannt am Umfeld, nicht an einer Firmenliste —
 * eine gepflegte Agenturliste waere dasselbe Wettrennen wie eine offene
 * Ausschlussliste und nie fertig.
 */
export const DIENSTLEISTER_HINWEIS =
  /realisierung|umsetzung|technische\s+umsetzung|gestaltung|webdesign|webentwicklung|programmierung|agentur|hosting|konzeption/i;

/**
 * Einordnung einer einzelnen Adresse.
 *
 * Die Reihenfolge ist Absicht und bildet ab, wie nah die Stelle an der
 * Entscheidung sitzt: Website-Schreibtisch vor Netzbetrieb (`presse-netz@`
 * gehört der Pressestelle), Netzbetrieb vor Kundenwarteschlange
 * (`vertrieb-netznutzung@` ist Netz), Kundenwarteschlange vor dem allgemeinen
 * Eingang.
 */
export function postfachArt(mail: string, allgemein: RegExp): PostfachArt {
  const m = mail.trim().toLowerCase();
  // Die Domain zuerst: Wem die Adresse gehört, entscheidet vor allem anderen.
  // `poststelle@tmuen.thueringen.de` als „allgemeines Postfach" auszugeben, weil
  // das Wort davor passt, ist der Fehler, der zehn Anschreiben an die
  // Universalschlichtungsstelle erzeugt hätte.
  const dom = m.split("@")[1] ?? "";
  if (dom && (FREMDE_STELLE.test(dom) || UNBRAUCHBARE_DOMAIN.test(dom))) return "fremd";
  // Ungeeignete Rollen: `datenschutz-marketing@` gäbe es sonst als
  // Website-Schreibtisch aus, und `bewerbung@` als brauchbaren Weg.
  if (UNGEEIGNETE_ROLLE.test(m)) return "ungeeignet";
  if (WEBSITE_ROLLE.test(m)) return "website";
  if (NETZ_ROLLE.test(m)) return "netz";
  if (KUNDENANFRAGE_ROLLE.test(m)) return "kundenanfrage";
  if (allgemein.test(m)) return "allgemein";
  // „person" nur, wo wirklich ein Name steht (vorname.nachname@). Alles andere
  // ist ein Funktionspostfach, dessen Zuständigkeit wir nicht kennen.
  return istPersonenAdresse(m) ? "person" : "funktion";
}

/** Arten, über die ein Anschreiben laufen darf. `netz` fehlt hier bewusst: Die
 *  Netzgesellschaft ist nach § 7a EnWG ein eigenes Unternehmen und darf für den
 *  Vertrieb nicht einmal werben. `ungeeignet` und `funktion` ebenso — bei
 *  Letzterem wissen wir schlicht nicht, wo die Nachricht landet. */
export const BRAUCHBARE_ARTEN: PostfachArt[] = ["website", "allgemein", "kundenanfrage", "person"];

export function istBrauchbar(art: PostfachArt): boolean {
  return BRAUCHBARE_ARTEN.includes(art);
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
/**
 * Steht die Adresse im Umfeld eines Dienstleister-Hinweises? 300 Zeichen davor
 * — so weit reicht ein "Technische Umsetzung: ..."-Block.
 *
 * Gesucht wird in JEDER übergebenen Fassung, und das ist der Kern (Gegenprüfung
 * 05.09.2026): Die erste Fassung suchte die bereits entwirrte Adresse im rohen
 * HTML. Steht dort `info&#64;agentur.de` oder `info [at] agentur.de`, findet
 * sie nichts, meldet „kein Dienstleister" und übernimmt die Agenturadresse als
 * Postfach des Versorgers. Ausgerechnet die Schreibweisen, für die das
 * Entwirren gebaut wurde, liefen damit am Filter vorbei.
 */
export function naheDienstleisterHinweis(fassungen: string[], mail: string): boolean {
  for (const q of fassungen) {
    const i = q.indexOf(mail);
    if (i < 0) continue;
    if (DIENSTLEISTER_HINWEIS.test(q.slice(Math.max(0, i - 300), i))) return true;
  }
  return false;
}

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
      // Dekodiert pruefen: In einer Sitemap gibt es keinen Linktext als
      // Rueckfall, und `/f%c3%b6rderung` passt auf kein Muster.
      const lesbar = lesbarMachen(u);
      const punkte = KENNZEICHNUNG_NAHBEREICH.reduce((p, n) => (n.re.test(lesbar) ? Math.max(p, n.punkte) : p), 0);
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

/**
 * Das jüngste auf der Seite genannte Bezugsjahr. `null`, wenn keines dasteht.
 *
 * DIE OBERGRENZE IST DAS PFLICHTJAHR, NICHT DAS LAUFENDE JAHR — und daran hing
 * der schwerste Fehler dieser Erhebung (gemessen 05.09.2026): 118 von 299
 * Funden trugen das Bezugsjahr 2026, während am Stichtag 2025 zu zeigen war.
 * Ein Bezugsjahr über dem Pflichtjahr kann es nicht geben; die Daten dafür
 * existieren noch gar nicht. Was dort stand, war das Copyright der Fußzeile
 * („© 2026"), ein Preisänderungsdatum oder das VERÖFFENTLICHUNGSjahr im
 * Dateinamen — `Stromkennzeichnung-2026-Energietraegermix_LJ_2025` meint
 * Lieferjahr 2025. Wer solche Jahre mitzählt, stempelt jede veraltete Seite als
 * aktuell ab und macht die Kennzahl „veraltet" wertlos.
 *
 * Mit der Kappung fällt aus demselben Dateinamen richtig die 2025 heraus, und
 * eine Seite, auf der nur das Copyright steht, liefert ehrlich `null`.
 *
 * Zusätzlich zählt nur, was im UMFELD eines Kennzeichnungs-Stichworts steht.
 * Eine Übersichtsseite nennt Dutzende Jahre; das jüngste davon ist meist eine
 * Pressemeldung, kein Bezugsjahr.
 */
export function bezugsjahr(text: string, stichtag: Date): number | null {
  const max = pflichtjahr(stichtag);
  const suchen = (raum: string) => {
    let jung: number | null = null;
    // NICHT `\b` als Grenze: Der Unterstrich ist ein Wortzeichen, und damit
    // findet `\b(20\d\d)\b` in `Energietraegermix_LJ_2025.pdf` — dem
    // haeufigsten Dateinamen ueberhaupt — kein einziges Jahr. Gefunden von der
    // eigenen Negativprobe, 05.09.2026.
    for (const m of Array.from(raum.matchAll(/(?<![0-9])(20\d\d)(?![0-9])/g))) {
      const j = Number(m[1]);
      if (j < 2015 || j > max) continue;
      if (jung === null || j > jung) jung = j;
    }
    return jung;
  };
  // Steht die Sache im Text, gilt AUSSCHLIESSLICH ihr Umfeld — sonst gewinnt auf
  // einer Uebersichtsseite die juengste Pressemeldung gegen das Bezugsjahr.
  // Der ganze Text ist nur der Rueckfall fuer kurze Verweis-Beschriftungen ohne
  // eigenes Stichwort.
  const umfeld = umfelderMitStichwort(text);
  return umfeld ? suchen(umfeld) : suchen(text);
}

/**
 * Die Textstellen HINTER einem Kennzeichnungs-Stichwort, aneinandergehängt.
 *
 * Bewusst nur nach hinten: Das Bezugsjahr folgt der Sache („Stromkennzeichnung
 * 2024", „Energieträgermix für das Lieferjahr 2024"), es geht ihr nicht voraus.
 * Jedes Fenster nach vorn zieht auf einer Übersichtsseite nur die daneben
 * stehende Pressemeldung herein — und deren Jahr ist immer das jüngere, gewinnt
 * also jeden Vergleich.
 */
function umfelderMitStichwort(text: string): string {
  const global = new RegExp(KENNZEICHNUNG_MUSTER.source, "gi");
  const teile: string[] = [];
  for (const m of Array.from(text.matchAll(global))) {
    const i = m.index ?? 0;
    teile.push(text.slice(i, i + 200));
  }
  return teile.join(" ");
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
    const href = lesbarMachen(m[1].toLowerCase().replace(/&amp;/g, "&"));
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
    // Eine einzige fehlerhaft kodierte Adresse (`mailto:info%zz@x.de`) warf hier
    // einen Fehler und riss den gesamten Lauf über 910 Websites ab — gemessen
    // 05.09.2026. Eine kaputte fremde Seite darf höchstens ihre eigene Adresse
    // kosten, nie den Lauf.
    const kandidat = decodeEntities(lesbarMachen(m[1])).trim();
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
  /**
   * ALLE Adressen auf der eigenen Domain, mit ihrer Einordnung.
   *
   * Der Grund steht in der Korrektur vom 23.08.2026: Die erste Fassung
   * speicherte nur zwei ausgewählte Adressen — also ein URTEIL — und warf den
   * Rest weg. Als sich herausstellte, dass die Einordnung falsch war, hätte
   * jede Neubewertung einen kompletten neuen Abruf aller Versorger gekostet.
   * Wer die Funde behält, ordnet später in Sekunden neu ein.
   */
  postfaecher: { mail: string; art: PostfachArt }[];
  /** Bester Weg zum Website-Schreibtisch, nach der Rangfolge oben. */
  websiteEmail: string | null;
  kundenanfrageEmail: string | null;
  netzEmail: string | null;
  /** Die im Impressum als verantwortlich genannte Stelle (§ 18 MStV). Bei einem
   *  Versorger ist das die Redaktion oder Unternehmenskommunikation — also
   *  genau der Schreibtisch, der über die Website entscheidet. `operativ`
   *  trennt sie von der bloßen gesetzlichen Vertretung (Geschäftsführung). */
  verantwortlich: Verantwortlich | null;
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
  postfaecher: [],
  websiteEmail: null,
  kundenanfrageEmail: null,
  netzEmail: null,
  verantwortlich: null,
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
  const postfaecher: { mail: string; art: PostfachArt }[] = [];
  for (const seite of alle) {
    // DIE ADRESSE IM IMPRESSUM ZAEHLT IMMER — auch auf fremder Domain.
    //
    // Gemessen 24.08.2026 an Stadtwerke Freudenstadt: Die Website heisst
    // stadtwerke-freudenstadt.de, die Mailadresse im Impressum lautet
    // info@sw-freudenstadt.de. Der Domain-Filter warf damit ausgerechnet die
    // gesetzlich vorgeschriebene Kontaktadresse des Betreibers weg. Versorger
    // benutzen fuer Mail regelmaessig eine Abkuerzung oder die Domain der
    // Muttergesellschaft — das ist der Normalfall, nicht die Ausnahme, und es
    // erklaert den groessten Teil der 127 Versorger ohne gefundenen Weg.
    //
    // Auf allen ANDEREN Seiten bleibt der Filter: Dort stehen Agentur- und
    // Dienstleisteradressen, und die gehoeren nicht dem Versorger.
    const istImpressum = /impressum|anbieterkennzeichnung|rechtliche-hinweise/i.test(seite.url);
    const text = entwirreAdressen(toText(seite.html));
    for (const roh of adressenAus(seite.html, text)) {
      const mail = decodeEntities(roh).trim().toLowerCase();
      const dom = mail.split("@")[1];
      if (!dom) continue;
      const eigen = !eigeneDomain || dom === eigeneDomain || dom.endsWith(`.${eigeneDomain}`);
      // Eine fremde Domain kommt nur aus dem Impressum herein — und auch dort
      // nicht blind: Behoerden und Schlichtungsstellen stehen dort kraft
      // Gesetzes, die Agentur aus Eitelkeit. Beide sind nie unser Adressat.
      if (!eigen) {
        if (!istImpressum) continue;
        if (FREMDE_STELLE.test(dom)) continue;
        // In BEIDEN Fassungen nachsehen: verschleierte Adressen stehen so nur
        // im entwirrten Text, `mailto:`-Adressen nur im rohen HTML.
        if (naheDienstleisterHinweis([text, seite.html], roh)) continue;
      }
      if (postfaecher.some((p) => p.mail === mail)) continue;
      postfaecher.push({ mail, art: postfachArt(mail, allgemeinesRollenmuster) });
    }
  }
  const erste = (art: PostfachArt) => postfaecher.find((p) => p.art === art)?.mail ?? null;

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
    postfaecher,
    websiteEmail: erste("website"),
    kundenanfrageEmail: erste("kundenanfrage"),
    netzEmail: erste("netz"),
    verantwortlich: extractVerantwortlich(gesamtText, VERSORGER_VOKABULAR),
    kennzeichnungUrl,
    kennzeichnungPdf: fund?.pdf ?? false,
    kennzeichnungForm: form,
    kennzeichnungJahr: jahr,
    kennzeichnungAktuell: jahr === null ? null : jahr >= pflichtjahr(stichtag),
  };
}
