"use client";

import { useState } from "react";
import { fuelle, platzhalterIn } from "../../lib/social-vorlage";
import { v, space, pad } from "../../lib/theme";
import type { PlatzhalterInfo } from "../../lib/social-vorlage";

// Textvorlage bearbeiten, ohne an eine Zahl zu kommen.
//
// Im Feld stehen Namen statt Werte. Die Vorschau daneben zeigt, was daraus
// wird — mit derselben Funktion, die später den Beitrag baut, damit hier nichts
// anderes entsteht als dort.
//
// Ein unbekannter Platzhalter wird SOFORT gemeldet, nicht erst beim Speichern:
// Wer sich vertippt, sieht es an der Stelle, an der er tippt. Ohne das stünde
// später „{stadtquote}" im Beitrag, und gemerkt hätte es niemand.

export function VorlagenEditor({
  postId,
  vorlage,
  platzhalter,
}: {
  postId: string;
  vorlage: string;
  platzhalter: PlatzhalterInfo[];
}) {
  const [text, setText] = useState(vorlage);
  const [status, setStatus] = useState<string | null>(null);
  const [laeuft, setLaeuft] = useState(false);

  const werte = Object.fromEntries(platzhalter.map((p) => [p.name, p.wert]));
  const unbekannt = platzhalterIn(text).filter((p) => !(p in werte));
  const geaendert = text !== vorlage;

  async function speichern(zuruecksetzen = false) {
    setLaeuft(true);
    setStatus(null);
    try {
      const res = await fetch("/api/social/vorlage", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ postId, vorlage: zuruecksetzen ? "" : text }),
      });
      const j = (await res.json()) as { error?: string; ungenutzt?: string[] };
      if (!res.ok) {
        setStatus(j.error ?? "Fehlgeschlagen");
      } else {
        setStatus(
          zuruecksetzen
            ? "Zurückgesetzt. Seite neu laden."
            : j.ungenutzt?.length
              ? `Gespeichert. Nicht mehr im Text: ${j.ungenutzt.map((p) => `{${p}}`).join(", ")}`
              : "Gespeichert. Die Prüfung muss neu erteilt werden.",
        );
      }
    } catch (e) {
      setStatus((e as Error).message);
    } finally {
      setLaeuft(false);
    }
  }

  return (
    <div style={{ marginTop: space.lg }}>
      <div style={{ display: "flex", gap: space.xl, flexWrap: "wrap", alignItems: "flex-start" }}>
        <div style={{ flex: "1 1 420px", minWidth: 300 }}>
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
            value={text}
            onChange={(e) => setText(e.target.value)}
            rows={14}
            style={{
              width: "100%",
              fontFamily: v("--font-mono"),
              fontSize: 13,
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
              disabled={laeuft || !geaendert || unbekannt.length > 0}
              onClick={() => speichern(false)}
              style={{
                padding: pad("sm", "lg"),
                borderRadius: v("--radius-sm"),
                border: "none",
                background: geaendert && !unbekannt.length ? v("--color-accent") : v("--color-border"),
                color: geaendert && !unbekannt.length ? v("--color-text-on-accent") : v("--color-text-muted"),
                cursor: geaendert && !unbekannt.length ? "pointer" : "default",
                fontSize: v("--font-size-small"),
              }}
            >
              {laeuft ? "…" : "Speichern"}
            </button>
            <button
              type="button"
              disabled={laeuft}
              onClick={() => speichern(true)}
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
              Auf eingebaute Fassung zurücksetzen
            </button>
            {status && (
              <span style={{ fontSize: v("--font-size-small"), color: v("--color-text-secondary") }}>{status}</span>
            )}
          </div>
        </div>

        <div style={{ flex: "1 1 320px", minWidth: 280 }}>
          <div style={{ fontSize: v("--font-size-caption"), color: v("--color-text-muted"), marginBottom: space.xs }}>
            So wird es gefüllt
          </div>
          <div
            style={{
              background: v("--color-bg-muted"),
              borderRadius: v("--radius-sm"),
              padding: pad("md", "md"),
              whiteSpace: "pre-wrap",
              fontSize: v("--font-size-small"),
              lineHeight: 1.5,
              maxHeight: 300,
              overflowY: "auto",
            }}
          >
            {fuelle(text, werte)}
          </div>

          <details style={{ marginTop: space.sm }}>
            <summary
              style={{ cursor: "pointer", fontSize: v("--font-size-caption"), color: v("--color-text-muted") }}
            >
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
      </div>
    </div>
  );
}
