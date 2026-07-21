"use client";

import ZubauWidget from "../../../components/charts/ZubauWidget";
import { v } from "../../../lib/theme";
import type { NationalSolarSeries } from "../../../lib/mastr-data";
import { FEEDIN_HISTORY_META } from "../../../lib/feedin-history";
import { PRICE_META } from "../../../lib/strommix-history";
import { DATA_SOURCES, sourceLabel } from "../../../lib/data-sources";

// Redaktionelles Seiten-Muster wie die Ratgeber-Seiten: Lesespalte auf
// --content-max-width, Typo über die --font-size-*-Tokens. Das Chart-Widget
// darf bewusst breiter sein als der Fließtext (Breakout) — bei 640 px wären
// 28 Jahresbalken zu gedrängt.
const S: Record<string, React.CSSProperties> = {
  textCol: { maxWidth: v("--content-max-width"), margin: "0 auto" },
  wide: { maxWidth: 880, margin: "0 auto" },
  label: {
    fontSize: v("--font-size-caption"),
    fontWeight: 700,
    color: v("--color-text-secondary"),
    textTransform: "uppercase",
    letterSpacing: "0.04em",
    marginBottom: 6,
    display: "block",
  },
  h1: {
    fontSize: v("--font-size-h1"),
    fontWeight: 800,
    letterSpacing: "-0.02em",
    color: v("--color-text-primary"),
    lineHeight: 1.25,
    marginBottom: 10,
  },
  subtitle: {
    fontSize: v("--font-size-lead"),
    color: v("--color-text-muted"),
    marginBottom: 24,
    lineHeight: 1.6,
  },
  h2: {
    fontSize: v("--font-size-h2"),
    fontWeight: 700,
    color: v("--color-text-primary"),
    marginTop: 32,
    marginBottom: 10,
  },
  p: {
    fontSize: v("--font-size-body"),
    color: v("--color-text-muted"),
    lineHeight: 1.7,
    marginBottom: 12,
  },
  strong: { fontWeight: 700, color: v("--color-text-primary") },
  link: { color: v("--color-accent"), textDecoration: "none", fontWeight: 600 },
  cta: {
    display: "inline-flex",
    alignItems: "center",
    gap: 8,
    background: v("--color-accent"),
    color: v("--color-text-on-accent"),
    fontSize: v("--font-size-body"),
    fontWeight: 700,
    padding: "10px 18px",
    borderRadius: v("--radius-md"),
    textDecoration: "none",
  },
  // Quellen bewusst mit deutlichem Abstand unter dem Artikel abgesetzt.
  sources: {
    marginTop: 64,
    paddingTop: 20,
    borderTop: `1px solid ${v("--color-border")}`,
    fontSize: v("--font-size-caption"),
    lineHeight: 1.8,
    color: v("--color-text-faint"),
  },
  sourceLink: { color: v("--color-text-muted"), textDecoration: "underline", textUnderlineOffset: 2 },
};

