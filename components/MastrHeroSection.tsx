"use client";

import { ReactNode, useEffect, useMemo, useState } from "react";
import { MastrMap, type RegionValue } from "./MastrMap";
import { LoadingDots } from "./LoadingDots";
import { MastrLiveRadial } from "./MastrLiveRadial";
import { bundeslandByAgs } from "../lib/mastr-regions";
import type { Energietraeger, RegionSummary, SegmentFilter } from "../lib/mastr-data";
import { useCachedFetch } from "../lib/use-cached-fetch";
import { DATA_SOURCES, sourceLabel } from "../lib/data-sources";
import { isEmbedContext } from "../lib/embed-context";
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
  steckersolar: "Balkonkraftwerke",
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

const CHOROPLETH_DEFAULT: ChoroplethResp = { source: "", data_as_of: "", data: [] };
const SUMMARY_DEFAULT: RegionSummary | null = null;

export function MastrHeroSection({ initialRegion, onRegionChange }: MastrHeroSectionProps) {
  const [energietraeger, setEnergietraeger] = useState<Energietraeger>("gesamt");
  const [segment, setSegment] = useState<SegmentFilter>("alle");
  const [selectedAgs, setSelectedAgs] = useState<string | undefined>(
    initialRegion && initialRegion !== "de" ? initialRegion : undefined,
  );
  // The clicked region's name straight from the map geometry — shown instantly
  // while the summary API (which also carries the name) is still loading, so a
  // freshly-selected Kreis never reads a bare "Landkreis" placeholder.
  const [selectedName, setSelectedName] = useState<string | undefined>(undefined);

  // Segment filter only applies to solar. Reset when switching away.
  const effectiveSegment: SegmentFilter = energietraeger === "solar" ? segment : "alle";

  useEffect(() => {
    if (energietraeger !== "solar" && segment !== "alle") {
      setSegment("alle");
    }
  }, [energietraeger, segment]);

  useEffect(() => {
    onRegionChange?.(selectedAgs);
  }, [selectedAgs, onRegionChange]);

  // Embed pages have no atlas detail pages to link into — resolve this after
  // mount (path-based) so the "Zur Gemeinde-/Landkreis-Seite" affordances stay
  // out of embeds. SSR renders the site variant; embeds drop the links post-hydration.
  const [isEmbed, setIsEmbed] = useState(false);
  useEffect(() => setIsEmbed(isEmbedContext()), []);

  // Drilldown levels derive from the length of selectedAgs:
  //   undefined   → de-level: show 16 Bundesländer
  //   2-digit AGS → bundesland-level: zoom into the Bundesland, show its Kreise
  //   5-digit AGS → landkreis-level: zoom into the Kreis, show its Gemeinden
  // A Gemeinde (8-digit) is never a persistent selection — clicking one leaves
  // the map for its atlas page (handleSelect), so the deepest map view is the
  // Kreis with its Gemeinden.
  const isBlSelected = selectedAgs?.length === 2;
  const isLkSelected = selectedAgs?.length === 5;
  const mapLevel: "de" | "bundesland" | "landkreis" = isLkSelected
    ? "landkreis"
    : isBlSelected
      ? "bundesland"
      : "de";
  // Map zoom target AND choropleth parent: the selected region itself (BL shows
  // Kreise, Kreis shows Gemeinden). The Bundesland for the breadcrumb is always
  // the first two digits, regardless of how deep we are.
  const parentAgs = isBlSelected || isLkSelected ? selectedAgs : undefined;
  const blAgs = selectedAgs ? selectedAgs.slice(0, 2) : undefined;
  const choroplethParent = parentAgs ?? "de";

  const choroplethEndpoint = `/api/mastr/choropleth?parent=${choroplethParent}&type=${energietraeger}&segment=${effectiveSegment}`;
  const region = selectedAgs ?? "de";
  const summaryEndpoint = `/api/mastr/summary?region=${region}&type=${energietraeger}&segment=${effectiveSegment}`;

  // Cache version bump — invalidates stale localStorage entries when the data
  // shape or granularity changes (bumped to v2 when choropleth moved from
  // Bundesland- to Landkreis-aggregates; v4 adds Gemeinde-level + enclosed
  // kreisfreie Städte to Kreis choropleths).
  const CACHE_VERSION = "v4";

  const {
    data: choropleth,
    loading: choroplethLoading,
    error: choroplethError,
    isStale: choroplethStale,
    refetch: refetchChoropleth,
  } = useCachedFetch<ChoroplethResp>(
    choroplethEndpoint,
    `${CACHE_VERSION}-mastr-choropleth-${choroplethParent}-${energietraeger}-${effectiveSegment}`,
    CHOROPLETH_DEFAULT,
    { longLived: false, keyPrefix: "sc-mastr-" },
  );

  const {
    data: summary,
    error: summaryError,
    isStale: summaryStale,
    refetch: refetchSummary,
  } = useCachedFetch<RegionSummary | null>(
    summaryEndpoint,
    `${CACHE_VERSION}-mastr-summary-${region}-${energietraeger}-${effectiveSegment}`,
    SUMMARY_DEFAULT,
    { longLived: false, keyPrefix: "sc-mastr-" },
  );

  const handleSelect = (ags: string, name?: string) => {
    // Gemeinde (8-digit): the deepest level. Leave the map for that Gemeinde's
    // atlas detail page. Inside an embed there are no detail pages to go to, so
    // the click drills no further — viewing the Kreis's Gemeinden and hovering
    // for their values is the read-only payoff there.
    if (ags.length === 8) {
      if (!isEmbedContext()) {
        window.location.href = `/api/atlas/goto?ags=${ags}`;
      }
      return;
    }
    if (selectedAgs === ags) {
      // Clicking the already-selected region goes up a level. The parent's name
      // resolves instantly (Bundesland lookup), so drop the geo-name fallback.
      setSelectedAgs(ags.length === 5 ? ags.slice(0, 2) : undefined); // LK → BL, BL → DE
      setSelectedName(undefined);
    } else {
      setSelectedAgs(ags);
      setSelectedName(name); // show the clicked region's name immediately
    }
  };

  // Breadcrumb jumps bypass handleSelect — clear the geo-name fallback too, so a
  // later summary is the only source of the name for the target level.
  const goToLevel = (ags: string | undefined) => {
    setSelectedAgs(ags);
    setSelectedName(undefined);
  };

  const values: RegionValue[] = useMemo(
    () => choropleth.data.map((d) => ({ ags: d.region_id, value: d.kwp / 1000 })),
    [choropleth],
  );

  const hasError = !!(choroplethError || summaryError);
  const isStale = choroplethStale || summaryStale;

  return (
    <section aria-label="MaStR Übersicht">
      <TraegerSwitch value={energietraeger} onChange={setEnergietraeger} />

      {energietraeger === "solar" && <SegmentSwitch value={segment} onChange={setSegment} />}

      {(isStale || hasError) && (
        <StaleBanner
          stale={isStale}
          error={hasError}
          onRetry={() => {
            refetchChoropleth();
            refetchSummary();
          }}
        />
      )}

      {selectedAgs && blAgs && (
        <MapBreadcrumb
          isLk={isLkSelected}
          blAgs={blAgs}
          blName={bundeslandByAgs(blAgs)?.name ?? blAgs}
          lkName={isLkSelected ? summary?.name ?? selectedName : undefined}
          onGo={goToLevel}
        />
      )}

      <div
        className={
          "mastr-hero-grid" +
          (energietraeger === "solar" ? " has-filter" : "") +
          (selectedAgs ? " has-breadcrumb" : "")
        }
        style={{ marginTop: 16 }}
      >
        <div>
          <MastrMap
            level={mapLevel}
            parentAgs={parentAgs}
            values={values}
            selectedAgs={selectedAgs}
            onSelect={handleSelect}
            valueLabel="MW"
            loading={choroplethLoading}
          />
          {isLkSelected && !isEmbed && (
            <GemeindeHint kreisAgs={selectedAgs} kreisName={summary?.name ?? selectedName} />
          )}
        </div>

        <aside className="mastr-hero-aside" style={{ minWidth: 0 }}>
          {/* Live radial — shown on the homepage AND in the embed (same view).
              On mobile it drops below the KPI row (via CSS order) so map +
              numbers share the first screen. */}
          {!selectedAgs && energietraeger !== "speicher" && effectiveSegment === "alle" && (
            <div className="mastr-live">
              <MastrLiveRadial
                energietraeger={energietraeger}
                installedKwp={summary?.total_kwp ?? null}
              />
            </div>
          )}
          <SummaryPanel
            summary={summary}
            regionAgs={region}
            fallbackName={selectedName}
            energietraeger={energietraeger}
            segment={effectiveSegment}
          />
          {summaryError && !summary && (
            <ErrorKachel message={summaryError} onRetry={refetchSummary} />
          )}
        </aside>
      </div>
      <div
        style={{
          fontSize: 10,
          color: v("--color-text-faint"),
          marginTop: 10,
          textAlign: "right",
        }}
      >
        Karte: © GeoBasis-DE / BKG (Verwaltungsgebiete VG2500 · VG250 Gemeinden,{" "}
        <a
          href="https://www.govdata.de/dl-de/by-2-0"
          target="_blank"
          rel="noopener noreferrer"
          style={{ color: "inherit", textDecoration: "underline" }}
        >
          dl-de/by-2-0
        </a>
        ) · Daten: Marktstammdatenregister / Bundesnetzagentur, Datenlizenz{" "}
        <a
          href="https://www.govdata.de/dl-de/by-2-0"
          target="_blank"
          rel="noopener noreferrer"
          style={{ color: "inherit", textDecoration: "underline" }}
        >
          dl-de/by-2-0
        </a>{" "}
        (Daten aggregiert)
        {!selectedAgs && energietraeger !== "speicher" && effectiveSegment === "alle" && (
          <> · Live-Erzeugung: {sourceLabel(DATA_SOURCES.energyCharts)}</>
        )}
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
  steckersolar: "Balkonkraftwerke",
  privat_dach: "Privat",
  gewerbe_dach: "Gewerbe",
  freiflaeche: "Freifläche",
};

const MONTHS_DE = [
  "Januar", "Februar", "März", "April", "Mai", "Juni",
  "Juli", "August", "September", "Oktober", "November", "Dezember",
];

export function formatDataAsOf(iso: string): string {
  const m = /^(\d{4})-(\d{2})-\d{2}$/.exec(iso);
  if (!m) return iso;
  return `${MONTHS_DE[parseInt(m[2], 10) - 1]} ${m[1]}`;
}

// Shown under the map once you have drilled into a Kreis (which then shows its
// Gemeinden). Tells the visitor the Gemeinden are clickable and offers a jump to
// the Kreis's own atlas page. Not rendered inside embeds (no detail pages there).
function GemeindeHint({ kreisAgs, kreisName }: { kreisAgs: string; kreisName?: string }) {
  return (
    <div
      style={{
        display: "flex",
        flexWrap: "wrap",
        alignItems: "center",
        gap: 8,
        marginTop: 8,
        fontSize: 12,
        color: v("--color-text-muted"),
      }}
    >
      <span>Tippen Sie auf eine Gemeinde, um ihre Solar-Zahlen im Detail zu sehen.</span>
      <a
        href={`/api/atlas/goto?ags=${kreisAgs}`}
        style={{ color: v("--color-accent"), fontWeight: 600, textDecoration: "none", whiteSpace: "nowrap" }}
      >
        {kreisName ? `Alle Zahlen zu ${kreisName}` : "Zur Landkreis-Seite"} →
      </a>
    </div>
  );
}

// Breadcrumb above the map: Deutschland › Bundesland › Landkreis. Each crumb
// jumps to that level; the last (current) level carries an ✕ to go up one.
function MapBreadcrumb({
  isLk,
  blAgs,
  blName,
  lkName,
  onGo,
}: {
  isLk: boolean;
  blAgs: string;
  blName: string;
  lkName?: string;
  onGo: (ags: string | undefined) => void;
}) {
  const link: React.CSSProperties = {
    background: "none", border: 0, padding: 0, cursor: "pointer",
    fontSize: 13, fontWeight: 600, color: v("--color-accent"), fontFamily: "inherit",
  };
  const sep: React.CSSProperties = { color: v("--color-text-muted"), fontSize: 13 };
  const current: React.CSSProperties = {
    fontSize: 13, fontWeight: 700, color: v("--color-text-primary"),
    display: "inline-flex", alignItems: "center", gap: 4,
  };
  const close: React.CSSProperties = {
    background: "none", border: 0, padding: "0 2px", cursor: "pointer",
    color: v("--color-text-muted"), fontSize: 14, lineHeight: 1, fontFamily: "inherit",
  };
  const Current = ({ label, up }: { label: string; up: string | undefined }) => (
    <span style={current}>
      {label}
      <button style={close} onClick={() => onGo(up)} aria-label="Ebene schließen" title="Eine Ebene zurück">
        ✕
      </button>
    </span>
  );
  return (
    <nav aria-label="Navigation" style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap", marginTop: 14 }}>
      <button style={link} onClick={() => onGo(undefined)}>Deutschland</button>
      <span style={sep}>›</span>
      {isLk ? (
        <>
          <button style={link} onClick={() => onGo(blAgs)}>{blName}</button>
          <span style={sep}>›</span>
          <Current label={lkName ?? "Landkreis"} up={blAgs} />
        </>
      ) : (
        <Current label={blName} up={undefined} />
      )}
    </nav>
  );
}

function SummaryPanel({
  summary,
  regionAgs,
  fallbackName,
  energietraeger,
  segment,
}: {
  summary: RegionSummary | null;
  regionAgs: string;
  /** Name from the map geometry, shown until the summary (with the authoritative name) loads. */
  fallbackName?: string;
  energietraeger: Energietraeger;
  segment: SegmentFilter;
}) {
  // Labels derive from UI state — known immediately for DE + Bundesländer.
  // Landkreis names come from the API response (DB lookup), so until summary
  // loads the label shows just the AGS as a placeholder.
  const isDE = regionAgs === "de";
  const isBl = !isDE && regionAgs.length === 2;
  const bl = isBl ? bundeslandByAgs(regionAgs) : null;
  let regionName: string;
  if (isDE) regionName = "Deutschland";
  else if (isBl) regionName = bl?.name ?? regionAgs;
  else regionName = summary?.name ?? fallbackName ?? regionAgs;
  const regionLabel = regionName + (bl?.short ? ` · ${bl.short}` : "");
  const traegerLabel = TRAEGER_DISPLAY[energietraeger];
  const segmentSuffix = segment !== "alle" ? ` · ${SEGMENT_DISPLAY[segment]}` : "";

  const totalMw = summary ? summary.total_kwp / 1000 : null;
  const totalCount = summary ? summary.total_count : null;
  const avgKwp = summary && summary.total_count > 0 ? summary.total_kwp / summary.total_count : null;

  return (
    <div className="mastr-summary" style={{ display: "grid", gap: 12, minWidth: 0 }}>
      {/* "Kapazität <Träger>" + "Stand <Monat Jahr> · <Region>" — names what the
          three KPI tiles below are (installed capacity), with the data date and
          region. Both stay dynamic: träger and region follow the filter/map. */}
      <div style={{ display: "grid", gap: 2, minWidth: 0 }}>
        <span style={{ fontSize: 15, fontWeight: 700, color: v("--color-text-primary") }}>
          Kapazität {traegerLabel}
          {segmentSuffix}
        </span>
        <span style={{ fontSize: 12, color: v("--color-text-muted") }}>
          {summary
            ? `${summary.source === "placeholder" ? "Schätzung · " : "Stand "}${formatDataAsOf(summary.data_as_of)} · ${regionLabel}`
            : regionLabel}
        </span>
      </div>

      <div className="mastr-kpis">
        <Kachel
          label="Leistung"
          value={
            totalMw !== null
              ? totalMw >= 1000
                ? `${(totalMw / 1000).toLocaleString("de-DE", { minimumFractionDigits: 1, maximumFractionDigits: 1 })} GW`
                : `${totalMw.toLocaleString("de-DE", { maximumFractionDigits: 0 })} MW`
              : <LoadingDots />
          }
        />
        <Kachel
          label="Anlagen"
          value={totalCount !== null ? totalCount.toLocaleString("de-DE") : <LoadingDots />}
        />
        <Kachel
          label="⌀ Größe"
          value={avgKwp !== null ? `${avgKwp.toFixed(0)} kWp` : <LoadingDots />}
        />
      </div>
      {summary && energietraeger === "solar" && segment === "alle" && summary.by_segment.length > 1 && (
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
    </div>
  );
}

export function Kachel({ label, value, hint }: { label: string; value: ReactNode; hint?: string }) {
  return (
    <div
      className="kachel-tile"
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
        className="kachel-value"
        style={{
          fontSize: 22,
          fontWeight: 700,
          color: v("--color-text-primary"),
          fontVariantNumeric: "tabular-nums",
          fontFamily: v("--font-mono"),
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

function StaleBanner({
  stale,
  error,
  onRetry,
}: {
  stale: boolean;
  error: boolean;
  onRetry: () => void;
}) {
  const message = error
    ? "Daten konnten nicht geladen werden. Zeige letzte bekannte Werte."
    : stale
      ? "Daten werden aktualisiert…"
      : "";
  if (!message) return null;
  return (
    <div
      role="status"
      style={{
        marginTop: 8,
        fontSize: 12,
        color: error ? v("--color-negative") : v("--color-text-muted"),
        background: error ? v("--color-negative-dim") : v("--color-bg-muted"),
        border: `1px solid ${error ? v("--color-negative-border") : v("--color-border")}`,
        borderRadius: 8,
        padding: "6px 10px",
        display: "flex",
        alignItems: "center",
        gap: 10,
      }}
    >
      <span style={{ flex: 1 }}>{message}</span>
      {error && (
        <button
          onClick={onRetry}
          style={{
            padding: "3px 10px",
            fontSize: 12,
            fontWeight: 600,
            color: v("--color-text-on-accent"),
            background: v("--color-accent"),
            border: "none",
            borderRadius: 6,
            cursor: "pointer",
          }}
        >
          Erneut versuchen
        </button>
      )}
    </div>
  );
}

function ErrorKachel({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div
      style={{
        background: v("--color-negative-dim"),
        border: `1px solid ${v("--color-negative-border")}`,
        borderRadius: 12,
        padding: 12,
        fontSize: 13,
        color: v("--color-negative"),
        display: "grid",
        gap: 8,
      }}
    >
      <div>Fehler: {message}</div>
      <button
        onClick={onRetry}
        style={{
          padding: "6px 12px",
          fontSize: 13,
          fontWeight: 600,
          color: v("--color-text-on-accent"),
          background: v("--color-accent"),
          border: "none",
          borderRadius: 8,
          cursor: "pointer",
          justifySelf: "start",
        }}
      >
        Erneut laden
      </button>
    </div>
  );
}

