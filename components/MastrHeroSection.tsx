"use client";

import { useEffect, useState } from "react";
import { MastrMap, type RegionValue } from "./MastrMap";
import { bundeslandByAgs } from "../lib/mastr-regions";
import type { Energietraeger, RegionSummary, SegmentFilter } from "../lib/mastr-data";
import { v } from "../lib/theme";

// Tab order: aggregate first, then individual renewables, then storage (separated)
const RENEWABLE_TRAEGER: { key: Energietraeger; label: string }[] = [
  { key: "gesamt", label: "Gesamt" },
  { key: "solar", label: "Solar" },
  { key: "wind", label: "Wind" },
  { key: "biomasse", label: "Biomasse" },
  { key: "wasser", label: "Wasser" },
];
const STORAGE_TRAEGER: { key: Energietraeger; label: string } = { key: "speicher", label: "Speicher" };

// Primary segment filter options (for solar). "Freifläche" is rendered as
// a secondary option (visually distinct / smaller).
const PRIMARY_SEGMENTS: { key: SegmentFilter; label: string }[] = [
  { key: "alle", label: "Alle" },
  { key: "privat_dach", label: "Privat" },
  { key: "gewerbe_dach", label: "Gewerbe" },
];
const SECONDARY_SEGMENT: { key: SegmentFilter; label: string } = { key: "freiflaeche", label: "Freifläche" };

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

export type MastrHeroSectionProps = {
  /** Initial selected region. Use "de" for the whole country. */
  initialRegion?: string;
  /** Called whenever the selected region changes (for URL sync, analytics, etc.) */
  onRegionChange?: (regionAgs: string | undefined) => void;
};

export function MastrHeroSection({ initialRegion, onRegionChange }: MastrHeroSectionProps) {
  const [energietraeger, setEnergietraeger] = useState<Energietraeger>("gesamt");
  const [segment, setSegment] = useState<SegmentFilter>("alle");
  const [selectedAgs, setSelectedAgs] = useState<string | undefined>(
    initialRegion && initialRegion !== "de" ? initialRegion : undefined,
  );
  const [choropleth, setChoropleth] = useState<ChoroplethResp | null>(null);
  const [summary, setSummary] = useState<RegionSummary | null>(null);

  // Segment filter only applies to solar. Reset when switching away.
  const effectiveSegment: SegmentFilter = energietraeger === "solar" ? segment : "alle";

  useEffect(() => {
    if (energietraeger !== "solar" && segment !== "alle") {
      setSegment("alle");
    }
  }, [energietraeger, segment]);

  useEffect(() => {
    fetch(`/api/mastr/choropleth?parent=de&type=${energietraeger}&segment=${effectiveSegment}`)
      .then((r) => r.json())
      .then(setChoropleth)
      .catch(() => setChoropleth(null));
  }, [energietraeger, effectiveSegment]);

  useEffect(() => {
    const region = selectedAgs ?? "de";
    fetch(`/api/mastr/summary?region=${region}&type=${energietraeger}&segment=${effectiveSegment}`)
      .then((r) => r.json())
      .then(setSummary)
      .catch(() => setSummary(null));
  }, [selectedAgs, energietraeger, effectiveSegment]);

  useEffect(() => {
    onRegionChange?.(selectedAgs);
  }, [selectedAgs, onRegionChange]);

  const handleSelect = (ags: string) => {
    setSelectedAgs((prev) => (prev === ags ? undefined : ags));
  };

  const values: RegionValue[] =
    choropleth?.data.map((d) => ({ ags: d.region_id, value: d.kwp / 1000 })) ?? [];

  return (
    <section aria-label="MaStR Übersicht">
      <TraegerSwitch value={energietraeger} onChange={setEnergietraeger} />

      {energietraeger === "solar" && <SegmentSwitch value={segment} onChange={setSegment} />}

      <div className="mastr-hero-grid" style={{ marginTop: 16 }}>
        <div
          style={{
            background: v("--color-bg-accent"),
            borderRadius: 14,
            padding: 12,
            border: `1px solid ${v("--color-border")}`,
          }}
        >
          <MastrMap
            level="de"
            values={values}
            selectedAgs={selectedAgs}
            onSelect={handleSelect}
            valueLabel="MW"
          />
        </div>

        <aside style={{ display: "grid", gap: 12, minWidth: 0 }}>
          {summary ? (
            <SummaryPanel
              summary={summary}
              segment={effectiveSegment}
              onReset={() => setSelectedAgs(undefined)}
            />
          ) : (
            <LoadingKachel />
          )}
        </aside>
      </div>
    </section>
  );
}

function TraegerSwitch({
  value,
  onChange,
}: {
  value: Energietraeger;
  onChange: (v: Energietraeger) => void;
}) {
  const renderButton = (t: { key: Energietraeger; label: string }) => {
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
          whiteSpace: "nowrap",
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
  };

  return (
    <div
      role="tablist"
      style={{
        display: "flex",
        alignItems: "center",
        flexWrap: "wrap",
        gap: 8,
        maxWidth: "100%",
      }}
    >
      <div
        style={{
          display: "flex",
          gap: 4,
          padding: 4,
          background: v("--color-bg-muted"),
          borderRadius: 10,
          border: `1px solid ${v("--color-border")}`,
          overflowX: "auto",
        }}
      >
        {RENEWABLE_TRAEGER.map(renderButton)}
      </div>
      <div
        aria-hidden="true"
        style={{
          width: 1,
          height: 20,
          background: v("--color-border-muted"),
          flexShrink: 0,
        }}
      />
      <div
        style={{
          display: "flex",
          padding: 4,
          background: v("--color-bg-muted"),
          borderRadius: 10,
          border: `1px solid ${v("--color-border")}`,
        }}
      >
        {renderButton(STORAGE_TRAEGER)}
      </div>
    </div>
  );
}

