"use client";

import { useState, useMemo, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import { fmtPvLeistung, fmtErtragProKwp } from "../lib/atlas-format";
import {
  latestComparableMonth, earliestComparableMonth, solarTrendVergleich, monatsName,
  type SolarMonat,
} from "../lib/solar-trend";
import { formatGWhCompare, energyUnit } from "../lib/chart-utils";
import { v, iconSizes, space, pad } from "../lib/theme";
import { IconChevronLeft, IconChevronRight } from "./Icons";

// Blätterbare Solar-Trend-Karte: ein Monat gegen den Vorjahresmonat, zerlegt in
// Zubau und Wetter. Zahlen kommen fertig gerechnet aus lib/solar-trend — aus
// derselben Quelle wie die Server-Tabelle daneben, damit beide nie auseinander
// laufen. Die Reihe reicht die einbettende Seite herein (Server-Read).

// Knopf-Grundstil der Pfeile — bewusst hier lokal, die Karte hängt sonst an
// keinem Seiten-Layout.
function arrowBase() {
  return {
    padding: "2px 6px",
    borderRadius: v("--radius-sm"),
    border: `1px solid ${v("--color-border")}`,
    background: v("--color-bg"),
    color: v("--color-text-secondary"),
    fontSize: 11,
    fontWeight: 600 as const,
    fontFamily: v("--font-text"),
    display: "flex" as const,
    alignItems: "center" as const,
  };
}

/** Zwei-Balken-Vergleich (Vorjahr grau, aktuell farbig) für eine Größe der
 *  Trend-Karte. Werte kommen fertig formatiert herein — Einheiten haben ihre
 *  eine Quelle beim Aufrufer. */
function TrendVergleich({
  label, prevLabel, curLabel, prevValue, curValue, prevText, curText, barColor,
}: {
  label: string;
  prevLabel: string;
  curLabel: string;
  prevValue: number;
  curValue: number;
  prevText: string;
  curText: string;
  barColor: string;
}) {
  const max = Math.max(prevValue, curValue);
  if (!(max > 0)) return null;
  const row = (yearLabel: string, value: number, text: string, color: string, bold: boolean) => (
    <div style={{ display: "flex", alignItems: "center", gap: space.sm }}>
      <span style={{ flexShrink: 0, width: 34, fontSize: 10, fontFamily: v("--font-mono"), color: v("--color-text-muted") }}>
        {yearLabel}
      </span>
      <div style={{ flex: 1, height: 10, borderRadius: 3, background: v("--color-bg"), overflow: "hidden" }}>
        <div style={{ width: `${Math.max((value / max) * 100, 2)}%`, height: "100%", borderRadius: 3, background: color }} />
      </div>
      <span
        style={{
          flexShrink: 0, minWidth: 74, textAlign: "right", fontSize: 11,
          fontFamily: v("--font-mono"), fontWeight: bold ? 700 : 400,
          color: bold ? v("--color-text-primary") : v("--color-text-muted"),
        }}
      >
        {text}
      </span>
    </div>
  );
  return (
    <div style={{ flex: "1 1 180px", minWidth: 170 }}>
      <div style={{ fontSize: 11, fontWeight: 600, color: v("--color-text-secondary"), marginBottom: space.xs }}>{label}</div>
      <div style={{ display: "flex", flexDirection: "column", gap: space.xs }}>
        {row(prevLabel, prevValue, prevText, v("--color-border"), false)}
        {row(curLabel, curValue, curText, barColor, true)}
      </div>
    </div>
  );
}

// Der gewählte Monat steht als ?trend=YYYY-MM im Teilen-Link. Gültig ist,
// was die Server-Reihe vergleichen kann.
function parseTrendParam(
  raw: string | null,
  earliest: { year: number; month0: number },
  latest: { year: number; month0: number },
): { year: number; month0: number } | null {
  if (!raw) return null;
  const m = /^(\d{4})-(\d{2})$/.exec(raw);
  if (!m) return null;
  const year = Number(m[1]);
  const month0 = Number(m[2]) - 1;
  if (month0 < 0 || month0 > 11) return null;
  const val = year * 12 + month0;
  if (val < earliest.year * 12 + earliest.month0 || val > latest.year * 12 + latest.month0) return null;
  return { year, month0 };
}

/** Kompakte Karte: Solarerzeugung eines Monats gegen denselben Monat des
 *  Vorjahres, per Pfeilen durch alle Monate der Server-Reihe blätterbar.
 *  Die Zahlen kommen fertig gerechnet aus lib/solar-trend — derselben
 *  Quelle, aus der die Server-Tabelle darunter rendert. Keine Client-Fetches:
 *  Blättern ist sofort, und Karte und Tabelle können sich nicht widersprechen.
 *  Der gewählte Monat wandert als ?trend= in den Teilen-Link. */
export default function SolarTrendCard({ series }: { series: SolarMonat[] }) {
  const searchParams = useSearchParams();
  const latest = useMemo(() => latestComparableMonth(series), [series]);
  const earliest = useMemo(() => earliestComparableMonth(series), [series]);
  // searchParams nur für den Startwert — danach führt die Karte den Zustand
  // selbst und spiegelt ihn per replaceState (Muster wie selectRange).
  const [sel, setSel] = useState(() =>
    latest && earliest ? parseTrendParam(searchParams.get("trend"), earliest, latest) ?? latest : null,
  );

  const navigate = useCallback((delta: number) => {
    if (!latest || !earliest) return;
    setSel((s) => {
      if (!s) return s;
      const maxVal = latest.year * 12 + latest.month0;
      const minVal = earliest.year * 12 + earliest.month0;
      const clamped = Math.min(Math.max(s.year * 12 + s.month0 + delta, minVal), maxVal);
      const next = { year: Math.floor(clamped / 12), month0: clamped % 12 };
      if (typeof window !== "undefined") {
        const params = new URLSearchParams(window.location.search);
        if (clamped === maxVal) params.delete("trend");
        else params.set("trend", `${next.year}-${String(next.month0 + 1).padStart(2, "0")}`);
        const query = params.toString();
        window.history.replaceState(
          window.history.state,
          "",
          `${window.location.pathname}${query ? `?${query}` : ""}${window.location.hash}`,
        );
      }
      return next;
    });
  }, [latest, earliest]);

  if (!latest || !earliest || !sel) return null;
  const { year, month0 } = sel;
  const werte = solarTrendVergleich(series, year, month0);
  const monthLabel = monatsName(month0);

  const canPrev = year * 12 + month0 > earliest.year * 12 + earliest.month0;
  const canNext = year * 12 + month0 < latest.year * 12 + latest.month0;
  const arrowStyle = (enabled: boolean) => ({
    ...arrowBase(),
    opacity: enabled ? 1 : 0.35,
    cursor: enabled ? ("pointer" as const) : ("default" as const),
  });

  const unit = werte ? energyUnit(Math.max(werte.curGWh, werte.prevGWh)) : "TWh";
  const mehr = (werte?.totalPct ?? 0) >= 0;
  const zerlegung = werte?.zerlegung ?? null;

  const linkStyle = { color: v("--color-accent"), fontWeight: 600, textDecoration: "none" } as const;
  const num = (s: string | number, positive?: boolean) => (
    <strong style={{ color: positive ? v("--color-positive") : v("--color-text-primary"), fontFamily: v("--font-mono") }}>{s}</strong>
  );

  return (
    <div
      style={{
        background: v("--color-bg-muted"),
        border: `1px solid ${v("--color-border")}`,
        borderRadius: v("--radius-md"),
        padding: pad("md", "lg"),
        marginBottom: 20,
        fontSize: 13,
        lineHeight: 1.65,
        color: v("--color-text-secondary"),
      }}
    >
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: space.md, marginBottom: space.sm }}>
        <div style={{ fontSize: 12, fontWeight: 700, color: v("--color-text-primary") }}>
          Solar-Trend: {monthLabel} {year} gegen {monthLabel} {year - 1}
        </div>
        <div style={{ display: "flex", gap: space.xs, flexShrink: 0 }}>
          <button onClick={() => canPrev && navigate(-1)} disabled={!canPrev} style={arrowStyle(canPrev)} title="Voriger Monat">
            <IconChevronLeft size={iconSizes.xs} />
          </button>
          <button onClick={() => canNext && navigate(1)} disabled={!canNext} style={arrowStyle(canNext)} title="Nächster Monat">
            <IconChevronRight size={iconSizes.xs} />
          </button>
        </div>
      </div>

      {!werte ? (
        <div style={{ minHeight: 72, display: "flex", alignItems: "center", justifyContent: "center", color: v("--color-text-muted") }}>
          Für diesen Monat liegen keine vollständigen Daten vor.
        </div>
      ) : (
      <>
      {zerlegung && (
        <div style={{ display: "flex", flexWrap: "wrap", gap: pad("md", "lg"), marginBottom: space.md }}>
          <TrendVergleich
            label="Solarstrom"
            prevLabel={String(year - 1)} curLabel={String(year)}
            prevValue={werte.prevGWh} curValue={werte.curGWh}
            prevText={formatGWhCompare(werte.prevGWh, unit)} curText={formatGWhCompare(werte.curGWh, unit)}
            barColor={v("--color-energy-solar")}
          />
          <TrendVergleich
            label="Anlagen am Netz"
            prevLabel={String(year - 1)} curLabel={String(year)}
            prevValue={zerlegung.prevGw} curValue={zerlegung.curGw}
            prevText={fmtPvLeistung(zerlegung.prevGw * 1_000_000)} curText={fmtPvLeistung(zerlegung.curGw * 1_000_000)}
            barColor={v("--color-accent")}
          />
          <TrendVergleich
            label="Sonnenausbeute je kWp"
            prevLabel={String(year - 1)} curLabel={String(year)}
            prevValue={zerlegung.prevYield} curValue={zerlegung.curYield}
            prevText={fmtErtragProKwp(zerlegung.prevYield)} curText={fmtErtragProKwp(zerlegung.curYield)}
            barColor={v("--color-energy-solar")}
          />
        </div>
      )}

      <div>
        Im {monthLabel} {year} lieferten Deutschlands Solaranlagen {num(formatGWhCompare(werte.curGWh, unit))} Strom —{" "}
        {num(`${Math.abs(werte.totalPct)} %`, mehr)} {mehr ? "mehr" : "weniger"} als im {monthLabel} {year - 1}.{" "}
        {zerlegung ? (
          <>
            Zerlegt: {num(`${zerlegung.zubauPct >= 0 ? "+" : "−"}${Math.abs(zerlegung.zubauPct)} %`)}{" "}
            <a href="/photovoltaik-zubau-deutschland" style={linkStyle}>durch neu gebaute Anlagen</a>
            {" und "}
            {num(`${zerlegung.wetterPct >= 0 ? "+" : "−"}${Math.abs(zerlegung.wetterPct)} %`)} durchs Wetter, also{" "}
            {zerlegung.wetterPct >= 0 ? "mehr" : "weniger"} Sonnenstrom je installiertem kWp. Beide Effekte zusammen ergeben den Gesamtunterschied.
          </>
        ) : (
          <>
            {mehr
              ? "Ein Treiber neben dem Wetter: Es sind schlicht mehr Module am Netz."
              : "Kurzfristig schlägt das Wetter den Zubau — übers Jahr wächst die Solarerzeugung trotzdem."}{" "}
            <a href="/photovoltaik-zubau-deutschland" style={linkStyle}>Zum PV-Zubau in Deutschland</a>
          </>
        )}
      </div>
      </>
      )}
    </div>
  );
}

