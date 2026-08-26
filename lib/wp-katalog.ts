// ─── Wärmepumpen-Katalog: Geräte aus dem Händler-Datenstrom ───────────────────
//
// Quelle ist der Awin-Produktdatenstrom von Heizungsdiscount24 (Feed 110780,
// rund 56.000 Artikel, täglich aktualisiert). Dieses Modul macht daraus eine
// Liste von Geräten, denen eine HEIZLEISTUNG zugeordnet ist — ohne die ist ein
// Gerät für uns wertlos, weil der Rechner nur über die Heizlast auswählen kann.
//
// Die zentrale Schwierigkeit, gemessen am 25.08.2026 über alle 2.222 Artikel
// der Händler-Kategorie „Wärmepumpen":
//
//   Nur 54 % tragen die Leistung ausgeschrieben im Produktnamen — und diese 54 %
//   sind NICHT zufällig verteilt, sondern hängen an der Marke: Carrier 100 %,
//   Stiebel Eltron 96 %, Remko 94 %, aber Buderus 25 %, Vaillant 17 %, Wolf 4 %.
//   Wer einfach nimmt, was auswertbar ist, baut eine Empfehlungsliste, die
//   Remko und Stiebel Eltron bevorzugt und Vaillant praktisch nie zeigt — nicht
//   aus einem sachlichen Grund, sondern weil der Händler deren Namen anders
//   schreibt. Das sieht man dem Ergebnis nicht an, und genau das macht es
//   gefährlich.
//
// Deshalb die Typenschlüssel unten. Jeder ist an den Geräten DERSELBEN Marke
// geeicht, die ihre Leistung ausgeschrieben tragen (siehe TYPENSCHLUESSEL).
//
// Zwei Sackgassen, beide gemessen und verworfen — nicht erneut versuchen:
//
//   1. Das Feld `specifications` klingt richtig und ist bei allen 2.222 Artikeln
//      gefüllt, enthält aber ausschließlich „Hersteller: X".
//   2. Die Beschreibungstexte nennen bei 87 % irgendeine Kilowattzahl. Das ist
//      eine Fata Morgana: 272 Vaillant-Geräte teilen sich 31 Textbausteine, 50
//      Wolf-Geräte nur 5. Die Zahlen gehören zum Serientext der Baureihe, nicht
//      zum einzelnen Gerät. Ein erster Messlauf hat daraus „88 % auswertbar"
//      gemacht — gezählt wurde, wo „kW" vorkommt, statt zu prüfen, ob es das
//      Gerät meint.

/**
 * Name der Ablage-Tabelle. Steht hier und nicht im Datenbank-Modul, weil das
 * `server-only` lädt — ein Auffrisch-Lauf aus der Kommandozeile käme damit gar
 * nicht erst zum Start.
 */
export const WP_KATALOG_TABELLE = "wp_geraete";

/** Ein Gerät aus dem Händler-Datenstrom, mit zugeordneter Heizleistung. */
export interface WpGeraet {
  id: string;
  name: string;
  marke: string;
  /** Heizleistung in kW. */
  leistungKw: number;
  /**
   * Woher die Leistung stammt. `ausgeschrieben` heißt: der Händler nennt sie im
   * Produktnamen. `typenschluessel` heißt: aus der Typenbezeichnung abgeleitet,
   * auf ganze kW gerundet — dann ist sie ein Auswahlkriterium, aber KEINE
   * Angabe, die wir dem Nutzer als Zahl hinschreiben dürfen (siehe
   * `leistungAnzeigbar`).
   */
  herkunft: "ausgeschrieben" | "typenschluessel";
  bauart: WpBauart;
  preisEur: number;
  /** Affiliate-Link des Netzwerks — nie die Händler-Adresse direkt verlinken. */
  link: string;
  bildUrl: string | null;
  lieferbar: boolean;
  /** Höchste Vorlauftemperatur in °C, sofern der Händler sie nennt. */
  vorlaufMaxC: number | null;
  kaeltemittel: Kaeltemittel | null;
  aufbau: Aufbau | null;
  umfang: Umfang;
}

