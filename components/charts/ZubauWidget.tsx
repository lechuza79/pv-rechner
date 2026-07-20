"use client";

/**
 * Geteiltes, einbettbares Widget der Zubau-Datenstory: der Zubau-Chart + die
 * interaktive Ereignis-Timeline (inkl. Erklär-Panels) + Aktionsleiste
 * (Herunterladen · Teilen · Einbetten) + Quelle/Branding nach Widget-Konvention.
 *
 * Ein Bauteil, zwei Kontexte:
 *  • variant="page"  — im Artikel eingebettet: kein sichtbarer Titel/Quelle
 *    (der Artikel liefert Überschrift + globalen Quellenfuß); Titel + Quelle
 *    werden aber ins Bild-Export gebacken, damit ein heruntergeladenes Bild
 *    self-contained bleibt.
 *  • variant="embed" — Standalone auf fremden Seiten: eigener Titel/Label,
 *    sichtbare Quelle, optional „Powered by".
 *
 * Nutzt die Site-Tokens `--color-*`, die im Embed-Layout auf `--widget-*`
 * aliasen — dasselbe Widget funktioniert auf der Seite UND im Embed.
 */

import { useState } from "react";
import { v } from "../../lib/theme";
import { PoweredBy, DataSourceNote } from "../PoweredBy";
import ChartActionBar from "../ChartActionBar";
import { DATA_SOURCES, sourceLabel } from "../../lib/data-sources";
import { useChartExport } from "../../lib/useChartExport";
import ZubauTimelineChart from "./ZubauTimelineChart";
import EventTimeline, { TimelineEvent } from "./EventTimeline";
import type { NationalSolarSeries } from "../../lib/mastr-data";
import { FEEDIN_HISTORY_YEARS, FEEDIN_HISTORY_VALUES } from "../../lib/feedin-history";
import { PRICE_YEARS, PRICE_HOUSEHOLD } from "../../lib/strommix-history";

// Kuratierte politische Weichenstellungen (historische Fakten). Reihenfolge =
// Nummerierung in der Timeline. 2027 ist Ausblick (außerhalb der Datenachse) und
// steht nur im Artikel-Fließtext, nicht als Timeline-Marke.
export const ZUBAU_EVENTS: TimelineEvent[] = [
  {
    year: 2000,
    label: "EEG-Start",
    text: "Das Erneuerbare-Energien-Gesetz garantiert erstmals eine feste Vergütung über 20 Jahre. Damit wird eine kleine Dachanlage überhaupt erst kalkulierbar.",
  },
  {
    year: 2004,
    label: "EEG-Novelle",
    text: "Die Vergütung steigt auf ihren Höchststand von über 57 ct/kWh. Der erste große Zubau-Boom beginnt — Einspeisen allein trägt die Anlage.",
  },
  {
    year: 2012,
    label: "Vergütungskürzung",
    text: "Drastische Kürzungen und der Wechsel auf monatliche Degression. Der Satz fällt unter den Haushaltsstrompreis — Einspeisen lohnt weniger als der selbst genutzte Strom, der Kleindach-Zubau bricht ein.",
  },
  {
    year: 2023,
    label: "Nullsteuer",
    text: "0 % Mehrwertsteuer auf Kauf und Montage von PV-Anlagen. Zusammen mit den nach 2022 stark gestiegenen Strompreisen wird der Eigenverbrauch so lukrativ, dass der Zubau explodiert — obwohl die Vergütung niedrig bleibt.",
  },
  {
    year: 2024,
    label: "Solarpaket I",
    text: "Das Solarpaket I und das Balkonkraftwerk-Privileg vereinfachen Anmeldung und Betrieb. Steckersolar wird zur privilegierten Maßnahme — der Zubau bleibt auf Rekordniveau.",
  },
];

export const ZUBAU_WIDGET_SOURCES = [DATA_SOURCES.mastr, DATA_SOURCES.eegVerguetung, DATA_SOURCES.eurostat];
export const ZUBAU_EMBED_HASH = "pv-zubau-deutschland";

const WIDGET_TITLE = "Photovoltaik-Zubau in Deutschland";
const WIDGET_SUBLINE = "Zubau pro Jahr, Einspeisevergütung & Strompreis seit 2000";
const LIVE_URL = "https://solar-check.io/photovoltaik-zubau-deutschland";
const SHARE_TEXT =
  "Wie Förderung den Solarausbau in Deutschland geformt hat – Zubau, Einspeisevergütung & Strompreis seit 2000";

/** Werte einer Jahresreihe auf die Zielachse legen (null wo keine Zahl). */
function alignToYears(targetYears: number[], srcYears: number[], srcValues: number[]): (number | null)[] {
  const map = new Map<number, number>();
  srcYears.forEach((y, i) => map.set(y, srcValues[i]));
  return targetYears.map((y) => (map.has(y) ? (map.get(y) as number) : null));
}

/** Rohserie → Chart-Arrays. Von Seite und Embed geteilt. */
export function prepareZubauData(series: NationalSolarSeries) {
  const years = series.points.map((p) => p.year);
  return {
    years,
    additionsGw: series.points.map((p) => p.kwp / 1e6),
    partial: series.points.map((p) => p.partial),
    feedIn: alignToYears(years, FEEDIN_HISTORY_YEARS, FEEDIN_HISTORY_VALUES),
    price: alignToYears(years, PRICE_YEARS, PRICE_HOUSEHOLD),
  };
}

