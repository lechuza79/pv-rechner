"use client";

import ChartOptionsMenu from "../../../../components/ChartOptionsMenu";
import InfoTooltip from "../../../../components/InfoTooltip";
import { WidgetExportFooter, WidgetFooter, WidgetSourceEdge, SOURCE_EDGE_WIDTH } from "../../../../components/WidgetExport";
import { ExportNotesProvider } from "../../../../components/export-notes";
import { WidgetFrame } from "../../../../components/dashboard/WidgetFrame";
import { useChartExport } from "../../../../lib/useChartExport";
import { WIDGETS, widgetForPlace } from "../../../../lib/widget-registry";
import foundation from "../../../../components/social/atlas-foundations.module.css";
import "../../../../components/dashboard/dashboard.css";
import { v } from "../../../../lib/theme";

// The shared controls on their own, for tuning them centrally. The SAME
// components the widgets use; only the handlers are demonstrations and say so.

const DEMO_ORT = "Beispielort (Demo)";
const demo = async () => {
  throw new Error("Demo: keine Aktion ausgeführt.");
};
const demoWidget = widgetForPlace(WIDGETS.regionalAnnualGrowth, DEMO_ORT);

function Kachel({ titel, hinweis, children }: { titel: string; hinweis: string; children: React.ReactNode }) {
  return (
    <div style={{ border: `1px solid ${v("--color-border")}`, borderRadius: 16, padding: 16, display: "grid", gap: 10, alignContent: "start" }}>
      <div>
        <h3 style={{ margin: 0, fontSize: v("--font-size-body"), color: v("--color-text-primary") }}>{titel}</h3>
        <p style={{ margin: "2px 0 0", fontSize: v("--font-size-caption"), color: v("--color-text-muted") }}>{hinweis}</p>
      </div>
      {children}
    </div>
  );
}

/** A shared dark widget surface, so the controls see the tokens they have inside a widget. */
function Flaeche({ children, minHeight = 0 }: { children: React.ReactNode; minHeight?: number }) {
  return (
    <div className={`${foundation.foundation} sc-dashboard`} data-story-scheme="dark" style={{ position: "relative", minHeight, padding: 12, borderRadius: 12, background: "var(--widget-surface)", color: "var(--widget-ink)" }}>
      {children}
    </div>
  );
}

function AeltereFusszeile() {
  const chartExport = useChartExport({ context: { title: demoWidget.title }, filename: "werkstatt-demo", shareText: demoWidget.shareText, shareUrl: demoWidget.shareUrl, mode: "node" });
  return (
    <div ref={chartExport.chartRef} style={{ padding: 12, border: `1px dashed ${v("--color-border")}`, borderRadius: 12 }}>
      <p style={{ margin: "0 0 8px", fontSize: v("--font-size-small"), color: v("--color-text-secondary") }}>Demo-Inhalt. Herunterladen exportiert diesen Kasten über die echte Bildpipeline.</p>
      <WidgetFooter widget={demoWidget} chartExport={chartExport} onsite showCta={false} />
    </div>
  );
}

