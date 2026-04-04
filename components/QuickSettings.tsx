"use client";
import { useState } from "react";
import { IconCheck } from "./Icons";
import { v } from "../lib/theme";
import { SPEICHER, EA_KM_PRESETS } from "../lib/constants";

interface QuickSettingsProps {
  wp: string;
  setWp: (v: string) => void;
  ea: string;
  setEa: (v: string) => void;
  eaKm: number;
  setEaKm: (v: number) => void;
  speicher: number;
  setSpeicher: (v: number) => void;
  spKwh: number;
  oKosten: number | null;
  setOKosten: (v: number) => void;
  setOEv: (v: null) => void;
}

export default function QuickSettings({
  wp, setWp, ea, setEa, eaKm, setEaKm,
  speicher, setSpeicher, spKwh, oKosten, setOKosten, setOEv,
}: QuickSettingsProps) {
  const [spKostenPrompt, setSpKostenPrompt] = useState(false);
  const [spKostenDraft, setSpKostenDraft] = useState("");

  const handleSpeicherToggle = () => {
    if (oKosten !== null) {
      const defaultSpKosten = speicher === 0
        ? (2000 + SPEICHER[2].kwh * 650)
        : (2000 + spKwh * 650);
      setSpKostenDraft(String(defaultSpKosten));
      setSpKostenPrompt(true);
    } else {
      setSpeicher(speicher === 0 ? 2 : 0);
      setOEv(null);
    }
  };

  const commitSpKosten = () => {
    const n = parseInt(spKostenDraft);
    if (!isNaN(n) && n >= 0 && n <= 50000) {
      if (speicher > 0) {
        setOKosten(Math.max(oKosten! - n, 500));
        setSpeicher(0);
      } else {
        setOKosten(oKosten! + n);
        setSpeicher(2);
      }
      setOEv(null);
    }
    setSpKostenPrompt(false);
  };

  const checkboxStyle = (active: boolean) => ({
    width: 14, height: 14, borderRadius: 3,
    border: active ? `1.5px solid ${v('--color-accent-light')}` : `1.5px solid ${v('--color-border-muted')}`,
    background: active ? v('--color-bg-accent') : v('--color-bg'),
    display: "inline-flex" as const, alignItems: "center" as const, justifyContent: "center" as const,
    color: v('--color-accent'),
  });

  const toggleStyle = (active: boolean) => ({
    padding: "8px 14px", borderRadius: v('--radius-md'), fontSize: 13, fontWeight: 600, cursor: "pointer" as const,
    background: active ? v('--color-bg-accent') : v('--color-bg'),
    border: active ? `1.5px solid ${v('--color-accent-light')}` : `1.5px solid ${v('--color-border')}`,
    color: active ? v('--color-accent') : v('--color-text-secondary'),
    display: "flex" as const, alignItems: "center" as const, gap: 6,
  });

  return (
    <div style={{ marginBottom: 16 }}>
      <div style={{ fontSize: 11, fontWeight: 700, color: v('--color-text-secondary'), textTransform: "uppercase", letterSpacing: "0.04em", marginBottom: 8 }}>Starke Einflussfaktoren</div>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        <button onClick={() => { setWp(wp === "nein" ? "ja" : "nein"); setOEv(null); }} style={toggleStyle(wp !== "nein")}>
          Wärmepumpe
          <span style={checkboxStyle(wp !== "nein")}>{wp !== "nein" ? <IconCheck size={10} /> : ""}</span>
        </button>
        <button onClick={() => { setEa(ea === "nein" ? "ja" : "nein"); setOEv(null); }} style={toggleStyle(ea !== "nein")}>
          E-Auto
          <span style={checkboxStyle(ea !== "nein")}>{ea !== "nein" ? <IconCheck size={10} /> : ""}</span>
        </button>
        <button onClick={handleSpeicherToggle} style={toggleStyle(speicher > 0)}>
          Speicher
          {speicher > 0 && <span style={{ fontSize: 11 }}>{spKwh} kWh</span>}
          <span style={checkboxStyle(speicher > 0)}>{speicher > 0 ? <IconCheck size={10} /> : ""}</span>
        </button>
      </div>
      {spKostenPrompt && (
        <div style={{
          marginTop: 8, padding: "10px 14px", borderRadius: v('--radius-md'),
          background: v('--color-bg'), border: `1.5px solid ${v('--color-accent')}`,
          display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap",
        }}>
          <span style={{ fontSize: 12, color: v('--color-text-muted') }}>
            {speicher > 0 ? "Speicherkosten abziehen:" : "Speicherkosten:"}
          </span>
          <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
            <input
              autoFocus
              value={spKostenDraft}
              onChange={e => setSpKostenDraft(e.target.value.replace(/[^\d]/g, ""))}
              onKeyDown={e => {
                if (e.key === "Enter") commitSpKosten();
                if (e.key === "Escape") setSpKostenPrompt(false);
              }}
              style={{
                width: 64, textAlign: "right", fontSize: 13, fontWeight: 700,
                fontFamily: v('--font-mono'), color: v('--color-accent'),
                background: v('--color-accent-dim'), border: `1px solid ${v('--color-accent')}`,
                borderRadius: v('--radius-sm'), padding: "5px 6px", outline: "none",
              }}
            />
            <span style={{ fontSize: 12, color: v('--color-text-secondary') }}>€</span>
          </span>
          <button onClick={commitSpKosten} style={{
            padding: "5px 12px", borderRadius: v('--radius-sm'), fontSize: 11, fontWeight: 600,
            background: v('--color-accent'), border: "none", color: v('--color-text-on-accent'), cursor: "pointer",
          }}>OK</button>
          <button onClick={() => setSpKostenPrompt(false)} style={{
            padding: "5px 8px", borderRadius: v('--radius-sm'), fontSize: 11, fontWeight: 600,
            background: "transparent", border: `1px solid ${v('--color-border-muted')}`, color: v('--color-text-muted'), cursor: "pointer",
          }}>Abbrechen</button>
        </div>
      )}
      {ea !== "nein" && (
        <div style={{ marginTop: 8, display: "flex", gap: 6, alignItems: "center", paddingLeft: 4 }}>
          <span style={{ fontSize: 11, color: v('--color-text-muted') }}>Laufleistung:</span>
          {EA_KM_PRESETS.map(km => (
            <button key={km} onClick={() => { setEaKm(km); setOEv(null); }} style={{
              padding: "5px 8px", borderRadius: v('--radius-sm'), fontSize: 11, fontWeight: 600, cursor: "pointer",
              background: eaKm === km ? v('--color-accent-dim') : v('--color-bg'),
              border: eaKm === km ? `1px solid ${v('--color-accent')}` : `1px solid ${v('--color-border')}`,
              color: eaKm === km ? v('--color-accent') : v('--color-text-secondary'),
            }}>{(km / 1000).toFixed(0)}k</button>
          ))}
          <span style={{ display: "inline-flex", alignItems: "center", gap: 3 }}>
            <input
              value={EA_KM_PRESETS.includes(eaKm) ? "" : String(eaKm)}
              placeholder="km"
              onChange={e => {
                const n = parseInt(e.target.value.replace(/\D/g, ""));
                if (!isNaN(n) && n >= 1000 && n <= 50000) { setEaKm(n); setOEv(null); }
              }}
              style={{
                width: 48, textAlign: "center", fontSize: 11, fontWeight: 600,
                fontFamily: v('--font-mono'),
                color: !EA_KM_PRESETS.includes(eaKm) ? v('--color-accent') : v('--color-text-faint'),
                background: !EA_KM_PRESETS.includes(eaKm) ? v('--color-accent-dim') : v('--color-bg'),
                border: !EA_KM_PRESETS.includes(eaKm) ? `1px solid ${v('--color-accent')}` : `1px solid ${v('--color-border')}`,
                borderRadius: v('--radius-sm'), padding: "5px 4px", outline: "none",
              }}
            />
            <span style={{ fontSize: 10, color: v('--color-text-faint') }}>km</span>
          </span>
        </div>
      )}
    </div>
  );
}
