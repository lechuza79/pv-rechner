"use client";
import { useState } from "react";
import Link from "next/link";
import { v } from "../../../../lib/theme";
import { YEARS, FUEL } from "../../../../lib/constants";
import { fuelKwhForWpHeat, calcWpGridCost } from "../../../../lib/calc";
import { calcFossilReference, wpStandingCostPerYear, HEATING_YEARS } from "../../../../lib/fossil-reference";
import EnergyFlowModal, { type ExampleDayEntry } from "../../../../components/EnergyFlowModal";
import type { SolarMonth } from "../../../../lib/balkon-sim";

interface ResultStatsProps {
  /** Rendite (25-J-Ende) des gewählten Szenarios — die Szenario-Wahl sitzt oben. */
  total: number;
  kosten: number;
  wp: string;
  /** Building-based WP annual electricity (kWh) — same value the rest of the
   *  result page shows, NOT the old 3.500-kWh flat rate. */
  wpKwh: number;
  /** Jahresarbeitszahl der WP (gebäudebasiert) — konsistent zum WP-Strom oben. */
  jaz: number;
  effEv: number;
  autarkie: number;
  /** WP-spezifische PV-Deckung (0–100 %) aus der Stundensimulation — NICHT die
   *  Haushalts-Jahres-Autarkie (die überzeichnet die WP-Deckung im Winter). */
  wpAutarky: number;
  jahresertrag: number;
  gesamtVerbrauch: number;
  speicherKwh: number;
  monthly: SolarMonth[];
  exampleDays: ExampleDayEntry[];
  oStrom: number;
  /** Strompreis-Anstieg des GEWÄHLTEN Szenarios (±1/3/5 %) — Kachel folgt der Wahl oben. */
  stromSteigerung: number;
  fuelType: "gas" | "oil";
  setFuelType: (v: "gas" | "oil") => void;
}