export default function Bedienelemente() {
  const kontakt = "/kontakt?topic=Widget%20einbetten";
  return (
    <section aria-labelledby="werkstatt-bausteine" style={{ marginTop: 40, borderTop: `1px solid ${v("--color-border")}`, paddingTop: 24 }}>
      <h2 id="werkstatt-bausteine" style={{ fontSize: v("--font-size-lead"), color: v("--color-text-primary"), margin: "0 0 4px" }}>
        Gemeinsame Bedienelemente{" "}
        <InfoTooltip title="Demonstration">Dieselben Bausteine wie in den Widgets, mit Demonstrationsdaten und Demo-Aktionen. Eine Aktion meldet „Demo: keine Aktion ausgeführt.“ statt etwas zu kopieren oder herunterzuladen — außer in der älteren Fußzeile, die den Demo-Kasten wirklich exportiert.</InfoTooltip>
      </h2>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 340px), 1fr))", gap: 16, marginTop: 12 }}>
        <Kachel titel="Optionsmenü" hinweis="Kompakte Darstellung (bisher „secondary“): drei Punkte oben rechts. Einbetten hier als „nicht verfügbar“.">
          <Flaeche minHeight={320}>
            <div style={{ display: "flex", justifyContent: "flex-end" }}>
              <ChartOptionsMenu label="Demo-Widget" contactHref={kontakt} onShare={demo} onForward={demo} onDownload={demo} embed={{ unavailable: "Für dieses Diagramm noch nicht verfügbar." }} />
            </div>
          </Flaeche>
        </Kachel>
        <Kachel titel="Optionsmenü mit Animation" hinweis="Zusätzlich Endstand als Bild und Video, wie bei Rennen und Monatsrückblick.">
          <Flaeche minHeight={380}>
            <div style={{ display: "flex", justifyContent: "flex-end" }}>
              <ChartOptionsMenu label="Demo-Animation" contactHref={kontakt} onShare={demo} onForward={demo} onDownload={demo} animation={{ end: demo, video: demo }} embed={{ onEmbed: demo }} />
            </div>
          </Flaeche>
        </Kachel>
        <Kachel titel="Aktionsfußleiste" hinweis="Sichtbare Darstellung (bisher „primary“, ehemals auch „bar“) mit Neustart der Animation.">
          <Flaeche minHeight={360}>
            <div style={{ position: "absolute", left: 12, right: 12, bottom: 12 }}>
              <ChartOptionsMenu presentation="footer" label="Demo-Animation" contactHref={kontakt} onRestart={demo} onShare={demo} onForward={demo} onDownload={demo} animation={{ end: demo, video: demo }} embed={{ onEmbed: demo }} />
            </div>
          </Flaeche>
        </Kachel>
        <Kachel titel="Erklärender Tooltip" hinweis="InfoTooltip: Hover, Fokus, Tippen, Escape und Klick daneben.">
          <Flaeche>
            <p style={{ margin: 0 }}>
              Installierte Leistung{" "}
              <InfoTooltip title="Demo-Erklärung">Demonstrationstext. In einem exportierbaren Widget erscheint dieser Text im Bild-Fuß, weil ein Bild kein Hover kennt.</InfoTooltip>
            </p>
            <p style={{ margin: "8px 0 0" }}>
              <InfoTooltip label="Mit Beschriftung" title="Demo">Variante mit sichtbarer Beschriftung statt Fragezeichen.</InfoTooltip>
            </p>
          </Flaeche>
        </Kachel>
        <Kachel titel="Widget-Rahmen mit Quelle und Bild-Fuß" hinweis="WidgetFrame mit senkrechter Quellenkante; darunter der Fuß, der sonst nur im Bild steht (Hinweise, Marke).">
          <ExportNotesProvider>
            <WidgetFrame title="Demo-Widget" kind="time-series" data-story-scheme="dark" className={`${foundation.foundation} sc-dashboard`}
              help={<p>Demonstrationstext hinter dem Fragezeichen; im Bild-Fuß wiederholt.</p>}
              footer={<>
                <div style={{ position: "absolute", top: 28, bottom: 28, right: 6, width: SOURCE_EDGE_WIDTH * 2 }}>
                  <WidgetSourceEdge widget={demoWidget} stand="Demo-Stand" spalten={2} />
                </div>
                <div style={{ padding: "0 var(--widget-padding) var(--widget-padding)" }}>
                  <WidgetExportFooter widget={demoWidget} note={`Ort: ${DEMO_ORT}`} />
                </div>
              </>}>
              <div style={{ minHeight: 120, display: "grid", placeItems: "center", paddingRight: SOURCE_EDGE_WIDTH * 2 + 12 }}>Demo-Inhalt</div>
            </WidgetFrame>
          </ExportNotesProvider>
        </Kachel>
        <Kachel titel="Ältere Fußzeile" hinweis="WidgetFooter mit Aktionsleiste, noch in allen teilweise vereinheitlichten Widgets. Zum Vergleich, nicht zum Weiterbauen.">
          <AeltereFusszeile />
        </Kachel>
      </div>
    </section>
  );
}