/**
 * Was man für den Preis wirklich bekommt.
 *
 * `paket` nennt Außen- UND Innenteil, meist mit Speicher — das ist die Anlage,
 * die ein Installateur anschließt. `geraet` ist die Wärmepumpe allein; bei
 * einem Monoblock ist das ein vollständiges Gerät, aber ohne Speicher und
 * Regelung noch keine Heizung.
 *
 * Der Unterschied ist kein Etikett, sondern rund 4.000 €: Ein Monoblock ab
 * 3.698 € und ein Paket derselben Größe ab 7.879 € stehen sonst nebeneinander,
 * als wäre das eine schlicht günstiger. Vorgabe des Betreibers vom 26.08.2026:
 * „die einzelnen wps machen ja wenig sinn".
 */
export type Umfang = "paket" | "geraet";

/**
 * Nur die beiden Kältemittel, die im Bestand wirklich vorkommen (gemessen:
 * 1.068 Artikel R290, 205 R32, kein einziger R410A). Kein Artikel nennt beide —
 * das Kältemittel ist eine Eigenschaft der Baureihe, deshalb darf hier auch der
 * Serientext der Beschreibung als Quelle dienen. Bei der LEISTUNG ist genau
 * das verboten, weil sie sich innerhalb einer Baureihe unterscheidet.
 */
export type Kaeltemittel = "r290" | "r32";
export type Aufbau = "monoblock" | "split";

export type WpBauart = "luft-wasser" | "sole-wasser" | "unbekannt";

// ─── Darstellung ──────────────────────────────────────────────────────────────
//
// Zahl und Einheit getrennt abrufbar, wie im Projekt üblich: In einer Kachel
// trägt der Zahlenwert die Fläche, die Einheit steht kleiner daneben — und
// beide dürfen zwischen sich nicht umbrechen.

export interface Messwert {
  value: string;
  unit: string;
}

/** Heizleistung eines Geräts. Peak-Einheiten gibt es hier nicht — kW, nicht kWp. */
export function geraetLeistungTeile(kw: number): Messwert {
  return { value: kw.toLocaleString("de-DE", { maximumFractionDigits: 1 }), unit: "kW" };
}

/** Gerätepreis, immer auf ganze Euro. Cent neben einem Kaufknopf sind Lärm. */
export function geraetPreisTeile(euro: number): Messwert {
  return { value: Math.round(euro).toLocaleString("de-DE"), unit: "€" };
}

/**
 * Nur eine ausgeschriebene Leistung darf als Zahl neben dem Gerät stehen.
 * Eine aus der Typennummer abgeleitete ist auf ganze kW gerundet und weicht
 * gemessen bis zu 0,7 kW ab (Vaillant VWL 75/7.1 hat 6,37 kW, die Regel sagt 7).
 * Sie taugt zum Filtern — eine Wärmepumpe wird nicht auf 0,5 kW genau ausgelegt
 * —, aber als angezeigte Zahl wäre sie erfunden.
 */
export function leistungAnzeigbar(g: WpGeraet): boolean {
  return g.herkunft === "ausgeschrieben";
}

// ─── Leistung aus dem Produktnamen ────────────────────────────────────────────

/**
 * Kilowattangabe, die der Händler ausgeschrieben in den Namen setzt.
 *
 * Der Ausschluss ist der eigentliche Inhalt dieser Funktion: Nicht jede
 * Kilowattzahl im Namen ist die Heizleistung. Gemessen sind es 2 von 1.189
 * Fällen — beide Wolf-Monoblocks, deren Name die Leistung des ELEKTRISCHEN
 * HEIZSTABS nennt („E-Heizstab 9 kW"). Ein 16-kW-Gerät käme so als 9-kW-Gerät
 * in die Auswahl und würde einem zu großen Haus empfohlen.
 */
const KW_IM_NAMEN = /(\d+(?:[.,]\d+)?)\s*kW/i;
const FREMDE_LEISTUNG =
  /(heizstab|e-?heiz|elektro|zusatzheiz|durchlauferhitzer|kühlleistung|kuehlleistung)[^,;]{0,40}\d+(?:[.,]\d+)?\s*kW/i;

