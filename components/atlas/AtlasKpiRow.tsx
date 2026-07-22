"use client";

import { useEffect, useRef, useState } from "react";
import { v, space, pad } from "../../lib/theme";
import { IconChevronDown, IconHelpCircle, IconClose } from "../Icons";
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
  const isMobile = useIsMobile();
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
        isMobile ? (
          // Auf dem Handy EINE durchgehende Wischzeile über alle Gruppen: einzelne
          // graue Kacheln, man wischt die ganze Zeile (nicht innerhalb einer Box).
          // Der Gruppentitel steht über seinem Kachel-Bündel; Erklärungen stehen
          // hier direkt an der Kachel (kein Umdrehen — dafür ist auf dem Handy kein
          // Platz).
          <MobileKpiRow key={valuesKey} groups={groups} dev={dev} />
        ) : (
          // Desktop: Gruppen als eigene Boxen nebeneinander; die Spaltenbreite folgt
          // der Zahl der Kennzahlen (4 : 2 → doppelt so breite Solaranlagen-Box).
          <div
            key={valuesKey}
            className="kpi-groups"
            style={{ "--kpi-group-cols": groups.map((g) => `${g.tiles.length}fr`).join(" ") } as React.CSSProperties}
          >
            {groups.map((g, gi) => (
              <GroupBox key={gi} group={g} dev={dev} />
            ))}
          </div>
        )
      ) : (
        // Einzelne titellose Gruppe: schlichte Reihe eigenständiger Kacheln,
        // unverändert für Kreis-/Bundesland-Seite.
        <div key={valuesKey} className="kpi-plainrow" style={{ marginBottom: space.sm }}>
          {groups[0]?.tiles.map((t, i) => (
            <div key={i} style={S.standalone}>
              <Tile t={t} dev={dev(t.metric)} showSub />
            </div>
          ))}
          {groups[0]?.note && <div style={S.groupNote}>{groups[0].note}</div>}
        </div>
      )}
    </>
  );
}

/**
 * Ist der Bildschirm schmal? Erst nach dem Mounten echt ausgewertet (matchMedia
 * gibt es serverseitig nicht) — der erste Render ist „desktop", damit Server und
 * Client übereinstimmen; auf dem Handy schaltet der Effekt sofort um.
 */
function useIsMobile(): boolean {
  const [mobile, setMobile] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(max-width:640px)");
    const update = () => setMobile(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);
  return mobile;
}

/**
 * Handy-Ansicht der Kennzahlen: EINE horizontal wischbare Zeile über alle Gruppen.
 * Jede Gruppe ist ein Bündel aus Titel und einzelnen grauen Kacheln; gewischt wird
 * die ganze Zeile. Erklärungen (Kachel-Fußnoten, Pumpspeicher-Hinweis) stehen hier
 * direkt an der Kachel bzw. unter der Gruppe — das Umdrehen der Desktop-Box passt
 * auf dem Handy nicht in eine Wischzeile.
 */
function MobileKpiRow({ groups, dev }: { groups: KpiGroup[]; dev: (m?: string) => number | null }) {
  return (
    <div className="kpi-mrow">
      {groups.map((g, gi) => (
        <div className="kpi-mgroup" key={gi}>
          {g.title && <div className="kpi-mtitle">{g.title}</div>}
          <div className="kpi-mcards">
            {g.tiles.map((t, i) => (
              <div className="kpi-mcard" key={i}>
                <Tile t={t} dev={dev(t.metric)} showSub />
              </div>
            ))}
          </div>
          {g.note && <div className="kpi-mnote">{g.note}</div>}
        </div>
      ))}
    </div>
  );
}

/**
 * Eine Gruppen-Box mit Umdreh-Funktion. Hat die Gruppe erklärungsbedürftige
 * Zusatzangaben (Kachel-Fußnoten wie „⌀ 16 kWh, gemischt" oder der
 * Pumpspeicher-Hinweis), stehen die NICHT unter den Zahlen — sie verstopfen dort
 * die ruhige Kachel — sondern auf der Rückseite, erreichbar über das Fragezeichen
 * oben rechts. Ohne solche Angaben (z. B. die Solaranlagen-Box) gibt es kein
 * Fragezeichen und keine Rückseite. Flip-Technik wie components/MastrLiveRadial.
 */
