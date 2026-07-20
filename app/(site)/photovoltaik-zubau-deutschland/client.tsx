"use client";

import ZubauWidget from "../../../components/charts/ZubauWidget";
import { v } from "../../../lib/theme";
import type { NationalSolarSeries } from "../../../lib/mastr-data";
import { FEEDIN_HISTORY_META } from "../../../lib/feedin-history";
import { PRICE_META } from "../../../lib/strommix-history";
import { DATA_SOURCES, sourceLabel } from "../../../lib/data-sources";

function Label({ children }: { children: React.ReactNode }) {
  return (
    <span style={{ fontSize: 12, color: v("--color-text-muted"), fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.04em" }}>
      {children}
    </span>
  );
}

export default function ZubauDeutschlandClient({ series }: { series: NationalSolarSeries | null }) {
  if (!series || series.points.length === 0) {
    return (
      <div style={{ maxWidth: 820, margin: "0 auto" }}>
        <div style={{ background: v("--color-bg"), border: `1px solid ${v("--color-border")}`, borderRadius: 14, padding: "22px 20px" }}>
          <h1 style={{ fontSize: 22, fontWeight: 800, margin: "0 0 8px", color: v("--color-text-primary") }}>
            Photovoltaik-Zubau in Deutschland
          </h1>
          <p style={{ fontSize: 14, color: v("--color-text-secondary"), margin: 0 }}>
            Die Zubaudaten sind gerade nicht abrufbar. Bitte lade die Seite in einem Moment neu.
          </p>
        </div>
      </div>
    );
  }

  const asOf = series.data_as_of;
  const boomPeak = Math.max(...series.points.filter((p) => !p.partial).map((p) => p.kwp / 1e6));

  const textCol: React.CSSProperties = { padding: "0 2px" };

  return (
    <article style={{ maxWidth: 820, margin: "0 auto", display: "flex", flexDirection: "column", gap: 20 }}>
      {/* Kopf + Story — über dem Widget, Teil des Artikels */}
      <header style={textCol}>
        <div style={{ marginBottom: 4 }}>
          <Label>Datenstory · Solar in Deutschland</Label>
        </div>
        <h1 style={{ fontSize: 26, fontWeight: 800, letterSpacing: "-0.02em", margin: "0 0 10px", color: v("--color-text-primary"), lineHeight: 1.15 }}>
          Wie Förderung den Solarausbau geformt hat
        </h1>
        <p style={{ fontSize: 15, lineHeight: 1.6, color: v("--color-text-secondary"), margin: 0 }}>
          Der jährliche Photovoltaik-Zubau in Deutschland folgt keiner geraden Linie, sondern den
          politischen Weichenstellungen. Im Chart unten zeigen die Balken, wie viel Leistung Jahr für Jahr
          dazukam; die beiden Linien zeigen, warum: die sinkende Einspeisevergütung und der steigende
          Strompreis.
        </p>
      </header>

      <section style={textCol}>
        <h2 style={{ fontSize: 18, fontWeight: 700, margin: "0 0 8px", color: v("--color-text-primary") }}>
          Zwei Booms, ein Wendepunkt
        </h2>
        <p style={{ fontSize: 15, lineHeight: 1.65, color: v("--color-text-secondary"), margin: "0 0 10px" }}>
          Der <strong>erste Boom</strong> (rund 2009–2012) lief über die Einspeisevergütung: Wer eine
          Anlage aufs Dach setzte, bekam für jede eingespeiste Kilowattstunde deutlich mehr, als eine
          Kilowattstunde Strom damals kostete. Als die Vergütung 2012 drastisch gekürzt wurde und unter
          den Haushaltsstrompreis fiel, kippte die Logik — und der Zubau brach über Jahre ein.
        </p>
        <p style={{ fontSize: 15, lineHeight: 1.65, color: v("--color-text-secondary"), margin: 0 }}>
          Der <strong>zweite Boom</strong> (ab 2022) hat einen anderen Motor: nicht mehr das Einspeisen,
          sondern der <strong>Eigenverbrauch</strong>. Als die Strompreise in der Energiekrise 2022/2023
          sprunghaft stiegen, wurde jede selbst genutzte Kilowattstunde bares Geld wert. Die Nullsteuer
          2023 nahm zusätzlich die Anschaffungshürde. Ergebnis: Rekord-Zubau bei gleichzeitig niedriger
          Vergütung — der Beweis, dass heute der Strompreis die Anlage trägt, nicht mehr die Förderung.
          Der Höchststand liegt bei über {Math.floor(boomPeak)} GW in einem einzigen Jahr.
        </p>
        <p style={{ fontSize: 13.5, lineHeight: 1.55, color: v("--color-text-muted"), margin: "10px 0 0" }}>
          Tipp: In der Zeitleiste unter dem Chart kannst du die einzelnen Weichenstellungen durchgehen —
          jede Marke erklärt, was passiert ist. Das laufende Jahr ist ausgegraut (noch nicht vollständig
          gemeldet), der letzte Balken ist deshalb kein Rückgang.
        </p>
      </section>

      {/* Interaktives, einbettbares Widget (Chart + Ereignis-Timeline).
          Der Ausblick 2027 lebt jetzt als geplante Marke rechts in der Timeline
          (leerer Platzhalter-Balken), nicht mehr als eigener Absatz. */}
      <ZubauWidget series={series} variant="page" />

      <section style={textCol}>
        <h2 style={{ fontSize: 18, fontWeight: 700, margin: "0 0 8px", color: v("--color-text-primary") }}>
          Und die regionale Förderung?
        </h2>
        <p style={{ fontSize: 15, lineHeight: 1.65, color: v("--color-text-secondary"), margin: "0 0 12px" }}>
          Die großen Wellen kommen aus der Bundespolitik — Einspeisevergütung, Mehrwertsteuer, Strompreis.
          Länder und Kommunen fördern zusätzlich, aber diese Programme sind zu klein, um die bundesweite
          Kurve sichtbar zu bewegen. Sie lohnen sich für die einzelne Anlage trotzdem. Welche Programme es
          in deiner Region gibt, findest du hier:
        </p>
        <a
          href="/photovoltaik-foerderung"
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 8,
            background: v("--color-accent"),
            color: v("--color-text-on-accent"),
            fontSize: 14,
            fontWeight: 700,
            padding: "10px 16px",
            borderRadius: 10,
            textDecoration: "none",
          }}
        >
          Förderprogramme nach Region →
        </a>
        <p style={{ fontSize: 14, lineHeight: 1.55, color: v("--color-text-secondary"), margin: "14px 0 0" }}>
          Du überlegst, ob sich eine Anlage für dich rechnet?{" "}
          <a href="/photovoltaik-rechner" style={{ color: v("--color-accent"), fontWeight: 600 }}>
            Zum PV-Rechner
          </a>
          .
        </p>
      </section>

      {/* Quellen + Unverbindlichkeit */}
      <div style={{ fontSize: 11.5, lineHeight: 1.7, color: v("--color-text-muted"), padding: "0 4px" }}>
        <div>
          <strong>Zubau:</strong>{" "}
          <a href={DATA_SOURCES.mastr.url} target="_blank" rel="noopener noreferrer" style={{ color: v("--color-text-secondary") }}>
            {sourceLabel(DATA_SOURCES.mastr)}
          </a>
          , Meldestand {asOf}.
        </div>
        <div>
          <strong>Einspeisevergütung:</strong>{" "}
          <a href={FEEDIN_HISTORY_META.sourceUrl} target="_blank" rel="noopener noreferrer" style={{ color: v("--color-text-secondary") }}>
            {sourceLabel(DATA_SOURCES.eegVerguetung)}
          </a>
          .
        </div>
        <div>
          <strong>Strompreis:</strong>{" "}
          <a href={PRICE_META.sourceUrl} target="_blank" rel="noopener noreferrer" style={{ color: v("--color-text-secondary") }}>
            Eurostat
          </a>
          , {PRICE_META.license} (Haushalt, Jahresmittel, ab 2007).
        </div>
        <div style={{ marginTop: 6 }}>
          Alle Angaben ohne Gewähr. Die Vergütungssätze sind gesetzliche EEG-Werte; verbindlich ist die
          jeweilige amtliche Quelle. Historische Jahressätze sind Jahresanfangs-Werte (ab April 2012 sank
          die Vergütung unterjährig).
        </div>
      </div>
    </article>
  );
}
