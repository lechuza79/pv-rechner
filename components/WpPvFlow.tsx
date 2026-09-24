"use client";
import { useState } from "react";
import { ANLAGEN, SPEICHER, NUTZUNG } from "../lib/constants";
import { PvSizeQuestion, PvStorageQuestion } from "./PvSystemQuestions";
import FlowNav from "./FlowNav";
import FlowSchritte from "./FlowSchritte";
import Toast from "./Toast";
import { dachUebersprungenFolge } from "../lib/dach-ertrag";
import DachField from "./DachField";
import OptionCard from "./OptionCard";
import { wpPvRecommendation, type WpPvContext } from "../lib/wp-pv-recommend";
import type { TiltOrientation } from "../lib/tilt-config";

export default function WpPvFlow({ context, initial, onApply }: { context: WpPvContext; initial?: { kwp: number; storage: number }; onApply: (values: { kwp: number; storage: number }) => void }) {
  const [roofSkipped, setRoofSkipped] = useState(false);
  const [mode, setMode] = useState<"known" | "recommend" | null>(null);
  const [step, setStep] = useState(0);
  const [kwp, setKwp] = useState<number | null>(initial?.kwp ?? null);
  const [storage, setStorage] = useState<number | null>(initial?.storage ?? null);
  const [roof, setRoof] = useState<number | null>(null);
  const [orientation, setOrientation] = useState<TiltOrientation | null>(null);
  const [tilt, setTilt] = useState<number | null>(null);
  const [answered, setAnswered] = useState<Set<string>>(new Set());
  const [editing, setEditing] = useState<string | null>(null);
  const [usage, setUsage] = useState<number | null>(null);
  const [roofM2, setRoofM2] = useState("");
  const [ea, setEa] = useState(false);
  const [klima, setKlima] = useState(false);
  const [recommended, setRecommended] = useState<ReturnType<typeof wpPvRecommendation> | null>(null);
  const selectedSize = ANLAGEN.findIndex(a => a.kwp === kwp);
  const selectedStorage = SPEICHER.findIndex(s => s.kwh === storage);
  if (mode === null) return <div className="wp-pv-flow">
    <h3>Kennst du deine Anlage schon?</h3>
    <div className="wp-pv-choice">
      <OptionCard selected={false} onClick={() => setMode("known")} label="Ich kenne meine Anlage" sub="Anlagengröße und Speicher angeben" />
      <OptionCard selected={false} onClick={() => setMode("recommend")} label="Passende Anlage finden" sub="Hausdaten übernehmen und fehlende Angaben ergänzen" />
    </div>
    <p className="wp-pv-flow-note">Für die erste Schätzung nehmen wir ein Satteldach mit typischer nutzbarer Fläche, optimaler Ausrichtung und mittlerer Anwesenheit an. E-Auto und Klimaanlage sind nicht angesetzt; der Solarertrag entspricht dem Bundesdurchschnitt.</p>
  </div>;
  if (mode === "recommend") return <div className="wp-pv-flow">
    <Toast open={roofSkipped} onClose={() => setRoofSkipped(false)} tone="neutral" autoHideMs={10000}>{dachUebersprungenFolge()}</Toast>
    <p className="wp-pv-flow-progress">Haus, Haushaltsgröße und Wärmepumpenbedarf sind übernommen.</p>
    <FlowSchritte schritte={["Dach", "Stromnutzung", "Empfehlung"]} aktiv={step} onSprung={setStep} />
    {step === 0 && <>
      <DachField karten dachartIdx={roof} setDachartIdx={setRoof} ausrichtung={orientation} setAusrichtung={setOrientation} neigungGrad={tilt} setNeigungGrad={setTilt} beantwortet={answered} markiereBeantwortet={key => setAnswered(previous => new Set(previous).add(key))} nimmZurueck={key => setAnswered(previous => { const next = new Set(previous); next.delete(key); return next; })} bearbeitet={editing} setBearbeitet={setEditing} onWeissNicht={() => { if (roofM2 && !(Number(roofM2) >= 5 && Number(roofM2) <= 500)) return; setRoof(null); setOrientation(null); setTilt(null); setAnswered(new Set()); setEditing(null); if (!roofM2 || (Number(roofM2) >= 5 && Number(roofM2) <= 500)) { setRoofSkipped(true); setStep(1); } }} />
      <div className="wp-pv-roof-area">
        <label htmlFor="wp-pv-roof-m2">Nutzbare Dachfläche <span>optional</span></label>
        <div className="wp-pv-roof-input"><input id="wp-pv-roof-m2" type="number" inputMode="decimal" min="5" max="500" step="any" value={roofM2} onChange={event => setRoofM2(event.target.value)} aria-label="Nutzbare Dachfläche in Quadratmetern (optional)" aria-describedby="wp-pv-roof-help" aria-invalid={!!roofM2 && !(Number(roofM2) >= 5 && Number(roofM2) <= 500)} placeholder="z. B. 50" /><span aria-hidden="true">m²</span></div>
        <p id="wp-pv-roof-help">{roofM2 && !(Number(roofM2) >= 5 && Number(roofM2) <= 500) ? "Bitte 5 bis 500 m² eintragen oder das Feld leer lassen." : "Nur die Fläche für Module, ohne Fenster und andere Hindernisse. Ohne Angabe schätzen wir nach deinem Haustyp."}</p>
      </div>
    </>}
    {step === 1 && <>
      <div className="wp-pv-choice">{NUTZUNG.map((option, index) => <OptionCard key={index} selected={usage === index} label={option.label} sub={option.sub} onClick={() => setUsage(index)} />)}</div>
      <div className="wp-pv-extra"><label><input type="checkbox" checked={ea} onChange={event => setEa(event.target.checked)} /> E-Auto mit einrechnen (15.000 km/Jahr)</label><label><input type="checkbox" checked={klima} onChange={event => setKlima(event.target.checked)} /> Klimaanlage mit einrechnen (2 Räume)</label></div>
    </>}
    {step === 2 && recommended && <><p className="wp-pv-recommended"><strong>{recommended.kwp.toLocaleString("de-DE")} kWp</strong> · {recommended.speicherKwh.toLocaleString("de-DE")} kWh Speicher</p><p>Berechnet mit der bestehenden PV-Empfehlung und deinem Wärmepumpenbedarf.</p><p className="wp-pv-flow-note">{roof === null ? "Dachform und Ausrichtung geschätzt. " : ""}{roofM2 ? "Dachfläche aus deiner Angabe. " : "Nutzbare Dachfläche nach Haustyp geschätzt. "}Solarertrag: Bundesdurchschnitt.</p></>}
    <p className="wp-pv-flow-note">Im Wärmepumpenergebnis zählt nur der zusätzliche Solarstrom-Nutzen, abzüglich entgangener Einspeisevergütung. Anschaffung und weiterer Nutzen der Solaranlage sind nicht enthalten.</p>
    <FlowNav weiterAktiv={step === 0 ? roof !== null && orientation !== null && (!roofM2 || (Number(roofM2) >= 5 && Number(roofM2) <= 500)) : step === 1 ? usage !== null : recommended !== null} weiterLabel={step === 0 ? "Weiter" : step === 1 ? "Empfehlung anzeigen" : "Solaranlage übernehmen"} onZurueck={() => step === 0 ? setMode(null) : setStep(step - 1)} onWeiter={() => {
      if (step === 0) setStep(1);
      else if (step === 1) { setRecommended(wpPvRecommendation(context, { dachart: roof ?? undefined, ausrichtung: orientation, neigung: tilt, nutzung: usage ?? 1, roofM2: roofM2 ? Number(roofM2) : undefined, ea, klima })); setStep(2); }
      else if (recommended) onApply({ kwp: recommended.kwp, storage: recommended.speicherKwh });
    }} inaktivHinweis={step === 0 ? (roofM2 && !(Number(roofM2) >= 5 && Number(roofM2) <= 500) ? "Bitte die Dachfläche prüfen." : "Bitte Dachform und Ausrichtung wählen oder überspringen.") : "Bitte dein Nutzungsprofil wählen."} />
  </div>;
  return <div className="wp-pv-flow">
    <p className="wp-pv-flow-progress">Schritt {step + 1} von 2</p>
    <h3>{step === 0 ? "Wie groß soll die Anlage werden?" : "Batteriespeicher?"}</h3>
    {step === 0
      ? <PvSizeQuestion answered={kwp !== null} selected={selectedSize} customKwp={kwp ?? 10} onSelect={i => setKwp(ANLAGEN[i].kwp)} onCustom={value => setKwp(Math.round(value))} />
      : <PvStorageQuestion answered={storage !== null} selected={selectedStorage} onSelect={i => setStorage(SPEICHER[i].kwh)} />}
    <p className="wp-pv-flow-note">Hier zählt nur der zusätzliche Solarstrom-Nutzen deiner Wärmepumpe, abzüglich entgangener Einspeisevergütung. Anschaffung und weiterer Nutzen der Solaranlage sind nicht enthalten.</p>
    <FlowNav weiterAktiv={step === 0 ? kwp !== null : storage !== null} weiterLabel={step === 0 ? "Weiter" : "Solaranlage übernehmen"} onWeiter={() => { if (step === 0) setStep(1); else if (kwp !== null && storage !== null) onApply({ kwp, storage }); }} onZurueck={() => step > 0 ? setStep(0) : setMode(null)} inaktivHinweis={step === 0 ? "Bitte erst eine Anlagengröße wählen." : "Bitte eine Speichergröße oder „Kein Speicher“ wählen."} />
  </div>;
}
