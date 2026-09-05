"use client";

/**
 * Der deutsche Solarbestand nach Anlagentyp — Stückzahl gegen Leistung.
 *
 * DIE AUSSAGE IST DIE GEGENLÄUFIGKEIT, nicht eine der beiden Reihen. Nach
 * Stückzahl sind Balkonkraftwerke und private Dächer fast alles und Solarparks
 * verschwindend wenig; nach Leistung ist es umgekehrt. Ein Diagramm, das nur
 * eine der beiden Größen zeigt, beantwortet die Frage „wie viele Solaranlagen
 * gibt es" formal richtig und lässt den Leser mit einem falschen Bild zurück.
 * Deshalb stehen beide Balken je Zeile untereinander, gleich lang skaliert.
 *
 * Ein Bauteil, zwei Kontexte (wie ZubauWidget): variant="page" auf der eigenen
 * Seite (Titel und Quelle trägt die Seite, aber beides wird ins Bild gebacken),
 * variant="embed" auf fremden Seiten (eigener Titel, sichtbare Quelle, Marke).
 */

import { v, tokens, space } from "../../lib/theme";
import { sourceLabel } from "../../lib/data-sources";
import { WIDGETS } from "../../lib/widget-registry";
import { useChartExport } from "../../lib/useChartExport";
import { ExportBox, ExportNotesProvider, WidgetExportFooter, WidgetFooter, WidgetSourceEdge } from "../WidgetExport";
import { anlagenZahlTeile, anteilProzentFeinTeile, formatDataAsOf, pvLeistungTeile, type Messwert } from "../../lib/atlas-format";
import { anteil, type Anlagenbestand } from "../../lib/anlagenbestand";

const WIDGET = WIDGETS.anlagenbestand;

/** Die zwei Reihen. Farbe fest, nicht am Theme: sie unterscheidet zwei GRÖSSEN,
 *  nicht zwei Stimmungen — dieselbe Regel wie bei den Energieträger-Farben. */
const FARBE_ANZAHL = tokens["--color-accent"];
const FARBE_LEISTUNG = tokens["--color-positive"];

export default function AnlagenbestandWidget({
  bestand,
  variant = "page",
  showEmbed = true,
  branding = false,
  share = true,
  onsite,
}: {
  bestand: Anlagenbestand;
  variant?: "page" | "embed";
  showEmbed?: boolean;
  branding?: boolean;
  share?: boolean;
  onsite?: boolean;
}) {
  const isEmbed = variant === "embed";
  const isOnsite = onsite ?? !isEmbed;

  const subline = `Anzahl und installierte Leistung nach Anlagentyp, Stand ${formatDataAsOf(bestand.standIso.slice(0, 10))}`;

  const chartExport = useChartExport({
    context: {
      title: WIDGET.title,
      subtitle: subline,
      source: WIDGET.sources.map((q) => sourceLabel(q)).join(" · "),
    },
    filename: "solar-check-anlagenbestand-deutschland",
    shareText: WIDGET.shareText,
    shareUrl: WIDGET.shareUrl,
    mode: "node",
  });

  const gesamtAnzahl = anlagenZahlTeile(bestand.gesamt.anzahl);
  const gesamtLeistung = pvLeistungTeile(bestand.gesamt.kwp);

  return (
    <ExportNotesProvider>
      <div ref={chartExport.chartRef} style={S.frame}>
        <div
          data-sc-export-only={isEmbed ? undefined : "block"}
          style={{ ...S.header, ...(isEmbed ? null : { display: "none" }) }}
        >
          <div style={S.title}>{WIDGET.title}</div>
          <div style={S.sub}>{subline}</div>
        </div>

        <div style={{ position: "relative", ...(isEmbed ? { paddingRight: 16 } : null) }}>
          <WidgetSourceEdge
            widget={WIDGET}
            visible={isEmbed && !isOnsite}
            stand={formatDataAsOf(bestand.standIso.slice(0, 10))}
          />
          <ExportBox>
            {/* Die zwei Gesamtwerte. Zahl groß, Einheit klein daneben — und in
                einer Zeile gehalten, weil „127,4" und „GWp" umgebrochen gleich
                laut wirken. */}
            <div style={S.summe}>
              {[
                { teile: gesamtAnzahl, was: "Solaranlagen sind gemeldet" },
                { teile: gesamtLeistung, was: "installierte Leistung" },
              ].map((k) => (
                <div key={k.was}>
                  <div style={S.summeWert}>
                    <span style={S.summeZahl}>{k.teile.value}</span>
                    <span style={S.summeEinheit}>{k.teile.unit}</span>
                  </div>
                  <div style={S.summeLabel}>{k.was}</div>
                </div>
              ))}
            </div>

            <div style={S.zeilen}>
              {bestand.segmente.map((s) => {
                const anzahlAnteil = anteil(s.anzahl, bestand.gesamt.anzahl);
                const leistungAnteil = anteil(s.kwp, bestand.gesamt.kwp);
                const az = anlagenZahlTeile(s.anzahl);
                const lz = pvLeistungTeile(s.kwp);
                return (
                  <div key={s.segment} style={S.zeile}>
                    <div style={S.zeileKopf}>{s.label}</div>
                    <Balken
                      farbe={FARBE_ANZAHL}
                      anteil={anzahlAnteil}
                      wert={`${az.value} ${az.unit}`}
                      prozent={anteilProzentFeinTeile(anzahlAnteil)}
                    />
                    <Balken
                      farbe={FARBE_LEISTUNG}
                      anteil={leistungAnteil}
                      wert={`${lz.value} ${lz.unit}`}
                      prozent={anteilProzentFeinTeile(leistungAnteil)}
                    />
                  </div>
                );
              })}
            </div>

            {/* Legende auf der Seite UND im Bild: ohne sie sind zwei gleich
                lange Balken zwei unbeschriftete Streifen. */}
            <div style={S.legende}>
              {[
                { farbe: FARBE_ANZAHL, label: "Anteil an der Anzahl" },
                { farbe: FARBE_LEISTUNG, label: "Anteil an der Leistung" },
              ].map((l) => (
                <span key={l.label} style={S.legendeEintrag}>
                  <span style={{ ...S.legendePunkt, background: l.farbe }} />
                  {l.label}
                </span>
              ))}
            </div>
          </ExportBox>
        </div>

        <div>
          <WidgetFooter
            widget={WIDGET}
            chartExport={chartExport}
            onsite={isOnsite}
            branding={branding}
            share={share}
            showCta={isEmbed && !isOnsite}
            showEmbed={showEmbed}
          />
          {/* Was das Bild nicht nachfragen kann: worauf sich die Anteile
              beziehen und was das Register überhaupt zählt. */}
          <WidgetExportFooter
            widget={WIDGET}
            note={`Anteile an ${anlagenZahlTeile(bestand.gesamt.anzahl).value} ${anlagenZahlTeile(bestand.gesamt.anzahl).unit} und ${gesamtLeistung.value} ${gesamtLeistung.unit}, jeweils gerundet — sie ergeben deshalb nicht exakt hundert. Gezählt wird, was im Register als „in Betrieb" geführt ist; stillgelegte Anlagen bleiben dort stehen und sind hier nicht mitgerechnet.`}
          />
        </div>
      </div>
    </ExportNotesProvider>
  );
}

