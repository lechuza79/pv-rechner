// Rechnerische Wirkungs-Werte des Solar-Atlas: vermiedenes CO₂ und der Wert
// des erzeugten Solarstroms je Region.
//
// Beides sind MODELLWERTE, keine Messwerte — die Oberflächen sagen das dazu.
// Alle Faktoren kommen aus der geteilten Rechen-Basis, nichts wird hier neu
// geraten:
//   Ertrag      → lib/bundesland-ertrag.ts (PVGIS-Bundesland-Durchschnitt)
//   CO₂-Faktor  → gridCo2PerKwh (identisch in WP-/Klima-/Balkon-Config)
//   Strompreis  → DEFAULT_PRICES.electricityPrice (BNetzA)
//   Eigenverbrauch → calcEigenverbrauch (HTW-Power-Law, lib/calc.ts) mit den
//                 Anlagen- und Speicherzahlen der jeweiligen Region
//   Vergütung   → je Jahrgang aus feedin-archiv-alt (2006–03/2012),
//                 feedin-archiv (ab 04/2012) und feedin-config (ab 08/2022),
//                 anteilig gestaffelt über effectiveFeedInCtPerKwh/blendRoofRate;
//                 Freifläche aus freiflaeche-config (Historie + Ausschreibung),
//                 nach 20 Jahren marktwert-config
//
// Client-tauglich (keine DB-/Next-Imports): die Ranking-Tabelle rechnet im
// Browser, damit Besitzer-Filter und Preis-Annahme ohne Roundtrip umschalten.

import { DEFAULT_HEATPUMP_CONFIG } from "./heatpump-config";
import { DEFAULT_PRICES } from "./prices-config";
import type { FeedInRates } from "./feedin-config";
import { effectiveFeedInCtPerKwh, feedInEndIso, feedInRatesForCommissioning } from "./feedin-config";
import type { AltFeedInRow } from "./feedin-archiv-alt";
import { FEED_IN_ALT_START, FEED_IN_ARCHIV_ALT, altFeedInRatesFor, blendRoofRate } from "./feedin-archiv-alt";
import {
  FREIFLAECHE_AW_CT,
  FREIFLAECHE_LUECKE_AB,
  FREIFLAECHE_LUECKE_BIS,
  freiflaecheHistorieCt,
} from "./freiflaeche-config";
import { ertragForRegionId } from "./bundesland-ertrag";
import { fmtCtProKwh } from "./atlas-format";
import { simulateSolarYear } from "./balkon-sim";
import { referenceMonthKwh } from "./solar-year";
import { DEFAULT_BALKON_CONFIG } from "./balkon-config";
import { ANLAGEN, NUTZUNG, PERSONEN } from "./constants";
import { calcEigenverbrauch } from "./calc";
import { NATIONAL_AVG_YIELD } from "./constants";
import { DIREKTVERMARKTUNG, MARKTWERT_NIVEAU_CT } from "./marktwert-config";

export { ertragForRegionId };

/**
 * Praxis-Faktor des Anlagenbestands: reale Flotten-Erzeugung ÷ Optimal-Ertrag.
 *
 * Die Bundesland-Erträge (BL_ERTRAG) gelten für OPTIMALE Ausrichtung — der
 * echte Bestand (gemischte Ausrichtungen, Ost-West-Dächer, Verschattung,
 * Degradation) erzeugt deutlich weniger. Ohne diese Korrektur behauptete die
 * Tabelle für Deutschland rund ein Drittel mehr als die tatsächliche Erzeugung
 * (114 statt 87 TWh). Hier stand einmal „fast das Doppelte" — falsch, und in
 * der bequemen Richtung: Der Fehler ließ die Korrektur wichtiger aussehen,
 * als sie ist.
 *
 * Anker (Fraunhofer ISE, Jahresbilanz Stromerzeugung 2025, geprüft am
 * 06.08.2026 im Original-Pressetext): Ende 2025 waren 116,8 GW installiert,
 * Zubau 2025 16,2 GW (→ Jahresmittel ~108,7 GW); erzeugt wurden ~87 TWh
 * (~71 TWh Netzeinspeisung + 16,9 TWh Eigenverbrauch). Das sind ~800 kWh je
 * kWp und Jahr — gegen 1.050 optimal ein Faktor von ~0,76. Kein Handfaktor:
 * er rechnet sich aus den drei Quellwerten, Realitäts-Anker im Test.
 */
const FLOTTE_2025 = { erzeugungTwh: 87, leistungEndeGw: 116.8, zubauGw: 16.2 };
const flottenMittelGw = FLOTTE_2025.leistungEndeGw - FLOTTE_2025.zubauGw / 2;
export const PRAXIS_FAKTOR =
  (FLOTTE_2025.erzeugungTwh * 1000) / flottenMittelGw / NATIONAL_AVG_YIELD;

