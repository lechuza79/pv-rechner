"use client";
import InlineEdit from "../../../../components/InlineEdit";
import GlossaryTerm from "../../../../components/GlossaryTerm";
import StandortField from "../../../../components/StandortField";
import InfoTooltip from "../../../../components/InfoTooltip";
import { v } from "../../../../lib/theme";

interface ResultHeroCardProps {
  be: { i: number; kum: number } | undefined;
  kosten: number;
  setOKosten: (v: number) => void;
  oStrom: number;
  setOStrom: (v: number) => void;
  oErtrag: number;
  /** Grenzen des ANGEZEIGTEN Ertrags — mit dem Dachfaktor skaliert, damit die
   *  Rückrechnung aufs Standort-Optimum im teilbaren Bereich bleibt. */
  ertragMin: number;
  ertragMax: number;
  setOErtrag: (v: number) => void;
  kwp: number;
  /** Anlagengröße direkt setzen (schaltet auf die eigene Größe um). */
  setKwp: (v: number) => void;
  spKwh: number;
  /** Speichergröße direkt setzen — freie kWh, nicht an die Vorgaben gebunden. */
  setSpKwh: (v: number) => void;
  /** Grundverbrauch des Haushalts ohne Großverbraucher, in kWh/Jahr. */
  grundverbrauch: number;
  setGrundverbrauch: (v: number) => void;
  /** True, sobald Wärmepumpe, E-Auto oder Klimaanlage dazukommen — dann ist der
   *  Wert oben nur der Haushaltsanteil, die Summe steht im Abschnitt darunter. */
  hatGrossverbraucher: boolean;
  effEv: number;
  setOEv: (v: number) => void;
  /** Nur noch zum Anzeigen: Bei Volleinspeisung gibt es keinen Eigenverbrauch.
   *  Eingestellt wird die Einspeisung im Abschnitt darunter (ResultVerguetung) —
   *  sie ist keine Zahl, sondern eine Entscheidung mit Konditionen daran. */
  effEinspeisungModus: "aus" | "teil" | "voll";
  plz: string;
  setPlz: (v: string) => void;
  plzLoading: boolean;
  plzSource: string | null;
  fetchPvgis: (plz: string) => void;
}

