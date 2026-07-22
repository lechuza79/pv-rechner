"use client";

import { ReactNode, useEffect, useMemo, useRef, useState } from "react";
import { MastrMap, type RegionValue } from "./MastrMap";
import { LoadingDots } from "./LoadingDots";
import { MastrLiveRadial } from "./MastrLiveRadial";
import { bundeslandByAgs } from "../lib/mastr-regions";
import type { Energietraeger, RegionSummary, SegmentFilter } from "../lib/mastr-data";
import { useCachedFetch } from "../lib/use-cached-fetch";
import { DATA_SOURCES } from "../lib/data-sources";
import { DataSourceNote } from "./PoweredBy";
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
  /** Vorgewählter Energieträger (Default "gesamt"). Auf den solar-fokussierten
   *  Atlas-Seiten "solar", damit die Karten-KPI zur Solar-Zahl der Seite passt. */
  initialTraeger?: Energietraeger;
  /** Called whenever the selected region changes (for URL sync, analytics, etc.) */
  onRegionChange?: (regionAgs: string | undefined) => void;
  /**
   * Sichtbaren Quell-Credit zeigen. Default true. Auf `false` NUR dort, wo eine
   * umgebende Seite die Quelle bereits im Fuß trägt (einmal pro Seite reicht,
   * dl-de/by-2-0). Der Credit bleibt trotzdem sichtbar, sobald das Widget
   * eingebettet ist (Standalone-Kontext) — dann ersetzt kein Seitenfuß ihn.
   */
  showSource?: boolean;
};

const CHOROPLETH_DEFAULT: ChoroplethResp = { source: "", data_as_of: "", data: [] };
const SUMMARY_DEFAULT: RegionSummary | null = null;

