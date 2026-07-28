"use client";

import { useEffect, useState } from "react";
import { v, space, pad } from "../../lib/theme";
import Modal from "../Modal";

// Platzierungen der Gemeinde — der Beleg für das, was im Outreach-Anschreiben
// steht. Erster Platz wird hervorgehoben, darunter alle weiteren, und die
// vollständige Rangliste steckt hinter einem Klick.
//
// Client-geladen: Die Rangdaten kosten ~1,7 s (11.000 Gemeinden), das gehört
// nicht in den Server-Render einer Atlas-Seite. Muster wie GemeindePotential.

type Platzierung = {
  kategorie: string;
  thema: string;
  bestleistung: string;
  ebene: string;
  wo: string;
  platz: number;
  von: number;
  wert: string;
};

type Daten = {
  name: string;
  beste: Platzierung | null;
  alle: Platzierung[];
  teaser: { platz: number; name: string; wert: string; selbst: boolean }[];
  teaserAbgesetzt: boolean;
  tabelle: { platz: number; name: string; wert: string; selbst: boolean }[];
  tabelleGekuerzt: boolean;
};

export default function GemeindePlatzierungen({ regionId }: { regionId: string }) {
  const [daten, setDaten] = useState<Daten | null>(null);
  const [fehler, setFehler] = useState(false);
  const [offen, setOffen] = useState(false);

  useEffect(() => {
    let aktiv = true;
    fetch(`/api/atlas/platzierungen?region=${regionId}`)
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(String(r.status)))))
      .then((j) => aktiv && setDaten(j))
      .catch(() => aktiv && setFehler(true));
    return () => {
      aktiv = false;
    };
  }, [regionId]);

  // Ohne Platzierung keine Überschrift — eine leere Sektion ist schlechter als
  // gar keine.
  if (fehler || (daten && !daten.beste)) return null;

  return (
    <section style={{ marginTop: space.xl }}>
      <h2 style={{ fontSize: 20, fontWeight: 800, color: v("--color-text-primary"), marginBottom: space.xs }}>
        Platzierungen von {daten?.name ?? "dieser Gemeinde"}
      </h2>
      <p style={{ fontSize: 14, color: v("--color-text-secondary"), marginBottom: space.md }}>
        Wo die Gemeinde im Vergleich vorn liegt — gerechnet aus dem Marktstammdatenregister.
      </p>

      {!daten ? (
        <div style={{ fontSize: 14, color: v("--color-text-muted"), padding: pad("md", "md") }}>Platzierungen werden geladen …</div>
      ) : (
        <>
          {/* Erster Platz: hervorgehoben, mit Krone. */}
          {daten.beste && daten.beste.platz === 1 && (
            <div
              style={{
                background: v("--color-accent-dim"),
                border: `1px solid ${v("--color-accent")}`,
                borderRadius: v("--radius-md"),
                padding: pad("md", "lg"),
                marginBottom: space.md,
              }}
            >
              <div style={{ fontSize: 15, fontWeight: 800, color: v("--color-accent-dark") }}>
                <span aria-hidden style={{ marginRight: 6 }}>
                  👑
                </span>
                Platz 1 von {daten.beste.von} Gemeinden {daten.beste.wo}
              </div>
              <div style={{ fontSize: 14, color: v("--color-text-secondary"), marginTop: 2 }}>
                {daten.name} hat {daten.beste.bestleistung} {daten.beste.wo} — {daten.beste.wert}.
              </div>
            </div>
          )}

          {/* Teaser der Rangliste zur stärksten Kategorie. */}
          {daten.teaser.length > 0 && (
            <div style={{ border: `1px solid ${v("--color-border")}`, borderRadius: v("--radius-md"), overflow: "hidden" }}>
              <div style={{ fontSize: 12, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em", color: v("--color-text-muted"), padding: pad("sm", "md"), background: v("--color-bg-muted") }}>
                {daten.beste?.thema} · {daten.beste?.wo}
              </div>
              {daten.teaser.map((r, i) => (
                <div
                  key={r.platz}
                  data-luecke={daten.teaserAbgesetzt && i === daten.teaser.length - 1 ? "1" : undefined}
                  style={{
                    display: "grid",
                    gridTemplateColumns: "auto 1fr auto",
                    gap: space.md,
                    alignItems: "baseline",
                    padding: pad("sm", "md"),
                    borderTop:
                      daten.teaserAbgesetzt && i === daten.teaser.length - 1
                        ? `2px dashed ${v("--color-border")}`
                        : `1px solid ${v("--color-border")}`,
                    background: r.selbst ? v("--color-accent-dim") : "transparent",
                    fontWeight: r.selbst ? 700 : 400,
                    fontSize: 14,
                  }}
                >
                  <span style={{ fontFamily: v("--font-mono"), color: v("--color-text-muted") }}>{r.platz}.</span>
                  <span style={{ minWidth: 0 }}>
                    {r.platz === 1 && (
                      <span aria-hidden style={{ marginRight: 4 }}>
                        👑
                      </span>
                    )}
                    {r.name}
                  </span>
                  <span style={{ fontFamily: v("--font-mono"), color: v("--color-accent") }}>{r.wert}</span>
                </div>
              ))}
              <button
                onClick={() => setOffen(true)}
                style={{
                  width: "100%",
                  textAlign: "left",
                  padding: pad("sm", "md"),
                  borderTop: `1px solid ${v("--color-border")}`,
                  background: "transparent",
                  border: "none",
                  color: v("--color-accent"),
                  fontWeight: 600,
                  fontSize: 14,
                  cursor: "pointer",
                  fontFamily: v("--font-text"),
                }}
              >
                Vollständige Rangliste ansehen →
              </button>
            </div>
          )}

          {/* Alle weiteren Platzierungen der Gemeinde. */}
          {daten.alle.length > 1 && (
            <div style={{ marginTop: space.md }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: v("--color-text-secondary"), marginBottom: space.xs }}>
                Weitere Platzierungen
              </div>
              <ul style={{ margin: 0, paddingLeft: 18, fontSize: 14, color: v("--color-text-secondary"), lineHeight: 1.7 }}>
                {daten.alle.slice(1, 7).map((p) => (
                  <li key={`${p.kategorie}-${p.ebene}`}>
                    Platz {p.platz} von {p.von} {p.wo} bei {p.thema} ({p.wert})
                  </li>
                ))}
              </ul>
            </div>
          )}

          <Modal
            open={offen}
            onClose={() => setOffen(false)}
            title={`${daten.beste?.thema ?? "Rangliste"} — ${daten.beste?.wo ?? ""}`}
            intro="Alle Gemeinden der Vergleichsgruppe, aus dem Marktstammdatenregister."
            maxWidth={560}
          >
            <div style={{ display: "flex", flexDirection: "column" }}>
              {daten.tabelle.map((r) => (
                <div
                  key={r.platz}
                  style={{
                    display: "grid",
                    gridTemplateColumns: "auto 1fr auto",
                    gap: space.md,
                    alignItems: "baseline",
                    padding: pad("xs", "sm"),
                    borderBottom: `1px solid ${v("--color-border")}`,
                    background: r.selbst ? v("--color-accent-dim") : "transparent",
                    fontWeight: r.selbst ? 700 : 400,
                    fontSize: 14,
                  }}
                >
                  <span style={{ fontFamily: v("--font-mono"), color: v("--color-text-muted") }}>{r.platz}.</span>
                  <span style={{ minWidth: 0 }}>
                    {r.platz === 1 && (
                      <span aria-hidden style={{ marginRight: 4 }}>
                        👑
                      </span>
                    )}
                    {r.name}
                  </span>
                  <span style={{ fontFamily: v("--font-mono"), color: v("--color-accent") }}>{r.wert}</span>
                </div>
              ))}
              {daten.tabelleGekuerzt && (
                <div style={{ fontSize: 12, color: v("--color-text-muted"), padding: pad("sm", "sm") }}>
                  Gekürzt auf die ersten {daten.tabelle.length} Gemeinden.
                </div>
              )}
            </div>
          </Modal>
        </>
      )}
    </section>
  );
}
