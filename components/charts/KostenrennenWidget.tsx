"use client";

import { useMemo } from "react";
import RaceChart, { MONATE_KURZ, type RaceEreignis } from "./RaceChart";
import { WIDGETS } from "../../lib/widget-registry";
import { fmtEuroVoll, fmtEuroK, formatDataAsOf } from "../../lib/atlas-format";
import { PERSONEN, FEED_IN_YEARS } from "../../lib/constants";
import type { Kostenrennen } from "../../lib/kostenrennen";
import { tagesverlauf, tagDatum, type Tagesverlauf } from "../../lib/kostenrennen-tage";

// Das Stromkosten-Rennen: EIN Haushalt, ohne und mit Anlage, 25 Jahre. Beide
// Linien zeichnen Tag für Tag, was der Haushalt bis dahin für Strom ausgegeben
// hat. Der PV-Haushalt startet mit der Anschaffung vorn; wo die Linie ohne
// Anlage seine kreuzt, ist die Anlage bezahlt — derselbe Monat wie die
// Amortisation des Rechners (lib/kostenrennen.ts rechnet mit denselben Funktionen).
//
// Die Bewegung kommt aus dem echten Wetter: Jeder Monat trägt die Strahlung des
// wiederholten Kalenderjahrs (DWD-Monatsraster), jeder Tag darin seinen Anteil
// nach der Tagesstrahlung der DWD-Stationen (lib/kostenrennen-tage.ts). Eine
// Regenwoche ist flach, eine Hochdrucklage steil, kein Jahr gleicht dem anderen.
//
// Die Darstellung — mitlaufende Achsen, Kamera, Tempo, Zeitleiste, Bild, Video —
// ist der geteilte Race-Chart (components/charts/RaceChart.tsx). Hier steht
// nur, WAS dieses Rennen zeigt: die zwei Reihen, die Ereignisse, die Texte.

interface Props {
  rennen: Kostenrennen;
  onsite?: boolean;
  branding?: boolean;
  showEmbed?: boolean;
  /** Läuft von selbst los, sobald die Karte im Bild ist (nicht bei reduzierter Bewegung). */
  autoplay?: boolean;
  /** „mini": Kurzfassung für redaktionelle Seiten (nur Chart, verlinkt auf die Seite des Rennens). */
  variante?: "voll" | "mini";
  /** Stichtag der Preise (ISO), für die Quellen-Kante. */
  preiseStandIso?: string;
}