/**
 * kg CO₂ je kWh — dieselbe Quelle wie WP-/Klima-/Balkon-Rechner (geteilte
 * Rechen-Basis). Als Faktor für VERMIEDENES CO₂ ist 0,38 bewusst konservativ:
 * der aktuelle Verbrauchsmix liegt etwas darunter (UBA 2025 geschätzt ~0,34),
 * der amtliche UBA-Vermeidungsfaktor für PV (Verdrängungsmix inkl. Vorketten,
 * Emissionsbilanz erneuerbarer Energieträger 2024, CLIMATE CHANGE 11/2026)
 * deutlich darüber (~0,68). Die Oberfläche nennt den Wert deshalb
 * „bewusst konservativ", nicht „Strommix-Faktor". Council-Prüfung 06.08.2026.
 */
export const ATLAS_GRID_CO2 = DEFAULT_HEATPUMP_CONFIG.gridCo2PerKwh;

/**
 * Der Haushalt, gegen den der Eigenverbrauch gerechnet wird.
 *
 * Regional verschieden sind die Anlagen (mittlere Größe, Speicherbestand) und
 * der Ertrag — der Haushalt DAHINTER ist es nicht: Wie viele Personen in den
 * Häusern einer Gemeinde wohnen und wann sie zuhause sind, steht im
 * Anlagenregister nicht. Statt das zu raten, steht hier ein benannter
 * Bezugsfall: die Voreinstellung des PV-Rechners (Zwei-Personen-Haushalt,
 * Nutzungsprofil „teils zuhause"). Dessen Tagquote von 30 % ist zugleich das
 * HTW-Standardprofil, an dem das Power-Law kalibriert ist — also kein zweites,
 * eigenes Fundament.
 *
 * Die Richtung der Unschärfe ist bekannt und geht zu unseren Ungunsten: Wer ein
 * eigenes Dach hat, wohnt eher in einem größeren Haushalt als zu zweit, und ein
 * größerer Haushalt verbraucht mehr selbst. Die Spalte rechnet den Wert privater
 * Dächer damit eher zu niedrig als zu hoch.
 */
const EV_BEZUGSHAUSHALT = { personenIdx: 1, nutzungIdx: 1 } as const;

/**
 * Eigenverbrauchsanteil EINER Dachanlage — dieselbe Funktion, mit der der
 * PV-Rechner das Geld rechnet (geteilte Rechen-Basis: „Eigenverbrauch fürs
 * GELD" = `calcEigenverbrauch`, bewusst nicht die Stundensimulation).
 *
 * `ertragKwp` ist der PRAXIS-Ertrag der Region, nicht der Optimal-Ertrag: Der
 * Anteil bezieht sich auf genau die Kilowattstunden, die die Spalte bewertet,
 * und die kommen aus `erzeugungKwh` (Bundesland-Ertrag × Praxis-Faktor).
 */
function evAnteilAnlage(kwp: number, speicherKwh: number, ertragKwp: number): number {
  return (
    calcEigenverbrauch({
      ...EV_BEZUGSHAUSHALT,
      speicherKwh,
      wp: "nein",
      ea: "nein",
      eaKm: 0,
      kwp,
      ertragKwp,
    }) / 100
  );
}

/**
 * Rückfall, wenn eine Region keine private Dachanlage führt (kein Nenner) —
 * KEINE gesetzte Zahl mehr, sondern dieselbe Rechnung an einem benannten
 * Bezugsfall: die Voreinstellung des PV-Rechners (10 kWp, kein Speicher) am
 * Bundesschnitt-Ertrag, gerechnet in Praxis-Erträgen.
 *
 * Hier stand bis 08/2026 eine feste 0,3 für ALLE Regionen, begründet mit „der
 * typische Wert einer Dachanlage ohne Speicher, dieselbe Datenbasis wie
 * lib/calc.ts". Beides war falsch: Dieselbe Funktion liefert für eine
 * Dachanlage ohne Speicher rund 12–13 %; die 30 % erreicht sie erst mit etwa
 * 8 kWh Speicher. Die Zahl stand also am optimistischen Rand, gestützt auf eine
 * Quelle, die sie nicht trug.
 *
 * Auf das GELD wirkt dieser Rückfall praktisch nie: Wo keine private Dachanlage
 * gezählt ist, steht auch keine private Dachleistung, die bewertet würde. Die
 * Spalte zeigt in dem Fall „—" statt einer erfundenen Quote.
 */
export const EIGENVERBRAUCH_ANTEIL_RUECKFALL = evAnteilAnlage(
  ANLAGEN[2].kwp,
  0,
  NATIONAL_AVG_YIELD * PRAXIS_FAKTOR,
);

/** Was eine Region an privaten Dächern und Hausbatterien führt — genau die vier
 *  Zahlen, die für den Eigenverbrauch gebraucht werden. Sie stehen ohnehin in
 *  den Zellen der Ranking-Tabelle (Segmente `privat_dach` und `batterie_privat`). */
export type PrivatBestand = {
  /** Anzahl privater Dachanlagen. */
  dachCount: number;
  /** Ihre installierte Leistung zusammen, in kWp. */
  dachKwp: number;
  /** Anzahl privater Batteriespeicher. */
  batterieCount: number;
  /** Ihre nutzbare Kapazität zusammen, in kWh. */
  batterieKwh: number;
};

