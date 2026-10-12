"use client";
import {useWidgetReferenceData} from '../dashboard/WidgetReferenceData';
import EnergyWidgetFrame from '../energy/EnergyWidgetFrame';
import {WidgetSetting} from '../dashboard/WidgetSetting';

import { useMemo, useState } from "react";
import LineChart, { type LineSeries } from "../charts/LineChart";
import {
  ExportBox,
  ExportOnly,
} from "../WidgetExport";
import Switch from "../Switch";
import { useWidgetTheme } from "../../lib/useWidgetTheme";
import { WIDGETS } from "../../lib/widget-registry";
import {
  WIDGET_SETTINGS_DEFAULTS,
  type WidgetSettings,
} from "../../lib/widget-settings";
import {
  ZUBAU_BY_COUNTRY,
  YEARS_ZUBAU,
  COUNTRY_COMPARE_META,
} from "../../lib/country-comparison";

// Identität (Titel, Teilen-Ziel, Quellen, nächster Schritt) kommt aus dem
// Register — ein Eintrag speist Fußzeile, Quellen-Kante und Bild-Fuß.
const WIDGET = WIDGETS.zubauErneuerbareAtom;

// Anfang und Ende der Reihe kommen aus den Daten, nicht aus dem Text: Chart-Achse
// und Überschrift der Summe müssen denselben Zeitraum meinen wie die Zahlen.

const byLabel = (label: string) =>
  ZUBAU_BY_COUNTRY.find((c) => c.label === label)!;

type View = { id: string; label: string; flag: string };

/**
 * Reihenfolge des Multitools — Welt zuerst (Default), Deutschland zuletzt.
 *
 * Deutschland ist hier nicht eines unter sechs, sondern der Maßstab: Es lässt
 * sich zu jedem anderen Land dazuschalten. Als eigener Eintrag steht es deshalb
 * am Ende — dort, wo man es sucht, wenn man es einmal für sich sehen will.
 */
const VIEWS: View[] = ["Welt", "China", "USA", "Frankreich", "Indien", "Deutschland"].map((l) => {
  const c = byLabel(l);
  // Anzeige-Label: "Weltweit" statt "Welt" (Daten-Key bleibt via id = c.key).
  return { id: c.key, label: l === "Welt" ? "Weltweit" : c.label, flag: c.flag };
});

const DEUTSCHLAND = byLabel("Deutschland");

/**
 * Die Kurven: immer das gewählte Land, auf Wunsch Deutschland dazu.
 *
 * Farben tragen zwei Bedeutungen gleichzeitig — Technik (Erneuerbare grün,
 * Atomkraft magenta) beim gewählten Land, und beim eingeblendeten Deutschland
 * die Zugehörigkeit (Akzentblau in zwei Tönen). Ohne diese Trennung wären vier
 * gleichfarbige Linien nicht auseinanderzuhalten; die Fahne am Kurvenende sagt
 * zusätzlich, wer wer ist.
 */
function seriesFor(view: View, mitDeutschland: boolean, countries = ZUBAU_BY_COUNTRY): LineSeries[] {
  const c = countries.find(country=>country.key===view.id)!;
  const DEUTSCHLAND = countries.find(country=>country.code==="DEU")!;
  const eigene: LineSeries[] = KENNZAHLEN.map((k) => ({
    key: k.key,
    label: k.label,
    flag: mitDeutschland ? view.flag : undefined,
    colorToken: k.colorToken,
    values: k.werte(c),
  }));
  if (!mitDeutschland) return eigene;
  // Deutschland behält die FARBE DES ENERGIETRÄGERS — grün bleibt Erneuerbare,
  // magenta bleibt Atomkraft. Nur so vergleicht man Gleiches mit Gleichem; eine
  // eigene Landesfarbe machte aus dem Chart zwei Farbwelten, in denen man erst
  // die Legende lesen muss, um zwei Erneuerbaren-Kurven als solche zu erkennen.
  // Unterschieden wird über die Linie selbst: dünner und blasser.
  return [
    ...eigene,
    ...KENNZAHLEN.map((k) => ({
      key: `de-${k.key}`,
      label: k.label,
      flag: "🇩🇪",
      colorToken: k.colorToken,
      values: k.werte(DEUTSCHLAND),
      duenn: true,
    })),
  ];
}

