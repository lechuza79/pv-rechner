// EINE Quelle für die Aussage „wie steht dieser Ort je Einwohner da".
//
// WARUM ES DIESE DATEI GIBT (Audit 19.08.2026, 18 echte Briefe):
// Der Outreach-Brief rechnete seinen Vergleich selbst, die Atlas-Gemeindeseite
// rechnete ihren selbst. Beide Rechnungen waren richtig und maßen etwas
// anderes — der Brief die privaten Dächer, die Seite die Gesamtleistung.
// Melsungen stand im Brief mit „39 % mehr Solarleistung als im Durchschnitt in
// Hessen" und im ERSTEN ABSATZ der Seite, die derselbe Brief zum Nachprüfen
// verlinkt, mit „6 % unter dem Hessen-Schnitt, hier ist also noch viel Luft
// nach oben". Eine Pressestelle liest das nicht als zwei Messgrößen, sondern
// als Widerspruch. Vier der achtzehn Briefe waren betroffen.
//
// Die Sofortmaßnahme war eine Bremse: Der Brief schwieg, sobald die
// Gesamtleistung unter dem Landesschnitt lag — und verlor damit seine einzige
// eingängige Zahl. Die Lösung ist nicht Schweigen, sondern dass BEIDE
// Oberflächen dieselben beiden Größen kennen und die schwächere ausdrücklich
// benennen („… für alle Anlagen"). Dieselbe Systematik wie bei den
// Einheiten-Formatierern und der Bio-Treppe: zwei Rechnungen driften, eine
// nicht.
//
// Reine Funktionen, keine DB- und keine Next-Importe — der Brief lädt sie
// server-only, die Gemeindeseite im Server-Render, ein Test ohne beides.

import { fmtAnteilProzent, fmtWattProKopf } from "./atlas-format";

/** Segmente, die als „auf privaten Dächern" zählen.
 *
 *  BALKONKRAFTWERKE GEHÖREN NICHT DAZU, und das ist der zweite Befund desselben
 *  Audits: Der Eigentümer-Filter der Gemeindeseite versteht unter „Privat"
 *  zurecht alles in Bürgerhand, also `privat_dach` PLUS `steckersolar` — ein
 *  Balkongerät gehört einem Bürger. Diese Größe hier ist eine andere: Sie sagt,
 *  was auf den DÄCHERN steht, und ein Balkongerät hängt am Geländer.
 *
 *  Gemessen an Eichenzell: 1.185 Wp je Einwohner auf den Dächern gegen 1.204 Wp
 *  in Bürgerhand — 199 Balkongeräte mit zusammen 228 kWp. Beide Zahlen standen
 *  auf DERSELBEN Seite, und die Auszeichnung („die meiste private Solarleistung
 *  auf den Dächern je Einwohner", 1.185 Wp) rechnete schon immer so. Der
 *  Unterschied ist also nicht zu beseitigen, sondern zu benennen: Diese Datei
 *  ist die Dach-Größe, `atlasOwnerSlice(…, "privat")` die Eigentümer-Größe.
 *  Wer sie hier zusammenwirft, macht die Auszeichnung zur dritten Zahl. */
export const PRIVATE_DACH_SEGMENTE = ["privat_dach"] as const;

type SegRow = { segment: string; kwp: number };
type VergleichAtlas = { solar: { total_kwp: number; by_segment: SegRow[] } };

/** Eine Größe im Vergleich zum Landesschnitt. */
export type VergleichGroesse = {
  /** Wp je Einwohner in dieser Kommune. */
  proKopf: number;
  /** Wp je Einwohner im Bundesland — DIESELBE Messgröße, sonst vergleicht die
   *  Zahl private Dächer mit einem Gesamtbestand. */
  landProKopf: number;
  /** Abstand als Anteil: 0,39 = 39 % über dem Landesschnitt, −0,06 = 6 % darunter. */
  abstand: number;
};

export type GemeindeVergleich = {
  /** Was auf den privaten Dächern steht — die Zahl über die Bürger. */
  privat: VergleichGroesse | null;
  /** Alle Anlagen zusammen, Freifläche und Gewerbe eingeschlossen. */
  gesamt: VergleichGroesse | null;
  /** Name des Bundeslands für die Bezugsangabe („Hessen"). */
  blName: string;
};

function kwpVon(a: VergleichAtlas, segmente: readonly string[]): number {
  return a.solar.by_segment
    .filter((s) => segmente.includes(s.segment))
    .reduce((sum, s) => sum + s.kwp, 0);
}

function groesse(
  kwp: number,
  pop: number | null | undefined,
  landKwp: number,
  landPop: number | null | undefined,
): VergleichGroesse | null {
  if (!pop || pop <= 0 || !landPop || landPop <= 0) return null;
  const proKopf = (kwp * 1000) / pop;
  const landProKopf = (landKwp * 1000) / landPop;
  if (!(landProKopf > 0)) return null;
  return { proKopf, landProKopf, abstand: proKopf / landProKopf - 1 };
}

