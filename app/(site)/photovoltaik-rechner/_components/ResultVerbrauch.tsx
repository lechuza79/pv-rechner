"use client";
// Der Abschnitt „Stromverbrauch" im Ergebnis: was verbraucht wird — und die
// Schalter, die genau das ändern.
//
// Vorher waren das zwei getrennte Blöcke: „Starke Einflussfaktoren" (Wärmepumpe,
// E-Auto, Klimaanlage, Speicher als Schalterreihe) und darüber eine Karte mit
// dem Verbrauch und seiner Aufschlüsselung. Wer die Wärmepumpe anschaltete, sah
// die Wirkung eine Karte weiter oben. Und die Detailangaben aller Verbraucher
// standen gesammelt UNTER der Schalterreihe — die Laufleistung des Autos hing
// dadurch unter dem Speicher-Schalter, obwohl sie zum Auto gehört.
//
// Jetzt trägt jeder Verbraucher seine eigene Zeile: Schalter, sein Anteil am
// Verbrauch, und direkt darunter seine Detailfrage. Der Speicher ist hier
// bewusst NICHT dabei — er verbraucht nichts, er gehört zur Anlage und steht
// deshalb oben in der Ergebnis-Karte.
import { ReactNode } from "react";
import { IconCheck } from "../../../../components/Icons";
import PresetNumberInput from "../../../../components/PresetNumberInput";
import { v, iconSizes, space } from "../../../../lib/theme";
import { EA_KM_PRESETS } from "../../../../lib/constants";

export interface ResultVerbrauchProps {
  /** Haushalt ohne Großverbraucher (editierbar oben in der Ergebnis-Karte). */
  grundverbrauch: number;
  wp: string;
  setWp: (v: string) => void;
  wpKwh: number;
  ea: string;
  setEa: (v: string) => void;
  eaKm: number;
  setEaKm: (v: number) => void;
  eaKwh: number;
  klima: string;
  setKlima: (v: string) => void;
  klimaRooms: number;
  setKlimaRooms: (v: number) => void;
  klimaKwh: number;
  /** Kühlstrom kommt aus den Details bzw. dem Klima-Rechner, nicht aus der Schnellschätzung. */
  klimaAusDetails: boolean;
  onKlimaDetails: () => void;
  gesamtVerbrauch: number;
  /** Jede Änderung hier verschiebt den Eigenverbrauch — der muss zurück auf Auto. */
  resetEv: () => void;
}

function Chip({ aktiv, onClick, children }: { aktiv: boolean; onClick: () => void; children: ReactNode }) {
  return (
    <button
      onClick={onClick}
      style={{
        padding: "4px 9px", borderRadius: v("--radius-sm"), fontSize: 11, fontWeight: 600, cursor: "pointer",
        background: aktiv ? v("--color-accent-dim") : v("--color-bg"),
        border: `1px solid ${aktiv ? v("--color-accent") : v("--color-border")}`,
        color: aktiv ? v("--color-accent") : v("--color-text-secondary"),
      }}
    >
      {children}
    </button>
  );
}

/** Eine Verbraucher-Zeile: Schalter links, Anteil rechts, Details darunter. */
function Verbraucher({
  label, an, onToggle, kwh, children,
}: {
  label: string;
  an: boolean;
  onToggle: () => void;
  kwh: number;
  children?: ReactNode;
}) {
  return (
    <div style={{ borderTop: `1px dashed ${v("--color-border")}`, paddingTop: space.lg, marginTop: space.lg }}>
      <div style={{ display: "flex", alignItems: "center", gap: space.md }}>
        <button
          onClick={onToggle}
          aria-pressed={an}
          style={{
            display: "flex", alignItems: "center", gap: space.sm,
            padding: "6px 10px", borderRadius: v("--radius-md"), fontSize: 13, fontWeight: 600, cursor: "pointer",
            background: an ? v("--color-bg-accent") : v("--color-bg"),
            border: `1.5px solid ${an ? v("--color-accent-light") : v("--color-border")}`,
            color: an ? v("--color-accent") : v("--color-text-secondary"),
          }}
        >
          {label}
          <span style={{
            width: 14, height: 14, borderRadius: 3,
            border: `1.5px solid ${an ? v("--color-accent-light") : v("--color-border-muted")}`,
            background: an ? v("--color-bg-accent") : v("--color-bg"),
            display: "inline-flex", alignItems: "center", justifyContent: "center",
            color: v("--color-accent"),
          }}>
            {an ? <IconCheck size={iconSizes.xs} /> : ""}
          </span>
        </button>
        <span style={{
          marginLeft: "auto", fontFamily: v("--font-mono"), fontSize: 13,
          color: an ? v("--color-text-primary") : v("--color-text-faint"), fontWeight: an ? 700 : 500,
        }}>
          {an ? `+ ${Math.round(kwh).toLocaleString("de-DE")} kWh` : "—"}
        </span>
      </div>
      {an && children && (
        <div style={{ marginTop: space.md, display: "flex", gap: space.sm, alignItems: "center", flexWrap: "wrap" }}>
          {children}
        </div>
      )}
    </div>
  );
}