export default function ResultHeroCard({
  be, kosten, setOKosten, oStrom, setOStrom, oErtrag, setOErtrag, ertragMin, ertragMax,
  kwp, setKwp, spKwh, setSpKwh, grundverbrauch, setGrundverbrauch, hatGrossverbraucher,
  effEv, setOEv, effEinspeisungModus,
  plz, setPlz, plzLoading, plzSource, fetchPvgis,
}: ResultHeroCardProps) {
  return (
    <div style={{
      textAlign: "center", padding: "25px 11px 21px", marginBottom: 16,
      background: v('--color-bg'), borderRadius: v('--radius-lg'), border: `1px solid ${v('--color-border')}`,
    }}>
      <div style={{ fontSize: v("--font-size-small"), color: v('--color-text-secondary'), fontWeight: 400, marginBottom: 8 }}>
        Deine PV-Anlage <GlossaryTerm id="amortisation">amortisiert sich</GlossaryTerm> in
      </div>
      <div style={{ fontSize: v("--font-size-display-xl"), fontWeight: 800, color: v('--color-text-primary'), fontFamily: v('--font-mono'), lineHeight: 1 }}>
        {be ? be.i : ">25"}<span style={{ fontSize: v("--font-size-display-sm"), fontWeight: 700, marginLeft: 4, color: v('--color-text-faint') }}>Jahren</span>
      </div>

      {/* Editable parameters grid */}
      <div style={{
        display: "flex", gap: 12,
        marginTop: 18, padding: "14px 12px", background: v('--color-bg-muted'),
        borderRadius: v('--radius-md'), textAlign: "left", fontSize: v("--font-size-small"),
      }}>
        {/* Left column */}
        <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 13 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ color: v('--color-text-secondary') }}>Investition</span>
            <InlineEdit value={kosten} onCommit={v => setOKosten(v)} unit=" €" step={500} min={500} max={80000} width={68} />
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ color: v('--color-text-secondary') }}>Strompreis</span>
            <InlineEdit value={oStrom} onCommit={setOStrom} unit=" €" step={0.01} min={0.15} max={0.60} width={52} />
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ color: v('--color-text-secondary') }}><GlossaryTerm id="ertrag">Ertrag</GlossaryTerm>{plzLoading && <span style={{ color: v('--color-accent'), fontSize: v("--font-size-micro"), marginLeft: 4 }}>…</span>}</span>
            <InlineEdit value={oErtrag} onCommit={setOErtrag} unit=" kWh/kWp" step={10} min={ertragMin} max={ertragMax} width={48} />
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ color: v('--color-text-secondary') }}>Anlage</span>
            <InlineEdit value={kwp} onCommit={setKwp} unit=" kWp" step={0.5} min={1} max={50} width={56}
              fmt={x => (Math.round(x * 10) / 10).toLocaleString("de-DE")} />
          </div>
        </div>
        {/* Right column */}
        <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 13 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ color: v('--color-text-secondary') }}><GlossaryTerm id="eigenverbrauch">Eigenverbr.</GlossaryTerm></span>
            {effEinspeisungModus === "voll" ? (
              <span style={{ fontFamily: v('--font-mono'), fontWeight: 700, color: v('--color-text-faint'), fontSize: v("--font-size-small") }}>0%</span>
            ) : (
              <InlineEdit value={effEv} onCommit={v => setOEv(v)} unit="%" step={1} min={10} max={90} width={40} />
            )}
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 4 }}>
            {/* Ohne Großverbraucher IST der Haushalt der ganze Verbrauch; mit
                ihnen ist er nur ein Teil, und die Summe steht im Abschnitt
                „Stromverbrauch" darunter. Deshalb wechselt die Beschriftung —
                sonst stünde hier eine Zahl, die etwas anderes misst, als sie sagt. */}
            <span style={{ color: v('--color-text-secondary'), display: "inline-flex", alignItems: "center", gap: 2, minWidth: 0 }}>
              {hatGrossverbraucher ? "Haushalt" : "Verbrauch"}
              <InfoTooltip
                title={hatGrossverbraucher ? "Was zählt zum Haushalt?" : "Welcher Verbrauch ist gemeint?"}
                ariaLabel="Was zählt zum Haushaltsverbrauch?"
              >
                Der Jahresstrom für Licht, Küche, Waschen, Elektronik — alles außer den
                Großverbrauchern.{" "}
                {hatGrossverbraucher
                  ? <>Wärmepumpe, E-Auto und Klimaanlage kommen im Abschnitt „Stromverbrauch" darunter dazu; dort steht auch die Summe.</>
                  : <>Kommen Wärmepumpe, E-Auto oder Klimaanlage dazu, werden sie im Abschnitt „Stromverbrauch" darunter aufgeschlagen.</>}
                {" "}Am genauesten ist der Wert von deiner letzten Stromrechnung.
              </InfoTooltip>
            </span>
            <InlineEdit value={grundverbrauch} onCommit={setGrundverbrauch} unit=" kWh" step={100} min={500} max={30000} width={64} />
          </div>
          <StandortField
            plz={plz}
            onPlzChange={setPlz}
            loading={plzLoading}
            confirmed={!!plzSource}
            approximate={!!plzSource && plzSource !== "pvgis"}
            onSubmit={() => fetchPvgis(plz)}
          />
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ color: v('--color-text-secondary') }}>Speicher</span>
            {/* 0 kWh bedeutet „kein Speicher" — als Zahl editierbar, damit man
                ihn von hier aus dazunehmen oder weglassen kann, ohne zurück in
                den Flow zu gehen. */}
            <InlineEdit value={spKwh} onCommit={setSpKwh} unit=" kWh" step={0.5} min={0} max={30} width={56}
              fmt={x => (x > 0 ? (Math.round(x * 10) / 10).toLocaleString("de-DE") : "0")} />
          </div>
        </div>
      </div>
    </div>
  );
}