/**
 * Beide Größen einer Kommune gegen ihr Bundesland — die einzige Stelle, an der
 * dieser Vergleich gerechnet wird.
 */
export function gemeindeVergleich(opts: {
  atlas: VergleichAtlas;
  population: number | null | undefined;
  blAtlas: VergleichAtlas;
  blPopulation: number | null | undefined;
  blName: string;
}): GemeindeVergleich {
  const { atlas, population, blAtlas, blPopulation, blName } = opts;
  return {
    privat: groesse(
      kwpVon(atlas, PRIVATE_DACH_SEGMENTE),
      population,
      kwpVon(blAtlas, PRIVATE_DACH_SEGMENTE),
      blPopulation,
    ),
    gesamt: groesse(atlas.solar.total_kwp, population, blAtlas.solar.total_kwp, blPopulation),
    blName,
  };
}

/**
 * Ab wann ein Vorsprung überhaupt einer ist.
 *
 * Unter zehn Prozent ist der Unterschied für einen Leser keiner, und er wäre
 * auch keiner: Die Einwohnerzahlen stammen aus einer anderen Quelle als die
 * Anlagendaten, und beide haben ihren eigenen Stichtag. Stand vorher als
 * `MIN_VERGLEICH` im Brief — dort war er unsichtbar für die Seite, die
 * denselben Vergleich zieht.
 */
export const MIN_VERGLEICH = 0.1;

/**
 * Ab wann aus dem Prozentsatz ein Vielfaches wird.
 *
 * „280 % über dem Schnitt" liest niemand als Größenordnung, „das 3,8-fache"
 * schon. Der Wert ist der ABSTAND, nicht das Vielfache: 2 bedeutet „ab dem
 * Dreifachen".
 *
 * DASS DIESE ZAHL HIER STEHT, IST DER PUNKT: Brief und Seite trugen beide einen
 * Kommentar „ab dem Dreifachen", der Brief schaltete bei Abstand ≥ 2 um (also
 * beim Dreifachen), die Seite erst bei ≥ 3 (beim Vierfachen) — und der
 * Brief-Kommentar behauptete dazu „dieselbe Schwelle wie auf der
 * Gemeindeseite". Zwei Zahlen, ein Kommentar, keine Prüfung.
 */
export const VIELFACHES_AB = 2;

/**
 * Der Abstand als Textstück, ohne Bezugsgröße („39 % über", „das 3,8-fache
 * des").
 *
 * Bezug und Satzbau bleiben beim Aufrufer: Der Brief schreibt „im Durchschnitt
 * in Hessen", die Seite „dem Hessen-Schnitt". Der Wortlaut darf sich
 * unterscheiden, die ZAHL nicht — und die kommt aus `abstand`.
 */
export function abstandTeile(abstand: number): { vielfaches: string | null; prozent: string } {
  const vielfaches =
    abstand >= VIELFACHES_AB
      ? (abstand + 1).toLocaleString("de-DE", { maximumFractionDigits: 1 })
      : null;
  // Das Vorzeichen trägt der Satz („über"/„unter"), deshalb hier der Betrag.
  return { vielfaches, prozent: fmtAnteilProzent(Math.abs(abstand)) };
}

/**
 * Der Einleitungssatz der Gemeindeseite zur Pro-Kopf-Lage — und damit der Satz,
 * an dem sich der Brief messen lassen muss.
 *
 * DREI FÄLLE, UND NUR DER MITTLERE IST NEU:
 *
 * 1. Gesamtleistung über dem Landesschnitt → wie bisher, die Gesamtzahl trägt
 *    den Satz. Ein Brief, der die privaten Dächer lobt, widerspricht dem nicht.
 * 2. Gesamtleistung darunter, private Dächer darüber → DER FALL AUS DEM AUDIT.
 *    Die starke Größe steht vorn, die schwächere dahinter — mit dem Zusatz
 *    „für alle Anlagen", der den scheinbaren Widerspruch auflöst, weil er die
 *    andere Messgröße benennt (Formulierung des Betreibers, 20.08.2026). Ohne
 *    diesen Zusatz steht wieder eine Zahl gegen eine andere.
 * 3. Beides darunter → es gibt nichts herauszustellen, und Erfinden ist keine
 *    Option. Der Satz bleibt, wie er war. Der Brief schweigt in diesem Fall
 *    ohnehin: Sein Vergleich liegt dann unter `MIN_VERGLEICH`.
 */
