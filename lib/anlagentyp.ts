// Anlagentyp-Segmente (private Dächer / Gewerbe / Freifläche) für das Donut-
// Widget — geteilt zwischen Server (Förder-Seite, Embed) und Client (Widget).
// Bewusst kein "use client": eine Server-Komponente kann sonst die Funktion
// nicht aufrufen (Named Exports aus Client-Modulen werden zu Client-Proxys).

import { tokens } from "./theme";

export type AnlagentypSegment = { key: string; label: string; color: string; kwp: number };

// Label + Farbe je Anlagentyp (Akzent-Rampe, fest je Typ) — AUS DEN TOKENS.
// Die drei Werte standen als Hex hier und blieben blau, als die Rampe am
// 20.09.2026 auf Grün ging; als Hex statt v(…), weil sie als `fill`-Attribut
// ins SVG gehen und durch den Bild-Export laufen.
const ANLAGENTYP_META: Record<string, { key: string; label: string; color: string }> = {
  privat_dach: { key: "privat", label: "Private Dächer", color: tokens["--color-accent"] },
  gewerbe_dach: { key: "gewerbe", label: "Gewerbe-Dächer", color: tokens["--color-accent-light"] },
  freiflaeche: { key: "frei", label: "Freifläche", color: tokens["--color-accent-dark"] },
};

/** MaStR by_segment (kWp je Segment) → Donut-Segmente mit Label/Farbe. */
export function buildAnlagentypSegments(bySegment: { segment: string; kwp: number }[]): AnlagentypSegment[] {
  return bySegment
    .map((s) => {
      const m = ANLAGENTYP_META[s.segment];
      return m ? { ...m, kwp: s.kwp } : null;
    })
    .filter((x): x is AnlagentypSegment => x != null);
}
