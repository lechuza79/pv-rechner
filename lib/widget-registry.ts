import { DATA_SOURCES, type DataSource } from "./data-sources";

// One entry per embeddable widget / exportable chart — the single place where a
// widget's identity lives: what it is, where sharing points, which data it
// stands on, and what it invites people to do next.
//
// Why a register and not props per widget: title, share URL, CTA, sources and
// the brand line were typed into each widget separately. They drifted (a share
// text saying "live" on a widget that shows a fixed year), and every new chart
// started by copying the previous one's footer — which is how the PV-Zubau
// chart shipped without a legend and the Grüngas image without a source.
//
// Adding a chart: add the entry HERE first, then render <WidgetFooter> and
// <WidgetExportFooter> with it. Both take the entry, so page footer, image
// footer and gallery stay in sync by construction.

/**
 * What the thing IS — decides the wording of the brand line in an exported
 * image, where there are no buttons left to explain it:
 *  • "tool"  — you enter your own numbers ("Interaktiv selbst rechnen:")
 *  • "chart" — it depicts data; you can explore, not compute ("Interaktives Chart:")
 * Getting this wrong is a small lie: inviting someone to "rechnen" on a chart
 * that has nothing to enter.
 */
export type WidgetKind = "tool" | "chart";

export interface WidgetCta {
  /** Imperative, concrete — never "Mehr erfahren". */
  label: string;
  href: string;
}

export interface WidgetDef {
  /** Embed slug + gallery anchor, e.g. "gruengas-heizkosten". */
  id: string;
  title: string;
  kind: WidgetKind;
  /** Where "share" points: the canonical live page for this widget. */
  shareUrl: string;
  shareText: string;
  sources: DataSource[];
  /** The one next step. Omitted where the widget IS the destination. */
  cta?: WidgetCta;
  /** false where no chart SVG can be captured (map, single KPI). */
  exportable?: boolean;
}

const SITE = "https://solar-check.io";

