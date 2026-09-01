/**
 * Der Zustand des Wärmepumpen-Rechners als Adresse — und zurück.
 *
 * Bis hierher war der Wärmepumpen-Rechner der einzige, dessen Ergebnis nur im
 * Browser lebte: Wer es jemandem zeigen wollte, konnte es nicht verschicken,
 * und wer die Seite neu lud, fing wieder bei Frage eins an.
 *
 * ────────────────────────────────────────────────────────────────────────────
 * DREI ENTSCHEIDUNGEN, DIE MAN NICHT AUS DEM CODE ABLESEN KANN
 * ────────────────────────────────────────────────────────────────────────────
 *
 * 1. DER LINK WIRD AUF KLICK GEBAUT, NICHT LAUFEND GESCHRIEBEN. Der
 *    Empfehlungs-Flow hält seinen Zustand dauerhaft in der Adresse, und genau
 *    das hat dort eine teure Falle erzeugt: Zwei Änderungen aus EINEM Klick
 *    setzen beide auf dem alten Stand auf, und die zweite nimmt die erste
 *    zurück — von außen fast unsichtbar, weil die Seite reagiert und einen
 *    plausiblen Wert zeigt. Hier gibt es diese Klasse nicht: gelesen wird
 *    einmal beim Laden, geschrieben wird nur, wenn jemand teilt.
 *
 * 2. NUR WAS VOM STANDARD ABWEICHT, STEHT IM LINK. Ein Link mit dreißig
 *    Parametern ist für einen Menschen nicht mehr überprüfbar, und ein
 *    Empfänger soll sehen können, was ihm da geschickt wurde.
 *
 * 3. DER FÖRDERSTAND MUSS MIT. Er ist der einzige Schalter, der die Zahl
 *    ändert, ohne am Gebäude etwas zu ändern: Wer eine Rechnung nach den
 *    Sätzen des nächsten Stichtags teilt und ihn nicht mitschickt, schickt
 *    eine Zahl, die beim Empfänger anders herauskommt. Dieselbe Regel wie
 *    beim Vergütungsregime des PV-Rechners.
 *
 * WAS BEWUSST NICHT MITGEHT: die reine Anzeige — welcher Abschnitt gerade
 * aufgeklappt ist, welche Gebäudefrage im Ergebnis bearbeitet wird. Das ist
 * kein Ergebnis, das ist eine Sitzung.
 */

export type WpFuelId = string;
export type WpAltheizung = "oel_kohle" | "gas_alt" | "gas_neu" | "andere";
export type WpEinkommen = "none" | "bis50" | "bis40" | "bis30";
export type WpBegStand = "jetzt" | "naechste";

/**
 * Alles, was das Ergebnis bestimmt.
 *
 * Wo es eine stabile Kennung gibt, steht die Kennung — Haustyp, Heizsystem,
 * Wärmepumpen-Art, Brennstoff. Die Wohnfläche steht in Quadratmetern, nicht als
 * Nummer ihrer Auswahlkarte: Sie ist auch frei eingebbar, eine Kartennummer
 * könnte sie gar nicht abbilden.
 *
 * ZWEI ANGABEN BLEIBEN EINE LISTENNUMMER — Dämmzustand und Haushaltsgröße. Die
 * Listen dahinter tragen keine Kennungen, und ihnen welche zu geben hieße, eine
 * von fünf Rechnern geteilte Datei anzufassen, um eine Adresse zu bauen. Der
 * Empfehlungs-Flow macht es seit jeher genauso. Der Preis ist benannt: Kommt
 * eine Dämmstufe in der Mitte dazu, zeigen alte Links auf die Nachbarstufe. Wer
 * die Listen umsortiert, macht damit geteilte Links falsch — das ist der
 * eigentliche Grund, es hier aufzuschreiben.
 */
export interface WpZustand {
  situation: "bestand" | "neubau";
  wohnflaeche: number;
  haustyp: string;
  daemmung: number;
  personen: number;
  heizsystem: "fbh" | "hk_neu" | "hk_alt";
  wpType: "lwwp" | "swwp";
  brennstoff: WpFuelId;
  heizkoerperTausch: boolean;
  szenario: string;
  weg: string;
  // Förderung
  selbstnutzer: boolean;
  altheizung: WpAltheizung;
  einkommen: WpEinkommen;
  kindImHaushalt: boolean;
  euUrsprung: boolean;
  begStand: WpBegStand;
  foerderungAn: boolean;
  plz: string;
  // Photovoltaik
  pvStatus: "nein" | "geplant" | "vorhanden";
  pvKwp: number;
  pvSpeicher: number;
  // Von Hand gesetzte Werte — `null` heißt „aus der Rechnung", nicht „null".
  gaspreis: number | null;
  strompreis: number | null;
  jaz: number | null;
  investition: number | null;
  heizwaerme: number | null;
  heizlast: number | null;
  fossilInvest: number | null;
}