export function leistungAusName(name: string): number | null {
  if (FREMDE_LEISTUNG.test(name)) return null;
  const m = KW_IM_NAMEN.exec(name);
  if (!m) return null;
  const kw = Number.parseFloat(m[1].replace(",", "."));
  return Number.isFinite(kw) && kw > 0 ? kw : null;
}

// ─── Leistung aus der Typenbezeichnung ────────────────────────────────────────

interface Typenschluessel {
  marke: string;
  muster: RegExp;
  /** Typennummer → Heizleistung in kW. */
  leistung: (nummer: number) => number;
  /** Wie die Regel geprüft wurde. Ohne Beleg kein Schlüssel. */
  geeicht: string;
}

/**
 * Übersetzt Typenbezeichnungen in eine Heizleistung.
 *
 * Aufnahmebedingung: Die Regel muss gegen die Geräte DERSELBEN Marke geprüft
 * sein, die ihre Leistung ausgeschrieben tragen. Diese Geräte sind der
 * Prüfstein, und die Prüfung läuft als Test gegen den echten Datenstrom
 * (`lib/__tests__/wp-katalog.test.ts`) — nicht gegen eine abgeschriebene
 * Erwartung, die den Fehler mit sich selbst vergleichen würde.
 *
 * Bewusst NICHT aufgenommen:
 *
 *   Bosch/Junkers („Compress CS7000iAW 13"). Die Zahl ist eine Baugröße, keine
 *   Leistung: CS7000iAW 13 hat 11 kW, CS7000iAW 17 hat 12,5 kW. Ein linearer
 *   Zusammenhang existiert nicht, und ohne Herstellertabelle bliebe es Raten.
 *   Bosch ist mit 42 % ausgeschriebener Angaben ohnehin brauchbar abgedeckt.
 *
 *   Wolf („CHA-16/20"). Der Verdacht liegt nahe, dass 16 die Leistung ist, aber
 *   die beiden einzigen Wolf-Geräte mit ausgeschriebener Zahl nennen ihren
 *   Heizstab — es gibt in diesem Datenstrom also KEINEN Prüfstein. Eine
 *   ungeprüfte Regel auf 48 Geräte loszulassen ist schlechter, als die Marke
 *   wegzulassen.
 */
export const TYPENSCHLUESSEL: Typenschluessel[] = [
  {
    marke: "VAILLANT",
    // aroTHERM: VWL <Nummer>/<Baureihe>, z. B. VWL 125/8.1
    muster: /\bVWL\s*(\d{2,3})\s*\//i,
    // Die Nummer ist die Leistung mal zehn, aufgerundet auf die nächste 5:
    // VWL 35 = 3 kW, 55 = 5, 75 = 7, 105 = 10, 125 = 12, 205 = 20. Abrunden
    // trifft alle sechs belegten Fälle der Baureihen /8.1 und /8.2 exakt.
    leistung: (nummer) => Math.floor(nummer / 10),
    geeicht:
      "25.08.2026 gegen 41 Vaillant-Geräte mit ausgeschriebener Leistung. " +
      "Exakt für /8.1 und /8.2 (6 von 6). Für /7.1 (aroTHERM pro) liegt die " +
      "Regel bis 0,63 kW zu hoch (VWL 75/7.1 = 6,37 kW) — innerhalb der " +
      "Rundungstoleranz, deshalb nur zum Filtern, nie als angezeigte Zahl.",
  },
  {
    marke: "BUDERUS",
    // Logatherm: WSW186i-8, WPW186i-12 — Zahl nach dem Bindestrich
    muster: /\bW[SP]W\d+i-(\d{1,2})\b/i,
    leistung: (nummer) => nummer,
    geeicht:
      "25.08.2026 gegen 11 Buderus-Geräte mit ausgeschriebener Leistung, " +
      "11 von 11 innerhalb 0,5 kW (WSW186i-8 = 7,76 kW).",
  },
];

export function leistungAusTyp(name: string, marke: string): number | null {
  const regel = TYPENSCHLUESSEL.find((t) => t.marke === marke.toUpperCase());
  if (!regel) return null;
  const m = regel.muster.exec(name);
  if (!m) return null;
  const kw = regel.leistung(Number.parseInt(m[1], 10));
  return Number.isFinite(kw) && kw > 0 ? kw : null;
}

