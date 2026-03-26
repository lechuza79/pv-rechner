"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { PERSONEN, NUTZUNG, TRI, EA_KM_PRESETS, HAUSTYPEN, DACHARTEN, SPEICHER } from "../../lib/constants";
import { estimateCost } from "../../lib/calc";
import { recommend } from "../../lib/recommend";
import OptionCard from "../../components/OptionCard";
import TriToggle from "../../components/TriToggle";
import { v } from "../../lib/theme";
import Logo from "../../components/Logo";

export default function Empfehlung() {
  const router = useRouter();
  const [step, setStep] = useState(0);

  // Step 0: Haus + Dach
  const [haustyp, setHaustyp] = useState(2); // EFH default
  const [dachart, setDachart] = useState(0); // Satteldach default

  // Step 1: Haushalt
  const [personen, setPersonen] = useState(1);
  const [nutzung, setNutzung] = useState(1);

  // Step 2: WP / E-Auto
  const [wp, setWp] = useState("nein");
  const [ea, setEa] = useState("nein");
  const [eaKm, setEaKm] = useState(15000);

  const STEPS = ["Dein Haus", "Dein Haushalt", "Großverbraucher"];
  const isRecommendation = step >= STEPS.length;
  const next = () => step < STEPS.length && setStep(step + 1);
  const back = () => step > 0 && setStep(step - 1);

  // Empfehlung berechnen
  const rec = isRecommendation ? recommend({
    personen, nutzung, wp, ea, eaKm,
    haustyp, dachart, budgetLimit: null,
  }) : null;

  const goToResult = (kwp: number, speicherIdx: number) => {
    const anlageIdx = kwp <= 5 ? 0 : kwp <= 8 ? 1 : kwp <= 10 ? 2 : kwp <= 15 ? 3 : 4;
    const p = new URLSearchParams();
    p.set("a", String(anlageIdx));
    if (anlageIdx === 4) p.set("ck", String(kwp));
    p.set("s", String(speicherIdx));
    p.set("p", String(personen));
    p.set("n", String(nutzung));
    p.set("wp", wp);
    p.set("ea", ea);
    if (ea !== "nein") p.set("km", String(eaKm));
    p.set("flow", "emp");
    p.set("ht", String(haustyp));
    p.set("da", String(dachart));
    router.push(`/rechner?${p.toString()}`);
  };

  // Finde den passenden SPEICHER-Index für eine kWh-Angabe
  const findSpeicherIdx = (kwh: number) => {
    const idx = SPEICHER.findIndex(s => s.kwh === kwh);
    return idx >= 0 ? idx : 0;
  };

  return (
    <div style={{ background: v('--color-bg'), fontFamily: v('--font-text'), color: v('--color-text-primary'), minHeight: "100vh", padding: "20px 16px" }}>
      <div style={{ maxWidth: v('--page-max-width'), margin: "0 auto" }}>

        {/* Header */}
        <div style={{ textAlign: "center", marginBottom: 24 }}>
          <Link href="/" style={{ textDecoration: "none" }}>
            <Logo height={24} />
          </Link>
          <h1 style={{ fontSize: 20, fontWeight: 800, letterSpacing: "-0.02em", color: v('--color-text-primary'), lineHeight: 1.2 }}>Was passt zu dir?</h1>
          <p style={{ fontSize: 13, color: v('--color-text-muted'), marginTop: 6 }}>Wir empfehlen dir die optimale Anlage.</p>
        </div>

        {/* Progress */}
        {!isRecommendation && (
          <div style={{ display: "flex", gap: 4, marginBottom: 28 }}>
            {STEPS.map((_, i) => (
              <div key={i} style={{ flex: 1, height: 3, borderRadius: 2, background: i <= step ? v('--color-accent') : v('--color-progress-inactive'), transition: "background 0.3s" }} />
            ))}
          </div>
        )}

        {/* ── STEPS ── */}
        {!isRecommendation && (
          <div className="fu" key={step}>
            <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 18, color: v('--color-text-primary') }}>{STEPS[step]}</h2>

            {/* Step 0: Haus + Dach */}
            {step === 0 && (
              <div>
                <div style={{ fontSize: 13, fontWeight: 600, color: v('--color-text-muted'), marginBottom: 8, textTransform: "uppercase", letterSpacing: "0.04em" }}>Haustyp</div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 18 }}>
                  {HAUSTYPEN.map((h, i) => (
                    <OptionCard key={i} selected={haustyp === i} onClick={() => setHaustyp(i)} label={h.label} sub={h.sub} />
                  ))}
                </div>
                <div style={{ fontSize: 13, fontWeight: 600, color: v('--color-text-muted'), marginBottom: 8, textTransform: "uppercase", letterSpacing: "0.04em" }}>Dachart</div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                  {DACHARTEN.map((d, i) => (
                    <OptionCard key={i} selected={dachart === i} onClick={() => setDachart(i)} label={d.label} sub={d.sub} />
                  ))}
                </div>
              </div>
            )}

            {/* Step 1: Haushalt */}
            {step === 1 && (
              <div>
                <div style={{ fontSize: 13, fontWeight: 600, color: v('--color-text-muted'), marginBottom: 8, textTransform: "uppercase", letterSpacing: "0.04em" }}>Personen im Haushalt</div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 6, marginBottom: 20 }}>
                  {PERSONEN.map((p, i) => (
                    <button key={i} onClick={() => setPersonen(i)} style={{
                      padding: "10px 4px", borderRadius: v('--radius-md'), fontSize: 14, fontWeight: 700, cursor: "pointer", textAlign: "center",
                      background: personen === i ? v('--color-accent-dim') : v('--color-bg-muted'),
                      border: personen === i ? `2px solid ${v('--color-accent')}` : `2px solid ${v('--color-border')}`,
                      color: personen === i ? v('--color-accent') : v('--color-text-secondary'),
                    }}>{p.label}</button>
                  ))}
                </div>
                <div style={{ fontSize: 13, fontWeight: 600, color: v('--color-text-muted'), marginBottom: 8, textTransform: "uppercase", letterSpacing: "0.04em" }}>Nutzungsprofil</div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                  {NUTZUNG.map((n, i) => (
                    <OptionCard key={i} selected={nutzung === i} onClick={() => setNutzung(i)} label={n.label} sub={n.sub} />
                  ))}
                </div>
              </div>
            )}

            {/* Step 2: WP / E-Auto */}
            {step === 2 && (
              <div>
                <TriToggle label="⚡ Wärmepumpe" options={TRI} value={wp} onChange={setWp} />
                <div style={{ fontSize: 12, color: v('--color-text-muted'), marginTop: -10, marginBottom: 16, lineHeight: 1.5, paddingLeft: 2 }}>
                  Eine Wärmepumpe erhöht deinen Stromverbrauch um ~3.500 kWh/Jahr — eine größere PV-Anlage lohnt sich dann besonders.
                </div>
                <TriToggle label="🚗 Elektroauto" options={TRI} value={ea} onChange={setEa} />
                {ea !== "nein" && (
                  <div style={{ marginBottom: 18, marginTop: -10 }}>
                    <div style={{ fontSize: 12, fontWeight: 600, color: v('--color-text-secondary'), marginBottom: 6 }}>Laufleistung ca.</div>
                    <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                      {EA_KM_PRESETS.map(km => (
                        <button key={km} onClick={() => setEaKm(km)} style={{
                          padding: "7px 10px", borderRadius: v('--radius-sm'), fontSize: 12, fontWeight: 600, cursor: "pointer",
                          background: eaKm === km ? v('--color-accent-dim') : v('--color-bg-muted'),
                          border: eaKm === km ? `1.5px solid ${v('--color-accent')}` : `1.5px solid ${v('--color-border')}`,
                          color: eaKm === km ? v('--color-accent') : v('--color-text-muted'),
                        }}>{(km / 1000).toFixed(0)}k</button>
                      ))}
                      <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
                        <input
                          value={EA_KM_PRESETS.includes(eaKm) ? "" : String(eaKm)}
                          placeholder="km"
                          onChange={e => {
                            const n = parseInt(e.target.value.replace(/\D/g, ""));
                            if (!isNaN(n) && n >= 1000 && n <= 50000) setEaKm(n);
                          }}
                          style={{
                            width: 56, textAlign: "center", fontSize: 12, fontWeight: 600,
                            fontFamily: v('--font-mono'),
                            color: !EA_KM_PRESETS.includes(eaKm) ? v('--color-accent') : v('--color-text-muted'),
                            background: !EA_KM_PRESETS.includes(eaKm) ? v('--color-accent-dim') : v('--color-bg-muted'),
                            border: !EA_KM_PRESETS.includes(eaKm) ? `1.5px solid ${v('--color-accent')}` : `1.5px solid ${v('--color-border')}`,
                            borderRadius: v('--radius-sm'), padding: "7px 4px", outline: "none",
                          }}
                        />
                        <span style={{ fontSize: 11, color: v('--color-text-muted') }}>km</span>
                      </span>
                    </div>
                  </div>
                )}
                {ea === "nein" && (
                  <div style={{ fontSize: 12, color: v('--color-text-muted'), marginTop: -10, marginBottom: 8, lineHeight: 1.5, paddingLeft: 2 }}>
                    Ein E-Auto erhöht deinen Verbrauch um ~2.700 kWh/Jahr (bei 15.000 km) — gut für die PV-Rentabilität.
                  </div>
                )}
              </div>
            )}

            {/* Navigation */}
            <div style={{ display: "flex", justifyContent: "space-between", marginTop: 24 }}>
              {step > 0 ? (
                <button onClick={back} style={{ padding: "10px 20px", borderRadius: v('--radius-md'), fontSize: 14, fontWeight: 600, background: "transparent", border: `1px solid ${v('--color-border-muted')}`, color: v('--color-text-secondary'), cursor: "pointer" }}>Zurück</button>
              ) : (
                <Link href="/" style={{ padding: "10px 20px", borderRadius: v('--radius-md'), fontSize: 14, fontWeight: 600, background: "transparent", border: `1px solid ${v('--color-border-muted')}`, color: v('--color-text-secondary'), cursor: "pointer", textDecoration: "none", display: "inline-flex", alignItems: "center" }}>Zurück</Link>
              )}
              <button onClick={next} style={{ padding: "10px 32px", borderRadius: v('--radius-md'), fontSize: 14, fontWeight: 700, background: v('--color-accent'), border: "none", color: v('--color-text-on-accent'), cursor: "pointer" }}>
                {step === STEPS.length - 1 ? "Empfehlung anzeigen ✦" : "Weiter →"}
              </button>
            </div>
          </div>
        )}

        {/* ── RECOMMENDATION ── */}
        {isRecommendation && rec && (
          <div className="fu">
            {/* Hero */}
            <div style={{
              textAlign: "center", padding: "24px 20px 20px", marginBottom: 16,
              background: v('--color-bg-accent'), borderRadius: v('--radius-lg'), border: `1px solid ${v('--color-border-accent')}`,
            }}>
              <div style={{ fontSize: 12, color: v('--color-text-secondary'), textTransform: "uppercase", letterSpacing: "0.06em", fontWeight: 600, marginBottom: 8 }}>
                Unsere Empfehlung
              </div>
              <div style={{ fontSize: 42, fontWeight: 800, color: v('--color-accent'), fontFamily: v('--font-mono'), lineHeight: 1.1 }}>
                {rec.kwp} kWp
              </div>
              {rec.speicherKwh > 0 && (
                <div style={{ fontSize: 22, fontWeight: 700, color: v('--color-text-primary'), fontFamily: v('--font-mono'), marginTop: 4 }}>
                  + {rec.speicherKwh} kWh Speicher
                </div>
              )}
              <div style={{ fontSize: 14, color: v('--color-text-secondary'), marginTop: 12 }}>
                Geschätzte Investition: <span style={{ fontWeight: 700, color: v('--color-text-primary'), fontFamily: v('--font-mono') }}>{rec.reasoning.investition.toLocaleString("de-DE")} €</span>
              </div>
              {rec.reasoning.paybackYears && (
                <div style={{ fontSize: 13, color: v('--color-text-muted'), marginTop: 4 }}>
                  Amortisation in ca. {rec.reasoning.paybackYears} Jahren
                </div>
              )}
              {rec.reasoning.budgetConstrained && (
                <div style={{ fontSize: 12, color: v('--color-negative'), marginTop: 8, fontWeight: 600 }}>
                  Budget-begrenzt — ohne Limit wäre mehr möglich
                </div>
              )}
            </div>

            {/* Warum-Details */}
            <details style={{
              background: v('--color-bg'), borderRadius: v('--radius-md'), padding: "14px 16px", marginBottom: 16,
              border: `1px solid ${v('--color-border')}`,
            }}>
              <summary style={{ fontSize: 14, fontWeight: 700, color: v('--color-text-primary'), cursor: "pointer", listStyle: "none", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span>Warum diese Konfiguration?</span>
                <span style={{ fontSize: 11, color: v('--color-text-muted'), fontWeight: 400 }}>Details ▾</span>
              </summary>
              <div style={{ marginTop: 14, fontSize: 13, color: v('--color-text-muted'), lineHeight: 1.7 }}>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px 16px", marginBottom: 12 }}>
                  <div>
                    <div style={{ color: v('--color-text-secondary'), fontSize: 11, textTransform: "uppercase", letterSpacing: "0.04em" }}>Grundverbrauch</div>
                    <div style={{ fontFamily: v('--font-mono'), fontWeight: 600, color: v('--color-text-primary') }}>{rec.reasoning.baseConsumption.toLocaleString("de-DE")} kWh</div>
                  </div>
                  {rec.reasoning.wpConsumption > 0 && (
                    <div>
                      <div style={{ color: v('--color-text-secondary'), fontSize: 11, textTransform: "uppercase", letterSpacing: "0.04em" }}>+ Wärmepumpe</div>
                      <div style={{ fontFamily: v('--font-mono'), fontWeight: 600, color: v('--color-text-primary') }}>{rec.reasoning.wpConsumption.toLocaleString("de-DE")} kWh</div>
                    </div>
                  )}
                  {rec.reasoning.eaConsumption > 0 && (
                    <div>
                      <div style={{ color: v('--color-text-secondary'), fontSize: 11, textTransform: "uppercase", letterSpacing: "0.04em" }}>+ E-Auto</div>
                      <div style={{ fontFamily: v('--font-mono'), fontWeight: 600, color: v('--color-text-primary') }}>{rec.reasoning.eaConsumption.toLocaleString("de-DE")} kWh</div>
                    </div>
                  )}
                  <div>
                    <div style={{ color: v('--color-text-secondary'), fontSize: 11, textTransform: "uppercase", letterSpacing: "0.04em" }}>Gesamt</div>
                    <div style={{ fontFamily: v('--font-mono'), fontWeight: 700, color: v('--color-text-primary') }}>{rec.reasoning.totalConsumption.toLocaleString("de-DE")} kWh</div>
                  </div>
                  <div>
                    <div style={{ color: v('--color-text-secondary'), fontSize: 11, textTransform: "uppercase", letterSpacing: "0.04em" }}>Dachfläche nutzbar</div>
                    <div style={{ fontFamily: v('--font-mono'), fontWeight: 600, color: v('--color-text-primary') }}>~{rec.reasoning.nutzbarM2} m²</div>
                  </div>
                  <div>
                    <div style={{ color: v('--color-text-secondary'), fontSize: 11, textTransform: "uppercase", letterSpacing: "0.04em" }}>Max. Anlagengröße</div>
                    <div style={{ fontFamily: v('--font-mono'), fontWeight: 600, color: v('--color-text-primary') }}>{rec.reasoning.maxRoofKwp} kWp</div>
                  </div>
                  <div>
                    <div style={{ color: v('--color-text-secondary'), fontSize: 11, textTransform: "uppercase", letterSpacing: "0.04em" }}>Eigenverbrauch</div>
                    <div style={{ fontFamily: v('--font-mono'), fontWeight: 700, color: v('--color-text-primary') }}>{rec.reasoning.eigenverbrauch}%</div>
                  </div>
                  {rec.speicherKwh > 0 && (
                    <div>
                      <div style={{ color: v('--color-text-secondary'), fontSize: 11, textTransform: "uppercase", letterSpacing: "0.04em" }}>Ohne Speicher</div>
                      <div style={{ fontFamily: v('--font-mono'), fontWeight: 600, color: v('--color-text-secondary') }}>{rec.reasoning.eigenverbrauchOhneSpeicher}%</div>
                    </div>
                  )}
                </div>
                <div style={{ fontSize: 12, color: v('--color-text-muted'), borderTop: `1px solid ${v('--color-border')}`, paddingTop: 10, lineHeight: 1.6 }}>
                  {rec.kwp < rec.reasoning.maxRoofKwp
                    ? `${rec.kwp} kWp ist für deinen Verbrauch optimal dimensioniert — größere Anlagen senken den Eigenverbrauchsanteil.`
                    : `Die Empfehlung nutzt die maximale Dachfläche deines ${HAUSTYPEN[haustyp].label}s.`
                  }
                  {rec.speicherKwh > 0 && ` Der ${rec.speicherKwh} kWh Speicher steigert den Eigenverbrauch von ${rec.reasoning.eigenverbrauchOhneSpeicher}% auf ${rec.reasoning.eigenverbrauch}%.`}
                </div>
              </div>
            </details>

            {/* CTA */}
            <button onClick={() => goToResult(rec.kwp, rec.speicherIdx)} style={{
              width: "100%", padding: "14px", borderRadius: v('--radius-md'), fontSize: 15, fontWeight: 700,
              background: v('--color-accent'), border: "none", color: v('--color-text-on-accent'), cursor: "pointer",
              fontFamily: v('--font-text'), marginBottom: 16,
            }}>
              Ergebnis anzeigen →
            </button>

            {/* Alternativen */}
            {rec.alternatives.length > 0 && (
              <div style={{ marginBottom: 16 }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: v('--color-text-muted'), textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 10 }}>Alternativen</div>
                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  {rec.alternatives.map((alt, i) => (
                    <button key={i} onClick={() => goToResult(alt.kwp, findSpeicherIdx(alt.speicherKwh))} style={{
                      background: v('--color-bg'), borderRadius: v('--radius-md'), padding: "14px 16px", border: `1px solid ${v('--color-border')}`,
                      cursor: "pointer", textAlign: "left", width: "100%",
                    }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
                        <span style={{ fontSize: 13, fontWeight: 700, color: v('--color-text-primary') }}>{alt.label}</span>
                        <span style={{ fontSize: 13, fontWeight: 700, fontFamily: v('--font-mono'), color: v('--color-text-secondary') }}>
                          {alt.kwp} kWp{alt.speicherKwh > 0 ? ` + ${alt.speicherKwh} kWh` : ""}
                        </span>
                      </div>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <span style={{ fontSize: 12, color: v('--color-text-muted') }}>{alt.reason}</span>
                        <span style={{ fontSize: 12, fontFamily: v('--font-mono'), color: v('--color-text-secondary') }}>
                          {alt.investition.toLocaleString("de-DE")} €
                        </span>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Zurück */}
            <button onClick={() => setStep(STEPS.length - 1)} style={{
              width: "100%", padding: "12px", borderRadius: v('--radius-md'), fontSize: 13, fontWeight: 600,
              background: "transparent", border: `1px solid ${v('--color-border-muted')}`, color: v('--color-text-secondary'), cursor: "pointer",
            }}>↺ Eingaben ändern</button>

            <div style={{ textAlign: "center", fontSize: 11, color: v('--color-text-faint'), padding: "20px 0 8px", lineHeight: 1.6 }}>
              Die Empfehlung basiert auf Durchschnittswerten. Auf der Ergebnisseite kannst du alle Annahmen anpassen.
            </div>
          </div>
        )}

        {/* Footer */}
        <div style={{ display: "flex", justifyContent: "center", gap: 16, padding: "24px 0 16px" }}>
          <Link href="/methodik" style={{ fontSize: 11, color: v('--color-text-faint'), textDecoration: "none" }}>Methodik</Link>
          <Link href="/impressum" style={{ fontSize: 11, color: v('--color-text-faint'), textDecoration: "none" }}>Impressum</Link>
          <Link href="/datenschutz" style={{ fontSize: 11, color: v('--color-text-faint'), textDecoration: "none" }}>Datenschutz</Link>
        </div>
      </div>
    </div>
  );
}
