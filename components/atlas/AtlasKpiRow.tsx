"use client";

import { useEffect, useRef, useState } from "react";
import { v, space, pad } from "../../lib/theme";
import { IconChevronDown } from "../Icons";
import TendTag from "./TendTag";

/**
 * KPI-Reihe mit umschaltbarer Vergleichs-Referenz. Die „Tendenz je Einwohner"
 * jeder Kachel wird gegen den Durchschnitt einer wählbaren übergeordneten Ebene
 * gerechnet (Kommune → Landkreis/Land/Deutschland, Kreis → Land/Deutschland,
 * Land → Deutschland). Alle Pro-Kopf-Werte kommen fertig vom Server; die
 * Komponente rechnet nur das Verhältnis und rendert TendTag + den Umschalter.
 */
type PerCap = Record<string, number | null>;
export type RefLevel = { key: string; name: string; perCap: PerCap };
export type KpiTile = { label: string; value: string; metric?: string; sub?: string };

export default function AtlasKpiRow({
  tiles,
  regionPerCap,
  references,
  defaultRefKey,
  note,
}: {
  tiles: KpiTile[];
  regionPerCap: PerCap;
  references: RefLevel[];
  defaultRefKey: string;
  /** Satz hinter der Vergleichs-Erklärung, z. B. wenn ein Eigentümer-Filter aktiv
   *  ist und Werte wie Vergleichsbasis auf dieselbe Kategorie eingeschränkt sind. */
  note?: string;
}) {
  const [refKey, setRefKey] = useState(defaultRefKey);
  const ref = references.find((r) => r.key === refKey) ?? references[0] ?? null;

  const dev = (m?: string): number | null => {
    if (!m || !ref) return null;
    const a = regionPerCap[m];
    const b = ref.perCap[m];
    if (a == null || b == null || b === 0) return null;
    return a / b - 1;
  };

  return (
    <>
      {/* Neu gekeyt, sobald sich die Werte ändern (z. B. Eigentümer-Filter) — die
          Kacheln blenden dann um, statt hart zu springen. */}
      <div
        key={tiles.map((t) => t.value).join("|")}
        style={{ ...S.grid, marginBottom: references.length ? space.sm : space.xxxl }}
      >
        {tiles.map((t, i) => (
          <div key={i} style={S.metric}>
            <div style={S.metricLabel}>{t.label}</div>
            <div style={S.metricValue}>{t.value}</div>
            <TendTag dev={dev(t.metric)} />
            {t.sub && <div style={S.metricSub}>{t.sub}</div>}
          </div>
        ))}
      </div>
      {ref && (
        <div style={S.caption}>
          Tendenz: je Einwohner gegenüber dem Durchschnitt in{" "}
          {references.length > 1 ? (
            <RefPicker refs={references} value={ref.key} onChange={setRefKey} />
          ) : (
            <strong style={S.captionStrong}>{ref.name}</strong>
          )}
          .{note ? ` ${note}` : ""}
        </div>
      )}
    </>
  );
}

function RefPicker({
  refs,
  value,
  onChange,
}: {
  refs: RefLevel[];
  value: string;
  onChange: (k: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const wrap = useRef<HTMLSpanElement | null>(null);
  useEffect(() => {
    if (!open) return;
    const fn = (e: MouseEvent) => {
      if (wrap.current && !wrap.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", fn);
    return () => document.removeEventListener("mousedown", fn);
  }, [open]);
  const current = refs.find((r) => r.key === value) ?? refs[0];
  return (
    <span ref={wrap} style={{ position: "relative", display: "inline-block" }}>
      <button type="button" onClick={() => setOpen((o) => !o)} style={S.pickerBtn} title="Vergleichs-Ebene wählen">
        {current.name}
        <IconChevronDown size={8} />
      </button>
      {open && (
        <span style={S.dropdown}>
          {refs.map((r) => (
            <button
              key={r.key}
              type="button"
              onClick={() => {
                onChange(r.key);
                setOpen(false);
              }}
              style={{ ...S.dropItem, fontWeight: r.key === value ? 700 : 400 }}
            >
              {r.name}
            </button>
          ))}
        </span>
      )}
    </span>
  );
}

const S: Record<string, React.CSSProperties> = {
  grid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(110px, 1fr))",
    gap: space.md,
    animation: "fu 0.28s ease-out",
  },
  metric: { background: v("--color-bg-muted"), borderRadius: v("--radius-md"), padding: pad("lg") },
  metricLabel: { fontSize: 12, color: v("--color-text-secondary"), marginBottom: space.xs },
  metricValue: { fontFamily: v("--font-mono"), fontSize: 22, fontWeight: 700 },
  metricSub: { fontSize: 10, color: v("--color-text-muted"), marginTop: space.xxs, lineHeight: 1.4 },
  caption: { fontSize: 11, color: v("--color-text-muted"), margin: `0 ${space.xxs}px ${space.xxl}px`, lineHeight: 1.5 },
  captionStrong: { color: v("--color-text-secondary"), fontWeight: 600 },
  pickerBtn: {
    display: "inline-flex",
    alignItems: "center",
    gap: space.xxs,
    background: "none",
    border: "none",
    padding: 0,
    margin: 0,
    fontFamily: "inherit",
    fontSize: 11,
    fontWeight: 700,
    color: v("--color-accent"),
    cursor: "pointer",
  },
  dropdown: {
    position: "absolute",
    top: `calc(100% + ${space.xs}px)`,
    left: 0,
    background: v("--color-bg"),
    border: `1px solid ${v("--color-border")}`,
    borderRadius: v("--radius-sm"),
    boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
    zIndex: 20,
    padding: `${space.xs}px 0`,
    minWidth: 150,
    display: "block",
  },
  dropItem: {
    display: "block",
    width: "100%",
    background: "none",
    border: "none",
    textAlign: "left",
    padding: pad("sm", "lg"),
    fontSize: 12,
    fontFamily: "inherit",
    color: v("--color-text-primary"),
    cursor: "pointer",
    whiteSpace: "nowrap",
  },
};
