// Rechnerische Wirkungs-Werte des Solar-Atlas: vermiedenes CO₂ und der Wert
// des erzeugten Solarstroms je Region.
//
// Beides sind MODELLWERTE, keine Messwerte — die Oberflächen sagen das dazu.
// Alle Faktoren kommen aus der geteilten Rechen-Basis, nichts wird hier neu
// geraten:
//   Ertrag      → lib/bundesland-ertrag.ts (PVGIS-Bundesland-Durchschnitt)
//   CO₂-Faktor  → gridCo2PerKwh (identisch in WP-/Klima-/Balkon-Config)
//   Strompreis  → DEFAULT_PRICES.electricityPrice (BNetzA)
//   Vergütung   → je Jahrgang aus feedin-archiv-alt (2007–03/2012),
//                 feedin-archiv (ab 04/2012) und feedin-config (ab 08/2022);
//                 Freifläche aus freiflaeche-config, nach 20 Jahren marktwert-config
//
// Client-tauglich (keine DB-/Next-Imports): die Ranking-Tabelle rechnet im
// Browser, damit Besitzer-Filter und Preis-Annahme ohne Roundtrip umschalten.

import { DEFAULT_HEATPUMP_CONFIG } from "./heatpump-config";
import { DEFAULT_PRICES } from "./prices-config";
import { feedInEndIso, feedInRatesForCommissioning } from "./feedin-config";
import { altFeedInRatesFor } from "./feedin-archiv-alt";
import { FREIFLAECHE_AW_CT } from "./freiflaeche-config";
import { ertragForRegionId } from "./bundesland-ertrag";
import { simulateSolarYear } from "./balkon-sim";
import { referenceMonthKwh } from "./solar-year";
import { DEFAULT_BALKON_CONFIG } from "./balkon-config";
import { NUTZUNG, PERSONEN } from "./constants";
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
 * Annahme: Anteil des Solarstroms eines privaten Dachs, der selbst verbraucht
 * wird (Rest wird eingespeist).
 *
 * OFFEN (bis 12/2026): Diese Zahl ist die schwächste Stelle der Geld-Spalte.
 * Hier stand als Begründung, 30 % sei „der typische Wert einer Dachanlage ohne
 * Speicher, dieselbe Datenbasis wie lib/calc.ts". Beides war falsch:
 * `calcEigenverbrauch` (das projekteigene HTW-Power-Law) liefert für die
 * mittlere deutsche Dachanlage (9,8 kWp) beim hier gerechneten Ertrag nur
 * 13–20 % OHNE Speicher — die 30 % erreicht es erst MIT rund 8 kWh Speicher.
 * Der Satz stand also am optimistischen Rand, gestützt auf eine Quelle, die
 * ihn nicht trägt.
 *
 * Warum er trotzdem vorerst bleibt: Wie groß der Speicheranteil im REALEN
 * Bestand einer Region ist, weiß die Tabelle zwar (Segment `batterie_privat`
 * liegt in derselben Zelle), aber ihn korrekt auf die Dachanlagen umzulegen
 * ist eine eigene Rechnung — und ein Wechsel auf 15 % ohne diese Umlage wäre
 * nur ein anderer ungeankerter Wert. Der saubere Weg ist `calcEigenverbrauch`
 * mit den Größen der Region (mittlere Anlagengröße = kwp/count, Speicher je
 * Dachanlage aus der Batterie-Zelle).
 */
export const EIGENVERBRAUCH_ANTEIL_ANNAHME = 0.3;

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
  balkonAnteilCache = sim.annualYield > 0 ? sim.selfUsedKwh / sim.annualYield : EIGENVERBRAUCH_ANTEIL_ANNAHME;
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
 * über die BAUJAHRE — ein Dach von 2010 bekommt das Vierfache eines heutigen.
 * Da Anlagenart UND Jahrgang je Zelle bekannt sind, gibt es keinen Grund,
 * darüber zu mitteln; die Summe der Region ergibt sich aus ihren Zellen.
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

