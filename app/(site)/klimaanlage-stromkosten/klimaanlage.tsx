"use client";
import { useState, useMemo, useCallback } from "react";
import Link from "next/link";
import OptionCard from "../../../components/OptionCard";
import InlineEdit from "../../../components/InlineEdit";
import Header from "../../../components/Header";
import InfoTooltip from "../../../components/InfoTooltip";
import { IconArrowRight, IconRefresh, IconSun, IconCheck } from "../../../components/Icons";
import { v } from "../../../lib/theme";
import { usePrices } from "../../../lib/prices";
import { DEFAULT_AIRCON_CONFIG as CFG } from "../../../lib/aircon-config";
import { calcAircon, compareDevices, acquisitionRange, type CoolingWindow, type AcInputs } from "../../../lib/aircon";
import { trackEvent } from "../../../lib/analytics";
import { bundeslandFromPlz } from "../../../lib/plz-bundesland";
import { DataSourceNote } from "../../../components/PoweredBy";
import { DATA_SOURCES } from "../../../lib/data-sources";

const STEPS = ["Gerätetyp", "Räume & Größe", "Nutzung & Standort"];

const WINDOWS: { id: CoolingWindow; label: string; sub: string }[] = [
  { id: "allday", label: "Den ganzen Tag", sub: "Durchgehend gekühlt" },
  { id: "day", label: "Nur tagsüber", sub: "Wenn jemand zuhause ist" },
  { id: "night", label: "Nur nachts", sub: "Schlafzimmer-Kühlung" },
];

const TARGET_LABELS: Record<number, string> = { 22: "Kühl", 24: "Angenehm", 26: "Sparsam" };

// Fenster- und speicherabhängiger Text zur PV-Deckung. Ohne Speicher ist die
// Deckung Direktnutzung (nachts ~0). Mit Speicher wird Tagstrom in die Nacht
// verschoben — dann darf der Text auch die Nacht positiv framen.
const COVERAGE_COPY: Record<"battery" | "noBattery", Record<CoolingWindow, string>> = {
  battery: {
    day: "Tagsüber direkt von der Sonne, den Abend-Rest liefert der Speicher.",
    allday: "Am Tag direkt vom Dach, abends und nachts aus dem Speicher.",
    night: "Der Speicher lädt sich tagsüber mit Sonne und kühlt nachts damit.",
  },
  noBattery: {
    day: "Tagsüber kühlst du, wenn die Sonne scheint — sie deckt den Großteil direkt vom Dach.",
    allday: "Am Tag kommt der Kühlstrom direkt vom Dach, abends und nachts aus dem Netz.",
    night: "Nachts scheint keine Sonne — ohne Speicher kommt nur ein kleiner Teil direkt vom Dach.",
  },
};

type HeatwaveInfo = { maxTemp: number; hotDays: number; active: boolean } | null;

// Drei Standort-Modi für die Kühlgradstunden (im Ergebnis umschaltbar).
type CdhMode = "avg5" | "lastSummer" | "projection";
type CdhModes = { avg5: number; lastSummer: number; projection: number };
// Projektionsjahr zur Render-Zeit (rollover-sicher, kein hardcoded Jahr).
// Gegen 2050 geclamped — identisch zum Climate-API-Fenster in /api/cooling-degree,
// damit Label und tatsächliche Projektionsdaten nicht auseinanderlaufen.
const CLIMATE_MAX_YEAR = 2050;
const PROJ_YEAR = (() => {
  const y = new Date().getFullYear();
  const s = Math.min(CLIMATE_MAX_YEAR, y + CFG.projectionYearsAhead.start);
  const e = Math.min(CLIMATE_MAX_YEAR, y + CFG.projectionYearsAhead.end);
  return Math.round((s + e) / 2);
})();


