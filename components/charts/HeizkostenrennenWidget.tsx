"use client";

import { useMemo } from "react";
import RaceChart, { MONATE_KURZ, type RaceEreignis } from "./RaceChart";
import { WIDGETS } from "../../lib/widget-registry";
import { fmtEuroVoll, fmtEuroK, formatDataAsOf } from "../../lib/atlas-format";
import { heizkostenrennen, heizTagDatum, HEIZKOSTENRENNEN_HAUS, HEIZGRENZE_C, type Heizkostenrennen } from "../../lib/heizkostenrennen";
import { BIO_TREPPE_STUFEN } from "../../lib/greengas-config";
import { greenGasApplies } from "../../lib/fossil-reference";
import { DEFAULT_HEATPUMP_CONFIG } from "../../lib/heatpump-config";
import { PERSONEN } from "../../lib/constants";

// Das Heizkosten-Rennen: EIN unsaniertes Einfamilienhaus, neue Gasheizung gegen
// Wärmepumpe, 20 Jahre. Beide Linien zeichnen Tag für Tag, was das Haus bis
// dahin fürs Heizen ausgegeben hat. Die Wärmepumpe startet mit ihrer (geförderten)
// Anschaffung vorn; wo die Gas-Linie sie kreuzt, ist der Mehrpreis zurück —
// dasselbe Jahr wie die Amortisation des Wärmepumpen-Rechners (lib/heizkostenrennen.ts
// nimmt dessen Jahreskosten und verteilt sie nur).
//
// Die Bewegung kommt aus dem echten Wetter: Der Heizanteil eines Jahres folgt
// den Gradtagen des wiederholten Kalenderjahrs (DWD-Tagesmittel), kalte Winter
// wiegen mehr als milde. Zweiter Aufrufer des geteilten Race-Charts — hier steht
// nur, WAS dieses Rennen zeigt: die zwei Reihen, die Ereignisse, die Texte.

interface Props {
  onsite?: boolean;
  branding?: boolean;
  showEmbed?: boolean;
  autoplay?: boolean;
}

