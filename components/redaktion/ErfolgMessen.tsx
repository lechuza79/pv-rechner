"use client";

import { useState } from "react";
import { v, space, pad } from "../../lib/theme";

// „Was ist daraus geworden?“ — die Rückseite der Vorhersage.
//
// Der Plan sagt für jedes Thema ein Suchvolumen voraus. Nach dem Livegang hat
// das nie jemand nachgeprüft; es gab keinen Weg zurück von der Seite zu der
// Schätzung, die sie begründet hat. Ohne diesen Weg wird die eigene
// Schätzpraxis nie besser.
//
// WAS DIE ZAHLEN BEDEUTEN — steht bewusst in der Oberfläche und nicht nur im
// Kommentar, weil eine nackte Gegenüberstellung zum falschen Schluss verleitet:
// Volumen ist eine Marktgröße, Einblendungen sind das, was bei uns ankommt.
// Dass die zweite Zahl kleiner ist, ist der Normalfall und kein Befund. Der
// Befund steckt im Verhältnis der beiden Lücken.

interface Anfrage {
  anfrage: string;
  einblendungen: number;
  klicks: number;
  position: number;
}

interface Ergebnis {
  eingerichtet: boolean;
  hinweis?: string;
  zeitraum?: { start: string; ende: string; tage: number };
  vorhergesagtesVolumen?: number;
  einblendungen?: number;
  klicks?: number;
  position?: number | null;
  anteilSichtbar?: number | null;
  anfragen?: Anfrage[];
}

function n(x: number | null | undefined, stellen = 0): string {
  if (x === null || x === undefined) return "—";
  return x.toLocaleString("de-DE", { maximumFractionDigits: stellen });
}

/**
 * Der Satz, der aus den Zahlen die Auskunft macht. Zwei Lücken, zwei
 * verschiedene Ursachen — und beide sieht man den nackten Zahlen nicht an.
 */
function deutung(e: Ergebnis): string | null {
  const { einblendungen: ein, klicks, vorhergesagtesVolumen: vol, position, anteilSichtbar } = e;
  if (ein === undefined || klicks === undefined || vol === undefined) return null;
  if (ein === 0) {
    return "Keine einzige Einblendung im Zeitraum. Entweder ist die Seite noch nicht indexiert, oder sie steht so weit hinten, dass sie niemand zu sehen bekommt.";
  }

  const anteil = vol > 0 ? ein / vol : 0;
  const klickrate = klicks / ein;
  const teile: string[] = [];

  if (anteil < 0.05) {
    teile.push(
      `Von der Nachfrage kommt fast nichts an (${(anteil * 100).toFixed(1)} % des vorhergesagten Volumens). Das ist eine Frage der Platzierung${position ? ` — im Mittel Position ${position.toFixed(1)}` : ""}, nicht des Textes.`,
    );
  } else if (klickrate < 0.02) {
    teile.push(
      `Die Seite wird gesehen, aber kaum geklickt (${(klickrate * 100).toFixed(1)} %). Hier hilft der Eintrag in der Trefferliste — Titel und Beschreibung —, nicht mehr Text auf der Seite.`,
    );
  } else {
    teile.push(
      `Kommt an: ${(anteil * 100).toFixed(1)} % der vorhergesagten Nachfrage als Einblendung, davon ${(klickrate * 100).toFixed(1)} % geklickt.`,
    );
  }

  // Der Zusatz, ohne den die Zahlen darüber zu einer falschen Maßnahme führen:
  // Bei fast nur anonymisierten Anfragen weiß niemand, wonach wirklich gesucht
  // wurde — dann ist Titelarbeit ein Schuss ins Dunkle.
  if (anteilSichtbar !== null && anteilSichtbar !== undefined && anteilSichtbar < 0.3) {
    teile.push(
      anteilSichtbar === 0
        ? "Google weist zu dieser Seite KEINE einzelne Anfrage aus — die Einblendungen stammen sämtlich aus Anfragen, die zu selten für die Statistik sind. Was hier wirkt, lässt sich deshalb nicht am Text ablesen."
        : `Nur ${(anteilSichtbar * 100).toFixed(0)} % der Einblendungen lassen sich einzelnen Anfragen zuordnen; der Rest ist zu selten für Googles Statistik. Die Anfragen unten sind damit ein Ausschnitt, kein Bild.`,
    );
  }

  return teile.join(" ");
}