/** Die beiden Kennzahlen der Karte — Reihenfolge wie im Chart. */
const KENNZAHLEN = [
  {
    key: "ee",
    label: "Erneuerbare",
    colorToken: "--color-energy-cat-renewable",
    werte: (c: (typeof ZUBAU_BY_COUNTRY)[number]) => c.windsolar,
  },
  {
    key: "atom",
    label: "Atomkraft",
    colorToken: "--color-energy-nuclear",
    werte: (c: (typeof ZUBAU_BY_COUNTRY)[number]) => c.nuclear,
  },
];

const sum = (arr: number[]) => arr.reduce((a, b) => a + b, 0);
const fmtGw = (n: number) =>
  `${n < 0 ? "−" : ""}${Math.abs(Math.round(n)).toLocaleString("de-DE")} GW`;

/**
 * Wie weit Deutschland vom gewählten Land entfernt liegt, in Prozent.
 *
 * Neutral gehalten — kein Grün, kein Rot: „weniger Zubau" ist keine schlechte
 * Nachricht, die man einfärben dürfte, sondern eine Größenangabe. Wo die Basis
 * nahe null liegt oder die Vorzeichen auseinandergehen (Zubau gegen Rückbau),
 * ergibt ein Prozentwert keine Aussage; dann bleibt nur der Wert selbst.
 */
export function abweichung(land: number, de: number): string {
  if (Math.abs(land) < 1 || Math.sign(land) !== Math.sign(de)) return "";
  const pct = Math.round(((de - land) / Math.abs(land)) * 100);
  return `${pct > 0 ? "+" : pct < 0 ? "−" : "±"}${Math.abs(pct)} %`;
}

/**
 * Dasselbe als Größenverhältnis — „12× weniger" ist greifbarer als „−92 %".
 *
 * Ein Faktor entsteht NUR, wenn er etwas bedeutet: Bei verschiedenen Vorzeichen
 * (China baut Atomkraft zu, Deutschland hat abgebaut) beschreibt kein „×" die
 * Lage, und nahe null wird jeder Faktor beliebig groß.
 */
export function vergleichZuDeutschland(land: number, de: number): string {
  const NAHE_NULL = 1; // GW — darunter ist ein Verhältnis Rauschen
  if (Math.abs(land) < NAHE_NULL || Math.abs(de) < NAHE_NULL) return "";
  if (Math.sign(land) !== Math.sign(de)) return "";
  const faktor = Math.abs(land) / Math.abs(de);
  if (faktor >= 1.15) return `${faktor.toFixed(faktor >= 10 ? 0 : 1).replace(".", ",")}× weniger`;
  if (faktor <= 1 / 1.15) return `${(1 / faktor).toFixed(faktor <= 0.1 ? 0 : 1).replace(".", ",")}× mehr`;
  return "etwa gleich viel";
}

/**
 * Der deutsche Wert in der Kachel — die Abweichung in Prozent kommt erst beim
 * Überfahren oder mit der Tastatur dazu.
 *
 * Dauerhaft sagte sie dasselbe wie das Größenverhältnis eine Zeile tiefer, nur
 * in anderer Form; zwei Deltas nebeneinander liest niemand als zwei Antworten
 * auf dieselbe Frage, sondern als Fehler.
 *
 * Bewusst über einen Zustand statt über eine `:hover`-Regel: Im Widget hat die
 * Klassenlösung nicht zuverlässig gegriffen, und ein Effekt, der sich nicht
 * prüfen lässt, ist keiner. Der Zustand ist außerdem der einzige Weg, der auch
 * die Tastatur bedient.
 */
function DeutschlandWert({
  wert,
  abweichung,
  bezug,
}: {
  wert: string;
  abweichung: string;
  bezug: string;
}) {
  return (
    <span
      className={abweichung ? "sc-deltahost" : undefined}
      tabIndex={abweichung ? 0 : undefined}
      title={abweichung ? `Deutschland: ${abweichung} gegenüber ${bezug}` : undefined}
      style={{
        display: "inline-flex",
        alignItems: "baseline",
        gap: 6,
        fontFamily: "var(--font-mono)",
        fontSize: "var(--font-size-small)",
        fontWeight: 600,
        color: "var(--widget-fg)",
        borderRadius: 4,
      }}
    >
      <span>
        {DEUTSCHLAND.code} {wert}
      </span>
      {/* Im Markup steht die Abweichung immer — für Screenreader und für die
          Suche im Text. Sichtbar wird sie über CSS, nicht über einen Zustand:
          Ein React-Zustand ging bei jedem Neuzeichnen der Karte verloren, und
          der Wert flackerte beim Überfahren. */}
      {abweichung && <span className="sc-delta">{abweichung}</span>}
    </span>
  );
}

