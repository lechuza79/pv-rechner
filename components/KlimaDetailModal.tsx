"use client";
// Detail-Modal für die Klimaanlage im PV-Rechner. Hostet AirconDetailInputs,
// holt die Standort-Kühlgradstunden über denselben Hook wie der Klimaanlagen-
// Rechner (useCoolingDegree) und rechnet den exakten Kühlstrom via calcAircon.
// „Übernehmen" schreibt den Kühlstrom (kWh/Jahr) zurück in den PV-Rechner und
// überschreibt damit die Schnellschätzung. Räume + PLZ sind gesperrt (Anzeige).
import { useState, useEffect, useMemo } from "react";
import AirconDetailInputs from "./AirconDetailInputs";
import { IconCheck } from "./Icons";
import { v, iconSizes } from "../lib/theme";
import { DEFAULT_AIRCON_CONFIG as CFG, type AcDeviceId } from "../lib/aircon-config";
import { calcAircon, type CoolingWindow, type AcInputs } from "../lib/aircon";
import { useCoolingDegree } from "../lib/useCoolingDegree";

interface KlimaDetailModalProps {
  open: boolean;
  onClose: () => void;
  rooms: number;
  plz?: string;
  stromPrice: number;
  onApply: (kwh: number) => void;
}

export default function KlimaDetailModal({ open, onClose, rooms, plz, stromPrice, onApply }: KlimaDetailModalProps) {
  const [deviceId, setDeviceId] = useState<AcDeviceId>(CFG.defaultDeviceId);
  const [roomM2, setRoomM2] = useState(CFG.defaultRoomM2);
  const [exposure, setExposure] = useState(CFG.defaultExposure);
  const [targetTemp, setTargetTemp] = useState(CFG.defaultTargetTemp);
  const [window_, setWindow] = useState<CoolingWindow>("day");

  const cooling = useCoolingDegree();
  const { fetchForPlz } = cooling;

  // Standort-Kühlgradstunden holen, sobald das Modal mit gültiger PLZ öffnet.
  useEffect(() => {
    if (open && plz && /^\d{5}$/.test(plz)) fetchForPlz(plz);
  }, [open, plz, fetchForPlz]);

  const inputs: AcInputs = useMemo(() => ({
    deviceId, rooms, roomM2, exposure, targetTemp, window: window_,
    cdh: cooling.cdhSet.avg5, stromPrice, pvActive: false,
  }), [deviceId, rooms, roomM2, exposure, targetTemp, window_, cooling.cdhSet.avg5, stromPrice]);

  const result = useMemo(() => calcAircon(inputs), [inputs]);

  if (!open) return null;

  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed", inset: 0, zIndex: 1000, background: "rgba(0,0,0,0.45)",
        display: "flex", alignItems: "flex-end", justifyContent: "center", padding: "0",
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label="Klimaanlage im Detail"
        style={{
          background: v('--color-bg'), color: v('--color-text-primary'), fontFamily: v('--font-text'),
          width: "100%", maxWidth: 480, maxHeight: "92vh", overflowY: "auto",
          borderTopLeftRadius: v('--radius-lg'), borderTopRightRadius: v('--radius-lg'),
          padding: "20px 18px 18px", boxShadow: "0 -8px 40px rgba(0,0,0,0.3)",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
          <h2 style={{ fontSize: 18, fontWeight: 800, letterSpacing: "-0.02em" }}>Klimaanlage im Detail</h2>
          <button onClick={onClose} aria-label="Schließen" style={{
            border: "none", background: "transparent", color: v('--color-text-muted'),
            fontSize: 24, lineHeight: 0.8, cursor: "pointer", padding: 0,
          }}>×</button>
        </div>
        <p style={{ fontSize: 12, color: v('--color-text-muted'), marginBottom: 18, lineHeight: 1.5 }}>
          Genauer als die Schnellschätzung — Gerät, Räume und Sonne im Detail. Der Kühlstrom fließt danach in deine PV-Rechnung.
        </p>

        <AirconDetailInputs
          deviceId={deviceId} roomM2={roomM2} exposure={exposure} targetTemp={targetTemp} window={window_}
          onDeviceId={setDeviceId} onRoomM2={setRoomM2} onExposure={setExposure} onTargetTemp={setTargetTemp} onWindow={setWindow}
          rooms={rooms} plz={plz}
        />

        {/* Ergebnis + Übernehmen */}
        <div style={{
          marginTop: 20, padding: "14px 16px", background: v('--color-bg-accent'),
          borderRadius: v('--radius-md'), border: `1px solid ${v('--color-border-accent')}`,
          display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10,
        }}>
          <div>
            <div style={{ fontSize: 11, color: v('--color-text-secondary'), textTransform: "uppercase", letterSpacing: "0.04em", fontWeight: 600 }}>Kühlstrom pro Jahr</div>
            <div style={{ fontSize: 24, fontWeight: 800, fontFamily: v('--font-mono'), color: v('--color-text-primary') }}>
              {result.electricityKwh.toLocaleString("de-DE")} kWh
            </div>
          </div>
          <button
            onClick={() => { onApply(result.electricityKwh); onClose(); }}
            style={{
              padding: "12px 20px", borderRadius: v('--radius-md'), fontSize: 14, fontWeight: 700,
              background: v('--color-accent'), border: "none", color: v('--color-text-on-accent'), cursor: "pointer",
              display: "inline-flex", alignItems: "center", gap: 6, whiteSpace: "nowrap",
            }}
          >
            <IconCheck size={iconSizes.md} /> Übernehmen
          </button>
        </div>
        <div style={{ fontSize: 11, color: v('--color-text-faint'), marginTop: 8, lineHeight: 1.5, textAlign: "center" }}>
          {cooling.confirmed && plz && /^\d{5}$/.test(plz)
            ? `Standort PLZ ${plz} · ${cooling.cdhSet.avg5.toLocaleString("de-DE")} Kühlgradstunden`
            : "Ohne PLZ mit deutschem Durchschnitt gerechnet. PLZ im Ergebnis eingeben für echte Hitzedaten."}
        </div>
      </div>
    </div>
  );
}