/**
 * Eigenverbrauchsanteil der privaten Dächer EINER Region — aus ihren eigenen
 * Zahlen, nicht aus einer Annahme.
 *
 * Drei regionale Größen gehen ein, alle drei liegen ohnehin vor:
 *   · mittlere Anlagengröße = Leistung ÷ Anzahl der privaten Dächer
 *   · Speicherbestand = Anzahl und Kapazität der privaten Batterien
 *   · Standort-Ertrag = Bundesland-Ertrag × Praxis-Faktor
 *
 * Gerechnet wird als MISCHUNG aus zwei Fällen, nicht mit einer über alle Dächer
 * gemittelten Speichergröße: Ein Anteil der Dächer hat eine Batterie üblicher
 * Größe, der Rest hat keine. Der Speicher-Term des Power-Laws sättigt (jede
 * weitere Kilowattstunde bringt weniger), und wer eine gemittelte Speichergröße
 * einsetzt, rechnet deshalb systematisch zu HOCH — er behandelt jedes Dach so,
 * als hätte es ein Drittel Batterie. Die Mischung vermeidet genau das.
 *
 * Gibt `null` zurück, wenn die Region keine private Dachanlage führt. Dann gibt
 * es nichts zu mitteln, und die Oberfläche zeigt „—" statt einer Zahl.
 */
export function eigenverbrauchAnteilRegion(b: PrivatBestand, regionId: string): number | null {
  const kwpMittel = b.dachCount > 0 ? b.dachKwp / b.dachCount : 0;
  if (!Number.isFinite(kwpMittel) || kwpMittel <= 0) return null;

  const ertragKwp = erzeugungKwh(1, regionId);
  const ohneSpeicher = evAnteilAnlage(kwpMittel, 0, ertragKwp);

  // Anteil der Dächer mit Batterie, gedeckelt bei 1: Speicher werden auch
  // nachgerüstet und tauchen im Register als eigene Einheit auf — in einer
  // kleinen Gemeinde kann die Batteriezahl die Dachzahl rechnerisch übersteigen.
  //
  // Bekannte Unschärfe, benannt statt versteckt: `batterie_privat` ist jede
  // Batterie eines privaten Betreibers bis 30 kWh (MAX_HAUSSPEICHER_KWH in der
  // MaStR-Pipeline). Darunter fällt auch der Speicher an einem
  // Steckersolargerät, das gar kein Dach ist. Die Quote der Dächer mit Batterie
  // ist deshalb eher eine Obergrenze — bundesweit gemessen (08/2026) liegt die
  // mittlere private Batterie bei 8,6 kWh, das Register führt also ganz
  // überwiegend echte Hausspeicher.
  const batterieMittelKwh = b.batterieCount > 0 ? b.batterieKwh / b.batterieCount : 0;
  if (!Number.isFinite(batterieMittelKwh) || batterieMittelKwh <= 0) return ohneSpeicher;
  const mitAnteil = Math.min(1, Math.max(0, b.batterieCount / b.dachCount));

  const mitSpeicher = evAnteilAnlage(kwpMittel, batterieMittelKwh, ertragKwp);
  return mitAnteil * mitSpeicher + (1 - mitAnteil) * ohneSpeicher;
}

/**
 * Eigenverbrauchsanteil eines typischen Balkonkraftwerks — NICHT der vom Dach
 * geliehene Wert.
 *
 * Ein Steckersolargerät verhält sich anders als eine Dachanlage: 800 W gegen
 * die Grundlast eines Haushalts werden zum großen Teil direkt verbraucht,
 * während eine 10-kWp-Anlage ihre Mittagsspitze gar nicht unterbringen kann.
 * Den Dach-Anteil hier einzusetzen wäre kein konservativer Ansatz, sondern
 * schlicht der falsche Fall.
 *
 * Gerechnet mit der Stundensimulation, die Balkon- und Dach-Rechner ohnehin
 * teilen (geteilte Rechen-Basis), an der Standard-Konfiguration des
 * Balkon-Rechners: gängigstes Set am Geländer, Zwei-Personen-Haushalt mit dem
 * mittleren Nutzungsprofil, ohne Speicher. Einmal beim Laden berechnet und
 * gemerkt; der Test in atlas-impact.test.ts hält den Wert im plausiblen Band.
 */
let balkonAnteilCache: number | null = null;
export function balkonEigenverbrauchAnteil(): number {
  if (balkonAnteilCache !== null) return balkonAnteilCache;
  const set = DEFAULT_BALKON_CONFIG.sets.find((s) => s.id === "duo") ?? DEFAULT_BALKON_CONFIG.sets[0];
  const sim = simulateSolarYear({
    moduleKwp: set.moduleWp / 1000,
    inverterKw: set.inverterW / 1000,
    monthlyYieldPerKwp: Array.from({ length: 12 }, (_, m) => referenceMonthKwh("sued_flach", m)),
    orientation: "sued_gelaender",
    household: {
      baseKwh: PERSONEN[1].verbrauch,
      tagQuote: NUTZUNG[1].tagQuote,
      wpActive: false,
      eaActive: false,
    },
    batteryKwh: 0,
    roundtrip: 1,
  });
  balkonAnteilCache = sim.annualYield > 0 ? sim.selfUsedKwh / sim.annualYield : EIGENVERBRAUCH_ANTEIL_RUECKFALL;
  return balkonAnteilCache;
}

