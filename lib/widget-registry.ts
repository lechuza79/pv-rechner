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

/**
 * Wording for widgets that show ONE place per call (a municipality, a state).
 *
 * The registry entry holds the genus ("Solaranlagen einer Gemeinde"); the actual
 * place only exists at runtime, in the data. Both templates carry a `{ort}`
 * placeholder that {@link widgetForPlace} fills in — so title, share text and
 * citation name the place, while licence, brand, sources and next step keep
 * coming from the one entry. A chart of a town without the town's name in it is
 * worthless the moment the image leaves the page.
 */
export interface WidgetPlaceTemplates {
  /** Card + image + citation title, e.g. "Solaranlagen in {ort}". */
  title: string;
  /** Share text, e.g. "Solaranlagen in {ort} – Solar Check". */
  shareText: string;
}

export interface WidgetDef {
  /** Embed slug + gallery anchor, e.g. "gruengas-heizkosten". */
  id: string;
  title: string;
  kind: WidgetKind;
  /** Set on widgets parameterised by place — see {@link widgetForPlace}. */
  place?: WidgetPlaceTemplates;
  /**
   * Beispiel-Ort für Übersichtsseiten, die den Einbett-Link nur auflisten.
   *
   * Ein ortsbezogenes Widget ohne Parameter zeigt „Keine gültige Gemeinde
   * angegeben." — auf der Presseseite also genau vor dem Publikum, das wir
   * gewinnen wollen, ein Link ins Leere. Pflicht für jeden Eintrag mit
   * {@link place}, ausgewertet von {@link embedExamplePath}.
   */
  exampleParams?: Record<string, string>;
  /** Where "share" points: the canonical live page for this widget. */
  shareUrl: string;
  shareText: string;
  sources: DataSource[];
  /** The one next step. Omitted where the widget IS the destination. */
  cta?: WidgetCta;
  /** false where no chart SVG can be captured (map, single KPI). */
  exportable?: boolean;
  /**
   * false where the entry has no /embed/<id> route — it exists for the export
   * footer of an on-site view, not as an iframe anyone can take. Linking such an
   * id as an embed would hand out a 404, which is exactly the kind of dead link
   * the register is here to prevent.
   */
  embeddable?: boolean;
}

const SITE = "https://solar-check.io";

/**
 * Obergrenze für die Breite einer Widget-Karte.
 *
 * Ohne sie füllt ein Zeitreihen-Chart jede angebotene Breite — im Embed auf
 * einer breiten Seite und erst recht im heruntergeladenen Bild, das dadurch
 * extrem flach wird (2560 px breit, 700 px hoch). Eine Kurve in so einem
 * Streifen wirkt flacher als sie ist: die Breite verzerrt die Aussage, nicht
 * nur das Layout. Schmalere Karten (Kurzantwort, Einzel-KPI) setzen ihren
 * eigenen, kleineren Wert.
 */
export const WIDGET_MAX_WIDTH = 900;

/**
 * Für Karten, deren Inhalt rund oder kompakt ist (Ring, Donut, Einzel-KPI).
 * Ein Kreis wird durch mehr Breite nicht größer — die Fläche daneben bleibt
 * einfach leer, und im Bild steht das Motiv verloren in der Mitte. Solche
 * Karten umschließen ihren Inhalt, statt jede angebotene Breite zu füllen.
 */
export const WIDGET_MAX_WIDTH_COMPACT = 560;

/**
 * Der Beispiel-Ort für Übersichts- und Presselinks: Höchberg (Gemeindeschlüssel
 * 09679147) und Mecklenburg-Vorpommern (Länderschlüssel 13). Beides echte Orte
 * mit echten Zahlen — dieselben, die die Widget-Galerie in ihrer Vorschau
 * zeigt, damit ein Leser zweimal dasselbe Beispiel sieht.
 */
