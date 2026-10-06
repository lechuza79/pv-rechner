"use client";
// Wiederverwendbarer Szenario-Umschalter für Rendite/Prognosen. Drei Tabs
// (Pessimistisch/Realistisch/Optimistisch), jeder mit einer eigenen Erklärung
// des angenommenen Strompreis-Anstiegs. Steht GANZ OBEN auf der Ergebnisseite,
// weil die Wahl alle Zahlen darunter umrechnet (Amortisation, Rendite, Chart).
//
// Bewusst neutral gehalten: kein Farbcoding je Szenario (der aktive Tab nutzt
// die Akzentfarbe). Die Label→Strompreis-Zuordnung liegt beim Aufrufer, weil
// sie je Rechner kippt (für PV ist ein hoher Strompreis gut, für die
// Wärmepumpe schlecht) — die Komponente rendert nur, was sie bekommt.
import { ReactNode } from "react";
import { v, space, pad } from "../lib/theme";

export interface ScenarioTab {
  id: string;
  label: string;
  /** Kurzangabe unter dem Label, z. B. „+3 %/Jahr". */
  sub: string;
  /** Erklärsatz des aktiven Szenarios (unter den Tabs). */
  explain: string;
  source?: { href: string; label: string };
}

export default function ScenarioTabs({
  tabs,
  selected,
  onSelect,
  children,
}: {
  tabs: ScenarioTab[];
  selected: string;
  onSelect: (id: string) => void;
  /** Optionale Werte des aktiven Szenarios (Rendite …). Meist leer, weil die
   *  Ergebniszahlen weiter unten in ihren eigenen Kacheln stehen. */
  children?: ReactNode;
}) {
  const active = tabs.find((t) => t.id === selected) ?? tabs[0];
  return (
    <div style={{ background: v("--color-bg"), borderRadius: v("--radius-md"), border: `1px solid ${v("--color-border")}`, marginBottom: space.xl, overflow: "hidden" }}>
      <div style={{ display: "flex" }} role="tablist" aria-label="Strompreis-Szenario">
        {tabs.map((t) => {
          const on = t.id === active.id;
          return (
            <button
              key={t.id}
              type="button"
              role="tab"
              aria-selected={on}
              onClick={() => onSelect(t.id)}
              style={{
                flex: "1 1 auto",
                minWidth: 0,
                font: "inherit",
                padding: pad("lg", "sm"),
                cursor: "pointer",
                textAlign: "center",
                background: on ? v("--color-accent-dim") : "transparent",
                border: "none",
                borderBottom: `2px solid ${on ? v("--color-accent") : v("--color-border")}`,
                transition: "background .15s, border-color .15s",
              }}
            >
              <div style={{ fontSize: v("--font-size-body"), fontWeight: 700, color: v("--color-text-primary"), whiteSpace: "nowrap" }}>{t.label}</div>
              <div style={{ fontSize: v("--font-size-small"), color: v("--color-text-secondary"), marginTop: space.xs }}>{t.sub}</div>
            </button>
          );
        })}
      </div>
      <div style={{ padding: pad("xl") }}>
        {children}
        <div style={{ fontSize: v("--font-size-body"), color: v("--color-text-secondary") }}>
          {active.explain}
          {active.source && <div style={{ marginTop: space.md, fontSize: v("--font-size-small") }}><a style={{ color: "inherit", textDecoration: "underline", textUnderlineOffset: v("--underline-offset") }} href={active.source.href} target="_blank" rel="noopener noreferrer">{active.source.label}</a></div>}
        </div>
      </div>
    </div>
  );
}
