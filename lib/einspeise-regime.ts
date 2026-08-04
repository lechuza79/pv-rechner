// ─── Was bringt eine eingespeiste Kilowattstunde — heute und nach dem Entwurf ──
//
// Der Rechner kannte bisher genau einen Fall: eine feste Vergütung, 20 Jahre
// lang, ein Satz. Der Entwurf zum EEG 2027 kennt diesen Fall für Neuanlagen
// nicht mehr, sondern eine Abfolge: erst eine befristete Übergangszahlung, dann
// Verkauf an der Börse, in den ersten Jahren mit einem Bonus obendrauf. Beides
// beschreibt dieselbe Größe — den Erlös je eingespeister Kilowattstunde im
// Jahr i — nur eben nicht mehr als eine Zahl, sondern als Verlauf.
//
// Dieses Modul erzeugt diesen Verlauf. Es entscheidet NICHTS selbst: Die
// Rechtswerte kommen aus lib/eeg-reform-config.ts (die eine Quelle für den
// Reformstand), die Marktwerte aus lib/marktwert-config.ts (mit Realitäts-Anker
// und Wächter). Hier steht nur, wie beides zusammengesetzt wird.
//
// GETEILTE RECHEN-BASIS (CLAUDE.md): Der Profilfaktor und der Anteil der
// abgeregelten Energie werden NICHT geschätzt, sondern fallen aus derselben
// Stunden-Jahressimulation an, die schon Autarkie und Speichernutzen liefert
// (simulateSolarYear). Eine zweite Annahme darüber, "wann ein Haushalt
// einspeist", wäre genau das eigene Fundament, das dieses Projekt teuer bezahlt
// hat.

import { EEG_ENTWURF_WERTE, eegUebergangBerechtigt } from "./eeg-reform-config";
import {
  DIREKTVERMARKTUNG,
  MARKTWERT_NIVEAU_CT,
  MARKTWERT_PFAD,
  marktwertImJahr,
} from "./marktwert-config";
import { YEARS, FEED_IN_YEARS } from "./constants";

/** Welche Rechtslage gerechnet wird. */
export type EinspeiseRegime = "heute" | "reform2027";

/** Woher der Erlös eines Jahres stammt — trägt die Erklärung im Ergebnis. */
export type ErloesArt = "eeg" | "uebergang" | "markt-bonus" | "markt" | "keine";

export interface RegimeJahr {
  /** Jahr der Laufzeit, 1-basiert. */
  i: number;
  /** Erlös je eingespeister Kilowattstunde, ct/kWh (nach Abzug mengenabhängiger Gebühren). */
  satzCt: number;
  /** Feste Kosten dieses Jahres in Euro (Grundgebühr der Direktvermarktung). */
  fixkosten: number;
  art: ErloesArt;
}

export interface RegimeInput {
  regime: EinspeiseRegime;
  kwp: number;
  /** Inbetriebnahmejahr. Maßgeblich für die Reform-Rechnung: Der Entwurf sieht
   *  die Geltung für Neuanlagen ab 2027 vor — geltendes Recht ist das nicht. */
  inbetriebnahmeJahr: number;
  /** Heutiger (ggf. gemischter) EEG-Satz in ct/kWh — der Status-quo-Fall. */
  heuteSatzCt: number;
  /**
   * Wird der Börsenerlös nach der Förderphase angesetzt? Aus = die Einspeisung
   * bringt danach null. Das ist die Voreinstellung, aus demselben Grund, aus dem
   * der Rechner schon heute nach 20 Jahren null ansetzt: Was in 15 Jahren an der
   * Börse zu holen ist, weiß niemand, und eine ausgedachte Zahl macht die
   * Rechnung nicht ehrlicher, nur größer.
   */
  marktErloes: boolean;
  /**
   * Profilfaktor des Haushalts aus der Stundensimulation: der mit der Preisform
   * gewichtete Anteil seiner Einspeisung. 1,0 = speist wie der deutsche
   * Solarschnitt ein, 0,8 = bekommt 20 % weniger als den Marktwert Solar, weil
   * sein Überschuss stärker im Mittagstal liegt.
   */
  profilFaktor: number;
  /** Marktwert-Niveau heute in ct/kWh (editierbar im Ergebnis). */
  niveauCt?: number;
  /** Jährliche Veränderung des Marktwerts (siehe MARKTWERT_PFAD). */
  pfad?: number;
  /** Mengenabhängige Vermarktungsgebühr, ct/kWh. */
  gebuehrCtKwh?: number;
  /** Grundgebühr der Direktvermarktung, Euro pro Jahr. */
  grundgebuehrProJahr?: number;
  /** Laufzeit in Jahren (Default: der Projekt-Horizont). */
  jahre?: number;
}