const BEISPIEL_GEMEINDE = "09679147";
const BEISPIEL_BUNDESLAND = "13";

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
  einspeiseVerlauf: {
    id: "einspeiseverguetung-verlauf",
    title: "Einspeisevergütung seit 2000",
    kind: "chart",
    shareUrl: `${SITE}/einspeiseverguetung-tabelle`,
    shareText:
      "Einspeisevergütung für kleine Dachanlagen seit 2000 – vom Spitzenwert 2004 bis heute, mit den politischen Weichenstellungen",
    sources: [DATA_SOURCES.eegVerguetung],
    cta: { label: "Alle Sätze nachschlagen", href: "/einspeiseverguetung-tabelle" },
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
    // Energy-Charts steht hier, weil die Karte den Live-Ring mitzeigt (aktuelle
    // Erzeugung), solange keine Region gewählt ist — eine Quelle, die im Widget
    // sichtbar wird, gehört in den Credit, auch wenn sie nicht in jedem Zustand
    // gebraucht wird.
    sources: [DATA_SOURCES.mastr, DATA_SOURCES.bkg, DATA_SOURCES.energyCharts],
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
    cta: { label: "Zahlen für deinen Ort", href: "/solar-atlas" },
    exportable: false,
  },
  // ── Kommune und Region: eine Karte, je Aufruf ein anderer Ort ───────────────
  // Titel und Teilen-Text tragen den Ort erst zur Laufzeit (widgetForPlace);
  // hier steht die Gattung, damit Galerie und Übersicht etwas Sinnvolles zeigen.
  gemeindeSolar: {
    id: "gemeinde-solar",
    title: "Solaranlagen einer Gemeinde",
    kind: "chart",
    exampleParams: { ags: BEISPIEL_GEMEINDE },
    place: {
      title: "Solaranlagen in {ort}",
      shareText: "Solaranlagen in {ort}: Anlagen, Leistung und Leistung je Einwohner – Solar Check",
    },
    shareUrl: `${SITE}/solar-atlas`,
    shareText: "Solaranlagen einer Gemeinde – Zahlen aus dem Marktstammdatenregister",
    sources: [DATA_SOURCES.mastr],
    cta: { label: "Eigenes Dach durchrechnen", href: "/photovoltaik-rechner" },
  },
  gemeindeErneuerbare: {
    id: "gemeinde-erneuerbare",
    title: "Erneuerbare Leistung einer Gemeinde",
    kind: "chart",
    exampleParams: { ags: BEISPIEL_GEMEINDE },
    place: {
      title: "Erneuerbare Leistung in {ort}",
      shareText: "Erneuerbare Leistung in {ort} nach Technologie – Solar Check",
    },
    shareUrl: `${SITE}/solar-atlas`,
    shareText: "Erneuerbare Leistung einer Gemeinde nach Technologie – Solar Check",
    sources: [DATA_SOURCES.mastr],
    cta: { label: "Eigenes Dach durchrechnen", href: "/photovoltaik-rechner" },
  },
  gemeindeSolarleistung: {
    id: "gemeinde-solarleistung",
    title: "Solarleistung einer Gemeinde (simuliert)",
    kind: "chart",
    exampleParams: { ags: BEISPIEL_GEMEINDE },
    place: {
      title: "Solarleistung heute in {ort}",
      shareText: "Solarleistung heute in {ort}: was der Anlagenbestand liefert (simuliert) – Solar Check",
    },
    shareUrl: `${SITE}/solar-atlas`,
    shareText: "Solarleistung einer Gemeinde, simuliert aus dem heutigen Wetter – Solar Check",
    sources: [DATA_SOURCES.openMeteo, DATA_SOURCES.mastr],
    cta: { label: "Eigene Anlage simulieren", href: "/pv-simulation" },
  },
  regionAnlagentyp: {
    id: "region-anlagentyp",
    title: "Solarleistung eines Bundeslands nach Anlagentyp",
    kind: "chart",
    exampleParams: { bl: BEISPIEL_BUNDESLAND },
    place: {
      title: "Solarleistung in {ort} nach Anlagentyp",
      shareText: "Solarleistung in {ort} nach Anlagentyp: Dach, Gewerbe und Freifläche – Solar Check",
    },
    shareUrl: `${SITE}/photovoltaik-foerderung`,
    shareText: "Solarleistung eines Bundeslands nach Anlagentyp – Solar Check",
    sources: [DATA_SOURCES.mastr],
    cta: { label: "Förderung im Bundesland prüfen", href: "/photovoltaik-foerderung" },
  },
  regionSolarleistung: {
    id: "region-solarleistung",
    title: "Solarleistung eines Bundeslands (simuliert)",
    kind: "chart",
    exampleParams: { bl: BEISPIEL_BUNDESLAND },
    place: {
      title: "Solarleistung heute in {ort}",
      shareText: "Solarleistung heute in {ort}: was der Anlagenbestand liefert (simuliert) – Solar Check",
    },
    shareUrl: `${SITE}/photovoltaik-foerderung`,
    shareText: "Solarleistung eines Bundeslands, simuliert aus dem heutigen Wetter – Solar Check",
    sources: [DATA_SOURCES.openMeteo, DATA_SOURCES.mastr],
    cta: { label: "Eigene Anlage simulieren", href: "/pv-simulation" },
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
    // Das Ergebnis-Chart des Rechners, kein Widget: es gibt kein /embed/rechner.
    embeddable: false,
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

/**
 * The place-specific reading of a parameterised entry: same widget, this town.
 *
 * Only three things change — title, share text and share target — and all three
 * for the same reason: they are the parts that travel. A downloaded image, a
 * citation and a shared link have to say WHICH place they show; everything else
 * (sources, licence, brand wording, next step, kind) stays the one registry
 * entry, so there is no second place to maintain.
 *
 * `liveUrl` is the canonical page of that place (atlas page, state page). Empty
 * falls back to the genus page rather than to a dead link.
 */
export function widgetForPlace(widget: WidgetDef, ort: string, liveUrl?: string): WidgetDef {
  const fill = (s: string) => s.split("{ort}").join(ort);
  return {
    ...widget,
    title: widget.place ? fill(widget.place.title) : `${widget.title} — ${ort}`,
    shareText: widget.place ? fill(widget.place.shareText) : `${widget.title} — ${ort}`,
    shareUrl: liveUrl || widget.shareUrl,
  };
}

/** Embed path of a widget, or null where there is no iframe route for it. */
export function embedPath(w: WidgetDef): string | null {
  return w.embeddable === false ? null : `/embed/${w.id}`;
}

/**
 * Einbett-Pfad MIT Beispiel-Ort, für Listen, die nur verlinken statt zu
 * konfigurieren. Ohne die Parameter zeigt ein ortsbezogenes Widget bloß seine
 * Fehlermeldung; {@link embedPath} bleibt bewusst parameterfrei, weil daran die
 * Prüfung hängt, ob es die Route überhaupt gibt.
 */
export function embedExamplePath(w: WidgetDef): string | null {
  const basis = embedPath(w);
  if (!basis || !w.exampleParams) return basis;
  return `${basis}?${new URLSearchParams(w.exampleParams).toString()}`;
}

/** The share target as an internal path ("/strommix-deutschland"), for <Link>. */
export function sharePath(w: WidgetDef): string {
  return w.shareUrl.startsWith(SITE) ? w.shareUrl.slice(SITE.length) || "/" : w.shareUrl;
}

/** All entries as a list — for the gallery and the admin overview. */
export function allWidgets(): WidgetDef[] {
  return Object.values(WIDGETS) as WidgetDef[];
}
