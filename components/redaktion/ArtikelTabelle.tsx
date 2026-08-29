"use client";

import { v, space } from "../../lib/theme";
import { DatenTabelle, type Spalte } from "../admin/DatenTabelle";
import { DetailAbschnitt } from "../admin/DetailAbschnitt";
import { NeuBewerten } from "./NeuBewerten";
import { ErfolgMessen } from "./ErfolgMessen";
import { geaendertAm, type ArtikelVorhaben } from "../../lib/artikelplan";

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
  const istVerworfen = vorhaben.zustand === "verworfen";
  void verworfen;

  return (
    <div style={{ paddingBottom: space.sm }}>
      <DetailAbschnitt titel={istVerworfen ? "Warum verworfen" : "Warum dieses Thema"} erster>
        <p style={{ margin: 0 }}>
          {istVerworfen ? vorhaben.verworfenWeil : vorhaben.begruendung}
        </p>
      </DetailAbschnitt>

      {/* Bei einem verworfenen Thema gehört BEIDES in die Zeile: der Einwand und
          das, was ursprünglich dafür sprach. Ohne den zweiten Teil startet eine
          spätere Neubewertung beim Einwand statt bei der Sache. */}
      {istVerworfen && (
        <DetailAbschnitt titel="Was dafür sprach">
          <p style={{ margin: 0 }}>{vorhaben.begruendung}</p>
        </DetailAbschnitt>
      )}

      {vorhaben.voraussetzung && (
        <DetailAbschnitt titel="Vorher nötig">
          <p style={{ margin: 0 }}>{vorhaben.voraussetzung}</p>
        </DetailAbschnitt>
      )}

      {m.nebenbegriffe && m.nebenbegriffe.length > 0 && (
        <DetailAbschnitt titel="Mitbediente Begriffe">
          <ul style={{ margin: 0, paddingLeft: space.lg }}>
            {m.nebenbegriffe.map((n) => (
              <li key={n.begriff}>
                {n.begriff} — {n.volumen.toLocaleString("de-DE")}/Mo, Schwierigkeit{" "}
                {n.schwierigkeit}
              </li>
            ))}
          </ul>
        </DetailAbschnitt>
      )}

      {vorhaben.slug && (
        <DetailAbschnitt titel={vorhaben.zustand === "live" ? "Adresse" : "Geplante Adresse"}>
          <p style={{ margin: 0 }}>{vorhaben.slug}</p>
        </DetailAbschnitt>
      )}

      <DetailAbschnitt titel="Nachmessen">
        <div style={{ display: "flex", gap: space.md, flexWrap: "wrap", alignItems: "flex-start" }}>
          <NeuBewerten thema={vorhaben.thema} />
          {/* Nur bei einer veröffentlichten Seite: Was ist aus der Vorhersage
              geworden? Bei allem anderen gäbe es nichts zu messen — und ein
              Knopf, der immer null liefert, wird nicht mehr gedrückt. */}
          {vorhaben.zustand === "live" && <ErfolgMessen thema={vorhaben.thema} />}
        </div>
      </DetailAbschnitt>
    </div>
  );
}

export function ArtikelTabelle({
  vorhaben,
  volumen,
  zustandLabel,
  verworfen,
  mitDaten,
}: {
  vorhaben: ArtikelVorhaben[];
  /** Vorberechnet auf dem Server, damit die Tabelle keine Rechenlogik trägt. */
  volumen: Record<string, number>;
  zustandLabel: Record<string, string>;
  verworfen?: boolean;
  /**
   * Veröffentlichungs- und Änderungstag als eigene Spalten. Nur in der Ansicht
   * der Veröffentlichten sinnvoll: In der gemischten Liste wären sie bei zwei
   * Dritteln der Zeilen leer, und eine Spalte, die meist nichts enthält, macht
   * die Tabelle breiter ohne sie besser zu machen.
   */
  mitDaten?: boolean;
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

  if (mitDaten) {
    spalten.push(
      {
        key: "seit",
        kopf: "live seit",
        zelle: (vh) =>
          vh.seit ? (
            <span style={{ color: v("--color-text-muted") }}>
              {new Date(vh.seit).toLocaleDateString("de-DE")}
            </span>
          ) : (
            "—"
          ),
        // Ohne Datum ans Ende, egal in welche Richtung sortiert wird: Ein
        // fehlender Wert ist keine Aussage und gehört nicht an die Spitze.
        sortWert: (vh) => vh.seit ?? "9999-99-99",
      },
      {
        key: "geaendert",
        kopf: "geändert",
        zelle: (vh) => {
          const g = geaendertAm(vh);
          return g ? (
            <span style={{ color: v("--color-text-muted") }}>
              {new Date(g).toLocaleDateString("de-DE")}
            </span>
          ) : (
            "—"
          );
        },
        sortWert: (vh) => geaendertAm(vh) ?? "9999-99-99",
      },
    );
  }

  {
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
      startSortierung={[{ key: "volumen", richtung: "ab" }]}
      leerText={verworfen ? "Nichts verworfen." : "Keine Vorhaben."}
      minBreite={mitDaten ? 1040 : 860}
    />
  );
}