export default function ZubauWidget({
  series,
  variant = "page",
  showEmbed = true,
  branding = false,
}: {
  series: NationalSolarSeries;
  variant?: "page" | "embed";
  /** „Einbetten"-Aktion anbieten (in der Galerie-Vorschau via embed=0 aus). */
  showEmbed?: boolean;
  /** „Powered by" zeigen (Embed: an, eigene Seite: aus). */
  branding?: boolean;
}) {
  const [active, setActive] = useState(0);
  const { years, additionsGw, partial, feedIn, price } = prepareZubauData(series);
  const isEmbed = variant === "embed";

  const chartExport = useChartExport({
    context: {
      title: WIDGET_TITLE,
      subtitle: WIDGET_SUBLINE,
      source: ZUBAU_WIDGET_SOURCES.map(sourceLabel).join(" · "),
    },
    filename: "solar-check-pv-zubau-deutschland",
    shareText: SHARE_TEXT,
    shareUrl: LIVE_URL,
    mode: "node",
  });

  const copyLink = () =>
    navigator.clipboard?.writeText(`${SHARE_TEXT}\n${LIVE_URL}`).catch(() => {});

  return (
    <div ref={chartExport.chartRef} style={S.frame}>
      {/* Titel/Label — im Embed sichtbar, auf der Seite nur im Bild-Export. */}
      <div
        data-sc-export-only={isEmbed ? undefined : "block"}
        style={{ ...S.header, ...(isEmbed ? null : { display: "none" }) }}
      >
        <div style={S.title}>{WIDGET_TITLE}</div>
        <div style={S.sub}>{WIDGET_SUBLINE}</div>
      </div>

      <ZubauTimelineChart
        years={years}
        additionsGw={additionsGw}
        partial={partial}
        feedIn={feedIn}
        price={price}
        height={420}
      />

      <div style={{ marginTop: 6 }}>
        <EventTimeline
          events={ZUBAU_EVENTS}
          active={active}
          onChange={setActive}
          startYear={years[0]}
          endYear={years[years.length - 1]}
        />
      </div>

      {/* Sichtbare Quelle nur im Embed (Standalone braucht eigene Attribution);
          aus dem Bild-Export ausgenommen — der Export-Fuß trägt sie voll. */}
      {isEmbed && (
        <div data-sc-export-ignore="" style={S.webSource}>
          <DataSourceNote source={ZUBAU_WIDGET_SOURCES} />
        </div>
      )}

      <div style={S.footer}>
        <div style={S.rule} />
        <div
          data-sc-export-ignore=""
          style={{ ...S.actions, justifyContent: isEmbed && branding ? "space-between" : "flex-end" }}
        >
          {isEmbed && branding && <PoweredBy />}
          <ChartActionBar
            variant="bar"
            size={30}
            onDownload={chartExport.downloadPng}
            onCopyLink={copyLink}
            onWhatsApp={chartExport.shareWhatsApp}
            onTwitter={chartExport.shareTwitter}
            onShareImage={chartExport.sharePng}
            onEmbed={
              showEmbed
                ? () => window.open(`/energie-widgets#${ZUBAU_EMBED_HASH}`, "_blank", "noopener")
                : undefined
            }
            isExporting={chartExport.isExporting}
            canNativeShare={chartExport.canNativeShare}
          />
        </div>

        {/* Nur im Bild-Export sichtbar: volle Quelle (+ Marke) fest ins PNG. */}
        <div data-sc-export-only="flex" style={S.exportFoot}>
          <DataSourceNote source={ZUBAU_WIDGET_SOURCES} plain />
          <PoweredBy />
        </div>
      </div>
    </div>
  );
}

const S: Record<string, React.CSSProperties> = {
  frame: {
    width: "100%",
    maxWidth: 860,
    marginInline: "auto",
    boxSizing: "border-box",
    background: v("--color-bg"),
    border: `1px solid ${v("--color-border")}`,
    borderRadius: "var(--widget-border-radius, 14px)",
    padding: "18px 18px 14px",
    overflow: "hidden",
  },
  header: { marginBottom: 10 },
  title: { fontSize: 17, fontWeight: 800, letterSpacing: "-0.01em", margin: "0 0 3px", lineHeight: 1.25, color: v("--color-text-primary") },
  sub: { fontSize: 12.5, color: v("--color-text-muted"), margin: 0, lineHeight: 1.4 },
  webSource: { marginTop: 10, fontSize: 10.5, lineHeight: 1.4, color: v("--color-text-muted") },
  footer: { marginTop: 12 },
  rule: { height: 1, background: v("--color-border"), opacity: 0.6, marginBottom: 8 },
  actions: { display: "flex", alignItems: "center", gap: 8, fontSize: 10.5, color: v("--color-text-muted") },
  exportFoot: {
    display: "none",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 24,
    marginTop: 8,
    fontSize: 10.5,
    color: v("--color-text-muted"),
    lineHeight: 1.4,
  },
};