export const WIDGETS = {
  gruengasHeizkosten: {
    id: "gruengas-heizkosten",
    title: "Die Rechnung über 20 Jahre",
    kind: "chart",
    shareUrl: `${SITE}/ratgeber/gasheizung-oder-waermepumpe`,
    shareText: "Wärmepumpe vs. neue Gasheizung mit Grüngas-Pflicht – Solar Check",
    sources: [DATA_SOURCES.iw],
    cta: { label: "Für dein Haus durchrechnen", href: "/waermepumpe-rechner" },
  },
  strommix: {
    id: "strommix",
    title: "Strommix Deutschland",
    kind: "chart",
    shareUrl: `${SITE}/strommix-deutschland`,
    shareText: "Strommix Deutschland – live bei Solar Check",
    sources: [DATA_SOURCES.energyCharts],
    cta: { label: "Alle Energiedaten ansehen", href: "/strommix-deutschland" },
  },
  strommixAnteil: {
    id: "strommix-anteil",
    title: "Kernenergie im deutschen Strommix",
    kind: "chart",
    shareUrl: `${SITE}/atomstrom-import`,
    shareText: "Kernenergie im deutschen Strommix (inkl. importiertem Atomstrom)",
    sources: [DATA_SOURCES.energyCharts],
    cta: { label: "Fakten zum Atomstrom-Import", href: "/atomstrom-import" },
  },
  zubauErneuerbareAtom: {
    id: "zubau-erneuerbare-atom",
    title: "Zubau: Erneuerbare vs. Atomkraft",
    kind: "chart",
    shareUrl: `${SITE}/laendervergleich`,
    shareText: "Zubau Erneuerbare vs. Atomkraft im Ländervergleich",
    sources: [DATA_SOURCES.ember],
    cta: { label: "Ländervergleich ansehen", href: "/laendervergleich" },
  },
  pvZubau: {
    id: "pv-zubau-deutschland",
    title: "Photovoltaik-Zubau in Deutschland",
    kind: "chart",
    shareUrl: `${SITE}/photovoltaik-zubau-deutschland`,
    shareText:
      "Wie Förderung den Solarausbau in Deutschland geformt hat – Zubau, Einspeisevergütung & Strompreis seit 2000",
    sources: [DATA_SOURCES.mastr, DATA_SOURCES.eegVerguetung, DATA_SOURCES.eurostat],
    cta: { label: "Die ganze Geschichte lesen", href: "/photovoltaik-zubau-deutschland" },
  },
  erzeugung: {
    id: "erzeugung",
    title: "Stromerzeugung in Deutschland",
    kind: "chart",
    shareUrl: `${SITE}/strommix-deutschland`,
    shareText: "Stromerzeugung in Deutschland – live bei Solar Check",
    sources: [DATA_SOURCES.energyCharts, DATA_SOURCES.mastr],
    cta: { label: "Alle Energiedaten ansehen", href: "/strommix-deutschland" },
  },
  eeAmpel: {
    id: "ee-ampel",
    title: "EE-Ampel",
    kind: "chart",
    shareUrl: `${SITE}/strommix-deutschland?range=24h`,
    shareText: "EE-Ampel: Wie grün ist der deutsche Strom gerade? – Solar Check",
    sources: [DATA_SOURCES.energyCharts],
    cta: { label: "Strommix im Detail", href: "/strommix-deutschland" },
    exportable: false,
  },
  karte: {
    id: "karte",
    title: "PV-Anlagen in Deutschland",
    kind: "chart",
    shareUrl: `${SITE}/`,
    shareText: "PV-Anlagen in Deutschland – Solar Check",
    sources: [DATA_SOURCES.mastr, DATA_SOURCES.bkg],
    cta: { label: "Solar-Atlas öffnen", href: "/" },
    exportable: false,
  },
  kennzahl: {
    id: "kennzahl",
    title: "Kennzahl",
    kind: "chart",
    shareUrl: `${SITE}/`,
    shareText: "Solar-Kennzahlen für Deutschland – Solar Check",
    sources: [DATA_SOURCES.mastr],
    exportable: false,
  },
  // ── Werkzeuge: hier gibt man eigene Zahlen ein ──────────────────────────────
  foerderCheck: {
    id: "foerder-check",
    title: "Förder-Check Wärmepumpe",
    kind: "tool",
    shareUrl: `${SITE}/waermepumpe-rechner`,
    shareText: "Wärmepumpen-Förderung berechnen – Solar Check",
    sources: [DATA_SOURCES.beg],
    cta: { label: "Vollständig durchrechnen", href: "/waermepumpe-rechner" },
    exportable: false,
  },
  simulation: {
    id: "simulation",
    title: "Live PV-Simulation",
    kind: "tool",
    shareUrl: `${SITE}/pv-simulation`,
    shareText: "Live PV-Simulation – Solar Check",
    sources: [DATA_SOURCES.openMeteo],
    cta: { label: "Eigene Anlage rechnen", href: "/photovoltaik-rechner" },
  },
  rechner: {
    id: "rechner",
    title: "PV-Amortisation",
    kind: "tool",
    shareUrl: `${SITE}/photovoltaik-rechner`,
    shareText: "PV-Amortisation – Solar Check",
    sources: [DATA_SOURCES.pvgis],
  },
} satisfies Record<string, WidgetDef>;

export type WidgetId = keyof typeof WIDGETS;

/**
 * The brand line in an exported image. It replaces the buttons the image can't
 * have, so it has to promise the right thing: a chart is explorable, a tool is
 * computable.
 */
export function brandLabel(kind: WidgetKind): string {
  return kind === "tool" ? "Interaktiv selbst rechnen:" : "Interaktives Chart:";
}

/** All entries as a list — for the gallery and the admin overview. */
export function allWidgets(): WidgetDef[] {
  return Object.values(WIDGETS) as WidgetDef[];
}
