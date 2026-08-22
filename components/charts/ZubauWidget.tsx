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
import { v, tokens } from "../../lib/theme";
import { sourceLabel, type DataSource } from "../../lib/data-sources";
import { WIDGETS } from "../../lib/widget-registry";
import { useChartExport } from "../../lib/useChartExport";
import { ExportBox, ExportNotesProvider, WidgetExportFooter, WidgetFooter, WidgetSourceEdge } from "../WidgetExport";
import ZubauTimelineChart from "./ZubauTimelineChart";
import EventTimeline, { TimelineEvent } from "./EventTimeline";
import type { NationalSolarSeries } from "../../lib/mastr-data";
import { formatDataAsOf } from "../../lib/atlas-format";
import { FEEDIN_HISTORY_YEARS, FEEDIN_HISTORY_VALUES } from "../../lib/feedin-history";
import { PRICE_YEARS, PRICE_HOUSEHOLD } from "../../lib/strommix-history";
import { EEG_REFORM_STAND, eegDatum } from "../../lib/eeg-reform-config";

// Kuratierte politische Weichenstellungen (historische Fakten). Reihenfolge =
// Nummerierung in der Timeline. 2027 ist Ausblick (außerhalb der Datenachse) und
// steht nur im Artikel-Fließtext, nicht als Timeline-Marke.
export const ZUBAU_EVENTS: TimelineEvent[] = [
  {
    year: 2000,
    label: "EEG-Start",
    text: "Das Erneuerbare-Energien-Gesetz garantiert erstmals eine feste Vergütung über 20 Jahre. Damit wird eine kleine Dachanlage überhaupt erst kalkulierbar.",
    government: "Rot-grüne Koalition (SPD/Grüne), Kanzler Schröder — als Initiative aus dem Parlament um Hermann Scheer (SPD) und Hans-Josef Fell (Grüne).",
  },
  {
    year: 2004,
    label: "EEG-Novelle",
    text: "Die Vergütung steigt auf ihren Höchststand von über 57 ct/kWh. Der erste große Zubau-Boom beginnt — Einspeisen allein trägt die Anlage.",
    government: "Rot-grüne Koalition (SPD/Grüne), Umweltminister Jürgen Trittin (Grüne).",
    major: true,
  },
  {
    year: 2012,
    label: "Vergütungskürzung",
    text: "Drastische Kürzungen und der Wechsel auf monatliche Degression. Der Satz fällt unter den Haushaltsstrompreis — Einspeisen lohnt weniger als der selbst genutzte Strom, der Kleindach-Zubau bricht ein.",
    government: "Schwarz-gelbe Koalition (CDU/CSU/FDP), Kanzlerin Merkel — Umweltminister Röttgen (CDU) und Wirtschaftsminister Rösler (FDP).",
    major: true,
  },
  {
    year: 2022,
    label: "Energiekrise",
    text: "Nach dem russischen Angriff auf die Ukraine explodieren Gas- und Strompreise. Damit wird jede selbst genutzte Kilowattstunde deutlich wertvoller — der Preisschock ist die Ursache des folgenden Zubau-Sprungs, nicht seine Folge. Im selben Jahr wird die Einspeisevergütung erstmals seit Langem wieder angehoben (Osterpaket/EEG 2023) — die höheren Sätze gelten für Anlagen, die ab Ende Juli 2022 in Betrieb gehen.",
    government: "Ampel-Koalition (SPD/Grüne/FDP), Kanzler Scholz — die Vergütungsanhebung kam mit dem „Osterpaket“ aus dem Wirtschafts- und Klimaministerium (Robert Habeck, Grüne). Der Preisschock selbst war keine politische Entscheidung.",
    major: true,
  },
  {
    year: 2023,
    label: "Nullsteuer",
    text: "0 % Mehrwertsteuer auf Kauf und Montage von PV-Anlagen. Zusammen mit den nach 2022 stark gestiegenen Strompreisen wird der Eigenverbrauch so lukrativ, dass der Zubau explodiert — obwohl die Vergütung niedrig bleibt.",
    government: "Ampel-Koalition (SPD/Grüne/FDP), Kanzler Scholz — Finanzminister Christian Lindner (FDP), im Jahressteuergesetz 2022.",
  },
  {
    year: 2024,
    label: "Solarpaket I",
    text: "Das Solarpaket I und das Balkonkraftwerk-Privileg vereinfachen Anmeldung und Betrieb. Steckersolar wird zur privilegierten Maßnahme — der Zubau bleibt auf Rekordniveau.",
    government: "Ampel-Koalition (SPD/Grüne/FDP), Kanzler Scholz — Solarpaket I aus dem Wirtschafts- und Klimaministerium (Robert Habeck, Grüne), das Balkonkraftwerk-Privileg (WEG/BGB) aus dem Justizministerium (Marco Buschmann, FDP).",
  },
  {
    year: 2025,
    label: "Solarspitzen-Gesetz",
    text: "Für neue Anlagen entfällt die Einspeisevergütung in Stunden mit negativen Börsenpreisen, und ohne Smart Meter ist die Einspeisung auf 60 % gedeckelt (die Ausfälle werden am Ende der 20 Jahre nachvergütet). Der Anreiz verschiebt sich weiter Richtung Eigenverbrauch und Speicher.",
    government: "SPD/Grüne-Minderheitsregierung, Kanzler Scholz (nach dem Bruch der Ampel) — Ende Januar 2025 im Bundestag mit den Stimmen der Union beschlossen.",
  },
  {
    year: 2027,
    label: "EEG-Reform (geplant)",
    text: `Die feste Einspeisevergütung soll für Neuanlagen ab 2027 durch marktnähere Modelle (verpflichtende Direktvermarktung) ersetzt werden. Das Kabinett hat den Gesetzentwurf am ${eegDatum(EEG_REFORM_STAND.kabinettBeschlussIso)} beschlossen — Gesetz ist er noch nicht, der Bundestag muss noch entscheiden und der Bundesrat ist am Verfahren beteiligt. Für heute installierte Anlagen gilt Bestandsschutz: die 20-jährige Vergütungsgarantie bleibt.`,
    planned: true,
    government: "Schwarz-rote Koalition (CDU/CSU/SPD), Kanzler Merz — Gesetzentwurf aus dem Wirtschaftsministerium (Katharina Reiche, CDU), abgestimmt mit Umweltminister Carsten Schneider (SPD).",
  },
];

