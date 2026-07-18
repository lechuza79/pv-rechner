"use client";
// Controlled Detail-Eingaben für die Klimaanlage (Gerätetyp, Raumgröße,
// Ausrichtung, Zieltemperatur, Nutzungsfenster). Rendert dieselben Optionen wie
// der Klimaanlagen-Rechner aus DEFAULT_AIRCON_CONFIG — eine Quelle, kein Drift.
// Räume + PLZ kommen als gesperrte, nur angezeigte Werte rein (nicht editierbar),
// damit Schnellschätzung und Detailrechnung nicht auseinanderlaufen.
import OptionCard from "./OptionCard";
import InlineEdit from "./InlineEdit";
import InfoTooltip from "./InfoTooltip";
import { v, iconSizes } from "../lib/theme";
import { DEFAULT_AIRCON_CONFIG as CFG, type AcDeviceId } from "../lib/aircon-config";
import type { CoolingWindow } from "../lib/aircon";

// Nutzungsfenster + Zieltemperatur-Labels sind reine Anzeige-Texte (die Rechen-
// Faktoren stecken in der Config). Gleiche Texte wie im Klimaanlagen-Rechner.
const WINDOWS: { id: CoolingWindow; label: string; sub: string }[] = [
  { id: "allday", label: "Den ganzen Tag", sub: "Durchgehend gekühlt" },
  { id: "day", label: "Nur tagsüber", sub: "Wenn jemand zuhause ist" },
  { id: "night", label: "Nur nachts", sub: "Schlafzimmer-Kühlung" },
];
const TARGET_LABELS: Record<number, string> = { 22: "Kühl", 24: "Angenehm", 26: "Sparsam" };

export interface AirconDetailInputsProps {
  deviceId: AcDeviceId;
  roomM2: number;
  exposure: string;
  targetTemp: number;
  window: CoolingWindow;
  onDeviceId: (v: AcDeviceId) => void;
  onRoomM2: (v: number) => void;
  onExposure: (v: string) => void;
  onTargetTemp: (v: number) => void;
  onWindow: (v: CoolingWindow) => void;
  // Gesperrt, nur Anzeige — kommen aus dem PV-Rechner (Räume-Selektor + PLZ).
  rooms: number;
  plz?: string;
}

const labelStyle: React.CSSProperties = {
  fontSize: 12, fontWeight: 600, color: v('--color-text-muted'), marginBottom: 8,
  textTransform: "uppercase", letterSpacing: "0.04em",
};