// ─── Was ein Gerät ist und was Zubehör ────────────────────────────────────────

/**
 * Die Händler-Kategorie „Wärmepumpen" enthält auch Montagesets, Fühler und
 * Ersatzteile; ohne diesen Filter stünde ein Wandhalter als Empfehlung neben
 * einer Wärmepumpe.
 *
 * Die Liste nennt nur Wörter, die ein Zubehör-PRODUKT bezeichnen — nie solche,
 * die auch den Lieferumfang eines Geräts beschreiben können. Die erste Fassung
 * verwechselte beides und verwarf reihenweise vollständige Geräte: „mit 300 L
 * Speicher", „inkl. Staubfilter", „zur Wandmontage", „mit Witterungsregelung"
 * — und „mit Ventilator-Abtauautomatik", weil „Ventil" in „Ventilator" steckt.
 * Getroffen hat es besonders die Erdwärme-Pakete, die ihren Speicher im Namen
 * führen, also gerade die vollständigsten Angebote im Katalog.
 */
const ZUBEHOER =
  /(anschlussset|montageset|montagerahmen|wandhalter|wandkonsole|bodenkonsole|fühlerset|fuehlerset|ersatzteil|kabelsatz|pumpengruppe|schlauchset|dämmschale|daemmschale|zubehör|zubehoer|raumthermostat|bedieneinheit)/i;

/**
 * Ein halbes Gerät ist kein Gerät — rund ein Fünftel der Artikel sind Innen-
 * oder Außeneinheiten und Hydraulikstationen, die einzeln verkauft werden.
 *
 * Das ist der Filter, an dem am meisten hängt: Ohne ihn stand als günstigstes
 * Angebot für eine 8-kW-Heizlast eine Buderus-Inneneinheit für 1.855 € — wer
 * die kauft, hat keine Wärmepumpe, sondern die Hälfte davon, und merkt es erst,
 * wenn der Installateur davorsteht. Ein Preisfilter allein trennt das nicht:
 * Der Median der Teile liegt bei 5.039 €, es gibt Teile bis 24.749 €.
 */
const TEILGERAET =
  /(innen(einheit|gerät|geraet|teil|station)|hydraulik|hydro(box|unit)|hydraulische station|wandgerät|unitower)/i;

/**
 * „Außeneinheit" ist NUR bei Split-Geräten ein Teil.
 *
 * Bei einem Monoblock sitzt der ganze Kältekreis draußen — die Außeneinheit IST
 * das Gerät, und ins Haus geht nur Wasser. Das Wort pauschal zu verbieten warf
 * einen vollständigen 20-kW-Monoblock aus dem Katalog, der als eigener
 * Prüfstein hinterlegt war. Gefunden von einer Gegenprüfung am 25.08.2026.
 */
const AUSSENEINHEIT = /(außen(einheit|gerät|geraet|teil)|aussen(einheit|gerät|geraet))/i;

/**
 * Ein Gerät kommt nur in den Katalog, wenn es sich als VOLLSTÄNDIG ausweist.
 *
 * Die Umkehrung ist Absicht. Eine Liste dessen, was kein Gerät ist, wird nie
 * fertig — gemessen sind drei Runden Nachbessern nötig gewesen, und jede fand
 * eine neue Bauform (erst Inneneinheiten, dann der Vaillant uniTOWER, dann eine
 * einzelne Split-Außenstation). Was die Liste übersieht, landet als Empfehlung
 * beim Nutzer. Andersherum landet es bloß nicht im Katalog, und das kostet
 * nichts: Für jede Heizlast bleiben zwischen 19 und 132 Geräte übrig.
 *
 * Die vier Nachweise, alle am Datenbestand vom 25.08.2026 abgelesen:
 *   - „Monoblock" ist per Bauart ein vollständiges Gerät,
 *   - ein Split-Set nennt Außen- UND Innenstation (Vaillant „AS … IS"),
 *   - „Set", „Paket", „Komplett" sagen es selbst,
 *   - Systempakete nennen ihren Umfang („inkl. Kompaktmodul", „CS768 MIT
 *     Luft/Wasser-Wärmepumpe …"). So verkauft Bosch, das sonst komplett
 *     herausfiele.
 */