function SegmentSwitch({
  value,
  onChange,
}: {
  value: SegmentFilter;
  onChange: (s: SegmentFilter) => void;
}) {
  const renderPrimary = (s: { key: SegmentFilter; label: string }) => {
    const active = s.key === value;
    return (
      <button
        key={s.key}
        role="tab"
        aria-selected={active}
        onClick={() => onChange(s.key)}
        style={{
          padding: "4px 10px",
          fontSize: 12,
          fontWeight: active ? 600 : 400,
          whiteSpace: "nowrap",
          color: active ? v("--color-accent") : v("--color-text-secondary"),
          background: active ? v("--color-accent-dim") : "transparent",
          border: `1px solid ${active ? v("--color-accent") : v("--color-border")}`,
          borderRadius: 16,
          cursor: "pointer",
          transition: "all 120ms",
        }}
      >
        {s.label}
      </button>
    );
  };

  const freiActive = value === SECONDARY_SEGMENT.key;

  return (
    <div
      role="tablist"
      aria-label="Solar-Segmente"
      style={{
        display: "flex",
        alignItems: "center",
        flexWrap: "wrap",
        gap: 6,
        marginTop: 8,
      }}
    >
      {PRIMARY_SEGMENTS.map(renderPrimary)}
      <span style={{ color: v("--color-text-faint"), fontSize: 12, margin: "0 2px" }}>·</span>
      <button
        role="tab"
        aria-selected={freiActive}
        onClick={() => onChange(freiActive ? "alle" : SECONDARY_SEGMENT.key)}
        style={{
          padding: "3px 8px",
          fontSize: 11,
          fontWeight: freiActive ? 600 : 400,
          color: freiActive ? v("--color-accent") : v("--color-text-muted"),
          background: freiActive ? v("--color-accent-dim") : "transparent",
          border: `1px dashed ${freiActive ? v("--color-accent") : v("--color-border-muted")}`,
          borderRadius: 14,
          cursor: "pointer",
          transition: "all 120ms",
        }}
      >
        {SECONDARY_SEGMENT.label}
      </button>
    </div>
  );
}

const TRAEGER_DISPLAY: Record<Energietraeger, string> = {
  gesamt: "Erneuerbare",
  solar: "Solar",
  wind: "Wind",
  biomasse: "Biomasse",
  wasser: "Wasser",
  speicher: "Speicher",
};

const SEGMENT_DISPLAY: Record<SegmentFilter, string> = {
  alle: "",
  privat_dach: "Privat",
  gewerbe_dach: "Gewerbe",
  freiflaeche: "Freifläche",
};

function SummaryPanel({
  summary,
  segment,
  onReset,
}: {
  summary: RegionSummary;
  segment: SegmentFilter;
  onReset: () => void;
}) {
  const isDE = summary.level === "de";
  const selected = !isDE ? bundeslandByAgs(summary.region_id) : null;
  const totalMw = summary.total_kwp / 1000;
  const avgKwp = summary.total_count > 0 ? summary.total_kwp / summary.total_count : 0;
  const traegerLabel = TRAEGER_DISPLAY[summary.energietraeger];
  const segmentSuffix = segment !== "alle" ? ` · ${SEGMENT_DISPLAY[segment]}` : "";

  return (
    <>
      <Kachel
        label={summary.name + (selected?.short ? ` · ${selected.short}` : "")}
        value={`${totalMw.toLocaleString("de-DE", { maximumFractionDigits: 0 })} MW`}
        hint={`installiert · ${traegerLabel}${segmentSuffix}`}
      />
      <Kachel
        label="Anlagen"
        value={summary.total_count.toLocaleString("de-DE")}
        hint={`⌀ ${avgKwp.toFixed(0)} kWp`}
      />
      {summary.energietraeger === "solar" && summary.by_segment.length > 1 && (
        <div
          style={{
            background: v("--color-bg"),
            border: `1px solid ${v("--color-border")}`,
            borderRadius: 12,
            padding: 12,
          }}
        >
          <div
            style={{
              fontSize: 11,
              textTransform: "uppercase",
              letterSpacing: 0.8,
              color: v("--color-text-muted"),
              marginBottom: 6,
            }}
          >
            Segmente
          </div>
          {summary.by_segment.map((s) => {
            const share = summary.total_kwp > 0 ? s.kwp / summary.total_kwp : 0;
            return (
              <div
                key={s.segment}
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "baseline",
                  fontSize: 13,
                  padding: "3px 0",
                  color: v("--color-text-primary"),
                }}
              >
                <span>{SEGMENT_LABEL[s.segment] ?? s.segment}</span>
                <span
                  style={{
                    fontVariantNumeric: "tabular-nums",
                    color: v("--color-text-secondary"),
                  }}
                >
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
      <div style={{ fontSize: 11, color: v("--color-text-muted"), paddingTop: 2 }}>
        {summary.source === "placeholder"
          ? "Platzhalter-Schätzung · Stand "
          : "Marktstammdatenregister · Stand "}
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
        padding: 12,
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
      {hint && (
        <div style={{ fontSize: 12, color: v("--color-text-secondary"), marginTop: 2 }}>{hint}</div>
      )}
    </div>
  );
}

function LoadingKachel() {
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
