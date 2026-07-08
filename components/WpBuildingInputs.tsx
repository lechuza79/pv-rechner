"use client";
// Gebäudeabfrage für den Wärmepumpen-Stromverbrauch (Wohnfläche, Dämmzustand,
// Heizsystem). Geteilt zwischen PV-Rechner und Empfehlungs-Flow, damit beide
// dieselbe Abfrage + dasselbe Aussehen haben. Erscheint jeweils, wenn die WP
// aktiv ist. Der WP-Jahresstrom (wpKwh) wird vom Aufrufer berechnet und nur für
// den Live-Hinweis hereingereicht.
import { INSULATION_BESTAND, HEIZSYSTEM } from "../lib/constants";
import { v } from "../lib/theme";
import PresetNumberInput from "./PresetNumberInput";

const WP_M2_PRESETS = [100, 140, 180];
const INSULATION_SHORT = ["Unsaniert", "Teilsaniert", "Saniert"];
const HEIZSYSTEM_SHORT: Record<string, string> = { fbh: "Fußboden", hk_neu: "Heizkörper", hk_alt: "Alte HK" };

export type Heizsystem = "fbh" | "hk_neu" | "hk_alt";

export default function WpBuildingInputs({
  wohnflaeche,
  insulationIdx,
  heizsystem,
  wpKwh,
  onWohnflaeche,
  onInsulation,
  onHeizsystem,
}: {
  wohnflaeche: number;
  insulationIdx: number;
  heizsystem: Heizsystem;
  wpKwh: number;
  onWohnflaeche: (n: number) => void;
  onInsulation: (i: number) => void;
  onHeizsystem: (h: Heizsystem) => void;
}) {
  return (
    <div style={{ marginBottom: 18, marginTop: -10 }}>
      <div style={{ fontSize: 11, color: v('--color-text-muted'), marginBottom: 12, lineHeight: 1.5 }}>
        Den Heizstrom der Wärmepumpe rechnen wir aus deinem Gebäude — genau wie im Wärmepumpen-Rechner. Dafür brauchen wir drei Angaben.
      </div>
      <div style={{ fontSize: 12, fontWeight: 600, color: v('--color-text-secondary'), marginBottom: 6 }}>Wohnfläche ca.</div>
      <div style={{ display: "flex", gap: 6, alignItems: "center", marginBottom: 14 }}>
        {WP_M2_PRESETS.map(m2 => (
          <button key={m2} onClick={() => onWohnflaeche(m2)} style={{
            padding: "7px 10px", borderRadius: v('--radius-sm'), fontSize: 12, fontWeight: 600, cursor: "pointer",
            background: wohnflaeche === m2 ? v('--color-accent-dim') : v('--color-bg-muted'),
            border: wohnflaeche === m2 ? `1.5px solid ${v('--color-accent')}` : `1.5px solid ${v('--color-border')}`,
            color: wohnflaeche === m2 ? v('--color-accent') : v('--color-text-muted'),
          }}>{m2} m²</button>
        ))}
        <PresetNumberInput value={wohnflaeche} presets={WP_M2_PRESETS} min={20} max={1000} unit="m²" onCommit={onWohnflaeche} />
      </div>
      <div style={{ fontSize: 12, fontWeight: 600, color: v('--color-text-secondary'), marginBottom: 6 }}>Dämmzustand</div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 6, marginBottom: 14 }}>
        {INSULATION_BESTAND.map((_, i) => (
          <button key={i} onClick={() => onInsulation(i)} style={{
            padding: "8px 4px", borderRadius: v('--radius-sm'), fontSize: 12, fontWeight: 600, cursor: "pointer", textAlign: "center",
            background: insulationIdx === i ? v('--color-accent-dim') : v('--color-bg-muted'),
            border: insulationIdx === i ? `1.5px solid ${v('--color-accent')}` : `1.5px solid ${v('--color-border')}`,
            color: insulationIdx === i ? v('--color-accent') : v('--color-text-muted'),
          }}>{INSULATION_SHORT[i]}</button>
        ))}
      </div>
      <div style={{ fontSize: 12, fontWeight: 600, color: v('--color-text-secondary'), marginBottom: 6 }}>Heizsystem</div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 6 }}>
        {HEIZSYSTEM.map(h => (
          <button key={h.id} onClick={() => onHeizsystem(h.id as Heizsystem)} style={{
            padding: "8px 4px", borderRadius: v('--radius-sm'), fontSize: 12, fontWeight: 600, cursor: "pointer", textAlign: "center",
            background: heizsystem === h.id ? v('--color-accent-dim') : v('--color-bg-muted'),
            border: heizsystem === h.id ? `1.5px solid ${v('--color-accent')}` : `1.5px solid ${v('--color-border')}`,
            color: heizsystem === h.id ? v('--color-accent') : v('--color-text-muted'),
          }}>{HEIZSYSTEM_SHORT[h.id]}</button>
        ))}
      </div>
      <div style={{ fontSize: 11, color: v('--color-text-faint'), marginTop: 8, lineHeight: 1.5 }}>
        Daraus ergeben sich rund {wpKwh.toLocaleString("de-DE")} kWh Heizstrom pro Jahr.
      </div>
    </div>
  );
}
