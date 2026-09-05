import { ANZAHL_SCHWELLE } from "./kfw-report-parse";
import { DATA_SOURCES } from "./data-sources";

/**
 * Die Zahlen des KfW-Förderreports, wie das Produkt sie sieht.
 *
 * Der Bericht sagt, wie viele Haushalte die Bundes-Heizungsförderung wirklich
 * bekommen haben und welche Boni dabei gezogen haben. Das ist die Antwort auf
 * die Frage, mit der jemand auf dem Wärmepumpen-Rechner landet — „bekomme ich
 * das auch?" —, und auf dem Förder-Ratgeber der Unterschied zwischen einem
 * Merkblatt und einer nützlichen Seite.
 *
 * ────────────────────────────────────────────────────────────────────────────
 * DREI GRENZEN, DIE HIER UND NICHT IN DER OBERFLÄCHE GEZOGEN WERDEN
 * ────────────────────────────────────────────────────────────────────────────
 *
 * 1. KEINE ZELLE UNTER ZEHN — auch keine errechnete. Die KfW unterdrückt
 *    Anzahlen unter zehn aus Datenschutzgründen. Wer mehrere Jahrgänge und
 *    Aggregationsebenen vollständig übernimmt, kann eine unterdrückte Zelle
 *    über die Differenz zur Summe zurückrechnen — und in einem kleinen
 *    Landkreis ist „eine Zusage" faktisch ein identifizierbarer Haushalt. Das
 *    Risiko entsteht erst durch die Vollübernahme, und deshalb liegt die
 *    Schranke hier, im Lesepfad, und nicht als Merksatz in einer Komponente:
 *    Was hier nicht herauskommt, kann keine Oberfläche zeigen.
 *
 * 2. KEIN NENNER IN DER FLÄCHE. Unsere eigene Konvention verlangt, dass jede
 *    Pro-Kopf-Zahl ihren Nenner sichtbar trägt — genau das macht sie umkehrbar:
 *    „14,2 je 1.000 Einwohner, Bezugsgröße 57.000" IST die Rohzahl mit einem
 *    Zwischenschritt. Für diese Quelle gilt deshalb: Nenner im Einzelfall ja,
 *    in einer flächendeckenden Tabelle nein. Dieses Modul gibt zu einem Kreis
 *    keine Bezugsgröße heraus, und es gibt überhaupt keine Liste mehrerer
 *    Kreise heraus.
 *
 * 3. KEIN ROH-DOWNLOAD, KEINE OFFENE SCHNITTSTELLE. Die Erlaubnis der KfW
 *    trägt die Weitergabe zu Informationszwecken unter Quellenangabe — nicht
 *    die Weiterverbreitung des Bestands. Die Tabellen liegen deshalb hinter dem
 *    Dienstschlüssel (RLS ohne Policy), und dieses Modul liefert nur, was eine
 *    Seite anzeigt.
 *
 * Die Quellenzeile ist Auflage, nicht Höflichkeit: {@link kfwQuellenzeile}.
 */

/** Das eine Programm, um das es hier geht: die private Heizungsförderung. */
export const HEIZUNGSFOERDERUNG = "BEG WG - Heizungsförderung Priv. - Zuschuss";

/**
 * Verwendungszwecke dieses Programms, so wie der Bericht sie schreibt.
 *
 * Der Bericht ist eine Statistik und benutzt eigene Kurzformen. „Klimabonus"
 * ist im Regelwerk der Klimageschwindigkeits-Bonus (Nr. 8.4.4 der BEG-EM-
 * Richtlinie); die Oberfläche sagt das dazu, statt die beiden stillschweigend
 * gleichzusetzen.
 */
export const VWZ_BASIS = "Heizungsförderung";
export const VWZ_KLIMABONUS = "Heizungsförderung - Klimabonus";
export const VWZ_EINKOMMENSBONUS = "Heizungsförderung - Einkommensbonus";
export const VWZ_EFFIZIENZBONUS = "Heizungsförderung - Effizienzbonus";

