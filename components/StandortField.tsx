"use client";
import { v } from "../lib/theme";
import { IconArrowRight, IconCheck } from "./Icons";

// Kompaktes „Standort"-Feld für die Ergebnisseite: PLZ eingeben → standortgenauer
// Ertrag (PVGIS). Geteilt zwischen PV-Rechner (ResultHeroCard) und
// Balkonkraftwerk-Rechner, damit die nachträgliche PLZ-Eingabe überall gleich ist.
interface StandortFieldProps {
  plz: string;
  onPlzChange: (cleaned: string) => void; // erhält die bereits auf Ziffern reduzierte PLZ
  loading: boolean;
  confirmed: boolean;                      // wurde ein Standort übernommen?
  approximate?: boolean;                   // true = regionaler Näherungswert (~) statt exaktem PVGIS
  onSubmit: () => void;
  label?: string;
}

export default function StandortField({
  plz, onPlzChange, loading, confirmed, approximate = false, onSubmit, label = "Standort",
}: StandortFieldProps) {
  return (
    // flexWrap/rowGap + flexShrink: auf schmalen Schirmen rutscht das Feld lieber in
    // die naechste Zeile, als gequetscht zu werden (Fix aus dem PV-Rechner, beim
    // Zusammenfuehren der beiden PLZ-Felder hierher uebernommen).
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", rowGap: 4 }}>
      <span style={{ color: v('--color-text-secondary') }}>{label}</span>
      <form onSubmit={e => { e.preventDefault(); onSubmit(); }} style={{ display: "inline-flex", alignItems: "center", gap: 4, flexShrink: 0 }}>
        <input
          value={plz}
          placeholder="PLZ"
          aria-label="Postleitzahl eingeben"
          inputMode="numeric"
          maxLength={5}
          className={!confirmed && !loading ? "sc-plz-pulse" : undefined}
          onChange={e => onPlzChange(e.target.value.replace(/\D/g, "").slice(0, 5))}
          style={{
            // fontSize >= 16px prevents iOS Safari auto-zoom on focus. Width must fit
            // five monospace digits at that size — 56px clipped the first digit.
            width: 68, textAlign: "center", fontSize: 16, fontWeight: 700,
            fontFamily: v('--font-mono'),
            color: plz.length === 5 ? v('--color-accent') : v('--color-text-secondary'),
            background: plz.length === 5 ? v('--color-accent-dim') : v('--color-bg'),
            border: plz.length === 5 ? `1px solid ${v('--color-border-accent')}` : `1px dashed ${v('--color-text-faint')}`,
            borderRadius: v('--radius-sm'), padding: "3px 4px", outline: "none",
          }}
        />
        {plz.length === 5 && !loading && !confirmed && (
          <button type="submit" aria-label="Standort übernehmen" style={{
            padding: "3px 6px", fontSize: 11, fontWeight: 700, lineHeight: 1,
            background: v('--color-accent'), color: v('--color-text-on-accent'),
            border: "none", borderRadius: v('--radius-sm'), cursor: "pointer",
          }}><IconArrowRight size={12} color={v('--color-text-on-accent')} /></button>
        )}
        {loading && <span style={{ color: v('--color-accent'), fontSize: 10 }}>…</span>}
        {confirmed && <span style={{ fontSize: 10, color: v('--color-text-faint') }}>{approximate ? "~" : <IconCheck size={10} />}</span>}
      </form>
    </div>
  );
}
