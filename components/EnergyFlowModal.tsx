"use client";
// Erklär-Modal für Autarkie & Eigenverbrauch am KONKRETEN Fall des Nutzers.
// Oben zwei 100-%-Balken (Erzeugung / Verbrauch) als Kennzahl-Überblick, darunter
// der Jahresverlauf und — als Drilldown — exemplarische Tage. Eigenverbrauch und
// Autarkie sind zwei verschiedene Größen (Eigenverbrauch an der Erzeugung, Autarkie
// am Verbrauch gemessen) und kommen aus verschiedenen Schätzern: Der Eigenverbrauch
// wird als die editierbare Zahl der Ergebnisseite DURCHGEREICHT (treibt das Geld),
// die Autarkie kommt aus der Stundensimulation. Die selbst genutzte kWh wird nur
// EINMAL gezeigt (Erzeugungs-Seite), sonst stünden zwei leicht verschiedene kWh
// gegeneinander.
//
// Jahres-Chart = VERBRAUCHS-Seite (woher kommt mein Strom: direkt / Speicher / Netz),
// damit der Netzbezug als Segment sichtbar ist. Tages-Chart = 24-h-Detail eines
// echten PVGIS-Tagestyps: zeigt den Innerhalb-des-Tages-Mismatch (mittags Überschuss,
// nachts Netz), der in der Monatsbilanz verschwindet und die Rest-Autarkie erklärt.
import { useState } from "react";
import Modal from "./Modal";
import { v } from "../lib/theme";
import type { SolarMonth } from "../lib/balkon-sim";
import type { ExampleDayResult } from "../lib/pv-sim";
import DayProfileChart, { DAY_C_DIRECT as C_DIRECT, DAY_C_BATTERY as C_BATTERY, DAY_C_GRID as C_GRID } from "./DayProfileChart";

export interface ExampleDayEntry {
  key: string;
  label: string;
  day: ExampleDayResult;
}

interface EnergyFlowModalProps {
  open: boolean;
  onClose: () => void;
  jahresertrag: number;      // kWh/Jahr Erzeugung
  gesamtVerbrauch: number;   // kWh/Jahr Verbrauch
  effEv: number;             // Eigenverbrauch in %
  autarkie: number;          // Autarkie in %
  speicherKwh: number;
  monthly: SolarMonth[];     // 12 Monate aus der Stundensimulation
  exampleDays: ExampleDayEntry[];
}

const MONTH_LABELS = ["J", "F", "M", "A", "M", "J", "J", "A", "S", "O", "N", "D"];

// Semantische Farben (C_DIRECT/C_BATTERY/C_GRID/C_SUN) kommen jetzt aus der
// geteilten DayProfileChart-Komponente — eine Quelle für Modal + EEG-Ratgeber.

function LegendDot({ color, label }: { color: string; label: string }) {
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 5, fontSize: 11, color: v('--color-text-muted') }}>
      <span style={{ width: 9, height: 9, borderRadius: 2, background: color, flexShrink: 0 }} />
      {label}
    </span>
  );
}

/** Jahresverlauf, VERBRAUCHS-Seite: pro Monat der Verbrauch, aufgeteilt in direkt
 *  aus der Sonne, aus dem Speicher und aus dem Netz. Der graue Netz-Anteil wächst
 *  im Winter — hier als Segment sichtbar (anders als auf der Produktions-Seite, wo
 *  er bei großen Anlagen im riesigen Balken untergeht). */
