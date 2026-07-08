"use client";
import { useState, useMemo, type ReactNode } from "react";
import Link from "next/link";
import {
  SITUATION, WOHNFLAECHEN, INSULATION_BESTAND, INSULATION_NEUBAU,
  PERSONEN, HEIZSYSTEM, WP_TYPE, WP_FUEL_OPTIONS, HAUSTYP_WP,
} from "../../../lib/constants";
import { calcHeatPump, calcHeatPumpScenarios, type HeatPumpInputs, type HeatPumpResult } from "../../../lib/heatpump";
import { DEFAULT_HEATPUMP_CONFIG } from "../../../lib/heatpump-config";
import OptionCard from "../../../components/OptionCard";
import InlineEdit from "../../../components/InlineEdit";
import HeatPumpChart from "./_components/HeatPumpChart";
import GlossaryTerm from "../../../components/GlossaryTerm";
import InfoTooltip from "../../../components/InfoTooltip";
import Header from "../../../components/Header";
import { IconArrowRight, IconRefresh, IconChevronDown, IconSun, IconSparkle, IconCheck } from "../../../components/Icons";
import { v } from "../../../lib/theme";
import { trackEvent } from "../../../lib/analytics";

const STEPS = ["Situation", "Größe & Typ", "Dämmstandard", "Haushalt", "Heizsystem"];

