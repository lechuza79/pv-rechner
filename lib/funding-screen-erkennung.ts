/**
 * Vorsortierung einer kommunalen Förderseite: wofür lohnt sich das Lesen?
 *
 * DIESES MODUL LIEST NICHT, ES SORTIERT VOR. Es entscheidet nicht, ob ein
 * Programm in den Katalog kommt, welche Sätze gelten oder ob eine Förderung noch
 * läuft — das braucht Urteilsvermögen und bleibt beim Wächter-Lauf. Ein Treffer
 * heißt „hier lohnt sich das Hinsehen", nie „hier gibt es Geld". Ein
 * Screening-Zitat ist deshalb auch niemals die Quelle für eine Zahl.
 *
 * Warum als eigenes Modul und nicht im Skript (18.08.2026): Die Einordnung ist
 * die einzige Stelle des Abdeckungs-Laufs, die ein Urteil fällt — und die
 * einzige, an der ein Fehler teuer ist. Die erste Fassung meldete eine
 * Oldenburger Seite über Zuschüsse zu Verhütungsmitteln als PV-Treffer, weil das
 * Wort Photovoltaik im Navigationsmenü stand, das auf jeder Unterseite mitläuft.
 * Im Skript lag sie hinter einem Supabase-Client am Modulkopf und war damit
 * nicht prüfbar; hier hat sie einen Test.
 */

export type ScreenTechnik = "pv" | "balkon" | "waermepumpe";

export type ScreenVerdikt =
  /** Mindestens eine Technik mit einem Förder-Signal in Reichweite. */
  | "treffer"
  /** Spricht über eine der Techniken, aber erkennbar als beendet/ausgelaufen. */
  | "ausgelaufen"
  /** Förderseite ohne verwertbares Signal (Fassaden, Innenstadt, Wohnraum …). */
  | "kein-treffer"
  /** Seite nicht abrufbar — kommt beim nächsten Lauf wieder dran. */
  | "unerreichbar";

/**
 * Version der Erkennung. Wird mit jeder Zeile abgelegt; Zeilen mit kleinerer
 * Version kommen von selbst wieder dran.
 *
 * 1 = nur PV, Balkon-Wörter mit in derselben Liste, Wärmepumpe unbekannt.
 * 2 = drei Techniken getrennt (18.08.2026).
 *
 * WER DIE WORTLISTEN ÄNDERT, ZÄHLT DIE VERSION HOCH. Sonst gilt eine Seite als
 * mit der neuen Erkennung geprüft, die nie durch sie gelaufen ist — dieselbe
 * Fehlerklasse wie ein Prüfdatum ohne Prüfung.
 */
export const SCREEN_VERSION = 2;

/**
 * Rückfall-Frist, falls von einer Seite kein Fingerabdruck vorliegt.
 *
 * DER NORMALFALL IST EIN ANDERER, und das ist der Punkt: Ob eine Seite erneut
 * angesehen werden muss, entscheidet nicht der Kalender, sondern ob sie sich
 * BEWEGT hat. Der Seiten-Wächter ruft täglich ab und vergleicht Fingerabdrücke;
 * ändert sich einer, kommt die Seite sofort wieder in den Screening-Lauf — nicht
 * in drei Monaten.
 *
 * Eine erste Fassung setzte hier ein festes Vierteljahr. Der Betreiber hat das
 * zu Recht zurückgewiesen: „ein Förderprogramm das 89 Tage den falschen Status
 * hat wäre dumm." Genau dasselbe Argument hatte schon einmal die 180-Tage-Frist
 * beim Beleg-Verfall gekippt — die richtige Größe ist nicht das Alter, sondern
 * ob wir den Stand gerade bestätigen können.
 *
 * Die Frist bleibt trotzdem stehen, als Netz für die Seiten, von denen (noch)
 * kein Fingerabdruck existiert: neu gefundene Adressen, dauerhaft gesperrte
 * Server. Ein Jahr, weil kommunale Programme dem Haushaltsjahr folgen — wer in
 * einem ganzen Jahr keinen einzigen Abruf zustande gebracht hat, soll trotzdem
 * einmal wieder angesehen werden.
 */
export const WIEDERVORLAGE_TAGE = 365;