/**
 * Der Ausgangszustand des Rechners.
 *
 * Er steht hier und nicht nur in der Oberfläche, weil er zwei Aufgaben hat:
 * Er sagt, was ein Link WEGLASSEN darf, und er sagt, worauf ein Link ohne
 * Angabe zurückfällt. Zwei getrennte Fassungen davon würden auseinanderlaufen,
 * und das Ergebnis wäre ein Link, der beim Empfänger anders rechnet als beim
 * Absender — der eine Fehler, den ein Teilen-Link nicht machen darf.
 */
export const WP_STANDARD: WpZustand = {
  situation: "bestand",
  wohnflaeche: 140,
  haustyp: "frei",
  daemmung: 1,
  personen: 2,
  heizsystem: "fbh",
  wpType: "lwwp",
  brennstoff: "gas_neu",
  heizkoerperTausch: false,
  szenario: "gruengas",
  weg: "ist",
  selbstnutzer: true,
  altheizung: "gas_alt",
  einkommen: "none",
  kindImHaushalt: false,
  euUrsprung: false,
  begStand: "jetzt",
  foerderungAn: true,
  plz: "",
  pvStatus: "nein",
  pvKwp: 10,
  pvSpeicher: 10,
  gaspreis: null,
  strompreis: null,
  jaz: null,
  investition: null,
  heizwaerme: null,
  heizlast: null,
  fossilInvest: null,
};

/**
 * Kurznamen der Parameter.
 *
 * Kurz, weil der Link lesbar bleiben soll — aber NICHT einbuchstabig: `hl` und
 * `hz` sind noch zu unterscheiden, `h` und `h2` wären es nicht. Diese Namen
 * sind ab dem ersten geteilten Link öffentlich und dürfen sich nicht mehr
 * ändern; wer eine Angabe umbenennt, macht jeden Link ungültig, der sie trägt.
 */
const FELD = {
  situation: "si",
  wohnflaeche: "fl",
  haustyp: "ht",
  daemmung: "da",
  personen: "pe",
  heizsystem: "hz",
  wpType: "wp",
  brennstoff: "br",
  heizkoerperTausch: "hk",
  szenario: "sc",
  weg: "wg",
  selbstnutzer: "sn",
  altheizung: "ah",
  einkommen: "ek",
  kindImHaushalt: "ki",
  euUrsprung: "eu",
  begStand: "bs",
  foerderungAn: "fo",
  plz: "plz",
  pvStatus: "pv",
  pvKwp: "pk",
  pvSpeicher: "ps",
  gaspreis: "gp",
  strompreis: "sp",
  jaz: "jz",
  investition: "iv",
  heizwaerme: "qg",
  heizlast: "hl",
  fossilInvest: "fi",
} as const satisfies Record<keyof WpZustand, string>;

/** Woran ein Aufruf erkennt, dass er einen geteilten Link vor sich hat. */
export function istGeteilterLink(params: URLSearchParams): boolean {
  return Object.values(FELD).some((f) => params.has(f));
}

/** Zustand → Parameter. Nur Abweichungen vom Ausgangszustand. */
export function wpZuParametern(z: WpZustand): URLSearchParams {
  const p = new URLSearchParams();
  const setze = (feld: string, wert: string) => p.set(feld, wert);

  for (const schluessel of Object.keys(FELD) as (keyof WpZustand)[]) {
    const wert = z[schluessel];
    const standard = WP_STANDARD[schluessel];
    if (wert === standard) continue;
    if (wert === null || wert === undefined || wert === "") continue;
    setze(FELD[schluessel], typeof wert === "boolean" ? (wert ? "1" : "0") : String(wert));
  }
  return p;
}

function zahl(roh: string | null, standard: number): number {
  if (roh === null) return standard;
  const n = Number(roh.replace(",", "."));
  return Number.isFinite(n) ? n : standard;
}

function zahlOderNull(roh: string | null): number | null {
  if (roh === null) return null;
  const n = Number(roh.replace(",", "."));
  return Number.isFinite(n) ? n : null;
}

function jaNein(roh: string | null, standard: boolean): boolean {
  if (roh === null) return standard;
  return roh === "1" || roh === "true";
}

