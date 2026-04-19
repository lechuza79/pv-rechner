"use client";

import { useState, useEffect } from "react";
import { MastrMap, type RegionValue } from "../../../components/MastrMap";
import { bundeslandByAgs } from "../../../lib/mastr-regions";
import type { Energietraeger, RegionSummary } from "../../../lib/mastr-data";
import { v } from "../../../lib/theme";

const TRAEGER: { key: Energietraeger; label: string }[] = [
  { key: "solar", label: "Solar" },
  { key: "wind", label: "Wind" },
  { key: "biomasse", label: "Biomasse" },
  { key: "wasser", label: "Wasser" },
  { key: "speicher", label: "Speicher" },
];

const SEGMENT_LABEL: Record<string, string> = {
  privat_dach: "Privat (Dach)",
  gewerbe_dach: "Gewerbe (Dach)",
  freiflaeche: "Freifläche",
  "n/a": "—",
};

type ChoroplethResp = {
  source: string;
  data_as_of: string;
  data: { region_id: string; count: number; kwp: number }[];
};

export function MastrLab() {
  const [energietraeger, setEnergietraeger] = useState<Energietraeger>("solar");
  const [selectedAgs, setSelectedAgs] = useState<string | undefined>(undefined);
  const [choropleth, setChoropleth] = useState<ChoroplethResp | null>(null);
  const [summary, setSummary] = useState<RegionSummary | null>(null);

  useEffect(() => {
    fetch(`/api/mastr/choropleth?parent=de&type=${energietraeger}`)
      .then((r) => r.json())
      .then(setChoropleth)
      .catch(() => setChoropleth(null));
  }, [energietraeger]);

  useEffect(() => {
    const region = selectedAgs ?? "de";
    fetch(`/api/mastr/summary?region=${region}&type=${energietraeger}`)
      .then((r) => r.json())
      .then(setSummary)
      .catch(() => setSummary(null));
  }, [selectedAgs, energietraeger]);

  const values: RegionValue[] =
    choropleth?.data.map((d) => ({ ags: d.region_id, value: d.kwp / 1000 })) ?? [];

  return (
    <main style={{ maxWidth: 1040, margin: "0 auto", padding: "32px 20px" }}>
      <header style={{ marginBottom: 20 }}>
        <div
          style={{
            fontSize: 11,
            color: v("--color-text-muted"),
            textTransform: "uppercase",
            letterSpacing: 0.8,
          }}
        >
          Lab · work in progress
        </div>
        <h1
          style={{
            fontSize: 28,
            fontWeight: 700,
            margin: "4px 0 6px",
            color: v("--color-text-primary"),
          }}
        >
          MaStR Hero-Karte
        </h1>
        <p style={{ fontSize: 14, color: v("--color-text-secondary"), margin: 0 }}>
          Platzhalter-Werte (Stand {summary?.data_as_of ?? "2025-01"}) bis die echte MaStR-Pipeline
          Supabase gefüllt hat. Klick auf ein Bundesland für Detail.
        </p>
      </header>

      <TraegerSwitch value={energietraeger} onChange={setEnergietraeger} />

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "minmax(0, 1fr) 320px",
          gap: 24,
          alignItems: "start",
          marginTop: 20,
        }}
      >
        <div
          style={{
            background: v("--color-bg-accent"),
            borderRadius: 14,
            padding: 16,
            border: `1px solid ${v("--color-border")}`,
          }}
        >
          <MastrMap
            level="de"
            values={values}
            selectedAgs={selectedAgs}
            onSelect={(ags) => setSelectedAgs((prev) => (prev === ags ? undefined : ags))}
            valueLabel="MW"
          />
        </div>

        <aside style={{ display: "grid", gap: 12 }}>
          {summary ? <SummaryPanel summary={summary} onReset={() => setSelectedAgs(undefined)} /> : <Placeholder />}
        </aside>
      </div>
    </main>
  );
}