export type Bonusanteil = {
  /** Wie die Oberfläche ihn nennt. */
  name: string;
  /** Geförderte Maßnahmen mit diesem Bonus. */
  massnahmen: number;
  /** Anteil an den Maßnahmen mit Basisförderung, 0–1. */
  anteil: number;
};

export type HeizungsfoerderungBund = {
  jahr: number;
  stichtagIso: string;
  /** Zusagen im Jahrgang. */
  zusagen: number;
  /** Bewilligtes Volumen in Mio. €. */
  volumenMio: number;
  /** Geförderte Maßnahmen mit Basisförderung — der Nenner der Bonusanteile. */
  basisMassnahmen: number;
  /** Durchschnittlicher Zuschuss je Zusage, €. */
  schnittJeZusage: number;
  /** Boni, die es HEUTE noch gibt — in der Reihenfolge ihrer Häufigkeit. */
  boni: Bonusanteil[];
  /** Der 2026 abgeschaffte Effizienzbonus, falls der Jahrgang ihn kennt. */
  effizienzbonus: Bonusanteil | null;
};

export type JahrgangZeile = { jahr: number; stichtag: string };
export type BundZeile = {
  programm: string;
  verwendungszweck: string;
  anzahl: number | null;
  volumen_mio: number;
};

export type HeizungsfoerderungKreis = {
  jahr: number;
  stichtagIso: string;
  /** Fünfstelliger Gebietsschlüssel. */
  regionId: string;
  /** Zusagen im Kreis — `null`, wenn die KfW die Zahl unterdrückt hat. */
  zusagen: number | null;
};

/**
 * Die Quellenzeile — im Wortlaut, in jeder Oberfläche, in jedem Bild, in jedem
 * Embed, unabhängig vom Marken-Schalter.
 *
 * Die Erlaubnis der KfW steht unter Quellenvorbehalt: Newsroom-Material darf
 * „unter Angabe der Quelle zu Informations-Zwecken an Dritte weitergereicht und
 * vervielfältigt werden". Eine Anzeige ohne Nennung verlässt genau den Boden,
 * auf dem wir stehen — deshalb ist das keine Fußnote, sondern die Bedingung.
 *
 * Der Zusatz „Eigene Berechnung" ist ebenfalls Pflicht und keine Kosmetik: Das
 * Änderungsverbot der KfW wird von ihrer Newsroom-Ausnahme nicht aufgehoben.
 * Die Kennzeichnung stellt klar, dass wir kein verändertes fremdes Werk zeigen,
 * sondern eine eigene Auswertung daraus.
 *
 * Der Stichtag gehört dazu und ist je Jahrgang verschieden — eine Reihe über
 * gemischte Stichtage wäre unabhängig vom Recht schlicht falsch.
 */
export function kfwQuellenzeile(jahr: number, stichtagIso: string): string {
  const [j, m, t] = stichtagIso.split("-");
  const q = DATA_SOURCES.kfwFoerderreport;
  return `Quelle: KfW-Förderreport ${jahr}, Stichtag ${Number(t)}.${Number(m)}.${j}, ${q.name}. ${q.note}.`;
}

/**
 * Anzahl, die eine Oberfläche sehen darf.
 *
 * Doppelt gesichert: Der Einlesevorgang legt eine unterdrückte Zelle schon als
 * `null` ab. Hier steht die Schranke ein zweites Mal, weil sie die teuerste des
 * Projekts ist und weil eine Zahl aus der Datenbank nicht beweist, WIE sie
 * dorthin kam. Fällt eine Zelle unter die Schwelle, wird sie behandelt, als
 * hätte die KfW sie selbst unterdrückt.
 */
export function sichtbareAnzahl(anzahl: number | null | undefined): number | null {
  if (anzahl === null || anzahl === undefined) return null;
  return anzahl < ANZAHL_SCHWELLE ? null : anzahl;
}