function Balken({ farbe, anteil, wert, prozent }: { farbe: string; anteil: number; wert: string; prozent: Messwert }) {
  return (
    <div style={S.balkenZeile}>
      <div style={S.balkenSpur}>
        {/* Mindestbreite, sonst verschwindet ein Anteil unter einem Prozent
            ganz — und „gar nicht da" ist etwas anderes als „sehr wenig". */}
        <div style={{ ...S.balken, width: `${Math.max(anteil * 100, 0.8)}%`, background: farbe }} />
      </div>
      <div style={S.balkenWert}>
        <span style={{ fontWeight: 600 }}>{wert}</span>
        <span style={S.balkenProzent}>{prozent.value} {prozent.unit}</span>
      </div>
    </div>
  );
}

const S: Record<string, React.CSSProperties> = {
  frame: {
    width: "100%",
    maxWidth: 720,
    marginInline: "auto",
    boxSizing: "border-box",
    background: v("--color-bg"),
    border: `1px solid ${v("--color-border")}`,
    borderRadius: "var(--widget-border-radius, 14px)",
    padding: "18px 18px 14px",
    overflow: "hidden",
  },
  header: { marginBottom: 10 },
  title: { fontSize: v("--font-size-h3"), fontWeight: 800, letterSpacing: "-0.01em", margin: "0 0 3px", lineHeight: 1.25, color: v("--color-text-primary") },
  sub: { fontSize: v("--font-size-small"), color: v("--color-text-muted"), margin: 0, lineHeight: 1.4 },

  summe: {
    display: "flex",
    flexWrap: "wrap",
    gap: space.xl,
    paddingBottom: space.lg,
    marginBottom: space.lg,
    borderBottom: `1px solid ${v("--color-border")}`,
  },
  summeWert: { display: "flex", alignItems: "baseline", gap: 6, whiteSpace: "nowrap" },
  summeZahl: { fontSize: v("--font-size-display-md"), fontWeight: 700, lineHeight: 1.1, color: v("--color-text-primary") },
  summeEinheit: { fontSize: v("--font-size-body"), color: v("--color-text-muted") },
  summeLabel: { fontSize: v("--font-size-small"), color: v("--color-text-secondary"), marginTop: 2 },

  zeilen: { display: "flex", flexDirection: "column", gap: space.lg },
  zeile: { display: "flex", flexDirection: "column", gap: 4 },
  zeileKopf: { fontSize: v("--font-size-body"), fontWeight: 600, color: v("--color-text-primary") },

  balkenZeile: { display: "flex", alignItems: "center", gap: space.md },
  balkenSpur: { flex: 1, height: 12, background: v("--color-border"), borderRadius: v("--radius-sm"), overflow: "hidden" },
  balken: { height: "100%", borderRadius: v("--radius-sm") },
  balkenWert: { display: "flex", gap: 6, alignItems: "baseline", fontSize: v("--font-size-small"), whiteSpace: "nowrap", minWidth: 132, justifyContent: "flex-end", color: v("--color-text-primary") },
  balkenProzent: { color: v("--color-text-muted") },

  legende: { display: "flex", flexWrap: "wrap", gap: space.lg, marginTop: space.lg, fontSize: v("--font-size-small"), color: v("--color-text-secondary") },
  legendeEintrag: { display: "inline-flex", alignItems: "center", gap: 6 },
  legendePunkt: { width: 9, height: 9, borderRadius: 2, flexShrink: 0 },
};