export function MastrHeroSection({
  initialRegion,
  initialTraeger = "gesamt",
  onRegionChange,
  showSource = true,
}: MastrHeroSectionProps) {
  const [energietraeger, setEnergietraeger] = useState<Energietraeger>(initialTraeger);
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

  const handleSelect = (ags: string, name?: string, kreisfrei?: boolean) => {
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
    // Kreisfreie Stadt / Stadtkreis (5-digit, but a single Gemeinde): drilling
    // only re-shows the city, a dead-end zoom. Go straight to its page instead —
    // goto resolves the 5-digit AGS to the city's leaf page. Not in embeds.
    if (ags.length === 5 && kreisfrei) {
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

      {/* Navigations-Bar über der Karte — jetzt auch auf DE-Ebene (dort nur
          „Deutschland"). Breadcrumb links, Regionssuche rechts. */}
      <div className="mastr-mapbar">
        <MapBreadcrumb
          selectedAgs={selectedAgs}
          isLk={isLkSelected}
          blAgs={blAgs}
          blName={blAgs ? bundeslandByAgs(blAgs)?.name ?? blAgs : undefined}
          lkName={isLkSelected ? summary?.name ?? selectedName : undefined}
          onGo={goToLevel}
        />
        <RegionSearch onPick={handleSelect} />
      </div>

      <div
        className={
          "mastr-hero-grid has-breadcrumb" +
          (energietraeger === "solar" ? " has-filter" : "")
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
            valueLabel={energietraeger === "solar" ? "MWp" : "MW"}
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
      {/* Quell-Credit: sichtbar, AUSSER eine umgebende Seite trägt ihn schon
          (showSource=false) UND wir sind nicht im Embed. Im Embed steht kein
          Seitenfuß dahinter, deshalb zeigt das Widget die Quelle dort immer —
          das ist der nachhaltige Teil (dl-de/by-2-0 verlangt Namensnennung pro
          verteiltem Werk). */}
      {(showSource || isEmbed) && (
        <div
          style={{
            fontSize: 10,
            color: v("--color-text-faint"),
            marginTop: 10,
            textAlign: "right",
          }}
        >
          <DataSourceNote
            source={[
              DATA_SOURCES.bkg,
              DATA_SOURCES.mastr,
              ...(!selectedAgs && energietraeger !== "speicher" && effectiveSegment === "alle"
                ? [DATA_SOURCES.energyCharts]
                : []),
            ]}
          />
        </div>
      )}
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
  selectedAgs,
  isLk,
  blAgs,
  blName,
  lkName,
  onGo,
}: {
  /** Aktuelle Ebene: undefined = Deutschland, sonst 2/5-stellige AGS. */
  selectedAgs?: string;
  isLk: boolean;
  blAgs?: string;
  blName?: string;
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
  // Deutschland-Ebene: nur der Wurzel-Krümel, ohne Link/Schließen — er ist die
  // aktuelle Ebene, es gibt keine höhere.
  if (!selectedAgs) {
    return (
      <nav aria-label="Navigation" style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap", minWidth: 0 }}>
        <span style={{ ...current, gap: 0 }}>Deutschland</span>
      </nav>
    );
  }
  return (
    <nav aria-label="Navigation" style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap", minWidth: 0 }}>
      <button style={link} onClick={() => onGo(undefined)}>Deutschland</button>
      <span style={sep}>›</span>
      {isLk ? (
        <>
          <button style={link} onClick={() => onGo(blAgs)}>{blName}</button>
          <span style={sep}>›</span>
          <Current label={lkName ?? "Landkreis"} up={blAgs} />
        </>
      ) : (
        <Current label={blName ?? "Bundesland"} up={undefined} />
      )}
    </nav>
  );
}

// Lupe — inline, weil Icons.tsx keine Such-Glyphe hat.
function SearchGlyph({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden style={{ flexShrink: 0 }}>
      <circle cx="11" cy="11" r="7" stroke="currentColor" strokeWidth="2" />
      <path d="M20 20l-3.5-3.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

type SearchHit = { region_id: string; name: string; label: string };

/**
 * Regionssuche rechts in der Karten-Bar. Klick auf die Lupe klappt das Feld auf
 * und fokussiert; Tippen (ab 2 Zeichen, entprellt) fragt /api/atlas/search ab.
 * Ein Treffer verhält sich wie ein Klick auf die Karte (onPick = handleSelect):
 * Bundesland/Landkreis filtern die Karte an Ort und Stelle, Gemeinde/kreisfreie
 * Stadt öffnen ihre Seite. Findet Gemeinden, Kreise und Bundesländer.
 */
function RegionSearch({ onPick }: { onPick: (ags: string, name: string, kreisfrei: boolean) => void }) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const [hits, setHits] = useState<SearchHit[]>([]);
  const [active, setActive] = useState(-1);
  const [loading, setLoading] = useState(false);
  const wrapRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);

  const close = () => {
    setOpen(false);
    setQ("");
    setHits([]);
    setActive(-1);
  };

  // Beim Aufklappen ins Feld fokussieren — zuverlässiger als ein rAF im Klick,
  // weil der Effekt erst nach dem sichtbaren Re-Render läuft.
  useEffect(() => {
    if (open) inputRef.current?.focus();
  }, [open]);

  // Außerhalb geklickt → schließen.
  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) close();
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open]);

  // Entprellte Suche.
  useEffect(() => {
    const term = q.trim();
    if (term.length < 2) {
      setHits([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    const t = setTimeout(async () => {
      try {
        const res = await fetch(`/api/atlas/search?q=${encodeURIComponent(term)}`);
        const json = (await res.json()) as { hits?: SearchHit[] };
        setHits(json.hits ?? []);
        setActive(-1);
      } catch {
        setHits([]);
      } finally {
        setLoading(false);
      }
    }, 200);
    return () => clearTimeout(t);
  }, [q]);

  // Wie ein Karten-Klick: BL/Kreis filtern die Karte (setSelectedAgs im Parent),
  // Gemeinde/kreisfreie Stadt öffnen ihre Seite. Die kreisfrei-Info steckt im
  // Label ("Kreisfreie Stadt" / "Stadtkreis").
  const pick = (h: SearchHit) => {
    close();
    onPick(h.region_id, h.name, /Kreisfreie Stadt|Stadtkreis/i.test(h.label));
  };

  const onKey = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") return close();
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActive((i) => Math.min(i + 1, hits.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter" && hits.length) {
      const h = hits[active >= 0 ? active : 0];
      if (h) pick(h);
    }
  };

  return (
    <div ref={wrapRef} style={{ position: "relative", flexShrink: 0 }}>
      <div style={{ ...SB.field, ...(open ? SB.fieldOpen : null) }}>
        <button
          type="button"
          onClick={() => (open ? close() : setOpen(true))}
          style={SB.iconBtn}
          aria-label={open ? "Suche schließen" : "Region suchen"}
          title="Region suchen"
        >
          <SearchGlyph />
        </button>
        <input
          ref={inputRef}
          value={q}
          onChange={(e) => setQ(e.target.value)}
          onKeyDown={onKey}
          placeholder="Gemeinde, Kreis, Land …"
          aria-label="Region suchen"
          style={{ ...SB.input, ...(open ? SB.inputOpen : null) }}
          tabIndex={open ? 0 : -1}
        />
      </div>

      {open && q.trim().length >= 2 && (
        <div style={SB.dropdown} role="listbox">
          {loading && !hits.length ? (
            <div style={SB.empty}>Suche …</div>
          ) : hits.length ? (
            hits.map((h, i) => (
              <button
                key={h.region_id}
                type="button"
                role="option"
                aria-selected={i === active}
                onMouseEnter={() => setActive(i)}
                onClick={() => pick(h)}
                style={{ ...SB.hit, background: i === active ? v("--color-bg-muted") : "transparent" }}
              >
                <span style={SB.hitName}>{h.name}</span>
                <span style={SB.hitLevel}>{h.label}</span>
              </button>
            ))
          ) : (
            <div style={SB.empty}>Nichts gefunden</div>
          )}
        </div>
      )}
    </div>
  );
}

const SB: Record<string, React.CSSProperties> = {
  field: {
    display: "flex",
    alignItems: "center",
    gap: 4,
    border: `1px solid transparent`,
    borderRadius: 10,
    padding: "3px 4px",
    transition: "border-color 0.18s ease, background 0.18s ease",
    color: v("--color-text-secondary"),
  },
  fieldOpen: {
    border: `1px solid ${v("--color-border")}`,
    background: v("--color-bg"),
  },
  iconBtn: {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    background: "none",
    border: "none",
    padding: 4,
    margin: 0,
    color: "inherit",
    cursor: "pointer",
  },
  input: {
    width: 0,
    opacity: 0,
    border: "none",
    outline: "none",
    background: "none",
    padding: 0,
    fontFamily: "inherit",
    fontSize: 13,
    color: v("--color-text-primary"),
    transition: "width 0.2s ease, opacity 0.2s ease",
  },
  inputOpen: { width: 190, opacity: 1, paddingRight: 4 },
  dropdown: {
    position: "absolute",
    top: "calc(100% + 4px)",
    right: 0,
    minWidth: 240,
    maxWidth: 300,
    background: v("--color-bg"),
    border: `1px solid ${v("--color-border")}`,
    borderRadius: 10,
    boxShadow: "0 8px 28px rgba(0,0,0,0.12)",
    padding: 4,
    zIndex: 30,
    maxHeight: 320,
    overflowY: "auto",
  },
  hit: {
    display: "flex",
    alignItems: "baseline",
    justifyContent: "space-between",
    gap: 10,
    width: "100%",
    background: "none",
    border: "none",
    borderRadius: 7,
    padding: "8px 10px",
    textAlign: "left",
    cursor: "pointer",
    fontFamily: "inherit",
  },
  hitName: { fontSize: 14, color: v("--color-text-primary"), fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" },
  hitLevel: { fontSize: 11, color: v("--color-text-muted"), flexShrink: 0 },
  empty: { padding: "10px 12px", fontSize: 13, color: v("--color-text-muted") },
};

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

  // Photovoltaik wird in Peak-Leistung angegeben (kWp/MWp), Wind, Biomasse und
  // Speicher in normaler Nennleistung — die Einheit folgt deshalb der Auswahl.
  const peak = energietraeger === "solar" ? "p" : "";
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
                ? `${(totalMw / 1000).toLocaleString("de-DE", { minimumFractionDigits: 1, maximumFractionDigits: 1 })} GW${peak}`
                : `${totalMw.toLocaleString("de-DE", { maximumFractionDigits: 0 })} MW${peak}`
              : <LoadingDots />
          }
        />
        <Kachel
          label="Anlagen"
          value={totalCount !== null ? totalCount.toLocaleString("de-DE") : <LoadingDots />}
        />
        <Kachel
          label="⌀ Größe"
          value={avgKwp !== null ? `${avgKwp.toFixed(0)} kW${peak}` : <LoadingDots />}
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