/** Jahre der einschneidenden Wendepunkte — im Chart als gepunktete Vertikale. */
export const ZUBAU_MILESTONE_YEARS: number[] = ZUBAU_EVENTS.filter((e) => e.major).map((e) => e.year);

// Quellen NICHT zweitgelistet: der Artikel-Fuß zitiert dieselben Einträge wie
// das Widget, sonst driften Seite und Bild auseinander.
export const ZUBAU_WIDGET_SOURCES: DataSource[] = WIDGETS.pvZubau.sources;
export const ZUBAU_EMBED_HASH = WIDGETS.pvZubau.id;

// Identität (Titel, Teilen-Ziel, Quellen, nächster Schritt) kommt aus dem
// Register — ein Eintrag speist Fußzeile, Quellen-Kante und Bild-Fuß.
const WIDGET = WIDGETS.pvZubau;
const WIDGET_TITLE = WIDGET.title;
const WIDGET_SUBLINE = "Zubau pro Jahr, Einspeisevergütung & Strompreis seit 2000";

/** Werte einer Jahresreihe auf die Zielachse legen (null wo keine Zahl). */
function alignToYears(targetYears: number[], srcYears: number[], srcValues: number[]): (number | null)[] {
  const map = new Map<number, number>();
  srcYears.forEach((y, i) => map.set(y, srcValues[i]));
  return targetYears.map((y) => (map.has(y) ? (map.get(y) as number) : null));
}

/** Ausblicksjahr mit geplanter Weichenstellung (EEG-Reform). Wird als leerer
 * Platzhalter-Balken gezeigt, SOLANGE die echten MaStR-Daten es nicht erreichen —
 * rollover-sicher: sobald 2027 real gemeldet ist, entfällt der Platzhalter. */
export const OUTLOOK_YEAR = 2027;

/** Rohserie → Chart-Arrays (inkl. leerem Platzhalter fürs Ausblicksjahr). Von
 * Seite und Embed geteilt. */
export function prepareZubauData(series: NationalSolarSeries) {
  const years = series.points.map((p) => p.year);
  const additionsGw = series.points.map((p) => p.kwp / 1e6);
  const partial = series.points.map((p) => p.partial);
  const future = series.points.map(() => false);

  const lastReal = years[years.length - 1] ?? OUTLOOK_YEAR;
  for (let y = lastReal + 1; y <= OUTLOOK_YEAR; y++) {
    years.push(y);
    additionsGw.push(0);
    partial.push(false);
    future.push(true);
  }

  return {
    years,
    additionsGw,
    partial,
    future,
    feedIn: alignToYears(years, FEEDIN_HISTORY_YEARS, FEEDIN_HISTORY_VALUES),
    price: alignToYears(years, PRICE_YEARS, PRICE_HOUSEHOLD),
  };
}

