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
import { calcAircon, compareDevices, type CoolingWindow, type AcInputs } from "../../../lib/aircon";
import { bundeslandFromPlz } from "../../../lib/plz-bundesland";

const STEPS = ["Gerätetyp", "Räume & Größe", "Nutzung & Standort"];

const WINDOWS: { id: CoolingWindow; label: string; sub: string }[] = [
  { id: "allday", label: "Den ganzen Tag", sub: "Durchgehend gekühlt" },
  { id: "day", label: "Nur tagsüber", sub: "Wenn jemand zuhause ist" },
  { id: "night", label: "Nur nachts", sub: "Schlafzimmer-Kühlung" },
];

const TARGET_LABELS: Record<number, string> = { 22: "Kühl", 24: "Angenehm", 26: "Sparsam" };

type HeatwaveInfo = { maxTemp: number; hotDays: number; active: boolean } | null;

export default function Klimaanlage() {
  const [step, setStep] = useState(0);
  const [deviceId, setDeviceId] = useState<AcInputs["deviceId"]>("portasplit");
  const [rooms, setRooms] = useState(CFG.defaultRooms);
  const [roomM2, setRoomM2] = useState(CFG.defaultRoomM2);
  const [targetTemp, setTargetTemp] = useState(CFG.defaultTargetTemp);
  const [window_, setWindow] = useState<CoolingWindow>("day");
  const [pvActive, setPvActive] = useState(false);

  // Standort → Kühlgradstunden
  const [plz, setPlz] = useState("");
  const [plzLoading, setPlzLoading] = useState(false);
  const [cdh, setCdh] = useState<number>(CFG.cdhNational);
  const [cdhSource, setCdhSource] = useState<"fallback" | "open-meteo" | "cache">("fallback");
  const [heatwave, setHeatwave] = useState<HeatwaveInfo>(null);

  // Editierbarer Strompreis (Default aus zentraler Preis-Quelle)
  const [oStrom, setOStrom] = useState<number | null>(null);
  const prices = usePrices();
  const strompreis = oStrom ?? (prices.electricityPrice > 0 ? prices.electricityPrice : CFG.stromPrice);

  const isResult = step >= STEPS.length;
  const next = () => step < STEPS.length && setStep(step + 1);
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
      if (typeof data.cdh === "number") { setCdh(data.cdh); setCdhSource(data.source); }
      setHeatwave(data.heatwave ?? null);
    } catch { /* Fallback bleibt */ }
    setPlzLoading(false);
  }, []);

  const inputs: AcInputs = useMemo(() => ({
    deviceId, rooms, roomM2, targetTemp, window: window_, cdh, stromPrice: strompreis, pvActive,
  }), [deviceId, rooms, roomM2, targetTemp, window_, cdh, strompreis, pvActive]);

  const result = useMemo(() => calcAircon(inputs), [inputs]);
  const comparison = useMemo(() => compareDevices(inputs), [inputs]);

  const bl = bundeslandFromPlz(plz);
  const cooledArea = result.cooledArea;
  // PV-Rechner übernimmt die Klimaanlage als Verbraucher (Fläche = gekühlte Fläche)
  const pvRechnerHref = `/photovoltaik-rechner?kl=ja&km2=${cooledArea}${plz ? `&plz=${plz}` : ""}`;

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
                      <span style={{ fontSize: 11, fontWeight: 700, fontFamily: v('--font-mono'), color: v('--color-text-muted'), whiteSpace: "nowrap" }}>SEER {d.seer.toString().replace(".", ",")}</span>
                    </div>
                    <div style={{ fontSize: 12, color: v('--color-text-secondary'), lineHeight: 1.5, marginTop: 6 }}>{d.what}</div>
                  </button>
                ))}
                <div style={{ fontSize: 12, color: v('--color-text-muted'), lineHeight: 1.5, marginTop: 2 }}>
                  Der <GlossaryHint /> sagt, wie effizient gekühlt wird: Ein Split-Gerät zieht für dieselbe Kühlung
                  nur einen Bruchteil des Stroms eines Monoblocks.
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
                <form onSubmit={e => { e.preventDefault(); fetchCooling(plz); }} style={{ position: "relative" }}>
                  <input
                    type="text" inputMode="numeric" aria-label="Postleitzahl"
                    placeholder="PLZ eingeben (z. B. 80331)"
                    value={plz}
                    onChange={e => setPlz(e.target.value.replace(/\D/g, "").slice(0, 5))}
                    style={{
                      width: "100%", padding: "12px 14px", paddingRight: 52, fontSize: 15, fontFamily: v('--font-mono'),
                      borderRadius: v('--radius-md'), border: `2px solid ${v('--color-border')}`,
                      background: v('--color-bg-muted'), color: v('--color-text-primary'), outline: "none", textAlign: "center", letterSpacing: "0.08em",
                    }}
                  />
                  {plzLoading ? (
                    <span style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", fontSize: 12, color: v('--color-text-muted') }}>…</span>
                  ) : plz.length === 5 && (
                    <button type="submit" aria-label="Übernehmen" style={{
                      position: "absolute", right: 8, top: "50%", transform: "translateY(-50%)", width: 34, height: 34, borderRadius: v('--radius-sm'),
                      background: v('--color-accent'), color: v('--color-text-on-accent'), border: "none", cursor: "pointer",
                      display: "flex", alignItems: "center", justifyContent: "center",
                    }}><IconArrowRight size={16} /></button>
                  )}
                </form>
                <div style={{ fontSize: 12, color: v('--color-text-muted'), marginTop: 8, lineHeight: 1.5 }}>
                  Optional. Ohne PLZ rechnen wir mit einem deutschen Durchschnitt. Mit PLZ nutzen wir die echten
                  Sommertemperaturen deines Orts.
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
              <div style={{ fontSize: 12, color: v('--color-text-secondary'), textTransform: "uppercase", letterSpacing: "0.06em", fontWeight: 600, marginBottom: 8, textAlign: "center" }}>
                Stromkosten pro Jahr · {result.device.label}
              </div>
              <div style={{ fontSize: 42, fontWeight: 800, color: v('--color-text-primary'), fontFamily: v('--font-mono'), lineHeight: 1.1, textAlign: "center" }}>
                {result.runningCost.toLocaleString("de-DE")} €
              </div>
              <div style={{ fontSize: 13, color: v('--color-text-muted'), marginTop: 6, textAlign: "center" }}>
                {result.electricityKwh.toLocaleString("de-DE")} kWh Strom/Jahr · {result.co2Kg.toLocaleString("de-DE")} kg CO₂
              </div>

              {/* Editierbare Annahmen */}
              <div style={{ marginTop: 18, borderTop: `1px solid ${v('--color-border-accent')}`, paddingTop: 14, fontSize: 13, lineHeight: 2 }}>
                <div>Gekühlte Fläche: <strong style={{ fontFamily: v('--font-mono') }}>{result.cooledArea} m²</strong> ({rooms} {rooms === 1 ? "Raum" : "Räume"})</div>
                <div>Strompreis: <InlineEdit value={Math.round(strompreis * 100 * 100) / 100} onCommit={val => setOStrom(val / 100)} unit=" ct/kWh" min={10} max={70} step={1} width={70} /></div>
                <div>Kühlgradstunden: <strong style={{ fontFamily: v('--font-mono') }}>{cdh.toLocaleString("de-DE")}</strong>{" "}
                  <span style={{ fontSize: 11, color: v('--color-text-faint') }}>
                    ({cdhSource === "fallback" ? (bl ? `Ø ${bl}` : "Ø Deutschland") : `PLZ ${plz}`})
                  </span>
                </div>
              </div>
            </div>

            {/* Gerätevergleich — gleicher Bedarf, anderer Strom */}
            <div style={{ background: v('--color-bg'), borderRadius: v('--radius-md'), padding: "14px 16px", marginBottom: 16, border: `1px solid ${v('--color-border')}` }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: v('--color-text-muted'), textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 12 }}>
                Gerätevergleich · gleiche Kühlung
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {comparison.map(r => {
                  const active = r.device.id === deviceId;
                  return (
                    <button key={r.device.id} onClick={() => setDeviceId(r.device.id)} style={{
                      textAlign: "left", padding: "10px 12px", borderRadius: v('--radius-sm'), cursor: "pointer",
                      background: active ? v('--color-accent-dim') : v('--color-bg-muted'),
                      border: active ? `1.5px solid ${v('--color-accent')}` : `1.5px solid ${v('--color-border')}`,
                      display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10,
                    }}>
                      <span style={{ display: "flex", alignItems: "center", gap: 8, minWidth: 0 }}>
                        <span style={{ width: 14, height: 14, borderRadius: 3, flexShrink: 0, display: "inline-flex", alignItems: "center", justifyContent: "center", border: active ? `1.5px solid ${v('--color-accent')}` : `1.5px solid ${v('--color-border-muted')}`, color: v('--color-accent') }}>{active ? <IconCheck size={10} /> : ""}</span>
                        <span style={{ fontSize: 12, fontWeight: 600, color: active ? v('--color-accent') : v('--color-text-secondary'), overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{r.device.label}</span>
                      </span>
                      <span style={{ display: "flex", gap: 12, flexShrink: 0, fontFamily: v('--font-mono'), fontSize: 12 }}>
                        <span style={{ color: v('--color-text-muted') }}>{r.electricityKwh} kWh</span>
                        <span style={{ fontWeight: 700, color: v('--color-text-primary'), width: 56, textAlign: "right" }}>{r.runningCost} €/J</span>
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Stats: Anschaffung, Kühlleistung */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 16 }}>
              <StatCard label="Anschaffung" value={`~${result.acquisition.toLocaleString("de-DE")} €`} help={result.device.perRoom ? `${result.device.label}: ein Gerät pro Raum, ${rooms}× gerechnet.` : `Sockel + Preis pro kW Kühlleistung inkl. Montage (~${result.capacityKw.toString().replace(".", ",")} kW).`} />
              <StatCard label="Kühlleistung" value={`~${result.capacityKw.toString().replace(".", ",")} kW`} help="Empfohlene Geräteleistung für die gekühlte Fläche (~85 W/m²)." />
            </div>

            {/* PV-Deckung */}
            <div style={{ background: v('--color-bg'), borderRadius: v('--radius-md'), padding: "14px 16px", marginBottom: 16, border: `1px solid ${pvActive ? v('--color-accent') : v('--color-border')}` }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
                <span style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
                  <IconSun size={16} color={v('--color-accent')} />
                  <span style={{ fontSize: 14, fontWeight: 700 }}>Hast du eine Solaranlage?</span>
                </span>
                <button onClick={() => setPvActive(!pvActive)} style={{
                  padding: "6px 14px", borderRadius: v('--radius-sm'), fontSize: 13, fontWeight: 700, cursor: "pointer",
                  background: pvActive ? v('--color-accent') : v('--color-bg-muted'),
                  border: pvActive ? `1.5px solid ${v('--color-accent')}` : `1.5px solid ${v('--color-border')}`,
                  color: pvActive ? v('--color-text-on-accent') : v('--color-text-secondary'),
                }}>{pvActive ? "Ja" : "Nein"}</button>
              </div>
              {pvActive && (
                <div style={{ marginTop: 12, paddingTop: 12, borderTop: `1px solid ${v('--color-border')}`, fontSize: 13, color: v('--color-text-secondary'), lineHeight: 1.6 }}>
                  Die Sonne übernimmt rund <span style={{ fontWeight: 700, color: v('--color-positive'), fontFamily: v('--font-mono') }}>{Math.round(result.pvCoverage * 100)} %</span> deines Kühlstroms —
                  Kühlen passt zeitlich fast perfekt zur PV-Erzeugung. Reststromkosten:{" "}
                  <span style={{ fontWeight: 700, color: v('--color-positive'), fontFamily: v('--font-mono') }}>{result.netRunningCost.toLocaleString("de-DE")} €/Jahr</span>{" "}
                  statt {result.runningCost.toLocaleString("de-DE")} €.
                  <div style={{ fontSize: 11, color: v('--color-text-faint'), marginTop: 4 }}>
                    Tagsüber kühlen = hohe Deckung, nachts kaum. Hängt vom gewählten Zeitfenster ab.
                  </div>
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
      SEER-Wert
      <InfoTooltip title="SEER" ariaLabel="Was ist der SEER-Wert?" size={12}>
        SEER (Seasonal Energy Efficiency Ratio) ist die jahreszeitliche Effizienz: Wie viel Kühlung das Gerät
        pro Kilowattstunde Strom liefert. Monoblock ~2,5, fest installierte Split ~6 — also rund die dreifache
        Kühlung für denselben Strom.
      </InfoTooltip>
    </span>
  );
}

function StatCard({ label, value, help }: { label: string; value: string; help?: string }) {
  return (
    <div style={{ padding: "14px 12px", borderRadius: v('--radius-md'), background: v('--color-bg'), border: `1px solid ${v('--color-border')}`, textAlign: "center" }}>
      <div style={{ fontSize: 10, fontWeight: 700, color: v('--color-text-muted'), textTransform: "uppercase", letterSpacing: "0.04em", marginBottom: 4, display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 3 }}>
        {label}
        {help && <InfoTooltip title={label} ariaLabel="Mehr Infos" size={12}>{help}</InfoTooltip>}
      </div>
      <div style={{ fontSize: 18, fontWeight: 800, fontFamily: v('--font-mono'), color: v('--color-text-primary') }}>{value}</div>
    </div>
  );
}