/**
 * Was eine erzeugte Kilowattstunde wert ist — JE ANLAGENART, nicht als ein
 * Mischsatz über alles.
 *
 * Ein einziger Satz über den ganzen Bestand ist falsch, und zwar nicht ein
 * bisschen: Ein privates Dach spart Netzbezug zum Haushaltspreis (gut 31 ct),
 * ein Freiflächen-Park erlöst den Zuschlagswert seiner Ausschreibung (knapp
 * 5 ct). Das ist der Faktor sechs. Dieselbe Spreizung gibt es ein zweites Mal
 * über die BAUJAHRE — die EINSPEISEVERGÜTUNG eines Dachs von 2010 ist rund das
 * Vierfache der heutigen. In der Spalte kommt davon weniger an, weil der
 * Eigenverbrauch bei beiden gleich zählt: Der gerechnete Mischsatz eines
 * 2010er Dachs liegt beim gut Doppelten eines heutigen. Da Anlagenart UND
 * Jahrgang je Zelle bekannt sind, gibt es keinen Grund, darüber zu mitteln;
 * die Summe der Region ergibt sich aus ihren Zellen.
 *
 * Jeder Satz kommt aus einer im Projekt gepflegten Quelle. Wo eine Größe nicht
 * belegt ist (der Eigenverbrauchsanteil von Gewerbedächern), wird sie NICHT
 * geschätzt, sondern weggelassen — der Satz ist dann eine Untergrenze, und die
 * Abweichung geht zu unseren Ungunsten statt zu unseren Gunsten.
 */
export type SegmentSatz = { ct: number; herkunft: string };

/**
 * Der Stichtag, mit dem ein JAHRGANG bewertet wird: die Jahresmitte.
 *
 * Die Atlas-Zellen kennen nur das Jahr der Inbetriebnahme, die Vergütung war
 * aber feiner gestaffelt — bis 2011 halbjährlich, ab 04/2012 sogar monatlich.
 * Irgendein Tag des Jahres muss es also sein, und die Mitte ist die einzige
 * Wahl ohne Schlagseite: Sie trifft den Jahresdurchschnitt einer fallenden
 * Degressionskette am besten, während der 1. Januar jeden Jahrgang zu gut und
 * der 31. Dezember jeden zu schlecht rechnete.
 *
 * Die verbleibende Unschärfe ist real und liegt in der Größenordnung einer
 * Halbjahres-Degression (rund 1 % ab 2023, in den steilen Jahren 2010–2012
 * deutlich mehr). Wer eine einzelne Anlage genau rechnen will, ist beim
 * Einspeisevergütungs-Rechner richtig, nicht bei dieser Bestandsschätzung.
 */
export function jahrgangStichtag(jahrgang: number): string {
  return `${jahrgang}-07-01`;
}

/** Was eine eingespeiste Kilowattstunde an der Börse einbringt, wenn keine
 *  Vergütung (mehr) läuft: Marktwert Solar abzüglich Vermarktungsgebühr. */
export function marktErloesCt(): number {
  return Math.max(0, MARKTWERT_NIVEAU_CT - DIREKTVERMARKTUNG.gebuehrCtKwh);
}

/** Erstes Jahr, für das die Alt-Tabelle (feedin-archiv-alt) Sätze führt. */
const ALT_START_JAHR = Number(FEED_IN_ALT_START.slice(0, 4));

/** Was für einen Jahrgang gilt — einmal je Jahrgang nachgeschlagen und gemerkt,
 *  weil die Ranking-Tabelle diese Sätze für tausende Zellen braucht. Der
 *  Schlüssel trägt das laufende Jahr, damit die Frist beim Jahreswechsel greift. */
type JahrgangBasis = { abgelaufen: boolean; alt: AltFeedInRow | null; rates: FeedInRates | null };
const basisCache = new Map<string, JahrgangBasis>();

function jahrgangBasis(jahrgang: number): JahrgangBasis {
  const key = `${jahrgang}@${new Date().getFullYear()}`;
  const cached = basisCache.get(key);
  if (cached) return cached;

  const stichtag = jahrgangStichtag(jahrgang);
  // 20-Jahres-Frist: Die EEG-Zahlung endet am 31.12. des zwanzigsten Jahres
  // (§ 25 EEG, feedInEndIso — dieselbe Quelle wie im Rechner). Danach läuft die
  // Anlage weiter, verkauft ihren Strom aber am Markt.
  const heute = new Date().toISOString().slice(0, 10);
  const abgelaufen = feedInEndIso(stichtag) < heute;

  // Ein Jahrgang, der die Frist BESTEHT, aber älter ist als unsere älteste
  // belegte Zeile, bekommt genau diese älteste Zeile — NICHT den Marktwert.
  // Der Marktwert würde behaupten, die Vergütung sei ausgelaufen, obwohl die
  // Frist sie gerade noch trägt (genau das passierte dem Jahrgang 2006, bevor
  // er in der Alt-Tabelle stand: 12,60 statt 43,81 ct, Faktor 3,5). Die älteste
  // Zeile ist zugleich der niedrigste Satz jener Ära — die Kette fällt monoton,
  // ältere Jahrgänge bekamen MEHR. Der Ersatz ist damit konservativ.
  const alt = abgelaufen
    ? null
    : altFeedInRatesFor(stichtag) ?? (jahrgang < ALT_START_JAHR ? FEED_IN_ARCHIV_ALT[0] : null);

  // Ab 04/2012 die Monatstabelle, ab 08/2022 die Gesetzeskette — beides über
  // dieselbe Funktion wie im Einspeisevergütungs-Rechner. Der Jahrgang 2012 wird
  // dabei ganz mit den NEUEN Sätzen gerechnet: Seine Jahresmitte (01.07.2012)
  // liegt hinter dem Stichtag 01.04.2012, und es ist zugleich die vorsichtigere
  // Wahl — die neuen Sätze liegen unter den alten (18,92 gegen 24,43 ct).
  const rates = abgelaufen || alt ? null : feedInRatesForCommissioning(stichtag);

  const basis = { abgelaufen, alt, rates };
  basisCache.set(key, basis);
  return basis;
}

