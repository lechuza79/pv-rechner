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
/**
 * Eine Kachel. `value` ist der Zahlenwert, `unit` die Einheit — bewusst getrennt:
 * die Zahl trägt die Kachel, die Einheit steht als eigene Zeile klein darunter.
 * Als ein String übergeben würde sie in Kachelgröße mitschreien und je nach
 * Zahlbreite mal daneben, mal umgebrochen stehen (uneinheitlich).
 */
export type KpiTile = { label: string; value: string; unit?: string; metric?: string; sub?: string };
/**
 * Eine Kachel-Gruppe, z. B. „Solaranlagen" und „Batteriespeicher".
 *
 * Bei mehreren Gruppen wird jede zu EINER Box mit Titel; die Kennzahlen darin
 * sind durch dünne senkrechte Linien getrennt statt als einzelne Kacheln zu
 * schweben. Eine einzelne titellose Gruppe (Kreis-/Bundesland-Seite) bleibt eine
 * schlichte Reihe eigenständiger Kacheln. `note` gehört zur Gruppe (etwa der
 * Pumpspeicher-Hinweis), nicht unter die ganze Reihe: dort stünde er neben
 * Zahlen, über die er nichts sagt.
 */
export type KpiGroup = { title?: string; tiles: KpiTile[]; note?: string };

export default function AtlasKpiRow({
  groups,
  regionPerCap,
  references,
  defaultRefKey,
  note,
}: {
  groups: KpiGroup[];
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

  const grouped = groups.length > 1;
  // Neu gekeyt, sobald sich die Werte ändern (z. B. Eigentümer-Filter) — die
  // Kacheln blenden dann um, statt hart zu springen.
  const valuesKey = groups.flatMap((g) => g.tiles.map((t) => t.value)).join("|");

  return (
    <>
      {/* Die Tendenz-Erklärung steht ÜBER den Kacheln: sie sagt, was die kleinen
          Pfeile IN den Kacheln bedeuten — das gehört davor, nicht dahinter. */}
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

      {grouped ? (
        // Gruppen als eigene Boxen nebeneinander; die Spaltenbreite folgt der Zahl
        // der Kennzahlen (4 : 2 → doppelt so breite Solaranlagen-Box), damit die
        // einzelnen Werte in beiden Boxen etwa gleich breit sind. Auf schmalen
        // Schirmen stapeln sie (Media Query in lib/theme.ts, .kpi-groups).
        <div
          key={valuesKey}
          className="kpi-groups"
          style={{ "--kpi-group-cols": groups.map((g) => `${g.tiles.length}fr`).join(" ") } as React.CSSProperties}
        >
          {groups.map((g, gi) => (
            <div key={gi} style={S.groupBox}>
              {g.title && <div style={S.groupTitle}>{g.title}</div>}
              <div
                className="kpi-tilerow"
                style={{ "--kpi-tiles": g.tiles.length } as React.CSSProperties}
              >
                {g.tiles.map((t, i) => (
                  // Trennlinie kommt aus .kpi-cell + .kpi-cell (jede Zelle außer
                  // der ersten), nicht aus einer i>0-Prüfung — so kann sie auf
                  // schmalen Schirmen per Media Query weichen.
                  <div key={i} className="kpi-cell">
                    <Tile t={t} dev={dev(t.metric)} />
                  </div>
                ))}
              </div>
              {g.note && <div style={S.groupNote}>{g.note}</div>}
            </div>
          ))}
        </div>
      ) : (
        // Einzelne titellose Gruppe: schlichte Reihe eigenständiger Kacheln,
        // unverändert für Kreis-/Bundesland-Seite.
        <div key={valuesKey} className="kpi-plainrow" style={{ marginBottom: space.sm }}>
          {groups[0]?.tiles.map((t, i) => (
            <div key={i} style={S.standalone}>
              <Tile t={t} dev={dev(t.metric)} />
            </div>
          ))}
          {groups[0]?.note && <div style={S.groupNote}>{groups[0].note}</div>}
        </div>
      )}
    </>
  );
}

/**
 * Der Inhalt einer Kachel: Beschriftung, Wert, Einheit als eigene Zeile darunter
 * (klein, heller), Tendenzpfeil, optionale Fußzeile. Die Einheit steht IMMER
 * unter dem Wert — nie mal daneben, mal umgebrochen —, damit die Kacheln als
 * Raster ruhig lesen.
 */
function Tile({ t, dev }: { t: KpiTile; dev: number | null }) {
  return (
    <>
      <div style={S.tileLabel}>{t.label}</div>
      {/* Wert + Einheit als Klassen (nicht inline), damit die Schrift auf schmalen
          Schirmen per Media Query kleiner werden kann — inline schlägt jede
          Media Query. */}
      <div className="kpi-val">{t.value}</div>
      {t.unit && <div className="kpi-unit">{t.unit}</div>}
      <TendTag dev={dev} />
      {t.sub && <div style={S.tileSub}>{t.sub}</div>}
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
  // Eine Gruppen-Box: gemeinsame Fläche, Titel oben, Kennzahlen innen durch Linien
  // getrennt. Ecken/Hintergrund wie die übrigen Panels.
  groupBox: {
    background: v("--color-bg-muted"),
    borderRadius: v("--radius-md"),
    padding: pad("lg"),
    minWidth: 0,
  },
  groupTitle: {
    fontSize: 11,
    fontWeight: 700,
    letterSpacing: "0.04em",
    textTransform: "uppercase",
    color: v("--color-text-secondary"),
    marginBottom: space.sm,
  },
  // Eigenständige Kachel (titellose Einzelgruppe): eigener Hintergrund.
  standalone: {
    background: v("--color-bg-muted"),
    borderRadius: v("--radius-md"),
    padding: pad("lg"),
    minWidth: 0,
  },

  tileLabel: { fontSize: 12, color: v("--color-text-secondary"), marginBottom: space.xs },
  tileSub: { fontSize: 10, color: v("--color-text-muted"), marginTop: space.xxs, lineHeight: 1.4 },
  groupNote: {
    fontSize: 12,
    color: v("--color-text-secondary"),
    margin: `${space.sm}px ${space.xxs}px 0`,
    lineHeight: 1.5,
  },
  caption: {
    fontSize: v("--font-size-body"),
    color: v("--color-text-secondary"),
    margin: `0 ${space.xxs}px ${space.sm}px`,
    lineHeight: 1.5,
  },
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
    fontSize: "inherit",
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