const VOLLSTAENDIG = [
  /monobloc/i,
  /\bAS\b.{0,60}\bIS\b/i,
  // Ohne Wortgrenze im Wortinneren: „Komplettset" und „Wärmepumpenpaket" sind
  // deutsche Komposita, an denen `\b(set|paket)\b` scheitert — dieselbe
  // Schreibweise, anderes Ergebnis, je nach Laune des Händlers.
  /(set|paket|komplett)/i,
  /\binkl\.?\s/i,
  /\bmit\s+(luft|sole)[/\s-]?wasser-?wärmepumpe/i,
  // Sole/Wasser-Geräte stehen komplett im Haus; sie haben gar kein Merkmal,
  // mit dem sie sich als „vollständig" ausweisen könnten. Ohne diese Zeile
  // erreichte KEIN einziges Erdwärme-Gerät den Katalog, und jeder Nutzer mit
  // Erdwärme bekäme eine leere Liste — von beiden Prüfern unabhängig gefunden.
  /(sole|erdwärme|erdwaerme)[/\s-]?(wasser)?-?wärmepumpe/i,
];

/**
 * Brauchwasser-Wärmepumpen erwärmen das Trinkwasser, nicht das Haus. Sie tragen
 * eine Leistungsangabe (typisch 1,5 kW) und sähen damit wie ein sehr günstiges
 * Angebot für ein kleines Haus aus — sie können es aber gar nicht beheizen.
 *
 * Gas-Hybride fliegen aus einem anderen Grund raus: Sie heizen zwar das Haus,
 * aber mit Gaskessel als zweiter Wärmequelle. Unser Rechner stellt Wärmepumpe
 * GEGEN fossile Heizung, er kennt die Mischform nicht — ein Hybrid neben einer
 * Ersparnis anzuzeigen, die für ein reines Wärmepumpensystem gerechnet wurde,
 * wäre eine Zahl, die zum Gerät daneben nicht passt.
 */
const FALSCHER_ZWECK =
  /(brauchwasser|trinkwasser|warmwasser-?wärmepumpe|warmwasser-?waermepumpe|hybrid|gas-?brennwert)/i;

/** Unter diesem Preis ist es in dieser Kategorie kein Gerät (Median 11.198 €). */
const MINDESTPREIS_EUR = 1500;

export interface FeedZeile {
  aw_product_id: string;
  product_name: string;
  brand_name: string;
  search_price: string;
  aw_deep_link: string;
  merchant_image_url: string;
  in_stock: string;
  merchant_product_category_path: string;
  /** Serientext der Baureihe — trägt Baureihen-Merkmale, NIE die Leistung. */
  description?: string;
}

// ─── Merkmale, die eine Empfehlung begründen ──────────────────────────────────

/**
 * Höchste Vorlauftemperatur. Das ist das Merkmal, an dem eine Empfehlung im
 * Altbau hängt: Alte Heizkörper brauchen 55 °C und mehr, und ein Gerät, das
 * bei 35 °C endet, kann das Haus nicht warm bekommen — es sähe im Vergleich
 * nur billiger aus.
 *
 * Das Muster verlangt das Wort selbst. Eine lockere Suche nach „irgendeine Zahl
 * vor °C" liefert Außentemperaturen und Kühlgrenzen mit: sie fand bei LG „25 °C“
 * und hätte ein taugliches Gerät als untauglich aussortiert.
 */
const VORLAUF =
  /vorlauftemperatur(?:en)?\s*(?:von\s*)?(?:bis\s*(?:zu\s*)?|von\s*bis\s*zu\s*|max\.?\s*)?(\d{2})\s*°?\s*C/i;

/** Alle Nennungen im Text — die Obergrenze ist die höchste davon. */
const VORLAUF_ALLE = new RegExp(VORLAUF.source, "gi");

/** Unter 35 °C heizt keine Wasser-Wärmepumpe — dann hat das Muster danebengegriffen. */
const VORLAUF_MIN_PLAUSIBEL = 35;
const VORLAUF_MAX_PLAUSIBEL = 80;

