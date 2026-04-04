"use client";
import InlineEdit from "./InlineEdit";
import { IconArrowRight, IconCheck } from "./Icons";
import { v } from "../lib/theme";

interface ResultHeroCardProps {
  be: { i: number; kum: number } | undefined;
  kosten: number;
  setOKosten: (v: number) => void;
  oStrom: number;
  setOStrom: (v: number) => void;
  oErtrag: number;
  setOErtrag: (v: number) => void;
  kwp: number;
  spKwh: number;
  effEv: number;
  setOEv: (v: number) => void;
  effEinspeisungModus: "aus" | "teil" | "voll";
  setEinspeisungModus: (m: "aus" | "teil" | "voll") => void;
  vollDisabled: boolean;
  effEinsp: number;
  setOEinsp: (v: number | null) => void;
  plz: string;
  setPlz: (v: string) => void;
  plzLoading: boolean;
  plzSource: string | null;
  fetchPvgis: (plz: string) => void;
}

export default function ResultHeroCard({
  be, kosten, setOKosten, oStrom, setOStrom, oErtrag, setOErtrag,
  kwp, spKwh, effEv, setOEv, effEinspeisungModus, setEinspeisungModus,
  vollDisabled, effEinsp, setOEinsp, plz, setPlz, plzLoading, plzSource, fetchPvgis,
}: ResultHeroCardProps) {
  return (
    <div style={{
      textAlign: "center", padding: "25px 11px 21px", marginBottom: 16,
      background: v('--color-bg'), borderRadius: v('--radius-lg'), border: `1px solid ${v('--color-border')}`,
    }}>
      <div style={{ fontSize: 13, color: v('--color-text-secondary'), fontWeight: 400, marginBottom: 8 }}>
        Deine PV-Anlage amortisiert sich in
      </div>
      <div style={{ fontSize: 56, fontWeight: 800, color: v('--color-text-primary'), fontFamily: v('--font-mono'), lineHeight: 1 }}>
        {be ? be.i : ">25"}<span style={{ fontSize: 22, fontWeight: 700, marginLeft: 4, color: v('--color-text-faint') }}>Jahren</span>
      </div>

      {/* Editable parameters grid */}
      <div style={{
        display: "flex", gap: 12,
        marginTop: 18, padding: "14px 12px", background: v('--color-bg-muted'),
        borderRadius: v('--radius-md'), textAlign: "left", fontSize: 12,
      }}>
        {/* Left column */}
        <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 13 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ color: v('--color-text-secondary') }}>Investition</span>
            <InlineEdit value={kosten} onCommit={v => setOKosten(v)} unit=" €" step={500} min={500} max={80000} width={68} />
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ color: v('--color-text-secondary') }}>Strompreis</span>
            <InlineEdit value={oStrom} onCommit={setOStrom} unit=" €" step={0.01} min={0.15} max={0.60} width={52} />
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ color: v('--color-text-secondary') }}>Ertrag{plzLoading && <span style={{ color: v('--color-accent'), fontSize: 10, marginLeft: 4 }}>…</span>}</span>
            <InlineEdit value={oErtrag} onCommit={setOErtrag} unit=" kWh/kWp" step={10} min={700} max={1400} width={48} />
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ color: v('--color-text-secondary') }}>Anlage</span>
            <span style={{ fontFamily: v('--font-mono'), fontWeight: 700, color: v('--color-text-primary'), fontSize: 15 }}>
              {kwp} <span style={{ fontFamily: v('--font-mono'), fontWeight: 500, color: v('--color-text-secondary'), fontSize: 13 }}>kWp</span>
            </span>
          </div>
        </div>
        {/* Right column */}
        <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 13 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ color: v('--color-text-secondary') }}>Eigenverbr.</span>
            {effEinspeisungModus === "voll" ? (
              <span style={{ fontFamily: v('--font-mono'), fontWeight: 700, color: v('--color-text-faint'), fontSize: 13 }}>0%</span>
            ) : (
              <InlineEdit value={effEv} onCommit={v => setOEv(v)} unit="%" step={1} min={10} max={90} width={40} />
            )}
          </div>
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: effEinspeisungModus !== "aus" ? 6 : 0 }}>
              <span style={{ color: v('--color-text-secondary') }}>Einspeisung</span>
              <div style={{ display: "flex", gap: 2, background: v('--color-bg'), borderRadius: 8, padding: 2 }}>
                {(["aus", "teil", "voll"] as const).map(m => {
                  const isActive = effEinspeisungModus === m;
                  const isDisabled = m === "voll" && vollDisabled;
                  return (
                    <button key={m} onClick={() => { if (!isDisabled) { setEinspeisungModus(m); setOEinsp(null); } }} style={{
                      padding: "3px 8px", borderRadius: 6, fontSize: 11, fontWeight: 600,
                      cursor: isDisabled ? "not-allowed" : "pointer",
                      background: isActive ? v('--color-accent') : "transparent",
                      border: "none",
                      color: isDisabled ? v('--color-text-faint') : isActive ? v('--color-text-on-accent') : v('--color-text-muted'),
                      opacity: isDisabled ? 0.4 : 1,
                      transition: "all 0.15s",
                    }}>
                      {m === "aus" ? "Aus" : m === "teil" ? "Teil" : "Voll"}
                    </button>
                  );
                })}
              </div>
            </div>
            {effEinspeisungModus !== "aus" && (
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ fontSize: 11, color: v('--color-text-faint') }}>Vergütung</span>
                <InlineEdit value={effEinsp} onCommit={v => setOEinsp(v)} unit=" ct" step={0.01} min={4} max={16} width={48} />
              </div>
            )}
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ color: v('--color-text-secondary') }}>Standort</span>
            <form onSubmit={e => { e.preventDefault(); fetchPvgis(plz); }} style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
              <input
                value={plz}
                placeholder="PLZ"
                inputMode="numeric"
                maxLength={5}
                onChange={e => setPlz(e.target.value.replace(/\D/g, "").slice(0, 5))}
                style={{
                  width: 52, textAlign: "center", fontSize: 13, fontWeight: 700,
                  fontFamily: v('--font-mono'),
                  color: plz.length === 5 ? v('--color-accent') : v('--color-text-secondary'),
                  background: plz.length === 5 ? v('--color-accent-dim') : v('--color-bg'),
                  border: plz.length === 5 ? `1px solid ${v('--color-border-accent')}` : `1px dashed ${v('--color-text-faint')}`,
                  borderRadius: v('--radius-sm'), padding: "3px 4px", outline: "none",
                }}
              />
              {plz.length === 5 && !plzLoading && !plzSource && (
                <button type="submit" style={{
                  padding: "3px 6px", fontSize: 11, fontWeight: 700, lineHeight: 1,
                  background: v('--color-accent'), color: v('--color-text-on-accent'),
                  border: "none", borderRadius: v('--radius-sm'), cursor: "pointer",
                }}><IconArrowRight size={12} color={v('--color-text-on-accent')} /></button>
              )}
              {plzSource && <span style={{ fontSize: 10, color: v('--color-text-faint') }}>{plzSource === "pvgis" ? <IconCheck size={10} /> : "~"}</span>}
            </form>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ color: v('--color-text-secondary') }}>Speicher</span>
            <span style={{ fontFamily: v('--font-mono'), fontWeight: 700, color: v('--color-text-primary'), fontSize: 15 }}>
              {spKwh > 0 ? <>{spKwh} <span style={{ fontFamily: v('--font-mono'), fontWeight: 500, color: v('--color-text-secondary'), fontSize: 13 }}>kWh</span></> : <span style={{ color: v('--color-text-faint') }}>—</span>}
            </span>
          </div>
        </div>
      </div>

      <div style={{ fontSize: 11, color: v('--color-accent'), marginTop: 10 }}>
        Werte anklicken zum Anpassen
      </div>
    </div>
  );
}