/** Die Ereignisse dieses Rennens — als Funktion, damit sie testbar sind. */
export function heizkostenrennenEreignisse(rennen: Heizkostenrennen): RaceEreignis[] {
  const T = rennen.tage;
  const gas = rennen.gas.kosten;
  const wp = rennen.wp.kosten;
  const r = rennen.rechner;
  const datumVon = (d: number) => heizTagDatum(rennen, d);
  const liste: RaceEreignis[] = [
    { tag: 0, jahr: rennen.startJahr, label: `Zwei neue Heizungen · ${fmtEuroVoll(rennen.wp.investition)} gegen ${fmtEuroVoll(rennen.gas.investition)}`,
      text: `Die Wärmepumpe kostet nach Förderung ${fmtEuroVoll(rennen.wp.investition)}, die neue Gasheizung ${fmtEuroVoll(rennen.gas.investition)}. Ab jetzt zählt jeder Tag Heizen.` },
  ];
  // Erstes Jahr: der Tag mit dem steilsten Anstieg (kältester Tag) und danach der
  // flachste (Sommer) — nur, wenn die Tage wirklich verschieden sind.
  const ende = Math.min(T, 365);
  let hoch = 1, tief = 1;
  const delta = (reihe: Float64Array, d: number) => reihe[d] - reihe[d - 1];
  for (let d = 1; d <= ende; d++) if (delta(gas, d) > delta(gas, hoch)) hoch = d;
  tief = hoch;
  for (let d = hoch; d <= ende; d++) if (delta(gas, d) < delta(gas, tief)) tief = d;
  if (hoch >= 1 && tief > hoch && delta(gas, hoch) > 3 * delta(gas, tief)) {
    liste.push(
      { tag: hoch, jahr: datumVon(hoch).jahr, label: "Winter: die Heizung läuft",
        text: `An kalten Tagen steigen beide Linien steil. Aus einer Kilowattstunde Strom macht die Wärmepumpe rund ${r.jaz.toLocaleString("de-DE")} Kilowattstunden Wärme — deshalb bleibt ihr Anstieg flacher als der der Gasheizung.` },
      { tag: tief, jahr: datumVon(tief).jahr, label: "Sommer: nur Warmwasser",
        text: `Liegt das Tagesmittel über ${HEIZGRENZE_C} °C, heizt niemand. Beide Linien laufen fast flach — es bleiben Warmwasser, Grundpreis und Wartung.` },
    );
  }
  // Die Stufen der Beimischungspflicht (§ 43 GModG) — dieselbe Quelle wie Rechner
  // und Ratgeber. Nur, wenn die Pflicht in dieser Rechnung überhaupt greift.
  if (HEIZKOSTENRENNEN_HAUS.greenGas && greenGasApplies({ fuelKind: "gas", fossilInvest: rennen.gas.investition })) {
    BIO_TREPPE_STUFEN.forEach((stufe, idx) => {
      const i = stufe.year - rennen.startJahr + 1; // Betriebsjahr
      if (i < 1 || i > rennen.jahre) return;
      const tag = rennen.ersterTag[12 * (i - 1) + 1];
      const erste = idx === 0;
      liste.push({
        tag, jahr: stufe.year, linie: erste,
        label: erste ? `Grüngas-Pflicht beginnt · ${stufe.pct} %` : `Grüngas-Pflicht · ${stufe.pct} %`,
        text: erste
          ? `Ab ${stufe.year} muss eine neue Gasheizung mindestens ${stufe.pct} % Biomethan beziehen. Das ist teurer als Erdgas — die Gas-Linie wird von hier an steiler.`
          : `Die Quote steigt auf ${stufe.pct} %. Jede Stufe macht die Kilowattstunde Gas teurer, die Gas-Linie zieht weiter an.`,
        bild: erste ? { text: `Grüngas-Pflicht ab ${stufe.year}`, position: "unten" } : undefined,
      });
    });
  }
  if (rennen.bezahltTag !== null && rennen.bezahltTag > 0) {
    const d = datumVon(rennen.bezahltTag);
    liste.push({ tag: rennen.bezahltTag, jahr: d.jahr, linie: true,
      label: `Mehrpreis zurück · ${MONATE_KURZ[d.monat]} ${d.jahr}`,
      text: "Die Linien kreuzen sich: Was die Wärmepumpe mehr gekostet hat, ist über die günstigeren Heizjahre zurück. Ab hier liegt die Wärmepumpe vorn.",
      bild: { text: `Mehrpreis zurück · ${MONATE_KURZ[d.monat]} ${d.jahr}`, position: "oben", farbe: "--color-positive" } });
  }
  const ersparnis = gas[T] - wp[T];
  liste.push({
    tag: T, jahr: datumVon(T).jahr,
    label: ersparnis >= 0 ? `Ersparnis nach ${rennen.jahre} Jahren: ${fmtEuroVoll(ersparnis)}` : `Mehrkosten nach ${rennen.jahre} Jahren: ${fmtEuroVoll(-ersparnis)}`,
    text: `Endstand: ${fmtEuroVoll(gas[T])} mit der Gasheizung gegen ${fmtEuroVoll(wp[T])} mit der Wärmepumpe, Anschaffung eingerechnet.`,
  });
  return liste.sort((a, b) => a.tag - b.tag);
}

