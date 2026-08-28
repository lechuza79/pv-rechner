"use client";

import { useState } from "react";
import { v, space, pad } from "../../lib/theme";
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
// Die Begründung verschwindet dabei nicht, sie rückt eine Ebene tiefer: Sie
// entscheidet die Frage „lohnt sich das“ nicht, sie beantwortet „warum steht
// das hier“ — und die stellt man einmal je Zeile, nicht bei jedem Blick.

interface Spalte {
  kopf: string;
  /** Rechtsbündig für Zahlen, damit Größenordnungen untereinander lesbar sind. */
  rechts?: boolean;
}

const SPALTEN_OFFEN: Spalte[] = [
  { kopf: "" },
  { kopf: "Thema" },
  { kopf: "Suchbegriff" },
  { kopf: "Suchen/Mo", rechts: true },
  { kopf: "Schwierigkeit", rechts: true },
  { kopf: "gemessen" },
  { kopf: "Stand" },
];

const SPALTEN_VERWORFEN: Spalte[] = [
  { kopf: "" },
  { kopf: "Thema" },
  { kopf: "Suchbegriff" },
  { kopf: "Suchen/Mo", rechts: true },
  { kopf: "Schwierigkeit", rechts: true },
  { kopf: "gemessen" },
];

function Kopf({ spalten }: { spalten: Spalte[] }) {
  return (
    <thead>
      <tr>
        {spalten.map((s, i) => (
          <th
            key={i}
            style={{
              textAlign: s.rechts ? "right" : "left",
              fontWeight: 400,
              fontSize: v("--font-size-caption"),
              color: v("--color-text-muted"),
              padding: pad("xs", "sm"),
              borderBottom: `1px solid ${v("--color-border-muted")}`,
              whiteSpace: "nowrap",
            }}
          >
            {s.kopf}
          </th>
        ))}
      </tr>
    </thead>
  );
}

const ZUSTAND_FARBE = {
  geplant: "--color-text-muted",
  "in-arbeit": "--color-accent",
  live: "--color-positive",
  verworfen: "--color-text-muted",
} as const;

function zelle(rechts?: boolean): React.CSSProperties {
  return {
    padding: pad("sm", "sm"),
    textAlign: rechts ? "right" : "left",
    verticalAlign: "top",
    borderBottom: `1px solid ${v("--color-border-muted")}`,
    whiteSpace: "nowrap",
  };
}

interface ZeileProps {
  vorhaben: ArtikelVorhaben;
  volumen: number;
  zustandLabel: string;
  spaltenZahl: number;
  verworfen?: boolean;
}

function Zeile({ vorhaben, volumen, zustandLabel, spaltenZahl, verworfen }: ZeileProps) {
  const [offen, setOffen] = useState(false);
  const m = vorhaben.messung;

  return (
    <>
      <tr
        onClick={() => setOffen((o) => !o)}
        style={{ cursor: "pointer" }}
        aria-expanded={offen}
      >
        <td style={{ ...zelle(), color: v("--color-text-muted"), width: 20 }}>
          <span
            aria-hidden
            style={{
              display: "inline-block",
              transform: offen ? "rotate(90deg)" : "none",
              transition: "transform 120ms",
            }}
          >
            ›
          </span>
        </td>
        <td style={{ ...zelle(), whiteSpace: "normal", maxWidth: 320 }}>{vorhaben.thema}</td>
        <td style={{ ...zelle(), color: v("--color-text-secondary") }}>{m.begriff}</td>
        <td style={{ ...zelle(true), fontVariantNumeric: "tabular-nums" }}>
          {volumen.toLocaleString("de-DE")}
        </td>
        <td style={{ ...zelle(true), fontVariantNumeric: "tabular-nums" }}>{m.schwierigkeit}</td>
        <td style={{ ...zelle(), color: v("--color-text-muted") }}>
          {new Date(m.gemessenAm).toLocaleDateString("de-DE")}
        </td>
        {!verworfen && (
          <td style={{ ...zelle(), color: v(ZUSTAND_FARBE[vorhaben.zustand]) }}>{zustandLabel}</td>
        )}
      </tr>

      {offen && (
        <tr>
          <td />
          <td
            colSpan={spaltenZahl - 1}
            style={{
              padding: pad("md", "sm"),
              borderBottom: `1px solid ${v("--color-border-muted")}`,
              whiteSpace: "normal",
            }}
          >
            <p style={{ color: v("--color-text-secondary"), maxWidth: 720, marginBottom: space.md }}>
              {verworfen ? vorhaben.verworfenWeil : vorhaben.begruendung}
            </p>

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
          </td>
        </tr>
      )}
    </>
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
  const spalten = verworfen ? SPALTEN_VERWORFEN : SPALTEN_OFFEN;
  return (
    // Breite Tabellen scrollen in ihrem eigenen Kasten, damit die Seite nicht
    // seitlich läuft.
    <div style={{ overflowX: "auto" }}>
      <table style={{ borderCollapse: "collapse", width: "100%", fontSize: v("--font-size-small") }}>
        <Kopf spalten={spalten} />
        <tbody>
          {vorhaben.map((vh) => (
            <Zeile
              key={vh.thema}
              vorhaben={vh}
              volumen={volumen[vh.thema] ?? vh.messung.volumen}
              zustandLabel={zustandLabel[vh.zustand] ?? vh.zustand}
              spaltenZahl={spalten.length}
              verworfen={verworfen}
            />
          ))}
        </tbody>
      </table>
    </div>
  );
}
