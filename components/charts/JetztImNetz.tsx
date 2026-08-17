"use client";

/**
 * Der Live-Block über dem Verlaufs-Chart: ein einordnender Satz, darunter zwei
 * gleichwertige Karten (Mix-Ring und Erzeugungs-Radial), darunter der Vergleich
 * zum Tagesmittel.
 *
 * Der Text ist der Punkt, nicht die Zierde: Zwei Ringe ohne Worte sind hübsch
 * und stumm — sie sagen nicht, ob 87 % viel oder wenig sind. Beide Sätze
 * rechnen aus derselben Reihe wie die Karten und ändern sich mit ihr; sie
 * behaupten nichts, was nicht in den Daten steht.
 *
 * UNABHÄNGIG vom Zeitraum-Umschalter der Seite: Der gehört zum Verlaufs-Chart.
 * Ein „gerade jetzt" aus der Max-Reihe wäre ein Monatsmittel von 2015, und ein
 * Block, der bei manchen Zeiträumen verschwindet, wirkt kaputt. Der Abruf ist
 * deshalb eigen — dieselbe Route, dieselben Parameter wie beim 24-Stunden-Chart,
 * der Cache verhindert einen zweiten Netzweg.
 *
 * Beide Karten zeigen denselben Moment: Der Ring leitet ihn aus den Daten ab,
 * das Radial bekommt ihn gereicht. Sonst sagt eins 14:45 und das andere 15:00,
 * und beide behaupten „gerade".
 */

import { useMemo } from "react";
import { useGenerationMix } from "../../lib/energy";
import { anteilZahl, calcPeriodStats, formatMWIn, powerUnit } from "../../lib/chart-utils";
import { v, space, pad } from "../../lib/theme";
import { LoadingDots } from "../LoadingDots";
import JetztDonut, { jetztAusReihe } from "./JetztDonut";
import ErzeugungWidget from "../ErzeugungWidget";

