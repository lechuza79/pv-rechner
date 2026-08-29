import { v, space, pad, type TokenName } from "../../lib/theme";
import type { KalenderWoche } from "../../lib/social-kalender";

// Die Wochenübersicht.
//
// Server-Komponente ohne Zustand: Sie zeigt, was ohnehin berechnet ist. Ein
// Kalender zum Hineinziehen wäre etwas anderes — er bräuchte gespeicherte
// Termine, und genau die hat dieses Projekt bewusst nicht (siehe
// lib/social-kalender.ts).

const FARBE: Record<string, { rand: TokenName; text: TokenName }> = {
  gesendet: { rand: "--color-positive-text", text: "--color-positive-text" },
  bereit: { rand: "--color-accent", text: "--color-accent" },
  leer: { rand: "--color-border", text: "--color-text-muted" },
  "vergangen-leer": { rand: "--color-border-muted", text: "--color-text-faint" },
};

export function Wochenplan({ wochen, heuteIso }: { wochen: KalenderWoche[]; heuteIso: string }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: space.xl }}>
      {wochen.map((w) => (
        <div key={w.beginnIso}>
          <div
            style={{
              fontSize: v("--font-size-small"),
              fontWeight: 600,
              marginBottom: space.sm,
              color: w.name === "Diese Woche" ? v("--color-accent") : v("--color-text-secondary"),
            }}
          >
            {w.name}
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: space.sm }}>
            {w.plaetze.map((p) => {
              const f = FARBE[p.zustand];
              const heute = p.iso === heuteIso;
              return (
                <div
                  key={p.iso}
                  style={{
                    border: `1px solid ${v(f.rand)}`,
                    borderRadius: v("--radius-sm"),
                    padding: pad("sm", "md"),
                    background: heute ? v("--color-bg-muted") : "transparent",
                    opacity: p.zustand === "vergangen-leer" ? 0.55 : 1,
                  }}
                >
                  <div
                    style={{
                      fontSize: v("--font-size-caption"),
                      color: v("--color-text-muted"),
                      display: "flex",
                      justifyContent: "space-between",
                      gap: space.xs,
                    }}
                  >
                    <span>
                      {p.tag} · {p.art}
                    </span>
                    <span>
                      {new Date(`${p.iso}T12:00:00Z`).toLocaleDateString("de-DE", {
                        day: "numeric",
                        month: "numeric",
                        timeZone: "UTC",
                      })}
                    </span>
                  </div>
                  <div style={{ fontSize: v("--font-size-small"), color: v(f.text), marginTop: space.xxs }}>
                    {p.zustand === "gesendet" && `✓ ${p.titel}`}
                    {p.zustand === "bereit" && p.post.titel}
                    {p.zustand === "leer" && p.grund}
                    {p.zustand === "vergangen-leer" && "nichts gesendet"}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