function YearChart({ monthly }: { monthly: SolarMonth[] }) {
  const W = 340, H = 150, padB = 20, padT = 10, chartH = H - padB - padT;
  const maxY = Math.max(...monthly.map(m => m.consumption), 1);
  const slot = W / 12;
  const barW = slot * 0.62;
  return (
    <div>
      <svg viewBox={`0 0 ${W} ${H}`} width="100%" style={{ display: "block" }} role="img" aria-label="Jahresverlauf: monatlicher Verbrauch aus Sonne, Speicher und Netz">
        {monthly.map((m, i) => {
          const x = i * slot + (slot - barW) / 2;
          const fromBattery = Math.max(0, m.selfUsed - m.direct);
          const segs = [
            { v: m.direct, c: C_DIRECT },
            { v: fromBattery, c: C_BATTERY },
            { v: m.gridDraw, c: C_GRID },
          ];
          let cursor = padT + chartH;
          return (
            <g key={i}>
              {segs.map((s, k) => {
                const h = (s.v / maxY) * chartH;
                cursor -= h;
                return h > 0.3 ? <rect key={k} x={x} y={cursor} width={barW} height={h} fill={s.c} rx={1} /> : null;
              })}
              <text x={x + barW / 2} y={H - 6} textAnchor="middle" fontSize={10} fill={v('--color-text-muted')} fontFamily={v('--font-text')}>{MONTH_LABELS[i]}</text>
            </g>
          );
        })}
      </svg>
      <div style={{ display: "flex", gap: 12, marginTop: 4, justifyContent: "center", flexWrap: "wrap" }}>
        <LegendDot color={C_DIRECT} label="direkt aus der Sonne" />
        <LegendDot color={C_BATTERY} label="aus dem Speicher" />
        <LegendDot color={C_GRID} label="aus dem Netz" />
      </div>
    </div>
  );
}

/** Tages-Detail: 24 Stunden eines echten PVGIS-Tagestyps. Gelbe Fläche = Erzeugung
 *  (der Mittagsberg), darunter je Stunde der gedeckte Verbrauch (direkt / Speicher /
 *  Netz). Sichtbar wird: mittags viel mehr Sonne als Bedarf (Überschuss lädt Speicher
 *  und wird eingespeist), abends/nachts kein Solar → erst Speicher, dann Netz. */
function DayChart({ day, scaleMax }: { day: ExampleDayResult; scaleMax: number }) {
  return (
    <div>
      <DayProfileChart hours={day.hours} scaleMax={scaleMax} />
      <div style={{ fontSize: 11.5, color: v('--color-text-secondary'), textAlign: "center", marginTop: 8, lineHeight: 1.5 }}>
        Erzeugung <strong style={{ fontFamily: v('--font-mono') }}>{day.prod.toLocaleString("de-DE")}</strong> kWh ·
        Verbrauch <strong style={{ fontFamily: v('--font-mono') }}>{day.cons.toLocaleString("de-DE")}</strong> kWh ·
        davon <strong style={{ fontFamily: v('--font-mono'), color: day.grid > 0 ? v('--color-text-primary') : v('--color-positive') }}>{day.grid.toLocaleString("de-DE")}</strong> kWh aus dem Netz ·
        <strong style={{ fontFamily: v('--font-mono') }}> {day.feedIn.toLocaleString("de-DE")}</strong> kWh eingespeist
      </div>
    </div>
  );
}

function Bar({ label, total, parts }: {
  label: string;
  total: number;
  parts: { pct: number; color: string; caption: string; sub: string }[];
}) {
  return (
    <div style={{ marginBottom: 18 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 6 }}>
        <span style={{ fontSize: 12, fontWeight: 700, color: v('--color-text-primary') }}>{label}</span>
        <span style={{ fontSize: 12, fontFamily: v('--font-mono'), color: v('--color-text-secondary') }}>
          {Math.round(total).toLocaleString("de-DE")} kWh/Jahr
        </span>
      </div>
      <div style={{ display: "flex", height: 34, borderRadius: 8, overflow: "hidden", border: `1px solid ${v('--color-border')}` }}>
        {parts.map((p, i) => (
          <div key={i} style={{
            width: `${p.pct}%`, background: p.color, display: "flex", alignItems: "center",
            justifyContent: "center", minWidth: p.pct > 0 ? 2 : 0,
          }}>
            {p.pct >= 12 && (
              <span style={{ fontSize: 12, fontWeight: 800, fontFamily: v('--font-mono'), color: "#fff" }}>{Math.round(p.pct)} %</span>
            )}
          </div>
        ))}
      </div>
      <div style={{ display: "flex", gap: 14, marginTop: 6, flexWrap: "wrap" }}>
        {parts.map((p, i) => (
          <span key={i} style={{ display: "inline-flex", alignItems: "center", gap: 5, fontSize: 11, color: v('--color-text-muted') }}>
            <span style={{ width: 9, height: 9, borderRadius: 2, background: p.color, flexShrink: 0 }} />
            <span><strong style={{ color: v('--color-text-secondary'), fontWeight: 600 }}>{p.caption}</strong> · {p.sub}</span>
          </span>
        ))}
      </div>
    </div>
  );
}