/**
 * Die Begriffe je Technik.
 *
 * Getrennt statt in einem Topf, weil die Techniken in verschiedene Rechner
 * führen und ein gemeinsamer Treffer nicht sagt, in welchen. Bis 18.08.2026 lag
 * `balkonkraftwerk` in derselben Liste wie `photovoltaik`: Steckersolar-Treffer
 * waren dadurch nicht von Dach-PV zu unterscheiden und blieben deshalb liegen.
 */
const BEGRIFFE: Record<ScreenTechnik, RegExp> = {
  // `solaranlage` fängt bewusst auch Solarthermie mit ein — die Trennung
  // gelingt am Wort nicht zuverlässig, und ein Vorfilter darf lieber einmal zu
  // viel zum Lesen vorlegen als eine PV-Förderung übersehen.
  pv: /(photovoltaik|pv-anlage|pv-anlagen|solaranlage|solarstrom|solardach|batteriespeicher|stromspeicher|solarspeicher)/g,
  balkon:
    /(balkonkraftwerk|balkon-kraftwerk|balkonmodul|balkonsolar|balkon-pv|stecker-?solar|steckerfertige\s+(?:pv|photovoltaik|solar)|steckerfertiger?\s+solar|mini-?pv|mini-?solar|guerilla-?pv)/g,
  waermepumpe:
    /(wärmepumpe|waermepumpe|luft-wasser-wärmepumpe|sole-wasser-wärmepumpe|heizungstausch|heizungsaustausch|austausch der heizung|umstellung der heizung|klimafreundliche heizung)/g,
};

/** Ein konkreter Geldbetrag — nicht bloß das Wort „Förderung". */
const BETRAG = /(\d[\d.]*\s*(?:€|euro)|€\s*\d|\d+\s*(?:prozent|%)\s*(?:der|zuschuss))/;
const ZUSCHUSS = /(zuschuss|gefördert|fördersatz|förderhöhe|förderbetrag|wird gefördert|förderung von|bezuschusst)/;
const BEENDET =
  /(beendet|eingestellt|ausgelaufen|ausgeschöpft|keine anträge|nicht mehr möglich|geschlossen|außer kraft|stehen keine förderprogramme|derzeit keine förder|zurzeit keine förder|nicht mehr gefördert|mittel sind aufgebraucht)/;

/**
 * Sichtbarer Text einer HTML-Seite, kleingeschrieben und ohne Auszeichnung.
 *
 * Navigation, Kopf- und Fußbereich fliegen MIT RAUS — das ist kein Aufräumen,
 * sondern die Behebung der Ursache für das teuerste Falsch-Positiv dieses Laufs.
 * Ein Menü listet auf jeder Unterseite sämtliche Themen der Verwaltung auf; auf
 * einer kurzen Seite steht das Wort „Photovoltaik" aus dem Menü dann wenige
 * hundert Zeichen neben einem Zuschussbetrag, der zu etwas ganz anderem gehört
 * (gemessen in Oldenburg: Verhütungsmittel). Der Abstandsfilter allein kann das
 * nicht trennen, weil der Abstand tatsächlich klein ist.
 */