/**
 * Der anzulegende Wert für eine Anlage, die im gegebenen Jahr in Betrieb geht.
 *
 * § 49 Satz 1 des Entwurfs: Der Wert sinkt ab dem 1. August 2027 und danach
 * jeweils alle sechs Monate um 1 Prozent.
 *
 * Weil der Rechner keinen Inbetriebnahme-MONAT kennt, wird der Stand zum
 * 1. Januar des jeweiligen Jahres genommen. **Das ist die OBERE Kante des
 * Jahres, nicht die zurückhaltende Wahl** — die Degression senkt den Wert nur,
 * wer im Dezember in Betrieb geht, bekommt bis zu zwei Halbjahresschritte
 * weniger. Für die Übergangszahlung überschätzt die Rechnung eine späte
 * Inbetriebnahme damit um bis zu rund 2 %.
 *
 * Bewusst so belassen und nicht auf das Jahresende umgestellt: Beide Enden sind
 * für die jeweils andere Jahreshälfte falsch, und eine Verschiebung um einen
 * Halbjahresschritt bewegt das 25-Jahres-Ergebnis im Cent-Bereich. Wer es genau
 * braucht, müsste den Monat abfragen — dann gehört hier eine Datums-Signatur
 * hin, keine Jahreszahl. (Auflage aus dem Council vom 04.08.2026: Der frühere
 * Kommentar behauptete das Gegenteil.)
 */
export function anzulegenderWertCt(inbetriebnahmeJahr: number, w = EEG_ENTWURF_WERTE): number {
  // Stichtage: 01.08.2027, dann 01.02. und 01.08. jedes Folgejahres.
  let schritte = 0;
  for (let jahr = 2027; jahr < inbetriebnahmeJahr; jahr++) {
    schritte += jahr === 2027 ? 1 : 2; // 2027 nur der August-Stichtag
  }
  const wert = w.anzulegenderWertCt * Math.pow(1 - w.degressionProHalbjahr, schritte);
  return Math.round(wert * 100) / 100;
}

/**
 * Der Erlösverlauf über die Laufzeit.
 *
 * Heutige Konditionen: fester Satz für 20 Jahre (FEED_IN_YEARS), danach null —
 * unverändert das, was der Rechner immer schon gemacht hat.
 *
 * Entwurf ab 2027, für eine Anlage, die die Größenstaffel erfüllt:
 *   Jahr 1–3    befristete Übergangszahlung, anzulegender Wert minus 1 ct
 *   danach      Börsenerlös; solange der Bonus läuft, plus 1,5 ct/kWh
 *
 * Übergangszahlung und Bonus schließen einander aus (§ 50c Abs. 2 setzt
 * "sonstige Direktvermarktung" voraus, die Übergangszahlung ist
 * Netzbetreiberabnahme). Die 48-Monats-Frist des Bonus beginnt deshalb erst mit
 * dem Wechsel in die Direktvermarktung, nicht mit der Inbetriebnahme.
 *
 * Erfüllt die Anlage die Größenstaffel nicht (zu groß im Inbetriebnahmejahr oder
 * Inbetriebnahme ab 2030), gibt es die Übergangszahlung nicht — dann steht ab
 * dem ersten Jahr nur der Markt da.
 */