/** Die Ereignisse dieses Rennens — als Funktion, damit sie testbar sind. */
export function kostenrennenEreignisse(rennen: Kostenrennen, verlauf: Tagesverlauf): RaceEreignis[] {
  const T = verlauf.tage;
  const pv = rennen.laeufer.find((l) => l.hatPv)!;
  const ohne = rennen.laeufer.find((l) => l.key === rennen.referenzKey)!;
  const kPv = verlauf.kosten[pv.key];
  const kOhne = verlauf.kosten[ohne.key];
  const datumVon = (d: number) => tagDatum(verlauf, rennen.startJahr, d);
  const jahrVon = (d: number) => datumVon(d).jahr;
  const liste: RaceEreignis[] = [
    { tag: 0, jahr: rennen.startJahr, label: `Anlage gekauft · ${fmtEuroVoll(pv.investition)}`,
      text: "Der PV-Haushalt startet mit der Anschaffung, der andere bei null. Ab jetzt zählt jeder Tag Strom." },
  ];
  // Zwei Hinweise im ersten Jahr: Wo die PV-Linie am Ende des Winters am
  // höchsten steht und am Ende des Sommers am tiefsten.
  const ende = Math.min(T, 365);
  let hoch = 1, tief = 1;
  for (let d = 1; d <= ende; d++) if (kPv[d] > kPv[hoch]) hoch = d;
  for (let d = hoch; d <= ende; d++) if (kPv[d] < kPv[tief] || tief < hoch) tief = d;
  if (hoch >= 30 && tief > hoch && kPv[hoch] - kPv[tief] >= 50) {
    liste.push(
      { tag: hoch, jahr: jahrVon(hoch), label: "Winter: wenig Sonne", text: "Die Anlage liefert wenig, der Haushalt kauft fast alles zu — die Rechnung wächst beinahe so schnell wie ohne Anlage." },
      { tag: tief, jahr: jahrVon(tief), label: "Sommer: die Anlage spart", text: "Eigenverbrauch und Einspeisung bringen mehr, als der Reststrom kostet — die Linie fällt sogar." },
    );
  }
  // Die Kreuzung: erster Tag im Bezahlt-Monat, an dem ohne ≥ mit.
  const bezahltMonat = rennen.ueberholMonat[pv.key];
  if (bezahltMonat !== null) {
    const von = verlauf.ersterTag[bezahltMonat];
    const bis = bezahltMonat < 12 * verlauf.jahre ? verlauf.ersterTag[bezahltMonat + 1] - 1 : T;
    let bezahltTag = bis;
    for (let d = von; d <= bis; d++) if (kOhne[d] >= kPv[d]) { bezahltTag = d; break; }
    const d = datumVon(bezahltTag);
    liste.push({ tag: bezahltTag, jahr: d.jahr, linie: true,
      label: `Anlage bezahlt · ${MONATE_KURZ[d.monat]} ${d.jahr}`,
      text: "Die Linien kreuzen sich: Was die Anlage gekostet hat, ist über die gesparte Stromrechnung zurück. Ab hier liegt der PV-Haushalt vorn.",
      bild: { text: `Anlage bezahlt · ${MONATE_KURZ[d.monat]} ${d.jahr}`, position: "oben", farbe: "--color-positive" } });
  }
  // Nach FEED_IN_YEARS endet die EEG-Vergütung (derselbe Schnitt wie im
  // Rechner), ab da steigt die PV-Linie sichtbar steiler — ohne Marke liest
  // sich der Knick als Fehler.
  if (FEED_IN_YEARS < verlauf.jahre) {
    const tag = verlauf.ersterTag[12 * FEED_IN_YEARS + 1];
    liste.push({ tag, jahr: jahrVon(tag), linie: true, label: "Einspeisevergütung endet",
      text: `Nach ${FEED_IN_YEARS} Jahren gibt es für eingespeisten Strom nichts mehr. Die Anlage spart weiter den eigenen Verbrauch, die Linie steigt steiler.`,
      bild: { text: `Einspeisevergütung endet · ${jahrVon(tag)}`, position: "unten" } });
  }
  const ersparnis = kOhne[T] - kPv[T];
  liste.push({
    tag: T, jahr: jahrVon(T),
    label: ersparnis >= 0 ? `Ersparnis nach ${rennen.jahre} Jahren: ${fmtEuroVoll(ersparnis)}` : `Mehrkosten nach ${rennen.jahre} Jahren: ${fmtEuroVoll(-ersparnis)}`,
    text: `Endstand: ${fmtEuroVoll(kOhne[T])} ohne Anlage gegen ${fmtEuroVoll(kPv[T])} mit Anlage, Anschaffung eingerechnet.`,
  });
  return liste.sort((a, b) => a.tag - b.tag);
}

