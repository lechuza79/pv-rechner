"use client";

import { useState, useMemo } from "react";
import { MastrMap, type RegionValue } from "../../../components/MastrMap";
import { BUNDESLAENDER, bundeslandByAgs } from "../../../lib/mastr-regions";
import { v } from "../../../lib/theme";

// Rough Solar installation distribution (GW) per Bundesland — approx. 2025
// stock from public statistics. Placeholder until real MaStR aggregates land.
const MOCK_SOLAR_GW: Record<string, number> = {
  "01": 3.2,  // SH
  "02": 0.3,  // HH
  "03": 8.5,  // NI
  "04": 0.2,  // HB
  "05": 11.2, // NW
  "06": 4.1,  // HE
  "07": 4.8,  // RP
  "08": 13.5, // BW
  "09": 25.8, // BY
  "10": 0.9,  // SL
  "11": 0.4,  // BE
  "12": 7.2,  // BB
  "13": 3.9,  // MV
  "14": 5.6,  // SN
  "15": 4.4,  // ST
  "16": 2.7,  // TH
};

export function MastrLab() {
  const [selectedAgs, setSelectedAgs] = useState<string | undefined>(undefined);

  const values: RegionValue[] = useMemo(
    () => BUNDESLAENDER.map((b) => ({ ags: b.ags, value: (MOCK_SOLAR_GW[b.ags] ?? 0) * 1000 })),
    [],
  );

  const total = values.reduce((s, r) => s + r.value, 0);
  const selected = selectedAgs ? bundeslandByAgs(selectedAgs) : null;
  const selectedVal = selectedAgs ? values.find((v) => v.ags === selectedAgs)?.value ?? 0 : total;

  return (
    <main style={{ maxWidth: 960, margin: "0 auto", padding: "32px 20px" }}>
      <header style={{ marginBottom: 24 }}>
        <div style={{ fontSize: 12, color: v("--color-text-muted"), textTransform: "uppercase", letterSpacing: 0.8 }}>
          Lab · work in progress
        </div>
        <h1 style={{ fontSize: 28, margin: "4px 0 6px", color: v("--color-text-primary") }}>MaStR Hero-Karte</h1>
        <p style={{ fontSize: 14, color: v("--color-text-secondary"), margin: 0 }}>
          Basis-Choropleth mit Mock-Werten (Solar-Bestand in MW). Klick auf ein Bundesland wählt es aus.
        </p>
      </header>

      <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 1fr) 280px", gap: 24, alignItems: "start" }}>
        <div
          style={{
            background: v("--color-bg-accent"),
            borderRadius: 14,
            padding: 16,
            border: `1px solid ${v("--color-border")}`,
          }}
        >
          <MastrMap level="de" values={values} selectedAgs={selectedAgs} onSelect={setSelectedAgs} valueLabel="MW" />
        </div>

        <aside style={{ display: "grid", gap: 12 }}>
          <Kachel
            label={selected ? selected.name : "Deutschland"}
            value={`${selectedVal.toLocaleString("de-DE")} MW`}
            hint="installierte Solarleistung (mock)"
          />
          <Kachel
            label="Anzahl Bundesländer"
            value={selected ? "1 gewählt" : "16"}
            hint={selected ? "zurück via Klick außerhalb" : "klick auf ein BL"}
          />
          {selectedAgs && (
            <button
              onClick={() => setSelectedAgs(undefined)}
              style={{
                padding: "8px 12px",
                background: v("--color-bg-muted"),
                border: `1px solid ${v("--color-border")}`,
                borderRadius: 10,
                cursor: "pointer",
                fontSize: 13,
                color: v("--color-text-primary"),
              }}
            >
              Auswahl zurücksetzen
            </button>
          )}
        </aside>
      </div>
    </main>
  );
}

function Kachel({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div
      style={{
        background: v("--color-bg"),
        border: `1px solid ${v("--color-border")}`,
        borderRadius: 12,
        padding: 14,
      }}
    >
      <div
        style={{
          fontSize: 11,
          textTransform: "uppercase",
          letterSpacing: 0.8,
          color: v("--color-text-muted"),
          marginBottom: 4,
        }}
      >
        {label}
      </div>
      <div style={{ fontSize: 20, fontWeight: 600, color: v("--color-text-primary"), fontVariantNumeric: "tabular-nums" }}>
        {value}
      </div>
      {hint && <div style={{ fontSize: 12, color: v("--color-text-secondary"), marginTop: 2 }}>{hint}</div>}
    </div>
  );
}