export default function Klimaanlage() {
  const [step, setStep] = useState(0);
  const [deviceId, setDeviceId] = useState<AcInputs["deviceId"]>("portasplit");
  const [rooms, setRooms] = useState(CFG.defaultRooms);
  const [roomM2, setRoomM2] = useState(CFG.defaultRoomM2);
  const [exposure, setExposure] = useState(CFG.defaultExposure);
  const [targetTemp, setTargetTemp] = useState(CFG.defaultTargetTemp);
  const [window_, setWindow] = useState<CoolingWindow>("day");
  const [pvActive, setPvActive] = useState(false);
  const [battery, setBattery] = useState(true); // mit Speicher ist Default

  // Standort → Kühlgradstunden
  const [plz, setPlz] = useState("");
  const [plzLoading, setPlzLoading] = useState(false);
  const [plzConfirmed, setPlzConfirmed] = useState(false);
  const [cdhSet, setCdhSet] = useState<CdhModes>(() => ({
    avg5: CFG.cdhNational,
    lastSummer: Math.round(CFG.cdhNational * CFG.lastSummerFactor),
    projection: Math.round(CFG.cdhNational * CFG.projectionFactor),
  }));
  const [cdhMode, setCdhMode] = useState<CdhMode>("avg5");
  const [cdhSource, setCdhSource] = useState<"fallback" | "open-meteo" | "cache">("fallback");
  const [heatwave, setHeatwave] = useState<HeatwaveInfo>(null);
  const cdh = cdhSet[cdhMode];

  // Editierbarer Strompreis (Default aus zentraler Preis-Quelle)
  const [oStrom, setOStrom] = useState<number | null>(null);
  const prices = usePrices();
  const strompreis = oStrom ?? (prices.electricityPrice > 0 ? prices.electricityPrice : CFG.stromPrice);

  const isResult = step >= STEPS.length;
  const next = () => {
    if (step >= STEPS.length) return;
    const target = step + 1;
    if (target === STEPS.length) trackEvent("klima_ergebnis");
    setStep(target);
  };
  const back = () => step > 0 && setStep(step - 1);

  const fetchCooling = useCallback(async (inputPlz: string) => {
    if (!/^\d{5}$/.test(inputPlz)) return;
    setPlzLoading(true);
    try {
      const plzRes = await fetch("/plz.json");
      const plzData: Record<string, [number, number]> = await plzRes.json();
      const coords = plzData[inputPlz];
      const prefix = inputPlz.slice(0, 2);
      const qs = coords
        ? `lat=${coords[0]}&lon=${coords[1]}&plzPrefix=${prefix}`
        : `plzPrefix=${prefix}`;
      const res = await fetch(`/api/cooling-degree?${qs}`);
      const data = await res.json();
      if (typeof data.avg5 === "number") {
        setCdhSet({ avg5: data.avg5, lastSummer: data.lastSummer, projection: data.projection });
        setCdhSource(data.source);
      }
      setHeatwave(data.heatwave ?? null);
      setPlzConfirmed(true);
    } catch { /* Fallback bleibt */ }
    setPlzLoading(false);
  }, []);

  // PLZ ändern → Bestätigung zurücksetzen (Standort muss erneut übernommen werden)
  const onPlzChange = (raw: string) => {
    setPlz(raw.replace(/\D/g, "").slice(0, 5));
    setPlzConfirmed(false);
  };

  const inputs: AcInputs = useMemo(() => ({
    deviceId, rooms, roomM2, exposure, targetTemp, window: window_, cdh, stromPrice: strompreis, pvActive, battery,
  }), [deviceId, rooms, roomM2, exposure, targetTemp, window_, cdh, strompreis, pvActive, battery]);

  const result = useMemo(() => calcAircon(inputs), [inputs]);
  const comparison = useMemo(() => compareDevices(inputs), [inputs]);

  const bl = bundeslandFromPlz(plz);
  const cooledArea = result.cooledArea;
  // PV-Rechner übernimmt die Klimaanlage als Verbraucher. Den hier berechneten
  // Kühlstrom direkt mitgeben (klwh) — so zeigt der PV-Rechner dieselbe kWh-Zahl,
  // statt sie aus seiner gröberen Flächen-Schätzung neu zu berechnen.
  const pvRechnerHref = `/photovoltaik-rechner?kl=ja&klwh=${result.electricityKwh}&km2=${cooledArea}${plz ? `&plz=${plz}` : ""}`;
  // Teaser ohne PV: welche Deckung/Restkosten eine Solaranlage (mit Speicher,
  // dem Default) brächte — fenster-abhängig.
  const potentialCoverage = CFG.pvCoverage.battery[window_];
  const potentialNet = Math.round(result.runningCost * (1 - potentialCoverage));

  return (
    <div style={{ background: v('--color-bg'), fontFamily: v('--font-text'), color: v('--color-text-primary'), minHeight: "100vh", padding: "20px 16px" }}>
      <Header />
      <div style={{ maxWidth: v('--page-max-width'), margin: "0 auto" }}>
        <div style={{ textAlign: "center", marginBottom: 24 }}>
          <h1 style={{ fontSize: 20, fontWeight: 800, letterSpacing: "-0.02em", lineHeight: 1.2 }}>
            {isResult ? "Deine Klimaanlage im Betrieb" : "Was kostet eine Klimaanlage?"}
          </h1>
          {!isResult && (
            <p style={{ fontSize: 13, color: v('--color-text-muted'), marginTop: 6 }}>
              Stromverbrauch, Kosten und CO₂ — ehrlich aus Wetterdaten. Ohne Anmeldung.
            </p>
          )}
        </div>

        {/* Progress */}
        {!isResult && (
          <div style={{ display: "flex", gap: 4, marginBottom: 28 }}>
            {STEPS.map((_, i) => (
              <div key={i} style={{ flex: 1, height: 3, borderRadius: 2, background: i <= step ? v('--color-accent') : v('--color-progress-inactive'), transition: "background 0.3s" }} />
            ))}
          </div>
        )}

        {/* ── STEPS ── */}
        {!isResult && (
          <div className="fu" key={step}>
            <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 18 }}>{STEPS[step]}</h2>

            {/* 0: Gerätetyp */}
            {step === 0 && (
              <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: 10 }}>
                {CFG.devices.map(d => (
                  <button key={d.id} onClick={() => setDeviceId(d.id)} style={{
                    textAlign: "left", padding: "14px 16px", borderRadius: v('--radius-md'), cursor: "pointer",
                    background: deviceId === d.id ? v('--color-accent-dim') : v('--color-bg-muted'),
                    border: deviceId === d.id ? `2px solid ${v('--color-accent')}` : `2px solid ${v('--color-border')}`,
                  }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8 }}>
                      <span style={{ fontSize: 14, fontWeight: 700, color: deviceId === d.id ? v('--color-accent') : v('--color-text-primary') }}>{d.label}</span>
                      <span style={{ fontSize: 11, fontWeight: 700, fontFamily: v('--font-mono'), color: v('--color-text-muted'), whiteSpace: "nowrap" }}>Effizienz {d.seer.toString().replace(".", ",")}</span>
                    </div>
                    <div style={{ fontSize: 12, color: v('--color-text-secondary'), lineHeight: 1.5, marginTop: 6 }}>{d.what}</div>
                    <div style={{ fontSize: 11, color: v('--color-text-faint'), lineHeight: 1.5, marginTop: 4 }}>
                      Typenschild: {d.labelMetric} {d.labelValue.toString().replace(".", ",")} ({d.labelClass})
                    </div>
                  </button>
                ))}
                <div style={{ fontSize: 12, color: v('--color-text-muted'), lineHeight: 1.5, marginTop: 2 }}>
                  Der <GlossaryHint /> sagt, wie effizient gekühlt wird: Ein Split-Gerät zieht für dieselbe Kühlung
                  nur einen Bruchteil des Stroms eines Monoblocks. Wir rechnen für alle drei Typen mit der Effizienz
                  im echten Betrieb, damit der Vergleich fair bleibt — die Zahlen vom Typenschild stehen darunter.
                </div>
              </div>
            )}

            {/* 1: Räume & Größe */}
            {step === 1 && (
              <div>
                <div style={{ fontSize: 13, fontWeight: 600, color: v('--color-text-muted'), marginBottom: 8, textTransform: "uppercase", letterSpacing: "0.04em" }}>Wie viele Räume kühlst du?</div>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 6, marginBottom: 20 }}>
                  {[1, 2, 3, 4, 5].map(n => (
                    <button key={n} onClick={() => setRooms(n)} style={{
                      padding: "14px 4px", borderRadius: v('--radius-md'), fontSize: 16, fontWeight: 700, cursor: "pointer", textAlign: "center",
                      background: rooms === n ? v('--color-accent-dim') : v('--color-bg-muted'),
                      border: rooms === n ? `2px solid ${v('--color-accent')}` : `2px solid ${v('--color-border')}`,
                      color: rooms === n ? v('--color-accent') : v('--color-text-secondary'),
                    }}>{n}</button>
                  ))}
                </div>
                <div style={{ fontSize: 13, fontWeight: 600, color: v('--color-text-muted'), marginBottom: 8, textTransform: "uppercase", letterSpacing: "0.04em" }}>Fläche je Raum</div>
                <div style={{
                  padding: "12px 14px", borderRadius: v('--radius-md'), background: v('--color-bg-muted'),
                  border: `2px solid ${v('--color-border')}`, display: "flex", justifyContent: "space-between", alignItems: "center",
                }}>
                  <span style={{ fontSize: 13, fontWeight: 600 }}>Durchschnittliche Raumgröße</span>
                  <InlineEdit value={roomM2} onCommit={val => setRoomM2(Math.round(val))} unit=" m²" min={8} max={80} step={5} width={56} />
                </div>
                <div style={{ fontSize: 12, color: v('--color-text-muted'), marginTop: 10, lineHeight: 1.5 }}>
                  Gekühlt wird gesamt <strong style={{ color: v('--color-text-primary') }}>{rooms * roomM2} m²</strong> — nicht die ganze
                  Wohnfläche, sondern nur die Räume, die du wirklich kühlst.
                </div>

                <div style={{ fontSize: 13, fontWeight: 600, color: v('--color-text-muted'), marginBottom: 8, marginTop: 22, textTransform: "uppercase", letterSpacing: "0.04em", display: "inline-flex", alignItems: "center", gap: 4 }}>
                  Wie sonnig liegt der Raum?
                  <InfoTooltip title="Warum Sonne, nicht Dämmung?" ariaLabel="Warum fragen wir nach der Sonne statt nach der Dämmung?" size={12}>
                    Beim Kühlen kommt der größte Wärmeeintrag durch die Fenster — Sonne, Ausrichtung, fehlende
                    Verschattung, vor allem ein Dachgeschoss. Wärmedämmung ist dagegen ein schwacher, teils
                    kontraproduktiver Hebel (sie hält Wärme auch im Haus). Deshalb fragen wir nach der Lage zur
                    Sonne statt nach dem Dämmstandard. Quelle: Umweltbundesamt, Gebäudeforum.
                  </InfoTooltip>
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: 8 }}>
                  {CFG.exposureOptions.map(opt => (
                    <OptionCard key={opt.id} selected={exposure === opt.id} onClick={() => setExposure(opt.id)} label={opt.label} sub={opt.sub} />
                  ))}
                </div>
                <div style={{ fontSize: 11, color: v('--color-text-faint'), marginTop: 8, lineHeight: 1.5 }}>
                  Sonne durchs Fenster ist beim Kühlen der größte Posten — größer als die Dämmung. Ein Dachgeschoss
                  oder Südfenster ohne Verschattung heizt sich stark auf.
                </div>
              </div>
            )}

            {/* 2: Nutzung & Standort */}
            {step === 2 && (
              <div>
                <div style={{ fontSize: 13, fontWeight: 600, color: v('--color-text-muted'), marginBottom: 8, textTransform: "uppercase", letterSpacing: "0.04em" }}>Auf welche Temperatur kühlen?</div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 6, marginBottom: 20 }}>
                  {CFG.targetTempOptions.map(t => (
                    <button key={t} onClick={() => setTargetTemp(t)} style={{
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

                <div style={{ fontSize: 13, fontWeight: 600, color: v('--color-text-muted'), marginBottom: 8, textTransform: "uppercase", letterSpacing: "0.04em" }}>Wann läuft die Anlage?</div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: 8, marginBottom: 20 }}>
                  {WINDOWS.map(w => (
                    <OptionCard key={w.id} selected={window_ === w.id} onClick={() => setWindow(w.id)} label={w.label} sub={w.sub} />
                  ))}
                </div>

                <div style={{ fontSize: 13, fontWeight: 600, color: v('--color-text-muted'), marginBottom: 8, textTransform: "uppercase", letterSpacing: "0.04em" }}>Standort (für echte Hitzedaten)</div>
                <form onSubmit={e => { e.preventDefault(); if (!plzConfirmed) fetchCooling(plz); }} style={{ display: "flex", gap: 8 }}>
                  <input
                    type="text" inputMode="numeric" aria-label="Postleitzahl"
                    placeholder="PLZ (z. B. 80331)"
                    value={plz}
                    onChange={e => onPlzChange(e.target.value)}
                    style={{
                      flex: 1, padding: "12px 14px", fontSize: 15, fontFamily: v('--font-mono'),
                      borderRadius: v('--radius-md'), border: `2px solid ${plzConfirmed ? v('--color-positive') : v('--color-border')}`,
                      background: v('--color-bg-muted'), color: v('--color-text-primary'), outline: "none", textAlign: "center", letterSpacing: "0.08em",
                    }}
                  />
                  <button type="submit" disabled={plz.length !== 5 || plzLoading || plzConfirmed} style={{
                    padding: "0 18px", borderRadius: v('--radius-md'), fontSize: 13, fontWeight: 700, whiteSpace: "nowrap",
                    border: "none", cursor: plz.length === 5 && !plzConfirmed ? "pointer" : "default",
                    background: plzConfirmed ? v('--color-positive') : plz.length === 5 ? v('--color-accent') : v('--color-bg-muted'),
                    color: plzConfirmed || plz.length === 5 ? v('--color-text-on-accent') : v('--color-text-muted'),
                  }}>
                    {plzLoading ? "…" : plzConfirmed
                      ? <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}><IconCheck size={13} /> Übernommen</span>
                      : "Übernehmen"}
                  </button>
                </form>
                {plzConfirmed ? (
                  <div style={{ fontSize: 12, color: v('--color-positive'), marginTop: 8, lineHeight: 1.5, fontWeight: 600 }}>
                    Standort übernommen: {cdh.toLocaleString("de-DE")} Kühlgradstunden{cdhSource === "fallback" ? " (Durchschnitt)" : ""}.
                    {heatwave && heatwave.hotDays > 0 && ` Aktuell bis ${heatwave.maxTemp} °C.`}
                  </div>
                ) : (
                  <div style={{ fontSize: 12, color: v('--color-text-muted'), marginTop: 8, lineHeight: 1.5 }}>
                    Optional. Ohne PLZ rechnen wir mit einem deutschen Durchschnitt. Mit PLZ nutzen wir die echten
                    Sommertemperaturen deines Orts.
                  </div>
                )}

                <div style={{ fontSize: 13, fontWeight: 600, color: v('--color-text-muted'), marginBottom: 8, marginTop: 22, textTransform: "uppercase", letterSpacing: "0.04em" }}>Hast du eine Solaranlage?</div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                  {[{ on: true, label: "Ja, vorhanden oder geplant" }, { on: false, label: "Nein" }].map(opt => (
                    <button key={String(opt.on)} onClick={() => setPvActive(opt.on)} style={{
                      padding: "12px 8px", borderRadius: v('--radius-md'), fontSize: 13, fontWeight: 700, cursor: "pointer", textAlign: "center",
                      background: pvActive === opt.on ? v('--color-accent-dim') : v('--color-bg-muted'),
                      border: pvActive === opt.on ? `2px solid ${v('--color-accent')}` : `2px solid ${v('--color-border')}`,
                      color: pvActive === opt.on ? v('--color-accent') : v('--color-text-secondary'),
                    }}>{opt.label}</button>
                  ))}
                </div>
                <div style={{ fontSize: 12, color: v('--color-text-muted'), marginTop: 8, lineHeight: 1.5 }}>
                  Kühlen passt fast perfekt zur Sonne — mit PV deckt sie den Großteil des Kühlstroms.
                </div>
              </div>
            )}

            {/* Nav */}
            <div style={{ display: "flex", justifyContent: "space-between", marginTop: 24 }}>
              {step > 0 ? (
                <button onClick={back} style={{ padding: "10px 20px", borderRadius: v('--radius-md'), fontSize: 14, fontWeight: 600, background: "transparent", border: `1px solid ${v('--color-border-muted')}`, color: v('--color-text-secondary'), cursor: "pointer" }}>Zurück</button>
              ) : (
                <Link href="/" style={{ padding: "10px 20px", borderRadius: v('--radius-md'), fontSize: 14, fontWeight: 600, background: "transparent", border: `1px solid ${v('--color-border-muted')}`, color: v('--color-text-secondary'), cursor: "pointer", textDecoration: "none", display: "inline-flex", alignItems: "center" }}>Zurück</Link>
              )}
              <button onClick={next} style={{ padding: "10px 32px", borderRadius: v('--radius-md'), fontSize: 14, fontWeight: 700, background: v('--color-accent'), border: "none", color: v('--color-text-on-accent'), cursor: "pointer" }}>
                <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>{step === STEPS.length - 1 ? <>Ergebnis anzeigen <IconArrowRight size={14} /></> : <>Weiter <IconArrowRight size={14} /></>}</span>
              </button>
            </div>
          </div>
        )}

        {/* ── RESULT ── */}
        {isResult && (
          <div className="fu">
            {/* Hitzewellen-Banner (akut, aus 16-Tage-Vorhersage) */}
            {heatwave && heatwave.hotDays > 0 && (
              <div style={{ padding: "10px 14px", marginBottom: 16, background: v('--color-negative-dim'), border: `1px solid ${v('--color-negative-border')}`, borderRadius: v('--radius-md'), fontSize: 13, color: v('--color-negative'), lineHeight: 1.5 }}>
                <strong>{heatwave.active ? "Hitzewelle voraus:" : "Heiß:"}</strong> in den nächsten 16 Tagen bis {heatwave.maxTemp} °C
                {heatwave.hotDays > 0 && <> · {heatwave.hotDays} {heatwave.hotDays === 1 ? "Hitzetag" : "Hitzetage"} (≥ {CFG.heatwaveThreshold} °C)</>}
                {plz && ` an PLZ ${plz}`}.
              </div>
            )}

            {/* Hero: Stromkosten/Jahr */}
            <div style={{ padding: "24px 20px", marginBottom: 16, background: v('--color-bg-accent'), borderRadius: v('--radius-lg'), border: `1px solid ${v('--color-border-accent')}` }}>
              <div style={{ fontSize: 12, color: v('--color-text-secondary'), textTransform: "uppercase", letterSpacing: "0.06em", fontWeight: 600, marginBottom: 8, textAlign: "center", display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 4, width: "100%" }}>
                Stromkosten pro Jahr · {result.device.label}
                <InfoTooltip title="Was den Wert treibt" ariaLabel="Wie kommt die Stromkosten-Zahl zustande?" size={12}>
                  Das ist ein <strong>Jahres</strong>betrag, nicht pro Monat. Die deutsche Kühlsaison ist kurz —
                  das Gerät läuft nur an heißen Tagen, und nachts ist es deutlich günstiger als ganztags. Deshalb
                  wirkt die Zahl oft niedriger als erwartet. Höher wird sie mit deinem Standort (PLZ), dem Modus
                  „letzter Sommer" und einer sonnigen Lage. Wie schnell ein heißer Raum runterkühlt, ist dagegen
                  eine Frage der Geräte-Leistung, nicht der Jahresenergie.
                </InfoTooltip>
              </div>
              <div style={{ fontSize: 42, fontWeight: 800, color: v('--color-text-primary'), fontFamily: v('--font-mono'), lineHeight: 1.1, textAlign: "center" }}>
                {result.runningCost.toLocaleString("de-DE")} €
              </div>
              <div style={{ fontSize: 13, color: v('--color-text-muted'), marginTop: 6, textAlign: "center" }}>
                {result.electricityKwh.toLocaleString("de-DE")} kWh Strom/Jahr · {result.co2Kg.toLocaleString("de-DE")} kg CO₂
              </div>

              {/* Editierbare Annahmen */}
              <div style={{ marginTop: 18, borderTop: `1px solid ${v('--color-border-accent')}`, paddingTop: 14, fontSize: 13, lineHeight: 2 }}>
                <div>
                  Gekühlt: <InlineEdit value={rooms} onCommit={val => setRooms(Math.max(1, Math.min(10, Math.round(val))))} unit="" min={1} max={10} step={1} width={32} /> {rooms === 1 ? "Raum" : "Räume"}
                  {" × "}<InlineEdit value={roomM2} onCommit={val => setRoomM2(Math.round(val))} unit=" m²" min={8} max={80} step={5} width={52} />
                  {" = "}<strong style={{ fontFamily: v('--font-mono') }}>{result.cooledArea} m²</strong>
                </div>
                <div>Strompreis: <InlineEdit value={Math.round(strompreis * 100 * 100) / 100} onCommit={val => setOStrom(val / 100)} unit=" ct/kWh" min={10} max={70} step={1} width={70} /></div>
                <div>Kühlgradstunden: <strong style={{ fontFamily: v('--font-mono') }}>{cdh.toLocaleString("de-DE")}</strong>{" "}
                  <span style={{ fontSize: 11, color: v('--color-text-faint') }}>
                    ({cdhSource === "fallback" ? (bl ? `Ø ${bl}` : "Ø Deutschland") : plz ? `PLZ ${plz}` : "Ø Deutschland"})
                  </span>
                </div>
              </div>

              {/* Standort-Modus: Ø letzte Jahre / letzter Sommer / Projektion */}
              <div style={{ display: "flex", gap: 4, marginTop: 12, background: v('--color-bg-muted'), borderRadius: v('--radius-md'), padding: 3, border: `1px solid ${v('--color-border')}` }}>
                {([
                  { id: "avg5", label: `Ø ${CFG.avgYears} Jahre` },
                  { id: "lastSummer", label: "Letzter Sommer" },
                  { id: "projection", label: `Projektion ~${PROJ_YEAR}` },
                ] as { id: CdhMode; label: string }[]).map(opt => (
                  <button key={opt.id} onClick={() => setCdhMode(opt.id)} style={{
                    flex: 1, padding: "7px 4px", borderRadius: v('--radius-sm'), fontSize: 11, fontWeight: 700, cursor: "pointer", border: "none", lineHeight: 1.2,
                    background: cdhMode === opt.id ? v('--color-accent') : "transparent",
                    color: cdhMode === opt.id ? v('--color-text-on-accent') : v('--color-text-muted'),
                  }}>{opt.label}</button>
                ))}
              </div>
              <div style={{ fontSize: 11, color: v('--color-text-faint'), marginTop: 6, lineHeight: 1.5, textAlign: "center" }}>
                {cdhMode === "avg5" && `Durchschnitt der letzten ${CFG.avgYears} Sommer — der ausgewogene Wert.`}
                {cdhMode === "lastSummer" && "Der letzte Sommer — oft heißer als der Schnitt."}
                {cdhMode === "projection" && `So heiß wird ein Sommer um ${PROJ_YEAR} laut Klimamodell (CMIP6) — Projektion, kein exakter Wert.`}
              </div>
            </div>

            {/* Gerätevergleich — getroffene Auswahl als Referenz, andere mit Differenz */}
            <div style={{ background: v('--color-bg'), borderRadius: v('--radius-md'), padding: "14px 16px", marginBottom: 16, border: `1px solid ${v('--color-border')}` }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: v('--color-text-muted'), textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 12 }}>
                Deine Auswahl · gleiche Kühlung
              </div>

              {/* Referenz: getroffene Auswahl, voll dargestellt */}
              <div style={{ padding: "12px 14px", borderRadius: v('--radius-sm'), background: v('--color-accent-dim'), border: `1.5px solid ${v('--color-accent')}`, display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10, marginBottom: 10 }}>
                <span style={{ display: "flex", alignItems: "center", gap: 8, minWidth: 0 }}>
                  <span style={{ width: 16, height: 16, borderRadius: 4, flexShrink: 0, display: "inline-flex", alignItems: "center", justifyContent: "center", background: v('--color-accent'), color: v('--color-text-on-accent') }}><IconCheck size={11} /></span>
                  <span style={{ fontSize: 13, fontWeight: 700, color: v('--color-accent') }}>{result.device.label}</span>
                </span>
                <span style={{ display: "flex", gap: 12, flexShrink: 0, fontFamily: v('--font-mono'), fontSize: 13, alignItems: "baseline" }}>
                  <span style={{ color: v('--color-text-muted'), fontSize: 11 }}>{result.electricityKwh} kWh</span>
                  <span style={{ fontWeight: 800, color: v('--color-text-primary') }}>{result.runningCost} €/J</span>
                </span>
              </div>

              {/* Andere Gerätetypen: kleiner, mit +/- gegenüber der Auswahl */}
              <div style={{ fontSize: 10, fontWeight: 700, color: v('--color-text-faint'), textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 6 }}>im Vergleich</div>
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                {comparison.filter(r => r.device.id !== deviceId).map(r => {
                  const dCost = r.runningCost - result.runningCost;
                  const dKwh = r.electricityKwh - result.electricityKwh;
                  const worse = dCost > 0; // teurer im Betrieb = schlechter
                  const deltaColor = dCost === 0 ? v('--color-text-muted') : worse ? v('--color-negative') : v('--color-positive');
                  return (
                    <button key={r.device.id} onClick={() => setDeviceId(r.device.id)} style={{
                      textAlign: "left", padding: "8px 12px", borderRadius: v('--radius-sm'), cursor: "pointer",
                      background: v('--color-bg-muted'), border: `1px solid ${v('--color-border')}`,
                      display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10,
                    }}>
                      <span style={{ fontSize: 12, fontWeight: 600, color: v('--color-text-secondary'), overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", minWidth: 0 }}>{r.device.label}</span>
                      <span style={{ display: "flex", gap: 10, flexShrink: 0, fontFamily: v('--font-mono'), fontSize: 11, alignItems: "baseline" }}>
                        <span style={{ color: v('--color-text-faint') }}>{dKwh > 0 ? "+" : ""}{dKwh} kWh</span>
                        <span style={{ fontWeight: 700, color: deltaColor, width: 56, textAlign: "right" }}>{dCost > 0 ? "+" : ""}{dCost} €/J</span>
                      </span>
                    </button>
                  );
                })}
              </div>
              <div style={{ fontSize: 11, color: v('--color-text-faint'), marginTop: 8, lineHeight: 1.5 }}>
                Anderen Typ antippen, um ihn als Auswahl zu übernehmen.
              </div>
            </div>

            {/* Stats: Anschaffung, Kühlleistung */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 16 }}>
              {(() => {
                const [lo, hi] = acquisitionRange(result.device, rooms);
                const calc = result.device.perRoom
                  ? `${result.device.label}: ein Gerät pro Raum, ${rooms}× gerechnet.`
                  : `Außengerät + je Innengerät pro Raum (Kernbohrung, Leitungen, Vakuum/Befüllung, Montage durch zertifizierten Fachbetrieb), ${rooms}× gerechnet.`;
                return (
                  <StatCard
                    label="Anschaffung"
                    value={`~${result.acquisition.toLocaleString("de-DE")} €`}
                    sub={`${lo.toLocaleString("de-DE")}–${hi.toLocaleString("de-DE")} €`}
                    helpTitle="Anschaffung — Mittelwert"
                    help={<>Das ist ein <strong>Mittelwert</strong>. Die tatsächlichen Kosten variieren stark nach Gerät, Anbieter, Leitungsweg und Region — typische Spanne {lo.toLocaleString("de-DE")}–{hi.toLocaleString("de-DE")} €. {calc}</>}
                  />
                );
              })()}
              <StatCard label="Kühlleistung" value={`~${result.capacityKw.toString().replace(".", ",")} kW`} help="Empfohlene Geräteleistung für die gekühlte Fläche (~85 W/m²)." />
            </div>

            {/* PV-Deckung — getroffene Auswahl aus dem Funnel, hier umschaltbar */}
            <div style={{ background: v('--color-bg'), borderRadius: v('--radius-md'), padding: "14px 16px", marginBottom: 16, border: `1px solid ${pvActive ? v('--color-accent') : v('--color-border')}` }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
                <span style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
                  <IconSun size={16} color={v('--color-accent')} />
                  <span style={{ fontSize: 14, fontWeight: 700 }}>Solaranlage</span>
                </span>
                <span style={{ display: "inline-flex", gap: 3, background: v('--color-bg-muted'), borderRadius: v('--radius-sm'), padding: 3, border: `1px solid ${v('--color-border')}` }}>
                  {[{ on: true, label: "Ja" }, { on: false, label: "Nein" }].map(opt => (
                    <button key={String(opt.on)} onClick={() => setPvActive(opt.on)} style={{
                      padding: "4px 14px", borderRadius: v('--radius-sm'), fontSize: 12, fontWeight: 700, cursor: "pointer", border: "none",
                      background: pvActive === opt.on ? v('--color-accent') : "transparent",
                      color: pvActive === opt.on ? v('--color-text-on-accent') : v('--color-text-muted'),
                    }}>{opt.label}</button>
                  ))}
                </span>
              </div>
              {pvActive ? (
                <>
                  {/* Mit / ohne Speicher — mit ist Default */}
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, marginTop: 12 }}>
                    <span style={{ fontSize: 12, color: v('--color-text-muted') }}>Batteriespeicher?</span>
                    <span style={{ display: "inline-flex", gap: 3, background: v('--color-bg-muted'), borderRadius: v('--radius-sm'), padding: 3, border: `1px solid ${v('--color-border')}` }}>
                      {[{ on: true, label: "Mit Speicher" }, { on: false, label: "Ohne" }].map(opt => (
                        <button key={String(opt.on)} onClick={() => setBattery(opt.on)} style={{
                          padding: "4px 12px", borderRadius: v('--radius-sm'), fontSize: 12, fontWeight: 700, cursor: "pointer", border: "none",
                          background: battery === opt.on ? v('--color-accent') : "transparent",
                          color: battery === opt.on ? v('--color-text-on-accent') : v('--color-text-muted'),
                        }}>{opt.label}</button>
                      ))}
                    </span>
                  </div>
                  <div style={{ marginTop: 12, paddingTop: 12, borderTop: `1px solid ${v('--color-border')}`, fontSize: 13, color: v('--color-text-secondary'), lineHeight: 1.6 }}>
                    Die Sonne übernimmt rund <span style={{ fontWeight: 700, color: v('--color-positive'), fontFamily: v('--font-mono') }}>{Math.round(result.pvCoverage * 100)} %</span> deines Kühlstroms.{" "}
                    {COVERAGE_COPY[battery ? "battery" : "noBattery"][window_]} Reststromkosten:{" "}
                    <span style={{ fontWeight: 700, color: v('--color-positive'), fontFamily: v('--font-mono') }}>{result.netRunningCost.toLocaleString("de-DE")} €/Jahr</span>{" "}
                    statt {result.runningCost.toLocaleString("de-DE")} €.
                    <div style={{ fontSize: 11, color: v('--color-text-faint'), marginTop: 4 }}>
                      {battery
                        ? "Mit typischem Heimspeicher (~10 kWh) gerechnet — er puffert den Tagstrom für Abend und Nacht."
                        : "Direktnutzung ohne Speicher — ein Akku würde die Deckung heben, vor allem nachts."}{" "}
                      <Link href={pvRechnerHref} style={{ color: v('--color-accent'), textDecoration: "none", fontWeight: 600 }}>Im PV-Rechner mitrechnen</Link>
                    </div>
                  </div>
                </>
              ) : (
                <div style={{ marginTop: 12, paddingTop: 12, borderTop: `1px solid ${v('--color-border')}`, fontSize: 13, color: v('--color-text-secondary'), lineHeight: 1.6 }}>
                  Mit einer Solaranlage und Speicher würde die Sonne rund <span style={{ fontWeight: 700, color: v('--color-positive'), fontFamily: v('--font-mono') }}>{Math.round(potentialCoverage * 100)} %</span> deines Kühlstroms übernehmen.{" "}
                  {COVERAGE_COPY.battery[window_]} Statt {result.runningCost.toLocaleString("de-DE")} € nur noch{" "}
                  <span style={{ fontWeight: 700, color: v('--color-positive'), fontFamily: v('--font-mono') }}>~{potentialNet.toLocaleString("de-DE")} €/Jahr</span>.{" "}
                  <Link href="/photovoltaik-rechner" style={{ color: v('--color-accent'), textDecoration: "none", fontWeight: 600 }}>Details im PV-Rechner</Link>
                </div>
              )}
            </div>

            {/* Aktionen */}
            <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
              <Link href={pvRechnerHref} style={{ flex: 1, padding: "12px", borderRadius: v('--radius-md'), fontSize: 13, fontWeight: 700, background: v('--color-accent'), border: "none", color: v('--color-text-on-accent'), textDecoration: "none", textAlign: "center" }}>
                <span style={{ display: "inline-flex", alignItems: "center", gap: 6, justifyContent: "center" }}>Im PV-Rechner mitrechnen <IconArrowRight size={12} /></span>
              </Link>
              <button onClick={() => setStep(0)} style={{ flex: 1, padding: "12px", borderRadius: v('--radius-md'), fontSize: 13, fontWeight: 600, background: "transparent", border: `1px solid ${v('--color-border-muted')}`, color: v('--color-text-secondary'), cursor: "pointer" }}>
                <span style={{ display: "inline-flex", alignItems: "center", gap: 6, justifyContent: "center" }}><IconRefresh size={12} /> Neu berechnen</span>
              </button>
            </div>

            <div style={{ background: v('--color-bg'), borderRadius: v('--radius-md'), padding: "12px 16px", marginBottom: 16, border: `1px solid ${v('--color-border')}`, fontSize: 12, color: v('--color-text-muted'), lineHeight: 1.6 }}>
              <Link href="/methodik" style={{ fontWeight: 700, color: v('--color-text-secondary'), textDecoration: "none", borderBottom: `1px dashed ${v('--color-text-faint')}` }}>Methodik</Link>
              <span> · Kühlbedarf aus echten Kühlgradstunden · nur Kühlung, kein Heizen · Werte auf der </span>
              <Link href="/datenstand" style={{ color: v('--color-accent'), textDecoration: "none" }}>Datenstand-Seite</Link>.
              <div style={{ marginTop: 6 }}>
                <DataSourceNote source={DATA_SOURCES.openMeteo} />
              </div>
            </div>

            <div style={{ textAlign: "center", fontSize: 11, color: v('--color-text-faint'), padding: "8px 0" }}>
              Näherungswerte aus Klimatologie und Durchschnittsgeräten. Genauigkeit ±20 %. Keine Anlageberatung.
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function GlossaryHint() {
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 3 }}>
      Effizienz-Wert
      <InfoTooltip title="Effizienz (SEER)" ariaLabel="Was bedeutet der Effizienz-Wert?" size={12}>
        Der Wert sagt, wie viel Kühlung ein Gerät pro Kilowattstunde Strom liefert. Wir rechnen mit der
        Effizienz im echten Betrieb über eine ganze Saison, nicht mit der Zahl vom Typenschild — die fällt
        im Labor günstiger aus als zu Hause. Wichtig dabei: Bei Split-Geräten steht auf dem Label ein
        Saisonwert (SEER), bei Monoblöcken dagegen ein Volllast-Wert (EER), der in einer Prüfkammer ohne
        Fenster gemessen wird. Dort kann keine warme Luft nachströmen — im Wohnzimmer schon. Deshalb sind
        die beiden Label-Zahlen nicht vergleichbar, und wir rechnen sie auf eine gemeinsame Grundlage um.
      </InfoTooltip>
    </span>
  );
}

function StatCard({ label, value, sub, help, helpTitle }: { label: string; value: string; sub?: string; help?: React.ReactNode; helpTitle?: string }) {
  return (
    <div style={{ padding: "14px 12px", borderRadius: v('--radius-md'), background: v('--color-bg'), border: `1px solid ${v('--color-border')}`, textAlign: "center" }}>
      <div style={{ fontSize: 10, fontWeight: 700, color: v('--color-text-muted'), textTransform: "uppercase", letterSpacing: "0.04em", marginBottom: 4, display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 3 }}>
        {label}
        {help && <InfoTooltip title={helpTitle ?? label} ariaLabel="Mehr Infos" size={12}>{help}</InfoTooltip>}
      </div>
      <div style={{ fontSize: 18, fontWeight: 800, fontFamily: v('--font-mono'), color: v('--color-text-primary') }}>{value}</div>
      {sub && <div style={{ fontSize: 10, color: v('--color-text-faint'), fontFamily: v('--font-mono'), marginTop: 2 }}>{sub}</div>}
    </div>
  );
}