export default function ResultVerbrauch({
  grundverbrauch, wp, setWp, wpKwh, ea, setEa, eaKm, setEaKm, eaKwh,
  klima, setKlima, klimaRooms, setKlimaRooms, klimaKwh, klimaAusDetails, onKlimaDetails,
  gesamtVerbrauch, resetEv,
}: ResultVerbrauchProps) {
  const zeile = { display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: 13 } as const;

  return (
    <>
      <div style={{ ...zeile, color: v("--color-text-secondary") }}>
        <span>Haushalt</span>
        <span style={{ fontFamily: v("--font-mono"), fontWeight: 600, color: v("--color-text-primary") }}>
          {grundverbrauch.toLocaleString("de-DE")} kWh
        </span>
      </div>
      <div style={{ fontSize: 11, color: v("--color-text-faint"), marginTop: 2 }}>
        Grundverbrauch ohne die Großverbraucher — oben in der Ergebnis-Karte änderbar.
      </div>

      <Verbraucher label="Wärmepumpe" an={wp !== "nein"} kwh={wpKwh}
        onToggle={() => { setWp(wp === "nein" ? "ja" : "nein"); resetEv(); }} />

      <Verbraucher label="E-Auto" an={ea !== "nein"} kwh={eaKwh}
        onToggle={() => { setEa(ea === "nein" ? "ja" : "nein"); resetEv(); }}>
        <span style={{ fontSize: 11, color: v("--color-text-muted") }}>Laufleistung:</span>
        {EA_KM_PRESETS.map((km) => (
          <Chip key={km} aktiv={eaKm === km} onClick={() => { setEaKm(km); resetEv(); }}>
            {(km / 1000).toFixed(0)}k
          </Chip>
        ))}
        <PresetNumberInput value={eaKm} presets={EA_KM_PRESETS} min={1000} max={50000} unit="km" compact
          onCommit={(n) => { setEaKm(n); resetEv(); }} />
      </Verbraucher>

      <Verbraucher label="Klimaanlage" an={klima !== "nein"} kwh={klimaKwh}
        onToggle={() => { setKlima(klima === "nein" ? "ja" : "nein"); resetEv(); }}>
        <span style={{ fontSize: 11, color: v("--color-text-muted") }}>Räume:</span>
        {[1, 2, 3, 4, 5].map((n) => (
          <Chip key={n} aktiv={klimaRooms === n} onClick={() => { setKlimaRooms(n); resetEv(); }}>{n}</Chip>
        ))}
        <button onClick={onKlimaDetails} style={{
          marginLeft: "auto", padding: "4px 10px", borderRadius: v("--radius-sm"), fontSize: 11, fontWeight: 700,
          cursor: "pointer", background: v("--color-bg"), border: `1px solid ${v("--color-border")}`,
          color: v("--color-accent"),
        }}>Details</button>
        {klimaAusDetails && (
          <span style={{ fontSize: 11, color: v("--color-text-faint"), flexBasis: "100%" }}>
            Kühlstrom aus den Details übernommen — die Räume wirken erst wieder nach einer neuen Schnellschätzung.
          </span>
        )}
      </Verbraucher>

      <div style={{
        ...zeile, borderTop: `1px solid ${v("--color-border")}`,
        marginTop: space.lg, paddingTop: space.lg, fontWeight: 700, color: v("--color-text-primary"),
      }}>
        <span>Gesamt</span>
        <span style={{ fontFamily: v("--font-mono") }}>{gesamtVerbrauch.toLocaleString("de-DE")} kWh</span>
      </div>
    </>
  );
}