/**
 * Höchste genannte Vorlauftemperatur.
 *
 * Der HÖCHSTE Treffer, nicht der erste: Händlertexte nennen die Temperatur oft
 * mehrfach, und die erste Nennung ist meist der Prüfpunkt des Energielabels
 * („Energieeffizienzklasse A+++ bei Vorlauftemperatur 35 °C … Vorlauftemperatur
 * bis 75 °C möglich"). Wer den ersten Treffer nimmt, macht aus einem 75-°C-Gerät
 * ein 35-°C-Gerät und schließt es im Altbau aus.
 *
 * Ein erster Versuch verwarf stattdessen die ganze Angabe, sobald ein
 * Label-Wort in der Nähe stand. Gemessen kostete das 24 Geräten ihre Angabe,
 * um 7 vor einem zu niedrigen Wert zu bewahren — netto schlechter als der
 * Fehler selbst. Das Maximum zu nehmen kostet nichts und heilt beide Fälle.
 */
export function vorlaufAus(text: string): number | null {
  let hoechster: number | null = null;
  for (const m of text.matchAll(VORLAUF_ALLE)) {
    const c = Number.parseInt(m[1], 10);
    if (c < VORLAUF_MIN_PLAUSIBEL || c > VORLAUF_MAX_PLAUSIBEL) continue;
    if (hoechster === null || c > hoechster) hoechster = c;
  }
  return hoechster;
}

export function kaeltemittelAus(text: string): Kaeltemittel | null {
  const r290 = /\bR-?290\b/i.test(text);
  const r32 = /\bR-?32\b/i.test(text);
  if (r290 && r32) return null; // widersprüchlich → keine Aussage
  if (r290) return "r290";
  if (r32) return "r32";
  return null;
}

export function aufbauAus(text: string): Aufbau | null {
  if (/monobloc/i.test(text)) return "monoblock";
  if (/\bsplit\b/i.test(text)) return "split";
  return null;
}

/**
 * Wärmequelle des Geräts.
 *
 * „unbekannt" ist ein stiller Ausschluss — `empfehlungenFuer` filtert strikt auf
 * die gewählte Quelle, ein Gerät ohne Zuordnung wird also NIE empfohlen. Vor der
 * Ergänzung um Bauform-Wörter traf das 301 von 580 Geräten, mehr als beide
 * Kategorien zusammen; „Viessmann Vitocal 250-A Monoblock 10,6 kW" trägt weder
 * „Luft" noch „Sole" im Namen und fiel deshalb durch.
 *
 * Monoblock und Split sind Bauformen, die es nur bei Luftwärmepumpen gibt —
 * eine Sole-Wärmepumpe steht komplett im Haus und hat keine Außeneinheit, von
 * der sie getrennt sein könnte. Die Sole-Prüfung läuft deshalb zuerst.
 */
/**
 * Nennt der Artikel Außen- UND Innenteil?
 *
 * Ein Paket heißt „Set", „Paket" oder „… mit Luft/Wasser-Wärmepumpe" UND nennt
 * zusätzlich das, was ins Haus kommt: Speicher, Puffer, Tower, Hydraulikstation
 * oder eine Innengeräte-Typennummer. Beides muss zusammenkommen — „Set" allein
 * trägt auch ein Anschlussset, ein Speicher allein ist die Innenhälfte.
 *
 * Gemessen am Bestand vom 25.08.2026: 115 Artikel erfüllen beides, 45 davon
 * mit ableitbarer Leistung — zwischen 5 und 22 je Größenklasse. Genug für eine
 * Empfehlung, und der Preisunterschied ist der Punkt: dieselbe Anlagengröße
 * kostet als Monoblock allein 3.698 €, als Paket 7.879 €.
 */
const PAKET_WORT = /(\bPaket\b|\bSet\b|\bKomplett|\bmit\s+(luft|sole)[/\s-]?wasser-?wärmepumpe)/i;
const INNENTEIL =
  /(speicher|puffer|tower|hydraulikstation|hydrobox|hydrounit|\b\d{3}\s?l\b|\bWH\s?\d{3}|\bBST\b|\bBH\d)/i;