export default function ResultStats({
  total, kosten, wp, wpKwh, jaz, effEv, autarkie, wpAutarky, jahresertrag, gesamtVerbrauch, speicherKwh, monthly, exampleDays, oStrom, stromSteigerung, fuelType, setFuelType,
}: ResultStatsProps) {
  const [flowOpen, setFlowOpen] = useState(false);
  return (
    <>
      {/* Energie-Unabhängigkeit: Autarkie und Eigenverbrauch als Paar — die zwei
          werden oft verwechselt, deshalb nebeneinander mit erklärender Zeile. */}
      <div style={{ background: v('--color-bg'), borderRadius: v('--radius-md'), padding: "14px 16px", marginBottom: 10, border: `1px solid ${v('--color-border')}` }}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
          <div>
            <div style={{ fontSize: 11, color: v('--color-text-secondary'), textTransform: "uppercase", letterSpacing: "0.04em", fontWeight: 600 }}>Autarkie</div>
            <div style={{ fontSize: 22, fontWeight: 800, fontFamily: v('--font-mono'), color: v('--color-positive'), marginTop: 4 }}>{autarkie} %</div>
            <div style={{ fontSize: 11, color: v('--color-text-muted'), marginTop: 2 }}>deines Verbrauchs deckst du selbst</div>
          </div>
          <div>
            <div style={{ fontSize: 11, color: v('--color-text-secondary'), textTransform: "uppercase", letterSpacing: "0.04em", fontWeight: 600 }}>Eigenverbrauch</div>
            <div style={{ fontSize: 22, fontWeight: 800, fontFamily: v('--font-mono'), color: v('--color-accent'), marginTop: 4 }}>{Math.round(effEv)} %</div>
            <div style={{ fontSize: 11, color: v('--color-text-muted'), marginTop: 2 }}>deines Solarstroms nutzt du selbst</div>
          </div>
        </div>
        <div style={{ fontSize: 11, color: v('--color-text-muted'), marginTop: 10, lineHeight: 1.5, borderTop: `1px solid ${v('--color-border-muted')}`, paddingTop: 8 }}>
          <strong style={{ color: v('--color-text-secondary') }}>Autarkie</strong> misst deine Unabhängigkeit vom Netz,{" "}
          <strong style={{ color: v('--color-text-secondary') }}>Eigenverbrauch</strong> wie gut die Anlage zu deinem Verbrauch passt. Ein Speicher hebt beide.{" "}
          <button
            onClick={() => setFlowOpen(true)}
            style={{
              border: "none", background: "transparent", padding: 0, cursor: "pointer",
              color: v('--color-accent'), fontWeight: 600, fontSize: 11, fontFamily: "inherit",
              textDecoration: "underline", textUnderlineOffset: 2,
            }}
          >
            So verteilt sich dein Strom
          </button>
        </div>
      </div>

      <EnergyFlowModal
        open={flowOpen}
        onClose={() => setFlowOpen(false)}
        jahresertrag={jahresertrag}
        gesamtVerbrauch={gesamtVerbrauch}
        effEv={effEv}
        autarkie={autarkie}
        speicherKwh={speicherKwh}
        monthly={monthly}
        exampleDays={exampleDays}
      />

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 16 }}>
        <div style={{ background: v('--color-bg'), borderRadius: v('--radius-md'), padding: "14px 16px", border: `1px solid ${v('--color-border')}` }}>
          <div style={{ fontSize: 11, color: v('--color-text-secondary'), textTransform: "uppercase", letterSpacing: "0.04em", fontWeight: 600 }}>Rendite 25 Jahre</div>
          <div style={{ fontSize: 22, fontWeight: 800, fontFamily: v('--font-mono'), color: total >= 0 ? v('--color-positive') : v('--color-negative'), marginTop: 4 }}>
            {total > 0 ? "+" : ""}{total.toLocaleString("de-DE")} €
          </div>
        </div>
        <div style={{ background: v('--color-bg'), borderRadius: v('--radius-md'), padding: "14px 16px", border: `1px solid ${v('--color-border')}` }}>
          <div style={{ fontSize: 11, color: v('--color-text-secondary'), textTransform: "uppercase", letterSpacing: "0.04em", fontWeight: 600 }}>⌀ Ersparnis / Jahr</div>
          <div style={{ fontSize: 22, fontWeight: 800, fontFamily: v('--font-mono'), color: v('--color-positive'), marginTop: 4 }}>
            {Math.round((total + kosten) / YEARS).toLocaleString("de-DE")} €
          </div>
        </div>
      </div>

      {wp !== "nein" && (() => {
        // WP-spezifische PV-Deckung aus der Stunden-Jahressimulation (pv-sim), NICHT
        // die Haushalts-Jahres-Autarkie: Die WP zieht ~80 % ihres Stroms im dunklen
        // Winterhalbjahr, wo die reale PV-Deckung weit unter dem Jahresmittel liegt.
        // Die Jahres-Autarkie hätte die WP-Deckung grob verdoppelt und die 25-J-
        // Ersparnis geschönt. Wärme = wpKwh × JAZ (gebäudebasiert, konsistent zum
        // WP-Strom oben) statt fixer COP 3,5; Strompreis-Anstieg folgt dem gewählten
        // Szenario (±1/3/5 %) statt fixer +3 %.
        const wpCoverage = Math.min(wpAutarky / 100, 1);
        // Dieser Block vergleicht LAUFENDE Kosten: Hier steht keine Kaufentscheidung
        // an — die Wärmepumpe ist im Rechner-Flow vorhanden oder geplant, und über die
        // fossile Heizung wird gar nichts ausgesagt. Deshalb trägt keine der beiden
        // Seiten eine Anschaffung (fossilInvest: 0), und deshalb greift auch die
        // Beimischungspflicht nicht: § 43 Abs. 1 GModG gilt nur für Heizungen, die neu
        // eingebaut werden. Bis 28.07.2026 rechnete der Block den Grüngas-Aufschlag
        // trotzdem — Pflicht ohne Neueinbau, also zwei Hälften verschiedener Fälle.
        //
        // Die Regel schreiben wir hier NICHT aus, sondern fragen sie: greenGas wird
        // angefragt, calcFossilReference entscheidet über greenGasApplies(). Bekäme
        // der Block eines Tages doch eine Anschaffung, käme der Aufschlag von selbst
        // wieder — und der Hinweistext unten hängt am Ergebnis-Flag, nicht an einer
        // zweiten Formulierung derselben Regel.
        //
        // Grundpreis und Wartung stehen auf BEIDEN Seiten (Quelle für beide:
        // lib/fossil-reference.ts) — eine Seite damit zu belasten und die andere nicht
        // war genau der Fehler, den der Wärmepumpen-Rechner am 28.07.2026 korrigiert hat.
        const ref = calcFossilReference({
          fuelKind: fuelType,
          fuelKwh: fuelKwhForWpHeat(wpKwh, fuelType, jaz),
          years: HEATING_YEARS,
          pricePerKwh: FUEL[fuelType].price,
          co2PerKwh: FUEL[fuelType].co2PerKwh,
          inflation: 0.02,
          fossilInvest: 0,
          greenGas: true,
        });
        const fuelCost = ref.total;
        const wpGridCost = calcWpGridCost(wpKwh, wpCoverage, oStrom, stromSteigerung, HEATING_YEARS)
          + wpStandingCostPerYear() * HEATING_YEARS;
        const netSaving = fuelCost - wpGridCost;
        return (
          <div style={{ background: v('--color-bg'), borderRadius: v('--radius-md'), padding: "12px 16px", marginBottom: 16, border: `1px solid ${v('--color-border')}` }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
              <span style={{ fontSize: 11, color: v('--color-text-secondary'), textTransform: "uppercase", letterSpacing: "0.04em", fontWeight: 600 }}>
                Heizkosten: WP vs. {FUEL[fuelType].refLabel} · {HEATING_YEARS} Jahre
              </span>
              <div style={{ display: "flex", gap: 4 }}>
                {(["gas", "oil"] as const).map(ft => (
                  <button key={ft} onClick={() => setFuelType(ft)} style={{
                    padding: "3px 8px", borderRadius: v('--radius-sm'), fontSize: 10, fontWeight: 600, cursor: "pointer",
                    background: fuelType === ft ? v('--color-negative-dim') : "transparent",
                    border: fuelType === ft ? `1px solid ${v('--color-negative-border')}` : `1px solid ${v('--color-border-muted')}`,
                    color: fuelType === ft ? v('--color-negative') : v('--color-text-muted'),
                  }}>{FUEL[ft].label}</button>
                ))}
              </div>
            </div>
            <div style={{ display: "flex", alignItems: "baseline", gap: 8, flexWrap: "wrap" }}>
              <div>
                <span style={{ fontSize: 11, color: v('--color-negative') }}>{FUEL[fuelType].refLabel}: </span>
                <span style={{ fontSize: 16, fontWeight: 700, fontFamily: v('--font-mono'), color: v('--color-negative'), textDecoration: "line-through", opacity: 0.7 }}>
                  {fuelCost.toLocaleString("de-DE")} €
                </span>
              </div>
              <div>
                <span style={{ fontSize: 11, color: v('--color-text-secondary') }}>Wärmepumpe: </span>
                <span style={{ fontSize: 16, fontWeight: 700, fontFamily: v('--font-mono'), color: v('--color-text-secondary') }}>
                  {wpGridCost.toLocaleString("de-DE")} €
                </span>
              </div>
            </div>
            <div style={{ fontSize: 20, fontWeight: 800, fontFamily: v('--font-mono'), color: v('--color-positive'), marginTop: 4 }}>
              Ersparnis: {netSaving.toLocaleString("de-DE")} €
            </div>
            <div style={{ fontSize: 11, color: v('--color-text-muted'), marginTop: 4, lineHeight: 1.5 }}>
              {Math.round(wpKwh * jaz).toLocaleString("de-DE")} kWh Wärme/Jahr · PV-Deckung Heizstrom {Math.round(wpCoverage * 100)} % · Brennstoff bzw. Strom inkl. CO₂-Abgabe, dazu Grundpreis und Wartung
            </div>
            {/* Was NICHT drinsteckt, gehört sichtbar an die Zahl. Der Satz zur
                Grüngas-Pflicht hängt am Ergebnis-Flag, damit Text und Rechnung nicht
                auseinanderlaufen können. */}
            <div style={{ fontSize: 11, color: v('--color-text-muted'), marginTop: 6, lineHeight: 1.5 }}>
              Verglichen sind nur die laufenden Kosten, auf beiden Seiten ohne Anschaffung.
              {!ref.greenGasApplied && " Die Grüngas-Pflicht des Heizungsgesetzes ist deshalb nicht eingerechnet — sie gilt nur für Heizungen, die neu eingebaut werden."}
              {" "}Was ein Heizungstausch mit Anschaffung, Förderung und Grüngas-Pflicht ergibt, rechnet der{" "}
              <Link href="/waermepumpe-rechner" style={{ color: v('--color-accent'), fontWeight: 600 }}>Wärmepumpen-Rechner</Link>.
            </div>
          </div>
        );
      })()}
    </>
  );
}
