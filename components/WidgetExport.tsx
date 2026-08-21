"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { EXPORT_CSS_ATTR, EXPORT_IGNORE_ATTR, EXPORT_ONLY_ATTR } from "../lib/export-markers";
import { useExportNotes } from "./export-notes";
import { PoweredBy } from "./PoweredBy";
import ChartActionBar from "./ChartActionBar";
import CiteModal from "./CiteModal";
import { sourceLabel } from "../lib/data-sources";
import { OWN_WORK_LICENSE } from "../lib/license";
import { brandLabel, type WidgetDef } from "../lib/widget-registry";
import { parseHostPfad } from "../lib/widget-settings";
import type { useChartExport } from "../lib/useChartExport";
import { v } from "../lib/theme";

// Export layer for widgets: everything the website explains INTERACTIVELY has to
// be spelled out in the downloaded/shared image, because a PNG has no hover, no
// tap and no "?" button.
//
// Three rules, one mechanism (the DOM markers consumed by captureNodeToBlob):
//  1. Interactive triggers (switchers, CTAs, "?" buttons) → <ExportIgnore>.
//  2. Everything the image needs but the page doesn't (scale numbers, legend,
//     the help texts behind "?", source, brand) → <ExportOnly>.
//  3. Help texts register THEMSELVES: an <InfoTooltip> inside an
//     <ExportNotesProvider> adds its text to the image footer automatically.
//     Nobody has to remember to copy a tooltip into the export — that was the
//     failure mode this layer exists to prevent.

// ─── 1. Markers ──────────────────────────────────────────────────────────────

/** Hidden on the page, revealed in the exported image. `display` is what the
 * element gets in the image ("block", "flex" — "inline" inside an <svg>). */
export function ExportOnly({
  children,
  display = "block",
  style,
}: {
  children: React.ReactNode;
  display?: string;
  style?: React.CSSProperties;
}) {
  const props = { [EXPORT_ONLY_ATTR]: display, style: { display: "none", ...style } };
  return <div {...props}>{children}</div>;
}

/**
 * Frames its children in the exported image only — a light grey outline with
 * rounded corners around the chart area. On the page the widget card already
 * provides that frame; a second one inside it would just be noise.
 */