/**
 * Was eine EINGESPEISTE Kilowattstunde dieses Segments und Jahrgangs einbringt.
 *
 * Der Satz hängt am Baujahr, und zwar dramatisch: Ein privates Dach von 2010
 * bekommt 34,05 ct, eines von heute 7,78 ct. Ein Bestand ohne Jahrgangsbezug zu
 * bewerten hieße, jede Altanlage auf den heutigen Satz herunterzurechnen — und
 * damit die Regionen zu bestrafen, die früh angefangen haben. Genau die stehen
 * im Atlas aber vorn.
 *
 * NICHT abgebildet — beides senkt die Zahl, keine Auslassung schönt sie:
 *  · Die EIGENVERBRAUCHSVERGÜTUNG nach § 33 Abs. 2 EEG 2009 (01/2009–03/2012,
 *    z. B. 25,01 ct 2009): Damals wurde auch selbst verbrauchter Strom vergütet.
 *    Die Jahrgänge 2009 bis 2012 sind dadurch untererfasst.
 *  · Jahrgänge vor 2007: Für sie pflegt das Projekt keine Sätze. Sie fallen auf
 *    den Marktwert — was für alles bis einschließlich 2005 ohnehin stimmt (die
 *    20 Jahre sind vorbei) und nur den Jahrgang 2006 zu niedrig ansetzt.
 *  · Freiflächen der Jahrgänge 2012–2024: Eine historische Reihe der
 *    Freiflächensätze gibt es im Projekt nicht (lib/feedin-archiv.ts führt nur
 *    Dachanlagen). Sie werden deshalb mit dem HEUTIGEN Ausschreibungsniveau
 *    bewertet. Ab etwa 2017 trifft das gut, die Jahrgänge 2012–2016 (damals
 *    9–18 ct) sind zu niedrig angesetzt.
 */
export function einspeiseCt(segment: string, jahrgang: number): number {
  // Steckersolar bekommt per Projektkonvention keine Vergütung (Voreinstellung
  // des Balkon-Rechners). Für die alten Jahrgänge ist das keine Vereinfachung,
  // sondern der richtige Fall: Steckersolargeräte gab es damals praktisch nicht,
  // und die wenigen Geräte wurden nicht als eigene EEG-Anlage abgerechnet.
  if (segment === "steckersolar") return 0;

  const stichtag = jahrgangStichtag(jahrgang);

  // 20-Jahres-Frist: Die EEG-Zahlung endet am 31.12. des zwanzigsten Jahres
  // (§ 25 EEG, feedInEndIso — dieselbe Quelle wie im Rechner). Danach läuft die
  // Anlage weiter, verkauft ihren Strom aber am Markt.
  const heute = new Date().toISOString().slice(0, 10);
  if (feedInEndIso(stichtag) < heute) return marktErloesCt();

  // Freifläche: Der Erlös liegt beim anzulegenden Wert (Marktprämie füllt auf
  // ihn auf), nicht beim Marktwert — siehe lib/freiflaeche-config.ts. Für die
  // alten Jahrgänge steht der belegte Freiflächensatz in der Alt-Tabelle.
  if (segment === "freiflaeche") {
    const alt = altFeedInRatesFor(stichtag);
    if (alt) return alt.groundMounted;
    if (jahrgang < 2007) return marktErloesCt();
    return Math.max(0, FREIFLAECHE_AW_CT - DIREKTVERMARKTUNG.gebuehrCtKwh);
  }

  // Dachanlagen bis 03/2012: andere Klassengrenzen als heute (30 / 100 kW).
  // Private Dächer liegen per Definition darunter — der Atlas zählt ein Dach
  // über 30 kWp gar nicht als privat (MAX_PRIVATDACH_KWP in der MaStR-Pipeline,
  // scripts/mastr-bnetza-refresh.ts), deshalb ist der 30-kW-Satz hier kein
  // gemischter, sondern der zutreffende. Gewerbedächer bekommen den 100-kW-Satz;
  // sie sind im Mittel größer, aber die Alt-Tabelle führt darüber keine Klasse —
  // die Abweichung geht damit nach oben und ist bewusst die einzige.
  const alt = altFeedInRatesFor(stichtag);
  if (alt) return segment === "privat_dach" ? alt.roofUpTo30 : alt.roofUpTo100;

  if (jahrgang < 2007) return marktErloesCt();

  // Ab 04/2012 die Monatstabelle, ab 08/2022 die Gesetzeskette — beides über
  // dieselbe Funktion wie im Einspeisevergütungs-Rechner. Der Jahrgang 2012 wird
  // dabei ganz mit den NEUEN Sätzen gerechnet: Seine Jahresmitte (01.07.2012)
  // liegt hinter dem Stichtag 01.04.2012, und es ist zugleich die vorsichtigere
  // Wahl — die neuen Sätze liegen unter den alten (18,92 gegen 24,43 ct).
  const rates = feedInRatesForCommissioning(stichtag);
  if (!rates) return marktErloesCt();
  return segment === "privat_dach" ? rates.teilUnder10 : rates.teilOver10;
}

