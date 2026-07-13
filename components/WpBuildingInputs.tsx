"use client";
// Gebäudeabfrage für den Wärmepumpen-Stromverbrauch (Wohnfläche, Dämmzustand,
// Heizsystem). Geteilt zwischen PV-Rechner und Empfehlungs-Flow, damit beide
// dieselbe Abfrage + dasselbe Aussehen haben. Erscheint jeweils, wenn die WP
// aktiv ist. Der WP-Jahresstrom (wpKwh) wird vom Aufrufer berechnet und nur für
// den Live-Hinweis hereingereicht.
import { INSULATION_BESTAND, HEIZSYSTEM, HAUSTYP_WP } from "../lib/constants";
import { v } from "../lib/theme";
import PresetNumberInput from "./PresetNumberInput";

const WP_M2_PRESETS = [100, 140, 180];
const INSULATION_SHORT = ["Unsaniert", "Teilsaniert", "Saniert"];
const HEIZSYSTEM_SHORT: Record<string, string> = { fbh: "Fußboden", hk_neu: "Heizkörper", hk_alt: "Alte HK" };
const HAUSTYP_SHORT = ["Freistehend", "Doppelhaus", "Reihenend", "Reihenmitte"];

export type Heizsystem = "fbh" | "hk_neu" | "hk_alt";

export default function WpBuildingInputs({
  wohnflaeche,
  insulationIdx,
  heizsystem,
  haustypIdx,
  wpKwh,
  onWohnflaeche,
  onInsulation,
  onHeizsystem,
  onHaustyp,
}: {
  wohnflaeche: number;
  insulationIdx: number;
  heizsystem: Heizsystem;
  /** Nur der PV-Rechner reicht den Haustyp herein; der Empfehlungs-Flow fragt
   *  ihn bereits fürs Dach ab und leitet den Faktor selbst ab. Fehlt der Prop,
   *  wird die Haustyp-Auswahl nicht gezeigt (keine Doppelabfrage). */
  haustypIdx?: number;
  wpKwh: number;
  onWohnflaeche: (n: number) => void;
  onInsulation: (i: number) => void;
  onHeizsystem: (h: Heizsystem) => void;
  onHaustyp?: (i: number) => void;
}) {
  const showHaustyp = haustypIdx !== undefined && onHaustyp !== undefined;
  return (
    <div style={{ marginBottom: 18, marginTop: -10 }}>
      <div style={{ fontSize: 11, color: v('--color-text-muted'), marginBottom: 12, lineHeight: 1.5 }}>
        Den Heizstrom der Wärmepumpe rechnen wir aus deinem Gebäude — genau wie im Wärmepumpen-Rechner. Dafür brauchen wir ein paar Angaben.
      </div>
      {showHaustyp && (
        <>
          <div style={{ fontSize: 12, fontWeight: 600, color: v('--color-text-secondary'), marginBottom: 6 }}>Haustyp</div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6, marginBottom: 14 }}>
            {HAUSTYP_WP.map((h, i) => (
              <button key={h.id} onClick={() => onHaustyp!(i)} style={{
                padding: "8px 4px", borderRadius: v('--radius-sm'), fontSize: 12, fontWeight: 600, cursor: "pointer", textAlign: "center",
                background: haustypIdx === i ? v('--color-accent-dim') : v('--color-bg-muted'),
                border: haustypIdx === i ? `1.5px solid ${v('--color-accent')}` : `1.5px solid ${v('--color-border')}`,
                color: haustypIdx === i ? v('--color-accent') : v('--color-text-muted'),
              }}>{HAUSTYP_SHORT[i]}</button>
            ))}
          </div>
        </>
      )}
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