export default function KostenrennenWidget({ rennen, onsite, branding, showEmbed, autoplay, preiseStandIso, variante }: Props) {
  const verlauf = useMemo(() => tagesverlauf(rennen), [rennen]);
  const ereignisse = useMemo(() => kostenrennenEreignisse(rennen, verlauf), [rennen, verlauf]);
  const pv = rennen.laeufer.find((l) => l.hatPv)!;
  const ohne = rennen.laeufer.find((l) => l.key === rennen.referenzKey)!;
  const haushalt = PERSONEN[2];
  const fenster = rennen.wetterFenster;

  return (
    <RaceChart
      widget={WIDGETS.kostenrennen}
      kamera={{ key: pv.key, label: pv.label, kurz: pv.kurz, farbe: "--color-accent", werte: verlauf.kosten[pv.key] }}
      anderer={{ key: ohne.key, label: ohne.label, kurz: ohne.kurz, farbe: "--color-text-primary", werte: verlauf.kosten[ohne.key] }}
      startJahr={rennen.startJahr}
      jahre={rennen.jahre}
      ersterTag={verlauf.ersterTag}
      datumVon={(d) => tagDatum(verlauf, rennen.startJahr, d)}
      ereignisse={ereignisse}
      fmt={fmtEuroVoll}
      fmtKurz={fmtEuroK}
      titelHilfe={{
        title: "Der Beispielhaushalt",
        ariaLabel: "Angaben zum Beispielhaushalt",
        inhalt: (
          <>
            Ein Haushalt, {rennen.jahre} Jahre, {fenster ? `das Wetter der Jahre ${fenster.von}–${fenster.bis}` : "ein Referenzjahr"}: Wer hat wann mehr für Strom bezahlt?{" "}
            {haushalt.label} Personen mit {haushalt.verbrauch.toLocaleString("de-DE")} kWh Jahresverbrauch, teils im Homeoffice.
            Die Anlage: {pv.kwp} kWp{pv.speicherKwh > 0 ? ` mit ${pv.speicherKwh} kWh Speicher` : " ohne Speicher"} für {fmtEuroVoll(pv.investition)},
            Ertrag {rennen.annahmen.ertragKwp.toLocaleString("de-DE")} kWh je kWp (deutscher Schnitt bei optimaler Ausrichtung), Teileinspeisung zu{" "}
            {rennen.annahmen.einspeisungCt.toLocaleString("de-DE")} ct/kWh über {FEED_IN_YEARS} Jahre, danach nichts mehr für eingespeisten Strom. Strompreis {rennen.annahmen.strompreisCt.toLocaleString("de-DE")} ct/kWh,
            Anstieg {rennen.annahmen.steigerungPct.toLocaleString("de-DE")} % pro Jahr. Wetter: {rennen.annahmen.wetter}; innerhalb des Monats nach der
            Tagesstrahlung der DWD-Stationen verteilt — Näherungswerte ohne Gewähr.
          </>
        ),
      }}
      zeitraumHilfe={{
        title: "Was hier zählt",
        ariaLabel: "Was als Stromkosten zählt",
        inhalt: (
          <>
            Alles, was der Haushalt bis zu diesem Tag für Strom ausgegeben hat: die Stromrechnung mit steigendem Preis, beim
            PV-Haushalt dazu die Anschaffung der Anlage, abzüglich der Einspeisevergütung. Wo sich die Linien kreuzen, ist die
            Anlage bezahlt. Die Zeitachse wächst vom ersten Jahr bis zum ganzen Zeitraum; die Geldskala folgt der PV-Linie —
            der Haushalt ohne Anlage liegt anfangs unter dem Bild und wird am Rand mit seiner Zahl geführt, bis er hereinwächst.
          </>
        ),
      }}
      ariaLabel={(stand, mit, ohneWert) => `Stromkosten ${rennen.startJahr} bis ${stand}: ${ohne.label} ${fmtEuroVoll(ohneWert)}, ${pv.label} ${fmtEuroVoll(mit)}`}
      exportNote="Beispielhaushalt, Modellrechnung von solar-check.io · Näherungswerte, ohne Gewähr"
      dateiname="stromkosten-mit-und-ohne-solaranlage"
      onsite={onsite}
      branding={branding}
      showEmbed={showEmbed}
      autoplay={autoplay}
      variante={variante}
      stand={preiseStandIso ? formatDataAsOf(preiseStandIso) : undefined}
    />
  );
}