export default function HeizkostenrennenWidget({ onsite, branding, showEmbed, autoplay }: Props) {
  const rennen = useMemo(() => heizkostenrennen(), []);
  const ereignisse = useMemo(() => heizkostenrennenEreignisse(rennen), [rennen]);
  const r = rennen.rechner;
  const cfg = DEFAULT_HEATPUMP_CONFIG;
  const haushalt = PERSONEN.find((p) => p.count === HEIZKOSTENRENNEN_HAUS.personen);
  const fenster = rennen.wetterFenster;

  return (
    <RaceChart
      widget={WIDGETS.heizkostenrennen}
      kamera={{ key: "wp", label: rennen.wp.label, kurz: rennen.wp.kurz, farbe: "--color-accent", werte: rennen.wp.kosten }}
      anderer={{ key: "gas", label: rennen.gas.label, kurz: rennen.gas.kurz, farbe: "--color-text-primary", werte: rennen.gas.kosten }}
      startJahr={rennen.startJahr}
      jahre={rennen.jahre}
      ersterTag={rennen.ersterTag}
      datumVon={(d) => heizTagDatum(rennen, d)}
      ereignisse={ereignisse}
      fmt={fmtEuroVoll}
      fmtKurz={fmtEuroK}
      titelHilfe={{
        title: "Das Beispielhaus",
        ariaLabel: "Angaben zum Beispielhaus",
        inhalt: (
          <>
            Ein freistehendes Einfamilienhaus im Bestand, {rennen.haus.wohnflaeche} m², {rennen.haus.daemmung}, alte Heizkörper,{" "}
            {haushalt ? `${haushalt.label} Personen` : `${rennen.haus.personen} Personen`}, {rennen.jahre} Jahre,{" "}
            {fenster ? `die Winter der Jahre ${fenster.von}–${fenster.bis}` : "ein Referenzjahr"}: Wer hat wann mehr fürs Heizen bezahlt?
            Die Wärmepumpe: Luft/Wasser, Arbeitszahl {r.jaz.toLocaleString("de-DE")}, {fmtEuroVoll(r.investBrutto)} vor und{" "}
            {fmtEuroVoll(r.investNetto)} nach Bundesförderung ({fmtEuroVoll(r.beg.amount)}), Strom {Math.round(cfg.wpTarif * 100)} ct/kWh mit{" "}
            {Math.round(cfg.stromInflation * 100)} % Anstieg pro Jahr. Die neue Gasheizung: {fmtEuroVoll(r.gasInvest)}, Gaspreis mit der
            gesetzlichen Beimischungspflicht nach dem realistischen Preispfad des IW-Reports. Beide Seiten tragen Grundpreis und Wartung.
            Die Menge je Jahr ist die des Wärmepumpen-Rechners; das Wetter verteilt sie nur auf die Tage — nach den Gradtagen
            des Deutschen Wetterdiensts, kalte Winter wiegen mehr als milde. Näherungswerte ohne Gewähr.
          </>
        ),
      }}
      zeitraumHilfe={{
        title: "Was hier zählt",
        ariaLabel: "Was als Heizkosten zählt",
        inhalt: (
          <>
            Alles, was das Haus bis zu diesem Tag fürs Heizen ausgegeben hat: die Anschaffung der Heizung, dann Gas bzw. Strom
            für Heizung und Warmwasser, Grundpreis und Wartung. Wo die Gas-Linie die Wärmepumpe kreuzt, ist deren Mehrpreis
            zurück. Die Zeitachse wächst vom ersten Jahr bis zum ganzen Zeitraum; die Geldskala folgt der Wärmepumpen-Linie —
            die Gasheizung liegt anfangs unter dem Bild und wird am Rand mit ihrer Zahl geführt, bis sie hereinwächst.
          </>
        ),
      }}
      ariaLabel={(stand, wpWert, gasWert) => `Heizkosten ${rennen.startJahr} bis ${stand}: ${rennen.gas.label} ${fmtEuroVoll(gasWert)}, ${rennen.wp.label} ${fmtEuroVoll(wpWert)}`}
      exportNote="Beispielhaus, Modellrechnung von solar-check.io · Näherungswerte, ohne Gewähr"
      dateiname="heizkosten-gasheizung-und-waermepumpe"
      onsite={onsite}
      branding={branding}
      showEmbed={showEmbed}
      autoplay={autoplay}
      stand={formatDataAsOf(cfg.validFrom)}
    />
  );
}