/**
 * Was eine EINGESPEISTE Kilowattstunde dieses Segments und Jahrgangs einbringt —
 * mit `hinweis`, weil eine nackte Zahl nicht sagt, WAS sie ist (ein
 * Ausschreibungswert liest sich sonst als Einspeisevergütung).
 *
 * Der Satz hängt am Baujahr, und zwar dramatisch: Ein privates Dach von 2010
 * bekommt 34,05 ct, eines von heute 7,78 ct. Ein Bestand ohne Jahrgangsbezug zu
 * bewerten hieße, jede Altanlage auf den heutigen Satz herunterzurechnen — und
 * damit die Regionen zu bestrafen, die früh angefangen haben. Genau die stehen
 * im Atlas aber vorn.
 *
 * Er hängt außerdem an der ANLAGENGRÖSSE, denn die EEG-Staffel ist ein
 * anteiliger Tarif: Die ersten 10 kWp (bis 03/2012: 30 kW) bringen den kleinen
 * Satz, jedes weitere Kilowatt den großen. `kwpMittel` ist deshalb die mittlere
 * Anlagengröße der Zelle (Leistung ÷ Anzahl). Fehlt sie, wird ohne Staffel
 * gerechnet — bewusst mit dem KLEINEN Satz der Klasse, also eher zu niedrig.
 *
 * NICHT abgebildet — jede Auslassung senkt die Zahl, keine schönt sie:
 *  · Die EIGENVERBRAUCHSVERGÜTUNG nach § 33 Abs. 2 EEG 2009 (01/2009–03/2012,
 *    z. B. 25,01 ct 2009): Damals wurde auch selbst verbrauchter Strom vergütet.
 *    Die Jahrgänge 2009 bis 2012 sind dadurch untererfasst.
 *  · Dachanlagen über 100 kW in der alten Ära: Die Alt-Tabelle führt darüber
 *    keine Klasse, obwohl das Gesetz eine hatte (§ 33 Abs. 1 Nr. 3 EEG 2009).
 *    Solche Zellen bekommen den 100-kW-Satz — die einzige Abweichung nach oben.
 *  · Freiflächen der Jahrgänge 2015–2024: Seit dem ersten Gebotstermin
 *    (15.04.2015) ist ihr Erlös der individuelle Zuschlagswert, und eine belegte
 *    Reihe dieser Werte pflegt das Projekt nicht. Sie werden mit dem HEUTIGEN
 *    Ausschreibungsniveau bewertet — für die Jahrgänge bis etwa 2020 zu niedrig.
 */
export function einspeiseSatz(
  segment: string,
  jahrgang: number,
  kwpMittel?: number | null,
): { ct: number; hinweis: string } {
  // Steckersolar bekommt per Projektkonvention keine Vergütung (Voreinstellung
  // des Balkon-Rechners). Für die alten Jahrgänge ist das keine Vereinfachung,
  // sondern der richtige Fall: Steckersolargeräte gab es damals praktisch nicht,
  // und die wenigen Geräte wurden nicht als eigene EEG-Anlage abgerechnet.
  if (segment === "steckersolar") return { ct: 0, hinweis: "wird nicht vergütet" };

  const { abgelaufen, alt, rates } = jahrgangBasis(jahrgang);
  if (abgelaufen) {
    return { ct: marktErloesCt(), hinweis: "Börsenwert, die 20 Jahre Vergütung sind vorbei" };
  }

  if (segment === "freiflaeche") return freiflaecheSatz(jahrgang, alt);

  // Nur eine echte, positive Größe zählt als bekannt — eine Zelle ohne Anzahl
  // liefert sonst Infinity oder NaN und damit einen stillen Fehlbetrag.
  const kwp = kwpMittel != null && Number.isFinite(kwpMittel) && kwpMittel > 0 ? kwpMittel : null;

  // Dachanlagen bis 03/2012: andere Klassengrenzen als heute (30 / 100 kW).
  // Private Dächer liegen per Definition darunter — der Atlas zählt ein Dach
  // über 30 kWp gar nicht als privat (MAX_PRIVATDACH_KWP in der MaStR-Pipeline,
  // scripts/mastr-bnetza-refresh.ts). Gewerbedächer liegen im Mittel darüber und
  // werden deshalb anteilig gemischt (§ 12 Abs. 2 Satz 1 EEG 2004 / § 18 Abs. 1
  // EEG 2009); über 100 kW gibt die Alt-Tabelle nichts her, dort bleibt der
  // 100-kW-Satz.
  if (alt) {
    const anteilig = kwp !== null ? blendRoofRate(alt, kwp) : null;
    const ct = anteilig ?? (segment === "privat_dach" ? alt.roofUpTo30 : alt.roofUpTo100);
    return { ct, hinweis: "Einspeisevergütung" };
  }

  if (!rates) return { ct: marktErloesCt(), hinweis: "Börsenwert, kein belegter Satz für dieses Baujahr" };

  // Ab 04/2012 staffelt das EEG bei 10 kWp — dieselbe anteilige Formel wie im
  // Empfehlungs-Rechner (geteilte Rechen-Basis, effectiveFeedInCtPerKwh).
  const ct =
    kwp !== null
      ? effectiveFeedInCtPerKwh(kwp, rates)
      : segment === "privat_dach"
        ? rates.teilUnder10
        : rates.teilOver10;
  return { ct, hinweis: "Einspeisevergütung" };
}