export function ExportBox({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) {
  const css = `border:1px solid ${v("--color-border")};border-radius:${v("--radius-md")};padding:10px 10px 6px;`;
  const props = { [EXPORT_CSS_ATTR]: css };
  return (
    <div {...props} style={style}>
      {children}
    </div>
  );
}

/** SVG variant of {@link ExportOnly} — a <g> instead of a <div>, so scale
 * labels and grid annotations can live inside the chart's own coordinates. */
export function ExportOnlyG({ children }: { children: React.ReactNode }) {
  const props = { [EXPORT_ONLY_ATTR]: "inline", style: { display: "none" } };
  return <g {...props}>{children}</g>;
}

/** Visible on the page, dropped from the exported image (anything clickable). */
export function ExportIgnore({
  children,
  style,
  inline = true,
}: {
  children: React.ReactNode;
  style?: React.CSSProperties;
  inline?: boolean;
}) {
  const props = { [EXPORT_IGNORE_ATTR]: "" };
  return (
    <div {...props} style={{ display: inline ? "inline-flex" : "block", ...style }}>
      {children}
    </div>
  );
}

// ─── 2. Self-registering help texts ──────────────────────────────────────────

// Liegen in components/export-notes.tsx (abhängigkeitsfrei), damit ein
// InfoTooltip nicht CiteModal, ChartActionBar und die Bild-Maschinerie in jede
// Seite zieht, auf der irgendwo ein „?" steht. Hier nur weitergereicht.
export {
  ExportNotesProvider,
  useExportNotes,
  useRegisterExportNote,
  nodeToText,
  type ExportNote,
} from "./export-notes";

// ─── 3. The footer on the PAGE ───────────────────────────────────────────────

/**
 * Teilen-Aktionen für Karten OHNE Bild-Export (`exportable: false` im Register):
 * Karte, Einzel-Kennzahl, EE-Ampel, Förder-Check. Sie tragen dieselbe Fußzeile
 * wie jedes Chart — nur gibt es bei ihnen nichts aufzunehmen.
 *
 * Warum nicht einfach `useChartExport`: der würde eine Aufnahme-Art behaupten
 * (`mode: "node"` = „diese Karte wird 1:1 fotografiert") und damit einen
 * Bild-Fuß verlangen, den es hier gar nicht geben kann. Teilen-Text und -Ziel
 * kommen auch hier aus dem Register, nie getippt.
 */
export function useShareOnlyActions(
  widget: WidgetDef,
  shareText: string = widget.shareText,
): Pick<
  ReturnType<typeof useChartExport>,
  "downloadPng" | "sharePng" | "shareWhatsApp" | "shareTwitter" | "isExporting" | "canNativeShare"
> {
  const url = widget.shareUrl;
  return useMemo(
    () => ({
      downloadPng: async () => {},
      sharePng: async () => {},
      shareWhatsApp: () =>
        window.open(`https://wa.me/?text=${encodeURIComponent(`${shareText}\n${url}`)}`, "_blank"),
      shareTwitter: () =>
        window.open(
          `https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}&url=${encodeURIComponent(url)}`,
          "_blank",
        ),
      isExporting: false,
      canNativeShare: false,
    }),
    [shareText, url],
  );
}

/**
 * The visible footer every widget shares: one next step on the left, the action
 * bar on the right, the brand below (external only). Built from the registry
 * entry, so a widget cannot quietly grow its own arrangement — which is exactly
 * how the footers drifted apart before (some with CTA, some without, the brand
 * once left, once right, the source once vertical, once a block).
 *
 * The source itself is NOT here: it sits vertically along the card's right edge
 * (widget convention) and, in the image, in {@link WidgetExportFooter}.
 */
export function WidgetFooter({
  widget,
  chartExport,
  onCopyLink,
  onsite = false,
  branding = true,
  share = true,
  showCta = true,
  showEmbed = false,
  narrow = false,
  compact = false,
}: {
  widget: WidgetDef;
  chartExport: Pick<
    ReturnType<typeof useChartExport>,
    "downloadPng" | "sharePng" | "shareWhatsApp" | "shareTwitter" | "isExporting" | "canNativeShare"
  >;
  onCopyLink?: () => void;
  /** First-party embed on our own pages: no brand line (the page carries it). */
  onsite?: boolean;
  branding?: boolean;
  /** The embedder opted out of the action bar (share=0). Only the buttons go —
   * the next step and the brand line are not sharing, they are attribution. */
  share?: boolean;
  /** Off where the widget sits on the very page its next step leads to: a
   * button pointing at the page you are already reading is noise, not a step. */
  showCta?: boolean;
  showEmbed?: boolean;
  narrow?: boolean;
  /**
   * Ganz kleine Karten (Einzel-Kennzahl, Ampel, Mini-Ring): dort sprengt eine
   * sichtbare Knopfreihe die Höhe der Karte, deshalb ein ⋯-Menü, das nach oben
   * aufklappt. Alles darüber bleibt die Knopfreihe (Widget-Konvention).
   */
  compact?: boolean;
}) {
  const [citeOpen, setCiteOpen] = useState(false);
  const copy =
    onCopyLink ??
    (() => {
      navigator.clipboard?.writeText(`${widget.shareText}\n${widget.shareUrl}`).catch(() => {});
    });
  // Ein nächster Schritt, der auf die Seite zeigt, die man gerade liest, ist
  // Lärm. Das galt schon als Regel (showCta), musste aber von Hand gesetzt
  // werden — und wurde beim Einbetten des Erzeugungs-Widgets in die
  // Strommix-Seite prompt vergessen. Jetzt merkt es der Baustein selbst.
  //
  // Im iframe ist `usePathname()` die Adresse des Widgets (`/embed/…`), nicht
  // die der Seite — dort trägt die Seite ihren Pfad als `hp` bei. Ohne ihn stand
  // auf `/atomstrom-import` ein Knopf, der genau diese Seite noch einmal
  // aufgerufen hat, und zwar innerhalb des iframes.
  const pathname = usePathname();
  const [rahmen, setRahmen] = useState<{ imIframe: boolean; hostPfad: string | null }>({
    imIframe: false,
    hostPfad: null,
  });
  useEffect(() => {
    setRahmen({
      imIframe: window.self !== window.top,
      hostPfad: parseHostPfad(window.location.search),
    });
  }, []);
  const seitenPfad = rahmen.hostPfad ?? pathname;
  const zeigtHierhin = !!seitenPfad && seitenPfad === widget.cta?.href;
  const cta = showCta && !zeigtHierhin ? widget.cta : undefined;
  // Ein Link im iframe navigiert sonst NUR das iframe: der Artikel erschien im
  // Chart-Rahmen. Auf einer eigenen Seite öffnet `_top` ihn im ganzen Fenster,
  // auf einer fremden ein neuer Tab — deren Seite bleibt stehen. Außerhalb eines
  // iframes bleibt es der ganz normale Klick.
  const ctaZiel = !rahmen.imIframe ? undefined : rahmen.hostPfad ? "_top" : "_blank";

  return (
    <div {...{ [EXPORT_IGNORE_ATTR]: "" }} style={{ marginTop: 14 }}>
      <div
        style={{
          display: "flex",
          flexDirection: narrow ? "column" : "row",
          // Umbrechen statt abschneiden: in einem schmalen Embed passen der
          // nächste Schritt und die Aktionsleiste nicht nebeneinander, und die
          // Karte schneidet Überstehendes ab (overflow: hidden).
          flexWrap: "wrap",
          // Nie „stretch": in der Spalten-Anordnung zieht das den blauen Knopf
          // über die ganze Karte, und ein Knopf, der so breit ist wie das
          // Chart darüber, ist optisch die Hauptsache der Karte — er ist aber
          // nur der nächste Schritt.
          alignItems: "center",
          justifyContent: narrow ? "center" : cta ? "space-between" : "flex-end",
          gap: 10,
        }}
      >
        {cta && (
          <a
            href={cta.href}
            target={ctaZiel}
            rel={ctaZiel === "_blank" ? "noopener" : undefined}
            style={{
              flexShrink: 0,
              textAlign: "center",
              padding: "9px 16px",
              borderRadius: v("--radius-md"),
              background: v("--color-accent"),
              color: v("--color-text-on-accent"),
              fontSize: 13,
              fontWeight: 700,
              textDecoration: "none",
            }}
          >
            {cta.label} →
          </a>
        )}
        {share && (
          <div style={{ display: "flex", justifyContent: narrow ? "center" : "flex-end" }}>
            <ChartActionBar
              variant={compact ? "menu" : "bar"}
              menuUp={compact}
              size={compact ? 26 : 28}
              showDownload={widget.exportable !== false}
              onDownload={chartExport.downloadPng}
              // Kein Bild, kein Bild-Teilen: Wo nichts aufzunehmen ist, wäre
              // „Als Bild teilen" ein Knopf, der nichts tut.
              onShareImage={
                widget.exportable !== false && chartExport.canNativeShare
                  ? chartExport.sharePng
                  : undefined
              }
              isExporting={chartExport.isExporting}
              canNativeShare={chartExport.canNativeShare}
              onCopyLink={copy}
              onWhatsApp={chartExport.shareWhatsApp}
              onTwitter={chartExport.shareTwitter}
              onCite={() => setCiteOpen(true)}
              onEmbed={
                showEmbed && !onsite
                  ? () => window.open(`/energie-widgets#${widget.id}`, "_blank", "noopener")
                  : undefined
              }
            />
          </div>
        )}
      </div>

      {branding && !onsite && (
        <div style={{ display: "flex", marginTop: 8, fontSize: 10.5, color: v("--color-text-muted") }}>
          <PoweredBy />
        </div>
      )}

      {/* Bleibt gemountet, damit das Fenster sanft aus- statt wegblendet. */}
      <CiteModal widget={widget} open={citeOpen} onClose={() => setCiteOpen(false)} />
    </div>
  );
}

/**
 * The source credit as the convention demands it: vertical along the right edge
 * of the card, never a horizontal block. External embeds show it permanently
 * (licence), on our own pages it fades in on hover — there the page credits.
 */
export const SOURCE_EDGE_WIDTH = 14;
/** Ausgangsgröße der Kanten-Schrift und die Grenze, unter die sie nicht fällt. */
const SOURCE_EDGE_FONT = 9;
const SOURCE_EDGE_FONT_MIN = 6;

export function WidgetSourceEdge({
  widget,
  visible = true,
  stand,
}: {
  widget: WidgetDef;
  visible?: boolean;
  /** Datenstand, hinten angehängt. Ein weitergereichtes Bild ohne Datum lässt
   *  nicht erkennen, ob die Zahlen von heute oder von vorletztem Jahr sind.
   *  Ohne Angabe steht das Abrufdatum da — die ehrlichere Aussage bei
   *  Live-Daten, die sich stündlich ändern. */
  stand?: string;
}) {
  // Abrufdatum erst nach dem Mounten: Server- und Client-Render dürfen nicht
  // auseinanderlaufen, wenn der Tag zwischen beiden wechselt.
  const [heute, setHeute] = useState("");
  useEffect(() => {
    setHeute(new Date().toLocaleDateString("de-DE", { day: "2-digit", month: "2-digit", year: "numeric" }));
  }, []);
  // Auf einer sehr flachen Karte (Einzel-Kennzahl, Ampel) passt selbst bei
  // kleinster Schrift nicht alles an die Kante. Dann fällt ZUERST das Datum —
  // es ist der einzige Teil, den keine Lizenz verlangt. Der Bereitsteller, das
  // Lizenzkürzel und der Änderungshinweis bleiben in jedem Fall stehen; lieber
  // ein Vermerk ohne Datum als ein abgeschnittener.
  const [ohneDatum, setOhneDatum] = useState(false);
  const datum = ohneDatum ? "" : (stand ?? heute);

  // Der VOLLE Quellenvermerk, nicht eine Kurzform davon. Bis 08/2026 warf die
  // Kante jeden Klammer-Zusatz aus dem Namen — das traf nicht nur Beiwerk wie
  // „(Fraunhofer ISE)", sondern beim Anlagenregister den Bereitsteller selbst
  // („(Bundesnetzagentur)"), und den verlangt dl-de/by-2-0 ausdrücklich. Kurz
  // genug wird der Vermerk jetzt an der Quelle (lib/data-sources.ts), nicht
  // hier durch Wegschneiden. `shortName` bleibt als bewusste Ausnahme.
  const label =
    widget.sources
      .map((s) => (s.shortName ? `${s.shortName}${s.license ? `, ${s.license}` : ""}` : sourceLabel(s)))
      .join(" · ") + (datum ? ` · Stand: ${datum}` : "");

  // Der Vermerk passt sich der Kartenhöhe an, statt abgeschnitten zu werden.
  //
  // Eine feste Schriftgröße hat genau zwei Ausgänge, und beide sind falsch: Ist
  // die Karte niedrig, fehlt hinten ein Stück — und weggeschnitten wird zuerst
  // der Änderungshinweis, also ausgerechnet der Pflichtbestandteil. Ist sie hoch,
  // steht der Vermerk unnötig klein da. Gemessen an einer Karte mit einer
  // Kachelreihe: 348 px Text auf 275 px Höhe.
  //
  // Die Größe wird direkt am Element gesetzt, nicht über einen Zustand: Ergibt
  // die Messung denselben Wert wie beim letzten Mal, rendert React nicht neu —
  // der Messwert wäre dann gesetzt, aber die Anzeige fiele auf die geerbte
  // Schriftgröße zurück. Genau so stand der Vermerk zwischenzeitlich in 14 px
  // quer über der Karte.
  const wrapRef = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const passeAn = () => {
      // Immer von der Ausgangsgröße aus messen, sonst schaukelt sich die
      // Anpassung über mehrere Läufe nach unten.
      let groesse = SOURCE_EDGE_FONT;
      el.style.fontSize = `${groesse}px`;
      // Schrittweise verkleinern statt einmal hochzurechnen: Der Laufabstand
      // zwischen den Buchstaben skaliert nicht mit der Schriftgröße, deshalb
      // trifft eine Dreisatz-Rechnung knapp daneben und der Vermerk bleibt um
      // ein, zwei Pixel abgeschnitten — unsichtbar im Bild, aber es fehlt hinten
      // ein Stück, und hinten steht der Änderungshinweis.
      while (el.scrollHeight > el.clientHeight && groesse > SOURCE_EDGE_FONT_MIN) {
        groesse = Math.round((groesse - 0.2) * 10) / 10;
        el.style.fontSize = `${groesse}px`;
      }
      // Untergrenze erreicht und immer noch zu lang: Datum weg, dann neu messen.
      if (el.scrollHeight > el.clientHeight) setOhneDatum(true);
    };
    passeAn();
    // Noch einmal, sobald die echte Schrift da ist: Beim ersten Lauf misst der
    // Browser mit der Ersatzschrift, und die ist breiter — der Vermerk landete
    // dadurch dauerhaft kleiner als nötig (6,4 statt 7,8 px). Die
    // Größenüberwachung merkt das nicht, weil sich die Karte dabei nicht ändert.
    document.fonts?.ready.then(passeAn).catch(() => {});
    const ro = new ResizeObserver(passeAn);
    ro.observe(el);
    return () => ro.disconnect();
  }, [label]);

  return (
    <div
      ref={wrapRef}
      // Im Bild immer sichtbar: Auf eigenen Seiten blendet die Kante erst beim
      // Überfahren ein — ein PNG hat kein Überfahren, und die Lizenz verlangt
      // den Vermerk gerade dort, wo das Bild ohne die Seite weiterwandert.
      {...{ [EXPORT_CSS_ATTR]: "opacity:1;" }}
      title={`Quelle: ${label}`}
      style={{
        position: "absolute",
        top: 0,
        bottom: 0,
        right: 0,
        // Feste Breite plus nowrap: der senkrechte Text kann damit weder in eine
        // zweite Spalte umbrechen noch nach links in den Inhalt wachsen. Genau
        // das passierte vorher — ohne Breitenangabe ist der Kasten so breit wie
        // sein Inhalt, und bei zu geringer Höhe waren das zwei bis drei Spalten,
        // die quer über die Kennzahlen liefen.
        width: SOURCE_EDGE_WIDTH,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        writingMode: "vertical-rl",
        transform: "rotate(180deg)",
        whiteSpace: "nowrap",
        overflow: "hidden",
        fontSize: SOURCE_EDGE_FONT,
        lineHeight: 1.4,
        letterSpacing: 0.2,
        color: v("--color-text-faint"),
        pointerEvents: "none",
        opacity: visible ? 1 : 0,
        transition: "opacity .18s ease-out",
      }}
    >
      {label}
    </div>
  );
}