/**
 * Ein Stück Satz, das auf eine Einstellung weiter unten zeigen darf.
 *
 * WARUM DER SATZ ZERLEGT WIRD: Er nennt zwei Messgrößen nebeneinander, und der
 * Leser kann beide unten im Bestandsblock nachsehen — aber nur, wenn er den
 * Umschalter findet und weiß, auf welche Stellung. Der Verweis nimmt ihm
 * beides ab. Genau deshalb steht das Ziel HIER und nicht beim Aufrufer: Wer
 * die Formulierung ändert, sieht in derselben Zeile, worauf sie zeigt.
 *
 * `ziel` ist die Messgröße, nicht die Adresse — welcher Anker daraus wird,
 * entscheidet die Oberfläche. Diese Datei kennt keine URLs.
 */
export type SatzTeil = { text: string; ziel?: "privat" | "alle" };

/** Aus Satzteilen wieder ein Satz. Gegenstück zu `…Teile()`/`fmt…()` in
 *  lib/atlas-format.ts — eine Quelle, zwei Ausgabeformen. */
export const satzAusTeilen = (teile: SatzTeil[]): string => teile.map((t) => t.text).join("");

export function proKopfSatz(v: GemeindeVergleich): string {
  return satzAusTeilen(proKopfSatzTeile(v));
}

export function proKopfSatzTeile(v: GemeindeVergleich): SatzTeil[] {
  const { privat, gesamt, blName } = v;
  if (!gesamt) return [];

  const abstandText = (g: VergleichGroesse, richtung: "über" | "unter") => {
    const t = abstandTeile(g.abstand);
    return t.vielfaches
      ? `das ${t.vielfaches}-fache des ${blName}-Schnitts`
      : `${t.prozent} ${richtung} dem ${blName}-Schnitt`;
  };

  // Fall 2: Die Seite stellt das Positive heraus und benennt die andere Größe.
  //
  // Beide Messgrößen zeigen auf ihre Stellung im Bestandsblock: Der Satz nennt
  // zwei Zahlen aus zwei Grundgesamtheiten, und wer das nachsehen will, soll
  // nicht raten müssen, welcher Umschalter gemeint ist.
  if (gesamt.abstand < 0 && privat && privat.abstand >= MIN_VERGLEICH) {
    return [
      { text: "Je Einwohner stehen " },
      { text: "auf den privaten Dächern", ziel: "privat" },
      { text: ` ${fmtWattProKopf(Math.round(privat.proKopf))} Photovoltaik — ${abstandText(privat, "über")}, jedoch ` },
      { text: `${abstandTeile(gesamt.abstand).prozent} unter dem Durchschnitt in ${blName} ` },
      { text: "für alle Anlagen", ziel: "alle" },
      { text: "." },
    ];
  }

  // Fall 1 und 3: die Gesamtleistung trägt den Satz.
  //
  // AUCH HIER EIN VERWEIS, obwohl nichts zu verwechseln ist: Die Zahl steht
  // unten im Bestandsblock noch einmal, und der Leser soll sie dort finden,
  // ohne den richtigen Umschalter zu erraten. Bis zum 21.08.2026 verwies nur
  // der Konfliktfall — auf einer Seite wie Biebergemünd, die überall vorn
  // liegt, führte deshalb gar nichts nach unten.
  //
  // Verwiesen wird auf „Je Einwohner", nicht auf die Zahl: Das ist der Name der
  // Messgröße, und genau so heißt die Kachel, auf der man landet.
  const wert = fmtWattProKopf(Math.round(gesamt.proKopf));
  const ziel = { text: "Je Einwohner", ziel: "alle" as const };
  return gesamt.abstand >= 0
    ? [ziel, { text: ` sind das ${wert} Photovoltaik — ${abstandText(gesamt, "über")}.` }]
    : [
        ziel,
        { text: ` sind das ${wert} — ${abstandText(gesamt, "unter")}, hier ist also noch viel Luft nach oben.` },
      ];
}

/**
 * Der Vergleichssatz des Anschreibens — dieselbe Zahl wie im Satz oben, anderer
 * Satzbau.
 *
 * `bezug` ist die Ortsangabe im Dativ („in Hessen"), weil der Brief sie in
 * einen laufenden Satz stellt. Leerer String heißt: keine Aussage — der Ort
 * liegt nicht genug über dem Schnitt, und wir bieten eine Meldung an, keine
 * Bilanz.
 */
export function briefVergleichSatz(v: GemeindeVergleich, bezug: string): string {
  const p = v.privat;
  if (!p || !Number.isFinite(p.abstand) || p.abstand < MIN_VERGLEICH) return "";
  const t = abstandTeile(p.abstand);
  return t.vielfaches
    ? ` Je Einwohner steht auf den privaten Dächern das ${t.vielfaches}-fache des Durchschnitts ${bezug}.`
    : ` Je Einwohner steht auf den privaten Dächern ${t.prozent} mehr Solarleistung als im Durchschnitt ${bezug}.`;
}