/**
 * Sätze je Anlagenart für einen Jahrgang. Gecacht, weil die Ranking-Tabelle sie
 * für jede Zelle (Region × Jahr × Segment) braucht; der Schlüssel trägt das
 * laufende Jahr mit, damit die 20-Jahres-Frist beim Jahreswechsel greift.
 */
const saetzeCache = new Map<string, Record<string, SegmentSatz>>();

export function stromwertSaetze(jahrgang: number): Record<string, SegmentSatz> {
  const key = `${jahrgang}@${new Date().getFullYear()}`;
  const cached = saetzeCache.get(key);
  if (cached) return cached;
  const gebaut = baueSaetze(jahrgang);
  saetzeCache.set(key, gebaut);
  return gebaut;
}

function baueSaetze(jahrgang: number): Record<string, SegmentSatz> {
  const haushaltCt = DEFAULT_PRICES.electricityPrice * 100;
  const ev = EIGENVERBRAUCH_ANTEIL_ANNAHME;
  const dachCt = einspeiseCt("privat_dach", jahrgang);
  const gewerbeCt = einspeiseCt("gewerbe_dach", jahrgang);
  const freiCt = einspeiseCt("freiflaeche", jahrgang);
  return {
    // Privates Dach: der selbst genutzte Teil ersetzt teuren Netzbezug, der
    // Rest bringt die EEG-Vergütung für Teileinspeisung ≤ 10 kWp.
    privat_dach: {
      ct: ev * haushaltCt + (1 - ev) * dachCt,
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
    // Untergrenze — die EEG-Vergütung für Teileinspeisung > 10 kWp. Wer
    // tagsüber selbst verbraucht, liegt darüber.
    gewerbe_dach: {
      ct: gewerbeCt,
      herkunft: "Einspeisevergütung über 10 kWp — selbst verbrauchter Strom ist mehr wert, sein Anteil ist uns nicht belegt",
    },
    // Freifläche verkauft praktisch alles. Maßstab ist der anzulegende Wert des
    // Jahrgangs (Ausschreibung bzw. historischer Freiflächensatz), nach Ablauf
    // der 20 Jahre der Marktwert.
    freiflaeche: {
      ct: freiCt,
      herkunft: "Anzulegender Wert der Freiflächen-Ausschreibung abzüglich Vermarktungsgebühr",
    },
  };
}

/** Satz für ein Segment und einen Jahrgang; unbekannte Segmente tragen keinen Erlös. */
export function stromwertCtFuerSegment(segment: string, jahrgang: number): number {
  return stromwertSaetze(jahrgang)[segment]?.ct ?? 0;
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
 * von 2007 bis heute, und ein Durchschnitt über sie wäre eine dritte Zahl, die
 * in keiner Zeile steht. Der Tooltip sagt deshalb dazu, dass der Satz am
 * Baujahr hängt.
 */
export function stromwertBestandteile(jahrgang: number = new Date().getFullYear()) {
  return {
    /** Der Jahrgang, dessen Sätze hier stehen. */
    jahrgang,
    /** Was eine selbst verbrauchte Kilowattstunde ersetzt — für alle gleich. */
    eigenverbrauchCt: DEFAULT_PRICES.electricityPrice * 100,
    /** Was eine eingespeiste Kilowattstunde einbringt — das hängt an der Anlagenart. */
    einspeisung: [
      { label: "privates Dach", ct: einspeiseCt("privat_dach", jahrgang), hinweis: "Einspeisevergütung" },
      { label: "gewerbliches Dach", ct: einspeiseCt("gewerbe_dach", jahrgang), hinweis: "Einspeisevergütung" },
      {
        label: "Freiflächen-Park",
        ct: einspeiseCt("freiflaeche", jahrgang),
        // NICHT "Börsenwert": Ein Park in der Direktvermarktung verkauft zwar an
        // der Börse, bekommt aber die Marktprämie auf den anzulegenden Wert
        // obendrauf. Sein Erlös ist der Zuschlagswert, nicht der Börsenpreis.
        hinweis: "Zuschlagswert der Ausschreibung",
      },
      { label: "Balkonkraftwerk", ct: null, hinweis: "wird nicht vergütet" },
    ] as ReadonlyArray<{ label: string; ct: number | null; hinweis: string }>,
  };
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
 */
export function segmentWertEuro(kwp: number, regionId: string, segment: string, jahrgang: number): number {
  return stromwertEuro(erzeugungKwh(kwp, regionId), stromwertCtFuerSegment(segment, jahrgang));
}
