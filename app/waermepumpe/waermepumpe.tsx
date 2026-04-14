"use client";
import { useState, useMemo } from "react";
import Link from "next/link";
import {
  SITUATION, WOHNFLAECHEN, INSULATION_BESTAND, INSULATION_NEUBAU,
  PERSONEN, HEIZSYSTEM, WP_TYPE, WP_FUEL_OPTIONS,
} from "../../lib/constants";
import { calcHeatPump, calcHeatPumpScenarios, type HeatPumpInputs } from "../../lib/heatpump";
import { DEFAULT_HEATPUMP_CONFIG } from "../../lib/heatpump-config";
import OptionCard from "../../components/OptionCard";
import InlineEdit from "../../components/InlineEdit";
import HeatPumpChart from "../../components/HeatPumpChart";
import Header from "../../components/Header";
import { IconArrowRight, IconRefresh, IconChevronDown } from "../../components/Icons";
import { v } from "../../lib/theme";

const STEPS = ["Situation", "Wohnfläche", "Dämmstandard", "Haushalt", "Heizsystem"];

// Average head count per PERSONEN-index (for kWh per person calc)
const AVG_PERSONS = [1, 2, 3.5, 5];

export default function Waermepumpe() {
  // ── Step state ───────────────────────────────────────────────
  const [step, setStep] = useState(0);
  const [situation, setSituation] = useState<"bestand" | "neubau">("bestand");
  const [flaecheIdx, setFlaecheIdx] = useState(1);         // 140 m² default
  const [customFlaeche, setCustomFlaeche] = useState<number | null>(null);
  const [insulationIdx, setInsulationIdx] = useState(1);   // teilsaniert / KfW 55
  const [personen, setPersonen] = useState(2);             // 3–4
  const [heizsystem, setHeizsystem] = useState<"fbh" | "hk_neu" | "hk_alt">("fbh");
  const [wpType, setWpType] = useState<"lwwp" | "swwp">("lwwp");

  // ── Result overrides (editable) ──────────────────────────────
  const [oGasPrice, setOGasPrice] = useState<number | null>(null);
  const [oStromPrice, setOStromPrice] = useState<number | null>(null);
  const [oFuel, setOFuel] = useState<string>("gas_neu");
  const [oJaz, setOJaz] = useState<number | null>(null);
  const [oInvest, setOInvest] = useState<number | null>(null);
  const [oQges, setOQges] = useState<number | null>(null);
  const [incomeBonus, setIncomeBonus] = useState(false);
  const [showDetails, setShowDetails] = useState(false);

  const isResult = step >= STEPS.length;
  const next = () => step < STEPS.length && setStep(step + 1);
  const back = () => step > 0 && setStep(step - 1);

  // ── Resolved wohnfläche ──────────────────────────────────────
  const wohnflaeche = customFlaeche ?? WOHNFLAECHEN[flaecheIdx].m2;

  // ── Build inputs + calculate ─────────────────────────────────
  const fuel = WP_FUEL_OPTIONS.find(f => f.id === oFuel) ?? WP_FUEL_OPTIONS[0];
  const inputs: HeatPumpInputs = useMemo(() => ({
    situation, wohnflaeche, insulationIdx,
    personen: AVG_PERSONS[personen],
    heizsystem, wpType,
    override: {
      qGes: oQges ?? undefined,
      jaz: oJaz ?? undefined,
      investNetto: oInvest ?? undefined,
      stromPrice: oStromPrice ?? undefined,
      gasPrice: oGasPrice ?? fuel.price,
      gasEfficiency: fuel.efficiency,
      gasCo2: fuel.co2PerKwh,
      incomeBonus,
    },
  }), [situation, wohnflaeche, insulationIdx, personen, heizsystem, wpType, oQges, oJaz, oInvest, oStromPrice, oGasPrice, fuel, incomeBonus]);

  const result = useMemo(() => calcHeatPump(inputs), [inputs]);
  const scenarios = useMemo(() => calcHeatPumpScenarios(inputs), [inputs]);

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
          <p style={{ fontSize: 13, color: v('--color-text-muted'), marginTop: 6 }}>
            {isResult ? "Alle Werte kannst du anpassen." : "Fünf Fragen, ehrlich berechnet. Keine Anmeldung."}
          </p>
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
                      value={customFlaeche ?? ""} onChange={e => {
                        const n = parseInt(e.target.value.replace(/\D/g, ""));
                        if (!isNaN(n) && n >= 30 && n <= 500) setCustomFlaeche(n);
                        else if (e.target.value === "") setCustomFlaeche(null);
                      }}
                      style={{ width: 70, textAlign: "right", fontSize: 13, fontWeight: 700, fontFamily: v('--font-mono'), background: v('--color-bg'), border: `1px solid ${v('--color-border')}`, borderRadius: v('--radius-sm'), padding: "6px 8px", outline: "none" }}
                    />
                    <span style={{ fontSize: 12, color: v('--color-text-muted') }}>m²</span>
                  </span>
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
            {/* Hero: TCO-Differenz */}
            <div style={{ padding: "24px 20px", marginBottom: 16, background: v('--color-bg-accent'), borderRadius: v('--radius-lg'), border: `1px solid ${v('--color-border-accent')}` }}>
              <div style={{ fontSize: 12, color: v('--color-text-secondary'), textTransform: "uppercase", letterSpacing: "0.06em", fontWeight: 600, marginBottom: 8, textAlign: "center" }}>
                Einsparung über {DEFAULT_HEATPUMP_CONFIG.years} Jahre
              </div>
              <div style={{ fontSize: 42, fontWeight: 800, color: result.tcoEinsparung >= 0 ? v('--color-positive') : v('--color-negative'), fontFamily: v('--font-mono'), lineHeight: 1.1, textAlign: "center" }}>
                {result.tcoEinsparung >= 0 ? "+" : ""}{result.tcoEinsparung.toLocaleString("de-DE")} €
              </div>
              <div style={{ fontSize: 13, color: v('--color-text-muted'), marginTop: 6, textAlign: "center" }}>
                vs. {situation === "neubau" ? "Gas-Brennwertkessel neu" : "Weiterbetrieb fossile Heizung"}
              </div>

              {/* Editierbare Kernannahmen */}
              <div style={{ marginTop: 18, borderTop: `1px solid ${v('--color-border-accent')}`, paddingTop: 14, fontSize: 13, lineHeight: 2 }}>
                <div>Heizwärmebedarf: <InlineEdit value={result.qGes} onCommit={v => setOQges(v)} unit=" kWh" min={1000} max={80000} step={500} width={90} /></div>
                <div>JAZ (Jahresarbeitszahl): <InlineEdit value={result.jaz} onCommit={v => setOJaz(v)} unit="" min={2.0} max={5.5} step={0.1} width={60} fmt={v => v.toFixed(2).replace(".", ",")} /></div>
                <div>
                  Referenzheizung:{" "}
                  <select value={oFuel} onChange={e => setOFuel(e.target.value)} style={{ fontFamily: v('--font-mono'), fontWeight: 700, color: v('--color-accent'), background: v('--color-accent-dim'), border: `1px solid ${v('--color-accent')}`, borderRadius: v('--radius-sm'), padding: "2px 6px", fontSize: 13 }}>
                    {WP_FUEL_OPTIONS.map(f => <option key={f.id} value={f.id}>{f.label}</option>)}
                  </select>
                </div>
                <div>Gaspreis: <InlineEdit value={Math.round((oGasPrice ?? fuel.price) * 100 * 100) / 100} onCommit={v => setOGasPrice(v / 100)} unit=" ct/kWh" min={3} max={40} step={0.5} width={70} /></div>
                <div>WP-Strompreis: <InlineEdit value={Math.round((oStromPrice ?? DEFAULT_HEATPUMP_CONFIG.wpTarif) * 100 * 100) / 100} onCommit={v => setOStromPrice(v / 100)} unit=" ct/kWh" min={10} max={60} step={0.5} width={70} /></div>
                <div>Investition (netto): <InlineEdit value={result.investNetto} onCommit={v => setOInvest(v)} unit=" €" min={5000} max={80000} step={500} width={90} /></div>
                {situation === "bestand" && (
                  <div style={{ marginTop: 6 }}>
                    <label style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 12, color: v('--color-text-secondary'), cursor: "pointer" }}>
                      <input type="checkbox" checked={incomeBonus} onChange={e => { setIncomeBonus(e.target.checked); setOInvest(null); }} style={{ cursor: "pointer" }} />
                      Einkommens-Bonus BEG (HH-Einkommen ≤ 40.000 €)
                    </label>
                  </div>
                )}
              </div>
            </div>

            {/* Sekundäre Stats */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8, marginBottom: 16 }}>
              <StatCard label="Amortisation" value={result.amortisationsJahre !== null ? `${result.amortisationsJahre} J` : "> 20 J"} positive={result.amortisationsJahre !== null && result.amortisationsJahre <= 15} />
              <StatCard label="⌀ Ersparnis/Jahr" value={`${result.einsparungProJahr.toLocaleString("de-DE")} €`} positive={result.einsparungProJahr > 0} />
              <StatCard label="CO₂ 20 J" value={`${Math.round(result.co2Einsparung / 1000).toLocaleString("de-DE")} t`} positive={result.co2Einsparung > 0} />
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
                  ["Heizlast", `${result.heizlastKw} kW`],
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
                <div style={{ fontSize: 11, color: v('--color-text-muted'), borderTop: `1px solid ${v('--color-border')}`, paddingTop: 10, marginTop: 12, lineHeight: 1.6 }}>
                  Quellen: Fraunhofer ISE „WPsmart im Bestand" (JAZ-Modell), BWP Preisübersicht 2024 (Investition), BAFA/KfW BEG 2026 (Förderung), BDEW (Strom-/Gaspreise), dena-Gebäudereport &amp; DIN V 18599 (Heizwärmebedarf), BEHG + EU ETS2 (CO₂-Preispfad).
                </div>
              </div>
            </details>

            {/* Aktionen */}
            <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
              <Link href="/rechner" style={{ flex: 1, padding: "12px", borderRadius: v('--radius-md'), fontSize: 13, fontWeight: 700, background: v('--color-accent'), border: "none", color: v('--color-text-on-accent'), cursor: "pointer", textDecoration: "none", textAlign: "center" }}>
                PV dazu rechnen <IconArrowRight size={12} />
              </Link>
              <button onClick={() => setStep(0)} style={{ flex: 1, padding: "12px", borderRadius: v('--radius-md'), fontSize: 13, fontWeight: 600, background: "transparent", border: `1px solid ${v('--color-border-muted')}`, color: v('--color-text-secondary'), cursor: "pointer" }}>
                <span style={{ display: "inline-flex", alignItems: "center", gap: 6, justifyContent: "center" }}><IconRefresh size={12} /> Neu berechnen</span>
              </button>
            </div>

            <div style={{ textAlign: "center", fontSize: 11, color: v('--color-text-faint'), padding: "8px 0" }}>
              Prognose basiert auf Durchschnittswerten. Genauigkeit ±15 %. Betrachtungszeitraum {DEFAULT_HEATPUMP_CONFIG.years} Jahre.
            </div>
          </div>
        )}

        {/* Footer */}
        <div style={{ display: "flex", justifyContent: "center", gap: 16, padding: "24px 0 16px" }}>
          <Link href="/methodik" style={{ fontSize: 11, color: v('--color-text-faint'), textDecoration: "none" }}>Methodik</Link>
          <Link href="/impressum" style={{ fontSize: 11, color: v('--color-text-faint'), textDecoration: "none" }}>Impressum</Link>
          <Link href="/datenschutz" style={{ fontSize: 11, color: v('--color-text-faint'), textDecoration: "none" }}>Datenschutz</Link>
          <Link href="/kontakt" style={{ fontSize: 11, color: v('--color-text-faint'), textDecoration: "none" }}>Kontakt</Link>
        </div>
      </div>
    </div>
  );
}

// ─── Helpers ───────────────────────────────────────────────────

function StatCard({ label, value, positive }: { label: string; value: string; positive: boolean }) {
  return (
    <div style={{ padding: "14px 12px", borderRadius: v('--radius-md'), background: v('--color-bg'), border: `1px solid ${v('--color-border')}`, textAlign: "center" }}>
      <div style={{ fontSize: 10, fontWeight: 700, color: v('--color-text-muted'), textTransform: "uppercase", letterSpacing: "0.04em", marginBottom: 4 }}>{label}</div>
      <div style={{ fontSize: 18, fontWeight: 800, fontFamily: v('--font-mono'), color: positive ? v('--color-positive') : v('--color-text-primary') }}>{value}</div>
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