export default function Waermepumpe() {
  // ── Step state ───────────────────────────────────────────────
  const [step, setStep] = useState(0);
  const [situation, setSituation] = useState<"bestand" | "neubau">("bestand");
  const [flaecheIdx, setFlaecheIdx] = useState(1);         // 140 m² default
  const [customFlaeche, setCustomFlaeche] = useState<number | null>(null);
  const [customFlaecheDraft, setCustomFlaecheDraft] = useState<string>("");
  const [haustypIdx, setHaustypIdx] = useState(0);         // freistehend default
  const [insulationIdx, setInsulationIdx] = useState(1);   // teilsaniert / KfW 55
  const [personen, setPersonen] = useState(2);             // 3–4
  const [heizsystem, setHeizsystem] = useState<"fbh" | "hk_neu" | "hk_alt">("fbh");
  const [wpType, setWpType] = useState<"lwwp" | "swwp">("lwwp");

  // PV-Integration (Ergebnis-Overlay)
  const [pvStatus, setPvStatus] = useState<"nein" | "geplant" | "vorhanden">("nein");
  const [pvKwp, setPvKwp] = useState<number>(10);
  const [pvSpeicher, setPvSpeicher] = useState<number>(10);

  // ── Result overrides (editable) ──────────────────────────────
  const [oGasPrice, setOGasPrice] = useState<number | null>(null);
  const [oStromPrice, setOStromPrice] = useState<number | null>(null);
  const [oFuel, setOFuel] = useState<string>("gas_neu");
  const [oJaz, setOJaz] = useState<number | null>(null);
  const [oInvest, setOInvest] = useState<number | null>(null);
  const [oQges, setOQges] = useState<number | null>(null);
  const [oHeizlast, setOHeizlast] = useState<number | null>(null);
  const [incomeBonus, setIncomeBonus] = useState(false);
  const [klimaBonus, setKlimaBonus] = useState(true);          // BEG Klima-Bonus (Eigennutzer, alte fossile Heizung)
  const [effizienzBonus, setEffizienzBonus] = useState(true);  // BEG Effizienz-Bonus (nat. Kältemittel / Erdsonde)
  const [heizkoerperTausch, setHeizkoerperTausch] = useState(false);  // Maßnahme: alte HK auf Niedertemperatur tauschen
  const [wegId, setWegId] = useState("ist");  // aktiver Sanierungs-/Maßnahmen-Weg (Szenario-Vergleich)
  const [showDetails, setShowDetails] = useState(false);

  const isResult = step >= STEPS.length;
  const next = () => {
    if (step >= STEPS.length) return;
    const target = step + 1;
    if (target === STEPS.length) trackEvent("waermepumpe_ergebnis");
    setStep(target);
  };
  const back = () => step > 0 && setStep(step - 1);

  // ── Resolved wohnfläche ──────────────────────────────────────
  const wohnflaeche = customFlaeche ?? WOHNFLAECHEN[flaecheIdx].m2;

  // ── Build inputs + calculate ─────────────────────────────────
  const fuel = WP_FUEL_OPTIONS.find(f => f.id === oFuel) ?? WP_FUEL_OPTIONS[0];
  const inputs: HeatPumpInputs = useMemo(() => ({
    situation, wohnflaeche, insulationIdx,
    personen: PERSONEN[personen].count,
    heizsystem, wpType, heizkoerperTausch,
    haustypFaktor: HAUSTYP_WP[haustypIdx].faktor,
    pv: pvStatus !== "nein" ? { status: pvStatus, kwp: pvKwp, speicherKwh: pvSpeicher } : undefined,
    override: {
      qGes: oQges ?? undefined,
      heizlast: oHeizlast ?? undefined,
      jaz: oJaz ?? undefined,
      investNetto: oInvest ?? undefined,
      stromPrice: oStromPrice ?? undefined,
      gasPrice: oGasPrice ?? fuel.price,
      gasEfficiency: fuel.efficiency,
      gasCo2: fuel.co2PerKwh,
      incomeBonus, klimaBonus, effizienzBonus,
    },
  }), [situation, wohnflaeche, insulationIdx, personen, heizsystem, wpType, heizkoerperTausch, haustypIdx, pvStatus, pvKwp, pvSpeicher, oQges, oHeizlast, oJaz, oInvest, oStromPrice, oGasPrice, fuel, incomeBonus, klimaBonus, effizienzBonus]);

  // ── Realistische Wege (Szenario-Vergleich) ───────────────────
  // Ein unsaniertes Haus bleibt selten 20 Jahre unangetastet. Statt nur den
  // Ist-Zustand zu zeigen, rechnen wir die realistischen Sanierungs-/Heizungs-
  // wege durch. Jeder Weg ist ein Patch auf die Gebäude-/Heizungs-Eingaben.
  // Sanierungskosten (Dämmung) werden NICHT der WP zugerechnet — sie zahlen aufs
  // Gebäude ein (Komfort, Werterhalt, Heizkosten unabhängig vom System). Der
  // Heizkörpertausch bleibt drin, den macht man nur für die Wärmepumpe.
  type Weg = {
    id: string; titel: string; kurz: string; sanierung: boolean;
    patch: Partial<Pick<HeatPumpInputs, "insulationIdx" | "heizsystem" | "heizkoerperTausch">>;
  };
  const wege: Weg[] = useMemo(() => {
    if (situation !== "bestand") return [];
    const list: Weg[] = [
      { id: "ist", titel: "So wie jetzt", kurz: "Ohne weitere Maßnahmen", sanierung: false, patch: {} },
    ];
    if (heizsystem === "hk_alt") {
      list.push({ id: "heizung", titel: "Heizkörper fit machen", kurz: "Niedertemperatur-Heizkörper statt der alten", sanierung: false, patch: { heizkoerperTausch: true } });
    }
    if (insulationIdx === 0) {
      list.push({ id: "teil", titel: "Schrittweise Sanierung", kurz: "Dach/Fassade dämmen + passende Heizflächen", sanierung: true, patch: { insulationIdx: 1, ...(heizsystem === "hk_alt" ? { heizkoerperTausch: true } : {}) } });
    }
    if (insulationIdx < 2) {
      // Niedertemperatur-Heizkörper statt Gratis-Fußbodenheizung: deren Kosten
      // zählen (ehrlich), sonst stünde die Vollsanierung künstlich zu gut da.
      list.push({ id: "voll", titel: "Vollsanierung", kurz: "Rundum-Dämmung + Niedertemperatur-Heizflächen", sanierung: true, patch: { insulationIdx: 2, ...(heizsystem === "hk_alt" ? { heizkoerperTausch: true } : {}) } });
    }
    return list;
  }, [situation, heizsystem, insulationIdx]);

  const wegeResults = useMemo(() => wege.map(w => ({ ...w, r: calcHeatPump({ ...inputs, ...w.patch }) })), [wege, inputs]);
  const istResult = wegeResults.find(w => w.id === "ist")?.r ?? calcHeatPump(inputs);
  const istNegativ = istResult.tcoEinsparung < 0;
  const istKnapp = istResult.amortisationsJahre === null || istResult.amortisationsJahre > 15 || istNegativ;
  // Wege dauerhaft zeigen (nicht an die knappe istKnapp-Schwelle koppeln — sonst
  // erscheinen/verschwinden Wege + Konklusion beim kleinsten Wertwechsel). Die
  // Konklusion rahmt das Ergebnis adaptiv (unwirtschaftlich / kaum / rechnet sich).
  const zeigeWege = situation === "bestand" && wege.length > 1;

  const activeWeg = (zeigeWege ? wegeResults.find(w => w.id === wegId) : null) ?? wegeResults.find(w => w.id === "ist");
  const activeInputs = useMemo(() => ({ ...inputs, ...(activeWeg?.patch ?? {}) }), [inputs, activeWeg]);
  const result = useMemo(() => calcHeatPump(activeInputs), [activeInputs]);
  const scenarios = useMemo(() => calcHeatPumpScenarios(activeInputs), [activeInputs]);

  // Weg wechseln: baubezogene Overrides zurücksetzen, damit der Weg sauber greift
  const selectWeg = (id: string) => {
    setWegId(id);
    setOQges(null); setOJaz(null); setOInvest(null); setOHeizlast(null);
  };

  const insulationOptions = situation === "bestand" ? INSULATION_BESTAND : INSULATION_NEUBAU;

  // ── Render ───────────────────────────────────────────────────
  return (
    <div style={{ background: v('--color-bg'), fontFamily: v('--font-text'), color: v('--color-text-primary'), minHeight: "100vh", padding: "20px 16px" }}>
      <Header />
      <div style={{ maxWidth: v('--page-max-width'), margin: "0 auto" }}>
        <div style={{ textAlign: "center", marginBottom: 24 }}>
          <h1 style={{ fontSize: 20, fontWeight: 800, letterSpacing: "-0.02em", lineHeight: 1.2 }}>
            {isResult ? "Deine Wärmepumpen-Prognose" : "Lohnt sich eine Wärmepumpe?"}
          </h1>
          {!isResult && (
            <p style={{ fontSize: 13, color: v('--color-text-muted'), marginTop: 6 }}>
              Fünf Fragen, ehrlich berechnet. Keine Anmeldung.
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

            {/* 0: Situation */}
            {step === 0 && (
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                {SITUATION.map(s => (
                  <OptionCard key={s.id} selected={situation === s.id} onClick={() => {
                    setSituation(s.id as "bestand" | "neubau");
                    setInsulationIdx(1); // reset to middle when switching
                  }} label={s.label} sub={s.sub} />
                ))}
              </div>
            )}

            {/* 1: Wohnfläche */}
            {step === 1 && (
              <div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 12 }}>
                  {WOHNFLAECHEN.map((f, i) => (
                    <OptionCard key={i} selected={customFlaeche === null && flaecheIdx === i} onClick={() => { setFlaecheIdx(i); setCustomFlaeche(null); }} label={f.label} sub={f.sub} />
                  ))}
                </div>
                <div style={{
                  padding: "12px 14px", borderRadius: v('--radius-md'),
                  background: customFlaeche !== null ? v('--color-accent-dim') : v('--color-bg-muted'),
                  border: customFlaeche !== null ? `2px solid ${v('--color-accent')}` : `2px solid ${v('--color-border')}`,
                  display: "flex", justifyContent: "space-between", alignItems: "center",
                }}>
                  <span style={{ fontSize: 13, fontWeight: 600 }}>Eigener Wert</span>
                  <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
                    <input type="text" inputMode="numeric" placeholder="m²"
                      value={customFlaecheDraft}
                      onChange={e => {
                        // Nur Ziffern akzeptieren, aber während der Eingabe jeden Wert im Feld zulassen
                        const raw = e.target.value.replace(/\D/g, "");
                        setCustomFlaecheDraft(raw);
                        if (raw === "") {
                          setCustomFlaeche(null);
                        } else {
                          const n = parseInt(raw);
                          if (!isNaN(n) && n >= 30 && n <= 500) setCustomFlaeche(n);
                        }
                      }}
                      onBlur={() => {
                        // Clamp bei Verlassen des Feldes
                        if (customFlaecheDraft !== "") {
                          const n = parseInt(customFlaecheDraft);
                          if (isNaN(n) || n < 30) { setCustomFlaeche(null); setCustomFlaecheDraft(""); }
                          else if (n > 500) { setCustomFlaeche(500); setCustomFlaecheDraft("500"); }
                        }
                      }}
                      style={{ width: 70, textAlign: "right", fontSize: 13, fontWeight: 700, fontFamily: v('--font-mono'), background: v('--color-bg'), border: `1px solid ${v('--color-border')}`, borderRadius: v('--radius-sm'), padding: "6px 8px", outline: "none" }}
                    />
                    <span style={{ fontSize: 12, color: v('--color-text-muted') }}>m²</span>
                  </span>
                </div>

                <div style={{ fontSize: 13, fontWeight: 600, color: v('--color-text-muted'), margin: "20px 0 8px", textTransform: "uppercase", letterSpacing: "0.04em" }}>Haustyp</div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                  {HAUSTYP_WP.map((h, i) => (
                    <OptionCard key={h.id} selected={haustypIdx === i} onClick={() => setHaustypIdx(i)} label={h.label} sub={h.sub} />
                  ))}
                </div>
                <div style={{ fontSize: 12, color: v('--color-text-muted'), marginTop: 10, lineHeight: 1.5 }}>
                  Geteilte Wände mit Nachbarn senken den Wärmeverlust — ein Reihenhaus braucht eine kleinere (günstigere) Wärmepumpe als ein freistehendes Haus gleicher Größe.
                </div>
              </div>
            )}

            {/* 2: Dämmstandard */}
            {step === 2 && (
              <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: 8 }}>
                {insulationOptions.map((opt, i) => (
                  <OptionCard key={i} selected={insulationIdx === i} onClick={() => setInsulationIdx(i)} label={opt.label} sub={`${opt.sub} · ~${opt.specKwh} kWh/m²·a`} />
                ))}
              </div>
            )}

            {/* 3: Haushalt */}
            {step === 3 && (
              <div>
                <div style={{ fontSize: 13, fontWeight: 600, color: v('--color-text-muted'), marginBottom: 8, textTransform: "uppercase", letterSpacing: "0.04em" }}>Personen im Haushalt</div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 6 }}>
                  {PERSONEN.map((p, i) => (
                    <button key={i} onClick={() => setPersonen(i)} style={{
                      padding: "14px 4px", borderRadius: v('--radius-md'), fontSize: 16, fontWeight: 700, cursor: "pointer", textAlign: "center",
                      background: personen === i ? v('--color-accent-dim') : v('--color-bg-muted'),
                      border: personen === i ? `2px solid ${v('--color-accent')}` : `2px solid ${v('--color-border')}`,
                      color: personen === i ? v('--color-accent') : v('--color-text-secondary'),
                    }}>{p.label}</button>
                  ))}
                </div>
                <div style={{ fontSize: 12, color: v('--color-text-muted'), marginTop: 12, lineHeight: 1.5 }}>
                  Warmwasser-Bedarf wird mit {DEFAULT_HEATPUMP_CONFIG.wwPerPerson} kWh/Person·a angesetzt (Verbraucherzentrale).
                </div>
              </div>
            )}

            {/* 4: Heizsystem + WP-Typ */}
            {step === 4 && (
              <div>
                <div style={{ fontSize: 13, fontWeight: 600, color: v('--color-text-muted'), marginBottom: 8, textTransform: "uppercase", letterSpacing: "0.04em" }}>Bestehendes Heizsystem</div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: 8, marginBottom: 18 }}>
                  {HEIZSYSTEM.map(h => (
                    <OptionCard key={h.id} selected={heizsystem === h.id} onClick={() => setHeizsystem(h.id as typeof heizsystem)} label={h.label} sub={h.sub} />
                  ))}
                </div>
                <div style={{ fontSize: 13, fontWeight: 600, color: v('--color-text-muted'), marginBottom: 8, textTransform: "uppercase", letterSpacing: "0.04em" }}>Wärmepumpen-Typ</div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                  {WP_TYPE.map(w => (
                    <OptionCard key={w.id} selected={wpType === w.id} onClick={() => setWpType(w.id as typeof wpType)} label={w.label} sub={w.sub} />
                  ))}
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
            {/* 1. Ist-Konklusion (klein, oben) */}
            {zeigeWege && (
              <div style={{ padding: "12px 14px", marginBottom: 12, borderRadius: v('--radius-md'), background: v('--color-bg-muted'), border: `1px solid ${v('--color-border')}` }}>
                <div style={{ fontSize: 13, lineHeight: 1.55, color: v('--color-text-secondary') }}>
                  <span style={{ fontWeight: 700, color: v('--color-text-primary') }}>So wie dein Haus jetzt ist</span>
                  {" "}({INSULATION_BESTAND[insulationIdx].label.toLowerCase()}{heizsystem === "hk_alt" ? ", alte Heizkörper" : ""}){" "}
                  {istNegativ
                    ? <>ist eine Wärmepumpe über {DEFAULT_HEATPUMP_CONFIG.years} Jahre <span style={{ fontWeight: 700, color: v('--color-negative') }}>unwirtschaftlich</span> ({istResult.tcoEinsparung.toLocaleString("de-DE")} €).</>
                    : istKnapp
                      ? <>spielt eine Wärmepumpe über {DEFAULT_HEATPUMP_CONFIG.years} Jahre nur <span style={{ fontWeight: 700, fontFamily: v('--font-mono') }}>+{istResult.tcoEinsparung.toLocaleString("de-DE")} €</span> ein — sie lohnt sich <span style={{ fontWeight: 700 }}>ohne weitere Maßnahmen kaum</span>.</>
                      : <>rechnet sich eine Wärmepumpe schon: <span style={{ fontWeight: 700, fontFamily: v('--font-mono'), color: v('--color-positive') }}>+{istResult.tcoEinsparung.toLocaleString("de-DE")} €</span>{istResult.amortisationsJahre !== null ? `, Amortisation in ${istResult.amortisationsJahre} Jahren` : ""}.</>}
                  {" "}So wirken sich weitere Schritte auf die Wirtschaftlichkeit aus:
                </div>
              </div>
            )}

            {/* 2. Förder-Settings — nach der Konklusion, sie bestimmen alle Zahlen */}
            {situation === "bestand" && (
              <div style={{ padding: "14px 16px", marginBottom: 16, borderRadius: v('--radius-lg'), background: v('--color-bg-muted'), border: `1px solid ${v('--color-border')}` }}>
                <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", flexWrap: "wrap", gap: 4, marginBottom: 2 }}>
                  <span style={{ fontSize: 13, fontWeight: 700 }}>Deine BEG-Förderung</span>
                  <span style={{ fontFamily: v('--font-mono'), fontWeight: 800, fontSize: 15, color: v('--color-accent') }}>−{result.beg.amount.toLocaleString("de-DE")} €</span>
                </div>
                <div style={{ fontSize: 11.5, color: v('--color-text-muted'), marginBottom: 10 }}>
                  {Math.round(result.beg.rate * 100)} % der förderfähigen Kosten
                  {result.investBrutto > DEFAULT_HEATPUMP_CONFIG.begMaxCap
                    ? <> · gedeckelt bei {DEFAULT_HEATPUMP_CONFIG.begMaxCap.toLocaleString("de-DE")} € (deine Anlage liegt darüber, daher {Math.round(result.beg.rate * 100)} % × {DEFAULT_HEATPUMP_CONFIG.begMaxCap.toLocaleString("de-DE")} €)</>
                    : null}
                </div>
                <div style={{ fontSize: 12, color: v('--color-text-muted'), display: "flex", alignItems: "center", gap: 5, marginBottom: 6 }}>
                  <span style={{ display: "inline-block", width: 13, height: 13, borderRadius: 3, background: v('--color-accent'), flexShrink: 0 }} />
                  Grundförderung 30 % — bekommt jeder Heizungstausch im Bestand
                </div>
                <BonusToggle checked={klimaBonus} onChange={c => { setKlimaBonus(c); setOInvest(null); }} label="Eigengenutzte Immobilie +20 %" tipTitle="Klima-Geschwindigkeits-Bonus">
                  20 % Zusatzförderung für selbstnutzende Eigentümer, die eine funktionierende alte fossile Heizung (Öl, Gas, Kohle) durch die Wärmepumpe ersetzen. Vermieter oder wer keine alte fossile Heizung hat, bekommt ihn nicht. Quelle: BAFA/KfW BEG EM 2026.
                </BonusToggle>
                <BonusToggle checked={effizienzBonus} onChange={c => { setEffizienzBonus(c); setOInvest(null); }} label="Effizienz-Bonus +5 %" tipTitle="Effizienz-Bonus">
                  5 % Zusatzförderung für Wärmepumpen mit natürlichem Kältemittel (z. B. R290/Propan) oder mit Erdreich/Wasser als Wärmequelle. Die meisten modernen Luft-Wärmepumpen erfüllen das. Quelle: BAFA/KfW BEG EM 2026.
                </BonusToggle>
                <BonusToggle checked={incomeBonus} onChange={c => { setIncomeBonus(c); setOInvest(null); }} label="Einkommens-Bonus +30 %" tipTitle="Einkommens-Bonus">
                  30 % Zusatzförderung für Haushalte mit einem zu versteuernden Jahreseinkommen bis 40.000 €. Die Gesamtförderung ist bei 70 % gedeckelt, maximal 30.000 € förderfähige Kosten. Quelle: BAFA/KfW BEG EM 2026.
                </BonusToggle>
                {oInvest !== null && (
                  <div style={{ fontSize: 11, color: v('--color-text-faint'), marginTop: 6 }}>Investition manuell überschrieben — Förderung wirkt erst wieder nach Zurücksetzen.</div>
                )}
              </div>
            )}

            {/* 3. Realistische Wege */}
            {zeigeWege && (
              <div style={{ marginBottom: 16 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
                  <IconSparkle size={16} color={v('--color-accent')} />
                  <span style={{ fontSize: 14, fontWeight: 700 }}>Realistische Wege</span>
                </div>
                <div style={{ display: "grid", gap: 8 }}>
                  {wegeResults.map(w => (
                    <WegCard key={w.id} titel={w.titel} kurz={w.kurz} r={w.r} active={activeWeg?.id === w.id} onClick={() => selectWeg(w.id)} situation={situation} sanierung={w.sanierung} />
                  ))}
                </div>
                <div style={{ fontSize: 11, color: v('--color-text-faint'), marginTop: 8, lineHeight: 1.5 }}>
                  Sanierungskosten (Dämmung) sind hier nicht enthalten — die zahlst du fürs Gebäude (Komfort, Werterhalt, dauerhaft weniger Heizenergie), nicht für die Wärmepumpe. Der Heizkörpertausch steckt in der Investition, den macht man nur für die Wärmepumpe.
                </div>
              </div>
            )}

            {zeigeWege && (
              <div style={{ fontSize: 12, fontWeight: 700, color: v('--color-text-muted'), textTransform: "uppercase", letterSpacing: "0.04em", margin: "4px 2px 8px" }}>
                Gewählter Weg: {activeWeg?.titel}
              </div>
            )}

            {/* Hero: TCO-Differenz */}
            <div style={{ padding: "24px 20px", marginBottom: 16, background: v('--color-bg-accent'), borderRadius: v('--radius-lg'), border: `1px solid ${v('--color-border-accent')}` }}>
              <div style={{ fontSize: 12, color: v('--color-text-secondary'), textTransform: "uppercase", letterSpacing: "0.06em", fontWeight: 600, marginBottom: 8, textAlign: "center", display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 4, width: "100%" }}>
                Einsparung über {DEFAULT_HEATPUMP_CONFIG.years} Jahre
                <InfoTooltip title="So wird die Einsparung berechnet" ariaLabel="Wie wird die Einsparung berechnet?">
                  <TcoBreakdown r={result} situation={situation} jahre={DEFAULT_HEATPUMP_CONFIG.years} sanierungHinweis={activeWeg?.sanierung ?? false} />
                </InfoTooltip>
              </div>
              <div style={{ fontSize: 42, fontWeight: 800, color: result.tcoEinsparung >= 0 ? v('--color-positive') : v('--color-negative'), fontFamily: v('--font-mono'), lineHeight: 1.1, textAlign: "center" }}>
                {result.tcoEinsparung >= 0 ? "+" : ""}{result.tcoEinsparung.toLocaleString("de-DE")} €
              </div>
              <div style={{ fontSize: 13, color: v('--color-text-muted'), marginTop: 6, display: "flex", flexWrap: "wrap", alignItems: "center", justifyContent: "center", gap: 4 }}>
                vs. {situation === "neubau" ? null : "Weiterbetrieb"}
                <select value={oFuel} onChange={e => setOFuel(e.target.value)} aria-label="Referenzheizung wählen" style={{ fontFamily: v('--font-mono'), fontWeight: 700, color: v('--color-accent'), background: v('--color-accent-dim'), border: `1px solid ${v('--color-accent')}`, borderRadius: v('--radius-sm'), padding: "2px 6px", fontSize: 13 }}>
                  {WP_FUEL_OPTIONS.map(f => <option key={f.id} value={f.id}>{f.label}</option>)}
                </select>
                {situation === "neubau" ? "(Neubau)" : null}
                <InfoTooltip title="Wie sich der Brennstoffpreis entwickelt" ariaLabel="Wie sich der Gaspreis in der Rechnung entwickelt">
                  Der heutige Brennstoffpreis steigt in der Rechnung jedes Jahr — durch allgemeine Teuerung (realistisch rund 2 % pro Jahr) und durch den steigenden CO₂-Preis auf fossile Energie. Der CO₂-Preis liegt 2026 und 2027 bei 55–65 € pro Tonne und klettert ab 2028 mit dem EU-Emissionshandel voraussichtlich um etwa 8 € pro Tonne und Jahr. Die im heutigen Preis schon enthaltene CO₂-Abgabe wird dabei nicht doppelt gezählt. Die drei Szenarien im Diagramm rechnen mit unterschiedlich starkem Anstieg.
                </InfoTooltip>
              </div>

              {/* Editierbare Kernannahmen */}
              <div style={{ marginTop: 18, borderTop: `1px solid ${v('--color-border-accent')}`, paddingTop: 14, fontSize: 13, lineHeight: 2 }}>
                <div>Heizwärmebedarf: <InlineEdit value={result.qGes} onCommit={v => setOQges(v)} unit=" kWh" min={1000} max={80000} step={500} width={90} /></div>
                <div>
                  Heizlast: <InlineEdit value={result.heizlastKw} onCommit={v => setOHeizlast(v)} unit=" kW" min={3} max={40} step={0.5} width={60} fmt={v => (Math.round(v * 10) / 10).toString().replace(".", ",")} />
                  <InfoTooltip title="Heizlast" ariaLabel="Was ist die Heizlast?">
                    Die Leistung, die deine Wärmepumpe an kalten Tagen liefern muss — sie bestimmt Anlagengröße und Preis. Wir schätzen sie aus Wohnfläche, Dämmzustand und Haustyp. <strong>Hast du eine Heizlastberechnung nach DIN EN 12831 (vom Energieberater oder Heizungsbauer)? Trag den exakten Wert hier ein</strong> — dann rechnen alle Kosten damit.
                  </InfoTooltip>
                </div>
                <div>
                  Wärmepumpe:{" "}
                  <select value={wpType} onChange={e => { setWpType(e.target.value as "lwwp" | "swwp"); setOInvest(null); setOJaz(null); }} style={{ fontFamily: v('--font-mono'), fontWeight: 700, color: v('--color-accent'), background: v('--color-accent-dim'), border: `1px solid ${v('--color-accent')}`, borderRadius: v('--radius-sm'), padding: "2px 6px", fontSize: 13 }}>
                    {WP_TYPE.map(w => <option key={w.id} value={w.id}>{w.label}</option>)}
                  </select>
                </div>
                <div><GlossaryTerm id="jaz">JAZ (Jahresarbeitszahl)</GlossaryTerm>: <InlineEdit value={result.jaz} onCommit={v => setOJaz(v)} unit="" min={2.0} max={5.5} step={0.1} width={60} fmt={v => v.toFixed(2).replace(".", ",")} /></div>
                <div>Gaspreis: <InlineEdit value={Math.round((oGasPrice ?? fuel.price) * 100 * 100) / 100} onCommit={v => setOGasPrice(v / 100)} unit=" ct/kWh" min={3} max={40} step={0.5} width={70} /></div>
                <div>WP-Strompreis: <InlineEdit value={Math.round((oStromPrice ?? DEFAULT_HEATPUMP_CONFIG.wpTarif) * 100 * 100) / 100} onCommit={v => setOStromPrice(v / 100)} unit=" ct/kWh" min={10} max={60} step={0.5} width={70} /></div>
                <div>Investition (netto): <InlineEdit value={result.investNetto} onCommit={v => setOInvest(v)} unit=" €" min={5000} max={80000} step={500} width={90} />{situation === "bestand" ? <span style={{ fontSize: 12, color: v('--color-text-muted') }}> · nach {Math.round(result.beg.rate * 100)} % Förderung</span> : null}</div>
              </div>
            </div>

            {/* Sekundäre Stats */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8, marginBottom: 16 }}>
              <StatCard label="Amortisation" value={result.amortisationsJahre !== null ? `${result.amortisationsJahre} J` : "> 20 J"} positive={result.amortisationsJahre !== null && result.amortisationsJahre <= 15} />
              <StatCard label="⌀ Ersparnis/Jahr" value={`${result.einsparungProJahr.toLocaleString("de-DE")} €`} positive={result.einsparungProJahr > 0} />
              <StatCard
                label="CO₂ 20 J"
                value={`${Math.round(result.co2Einsparung / 1000).toLocaleString("de-DE")} t`}
                positive={result.co2Einsparung > 0}
                helpTitle="CO₂-Einsparung"
                helpAriaLabel="Was bedeutet die CO₂-Zahl?"
                help="Vermiedener CO₂-Ausstoß über 20 Jahre: die Emissionen der fossilen Heizung minus die Emissionen aus dem Strom, den die Wärmepumpe verbraucht (deutscher Strommix). Es ist also netto eingespartes CO₂, nicht ausgestoßenes — der Stromverbrauch der Wärmepumpe ist schon abgezogen."
              />
            </div>

            {/* Chart */}
            <div style={{ background: v('--color-bg'), borderRadius: v('--radius-md'), padding: "16px 12px 8px", marginBottom: 16, border: `1px solid ${v('--color-border')}` }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: v('--color-text-muted'), textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 10, paddingLeft: 4 }}>
                Kumulierte Einsparung · 3 Szenarien
              </div>
              <HeatPumpChart
                scenarios={scenarios.map(s => ({ id: s.id, color: s.color, years: s.years, amortisationsJahre: s.amortisationsJahre }))}
                horizon={DEFAULT_HEATPUMP_CONFIG.years}
              />
              <div style={{ display: "flex", justifyContent: "center", gap: 16, marginTop: 10, fontSize: 11 }}>
                {scenarios.map(s => (
                  <span key={s.id} style={{ display: "inline-flex", alignItems: "center", gap: 4, color: v('--color-text-muted') }}>
                    <span style={{ width: 10, height: 2, background: s.color, borderRadius: 1 }} /> {s.label}
                  </span>
                ))}
              </div>
            </div>

            {/* Details aufklappbar */}
            <details
              open={showDetails}
              onToggle={e => setShowDetails((e.target as HTMLDetailsElement).open)}
              style={{ background: v('--color-bg'), borderRadius: v('--radius-md'), padding: "14px 16px", marginBottom: 16, border: `1px solid ${v('--color-border')}` }}
            >
              <summary style={{ fontSize: 14, fontWeight: 700, cursor: "pointer", listStyle: "none", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span>Rechnung im Detail</span>
                <span style={{ fontSize: 11, color: v('--color-text-muted'), fontWeight: 400, display: "inline-flex", alignItems: "center", gap: 4 }}>Aufschlüsseln <IconChevronDown size={10} /></span>
              </summary>
              <div style={{ marginTop: 14, fontSize: 13, color: v('--color-text-secondary'), lineHeight: 1.7 }}>
                <DetailGrid items={[
                  ["Heizwärme", `${result.qHeiz.toLocaleString("de-DE")} kWh`],
                  ["Warmwasser", `${result.qWw.toLocaleString("de-DE")} kWh`],
                  ["Gesamt thermisch", `${result.qGes.toLocaleString("de-DE")} kWh`],
                  ["Heizlast", `${result.heizlastKw.toLocaleString("de-DE")} kW`],
                  ["Vorlauftemperatur", `${result.flowTemp} °C`],
                  ["JAZ", result.jaz.toFixed(2).replace(".", ",")],
                  ["Strombedarf WP", `${result.eWp.toLocaleString("de-DE")} kWh`],
                  ["Invest brutto", `${result.investBrutto.toLocaleString("de-DE")} €`],
                  ["BEG-Förderung", `${(result.beg.rate * 100).toFixed(0)} % · ${result.beg.amount.toLocaleString("de-DE")} €`],
                  ["Invest netto", `${result.investNetto.toLocaleString("de-DE")} €`],
                  [`WP Strom 20 J`, `${result.stromKosten.toLocaleString("de-DE")} €`],
                  ["Gas Brennstoff 20 J", `${result.gasKosten.toLocaleString("de-DE")} €`],
                  ["Gas Grundgebühr 20 J", `${result.gasFix.toLocaleString("de-DE")} €`],
                  ["TCO Wärmepumpe", `${result.tcoWp.toLocaleString("de-DE")} €`],
                  ["TCO Gas-Referenz", `${result.tcoGas.toLocaleString("de-DE")} €`],
                ]} />

                {result.beg.breakdown.length > 0 && (
                  <div style={{ marginTop: -4, marginBottom: 12, paddingLeft: 2 }}>
                    {result.beg.breakdown.map(b => (
                      <div key={b.label} style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: v('--color-text-muted'), padding: "2px 0" }}>
                        <span>{b.label}</span>
                        <span style={{ fontFamily: v('--font-mono') }}>{(b.rate * 100).toFixed(0)} %</span>
                      </div>
                    ))}
                  </div>
                )}

                <div style={{ fontSize: 11, color: v('--color-text-muted'), borderTop: `1px solid ${v('--color-border')}`, paddingTop: 10, marginTop: 12, lineHeight: 1.6 }}>
                  Quellen: Fraunhofer ISE „WPsmart im Bestand" (JAZ-Modell), BWP Preisübersicht 2024 (Investition), BAFA/KfW BEG 2026 (Förderung), BDEW (Strom-/Gaspreise), dena-Gebäudereport &amp; DIN V 18599 (Heizwärmebedarf), BEHG + EU ETS2 (CO₂-Preispfad).
                </div>
                {inputs.situation === "bestand" && result.beg.amount > 0 && (
                  <div style={{ fontSize: 11, color: v('--color-text-muted'), paddingTop: 8, lineHeight: 1.6 }}>
                    Angenommen ist der Regelfall: selbstnutzender Eigentümer, Austausch einer funktionsfähigen fossilen Heizung, Wärmepumpe mit natürlichem Kältemittel. Die Förderung muss vor der Beauftragung bei der KfW beantragt werden — ob die Boni bei dir greifen, hängt von deiner individuellen Situation ab.
                  </div>
                )}
              </div>
            </details>

            {/* PV-Synergie */}
            <div style={{ background: v('--color-bg'), borderRadius: v('--radius-md'), padding: "14px 16px", marginBottom: 16, border: `1px solid ${pvStatus !== "nein" ? v('--color-accent') : v('--color-border')}` }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
                <IconSun size={16} color={v('--color-accent')} />
                <span style={{ fontSize: 14, fontWeight: 700 }}>Solaranlage einrechnen</span>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 6, marginBottom: pvStatus !== "nein" ? 14 : 0 }}>
                {([
                  { id: "nein", label: "Keine PV" },
                  { id: "geplant", label: "PV geplant" },
                  { id: "vorhanden", label: "PV vorhanden" },
                ] as const).map(opt => (
                  <button key={opt.id} onClick={() => setPvStatus(opt.id)} style={{
                    padding: "10px 4px", borderRadius: v('--radius-sm'), fontSize: 12, fontWeight: 700, cursor: "pointer", textAlign: "center",
                    background: pvStatus === opt.id ? v('--color-accent-dim') : v('--color-bg-muted'),
                    border: pvStatus === opt.id ? `2px solid ${v('--color-accent')}` : `2px solid ${v('--color-border')}`,
                    color: pvStatus === opt.id ? v('--color-accent') : v('--color-text-secondary'),
                  }}>{opt.label}</button>
                ))}
              </div>

              {pvStatus !== "nein" && (
                <div style={{ fontSize: 13, lineHeight: 2, borderTop: `1px solid ${v('--color-border')}`, paddingTop: 12 }}>
                  <div>Anlagengröße: <InlineEdit value={pvKwp} onCommit={v => setPvKwp(v)} unit=" kWp" min={2} max={30} step={0.5} width={60} fmt={v => (Math.round(v * 10) / 10).toString().replace(".", ",")} /></div>
                  <div>Batteriespeicher: <InlineEdit value={pvSpeicher} onCommit={v => setPvSpeicher(v)} unit=" kWh" min={0} max={30} step={1} width={60} /></div>
                  <div style={{ marginTop: 8, fontSize: 12, color: v('--color-text-muted'), lineHeight: 1.6 }}>
                    PV deckt <span style={{ fontWeight: 700, color: v('--color-positive'), fontFamily: v('--font-mono') }}>{Math.round(result.pvCoverage * 100)} %</span> des WP-Strombedarfs ({result.pvStromSavings.toLocaleString("de-DE")} € Ersparnis über {DEFAULT_HEATPUMP_CONFIG.years} Jahre)
                    {pvStatus === "geplant" && result.pvInvest > 0 && (
                      <> · PV-Invest <span style={{ fontFamily: v('--font-mono'), fontWeight: 700, color: v('--color-text-primary') }}>{result.pvInvest.toLocaleString("de-DE")} €</span> wird mit angerechnet</>
                    )}
                    {pvStatus === "vorhanden" && (
                      <> · PV-Invest bereits getätigt, wird nicht angerechnet</>
                    )}
                    <div style={{ marginTop: 4, fontSize: 11, color: v('--color-text-faint') }}>
                      Quelle: HTW Berlin Lastprofile. Winter-Schwäche berücksichtigt — realistische Bandbreite 10–30 %.
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Aktionen */}
            <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
              <Link href={`/photovoltaik-rechner${pvStatus !== "nein" ? `?a=${pvKwp <= 5 ? 0 : pvKwp <= 8 ? 1 : pvKwp <= 10 ? 2 : pvKwp <= 15 ? 3 : 4}${pvKwp > 15 ? `&ck=${pvKwp}` : ""}&s=${pvSpeicher === 0 ? 0 : pvSpeicher <= 5 ? 1 : pvSpeicher <= 10 ? 2 : 3}&wp=ja` : ""}`} style={{ flex: 1, padding: "12px", borderRadius: v('--radius-md'), fontSize: 13, fontWeight: 700, background: v('--color-accent'), border: "none", color: v('--color-text-on-accent'), cursor: "pointer", textDecoration: "none", textAlign: "center" }}>
                PV-Rechner öffnen <IconArrowRight size={12} />
              </Link>
              <button onClick={() => { setHeizkoerperTausch(false); setWegId("ist"); setKlimaBonus(true); setEffizienzBonus(true); setIncomeBonus(false); setOHeizlast(null); setHaustypIdx(0); setStep(0); }} style={{ flex: 1, padding: "12px", borderRadius: v('--radius-md'), fontSize: 13, fontWeight: 600, background: "transparent", border: `1px solid ${v('--color-border-muted')}`, color: v('--color-text-secondary'), cursor: "pointer" }}>
                <span style={{ display: "inline-flex", alignItems: "center", gap: 6, justifyContent: "center" }}><IconRefresh size={12} /> Neu berechnen</span>
              </button>
            </div>

            <div style={{ textAlign: "center", fontSize: 11, color: v('--color-text-faint'), padding: "8px 0" }}>
              Prognose basiert auf Durchschnittswerten. Genauigkeit ±15 %. Betrachtungszeitraum {DEFAULT_HEATPUMP_CONFIG.years} Jahre.
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Helpers ───────────────────────────────────────────────────

// Transparente Aufschlüsselung, wie die Einsparung zustande kommt (20-J-TCO).
// sanierungHinweis: erklärt, warum ein Sanierungs-Weg wirtschaftlich oft
// schwächer aussieht (weniger Heizbedarf = weniger ersetztes Gas).
function TcoBreakdown({ r, situation, jahre, sanierungHinweis }: { r: HeatPumpResult; situation: "bestand" | "neubau"; jahre: number; sanierungHinweis?: boolean }) {
  const euro = (n: number) => `${n.toLocaleString("de-DE")} €`;
  const Row = ({ label, val, strong, minus }: { label: string; val: number; strong?: boolean; minus?: boolean }) => (
    <div style={{ display: "flex", justifyContent: "space-between", gap: 12, padding: "1px 0", fontWeight: strong ? 700 : 400 }}>
      <span>{minus ? "− " : ""}{label}</span>
      <span style={{ fontFamily: v('--font-mono'), whiteSpace: "nowrap" }}>{euro(val)}</span>
    </div>
  );
  return (
    <div style={{ fontSize: 12, lineHeight: 1.5 }}>
      <div style={{ marginBottom: 8 }}>Alles über {jahre} Jahre gerechnet — die günstigere Variante gewinnt:</div>
      <div style={{ marginBottom: 8 }}>
        <div style={{ fontWeight: 700, marginBottom: 2 }}>Wärmepumpe kostet</div>
        <Row label="Investition (nach Förderung)" val={r.investNetto} />
        {r.pvInvest > 0 && <Row label="PV-Anlage" val={r.pvInvest} />}
        <Row label="Strom" val={r.stromKosten} />
        <Row label="Wartung" val={r.wartungWp} />
        <div style={{ borderTop: `1px solid ${v('--color-border')}`, marginTop: 2, paddingTop: 2 }}><Row label="Summe" val={r.tcoWp} strong /></div>
      </div>
      <div style={{ marginBottom: 8 }}>
        <div style={{ fontWeight: 700, marginBottom: 2 }}>{situation === "neubau" ? "Neue Gasheizung kostet" : "Gasheizung weiterbetreiben kostet"}</div>
        {r.gasInvest > 0 && <Row label="Neue Therme" val={r.gasInvest} />}
        <Row label="Brennstoff (inkl. steigendem CO₂-Preis)" val={r.gasKosten} />
        <Row label="Grundgebühr" val={r.gasFix} />
        <Row label="Wartung" val={r.gasWartung} />
        <div style={{ borderTop: `1px solid ${v('--color-border')}`, marginTop: 2, paddingTop: 2 }}><Row label="Summe" val={r.tcoGas} strong /></div>
      </div>
      <div style={{ borderTop: `1px solid ${v('--color-border')}`, paddingTop: 6 }}>
        <Row label={`Einsparung (${euro(r.tcoGas)} − ${euro(r.tcoWp)})`} val={r.tcoEinsparung} strong />
      </div>
      {sanierungHinweis && (
        <div style={{ marginTop: 8, paddingTop: 8, borderTop: `1px solid ${v('--color-border')}`, color: v('--color-text-muted'), lineHeight: 1.5 }}>
          Warum oft weniger als „nur Heizkörper tauschen"? Die Dämmung senkt den Heizbedarf — die Wärmepumpe ersetzt dadurch <strong>weniger teures Gas</strong>, also fällt die reine WP-Ersparnis kleiner aus. Der eigentliche Nutzen der Dämmung (dauerhaft weniger Energie und CO₂, egal mit welchem Heizsystem) steckt bewusst nicht in dieser Zahl — sie zeigt nur, wie sich die Wärmepumpe gegenüber Gas rechnet.
        </div>
      )}
    </div>
  );
}

function StatCard({ label, value, positive, help, helpTitle, helpAriaLabel }: { label: string; value: string; positive: boolean; help?: ReactNode; helpTitle?: string; helpAriaLabel?: string }) {
  return (
    <div style={{ padding: "14px 12px", borderRadius: v('--radius-md'), background: v('--color-bg'), border: `1px solid ${v('--color-border')}`, textAlign: "center" }}>
      <div style={{ fontSize: 10, fontWeight: 700, color: v('--color-text-muted'), textTransform: "uppercase", letterSpacing: "0.04em", marginBottom: 4, display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 3 }}>
        {label}
        {help && <InfoTooltip title={helpTitle} ariaLabel={helpAriaLabel ?? "Mehr Infos"} size={12}>{help}</InfoTooltip>}
      </div>
      <div style={{ fontSize: 18, fontWeight: 800, fontFamily: v('--font-mono'), color: positive ? v('--color-positive') : v('--color-text-primary') }}>{value}</div>
    </div>
  );
}

function BonusToggle({ checked, onChange, label, tipTitle, children }: { checked: boolean; onChange: (c: boolean) => void; label: string; tipTitle: string; children: ReactNode }) {
  return (
    <label style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 12, color: v('--color-text-secondary'), cursor: "pointer", marginBottom: 4 }}>
      <input type="checkbox" checked={checked} onChange={e => onChange(e.target.checked)} style={{ cursor: "pointer" }} />
      <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
        {label}
        <InfoTooltip title={tipTitle} ariaLabel={tipTitle}>{children}</InfoTooltip>
      </span>
    </label>
  );
}