export function ErfolgMessen({ thema }: { thema: string }) {
  const [laeuft, setLaeuft] = useState(false);
  const [ergebnis, setErgebnis] = useState<Ergebnis | null>(null);
  const [fehler, setFehler] = useState<string | null>(null);

  async function messen() {
    setLaeuft(true);
    setFehler(null);
    try {
      const res = await fetch(
        `/api/admin/artikelplan/erfolg?thema=${encodeURIComponent(thema)}`,
      );
      const daten = await res.json();
      if (!res.ok) setFehler(daten?.fehler ?? "Die Messung ist fehlgeschlagen.");
      else setErgebnis(daten as Ergebnis);
    } catch {
      setFehler("Die Messung war nicht erreichbar.");
    } finally {
      setLaeuft(false);
    }
  }

  const satz = ergebnis?.eingerichtet ? deutung(ergebnis) : null;

  return (
    <div style={{ marginTop: space.md }}>
      <button
        type="button"
        onClick={messen}
        disabled={laeuft}
        style={{
          font: "inherit",
          fontSize: v("--font-size-small"),
          color: laeuft ? v("--color-text-muted") : v("--color-accent"),
          background: "none",
          border: `1px solid ${v("--color-border-muted")}`,
          borderRadius: v("--radius-sm"),
          padding: pad("xs", "md"),
          cursor: laeuft ? "default" : "pointer",
        }}
      >
        {laeuft ? "misst …" : "Was ist daraus geworden?"}
      </button>

      {fehler && (
        <p
          style={{
            fontSize: v("--font-size-small"),
            color: v("--color-negative"),
            marginTop: space.sm,
          }}
        >
          {fehler}
        </p>
      )}

      {ergebnis && !ergebnis.eingerichtet && (
        <p
          style={{
            fontSize: v("--font-size-small"),
            color: v("--color-text-muted"),
            marginTop: space.sm,
            maxWidth: 620,
          }}
        >
          {ergebnis.hinweis}
        </p>
      )}

      {ergebnis?.eingerichtet && (
        <div style={{ marginTop: space.md, fontSize: v("--font-size-small") }}>
          <div style={{ display: "flex", gap: space.xxl, flexWrap: "wrap", marginBottom: space.sm }}>
            <div>
              <div style={{ fontSize: v("--font-size-h3"), lineHeight: 1.1 }}>
                {n(ergebnis.vorhergesagtesVolumen)}
              </div>
              <div style={{ color: v("--color-text-muted") }}>vorhergesagt (Suchen/Mo)</div>
            </div>
            <div>
              <div style={{ fontSize: v("--font-size-h3"), lineHeight: 1.1 }}>
                {n(ergebnis.einblendungen)}
              </div>
              <div style={{ color: v("--color-text-muted") }}>Einblendungen</div>
            </div>
            <div>
              <div style={{ fontSize: v("--font-size-h3"), lineHeight: 1.1 }}>{n(ergebnis.klicks)}</div>
              <div style={{ color: v("--color-text-muted") }}>Klicks</div>
            </div>
            <div>
              <div style={{ fontSize: v("--font-size-h3"), lineHeight: 1.1 }}>
                {n(ergebnis.position, 1)}
              </div>
              <div style={{ color: v("--color-text-muted") }}>mittlere Position</div>
            </div>
          </div>

          {satz && (
            <p style={{ color: v("--color-text-secondary"), maxWidth: 700, marginBottom: space.sm }}>
              {satz}
            </p>
          )}

          {ergebnis.zeitraum && (
            <p style={{ color: v("--color-text-muted"), marginBottom: space.sm }}>
              {ergebnis.zeitraum.tage} Tage bis{" "}
              {new Date(ergebnis.zeitraum.ende).toLocaleDateString("de-DE")} · das Volumen ist ein
              Monatswert, die Zahlen daneben sind gemessen
            </p>
          )}

          {ergebnis.anfragen && ergebnis.anfragen.length === 0 && (
            <p style={{ color: v("--color-text-muted") }}>
              Keine einzelne Anfrage ausgewiesen — siehe oben.
            </p>
          )}

          {ergebnis.anfragen && ergebnis.anfragen.length > 0 && (
            <>
              <p style={{ color: v("--color-text-muted"), marginBottom: space.xs }}>
                Wonach wirklich gesucht wurde:
              </p>
              <table style={{ borderCollapse: "collapse" }}>
                <thead>
                  <tr style={{ color: v("--color-text-muted"), textAlign: "left" }}>
                    <th style={{ paddingRight: space.lg, fontWeight: 400 }}>Anfrage</th>
                    <th style={{ paddingRight: space.lg, fontWeight: 400 }}>Einbl.</th>
                    <th style={{ paddingRight: space.lg, fontWeight: 400 }}>Klicks</th>
                    <th style={{ fontWeight: 400 }}>Position</th>
                  </tr>
                </thead>
                <tbody>
                  {ergebnis.anfragen.map((a) => (
                    <tr key={a.anfrage}>
                      <td style={{ paddingRight: space.lg }}>{a.anfrage}</td>
                      <td style={{ paddingRight: space.lg }}>{n(a.einblendungen)}</td>
                      <td style={{ paddingRight: space.lg }}>{n(a.klicks)}</td>
                      <td>{n(a.position, 1)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </>
          )}
        </div>
      )}
    </div>
  );
}