export default function ZubauWidget() {
  const reference = useWidgetReferenceData();
  const countries = reference?.capacity.countries ?? ZUBAU_BY_COUNTRY;
  const years = reference?.capacity.years ?? YEARS_ZUBAU;
  const source = reference?.capacity.source ?? COUNTRY_COMPARE_META;
  const DEUTSCHLAND = countries.find(country=>country.code==='DEU')!;
  const ERSTES_JAHR = years[0], LETZTES_JAHR = years[years.length-1];
  const [settings, setSettings] = useState<WidgetSettings>(WIDGET_SETTINGS_DEFAULTS);
  const [idx, setIdx] = useState(0); // Default: Welt
  const [mitDeutschland, setMitDeutschland] = useState(false);

  useWidgetTheme({
    onSettings: (partial) => setSettings((prev) => ({ ...prev, ...partial })),
  });

  const view = VIEWS[idx];
  // Deutschland lässt sich zu jedem anderen Land dazulegen — bei Deutschland
  // selbst wäre der Schalter sinnlos, dort verschwindet er.
  const kannVergleichen = view.id !== DEUTSCHLAND.key;
  const zeigtDeutschland = kannVergleichen && mitDeutschland;
  const series = useMemo(() => seriesFor(view, zeigtDeutschland, countries), [view, zeigtDeutschland, countries]);
  const land = countries.find(country=>country.key===view.id)!;

  return <EnergyWidgetFrame settings={settings} widget={WIDGET} place={view.label} exportUnit="GW" stand={source.dataAsOf} title="Erneuerbare vs. Atomkraft" kind="time-series" filename="solar-check-zubau-erneuerbare-atom" einbetten={settings.embed?{params:{},height:560}:undefined}>
        {/* Darunter das Veränderliche: „Zubau:" plus Wähler. Im Bild, wo es
            keinen Wähler gibt, steht an seiner Stelle derselbe Satz als Text —
            samt der Angabe, ob Deutschland eingeblendet ist. Was ein Umschalter
            bestimmt, muss im geteilten Bild lesbar sein. */}
        <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 8, marginTop: 6, marginBottom: 12 }}>
          <span style={{ fontSize: "var(--font-size-small)", color: "var(--widget-muted)" }}>Zubau:</span>
          <span data-sc-export-ignore="" style={{ display: "inline-flex" }}>
            <CountryMultitool idx={idx} onChange={setIdx} />
          </span>
          {/* Nicht umbrechen — sonst rutscht „Deutschland" in eine zweite Zeile
              und liegt auf der Überschrift der Kennzahlen. Derselbe Grund wie
              bei der Kachel-Beschriftung: Die Bildaufnahme rendert breiter, als
              die Messung ergibt. */}
          <ExportOnly style={{ fontSize: 12.5, fontWeight: 700, color: "var(--widget-fg)", whiteSpace: "nowrap" }}>
            {view.flag} {view.label}
            {zeigtDeutschland ? " · mit Deutschland" : ""}
          </ExportOnly>
          {/* Links neben dem Wähler, nicht am rechten Rand: Beides gehört zur
              Frage „was zeige ich", und getrennte Ecken lassen sie wie zwei
              verschiedene Dinge aussehen. */}
          {kannVergleichen && (
            <span data-sc-export-ignore="" style={{ display: "inline-flex" }}>
              <Switch
                an={mitDeutschland}
                onChange={setMitDeutschland}
                label="Deutschland zum Vergleich einblenden"
                text="Vergleich Deutschland"
                size="sm"
              />
            </span>
          )}
        </div>

        {/* KPIs: Zubau-Summe über die ganze Reihe — Kreis = Farbcode, Zahl
            neutral, geboxt.
            Zeitraum UND Gebiet stehen hier, nicht in einer eigenen Zeile: Der
            Zeitraum stand getippt da und wäre beim ersten Datenlauf still falsch
            geworden; das Gebiet stand nur im Wähler, den das Bild nicht hat —
            ein geteiltes Bild zeigte damit Zahlen, von denen niemand weiß,
            wofür sie gelten. Beide gehören an die Zahlen, die sie bestimmen. */}
        <div style={{ fontSize: "var(--font-size-micro)", fontWeight: 600, letterSpacing: "0.04em", textTransform: "uppercase", color: "var(--widget-muted)", marginBottom: 6 }}>
          Zubau gesamt {ERSTES_JAHR}–{LETZTES_JAHR}
        </div>
        {/* Zwei Kacheln, eine je Technik — auch im Vergleich. Deutschland steht
            als Zeile IN der Kachel, nicht als eigene daneben: Vier Kacheln
            zwingen zum Suchen, welche zu welchem Land gehört, und auf schmalen
            Karten brechen sie in zwei Reihen um. */}
        <div style={{ display: "flex", flexWrap: "wrap", gap: 10, marginBottom: 14 }}>
          {KENNZAHLEN.map((k) => {
            const eigen = sum(k.werte(land));
            const de = sum(k.werte(DEUTSCHLAND));
            const verhaeltnis = zeigtDeutschland ? vergleichZuDeutschland(eigen, de) : "";
            const abw = zeigtDeutschland ? abweichung(eigen, de) : "";
            return (
              <div
                key={k.key}
                style={{
                  border: "1px solid var(--color-border)",
                  borderRadius: "var(--radius-sm)",
                  padding: "8px 12px",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 6 }}>
                  <span style={{ width: 6, height: 6, borderRadius: "50%", background: `var(${k.colorToken})`, flexShrink: 0 }} />
                  <span style={{ fontSize: "var(--font-size-caption)", color: "var(--widget-muted)", whiteSpace: "nowrap" }}>
                    {k.label}
                    {/* Das Land als Kürzel hinter der Sache, nicht als Fahne
                        davor: Es beantwortet „von wem ist diese Zahl", sobald
                        zwei Länder in der Karte stehen, und ändert dabei die
                        Breite der Kachel kaum. */}
                    {zeigtDeutschland && (
                      <span style={{ marginLeft: 5, fontWeight: 700, letterSpacing: "0.03em" }}>
                        {land.code}
                      </span>
                    )}
                  </span>
                </div>
                <div style={{ fontFamily: "var(--font-mono)", fontSize: "var(--font-size-h3)", fontWeight: 800, lineHeight: 1, color: "var(--widget-fg)" }}>
                  {fmtGw(eigen)}
                </div>
                {/* Der Vergleich steht UNTER der Zahl, Zeile für Zeile: So wächst
                    die Kachel beim Einschalten nur in der Höhe — und sie wächst
                    mit, statt zu springen (Raster-Zeilenhöhe 0fr → 1fr).
                    Nebeneinander wären die Kacheln breiter geworden und hätten
                    auf schmalen Karten die Reihe umbrechen lassen. */}
                <div className="sc-aufklapp" data-offen={zeigtDeutschland ? "ja" : "nein"}>
                  <div>
                    <div
                      style={{
                        marginTop: 8,
                        paddingTop: 7,
                        // Feine Linie zwischen der Referenz und Deutschland:
                        // Ohne sie lesen sich vier Zeilen als eine Aufzählung,
                        // in der die große Zahl ihren Vorrang verliert.
                        borderTop: "1px solid var(--color-border)",
                        whiteSpace: "nowrap",
                      }}
                    >
                      <DeutschlandWert wert={fmtGw(de)} abweichung={abw} bezug={land.code} />
                      {verhaeltnis && (
                        <div style={{ fontSize: "var(--font-size-caption)", color: "var(--widget-muted)", marginTop: 3 }}>
                          {verhaeltnis}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        <div data-energy-plot style={{ position: "relative" }}>
          <ExportBox key={view.id} style={{ animation: "sc-fade 0.35s ease" }}>
            <LineChart years={years} series={series} unit="GW" xDomain={[ERSTES_JAHR, LETZTES_JAHR]} height={300} />
          </ExportBox>

        </div>

  </EnergyWidgetFrame>;
}

function CountryMultitool({idx,onChange}:{idx:number;onChange:(index:number)=>void}) {
 return <WidgetSetting hideLabel stepper order="ascending" stepLabels={{previous:"Vorheriges Land",next:"Nächstes Land"}} label="Land" value={VIEWS[idx].id} onChange={id=>onChange(VIEWS.findIndex(view=>view.id===id))} options={VIEWS.map(view=>({value:view.id,label:`${view.flag} ${view.label}`}))}/>;
}