/** Nur der Satz — für alle Stellen, die den Hinweis nicht brauchen. */
export function einspeiseCt(segment: string, jahrgang: number, kwpMittel?: number | null): number {
  return einspeiseSatz(segment, jahrgang, kwpMittel).ct;
}

/**
 * Freifläche: Der Erlös liegt beim anzulegenden Wert (die Marktprämie füllt auf
 * ihn auf), nicht beim Marktwert — siehe lib/freiflaeche-config.ts. Welcher Wert
 * das ist, hängt am Baujahr: bis 03/2012 der Satz der Alt-Tabelle, 2012–2014 der
 * gesetzliche Satz nach § 32 Abs. 1 EEG 2012, ab 2015 der Zuschlagswert einer
 * Ausschreibung — und genau den kennen wir für 2015–2024 nicht.
 */
function freiflaecheSatz(jahrgang: number, alt: AltFeedInRow | null): { ct: number; hinweis: string } {
  if (alt) return { ct: alt.groundMounted, hinweis: "gesetzlicher Freiflächensatz des Baujahrs" };

  const historisch = freiflaecheHistorieCt(jahrgang);
  if (historisch !== null) {
    return { ct: historisch, hinweis: "gesetzlicher Freiflächensatz des Baujahrs" };
  }

  // Bewusst NETTO beschriftet: Ausgegeben wird der Zuschlagswert MINUS
  // Vermarktungsgebühr, nicht der Zuschlagswert selbst.
  const ct = Math.max(0, FREIFLAECHE_AW_CT - DIREKTVERMARKTUNG.gebuehrCtKwh);
  if (jahrgang >= FREIFLAECHE_LUECKE_AB && jahrgang <= FREIFLAECHE_LUECKE_BIS) {
    return {
      ct,
      hinweis: "heutiger Zuschlagswert abzüglich Vermarktungsgebühr — der des Baujahrs ist uns nicht belegt",
    };
  }
  return { ct, hinweis: "Zuschlagswert der Ausschreibung abzüglich Vermarktungsgebühr" };
}

/**
 * Sätze je Anlagenart für einen Jahrgang. Gecacht wird nur die Fassung OHNE
 * Anlagengröße (Tooltip, Tests) — die Ranking-Tabelle reicht je Zelle eine
 * eigene mittlere Größe herein, und ein Cache über tausende Größen wäre teurer
 * als die Rechnung. Der Schlüssel trägt das laufende Jahr mit, damit die
 * 20-Jahres-Frist beim Jahreswechsel greift.
 */
const saetzeCache = new Map<string, Record<string, SegmentSatz>>();

export function stromwertSaetze(
  jahrgang: number,
  kwpMittel?: number | null,
  evAnteil?: number | null,
): Record<string, SegmentSatz> {
  if (kwpMittel != null || evAnteil != null) return baueSaetze(jahrgang, kwpMittel ?? null, evAnteil ?? null);
  const key = `${jahrgang}@${new Date().getFullYear()}`;
  const cached = saetzeCache.get(key);
  if (cached) return cached;
  const gebaut = baueSaetze(jahrgang, null, null);
  saetzeCache.set(key, gebaut);
  return gebaut;
}