export default function JetztImNetz() {
  const { data, loading } = useGenerationMix("de", 24);
  const werte = jetztAusReihe(data.data);
  const stats = useMemo(() => calcPeriodStats(data.data, data.resolution), [data.data, data.resolution]);

  const zeit = werte
    ? new Date(werte.ts).toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit", timeZone: "Europe/Berlin" })
    : null;
  // Datum dazu: Eine reine Uhrzeit ist auf einer Live-Seite mehrdeutig, sobald
  // jemand den Tab über Nacht offen lässt oder den Link am nächsten Tag öffnet.
  // Als <time> ist der Stand zugleich maschinenlesbar — ehrliche HTML-Semantik
  // statt eines behaupteten „aktualisiert"-Signals in strukturierten Daten.
  const datum = werte
    ? new Date(werte.ts).toLocaleDateString("de-DE", { day: "2-digit", month: "2-digit", timeZone: "Europe/Berlin" })
    : null;

  // Größter Träger gerade — „Sonstige" ist ein Sammelposten und taugt nicht als
  // Antwort auf „woher kommt der Strom".
  const groesster = werte?.segments.find((s) => s.key !== "rest") ?? null;
  const mittel = stats?.eeSharePct ?? null;
  const jetztEe = werte?.eeSharePct ?? null;
  // 3 Punkte Abstand, damit aus Rundungsrauschen kein „deutlich mehr" wird.
  const abweichung = jetztEe != null && mittel != null ? jetztEe - mittel : null;

  const karte = {
    background: v("--color-bg"),
    border: `1px solid ${v("--color-border")}`,
    borderRadius: v("--radius-lg"),
    padding: pad("lg", "md"),
    // minWidth 0 ist hier PFLICHT: Ohne sie bekommt ein Grid-Kind die
    // automatische Mindestgröße seines Inhalts, und die einzeilige Stand-Zeile
    // („Stand 17.08., 16:15 Uhr · 57 GW im Netz") sprengt die Spalte.
    minWidth: 0,
    display: "flex",
    flexDirection: "column" as const,
  };

  const satz = {
    fontSize: v("--font-size-small"),
    lineHeight: 1.65,
    color: v("--color-text-secondary"),
    padding: "0 8px",
  };

  return (
    <div style={{ marginBottom: 20 }}>
      {/* Bereichs-Überschrift: Die beiden Karten sind ein eigener Abschnitt der
          Seite, nicht Zubehör des Verlaufs-Charts. Ohne sie beginnt der Bereich
          mit einem Fließsatz und hat in der Gliederung keinen Namen. */}
      <h2 style={{ fontSize: v("--font-size-lead"), fontWeight: 800, letterSpacing: "-0.01em", margin: `0 0 ${space.xs}px`, padding: "0 8px" }}>
        Der Strommix gerade jetzt
      </h2>

      {/* Einordnung ÜBER den Karten */}
      {werte && groesster && (
        <p style={{ ...satz, margin: `0 0 ${space.md}px` }}>
          Gerade decken erneuerbare Energien{" "}
          <strong style={{ color: v("--color-text-primary"), fontFamily: v("--font-mono") }}>
            {anteilZahl(werte.eeSharePct)} %
          </strong>{" "}
          der deutschen Stromerzeugung. Größter Einzelträger ist{" "}
          <strong style={{ color: v("--color-text-primary") }}>{groesster.label}</strong> mit{" "}
          <span style={{ fontFamily: v("--font-mono") }}>
            {anteilZahl((groesster.value / werte.totalMw) * 100)} %
          </span>
          .
        </p>
      )}

      {/* Grid statt Flexbox — und das ist der eigentliche Punkt: Flex verteilt
          den RESTPLATZ gleich, nicht die Spalten. Sobald ein Inhalt breiter ist
          als sein Anteil (hier die einzeilige Stand-Zeile auf breiten
          Fenstern), wächst seine Karte über die Hälfte hinaus — auf schmalen
          Fenstern fiel das nicht auf, weil die Zeile dort umbrach. `1fr` teilt
          dagegen die Fläche selbst, unabhängig vom Inhalt. Unter 2 × 240 plus
          Abstand fällt das Grid auf eine Spalte (Telefon). */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(min(240px, 100%), 1fr))",
          gap: space.md,
          alignItems: "stretch",
        }}
      >
        {/* Karte 1 — der Mix gerade */}
        <div style={karte}>
          {/* Echte Überschrift, kein gestyltes div: Die Chart-Titel standen als
              Textfelder da und fehlten damit in der Gliederung, die Google liest.
              Größe kommt aus dem Stil, die Bedeutung aus dem Element. */}
          <h2 style={{ fontSize: v("--font-size-small"), fontWeight: 700, margin: 0 }}>Gerade im Netz</h2>
          <div style={{ fontSize: v("--font-size-caption"), color: v("--color-text-muted"), marginTop: 2, minHeight: 16 }}>
            {werte && zeit ? (
              <>
                Stand <time dateTime={werte.ts}>{datum}, {zeit} Uhr</time> ·{" "}
                {formatMWIn(werte.totalMw, powerUnit(werte.totalMw))} im Netz
              </>
            ) : ""}
          </div>
          <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", marginTop: space.md }}>
            {/* 144 statt 160: Das Radial daneben zeichnet bei Größe 160 nur bis
                Radius 72, sein sichtbarer Kreis misst also 144. Gleiche
                Leinwandgröße hieße hier ungleich große Ringe. */}
            {loading && !werte ? <LoadingDots /> : <JetztDonut data={data.data} size={144} />}
          </div>
        </div>

        {/* Karte 2 — das Erzeugungs-Radial. Bringt Rahmen und Kopf selbst mit;
            `nackt` nimmt ihm die Widget-Fußzeile, deren nächster Schritt genau
            diese Seite wäre. Gleiche Flex-Basis wie Karte 1: zwei gleichwertige
            Aussagen, keine Haupt- und Nebenkarte. */}
        <div style={{ minWidth: 0, display: "flex" }}>
          <ErzeugungWidget compact nackt autoswitchMs={6000} onsite highlightTs={werte?.ts} />
        </div>
      </div>

      {/* Einordnung UNTER den Karten: der Moment gegen den Tag */}
      {abweichung != null && mittel != null && (
        <p style={{ ...satz, margin: `${space.md}px 0 0` }}>
          Über die letzten 24 Stunden gemittelt waren es{" "}
          <span style={{ fontFamily: v("--font-mono") }}>{anteilZahl(mittel)} %</span> —{" "}
          {Math.abs(abweichung) < 3
            ? "der Moment entspricht also ungefähr dem Tagesschnitt."
            : abweichung > 0
              ? "gerade liegt der Anteil also höher als im Tagesschnitt, typisch für die Mittagsstunden mit voller Solarleistung."
              : "gerade liegt der Anteil also niedriger als im Tagesschnitt — nachts und bei Flaute übernehmen steuerbare Kraftwerke."}
        </p>
      )}
    </div>
  );
}
