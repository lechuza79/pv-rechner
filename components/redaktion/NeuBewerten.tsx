"use client";

import { useState } from "react";
import { v, space, pad } from "../../lib/theme";

// „Neu bewerten“: holt Suchvolumen und Schwierigkeit frisch und stellt sie
// neben den gespeicherten Stand.
//
// Der Knopf ändert den Plan NICHT. Das ist Absicht und keine fehlende Hälfte:
// Der Plan liegt im Code, damit ein Test jede Zahl gegen ihren Erhebungstag und
// jede Verwerfung gegen ihren Grund prüfen kann. Eine Ansicht, die den Plan
// überschreibt, hätte diese Prüfung nicht — und eine eingetippte Zahl wäre von
// einer gemessenen nicht mehr zu unterscheiden.
//
// Was der Knopf leistet, ist die Frage, die man sonst nicht stellt: Gilt die
// Zahl von damals noch? Gerade bei den verworfenen Themen ist das der Punkt —
// ein Thema, das an seiner Schwierigkeit gescheitert ist, kann in einem halben
// Jahr anders dastehen.

interface Wert {
  begriff: string;
  volumen: number | null;
  schwierigkeit: number | null;
}

interface Ergebnis {
  gespeichertAm: string;
  gemessenAm: string;
  alt: Wert[];
  neu: Wert[];
}

function zahl(n: number | null): string {
  return n === null ? "—" : n.toLocaleString("de-DE");
}

/** Wie stark hat sich der Wert bewegt? Unter 10 % ist Rauschen, nicht Nachricht. */
function abweichung(altWert: number | null, neuWert: number | null): "hoch" | "runter" | null {
  if (altWert === null || neuWert === null || altWert === 0) return null;
  const d = (neuWert - altWert) / altWert;
  if (Math.abs(d) < 0.1) return null;
  return d > 0 ? "hoch" : "runter";
}

export function NeuBewerten({ thema }: { thema: string }) {
  const [laeuft, setLaeuft] = useState(false);
  const [ergebnis, setErgebnis] = useState<Ergebnis | null>(null);
  const [fehler, setFehler] = useState<string | null>(null);

  async function messen() {
    setLaeuft(true);
    setFehler(null);
    try {
      const res = await fetch("/api/admin/artikelplan/messen", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ thema }),
      });
      const daten = await res.json();
      if (!res.ok) {
        setFehler(daten?.fehler ?? "Die Messung ist fehlgeschlagen.");
      } else {
        setErgebnis(daten as Ergebnis);
      }
    } catch {
      setFehler("Die Messung war nicht erreichbar.");
    } finally {
      setLaeuft(false);
    }
  }

  return (
    <div style={{ marginTop: 0 }}>
      <button
        type="button"
        onClick={messen}
        disabled={laeuft}
        style={{
          font: "inherit",
          fontSize: 13,
          color: laeuft ? v("--color-text-muted") : v("--color-accent"),
          background: "none",
          border: `1px solid ${v("--color-border-muted")}`,
          borderRadius: v("--radius-sm"),
          padding: pad("xs", "md"),
          cursor: laeuft ? "default" : "pointer",
        }}
      >
        {laeuft ? "misst …" : "Neu bewerten"}
      </button>

      {fehler && (
        <p style={{ fontSize: 13, color: v("--color-negative"), marginTop: space.sm }}>
          {fehler}
        </p>
      )}

      {ergebnis && (
        <div style={{ marginTop: space.md, fontSize: 13 }}>
          <p style={{ color: v("--color-text-muted"), marginBottom: space.sm }}>
            gespeichert vom {new Date(ergebnis.gespeichertAm).toLocaleDateString("de-DE")} · gerade
            gemessen am {new Date(ergebnis.gemessenAm).toLocaleDateString("de-DE")}
          </p>
          <table style={{ borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ color: v("--color-text-muted"), textAlign: "left" }}>
                <th style={{ paddingRight: space.lg, fontWeight: 400 }}>Begriff</th>
                <th style={{ paddingRight: space.lg, fontWeight: 400 }}>Suchen/Mo</th>
                <th style={{ fontWeight: 400 }}>Schwierigkeit</th>
              </tr>
            </thead>
            <tbody>
              {ergebnis.neu.map((n, i) => {
                const a = ergebnis.alt[i];
                const richtung = abweichung(a?.volumen ?? null, n.volumen);
                return (
                  <tr key={n.begriff}>
                    <td style={{ paddingRight: space.lg }}>{n.begriff}</td>
                    <td style={{ paddingRight: space.lg }}>
                      {zahl(n.volumen)}
                      {richtung && (
                        <span
                          style={{
                            color:
                              richtung === "hoch" ? v("--color-positive") : v("--color-negative"),
                            marginLeft: space.xs,
                          }}
                        >
                          (vorher {zahl(a?.volumen ?? null)})
                        </span>
                      )}
                    </td>
                    <td>
                      {zahl(n.schwierigkeit)}
                      {a && a.schwierigkeit !== n.schwierigkeit && (
                        <span style={{ color: v("--color-text-muted"), marginLeft: space.xs }}>
                          (vorher {zahl(a.schwierigkeit)})
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          <p style={{ color: v("--color-text-muted"), marginTop: space.sm }}>
            Nur angesehen, nicht übernommen — der Plan wird im Code geändert, damit die Prüfungen
            greifen.
          </p>
        </div>
      )}
    </div>
  );
}