export function umfangAus(name: string): Umfang {
  return PAKET_WORT.test(name) && INNENTEIL.test(name) ? "paket" : "geraet";
}

export function bauartAus(name: string, pfad: string): WpBauart {
  const t = `${name} ${pfad}`.toLowerCase();
  if (/sole|erdw|erdreich|geotherm/.test(t)) return "sole-wasser";
  if (/luft/.test(t)) return "luft-wasser";
  if (/monobloc|\bsplit\b/.test(t)) return "luft-wasser";
  return "unbekannt";
}

/** Wandelt eine Feed-Zeile in ein Gerät um — oder verwirft sie mit Grund. */
export function geraetAusZeile(z: FeedZeile): WpGeraet | null {
  const pfad = z.merchant_product_category_path || "";
  if (!pfad.startsWith("Wärmepumpen")) return null;

  const name = z.product_name || "";
  if (FALSCHER_ZWECK.test(name)) return null;

  // Reihenfolge: erst der Vollständigkeitsnachweis, dann die Ausschlusswörter.
  // Andersherum sticht ein einzelnes Wort jeden Nachweis — und genau das tat es:
  // Von 17 eigenen Prüfsteinen erreichten nur 5 den Katalog, darunter kein
  // einziges Erdwärme-Gerät. Vier vollständige Buderus-Pakete scheiterten an
  // „180L Speicher" im Namen, also gerade daran, dass sie vollständig SIND.
  const vollstaendig = VOLLSTAENDIG.some((m) => m.test(name));
  if (!vollstaendig) return null;

  // Ein Gerät, das sich als vollständig ausweist, darf Zubehör ENTHALTEN.
  // Ausschließen dürfen nur noch Wörter, die eine echte Teilkomponente
  // benennen — und „Außeneinheit" auch das nur bei Split-Bauweise.
  // Ein PAKET darf Teilkomponenten nennen — es besteht ja aus ihnen. Die
  // Sperren unten treffen nur, was sich NICHT als Paket ausweist.
  //
  // Ohne diese Ausnahme fielen fast alle Komplettangebote heraus: „Vaillant Set
  // aroTHERM VWL 55/8.2 AS S2 mit uniTOWER Split plus VWL 58/8.2 IS" ist genau
  // das Paket, das wir zeigen wollen, und scheiterte am Wort „uniTOWER" in der
  // Teilgerät-Liste. Gemessen kamen so von 115 Paketen nur 17 durch. Dieselbe
  // Verwechslung wie beim Speicher zwei Filter weiter oben: „ist ein Teil"
  // gegen „enthält ein Teil".
  const istPaket = umfangAus(name) === "paket";
  if (!istPaket) {
    if (TEILGERAET.test(name)) return null;
    if (AUSSENEINHEIT.test(name) && /\bsplit\b/i.test(name)) return null;
    if (ZUBEHOER.test(name)) return null;
  }

  const preis = Number.parseFloat(z.search_price);
  if (!Number.isFinite(preis) || preis < MINDESTPREIS_EUR) return null;

  const marke = (z.brand_name || "").toUpperCase();
  const ausgeschrieben = leistungAusName(name);
  const leistungKw = ausgeschrieben ?? leistungAusTyp(name, marke);
  if (leistungKw === null) return null;

  // Merkmale dürfen aus dem Serientext kommen — sie gelten für die Baureihe.
  const merkmalstext = `${name} ${z.description ?? ""}`;

  return {
    id: z.aw_product_id,
    name,
    marke,
    leistungKw,
    herkunft: ausgeschrieben !== null ? "ausgeschrieben" : "typenschluessel",
    bauart: bauartAus(name, pfad),
    preisEur: preis,
    link: z.aw_deep_link,
    bildUrl: z.merchant_image_url || null,
    lieferbar: z.in_stock === "1",
    vorlaufMaxC: vorlaufAus(merkmalstext),
    kaeltemittel: kaeltemittelAus(merkmalstext),
    aufbau: aufbauAus(merkmalstext),
    // Nur aus dem NAMEN, nicht aus dem Serientext: Der Umfang ist eine Aussage
    // über diesen einen Artikel, nicht über die Baureihe.
    umfang: istPaket ? "paket" : "geraet",
  };
}