/**
 * Die Ableitung aus den Rohzeilen — getrennt vom Datenbankzugriff, damit sie
 * ohne Datenbank prüfbar ist.
 *
 * ZWEI NENNER, DIE MAN NICHT VERWECHSELN DARF:
 *
 *   • Der DURCHSCHNITTLICHE ZUSCHUSS rechnet Volumen ÷ ZUSAGEN. Beide stehen
 *     in derselben Tabelle des Berichts und meinen dasselbe.
 *   • Die BONUSANTEILE rechnen gegen die MASSNAHMEN mit Basisförderung. Auch
 *     diese beiden stehen in derselben Tabelle und tragen dieselbe Einheit
 *     („Anzahl Maßnahmen").
 *
 * Über Kreuz gerechnet käme Unsinn heraus: Zusagen und Maßnahmen sind im
 * Bericht verschiedene Größen, und ihre Zahlen gehen auseinander (2025:
 * 375.475 gegen 314.049). Der Bericht erklärt selbst, woher der Unterschied
 * mindestens teilweise kommt — bei Wohneigentumsgemeinschaften und
 * Mehrfamilienhäusern zählt eine Zusage auch Zusatzanträge. Eine vollständige
 * Erklärung gibt er nicht, und wir behaupten deshalb keine.
 */
export function ausZeilen(jg: JahrgangZeile, zeilen: BundZeile[]): HeizungsfoerderungBund | null {
  const zelle = (vwz: string) => zeilen.find((z) => z.verwendungszweck === vwz);
  const programm = zelle("");
  const basis = zelle(VWZ_BASIS);
  if (!programm?.anzahl || !basis?.anzahl) return null;

  const anteil = (vwz: string, name: string): Bonusanteil | null => {
    const z = zelle(vwz);
    const m = sichtbareAnzahl(z?.anzahl);
    if (m === null) return null;
    return { name, massnahmen: m, anteil: m / basis.anzahl! };
  };

  const boni = [
    anteil(VWZ_KLIMABONUS, "Klimageschwindigkeits-Bonus"),
    anteil(VWZ_EINKOMMENSBONUS, "Einkommens-Bonus"),
  ].filter((b): b is Bonusanteil => b !== null);
  boni.sort((a, b) => b.anteil - a.anteil);

  return {
    jahr: jg.jahr,
    stichtagIso: jg.stichtag,
    zusagen: programm.anzahl,
    volumenMio: programm.volumen_mio,
    basisMassnahmen: basis.anzahl,
    schnittJeZusage: Math.round((programm.volumen_mio * 1_000_000) / programm.anzahl),
    boni,
    effizienzbonus: anteil(VWZ_EFFIZIENZBONUS, "Effizienzbonus"),
  };
}


/**
 * Stand der KfW-Zahlen — für die „Stand:"-Zeile unter den Rechnern und für den
 * Prüfstand.
 *
 * WARUM ALS KONSTANTE UND NICHT AUS DER DATENBANK: `lib/stand.ts` löst den
 * Stand einer Seite ohne Datenbank auf, synchron. Ein Datum von dort holen zu
 * müssen würde jede Seite mit Stand-Zeile an einen Read hängen.
 *
 * Die Gefahr dabei ist der Auseinanderlauf — genau die Sorte Zahl, die still
 * falsch wird. Dagegen prüft der Einlese-Lauf: Legt er einen Jahrgang ab, dessen
 * Stichtag hier nicht steht, bricht er ab und verlangt die Änderung. Das
 * Gedächtnis liegt damit dort, wo die Abweichung entsteht.
 */
export const KFW_REPORT_STAND = {
  /**
   * Tag, an dem der Bericht eingelesen wurde — und an dem die Erlaubnis im
   * Impressum der KfW im Volltext nachgelesen wurde
   * (docs/quellen/kfw-foerderreport/kfw-impressum-nutzungsklausel.txt).
   */
  geprueftIso: "2026-08-26",
  /** Stichtag des jüngsten eingelesenen Jahrgangs. */
  wertIso: "2025-12-31",
} as const;
