"use client";

import { useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import LineChart, { type LineSeries } from "../../../../components/charts/LineChart";
import {
  ExportBox,
  ExportNotesProvider,
  ExportOnly,
  WidgetExportFooter,
  WidgetFooter,
  WidgetSourceEdge,
} from "../../../../components/WidgetExport";
import { DATA_SOURCES, sourceLabel } from "../../../../lib/data-sources";
import {
  IconChevronDown,
  IconChevronLeft,
  IconChevronRight,
} from "../../../../components/Icons";
import { useWidgetTheme } from "../../../../lib/useWidgetTheme";
import { WIDGETS, WIDGET_MAX_WIDTH } from "../../../../lib/widget-registry";
import { useChartExport } from "../../../../lib/useChartExport";
import { iconSizes } from "../../../../lib/theme";
import {
  WIDGET_SETTINGS_DEFAULTS,
  type WidgetSettings,
} from "../../../../lib/widget-settings";
import {
  ZUBAU_BY_COUNTRY,
  YEARS_ZUBAU,
  COUNTRY_COMPARE_META,
} from "../../../../lib/country-comparison";

// Identität (Titel, Teilen-Ziel, Quellen, nächster Schritt) kommt aus dem
// Register — ein Eintrag speist Fußzeile, Quellen-Kante und Bild-Fuß.
const WIDGET = WIDGETS.zubauErneuerbareAtom;

// Anfang und Ende der Reihe kommen aus den Daten, nicht aus dem Text: Chart-Achse
// und Überschrift der Summe müssen denselben Zeitraum meinen wie die Zahlen.
const ERSTES_JAHR = YEARS_ZUBAU[0];
const LETZTES_JAHR = YEARS_ZUBAU[YEARS_ZUBAU.length - 1];

const byLabel = (label: string) =>
  ZUBAU_BY_COUNTRY.find((c) => c.label === label)!;

type View = { id: string; label: string; flag: string };

/** Reihenfolge des Multitools — Welt zuerst (Default). */
const VIEWS: View[] = ["Welt", "Deutschland", "China", "USA", "Frankreich", "Indien"].map((l) => {
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
function seriesFor(view: View, mitDeutschland: boolean): LineSeries[] {
  const c = byLabel(view.id);
  const eigene: LineSeries[] = [
    {
      key: "ee",
      label: "Erneuerbare",
      flag: mitDeutschland ? view.flag : undefined,
      colorToken: "--color-energy-cat-renewable",
      values: c.windsolar,
    },
    {
      key: "atom",
      label: "Atomkraft",
      flag: mitDeutschland ? view.flag : undefined,
      colorToken: "--color-energy-nuclear",
      values: c.nuclear,
    },
  ];
  if (!mitDeutschland) return eigene;
  return [
    ...eigene,
    { key: "de-ee", label: "Erneuerbare", flag: "🇩🇪", colorToken: "--color-accent", values: DEUTSCHLAND.windsolar },
    { key: "de-atom", label: "Atomkraft", flag: "🇩🇪", colorToken: "--color-accent-light", values: DEUTSCHLAND.nuclear },
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
 * Wie sich Deutschland zum gewählten Land verhält — als Satzteil hinter dem
 * deutschen Wert.
 *
 * Ein Faktor wird NUR gebildet, wenn er etwas bedeutet: Bei verschiedenen
 * Vorzeichen (China baut Atomkraft zu, Deutschland hat abgebaut) beschreibt
 * kein „×" die Lage, und nahe null wird jeder Faktor beliebig groß. Dann steht
 * dort nur der Wert — lieber keine Einordnung als eine erfundene.
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

export default function ZubauWidget() {
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
  const series = useMemo(() => seriesFor(view, zeigtDeutschland), [view, zeigtDeutschland]);
  const land = byLabel(view.id);
  const titel = `Zubau ${view.label}: Erneuerbare vs. Atomkraft`;

  // Abgeleitet, nicht doppelt gepflegt: der Register-Titel plus das gewählte
  // Land — ohne es teilt man ein Bild, dessen Bezug niemand kennt.
  const shareText = zeigtDeutschland
    ? `${WIDGET.title} — ${view.label} und Deutschland`
    : `${WIDGET.title} — ${view.label}`;

  const chartExport = useChartExport({
    context: {
      // Der Titel trägt das Gebiet bereits; ein Untertitel würde es wiederholen.
      title: titel,
      source: sourceLabel(DATA_SOURCES.ember),
    },
    filename: "solar-check-zubau-erneuerbare-atom.png",
    shareText,
    shareUrl: WIDGET.shareUrl,
    mode: "node",
  });

  const copyLink = () => {
    navigator.clipboard?.writeText(`${shareText}\n${WIDGET.shareUrl}`).catch(() => {});
  };

  return (
    // Provider um die ganze Karte: Der Bild-Fuß darunter zeigt die Hilfetexte
    // der „?"-Knöpfe. Ohne ihn verschwände der erste hier eingebaute Tooltip
    // lautlos aus dem Bild — deshalb erzwingt der Wächter ihn neben jedem
    // WidgetExportFooter (lib/__tests__/widget-konventionen.test.ts).
    <ExportNotesProvider>
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          background: "var(--widget-bg)",
          color: "var(--widget-fg)",
          borderRadius: "var(--widget-border-radius)",
          fontFamily: "var(--widget-font-family)",
          padding: 18,
          maxWidth: WIDGET_MAX_WIDTH,
          margin: "0 auto",
          boxSizing: "border-box",
          overflow: "hidden",
        }}
        ref={chartExport.chartRef}
      >
        {/* Die Überschrift steht FEST — sie ändert sich mit keiner Auswahl.
            Vorher trug sie das gewählte Gebiet, und damit sprang bei jedem
            Umschalten die ganze Karte: Der Titel wurde länger oder kürzer, auf
            schmalen Karten wechselte er zwischen einer und zwei Zeilen, und
            alles darunter rutschte mit. */}
        <div style={{ fontSize: 13, fontWeight: 600, letterSpacing: 0.2 }}>
          Erneuerbare vs. Atomkraft
        </div>

        {/* Darunter das Veränderliche: „Zubau:" plus Wähler. Im Bild, wo es
            keinen Wähler gibt, steht an seiner Stelle derselbe Satz als Text —
            samt der Angabe, ob Deutschland eingeblendet ist. Was ein Umschalter
            bestimmt, muss im geteilten Bild lesbar sein. */}
        <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 8, marginTop: 6, marginBottom: 12 }}>
          <span style={{ fontSize: 12, color: "var(--widget-muted)" }}>Zubau:</span>
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
          {kannVergleichen && (
            <span data-sc-export-ignore="" style={{ display: "inline-flex", marginLeft: "auto" }}>
              <DeutschlandSchalter an={mitDeutschland} onChange={setMitDeutschland} />
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
        <div style={{ fontSize: 10.5, fontWeight: 600, letterSpacing: "0.04em", textTransform: "uppercase", color: "var(--widget-muted)", marginBottom: 6 }}>
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
                  {/* Fahne und Wort bleiben zusammen: Die Bildaufnahme rendert
                      das Emoji breiter als die Messung, das Wort rutschte dadurch
                      in eine zweite Zeile — und die lag auf der Zahl darunter
                      („Atom" quer durch „−20 GW"). */}
                  <span style={{ fontSize: 11, color: "var(--widget-muted)", whiteSpace: "nowrap" }}>
                    {zeigtDeutschland ? `${view.flag} ` : ""}
                    {k.label}
                  </span>
                </div>
                <div style={{ fontFamily: "var(--font-mono)", fontSize: 18, fontWeight: 800, lineHeight: 1, color: "var(--widget-fg)" }}>
                  {fmtGw(eigen)}
                </div>
                {zeigtDeutschland && (
                  <div style={{ display: "flex", alignItems: "baseline", gap: 6, marginTop: 6, whiteSpace: "nowrap" }}>
                    <span style={{ fontFamily: "var(--font-mono)", fontSize: 12.5, fontWeight: 700, color: "var(--color-accent)" }}>
                      🇩🇪 {fmtGw(de)}
                    </span>
                    {verhaeltnis && (
                      <span style={{ fontSize: 11, color: "var(--widget-muted)" }}>· {verhaeltnis}</span>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        <div style={{ position: "relative", paddingRight: 18 }}>
          {/* Quelle vertikal an der rechten Kante (geteilter Baustein). Auf einer
              eigenen Seite (onsite) kreditiert die Seite zentral. */}
          {/* Der Datenstand kommt aus dem Datensatz, nicht von der Uhr: ohne ihn
              steht neben einer Reihe, die 2024 endet, das heutige Datum — und
              „Stand" liest sich als Datenstand, nicht als Abrufdatum. Bei den
              Live-Widgets ist das Abrufdatum richtig, hier nicht. */}
          <WidgetSourceEdge
            widget={WIDGET}
            visible={!settings.onsite}
            stand={COUNTRY_COMPARE_META.dataAsOf}
          />
          <ExportBox key={view.id} style={{ animation: "sc-fade 0.35s ease" }}>
            <LineChart years={YEARS_ZUBAU} series={series} unit="GW" xDomain={[ERSTES_JAHR, LETZTES_JAHR]} height={300} />
          </ExportBox>
          <div style={{ fontSize: 11, color: "var(--widget-muted)", marginTop: 2, paddingLeft: 48 }}>
            Neu ans Netz gebrachte Leistung pro Jahr (GW, netto inkl. Rückbau). Negativ = mehr abgebaut als zugebaut.
          </div>
        </div>

        {/* Sichtbare Fußzeile (nächster Schritt · Aktionen · Marke) und Bild-Fuß
            (Datenquelle · Marke) — beide aus dem geteilten Baustein. */}
        <WidgetFooter
          widget={WIDGET}
          chartExport={chartExport}
          onCopyLink={copyLink}
          share={settings.share}
          branding={settings.branding}
          showEmbed={settings.embed}
          onsite={settings.onsite}
        />
        <WidgetExportFooter widget={WIDGET} branding={settings.branding} />
      </div>
    </ExportNotesProvider>
  );
}

// Länder-Multitool: ‹ [Dropdown] › — einzeln durchsteppbar, wie der
// Jahreswähler im Strommix-Widget.
/**
 * „Deutschland dazu" — ein Schalter, kein eigener Eintrag im Länderwähler.
 *
 * Vorher gab es eine feste Ansicht „Deutschland ↔ China". Die beantwortete
 * genau eine Frage; jede andere (Deutschland gegen Indien, gegen die USA) war
 * nicht zu stellen, und im Wähler stand ein Eintrag, der etwas ganz anderes war
 * als seine sechs Nachbarn.
 */
function DeutschlandSchalter({ an, onChange }: { an: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      type="button"
      onClick={() => onChange(!an)}
      aria-pressed={an}
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 6,
        height: 30,
        padding: "0 10px",
        fontSize: 12,
        fontWeight: 600,
        fontFamily: "inherit",
        cursor: "pointer",
        whiteSpace: "nowrap",
        borderRadius: "var(--radius-sm)",
        border: `1px solid ${an ? "var(--color-accent)" : "var(--color-border)"}`,
        // Angeschaltet trägt der Knopf die Farbe, in der Deutschland im Chart
        // gezeichnet wird — so ist ohne Legende klar, welche Linien dazugehören.
        background: an ? "color-mix(in srgb,var(--widget-accent) 12%,transparent)" : "var(--widget-bg)",
        color: an ? "var(--color-accent)" : "var(--widget-fg)",
      }}
    >
      <span aria-hidden="true">🇩🇪</span>
      <span>{an ? "eingeblendet" : "vergleichen"}</span>
    </button>
  );
}

function CountryMultitool({ idx, onChange }: { idx: number; onChange: (i: number) => void }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, [open]);

  const view = VIEWS[idx];
  const btn: CSSProperties = {
    fontSize: 12,
    fontWeight: 600,
    border: "1px solid var(--color-border)",
    background: "var(--widget-bg)",
    color: "var(--widget-fg)",
    cursor: "pointer",
    fontFamily: "inherit",
    padding: "0 6px",
    height: 30,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  };

  return (
    <div style={{ display: "flex", alignItems: "stretch" }}>
      <button
        type="button"
        onClick={() => idx > 0 && onChange(idx - 1)}
        disabled={idx === 0}
        aria-label="Vorheriges Land"
        style={{ ...btn, borderRadius: "var(--radius-sm) 0 0 var(--radius-sm)", borderRight: "none", opacity: idx === 0 ? 0.4 : 1 }}
      >
        <IconChevronLeft size={iconSizes.xs} />
      </button>
      <div ref={ref} style={{ position: "relative", display: "flex" }}>
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          style={{ ...btn, borderRadius: 0, gap: 5, minWidth: 130 }}
        >
          <span>{view.flag}</span>
          <span>{view.label}</span>
          <IconChevronDown size={iconSizes.xs} />
        </button>
        {open && (
          <div
            style={{
              position: "absolute",
              top: "calc(100% + 4px)",
              right: 0,
              background: "var(--widget-bg)",
              border: "1px solid var(--color-border)",
              borderRadius: "var(--radius-sm)",
              boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
              zIndex: 20,
              padding: "4px 0",
              minWidth: 180,
            }}
          >
            {VIEWS.map((v, i) => (
              <button
                key={v.id}
                type="button"
                onClick={() => {
                  onChange(i);
                  setOpen(false);
                }}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  width: "100%",
                  padding: "6px 12px",
                  border: "none",
                  background: i === idx ? "color-mix(in srgb,var(--widget-accent) 12%,transparent)" : "transparent",
                  color: i === idx ? "var(--widget-accent)" : "var(--widget-fg)",
                  fontSize: 12,
                  fontWeight: i === idx ? 700 : 500,
                  fontFamily: "inherit",
                  cursor: "pointer",
                  textAlign: "left",
                }}
              >
                <span>{v.flag}</span>
                <span>{v.label}</span>
              </button>
            ))}
          </div>
        )}
      </div>
      <button
        type="button"
        onClick={() => idx < VIEWS.length - 1 && onChange(idx + 1)}
        disabled={idx === VIEWS.length - 1}
        aria-label="Nächstes Land"
        style={{ ...btn, borderRadius: "0 var(--radius-sm) var(--radius-sm) 0", borderLeft: "none", opacity: idx === VIEWS.length - 1 ? 0.4 : 1 }}
      >
        <IconChevronRight size={iconSizes.xs} />
      </button>
    </div>
  );
}