export default function EnergyFlowModal({ open, onClose, jahresertrag, gesamtVerbrauch, effEv, autarkie, speicherKwh, monthly, exampleDays }: EnergyFlowModalProps) {
  const [view, setView] = useState<string>("year");

  // Der Eigenverbrauch ist die (ggf. manuell editierte) Zahl der Ergebnisseite,
  // unverändert durchgereicht: Das Modal ERKLÄRT die Seite, es rechnet den Wert
  // nicht neu — sonst zeigte es nach einem Override eine andere Zahl als das Geld.
  // Die Autarkie kommt aus der Stundensimulation (anderer Nenner: der Verbrauch).
  // Beide Prozente dürfen abweichen — sie messen Verschiedenes. Die selbst
  // genutzte kWh wird nur EINMAL gezeigt (auf der Erzeugungs-Seite); auf der
  // Verbrauchs-Seite steht der harte Netzbezug, damit nirgends zwei leicht
  // verschiedene „selbst genutzt"-kWh gegeneinander stehen.
  const evPct = Math.round(effEv);
  const auPct = Math.round(autarkie);
  const selbstGenutzt = (evPct / 100) * jahresertrag;
  const eingespeist = Math.max(0, jahresertrag - selbstGenutzt);
  const ausNetz = Math.max(0, gesamtVerbrauch - (auPct / 100) * gesamtVerbrauch);

  const ratio = jahresertrag / Math.max(gesamtVerbrauch, 1);
  const groß = ratio >= 1.8;
  const klein = ratio <= 0.9;

  const GREEN = v('--color-positive');
  const BLUE = v('--color-accent');
  const GRAY = v('--color-text-muted');

  const activeDay = exampleDays.find(e => e.key === view);
  const tabs = [{ key: "year", label: "Jahr" }, ...exampleDays.map(e => ({ key: e.key, label: e.label }))];
  // Gemeinsame Y-Achse aller Beispieltage → vergleichbar (siehe DayChart).
  const dayScaleMax = Math.max(
    ...exampleDays.flatMap(e => e.day.hours.map(h => Math.max(h.prod, h.cons))),
    0.1,
  );

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="So verteilt sich dein Strom"
      ariaLabel="Autarkie und Eigenverbrauch erklärt"
      intro="Zwei Blickwinkel auf dieselbe Anlage: Der Eigenverbrauch misst, wie viel deiner Erzeugung du selbst nutzt, die Autarkie, wie viel deines Verbrauchs vom Dach kommt. Weil sie sich auf Verschiedenes beziehen — Erzeugung bzw. Verbrauch — sind es zwei verschiedene Prozentwerte."
    >

      <Bar
        label="Deine Erzeugung"
        total={jahresertrag}
        parts={[
          { pct: evPct, color: GREEN, caption: `Eigenverbrauch ${evPct} %`, sub: `${Math.round(selbstGenutzt).toLocaleString("de-DE")} kWh selbst genutzt` },
          { pct: 100 - evPct, color: BLUE, caption: "Einspeisung", sub: `${Math.round(eingespeist).toLocaleString("de-DE")} kWh ins Netz` },
        ]}
      />
      <Bar
        label="Dein Verbrauch"
        total={gesamtVerbrauch}
        parts={[
          { pct: auPct, color: GREEN, caption: `Autarkie ${auPct} %`, sub: `vom Dach${speicherKwh > 0 ? " & Speicher" : ""} gedeckt` },
          { pct: 100 - auPct, color: GRAY, caption: "Netzbezug", sub: `${Math.round(ausNetz).toLocaleString("de-DE")} kWh aus dem Netz` },
        ]}
      />

      {/* Drilldown: Jahr ↔ Beispieltage */}
      <div style={{ borderTop: `1px solid ${v('--color-border-muted')}`, paddingTop: 14, marginTop: 4 }}>
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 10 }}>
          {tabs.map(t => {
            const on = view === t.key;
            return (
              <button
                key={t.key}
                onClick={() => setView(t.key)}
                style={{
                  border: `1px solid ${on ? v('--color-accent') : v('--color-border')}`,
                  background: on ? v('--color-accent') : "transparent",
                  color: on ? v('--color-text-on-accent') : v('--color-text-secondary'),
                  fontSize: 11.5, fontWeight: 600, fontFamily: "inherit",
                  padding: "5px 10px", borderRadius: 999, cursor: "pointer", whiteSpace: "nowrap",
                }}
              >
                {t.label}
              </button>
            );
          })}
        </div>

        {view === "year" ? (
          <>
            <p style={{ fontSize: 11.5, color: v('--color-text-muted'), lineHeight: 1.5, marginBottom: 8 }}>
              Jeder Balken ist dein Verbrauch eines Monats — woher der Strom kommt: direkt aus der
              Sonne, aus dem Speicher oder aus dem Netz. Im Winter reicht die Sonne nicht, deshalb
              wächst dort der graue Netz-Anteil.
            </p>
            {monthly.length === 12 && <YearChart monthly={monthly} />}
          </>
        ) : activeDay ? (
          <>
            <p style={{ fontSize: 11.5, color: v('--color-text-muted'), lineHeight: 1.5, marginBottom: 8 }}>
              Ein einzelner {activeDay.label.toLowerCase()} über 24 Stunden. Mittags liefert die Sonne
              oft weit mehr als gebraucht wird — der Überschuss lädt den Speicher und wird eingespeist.
              Abends und nachts kommt nichts vom Dach: erst springt der Speicher ein, dann das Netz.
            </p>
            <DayChart day={activeDay.day} scaleMax={dayScaleMax} />
          </>
        ) : null}
      </div>

      {/* Fallspezifische Einordnung */}
      <div style={{
        marginTop: 16, padding: "12px 14px", background: v('--color-bg-accent'),
        borderRadius: v('--radius-md'), border: `1px solid ${v('--color-border-accent')}`,
        fontSize: 12.5, lineHeight: 1.6, color: v('--color-text-secondary'),
      }}>
        {groß && (
          <>
            <strong style={{ color: v('--color-text-primary') }}>Deine Anlage ist groß für deinen Verbrauch.</strong>{" "}
            Du deckst fast deinen ganzen Bedarf selbst ({auPct} % Autarkie), aber ein großer Teil des
            Sonnenstroms passt zeitlich nicht in deinen Verbrauch und wird eingespeist — deshalb ist der
            Eigenverbrauch mit {evPct} % niedrig. Beides ist bei einer üppig dimensionierten Anlage normal.
          </>
        )}
        {klein && (
          <>
            <strong style={{ color: v('--color-text-primary') }}>Deine Anlage ist knapp bemessen.</strong>{" "}
            Fast jede erzeugte Kilowattstunde findet direkt Abnehmer ({evPct} % Eigenverbrauch), aber übers
            Jahr reicht die Sonne nicht für deinen ganzen Bedarf — die Autarkie bleibt bei {auPct} %.
          </>
        )}
        {!groß && !klein && (
          <>
            <strong style={{ color: v('--color-text-primary') }}>Deine Anlage passt gut zu deinem Verbrauch.</strong>{" "}
            Ein solider Teil des Sonnenstroms wird direkt genutzt ({evPct} % Eigenverbrauch) und deckt einen
            großen Teil deines Bedarfs ({auPct} % Autarkie).
          </>
        )}
      </div>

      <p style={{ fontSize: 11.5, color: v('--color-text-muted'), marginTop: 14, lineHeight: 1.6 }}>
        <strong style={{ color: v('--color-text-secondary'), fontWeight: 600 }}>Warum nicht 100 % Autarkie?</strong>{" "}
        Im Dezember und Januar liefert selbst eine große Anlage nur einen Bruchteil, und ein Hausspeicher
        überbrückt gut einen Tag — keinen dunklen Winter. Deshalb bleibt immer ein Rest Netzbezug. Volle
        Unabhängigkeit ist mit einem Hausspeicher praktisch nicht erreichbar.
      </p>
      <p style={{ fontSize: 11, color: v('--color-text-faint'), marginTop: 10, lineHeight: 1.5 }}>
        Autarkie, Jahresverlauf und Beispieltage aus einer Stunden-Jahressimulation (Erzeugung,
        Verbrauch und Speicher Stunde für Stunde, echte PVGIS-Tagestypen), geprüft gegen das
        Unabhängigkeits-Kennfeld der HTW Berlin. Werte gerundet.
      </p>
    </Modal>
  );
}
