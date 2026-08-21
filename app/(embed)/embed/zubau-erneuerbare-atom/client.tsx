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

type View = { id: string; label: string; flag: string; kind: "single" | "compare" };

// Reihenfolge des Multitools — Welt zuerst (Default), Vergleich am Ende.
const VIEWS: View[] = [
  ...["Welt", "Deutschland", "China", "USA", "Frankreich", "Indien"].map((l) => {
    const c = byLabel(l);
    // Anzeige-Label: "Weltweit" statt "Welt" (Daten-Key bleibt via id = c.key).
    return { id: c.key, label: l === "Welt" ? "Weltweit" : c.label, flag: c.flag, kind: "single" as const };
  }),
  { id: "de-cn", label: "Deutschland ↔ China", flag: "🇩🇪", kind: "compare" as const },
];

function seriesFor(view: View): { series: LineSeries[]; sub: string } {
  if (view.kind === "compare") {
    const de = byLabel("Deutschland");
    const cn = byLabel("China");
    // Landesfarbe = Land, Abstufung = Technik: Erneuerbare kräftig, Atom hell.
    return {
      series: [
        { key: "de-ee", label: "Erneuerbare", flag: "🇩🇪", colorToken: "--color-accent", values: de.windsolar },
        { key: "de-atom", label: "Atom", flag: "🇩🇪", colorToken: "--color-accent-light", values: de.nuclear },
        { key: "cn-ee", label: "Erneuerbare", flag: "🇨🇳", colorToken: "--color-negative", values: cn.windsolar },
        { key: "cn-atom", label: "Atom", flag: "🇨🇳", colorToken: "--color-negative-light", values: cn.nuclear },
      ],
      sub: "Deutschland (blau) gegen China (rot) — Wind + Solar kräftig, Atomkraft im hellen Ton",
    };
  }
  const c = byLabel(view.id);
  return {
    series: [
      { key: "ee", label: "Erneuerbare", colorToken: "--color-energy-cat-renewable", values: c.windsolar },
      { key: "atom", label: "Atomkraft", colorToken: "--color-energy-nuclear", values: c.nuclear },
    ],
    sub: "So viel Wind + Solar kommt jährlich neu ans Netz, verglichen mit neuer Atomkraft.",
  };
}

const sum = (arr: number[]) => arr.reduce((a, b) => a + b, 0);
const fmtGw = (n: number) =>
  `${n < 0 ? "−" : ""}${Math.abs(Math.round(n)).toLocaleString("de-DE")} GW`;

export default function ZubauWidget() {
  const [settings, setSettings] = useState<WidgetSettings>(WIDGET_SETTINGS_DEFAULTS);
  const [idx, setIdx] = useState(0); // Default: Welt

  useWidgetTheme({
    onSettings: (partial) => setSettings((prev) => ({ ...prev, ...partial })),
  });

  const view = VIEWS[idx];
  const { series, sub } = useMemo(() => seriesFor(view), [view]);

  // Abgeleitet, nicht doppelt gepflegt: der Register-Titel plus das gewählte
  // Land — ohne es teilt man ein Bild, dessen Bezug niemand kennt.
  const shareText =
    view.kind === "compare"
      ? "Zubau Wind + Solar: Deutschland vs. China"
      : `${WIDGET.title} — ${view.label}`;

  const chartExport = useChartExport({
    context: {
      title: WIDGET.title,
      subtitle: view.kind === "compare" ? "Deutschland ↔ China" : `${view.flag} ${view.label}`,
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
        {/* TopBar: Titel + Länder-Multitool */}
        <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "space-between", alignItems: "center", gap: 10, marginBottom: 2 }}>
          {/* Nicht umbrechen: Im Bild rendert die Aufnahme den Text etwas breiter
              als die Messung — der Titel lief dann zweizeilig, während die Zeile
              darunter auf ihrer gemessenen Höhe blieb, und beide lagen
              übereinander. Der Titel ist kurz genug, dass er auf jeder
              Kartenbreite in eine Zeile passt. */}
          <div style={{ fontSize: 13, fontWeight: 600, letterSpacing: 0.2, whiteSpace: "nowrap" }}>
            Zubau: Erneuerbare vs. Atomkraft
          </div>
          {/* Bleibt auch nach einem Umbruch rechts: sein Ausklapp-Menü ist an
              der rechten Kante ausgerichtet, und links ausgerückt ragte es auf
              schmalen Karten über den Rand — den die Karte abschneidet. */}
          <span data-sc-export-ignore="" style={{ display: "inline-flex", marginLeft: "auto" }}>
            <CountryMultitool idx={idx} onChange={setIdx} />
          </span>
        </div>
        {/* Im Bild ersetzt der Ländername den Wähler — ohne ihn zeigt das Bild
            Zahlen, von denen niemand weiß, für welches Land sie gelten. */}
        <ExportOnly style={{ fontSize: 13.5, fontWeight: 700, color: "var(--widget-fg)", marginTop: 2 }}>
          {view.kind === "compare" ? "Deutschland ↔ China" : `${view.flag} ${view.label}`}
        </ExportOnly>
        <div style={{ fontSize: 12, color: "var(--widget-muted)", marginBottom: 12 }}>{sub}</div>

        {/* KPIs: Zubau-Summe über die ganze Reihe — Kreis = Farbcode, Zahl
            neutral, geboxt. Der Zeitraum wird AUS DEN DATEN geschrieben: er
            stand hier getippt und wäre beim ersten Datenlauf still falsch
            geworden — die Summe unter der Überschrift enthält dann ein Jahr,
            das die Überschrift nicht nennt. */}
        <div style={{ fontSize: 10.5, fontWeight: 600, letterSpacing: "0.04em", textTransform: "uppercase", color: "var(--widget-muted)", marginBottom: 6 }}>
          Zubau gesamt {ERSTES_JAHR}–{LETZTES_JAHR}
        </div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 10, marginBottom: 14 }}>
          {series.map((s) => (
            <div
              key={s.key}
              style={{
                border: "1px solid var(--color-border)",
                borderRadius: "var(--radius-sm)",
                padding: "8px 12px",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 6 }}>
                <span style={{ width: 6, height: 6, borderRadius: "50%", background: `var(${s.colorToken})`, flexShrink: 0 }} />
                <span style={{ fontSize: 11, color: "var(--widget-muted)" }}>
                  {(s.flag ? s.flag + " " : "") + s.label}
                </span>
              </div>
              <div style={{ fontFamily: "var(--font-mono)", fontSize: 18, fontWeight: 800, lineHeight: 1, color: "var(--widget-fg)" }}>
                {fmtGw(sum(s.values))}
              </div>
            </div>
          ))}
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