function GroupBox({ group, dev }: { group: KpiGroup; dev: (m?: string) => number | null }) {
  const [flipped, setFlipped] = useState(false);
  const explains = group.tiles
    .filter((t): t is KpiTile & { sub: string } => !!t.sub)
    .map((t) => ({ label: t.label, sub: t.sub }));
  const hasBack = explains.length > 0 || !!group.note;

  const front = (
    <div style={S.groupBox}>
      <div style={S.groupHead}>
        {group.title && <div style={S.groupTitle}>{group.title}</div>}
        {hasBack && (
          <button
            type="button"
            onClick={() => setFlipped(true)}
            style={S.helpBtn}
            aria-label="Erklärung zu diesen Zahlen anzeigen"
            title="Was bedeuten diese Zahlen?"
          >
            <IconHelpCircle size={15} />
          </button>
        )}
      </div>
      <div className="kpi-tilerow" style={{ "--kpi-tiles": group.tiles.length } as React.CSSProperties}>
        {group.tiles.map((t, i) => (
          // Trennlinie kommt aus .kpi-cell + .kpi-cell — kann auf schmalen
          // Schirmen per Media Query zum 2×2-Gitter werden.
          <div key={i} className="kpi-cell">
            <Tile t={t} dev={dev(t.metric)} />
          </div>
        ))}
      </div>
    </div>
  );

  if (!hasBack) return front;

  return (
    // height:100% durchgereicht, damit die graue Fläche die (per stretch) gleich
    // hohe Grid-Zelle füllt — sonst bliebe die Flip-Box auf ihrer natürlichen Höhe.
    <div style={{ perspective: 1200, height: "100%" }}>
      <div
        style={{
          position: "relative",
          height: "100%",
          transformStyle: "preserve-3d",
          transition: "transform 0.5s cubic-bezier(.4,0,.2,1)",
          transform: flipped ? "rotateY(180deg)" : "rotateY(0deg)",
        }}
      >
        {/* Vorderseite definiert die Höhe; Fade auf halber Drehung verdeckt das
            Durchscheinen in Browsern ohne sauberes backface-visibility. */}
        <div style={{ height: "100%", backfaceVisibility: "hidden", WebkitBackfaceVisibility: "hidden", opacity: flipped ? 0 : 1, transition: "opacity 0.1s ease 0.2s" }}>
          {front}
        </div>
        {/* Rückseite: gleiche Maße, gegengleich eingeblendet. */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            backfaceVisibility: "hidden",
            WebkitBackfaceVisibility: "hidden",
            transform: "rotateY(180deg)",
            opacity: flipped ? 1 : 0,
            transition: "opacity 0.1s ease 0.2s",
          }}
        >
          <div style={{ ...S.groupBox, height: "100%", overflow: "auto" }}>
            <div style={S.groupHead}>
              {group.title && <div style={S.groupTitle}>{group.title}</div>}
              <button
                type="button"
                onClick={() => setFlipped(false)}
                style={S.helpBtn}
                aria-label="Zurück zu den Zahlen"
                title="Zurück"
              >
                <IconClose size={15} />
              </button>
            </div>
            {explains.map((e, i) => (
              <div key={i} style={S.explainRow}>
                <span style={S.explainLabel}>{e.label}</span>
                <span>{e.sub}</span>
              </div>
            ))}
            {group.note && <div style={S.explainNote}>{group.note}</div>}
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * Der Inhalt einer Kachel: Beschriftung, Wert, Einheit als eigene Zeile darunter
 * (klein, heller), Tendenzpfeil. Die Einheit steht IMMER unter dem Wert — nie mal
 * daneben, mal umgebrochen —, damit die Kacheln als Raster ruhig lesen. Die
 * Fußnote (`sub`) rendert hier nur, wenn `showSub` gesetzt ist: in der
 * Gruppen-Box wandert sie auf die Rückseite (GroupBox), in der schlichten Reihe
 * bleibt sie sichtbar.
 */
function Tile({ t, dev, showSub = false }: { t: KpiTile; dev: number | null; showSub?: boolean }) {
  return (
    <>
      <div style={S.tileLabel}>{t.label}</div>
      {/* Wert + Einheit als Klassen (nicht inline), damit die Schrift auf schmalen
          Schirmen per Media Query kleiner werden kann — inline schlägt jede
          Media Query. */}
      <div className="kpi-val">{t.value}</div>
      {/* Einheit-Zeile IMMER da (leer per non-breaking space, wenn es keine gibt):
          so haben alle Kacheln dieselbe Struktur, die Tendenz fluchtet und es
          gibt genau EINEN Abstand zwischen Zahl und Tendenz — ohne Bottom-Align. */}
      <div className="kpi-unit">{t.unit || " "}</div>
      <div className="kpi-tend">
        <TendTag dev={dev} />
      </div>
      {showSub && t.sub && <div style={S.tileSub}>{t.sub}</div>}
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
    // Füllt die (per align-items:stretch) gleich hohe Grid-Zelle.
    height: "100%",
  },
  // Titelzeile: Titel links, Fragezeichen rechts. Feste Mindesthöhe, damit der
  // Kopf mit UND ohne Fragezeichen gleich hoch ist — sonst wird die Box mit
  // Fragezeichen höher und die Innenabstände laufen zwischen den Gruppen
  // auseinander (das Fragezeichen ist größer als der Titel-Text).
  groupHead: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: space.sm,
    minHeight: 20,
    marginBottom: space.sm,
  },
  groupTitle: {
    fontSize: 11,
    fontWeight: 700,
    letterSpacing: "0.04em",
    textTransform: "uppercase",
    color: v("--color-text-secondary"),
  },
  helpBtn: {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    background: "none",
    border: "none",
    padding: 2,
    margin: 0,
    color: v("--color-text-muted"),
    cursor: "pointer",
    flexShrink: 0,
  },
  // Rückseite: je eine Zeile Erklärung, Kennzahl-Name fett davor.
  explainRow: {
    fontSize: 12,
    color: v("--color-text-secondary"),
    lineHeight: 1.5,
    marginBottom: space.xs,
  },
  explainLabel: { fontWeight: 700, color: v("--color-text-primary"), marginRight: space.xs },
  explainNote: {
    fontSize: 12,
    color: v("--color-text-muted"),
    lineHeight: 1.5,
    marginTop: space.xs,
    paddingTop: space.xs,
    borderTop: `1px solid ${v("--color-border")}`,
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