export default function AirconDetailInputs({
  deviceId, roomM2, exposure, targetTemp, window: window_,
  onDeviceId, onRoomM2, onExposure, onTargetTemp, onWindow,
  rooms, plz,
}: AirconDetailInputsProps) {
  return (
    <div>
      {/* Gesperrte Werte aus dem PV-Rechner */}
      <div style={{
        display: "flex", gap: 8, marginBottom: 18, padding: "10px 12px",
        background: v('--color-bg-muted'), borderRadius: v('--radius-md'), border: `1px solid ${v('--color-border')}`,
      }}>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 10, fontWeight: 700, color: v('--color-text-faint'), textTransform: "uppercase", letterSpacing: "0.04em" }}>Räume</div>
          <div style={{ fontSize: 14, fontWeight: 700, fontFamily: v('--font-mono'), color: v('--color-text-secondary') }}>{rooms}</div>
        </div>
        <div style={{ flex: 1, borderLeft: `1px solid ${v('--color-border')}`, paddingLeft: 12 }}>
          <div style={{ fontSize: 10, fontWeight: 700, color: v('--color-text-faint'), textTransform: "uppercase", letterSpacing: "0.04em" }}>Standort</div>
          <div style={{ fontSize: 14, fontWeight: 700, fontFamily: v('--font-mono'), color: v('--color-text-secondary') }}>{plz && /^\d{5}$/.test(plz) ? `PLZ ${plz}` : "Ø Deutschland"}</div>
        </div>
      </div>
      <div style={{ fontSize: 11, color: v('--color-text-faint'), marginTop: -12, marginBottom: 18, lineHeight: 1.5 }}>
        Räume und Standort kommen aus dem PV-Rechner. Hier verfeinerst du die Kühl-Details.
      </div>

      {/* Gerätetyp */}
      <div style={labelStyle}>Gerätetyp</div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: 8, marginBottom: 20 }}>
        {CFG.devices.map(d => (
          <button key={d.id} onClick={() => onDeviceId(d.id)} style={{
            textAlign: "left", padding: "12px 14px", borderRadius: v('--radius-md'), cursor: "pointer",
            background: deviceId === d.id ? v('--color-accent-dim') : v('--color-bg-muted'),
            border: deviceId === d.id ? `2px solid ${v('--color-accent')}` : `2px solid ${v('--color-border')}`,
          }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8 }}>
              <span style={{ fontSize: 13, fontWeight: 700, color: deviceId === d.id ? v('--color-accent') : v('--color-text-primary') }}>{d.label}</span>
              <span style={{ fontSize: 11, fontWeight: 700, fontFamily: v('--font-mono'), color: v('--color-text-muted'), whiteSpace: "nowrap" }}>Effizienz {d.seer.toString().replace(".", ",")}</span>
            </div>
          </button>
        ))}
      </div>

      {/* Raumgröße */}
      <div style={labelStyle}>Fläche je Raum</div>
      <div style={{
        padding: "12px 14px", borderRadius: v('--radius-md'), background: v('--color-bg-muted'), marginBottom: 20,
        border: `2px solid ${v('--color-border')}`, display: "flex", justifyContent: "space-between", alignItems: "center",
      }}>
        <span style={{ fontSize: 13, fontWeight: 600 }}>Durchschnittliche Raumgröße</span>
        <InlineEdit value={roomM2} onCommit={val => onRoomM2(Math.round(val))} unit=" m²" min={8} max={80} step={5} width={56} />
      </div>
      <div style={{ fontSize: 11, color: v('--color-text-faint'), marginTop: -14, marginBottom: 20, lineHeight: 1.5 }}>
        Gekühlt wird gesamt <strong style={{ color: v('--color-text-primary') }}>{rooms * roomM2} m²</strong> — nur die Räume, die du wirklich kühlst.
      </div>

      {/* Ausrichtung / Sonne */}
      <div style={{ ...labelStyle, display: "inline-flex", alignItems: "center", gap: 4 }}>
        Wie sonnig liegen die Räume?
        <InfoTooltip title="Warum Sonne, nicht Dämmung?" ariaLabel="Warum fragen wir nach der Sonne statt nach der Dämmung?" size={iconSizes.sm}>
          Beim Kühlen kommt der größte Wärmeeintrag durch die Fenster — Sonne, Ausrichtung, fehlende Verschattung,
          vor allem ein Dachgeschoss. Deshalb fragen wir nach der Lage zur Sonne statt nach dem Dämmstandard.
        </InfoTooltip>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: 8, marginBottom: 20 }}>
        {CFG.exposureOptions.map(opt => (
          <OptionCard key={opt.id} selected={exposure === opt.id} onClick={() => onExposure(opt.id)} label={opt.label} sub={opt.sub} />
        ))}
      </div>

      {/* Zieltemperatur */}
      <div style={labelStyle}>Auf welche Temperatur kühlen?</div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 6, marginBottom: 20 }}>
        {CFG.targetTempOptions.map(t => (
          <button key={t} onClick={() => onTargetTemp(t)} style={{
            padding: "12px 4px", borderRadius: v('--radius-md'), cursor: "pointer", textAlign: "center",
            background: targetTemp === t ? v('--color-accent-dim') : v('--color-bg-muted'),
            border: targetTemp === t ? `2px solid ${v('--color-accent')}` : `2px solid ${v('--color-border')}`,
            color: targetTemp === t ? v('--color-accent') : v('--color-text-secondary'),
          }}>
            <div style={{ fontSize: 16, fontWeight: 700, fontFamily: v('--font-mono') }}>{t} °C</div>
            <div style={{ fontSize: 10, color: v('--color-text-muted'), marginTop: 2 }}>{TARGET_LABELS[t]}</div>
          </button>
        ))}
      </div>

      {/* Nutzungsfenster */}
      <div style={labelStyle}>Wann läuft die Anlage?</div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: 8 }}>
        {WINDOWS.map(w => (
          <OptionCard key={w.id} selected={window_ === w.id} onClick={() => onWindow(w.id)} label={w.label} sub={w.sub} />
        ))}
      </div>
    </div>
  );
}