function baueSaetze(
  jahrgang: number,
  kwpMittel: number | null,
  evAnteil: number | null,
): Record<string, SegmentSatz> {
  const haushaltCt = DEFAULT_PRICES.electricityPrice * 100;
  // Der Eigenverbrauchsanteil kommt aus der Region (Anlagengröße + Speicher-
  // bestand). Fehlt er, greift der Rückfall — dann steht in der Region aber auch
  // keine private Dachleistung, die er bewerten könnte.
  const ev = evAnteil != null && Number.isFinite(evAnteil) ? evAnteil : EIGENVERBRAUCH_ANTEIL_RUECKFALL;
  const dach = einspeiseSatz("privat_dach", jahrgang, kwpMittel);
  const gewerbe = einspeiseSatz("gewerbe_dach", jahrgang, kwpMittel);
  const frei = einspeiseSatz("freiflaeche", jahrgang, kwpMittel);
  return {
    // Privates Dach: der selbst genutzte Teil ersetzt teuren Netzbezug, der
    // Rest bringt die EEG-Vergütung des Baujahrs (anteilig gestaffelt, sobald
    // die mittlere Anlagengröße der Zelle bekannt ist).
    privat_dach: {
      ct: ev * haushaltCt + (1 - ev) * dach.ct,
      herkunft: `${Math.round(ev * 100)} % Eigenverbrauch zum Haushaltsstrompreis, Rest zum Satz des Jahrgangs ${jahrgang}`,
    },
    // Steckersolar wird per Voreinstellung NICHT vergütet (Projektkonvention,
    // siehe Balkon-Rechner): Nur der selbst genutzte Teil ist Geld wert, der
    // Überschuss geht unentgeltlich ins Netz. Dafür liegt der Eigenverbrauchs-
    // anteil weit über dem einer Dachanlage — er kommt aus der Stundensimulation,
    // nicht vom Dach geliehen.
    steckersolar: {
      ct: balkonEigenverbrauchAnteil() * haushaltCt,
      herkunft: `${Math.round(balkonEigenverbrauchAnteil() * 100)} % Eigenverbrauch zum Haushaltsstrompreis; der Überschuss wird nicht vergütet`,
    },
    // Gewerbedach: Der Eigenverbrauchsanteil von Gewerbebetrieben ist im
    // Projekt nirgends belegt, deshalb steht hier nur die gesicherte
    // Untergrenze — die Einspeisevergütung. Wer tagsüber selbst verbraucht,
    // liegt darüber.
    gewerbe_dach: {
      ct: gewerbe.ct,
      herkunft: `${gewerbe.hinweis} des Jahrgangs ${jahrgang} — selbst verbrauchter Strom ist mehr wert, sein Anteil ist uns nicht belegt`,
    },
    // Freifläche verkauft praktisch alles. Maßstab ist der anzulegende Wert des
    // Jahrgangs (Ausschreibung bzw. historischer Freiflächensatz), nach Ablauf
    // der 20 Jahre der Marktwert. Was davon zutrifft, sagt der Hinweis — er ist
    // je Jahrgang ein anderer und wird deshalb nicht hier getippt.
    freiflaeche: {
      ct: frei.ct,
      herkunft: `${frei.hinweis} (Jahrgang ${jahrgang})`,
    },
  };
}

/**
 * Satz für ein Segment und einen Jahrgang; unbekannte Segmente tragen keinen
 * Erlös. `kwpMittel` ist die mittlere Anlagengröße der Zelle (Leistung ÷ Anzahl)
 * für die anteilige EEG-Staffel — fehlt sie, wird ohne Staffel gerechnet.
 */
export function stromwertCtFuerSegment(
  segment: string,
  jahrgang: number,
  kwpMittel?: number | null,
  evAnteil?: number | null,
): number {
  return stromwertSaetze(jahrgang, kwpMittel, evAnteil)[segment]?.ct ?? 0;
}

/**
 * Dieselbe Rechnung, aber so zerlegt, wie man sie einem Menschen erklärt.
 *
 * Die zusammengefassten Sätze aus `stromwertSaetze()` sind Durchschnitte JE
 * ERZEUGTER Kilowattstunde. Sie taugen zum Rechnen, aber NICHT zum Erklären:
 * Nebeneinander gestellt liest sich „Balkon 20 ct, Dach 14,8 ct" als Wertung —
 * als wäre eine Balkon-Kilowattstunde mehr wert als eine vom Dach. Das ist sie
 * nicht: Selbst verbrauchter Strom ist überall gleich viel wert. Verschieden
 * ist nur, wie viel eine Anlagenart überhaupt im Haus behält, und dieser
 * Umweg über Anteile führt beim Lesen zuverlässig in die Irre.
 *
 * Deshalb zeigt die Oberfläche die beiden Preise, die wirklich gelten — was
 * selbst verbrauchter Strom ersetzt und was eingespeister einbringt — statt
 * der Mischsätze dahinter.
 *
 * Gezeigt werden die Sätze einer HEUTE gebauten Anlage. Alles andere wäre eine
 * Auswahl, die niemand getroffen hat: Der Bestand einer Region mischt Jahrgänge
 * von 2006 bis heute, und ein Durchschnitt über sie wäre eine dritte Zahl, die
 * in keiner Zeile steht. Der Tooltip sagt deshalb dazu, dass der Satz am
 * Baujahr hängt.
 *
 * Jeder Eintrag trägt einen `hinweis`, und der gehört IMMER auf die Oberfläche:
 * Ohne ihn liest sich der Freiflächenwert als Einspeisevergütung, obwohl er ein
 * Ausschreibungswert abzüglich Vermarktungsgebühr ist. Er kommt aus derselben
 * Funktion wie der Satz — was zutrifft, hängt am Jahrgang und wird deshalb
 * nirgends von Hand getippt.
 *
 * Ohne Anlagengröße gerechnet, weil der Tooltip keine kennt: Für die Dächer ist
 * das der Satz der KLEINEN Klasse (privat) bzw. der große Satz oberhalb der
 * Schwelle (gewerblich). Die Spalte selbst rechnet je Zelle mit der mittleren
 * Anlagengröße und liegt beim gewerblichen Dach deshalb etwas höher.
 */