export function einspeiseVerlauf(input: RegimeInput): RegimeJahr[] {
  const jahre = input.jahre ?? YEARS;
  const out: RegimeJahr[] = [];

  if (input.regime === "heute") {
    for (let i = 1; i <= jahre; i++) {
      out.push({
        i,
        satzCt: i <= FEED_IN_YEARS ? input.heuteSatzCt : 0,
        fixkosten: 0,
        art: i <= FEED_IN_YEARS ? "eeg" : "keine",
      });
    }
    return out;
  }

  const niveau = input.niveauCt ?? MARKTWERT_NIVEAU_CT;
  const pfad = input.pfad ?? MARKTWERT_PFAD.mittel;
  const gebuehr = input.gebuehrCtKwh ?? DIREKTVERMARKTUNG.gebuehrCtKwh;
  const grundgebuehr = input.grundgebuehrProJahr ?? DIREKTVERMARKTUNG.grundgebuehrProJahr;

  const uebergangJahre = eegUebergangBerechtigt(input.kwp, input.inbetriebnahmeJahr)
    ? EEG_ENTWURF_WERTE.uebergangMonate / 12
    : 0;
  const uebergangSatz = Math.round(
    (anzulegenderWertCt(input.inbetriebnahmeJahr) - EEG_ENTWURF_WERTE.uebergangAbschlagCt) * 100,
  ) / 100;
  const bonusJahre = EEG_ENTWURF_WERTE.bonusMonate / 12;
  const bonusBerechtigt = input.kwp < EEG_ENTWURF_WERTE.bonusUnterKw;

  for (let i = 1; i <= jahre; i++) {
    if (i <= uebergangJahre) {
      // Netzbetreiberabnahme: kein Vermarkter, also keine Gebühren.
      out.push({ i, satzCt: uebergangSatz, fixkosten: 0, art: "uebergang" });
      continue;
    }
    if (!input.marktErloes) {
      out.push({ i, satzCt: 0, fixkosten: 0, art: "keine" });
      continue;
    }
    const jahreInDv = i - uebergangJahre; // 1-basiert ab dem Eintritt in die Direktvermarktung
    const bonus = bonusBerechtigt && jahreInDv <= bonusJahre ? EEG_ENTWURF_WERTE.bonusCt : 0;
    const markt = marktwertImJahr(i, niveau, pfad) * input.profilFaktor;
    out.push({
      i,
      // Die mengenabhängige Gebühr kann den Erlös nicht unter null drücken:
      // Kein Vermarkter zahlt drauf, er vermarktet dann schlicht nicht.
      satzCt: Math.max(0, markt + bonus - gebuehr),
      fixkosten: grundgebuehr,
      art: bonus > 0 ? "markt-bonus" : "markt",
    });
  }
  return out;
}

/** Mittlerer Erlös über die Laufzeit in ct/kWh — die eine Zahl für die Kachel. */
export function mittlererSatzCt(verlauf: RegimeJahr[]): number {
  if (!verlauf.length) return 0;
  const s = verlauf.reduce((a, j) => a + j.satzCt, 0) / verlauf.length;
  return Math.round(s * 100) / 100;
}

/**
 * Der Einspeisedeckel des Entwurfs als Leistung in kW (§ 9 Abs. 2b), oder
 * `undefined`, wenn er auf diese Anlage nicht anzuwenden ist.
 *
 * Er greift nur für Solaranlagen des zweiten Segments (Gebäude) mit weniger als
 * 100 Kilowatt und nicht für Steckersolargeräte bis 2 kW. Beide Schwellen
 * standen im Referentenentwurf noch in eckigen Klammern und sind erst in der
 * Kabinettsfassung entschieden — wer sie aus der älteren Fassung übernimmt,
 * deckelt Anlagen, die der Entwurf gar nicht meint.
 */
export function einspeiseDeckelKw(kwp: number, regime: EinspeiseRegime): number | undefined {
  if (regime !== "reform2027") return undefined;
  if (kwp >= EEG_ENTWURF_WERTE.einspeiseGrenzeUnterKw) return undefined;
  if (kwp <= EEG_ENTWURF_WERTE.einspeiseGrenzeSteckerBisKw) return undefined;
  return kwp * EEG_ENTWURF_WERTE.einspeiseGrenzeAnteil;
}

/**
 * Der Profilfaktor eines Haushalts: Was ist seine eingespeiste Kilowattstunde
 * wert, verglichen mit einer Anlage, die ihren gesamten Ertrag einspeist?
 *
 * Beide Seiten kommen aus DERSELBEN Simulation und derselben Preisform, deshalb
 * misst der Quotient genau einen Effekt — was der Eigenverbrauch mit dem Wert
 * des Restes macht — und nicht nebenbei den Unterschied zwischen unserem
 * Referenzjahr und dem deutschen Wetterjahr 2024/25.
 *
 * Gemessene Größenordnung (Süd-Dach, 3.800 kWh Haushalt): ohne Speicher rund
 * 0,92–0,98, mit Speicher 0,68–0,82. Der Speicher senkt ihn, weil er dem
 * Haushalt die gut bezahlte Rand-Einspeisung am Morgen und Abend wegnimmt und
 * die tief bezahlte Mittagsspitze übrig lässt — er verdient sein Geld über den
 * Eigenverbrauch, nicht über den Einspeisepreis.
 */
export function profilFaktorAus(sim: {
  feedInKwh: number;
  feedInWeightedKwh: number;
  annualYield: number;
  productionWeightedKwh: number;
}): number {
  if (sim.feedInKwh <= 0 || sim.annualYield <= 0 || sim.productionWeightedKwh <= 0) return 1;
  const einspeise = sim.feedInWeightedKwh / sim.feedInKwh;
  const erzeugung = sim.productionWeightedKwh / sim.annualYield;
  return einspeise / erzeugung;
}
