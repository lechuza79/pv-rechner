"use client";

import { v, space } from "../../lib/theme";
import GemeindeWidgetShell from "./GemeindeWidgetShell";
import { WIDGETS, widgetFuerMeldung } from "../../lib/widget-registry";
import type { Meldung } from "../../lib/gemeinde-meldungen";

/**
 * Was es über diesen Ort gerade zu berichten gibt — als Karten, die man
 * mitnehmen kann.
 *
 * DAS IST DIE ERSTE DER DREI OBERFLÄCHEN, DIE lib/gemeinde-meldungen.ts SEIT
 * DEM 01.09.2026 ANKÜNDIGT. Gebaut war bisher nur die zweite (die Abo-Mail);
 * der Block auf der Ortsseite fehlte, und der dritte (der zweite Absatz im
 * Kommunen-Anschreiben) fehlt weiterhin. Hier wird deshalb NICHTS
 * nachformuliert: Titel und Text kommen aus derselben Rechnung, die die Mail
 * verschickt. Wer eine Formulierung ändern will, ändert sie dort.
 *
 * WARUM ÜBERHAUPT KARTEN UND NICHT EINE LISTE: Gemessen (05.09.2026) haben 289
 * Briefe an Kommunen vier Veröffentlichungen erzeugt — drei davon Beiträge in
 * sozialen Netzen, eine in einer Dorf-App. Was eine Pressestelle wirklich tut,
 * ist ein Bild posten; die Ortsseite bot dafür bisher nichts an, was die
 * Nachricht trägt. Eine Karte mit Schlagzeile, Quelle und Marke im Bild ist
 * genau das Format, das diesen Weg bedient — und sie trägt die Adresse der
 * Ortsseite mit, wenn sie weitergereicht wird.
 *
 * KEINE PLATZIERUNG IN DIESEM FEED, obwohl die Meldungs-Rechnung eine kennt.
 * Die Auszeichnung steht als eigene Karte direkt darüber, und zwei Elemente,
 * die dieselbe Frage beantworten, sind genau der Fehler, gegen den jener Block
 * gebaut wurde (siehe GemeindePlatzierungen). Sie kostet zusätzlich rund 1,7 s
 * Rangdaten und gehört damit ohnehin nicht in den Server-Render.
 */
export default function GemeindeMeldungen({
  meldungen,
  name,
  liveUrl,
  standIso,
}: {
  /** Fertig gerechnet, absteigend nach Gewicht. Leer ist ein zulässiges
   *  Ergebnis — dann rendert der Block gar nichts. */
  meldungen: Meldung[];
  name: string;
  /** Kanonische Adresse dieser Ortsseite. Wandert ins Teilen-Ziel jeder Karte. */
  liveUrl: string;
  /** Datenstand des Anlagenregisters. Steht an jeder Karte, auch im Bild. */
  standIso: string;
}) {
  // Höchstens drei. Der Rest steht ohnehin weiter unten auf der Seite als Zahl;
  // ein Feed, der jede Meldung ausbreitet, ist wieder die Zahlenwand, gegen die
  // dieser Block gebaut ist.
  const sichtbar = meldungen.slice(0, 3);
  if (sichtbar.length === 0) return null;

  return (
    <div style={S.wrap}>
      <h2 style={S.h2}>Aktuelles aus {name}</h2>
      <p style={S.sub}>
        Aus den Anlagendaten gerechnet — zum Herunterladen und Weitergeben.
      </p>
      <div style={S.grid}>
        {sichtbar.map((m) => (
          <MeldungsKarte key={m.schluessel} meldung={m} name={name} liveUrl={liveUrl} standIso={standIso} />
        ))}
      </div>
    </div>
  );
}

function MeldungsKarte({
  meldung,
  name,
  liveUrl,
  standIso,
}: {
  meldung: Meldung;
  name: string;
  liveUrl: string;
  standIso: string;
}) {
  // Die Schlagzeile IST der Titel der Karte — auf der Seite wie im Bild.
  const widget = widgetFuerMeldung(WIDGETS.gemeindeMeldung, name, meldung.titel, liveUrl);

  return (
    <GemeindeWidgetShell
      widget={widget}
      subline={`${name} · ${einordnung(meldung.art)}`}
      filename={`solar-check-${meldung.schluessel}`}
      // Die Quellenkante erwartet ein FERTIG FORMATIERTES Datum, nicht das
      // ISO-Feld: Ihr Rückfall ist das heutige Datum in deutscher Schreibweise,
      // und roh durchgereicht stünde neben allen anderen Karten der Seite ein
      // „2026-08-05".
      dataAsOf={standDeutsch(standIso)}
      // Eigene Seite: Quelle beim Überfahren, keine Markenzeile — die Seite
      // trägt beides. Im heruntergeladenen Bild stehen beide trotzdem, dafür
      // sorgt die Hülle.
      onsite
      // Kein zweiter Knopf in den Rechner: Die Seite bietet ihn weiter unten
      // schon an, und die Karte soll die Nachricht tragen, nicht werben.
      showCta={false}
      // Es gibt (noch) keine Einbett-Route für eine Meldung; der Knopf würde
      // in die Galerie springen statt Code für DIESEN Ort zu liefern.
      showEmbed={false}
    >
      {/* Die Hülle zentriert ihren Inhalt senkrecht — richtig für einen Donut,
          falsch für Fließtext: Eine kurze Meldung schwebte dann mit einem
          Streifen Nichts darüber und darunter in der Karte. Der Text füllt
          deshalb die Fläche und beginnt oben. */}
      <div style={S.textBox}>
        <p style={S.text}>{meldung.text}</p>
      </div>
    </GemeindeWidgetShell>
  );
}

/** "2026-08-05" → "05.08.2026" — dieselbe Schreibweise, die die Quellenkante
 *  ohne Angabe selbst erzeugt. */
function standDeutsch(iso: string): string {
  const d = new Date(`${iso}T00:00:00Z`);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString("de-DE", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    timeZone: "UTC",
  });
}

/**
 * Was die Art der Meldung dem Leser sagt.
 *
 * Nicht der interne Bezeichner: „bewegung" ist eine Kategorie im Code, keine
 * Auskunft. Sie beantwortet die Frage, die vor jeder Nachricht steht — ist das
 * neu, steht das an, oder ist das der Stand der Dinge.
 */
function einordnung(art: Meldung["art"]): string {
  if (art === "bewegung") return "neu in den Daten";
  if (art === "stichtag") return "steht bevor";
  return "Stand der Dinge";
}

const S: Record<string, React.CSSProperties> = {
  wrap: { marginTop: space.xxl },
  h2: { fontSize: v("--font-size-lead"), fontWeight: 700, margin: `0 0 ${space.xs}px` },
  sub: {
    fontSize: v("--font-size-small"),
    color: v("--color-text-secondary"),
    margin: `0 0 ${space.lg}px`,
  },
  // Drei Karten nebeneinander, wo Platz ist; darunter gestapelt. Feste
  // Mindestbreite statt Spaltenzahl: Die Hülle hat eine eigene Obergrenze, und
  // eine gequetschte Karte bricht ihren Quellenvermerk um.
  grid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
    gap: space.lg,
    alignItems: "stretch",
  },
  textBox: { alignSelf: "stretch", width: "100%", height: "100%" },
  text: {
    fontSize: v("--font-size-body"),
    lineHeight: 1.55,
    color: v("--color-text-primary"),
    margin: 0,
  },
};
