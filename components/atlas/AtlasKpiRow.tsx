"use client";

import { useEffect, useRef, useState } from "react";
import useEmblaCarousel from "embla-carousel-react";
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
 * die Zahl trägt die Kachel, die Einheit steht kleiner daneben. Als ein String
 * übergeben würde sie in Kachelgröße mitschreien.
 */
export type KpiTile = { label: string; value: string; unit?: string; metric?: string; sub?: string };
/**
 * Eine Kachel-Gruppe, z. B. „Solaranlagen" und „Speicher".
 *
 * Ohne Titel rendert die Gruppe als schlichte Kachelreihe — so bleibt die
 * Kreis-/Bundesland-Seite unverändert, während die Gemeinde-Seite zwei benannte
 * Blöcke zeigt. `note` gehört zur Gruppe (etwa der Pumpspeicher-Hinweis), nicht
 * unter die ganze Reihe: dort stünde er neben Zahlen, über die er nichts sagt.
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

  // Eine Reihe statt Gruppenblöcke: die Kacheln sind schmal genug, dass alle
  // sechs nebeneinander passen. Die Gruppen-Titel entfallen dabei — deshalb muss
  // jede Kachel-Beschriftung für sich stehen ("Batterien", nicht "Anzahl").
  const alleKacheln = groups.flatMap((g) => g.tiles);
  const hinweise = groups.map((g) => g.note).filter((n): n is string => !!n);

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

      {/* Neu gekeyt, sobald sich die Werte ändern (z. B. Eigentümer-Filter) — die
          Kacheln blenden dann um, statt hart zu springen. */}
      <KachelReihe
        key={groups.flatMap((g) => g.tiles.map((t) => t.value)).join("|")}
        tiles={alleKacheln}
        dev={dev}
      />
      {hinweise.map((h, i) => (
        <div key={i} style={S.footnote}>
          {h}
        </div>
      ))}
    </>
  );
}

/**
 * Die Kachel-Reihe: auf breiten Schirmen alle Kacheln nebeneinander, auf schmalen
 * ein Slider.
 *
 * Embla übernimmt nur das Wischen — kein Loop, keine Pfeile, kein Autoplay: für
 * sechs Kacheln gäbe es nichts zu loopen (die bekannte Falle, dass Embla den Loop
 * still abschaltet, wenn die Slides den Viewport nicht füllen), und dragFree
 * bleibt aus, damit die Kacheln an ihrer Kante einrasten.
 *
 * Der Slider läuft NUR unterhalb der Umbruchbreite: darüber wird der Embla-
 * Container per CSS wieder zum Grid, damit auf dem Desktop nichts wischbar ist,
 * was gar nicht überläuft.
 */
function KachelReihe({ tiles, dev }: { tiles: KpiTile[]; dev: (m?: string) => number | null }) {
  // Ohne JavaScript gibt es keinen Slider — dann darf die Reihe nicht mit
  // overflow:hidden abgeschnitten sein, sonst sind die hinteren Kacheln
  // unerreichbar. Bis Embla montiert ist, scrollt der Rahmen nativ.
  const [sliderBereit, setSliderBereit] = useState(false);
  useEffect(() => setSliderBereit(true), []);

  const [emblaRef] = useEmblaCarousel({
    align: "start",
    containScroll: "trimSnaps",
    active: true,
    breakpoints: { "(min-width: 761px)": { active: false } },
  });

  return (
    <div
      className="kpi-viewport"
      ref={emblaRef}
      style={{ ...S.viewport, overflowX: sliderBereit ? "hidden" : "auto" }}
    >
      <div className="kpi-reihe">
        {tiles.map((t, i) => (
          <div key={i} className="kpi-kachel" style={S.metric}>
            <div style={S.metricLabel}>{t.label}</div>
            <div style={S.metricValue}>
              {t.value}
              {t.unit && <span style={S.metricUnit}> {t.unit}</span>}
            </div>
            <TendTag dev={dev(t.metric)} />
            {t.sub && <div style={S.metricSub}>{t.sub}</div>}
          </div>
        ))}
      </div>
    </div>
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
  // Layout NICHT inline: Inline-Styles schlagen jede Media Query, der Slider
  // hätte auf dem Handy nie umgeschaltet. Grid/Flex stehen deshalb komplett im
  // CSS-Block (lib/theme.ts, .kpi-reihe) — hier bleibt nur die Einblend-Animation.
  // Die Einblend-Animation gehört auf den äußeren Rahmen, NICHT auf die Reihe:
  // sie animiert transform, und genau darüber schiebt Embla den Slider. Beides
  // auf demselben Element heißt, dass die Animation Embla überschreibt — der
  // Slider sprang dann vertikal statt horizontal.
  viewport: { marginBottom: space.sm, animation: "fu 0.28s ease-out" },
  metric: { background: v("--color-bg-muted"), borderRadius: v("--radius-md"), padding: pad("lg") },
  metricLabel: { fontSize: 12, color: v("--color-text-secondary"), marginBottom: space.xs },
  metricValue: { fontFamily: v("--font-mono"), fontSize: 22, fontWeight: 700 },
  // Die Einheit ordnet sich unter: kleiner, ruhiger, aber lesbar.
  metricUnit: { fontSize: v("--font-size-small"), fontWeight: 600, color: v("--color-text-secondary") },
  metricSub: { fontSize: 10, color: v("--color-text-muted"), marginTop: space.xxs, lineHeight: 1.4 },
  footnote: {
    fontSize: 12,
    color: v("--color-text-secondary"),
    margin: `${space.xs}px ${space.xxs}px 0`,
    lineHeight: 1.5,
  },
  caption: { fontSize: v("--font-size-body"), color: v("--color-text-secondary"), margin: `0 ${space.xxs}px ${space.sm}px`, lineHeight: 1.5 },
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