export default function ZubauDeutschlandClient({ series }: { series: NationalSolarSeries | null }) {
  if (!series || series.points.length === 0) {
    return (
      <div style={S.textCol}>
        <h1 style={S.h1}>Photovoltaik-Zubau in Deutschland</h1>
        <p style={S.p}>Die Zubaudaten sind gerade nicht abrufbar. Bitte lade die Seite in einem Moment neu.</p>
      </div>
    );
  }

  const asOf = series.data_as_of;
  const boomPeak = Math.max(...series.points.filter((p) => !p.partial).map((p) => p.kwp / 1e6));

  return (
    <article>
      {/* Kopf */}
      <div style={S.textCol}>
        <span style={S.label}>Datenstory · Solar in Deutschland</span>
        <h1 style={S.h1}>Wie Förderung den Solarausbau geformt hat</h1>
        <p style={S.subtitle}>
          Der jährliche Photovoltaik-Zubau in Deutschland folgt keiner geraden Linie, sondern den
          politischen Weichenstellungen. Die Balken zeigen, wie viel Leistung Jahr für Jahr dazukam;
          die beiden Linien zeigen, warum: die sinkende Einspeisevergütung und der steigende Strompreis.
        </p>
      </div>

      {/* Interaktives, einbettbares Widget (Chart + Ereignis-Timeline) */}
      <div style={S.wide}>
        <ZubauWidget series={series} variant="page" />
      </div>

      {/* Story unter dem Chart */}
      <div style={S.textCol}>
        <h2 style={S.h2}>Zwei Booms, ein Wendepunkt</h2>
        <p style={S.p}>
          Der <strong style={S.strong}>erste Boom</strong> (rund 2009–2012) lief über die
          Einspeisevergütung: Wer eine Anlage aufs Dach setzte, bekam für jede eingespeiste
          Kilowattstunde zunächst deutlich mehr, als eine Kilowattstunde Strom kostete. Als die
          Vergütung 2012 drastisch gekürzt wurde und unter den Haushaltsstrompreis fiel, kippte die
          Logik — und der Zubau brach über Jahre ein.
        </p>
        <p style={S.p}>
          Der <strong style={S.strong}>zweite Boom</strong> (ab 2022) hat einen anderen Motor: nicht
          mehr das Einspeisen, sondern der <strong style={S.strong}>Eigenverbrauch</strong>. Als die
          Strompreise in der Energiekrise 2022/2023 sprunghaft stiegen, wurde jede selbst genutzte
          Kilowattstunde bares Geld wert. Die Nullsteuer 2023 nahm zusätzlich die Anschaffungshürde.
          Ergebnis: Rekord-Zubau bei gleichzeitig niedriger Vergütung — der Beweis, dass heute der
          Strompreis die Anlage trägt, nicht mehr die Förderung. Der Höchststand liegt bei über{" "}
          {Math.floor(boomPeak)} GW in einem einzigen Jahr.
        </p>

        <h2 style={S.h2}>Und die regionale Förderung?</h2>
        <p style={S.p}>
          Die großen Wellen kommen aus der Bundespolitik — Einspeisevergütung, Mehrwertsteuer,
          Strompreis. Länder und Kommunen fördern zusätzlich, aber diese Programme sind zu klein, um
          die bundesweite Kurve sichtbar zu bewegen. Sie lohnen sich für die einzelne Anlage trotzdem.
          Welche Programme es in deiner Region gibt, findest du hier:
        </p>
        <p style={{ marginBottom: 12 }}>
          <a href="/photovoltaik-foerderung" style={S.cta}>
            Förderprogramme nach Region →
          </a>
        </p>
        <p style={S.p}>
          Du überlegst, ob sich eine Anlage für dich rechnet?{" "}
          <a href="/photovoltaik-rechner" style={S.link}>
            Zum PV-Rechner
          </a>
          .
        </p>
      </div>

      {/* Quellen + Unverbindlichkeit — deutlich abgesetzt */}
      <div style={{ ...S.textCol, ...S.sources }}>
        <div>
          <strong>Zubau:</strong>{" "}
          <a href={DATA_SOURCES.mastr.url} target="_blank" rel="noopener noreferrer" style={S.sourceLink}>
            {sourceLabel(DATA_SOURCES.mastr)}
          </a>
          , Meldestand {asOf}.
        </div>
        <div>
          <strong>Einspeisevergütung:</strong>{" "}
          <a href={FEEDIN_HISTORY_META.sourceUrl} target="_blank" rel="noopener noreferrer" style={S.sourceLink}>
            {sourceLabel(DATA_SOURCES.eegVerguetung)}
          </a>
          .
        </div>
        <div>
          <strong>Strompreis:</strong>{" "}
          <a href={PRICE_META.sourceUrl} target="_blank" rel="noopener noreferrer" style={S.sourceLink}>
            Eurostat
          </a>
          , {PRICE_META.license} (Haushalt, Jahresmittel, ab 2007).
        </div>
        <div style={{ marginTop: 10 }}>
          Alle Angaben ohne Gewähr. Die Vergütungssätze sind gesetzliche EEG-Werte; verbindlich ist die
          jeweilige amtliche Quelle. Historische Jahressätze sind Jahresanfangs-Werte (ab April 2012 sank
          die Vergütung unterjährig).
        </div>
      </div>
    </article>
  );
}
