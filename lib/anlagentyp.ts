// Anlagentyp-Segmente (private Dächer / Gewerbe / Freifläche) für das Donut-
// Widget — geteilt zwischen Server (Förder-Seite, Embed) und Client (Widget).
// Bewusst kein "use client": eine Server-Komponente kann sonst die Funktion
// nicht aufrufen (Named Exports aus Client-Modulen werden zu Client-Proxys).

export type AnlagentypSegment = { key: string; label: string; color: string; kwp: number };

// Label + Farbe je Anlagentyp (Blau-Ramp, fest je Typ).
const ANLAGENTYP_META: Record<string, { key: string; label: string; color: string }> = {
  privat_dach: { key: "privat", label: "Private Dächer", color: "#1365EA" },
  gewerbe_dach: { key: "gewerbe", label: "Gewerbe-Dächer", color: "#6A9EF2" },
  freiflaeche: { key: "frei", label: "Freifläche", color: "#073C93" },
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