export function stromwertBestandteile(
  jahrgang: number = new Date().getFullYear(),
  dachEigenverbrauchAnteil: number = EIGENVERBRAUCH_ANTEIL_RUECKFALL,
) {
  const eintrag = (label: string, segment: string) => ({
    label,
    ...einspeiseSatz(segment, jahrgang),
  });
  return {
    /** Der Jahrgang, dessen Sätze hier stehen. */
    jahrgang,
    /** Was eine selbst verbrauchte Kilowattstunde ersetzt — für alle gleich. */
    eigenverbrauchCt: DEFAULT_PRICES.electricityPrice * 100,
    /** Anteil einer Dachanlage, der im Haus bleibt (Rest wird eingespeist).
     *  Je Region verschieden — wer nichts hereinreicht, bekommt den Rückfall. */
    dachEigenverbrauchAnteil,
    /** Derselbe Anteil für ein Steckersolargerät — aus der Stundensimulation. */
    balkonEigenverbrauchAnteil: balkonEigenverbrauchAnteil(),
    /** Was eine eingespeiste Kilowattstunde einbringt — das hängt an der Anlagenart. */
    einspeisung: [
      eintrag("privates Dach", "privat_dach"),
      eintrag("gewerbliches Dach", "gewerbe_dach"),
      // NICHT "Börsenwert": Ein Park in der Direktvermarktung verkauft zwar an
      // der Börse, bekommt aber die Marktprämie auf den anzulegenden Wert
      // obendrauf. Sein Erlös hängt am Zuschlagswert, nicht am Börsenpreis.
      eintrag("Freiflächen-Park", "freiflaeche"),
      { label: "Balkonkraftwerk", ct: null, hinweis: "wird nicht vergütet" },
    ] as ReadonlyArray<{ label: string; ct: number | null; hinweis: string }>,
  };
}

/**
 * Die Aufzählung, die im Hilfetext der Spalte steht — als Text, nicht als
 * Datenstruktur.
 *
 * Warum hier und nicht in der Komponente: Der `hinweis` ist der Unterschied
 * zwischen „4,55 ct" und „4,55 ct Ausschreibungswert abzüglich
 * Vermarktungsgebühr". Er stand zwar schon in den Daten, wurde von der
 * Oberfläche aber nur gerendert, wenn GAR KEIN Satz da war — also ausschließlich
 * beim Balkonkraftwerk. Ein Test kann das nur festnageln, wenn die Zeile an
 * einer Stelle entsteht, die er aufrufen kann.
 */
export function einspeiseZeilen(jahrgang?: number): string[] {
  return stromwertBestandteile(jahrgang).einspeisung.map((e) =>
    e.ct === null ? `${e.label} ${e.hinweis}` : `${e.label} ${fmtCtProKwh(e.ct)} (${e.hinweis})`,
  );
}

/**
 * Rechnerische Jahres-Erzeugung des Anlagenbestands einer Region:
 * kWp × Bundesland-Ertrag (Nord-Süd-Gradient) × Praxis-Faktor der Flotte.
 */
export function erzeugungKwh(kwp: number, regionId: string): number {
  return kwp * ertragForRegionId(regionId) * PRAXIS_FAKTOR;
}

/** Rechnerisch vermiedenes CO₂ in Tonnen pro Jahr. */
export function co2Tonnen(kwhProJahr: number): number {
  return (kwhProJahr * ATLAS_GRID_CO2) / 1000;
}

/** Rechnerischer Wert des erzeugten Stroms in € pro Jahr, zum gegebenen ct-Satz. */
export function stromwertEuro(kwhProJahr: number, ctProKwh: number): number {
  return (kwhProJahr * ctProKwh) / 100;
}

/**
 * Wert der Jahreserzeugung EINES Segments und Jahrgangs in € — Erzeugung × Satz
 * dieser Anlagenart in diesem Baujahr. Die Region summiert über ihre Zellen; ein
 * Mischsatz kommt nirgends mehr vor.
 *
 * `kwpMittel` ist die mittlere Anlagengröße der Zelle (Leistung ÷ Anzahl) für
 * die anteilige EEG-Staffel. Zellen ohne Anzahl reichen null herein — dann wird
 * ohne Staffel gerechnet, nicht mit einer Division durch null.
 *
 * `evAnteil` ist der Eigenverbrauchsanteil der privaten Dächer DIESER Region
 * (`eigenverbrauchAnteilRegion`). Er gilt für alle Jahrgänge der Region
 * gleichermaßen — der Bestand an Anlagen und Batterien ist eine Momentaufnahme,
 * keine Größe je Baujahr.
 */
export function segmentWertEuro(
  kwp: number,
  regionId: string,
  segment: string,
  jahrgang: number,
  kwpMittel?: number | null,
  evAnteil?: number | null,
): number {
  return stromwertEuro(erzeugungKwh(kwp, regionId), stromwertCtFuerSegment(segment, jahrgang, kwpMittel, evAnteil));
}