function WegCard({ titel, kurz, r, active, onClick, situation, sanierung }: { titel: string; kurz: string; r: HeatPumpResult; active: boolean; onClick: () => void; situation: "bestand" | "neubau"; sanierung: boolean }) {
  const pos = r.tcoEinsparung >= 0;
  // Klickbares div statt <button>, damit das Info-Icon (selbst ein Button) kein
  // ungültiges verschachteltes Button ergibt. Tastatur-Bedienung nachgebildet.
  return (
    <div
      role="button" tabIndex={0} onClick={onClick}
      onKeyDown={e => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onClick(); } }}
      style={{
        display: "flex", alignItems: "center", gap: 12, width: "100%", textAlign: "left", cursor: "pointer",
        padding: "12px 14px", borderRadius: v('--radius-md'),
        background: active ? v('--color-accent-dim') : v('--color-bg'),
        border: active ? `2px solid ${v('--color-accent')}` : `1px solid ${v('--color-border')}`,
      }}>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          {active && <IconCheck size={14} color={v('--color-accent')} />}
          <span style={{ fontSize: 13.5, fontWeight: 700, color: v('--color-text-primary') }}>{titel}</span>
        </div>
        <div style={{ fontSize: 11.5, color: v('--color-text-muted'), marginTop: 2, lineHeight: 1.4 }}>{kurz}</div>
      </div>
      <div style={{ textAlign: "right", flexShrink: 0 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "flex-end", gap: 4 }}>
          <span style={{ fontSize: 16, fontWeight: 800, fontFamily: v('--font-mono'), color: pos ? v('--color-positive') : v('--color-negative') }}>
            {pos ? "+" : ""}{r.tcoEinsparung.toLocaleString("de-DE")} €
          </span>
          <span onClick={e => e.stopPropagation()} onKeyDown={e => e.stopPropagation()} style={{ display: "inline-flex" }}>
            <InfoTooltip title={`So rechnet sich „${titel}"`} ariaLabel={`Berechnung für ${titel}`}>
              <TcoBreakdown r={r} situation={situation} jahre={DEFAULT_HEATPUMP_CONFIG.years} sanierungHinweis={sanierung} />
            </InfoTooltip>
          </span>
        </div>
        <div style={{ fontSize: 11, color: v('--color-text-muted') }}>
          {r.amortisationsJahre !== null ? `Amortisation ${r.amortisationsJahre} J` : `Amortisation > ${DEFAULT_HEATPUMP_CONFIG.years} J`}
        </div>
      </div>
    </div>
  );
}

function DetailGrid({ items }: { items: [string, string][] }) {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px 16px", marginBottom: 12 }}>
      {items.map(([label, value]) => (
        <div key={label}>
          <div style={{ color: v('--color-text-muted'), fontSize: 11, textTransform: "uppercase", letterSpacing: "0.04em" }}>{label}</div>
          <div style={{ fontFamily: v('--font-mono'), fontWeight: 600, color: v('--color-text-primary') }}>{value}</div>
        </div>
      ))}
    </div>
  );
}