function ausListe<T extends string>(roh: string | null, erlaubt: readonly T[], standard: T): T {
  return roh !== null && (erlaubt as readonly string[]).includes(roh) ? (roh as T) : standard;
}

/**
 * Parameter → Zustand. Alles Unbekannte fällt auf den Ausgangszustand zurück.
 *
 * Bewusst still statt streng: Ein Link, der in einem Messenger um ein Zeichen
 * gekürzt wurde, soll ein leicht anderes Ergebnis zeigen und keine Fehlerseite.
 * Die Werte selbst werden trotzdem geprüft — ein „Dämmung: quatsch" wird zum
 * Standard, nicht zu einer Rechnung mit undefinierten Zahlen.
 */
export function wpAusParametern(params: URLSearchParams): WpZustand {
  const g = (feld: string) => params.get(feld);
  return {
    situation: ausListe(g(FELD.situation), ["bestand", "neubau"] as const, WP_STANDARD.situation),
    // Die Grenzen sind dieselben wie im Frageweg — ein Link darf nicht
    // durchlassen, was die Eingabe ablehnt.
    wohnflaeche: Math.min(1000, Math.max(30, Math.round(zahl(g(FELD.wohnflaeche), WP_STANDARD.wohnflaeche)))),
    haustyp: g(FELD.haustyp) ?? WP_STANDARD.haustyp,
    // Die Obergrenze ist die längere der beiden Stufenlisten; welche gilt,
    // hängt an Bestand oder Neubau und entscheidet die Oberfläche.
    daemmung: Math.min(3, Math.max(0, Math.round(zahl(g(FELD.daemmung), WP_STANDARD.daemmung)))),
    personen: Math.min(3, Math.max(0, Math.round(zahl(g(FELD.personen), WP_STANDARD.personen)))),
    heizsystem: ausListe(g(FELD.heizsystem), ["fbh", "hk_neu", "hk_alt"] as const, WP_STANDARD.heizsystem),
    wpType: ausListe(g(FELD.wpType), ["lwwp", "swwp"] as const, WP_STANDARD.wpType),
    brennstoff: g(FELD.brennstoff) ?? WP_STANDARD.brennstoff,
    heizkoerperTausch: jaNein(g(FELD.heizkoerperTausch), WP_STANDARD.heizkoerperTausch),
    szenario: g(FELD.szenario) ?? WP_STANDARD.szenario,
    weg: g(FELD.weg) ?? WP_STANDARD.weg,
    selbstnutzer: jaNein(g(FELD.selbstnutzer), WP_STANDARD.selbstnutzer),
    altheizung: ausListe(g(FELD.altheizung), ["oel_kohle", "gas_alt", "gas_neu", "andere"] as const, WP_STANDARD.altheizung),
    einkommen: ausListe(g(FELD.einkommen), ["none", "bis50", "bis40", "bis30"] as const, WP_STANDARD.einkommen),
    kindImHaushalt: jaNein(g(FELD.kindImHaushalt), WP_STANDARD.kindImHaushalt),
    euUrsprung: jaNein(g(FELD.euUrsprung), WP_STANDARD.euUrsprung),
    begStand: ausListe(g(FELD.begStand), ["jetzt", "naechste"] as const, WP_STANDARD.begStand),
    foerderungAn: jaNein(g(FELD.foerderungAn), WP_STANDARD.foerderungAn),
    // Nur fünf Ziffern — sonst landet der Inhalt eines fremden Links
    // ungeprüft in einer Abfrage.
    plz: /^\d{5}$/.test(g(FELD.plz) ?? "") ? g(FELD.plz)! : WP_STANDARD.plz,
    pvStatus: ausListe(g(FELD.pvStatus), ["nein", "geplant", "vorhanden"] as const, WP_STANDARD.pvStatus),
    pvKwp: zahl(g(FELD.pvKwp), WP_STANDARD.pvKwp),
    pvSpeicher: zahl(g(FELD.pvSpeicher), WP_STANDARD.pvSpeicher),
    gaspreis: zahlOderNull(g(FELD.gaspreis)),
    strompreis: zahlOderNull(g(FELD.strompreis)),
    jaz: zahlOderNull(g(FELD.jaz)),
    investition: zahlOderNull(g(FELD.investition)),
    heizwaerme: zahlOderNull(g(FELD.heizwaerme)),
    heizlast: zahlOderNull(g(FELD.heizlast)),
    fossilInvest: zahlOderNull(g(FELD.fossilInvest)),
  };
}
