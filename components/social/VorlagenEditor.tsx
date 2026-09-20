// Kein "use client": Der Editor wird ausschließlich aus dem Story-Tisch heraus
// gerendert, der die Grenze schon gezogen hat. Als eigener Einstiegspunkt
// müsste jede Eigenschaft über die Grenze serialisierbar sein — der Rückkanal
// für den Entwurf ist eine Funktion und wäre es nicht.

import { useState } from "react";
import { platzhalterIn } from "../../lib/social-vorlage";
import { v, space, pad } from "../../lib/theme";
import type { PlatzhalterInfo } from "../../lib/social-vorlage";

// Textvorlage bearbeiten, ohne an eine Zahl zu kommen.
//
// Im Feld stehen Namen statt Werte. Was daraus wird, steht NICHT hier daneben,
// sondern oben in der Feed-Vorschau, zusammen mit dem Bild — Text und Bild
// tragen einen Beitrag gemeinsam, und wer die Formulierung getrennt vom Bild
// beurteilt, beurteilt eine Ansicht, die es im Feed nicht gibt. Eine zweite
// Textvorschau hier wäre dieselbe Zeile ein zweites Mal.
//
// Ein unbekannter Platzhalter wird SOFORT gemeldet, nicht erst beim Speichern:
// Wer sich vertippt, sieht es an der Stelle, an der er tippt. Ohne das stünde
// später „{stadtquote}" im Beitrag, und gemerkt hätte es niemand.

export function VorlagenEditor({
  postId,
  entwurf,
  onEntwurf,
  platzhalter,
}: {
  postId: string;
  /** Was gerade im Feld steht. Liegt oben, damit die Vorschau mitläuft. */
  entwurf: string;
  onEntwurf: (wert: string) => void;
  platzhalter: PlatzhalterInfo[];
}) {
  const [status, setStatus] = useState<string | null>(null);
  const [laeuft, setLaeuft] = useState(false);

  const werte = Object.fromEntries(platzhalter.map((p) => [p.name, p.wert]));
  const unbekannt = platzhalterIn(entwurf).filter((p) => !(p in werte));

  /**
   * Nur das Zurücksetzen liegt noch hier. GESPEICHERT wird am Tisch, in einem
   * Zug mit Farbschema und Bildform: Zwei Speichern-Knöpfe für einen Beitrag
   * hätten zwei Zustände von „gespeichert" bedeutet, und der eine hätte den
   * anderen nicht gekannt.
   */
  async function zuruecksetzen() {
    setLaeuft(true);
    setStatus(null);
    try {
      const res = await fetch("/api/social/fassung", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ postId, zuruecksetzen: true }),
      });
      const j = (await res.json()) as { error?: string };
      setStatus(res.ok ? "Zurückgesetzt. Seite neu laden." : (j.error ?? "Fehlgeschlagen"));
    } catch (e) {
      setStatus((e as Error).message);
    } finally {
      setLaeuft(false);
    }
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: space.md }}>
      <div>
        <label
          style={{
            display: "block",
            fontSize: v("--font-size-caption"),
            color: v("--color-text-muted"),
            marginBottom: space.xs,
          }}
        >
          Vorlage — Zahlen stehen als {"{name}"} und lassen sich nicht überschreiben
        </label>
        <textarea
          value={entwurf}
          onChange={(e) => onEntwurf(e.target.value)}
          rows={14}
          style={{
            width: "100%",
            fontFamily: v("--font-mono"),
            fontSize: v("--font-size-small"),
            lineHeight: 1.5,
            padding: pad("md", "md"),
            borderRadius: v("--radius-sm"),
            border: `1px solid ${unbekannt.length ? v("--color-negative") : v("--color-border")}`,
            background: v("--color-bg"),
            color: v("--color-text-primary"),
            resize: "vertical",
          }}
        />

        {unbekannt.length > 0 && (
          <p style={{ color: v("--color-negative"), fontSize: v("--font-size-small"), marginTop: space.xs }}>
            Unbekannt: {unbekannt.map((p) => `{${p}}`).join(", ")} — so gespeichert stünde die Klammer im Beitrag.
          </p>
        )}

        <div style={{ display: "flex", gap: space.sm, marginTop: space.sm, alignItems: "center", flexWrap: "wrap" }}>
          <button
            type="button"
            disabled={laeuft}
            onClick={zuruecksetzen}
            style={{
              padding: pad("sm", "lg"),
              borderRadius: v("--radius-sm"),
              border: `1px solid ${v("--color-border")}`,
              background: "transparent",
              color: v("--color-text-secondary"),
              cursor: "pointer",
              fontSize: v("--font-size-small"),
            }}
          >
            Text auf eingebaute Fassung zurücksetzen
          </button>
          {status && (
            <span style={{ fontSize: v("--font-size-small"), color: v("--color-text-secondary") }}>{status}</span>
          )}
        </div>
      </div>

      <details>
        <summary style={{ cursor: "pointer", fontSize: v("--font-size-caption"), color: v("--color-text-muted") }}>
          Verfügbare Werte ({platzhalter.length})
        </summary>
        <table style={{ fontSize: v("--font-size-caption"), marginTop: space.xs, borderCollapse: "collapse" }}>
          <tbody>
            {platzhalter.map((p) => (
              <tr key={p.name}>
                <td style={{ fontFamily: v("--font-mono"), paddingRight: space.sm, verticalAlign: "top" }}>
                  {"{" + p.name + "}"}
                </td>
                <td style={{ paddingRight: space.sm, verticalAlign: "top" }}>{p.wert}</td>
                <td style={{ color: v("--color-text-muted"), verticalAlign: "top" }}>{p.erklaerung}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </details>
    </div>
  );
}