// ─── 4. The image-only footer ────────────────────────────────────────────────

export interface ExportLegendEntry {
  color: string;
  label: string;
  /** "line" for line charts, "box" for areas/bars. */
  shape?: "line" | "box";
}

/**
 * The block that turns a screenshot into a self-explaining image: legend, the
 * help texts collected from the "?" buttons, the data source and the brand.
 * Hidden on the page — the page has hover, the image doesn't.
 */
export function WidgetExportFooter({
  widget,
  legend,
  branding = true,
  note,
}: {
  /** Registry entry — carries sources and decides the brand wording. It keeps
   * image, page footer and gallery in sync. */
  widget?: WidgetDef;
  legend?: ExportLegendEntry[];
  /** Off only where the brand is already in the frame. */
  branding?: boolean;
  /** Extra line (assumptions, reference year) that only the image needs. */
  note?: string;
}) {
  const notes = useExportNotes();
  // Quellenvermerk und Datenstand trägt seit 08/2026 die senkrechte Kante
  // (WidgetSourceEdge) — auch im Bild. Deshalb nimmt dieser Fuß kein
  // `dataAsOf` mehr entgegen: zwei Stellen für dieselbe Angabe waren der
  // Grund, aus dem die Quelle im Bild anders aussah als auf der Seite.
  if (!widget?.sources) return null;
  return (
    <ExportOnly>
      <div
        style={{
          // Keine Trennlinie: Chart- und Fußnoten-Box gliedern das Bild bereits.
          marginTop: 12,
          fontSize: 10,
          lineHeight: 1.5,
          color: v("--color-text-muted"),
        }}
      >
        {legend && legend.length > 0 && (
          <div style={{ display: "flex", flexWrap: "wrap", gap: 12, marginBottom: 8 }}>
            {legend.map((l) => (
              <span key={l.label} style={{ display: "inline-flex", alignItems: "center", gap: 5, color: v("--color-text-secondary"), fontSize: 11 }}>
                <span
                  style={{
                    width: l.shape === "box" ? 9 : 12,
                    height: l.shape === "box" ? 9 : 3,
                    borderRadius: 2,
                    background: l.color,
                    flexShrink: 0,
                  }}
                />
                {l.label}
              </span>
            ))}
          </div>
        )}

        {/* Fußnoten in einer ruhigen grauen Box: im Bild sind das mehrere
            Zeilen Fließtext, die sonst mit der Quellzeile verschwimmen. */}
        {(notes.length > 0 || note) && (
          <div
            style={{
              background: v("--color-bg-muted"),
              borderRadius: v("--radius-md"),
              padding: "9px 11px",
              marginBottom: 8,
            }}
          >
            {notes.map((n) => (
              <div key={n.id} style={{ marginTop: 3 }}>
                {n.title && <strong style={{ color: v("--color-text-secondary"), fontWeight: 700 }}>{n.title}: </strong>}
                {n.text}
              </div>
            ))}
            {note && <div style={{ marginTop: notes.length > 0 ? 6 : 0 }}>{note}</div>}
          </div>
        )}

        {/* Nur noch die Marke, linksbündig. Der Quellenvermerk stand hier bis
            08/2026 als waagerechter Block und lief in einer schmalen Karte über
            sechs bis acht Zeilen — er sitzt jetzt senkrecht an der rechten
            Kante, im Bild wie auf der Seite, und damit an genau EINER Stelle.
            Im Bild gibt es keine Knöpfe mehr, deshalb trägt die Markenzeile
            hier die Einladung.

            Unsere eigene Lizenz gehört ins Bild, nicht nur auf die Seite:
            /lizenz macht den Lizenzcode zum Pflichtbestandteil der
            Namensnennung, und ein weitergereichtes PNG hat sonst nichts dabei.
            Er hängt deshalb NICHT am branding-Flag — fehlt die Markenzeile,
            trägt er den Namen selbst. */}
        <div style={{ display: "flex", alignItems: "flex-end" }}>
          <span style={{ whiteSpace: "nowrap" }}>
            {branding ? (
              <>
                <PoweredBy label={brandLabel(widget?.kind ?? "chart")} />
                <span> · {OWN_WORK_LICENSE.code}</span>
              </>
            ) : (
              <span>
                {OWN_WORK_LICENSE.attributionName}, {OWN_WORK_LICENSE.code}
              </span>
            )}
          </span>
        </div>
      </div>
    </ExportOnly>
  );
}
