"use client";

import { v, space } from "../../lib/theme";
import { DatenTabelle, type Spalte } from "../admin/DatenTabelle";
import { NeuBewerten } from "./NeuBewerten";
import type { ArtikelVorhaben } from "../../lib/artikelplan";

// Die Warteschlange als Tabelle: harte Zahlen in Spalten, der Text dahinter
// ausklappbar.
//
// Warum tabellarisch (Betreiber-Vorgabe 27.08.2026): Der Plan wird gelesen, um
// zu ENTSCHEIDEN, was als Nächstes drankommt — und dafür vergleicht man Zahlen
// über die Zeilen hinweg. In der ersten Fassung stand jede Begründung als
// Absatz unter ihren Zahlen; man musste scrollen, um zwei Vorhaben nebeneinander
// zu halten, und genau das ist die einzige Bewegung, die diese Seite braucht.
//
// Aussehen, Sortierung und Aufklappen kommen aus der gemeinsamen Admin-Tabelle.
// Diese Datei sagt nur noch, WELCHE Spalten es gibt und was in ihnen steht.

const ZUSTAND_FARBE = {
  geplant: "--color-text-muted",
  "in-arbeit": "--color-accent",
  live: "--color-positive",
  verworfen: "--color-text-muted",
} as const;

function Detail({
  vorhaben,
  verworfen,
}: {
  vorhaben: ArtikelVorhaben;
  verworfen?: boolean;
}) {
  const m = vorhaben.messung;
  return (
    <div>
      <p style={{ color: v("--color-text-secondary"), maxWidth: 720, marginBottom: space.md }}>
        {verworfen ? vorhaben.verworfenWeil : vorhaben.begruendung}
      </p>

      {/* Bei einem verworfenen Thema gehört BEIDES in die Zeile: der Einwand und
          das, was ursprünglich dafür sprach. Ohne den zweiten Teil startet eine
          spätere Neubewertung beim Einwand statt bei der Sache. */}
      {verworfen && (
        <p
          style={{
            fontSize: v("--font-size-small"),
            color: v("--color-text-muted"),
            maxWidth: 720,
            marginBottom: space.md,
          }}
        >
          Ursprünglich dafür sprach: {vorhaben.begruendung}
        </p>
      )}

      {vorhaben.voraussetzung && (
        <p
          style={{
            fontSize: v("--font-size-small"),
            color: v("--color-text-secondary"),
            borderLeft: `2px solid ${v("--color-border-muted")}`,
            paddingLeft: space.md,
            maxWidth: 720,
            marginBottom: space.md,
          }}
        >
          <strong style={{ fontWeight: 600 }}>Vorher nötig: </strong>
          {vorhaben.voraussetzung}
        </p>
      )}

      {m.nebenbegriffe && m.nebenbegriffe.length > 0 && (
        <p
          style={{
            fontSize: v("--font-size-caption"),
            color: v("--color-text-muted"),
            marginBottom: space.sm,
          }}
        >
          bedient mit:{" "}
          {m.nebenbegriffe
            .map(
              (n) =>
                `${n.begriff} (${n.volumen.toLocaleString("de-DE")}/Mo, Schwierigkeit ${n.schwierigkeit})`,
            )
            .join(" · ")}
        </p>
      )}

      {vorhaben.slug && (
        <p style={{ fontSize: v("--font-size-caption"), color: v("--color-text-muted") }}>
          geplante Adresse: {vorhaben.slug}
        </p>
      )}

      <NeuBewerten thema={vorhaben.thema} />
    </div>
  );
}

export function ArtikelTabelle({
  vorhaben,
  volumen,
  zustandLabel,
  verworfen,
}: {
  vorhaben: ArtikelVorhaben[];
  /** Vorberechnet auf dem Server, damit die Tabelle keine Rechenlogik trägt. */
  volumen: Record<string, number>;
  zustandLabel: Record<string, string>;
  verworfen?: boolean;
}) {
  const vol = (vh: ArtikelVorhaben) => volumen[vh.thema] ?? vh.messung.volumen;

  const spalten: Spalte<ArtikelVorhaben>[] = [
    {
      key: "thema",
      kopf: "Thema",
      zelle: (vh) => vh.thema,
      sortWert: (vh) => vh.thema,
      umbruch: true,
    },
    {
      key: "begriff",
      kopf: "Suchbegriff",
      zelle: (vh) => (
        <span style={{ color: v("--color-text-secondary") }}>{vh.messung.begriff}</span>
      ),
      sortWert: (vh) => vh.messung.begriff,
    },
    {
      key: "volumen",
      kopf: "Suchen/Mo",
      zelle: (vh) => vol(vh).toLocaleString("de-DE"),
      sortWert: vol,
      rechts: true,
    },
    {
      key: "schwierigkeit",
      kopf: "Schwierigkeit",
      zelle: (vh) => vh.messung.schwierigkeit,
      sortWert: (vh) => vh.messung.schwierigkeit,
      rechts: true,
    },
    {
      key: "gemessen",
      kopf: "gemessen",
      zelle: (vh) => (
        <span style={{ color: v("--color-text-muted") }}>
          {new Date(vh.messung.gemessenAm).toLocaleDateString("de-DE")}
        </span>
      ),
      // Sortiert wird über das ISO-Datum, nicht über die angezeigte Form —
      // „7.8.2026" stünde sonst hinter „27.8.2026".
      sortWert: (vh) => vh.messung.gemessenAm,
    },
  ];

  if (!verworfen) {
    spalten.push({
      key: "zustand",
      kopf: "Stand",
      zelle: (vh) => (
        <span style={{ color: v(ZUSTAND_FARBE[vh.zustand]) }}>
          {zustandLabel[vh.zustand] ?? vh.zustand}
        </span>
      ),
      sortWert: (vh) => vh.zustand,
    });
  }

  return (
    <DatenTabelle
      zeilen={vorhaben}
      spalten={spalten}
      schluessel={(vh) => vh.thema}
      detail={(vh) => <Detail vorhaben={vh} verworfen={verworfen} />}
      // Größtes Volumen zuerst: Die Seite wird gelesen, um zu entscheiden, was
      // als Nächstes drankommt.
      startSortierung={{ key: "volumen", richtung: "ab" }}
      leerText={verworfen ? "Nichts verworfen." : "Keine Vorhaben."}
      minBreite={860}
    />
  );
}