function TraegerSwitch({
  value,
  onChange,
}: {
  value: Energietraeger;
  onChange: (v: Energietraeger) => void;
}) {
  return (
    <div
      role="tablist"
      style={{
        display: "flex",
        gap: 4,
        padding: 4,
        background: v("--color-bg-muted"),
        borderRadius: 10,
        border: `1px solid ${v("--color-border")}`,
        width: "fit-content",
      }}
    >
      {TRAEGER.map((t) => {
        const active = t.key === value;
        return (
          <button
            key={t.key}
            role="tab"
            aria-selected={active}
            onClick={() => onChange(t.key)}
            style={{
              padding: "6px 12px",
              fontSize: 13,
              fontWeight: active ? 600 : 400,
              color: active ? v("--color-text-on-accent") : v("--color-text-secondary"),
              background: active ? v("--color-accent") : "transparent",
              border: "none",
              borderRadius: 7,
              cursor: "pointer",
              transition: "background 120ms, color 120ms",
            }}
          >
            {t.label}
          </button>
        );
      })}
    </div>
  );
}

function SummaryPanel({ summary, onReset }: { summary: RegionSummary; onReset: () => void }) {
  const isDE = summary.level === "de";
  const selected = !isDE ? bundeslandByAgs(summary.region_id) : null;
  const totalMw = summary.total_kwp / 1000;

  return (
    <>
      <Kachel
        label={summary.name + (selected?.short ? ` · ${selected.short}` : "")}
        value={`${totalMw.toLocaleString("de-DE", { maximumFractionDigits: 0 })} MW`}
        hint={`installiert · ${summary.energietraeger}`}
      />
      <Kachel
        label="Anlagen"
        value={summary.total_count.toLocaleString("de-DE")}
        hint={`⌀ ${(summary.total_kwp / summary.total_count).toFixed(0)} kWp`}
      />
      {summary.energietraeger === "solar" && summary.by_segment.length > 1 && (
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
              marginBottom: 8,
            }}
          >
            Segmente
          </div>
          {summary.by_segment.map((s) => {
            const mw = s.kwp / 1000;
            const share = summary.total_kwp > 0 ? s.kwp / summary.total_kwp : 0;
            return (
              <div
                key={s.segment}
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "baseline",
                  fontSize: 13,
                  padding: "4px 0",
                  color: v("--color-text-primary"),
                }}
              >
                <span>{SEGMENT_LABEL[s.segment] ?? s.segment}</span>
                <span style={{ fontVariantNumeric: "tabular-nums", color: v("--color-text-secondary") }}>
                  {mw.toLocaleString("de-DE", { maximumFractionDigits: 0 })} MW ·{" "}
                  {(share * 100).toFixed(0)}%
                </span>
              </div>
            );
          })}
        </div>
      )}
      {!isDE && (
        <button
          onClick={onReset}
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
          ← Zurück zu Deutschland
        </button>
      )}
      <div style={{ fontSize: 11, color: v("--color-text-muted"), paddingTop: 4 }}>
        Quelle: {summary.source === "placeholder" ? "Platzhalter (grobe Schätzung)" : "Marktstammdatenregister (Bundesnetzagentur)"}
        {" · Stand "}
        {summary.data_as_of}
      </div>
    </>
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
      <div
        style={{
          fontSize: 22,
          fontWeight: 700,
          color: v("--color-text-primary"),
          fontVariantNumeric: "tabular-nums",
          fontFamily: '"JetBrains Mono", ui-monospace, SFMono-Regular, monospace',
          letterSpacing: -0.3,
        }}
      >
        {value}
      </div>
      {hint && <div style={{ fontSize: 12, color: v("--color-text-secondary"), marginTop: 2 }}>{hint}</div>}
    </div>
  );
}

function Placeholder() {
  return (
    <div
      style={{
        background: v("--color-bg-muted"),
        border: `1px solid ${v("--color-border")}`,
        borderRadius: 12,
        padding: 14,
        fontSize: 13,
        color: v("--color-text-muted"),
      }}
    >
      lade…
    </div>
  );
}