export default function ZubauWidget({
  series,
  variant = "page",
  showEmbed = true,
  branding = false,
  share = true,
  onsite,
}: {
  series: NationalSolarSeries;
  variant?: "page" | "embed";
  /** „Einbetten"-Aktion anbieten (in der Galerie-Vorschau via embed=0 aus). */
  showEmbed?: boolean;
  /** „Powered by" zeigen (Embed: an, eigene Seite: aus). */
  branding?: boolean;
  /** Teilen-Aktionen zeigen (Einbettende können sie per share=0 abwählen). */
  share?: boolean;
  /**
   * First-Party-Embed: die umgebende Seite trägt Marke und Quelle. Ohne Angabe
   * folgt es der Darstellungsart — im Artikel (variant="page") ist es immer der
   * Fall. Als eigener Schalter, damit der URL-Parameter `onsite=1` auch im
   * iframe wirkt; vorher hing das allein an der Darstellungsart und der
   * Parameter lief ins Leere.
   */
  onsite?: boolean;
}) {
  const [active, setActive] = useState(0);
  const { years, additionsGw, partial, future, feedIn, price } = prepareZubauData(series);
  const isEmbed = variant === "embed";
  const isOnsite = onsite ?? !isEmbed;

  const chartExport = useChartExport({
    context: {
      title: WIDGET_TITLE,
      subtitle: WIDGET_SUBLINE,
      source: ZUBAU_WIDGET_SOURCES.map((q) => sourceLabel(q)).join(" · "),
    },
    filename: "solar-check-pv-zubau-deutschland",
    shareText: WIDGET.shareText,
    shareUrl: WIDGET.shareUrl,
    mode: "node",
  });

  return (
    // Provider um die ganze Karte: Der Bild-Fuß darunter zeigt die Hilfetexte
    // der „?"-Knöpfe. Ohne ihn verschwände der erste hier eingebaute Tooltip
    // lautlos aus dem Bild — deshalb erzwingt der Wächter ihn neben jedem
    // WidgetExportFooter (lib/__tests__/widget-konventionen.test.ts).
    <ExportNotesProvider>
      <div ref={chartExport.chartRef} style={S.frame}>
        {/* Titel/Label — im Embed sichtbar, auf der Seite nur im Bild-Export. */}
        <div
          data-sc-export-only={isEmbed ? undefined : "block"}
          style={{ ...S.header, ...(isEmbed ? null : { display: "none" }) }}
        >
          <div style={S.title}>{WIDGET_TITLE}</div>
          <div style={S.sub}>{WIDGET_SUBLINE}</div>
        </div>

        {/* Chart + Timeline; im Embed steht die Quelle vertikal schlank an der
            rechten Kante (Konvention — nie als horizontaler Block). Aus dem
            Bild-Export ausgenommen; der Export-Fuß trägt die volle Quelle. */}
        <div style={{ position: "relative", ...(isEmbed ? { paddingRight: 16 } : null) }}>
          {/* Quelle vertikal an der rechten Kante (geteilter Baustein). Im Artikel
              trägt der Seitenfuß die Quelle — dort bleibt das Widget ruhig. */}
          {/* Der Datenstand kommt aus dem Auszug des Anlagenregisters selbst.
              Ohne ihn setzt der Vermerk das Abrufdatum ein — bei Live-Daten
              richtig, an einer Jahresreihe aber eine Aktualität, die die Zahlen
              nicht haben. */}
          <WidgetSourceEdge
            widget={WIDGET}
            visible={isEmbed && !isOnsite}
            stand={formatDataAsOf(series.data_as_of)}
          />
          <ExportBox>
            <ZubauTimelineChart
              years={years}
              additionsGw={additionsGw}
              partial={partial}
              future={future}
              feedIn={feedIn}
              price={price}
              milestoneYears={ZUBAU_MILESTONE_YEARS}
              height={420}
            />
          </ExportBox>
          {/* Die Zeitleiste ist reine Bedienung — im Bild wären die Punkte und
              Blätter-Pfeile tote Knöpfe. Der Text des aktiven Ereignisses bleibt
              über die eigene Export-Markierung in EventTimeline erhalten. */}
          <div style={{ marginTop: 6 }}>
            <EventTimeline
              events={ZUBAU_EVENTS}
              active={active}
              onChange={setActive}
              startYear={years[0]}
              endYear={years[years.length - 1]}
            />
          </div>
        </div>

        <div>
          {/* Sichtbare Fußzeile aus dem geteilten Baustein. Im Artikel (variant
              "page") entfällt der nächste Schritt: er führte auf genau die Seite,
              auf der das Widget schon steht. */}
          <WidgetFooter
            widget={WIDGET}
            chartExport={chartExport}
            onsite={isOnsite}
            branding={branding}
            share={share}
            showCta={isEmbed && !isOnsite}
            showEmbed={showEmbed}
          />

          {/* Nur im Bild: Legende (drei Reihen auf zwei Achsen — ohne sie ist das
              Bild nicht lesbar), Erläuterung, Datenquelle + Marke. */}
          <WidgetExportFooter
            widget={WIDGET}
            legend={[
              { color: tokens["--color-accent"], label: "Zubau pro Jahr (GWp, linke Achse)", shape: "box" },
              { color: tokens["--color-positive"], label: "Einspeisevergütung (ct/kWh, rechte Achse)" },
              { color: tokens["--color-text-secondary"], label: "Haushaltsstrompreis (ct/kWh, rechte Achse)" },
            ]}
            // Die Zeitleiste zeigt im Bild nur EIN Ereignis — ohne diese Zeile
            // bleiben die Punkte davor und danach unerklärt.
            note={`Ereignis ${active + 1} von ${ZUBAU_EVENTS.length} der Zeitleiste (${ZUBAU_EVENTS[active].year} · ${ZUBAU_EVENTS[active].label}); die übrigen Wendepunkte stehen interaktiv auf solar-check.io. Der hell eingefärbte letzte Balken ist das laufende Jahr und damit noch unvollständig.`}
          />
        </div>
      </div>
    </ExportNotesProvider>
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
};