export function sichtbarerText(html: string): string {
  return html
    .replace(/<(script|style|noscript|svg)[^>]*>[\s\S]*?<\/\1>/gi, " ")
    .replace(/<(nav|header|footer|aside)[^>]*>[\s\S]*?<\/\1>/gi, " ")
    .replace(/<!--[\s\S]*?-->/g, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&[a-z]+;|&#\d+;/gi, " ")
    .replace(/\s+/g, " ")
    .toLowerCase();
}

/** Wie weit vor und hinter einem Begriff nach einem Förder-Signal gesucht wird. */
const VORLAUF = 260;
const NACHLAUF = 360;

/** So viele Vorkommen je Technik werden geprüft — der Rest ist Wiederholung. */
const MAX_STELLEN = 40;

export type ScreenBefund = {
  verdikt: ScreenVerdikt;
  /** Die Techniken, für die ein Signal in Reichweite stand. Leer außer bei `treffer`. */
  techniken: ScreenTechnik[];
  /** Textausschnitt als Beleg — für die Leseliste, nie als Quelle für eine Zahl. */
  beleg: string;
};

/**
 * Einordnung — bewusst streng auf NÄHE gebaut.
 *
 * Ein Treffer verlangt einen konkreten Betrag oder ein Zuschuss-Wort im selben
 * Textfenster wie der Fachbegriff, und zwar an IRGENDEINEM seiner Vorkommen,
 * nicht nur am ersten: Das erste ist fast immer die Navigation.
 *
 * „Beendet" schlägt einen Treffer, sobald es im selben Fenster steht — für DIESE
 * Technik. Bis 18.08.2026 beendete es die ganze Seite, was bei einer Seite mit
 * mehreren Programmen („Balkonkraftwerke ausgeschöpft, Wärmepumpen laufen
 * weiter") das laufende Programm mit verschluckte.
 */
/**
 * Alle Fundstellen eines Musters im Text.
 *
 * Eigene Funktion, weil die Muster ein g-Flag tragen und damit einen Zustand:
 * Zweimal denselben Regex zu benutzen überspringt beim zweiten Mal den Anfang
 * des Texts — ein Fehler, der nur bei manchen Seiten sichtbar wird.
 */
function stellenVon(text: string, muster: RegExp): number[] {
  return [...text.matchAll(new RegExp(muster.source, "g"))].map((m) => m.index ?? 0);
}

export function einordnen(text: string): ScreenBefund {
  const fundstellen = new Map<ScreenTechnik, number[]>();
  const alleStellen: number[] = [];
  for (const technik of Object.keys(BEGRIFFE) as ScreenTechnik[]) {
    const stellen = stellenVon(text, BEGRIFFE[technik]).slice(0, MAX_STELLEN);
    if (stellen.length) fundstellen.set(technik, stellen);
    alleStellen.push(...stellen);
  }
  if (!alleStellen.length) return { verdikt: "kein-treffer", techniken: [], beleg: "" };

  /**
   * Welche Fundstellen sind durch ein „beendet" entwertet?
   *
   * ASYMMETRIE MIT ABSICHT — sie spiegelt die Fehlerkosten. Ein Betrag im
   * Umfeld zählt großzügig für JEDE Fundstelle in Reichweite: Ein Treffer zu
   * viel kostet ein paar Minuten Lesezeit. Ein „beendet" zählt dagegen nur für
   * die EINE nächstgelegene Fundstelle, denn ein fälschlich verschlucktes
   * Programm fehlt für immer im Katalog und niemand merkt es.
   *
   * Die häufigste Bauform, an der das hängt: mehrere Programme untereinander
   * auf einer Seite. „Balkonkraftwerke — Mittel ausgeschöpft" darf den darunter
   * stehenden, laufenden Wärmepumpen-Zuschuss nicht mit beenden.
   */
  const entwertet = new Set<number>();
  for (const beendetStelle of stellenVon(text, BEENDET)) {
    // Zugeordnet wird NACH VORNE: Ein „ausgeschöpft" gehört zu dem Programm,
    // dessen Überschrift darüber steht. Deutsche Förderseiten schreiben
    // „Balkonkraftwerke: Mittel ausgeschöpft", nie andersherum — und ein Satz
    // enthält oft mehrere Ende-Wörter („ausgeschöpft, keine Anträge mehr"), von
    // denen das letzte bei einer Zuordnung nach Abstand schon in den nächsten
    // Abschnitt rutschen kann und dort ein laufendes Programm mit beendet.
    const davor = alleStellen.filter((s) => s <= beendetStelle).pop();
    if (davor !== undefined && beendetStelle - davor <= NACHLAUF) {
      entwertet.add(davor);
      continue;
    }
    // Steht kein Fachbegriff davor, ist es ein vorangestellter Hinweis
    // („Das Programm ist beendet. Gefördert wurden …") und gilt dem folgenden.
    const danach = alleStellen.find((s) => s > beendetStelle);
    if (danach !== undefined && danach - beendetStelle <= VORLAUF) entwertet.add(danach);
  }

  const treffer: ScreenTechnik[] = [];
  const ausgelaufen: ScreenTechnik[] = [];
  let bester = "";
  let ersterFund = "";

  for (const [technik, stellen] of fundstellen) {
    if (!ersterFund) ersterFund = text.slice(Math.max(0, stellen[0] - 120), stellen[0] + 180);

    let endeGefunden = false;
    for (const stelle of stellen) {
      if (entwertet.has(stelle)) {
        endeGefunden = true;
        continue;
      }
      const umfeld = text.slice(Math.max(0, stelle - VORLAUF), stelle + NACHLAUF).trim();
      if (BETRAG.test(umfeld) && ZUSCHUSS.test(umfeld)) {
        if (!treffer.includes(technik)) treffer.push(technik);
        bester = bester || umfeld;
        endeGefunden = false;
        break;
      }
      if (BETRAG.test(umfeld) && !treffer.includes(technik)) {
        treffer.push(technik);
        bester = bester || umfeld;
        endeGefunden = false;
      }
    }
    if (endeGefunden && !treffer.includes(technik)) {
      ausgelaufen.push(technik);
      bester = bester || text.slice(Math.max(0, stellen[0] - VORLAUF), stellen[0] + NACHLAUF).trim();
    }
  }

  const kuerzen = (s: string) => s.slice(0, 400);
  if (treffer.length) return { verdikt: "treffer", techniken: treffer, beleg: kuerzen(bester) };
  if (ausgelaufen.length) return { verdikt: "ausgelaufen", techniken: [], beleg: kuerzen(bester) };
  return { verdikt: "kein-treffer", techniken: [], beleg: kuerzen(ersterFund) };
}


/** Der abgelegte Zustand einer Gemeinde, soweit er über die Wiedervorlage entscheidet. */
export type AbdeckungsZeile = {
  verdict: string;
  screen_version: number | null;
  /** Wann ein Mensch die Seite gelesen hat. */
  gelesen_am: string | null;
  /** Letzter Abruf durch den Screener. */
  checked_at: string | null;
  /** Wann der Seiten-Abgleich zuletzt eine Änderung an dieser Seite feststellte. */
  seite_geaendert_am?: string | null;
};

/**
 * Ist diese Gemeinde erledigt — oder gehört sie in den nächsten Lauf?
 *
 * Hier statt im Skript, weil sie erst in Monaten das erste Mal wirkt: Eine Regel,
 * deren Fehler man frühestens nach 90 Tagen sieht, muss einen Test haben. Im
 * Skript hinter einem Supabase-Client wäre sie nicht prüfbar.
 *
 * Vier Gründe für eine erneute Vorlage:
 *  1. noch nie angesehen,
 *  2. beim letzten Mal nicht erreichbar,
 *  3. mit einer älteren Erkennung geprüft,
 *  4. seit über {@link WIEDERVORLAGE_TAGE} nicht mehr angesehen.
 *
 * Der vierte ist der, der lange gefehlt hat. Der fünfte Fall ist die Ausnahme:
 * Ein GELESENER Treffer kommt nicht zurück — wurde er aufgenommen, ruft der
 * Seiten-Wächter seine Amtsseite täglich ab; wurde er verworfen, war es keine
 * Förderseite, und das ändert sich nicht in einem Quartal.
 */
export function istErledigt(z: AbdeckungsZeile | undefined, heuteMs: number): boolean {
  if (!z) return false;
  if (z.verdict === "unerreichbar") return false;
  if ((z.screen_version ?? 1) < SCREEN_VERSION) return false;

  // Die Seite hat sich bewegt, seit wir sie zuletzt eingeordnet haben — dann
  // sofort wieder ansehen, unabhängig von jeder Frist und auch dann, wenn ein
  // Mensch sie schon gelesen hat. Das ist der eigentliche Auslöser: Ein
  // Programm, das gestern „aktiv" war und heute „ausgeschöpft", steht morgen
  // wieder auf der Liste und nicht im nächsten Quartal.
  if (z.seite_geaendert_am && (!z.checked_at || z.seite_geaendert_am > z.checked_at)) return false;

  // Gelesene Treffer kommen NICHT über die Frist zurück (nur über eine echte
  // Änderung, siehe oben): Aufgenommene ruft der Seiten-Wächter täglich ab,
  // verworfene waren keine Förderseiten. Ohne diese Ausnahme stünde die
  // abgearbeitete Leseliste regelmäßig wieder da.
  if (z.gelesen_am) return true;

  if (!z.checked_at) return false;
  const tage = Math.round((heuteMs - Date.parse(z.checked_at)) / 86_400_000);
  return tage <= WIEDERVORLAGE_TAGE;
}
