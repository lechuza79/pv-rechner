"use client";
import { useState, useMemo, useEffect, useCallback } from "react";
import Link from "next/link";
import { useUser, signInWithMagicLink, signOut } from "../../lib/auth";
import { paramsToRow } from "../../lib/types";
import { YEAR, YEARS, CONSUMPTION_MONTHLY, FUEL, ANLAGEN, SPEICHER, PERSONEN, NUTZUNG, TRI, EA_KM_PRESETS, SCENARIOS, SHARE_KEYS, HAUSTYPEN, DACHARTEN } from "../../lib/constants";
import { calcFuelCost25, calcWpGridCost25, estimateCost, calcEigenverbrauch, calc, paramInt, paramFloat, paramStr } from "../../lib/calc";
import OptionCard from "../../components/OptionCard";
import TriToggle from "../../components/TriToggle";
import InlineEdit from "../../components/InlineEdit";
import Chart from "../../components/Chart";
import { v } from "../../lib/theme";
import Logo from "../../components/Logo";

// ─── Main ────────────────────────────────────────────────────────────────────
export default function PVRechner({ initialParams }: { initialParams?: Record<string, string | string[] | undefined> }) {
  const hasShare = initialParams && SHARE_KEYS.some(k => k in initialParams);

  const [step, setStep] = useState(hasShare ? 4 : 0);
  const [anlage, setAnlage] = useState(hasShare ? paramInt(initialParams, "a", 2, 0, 4) : 2);
  const [customKwp, setCustomKwp] = useState(hasShare ? paramInt(initialParams, "ck", 12, 1, 50) : 12);
  const [speicher, setSpeicher] = useState(hasShare ? paramInt(initialParams, "s", 0, 0, 3) : 0);
  const [personen, setPersonen] = useState(hasShare ? paramInt(initialParams, "p", 1, 0, 3) : 1);
  const [nutzung, setNutzung] = useState(hasShare ? paramInt(initialParams, "n", 1, 0, 3) : 1);
  const [wp, setWp] = useState(hasShare ? paramStr(initialParams, "wp", "nein", ["nein", "geplant", "ja"]) : "nein");
  const [ea, setEa] = useState(hasShare ? paramStr(initialParams, "ea", "nein", ["nein", "geplant", "ja"]) : "nein");
  const [eaKm, setEaKm] = useState(hasShare ? paramInt(initialParams, "km", 15000, 1000, 50000) : 15000);

  // Editable overrides (null = use auto-calculated)
  const [oKosten, setOKosten] = useState<number | null>(hasShare && initialParams?.k ? (() => { const n = Number(initialParams.k); return isFinite(n) && n >= 500 && n <= 200000 ? n : null; })() : null);
  const [oEv, setOEv] = useState<number | null>(hasShare && initialParams?.ev ? (() => { const n = Number(initialParams.ev); return isFinite(n) && n >= 5 && n <= 95 ? n : null; })() : null);
  const [oStrom, setOStrom] = useState(hasShare ? paramFloat(initialParams, "st", 0.34, 0.05, 1.0) : 0.34);
  const [oEinsp, setOEinsp] = useState(hasShare ? paramFloat(initialParams, "ei", 8.03, 0, 20) : 8.03);
  const [einspeisungAn, setEinspeisungAn] = useState(hasShare ? initialParams?.eia !== "0" : true);
  const [oErtrag, setOErtrag] = useState(hasShare ? paramInt(initialParams, "er", 950, 700, 1200) : 950);

  // PLZ → standortspezifischer Ertrag + Monatsprofil
  const [plz, setPlz] = useState(hasShare && typeof initialParams?.plz === "string" && /^\d{5}$/.test(initialParams.plz) ? initialParams.plz : "");
  const [plzLoading, setPlzLoading] = useState(false);
  const [plzSource, setPlzSource] = useState<string | null>(null);
  const [monthlyProfile, setMonthlyProfile] = useState<number[] | null>(null);

  // Gas/Öl-Referenz (nur bei WP)
  const [fuelType, setFuelType] = useState<"gas" | "oil">("gas");

  // Speicher-Kosten Inline-Prompt (Quick Settings)
  const [spKostenPrompt, setSpKostenPrompt] = useState(false);
  const [spKostenDraft, setSpKostenDraft] = useState("");

  // Empfehlungs-Flow Kontext
  const flowType = hasShare && initialParams?.flow === "emp" ? "empfehlung" : "manual";
  const htIdx = hasShare ? paramInt(initialParams, "ht", -1, 0, 3) : -1;
  const daIdx = hasShare ? paramInt(initialParams, "da", -1, 0, 3) : -1;

  // PLZ → PVGIS Ertrag laden
  const fetchPvgis = async (inputPlz: string) => {
    if (!/^\d{5}$/.test(inputPlz)) return;
    setPlzLoading(true);
    try {
      // PLZ → Koordinaten (lazy load)
      const plzRes = await fetch("/plz.json");
      const plzData: Record<string, [number, number]> = await plzRes.json();
      const coords = plzData[inputPlz];
      if (!coords) { setPlzLoading(false); return; }
      const [lat, lon] = coords;
      const res = await fetch(`/api/pvgis?lat=${lat}&lon=${lon}&plzPrefix=${inputPlz.slice(0, 2)}`);
      const data = await res.json();
      if (data.annual && data.annual >= 700 && data.annual <= 1400) {
        setOErtrag(data.annual);
        setPlzSource(data.source);
        if (data.monthly && data.monthly.length === 12) setMonthlyProfile(data.monthly);
      }
    } catch { /* Fallback: oErtrag bleibt unverändert */ }
    setPlzLoading(false);
  };

  // Auto-fetch bei Share-URL mit PLZ
  useEffect(() => { if (plz && hasShare) fetchPvgis(plz); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Auth + Save
  const { user, loading: authLoading } = useUser();
  const [showLogin, setShowLogin] = useState(false);
  const [loginEmail, setLoginEmail] = useState("");
  const [loginSent, setLoginSent] = useState(false);
  const [loginError, setLoginError] = useState("");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [savedCalcId, setSavedCalcId] = useState<string | null>(initialParams?.calc ? String(initialParams.calc) : null);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!loginEmail.trim()) return;
    setLoginError("");
    const { error } = await signInWithMagicLink(loginEmail.trim(), { next: isResult ? "/dashboard" : "/dashboard" });
    if (error) {
      setLoginError(error.message);
    } else {
      setLoginSent(true);
      // Pending save: speichere Berechnung in localStorage für Auto-Save nach Login
      if (isResult) {
        const row = paramsToRow(
          { anlage, customKwp, speicher, personen, nutzung, wp, ea, eaKm, oKosten, oEv, oStrom, oEinsp, einspeisungAn, oErtrag, plz, fuelType, flowType: flowType as "manual" | "empfehlung", haustyp: htIdx >= 0 ? htIdx : null, dachart: daIdx >= 0 ? daIdx : null, budgetLimit: null },
          { kwp, amortisationJahre: be ? be.i : null, rendite25j: Math.round(real.data.years[YEARS - 1]?.kum ?? 0) }
        );
        const spLabel = spKwh > 0 ? ` + ${spKwh} kWh` : "";
        localStorage.setItem("pendingSave", JSON.stringify({ ...row, name: `${kwp} kWp${spLabel}` }));
      }
    }
  };

  // Auto-save wird jetzt vom Dashboard übernommen (pendingSave in localStorage)

  // Share state
  const [copied, setCopied] = useState(false);
  const [canShare, setCanShare] = useState(false);
  useEffect(() => { setCanShare(typeof navigator !== "undefined" && !!navigator.share); }, []);

  const kwp = anlage <= 3 ? ANLAGEN[anlage].kwp : customKwp;
  const spKwh = SPEICHER[speicher].kwh;
  const kosten = oKosten !== null ? oKosten : estimateCost(kwp, spKwh);
  const autoEv = calcEigenverbrauch({ personenIdx: personen, nutzungIdx: nutzung, speicherKwh: spKwh, wp, ea, eaKm, kwp, ertragKwp: oErtrag });
  const effEv = oEv !== null ? oEv : autoEv;
  const jahresertrag = kwp * oErtrag;

  const scenarioData = useMemo(() =>
    SCENARIOS.map(s => ({
      ...s,
      data: calc({ kwp, kosten, strompreis: oStrom, eigenverbrauch: Math.min(effEv + s.evDelta, 95), einspeisung: einspeisungAn ? oEinsp : 0, stromSteigerung: s.strom, ertragKwp: oErtrag, monthly: monthlyProfile }),
    })), [kwp, kosten, oStrom, effEv, oEinsp, einspeisungAn, oErtrag, eaKm, monthlyProfile]);

  const real = scenarioData.find(s => s.id === "realistic")!;
  const be = real.data.be;

  const STEPS = ["Wie groß soll die Anlage werden?", "Batteriespeicher?", "Dein Haushalt", "Großverbraucher"];
  const isResult = step >= STEPS.length;
  const next = () => step < STEPS.length && setStep(step + 1);
  const back = () => step > 0 && setStep(step - 1);
  const restart = () => { setStep(0); setOKosten(null); setOEv(null); if (typeof window !== "undefined") window.history.replaceState(null, "", window.location.pathname); };

  const buildShareUrl = () => {
    const p = new URLSearchParams();
    p.set("a", String(anlage));
    p.set("s", String(speicher));
    p.set("p", String(personen));
    p.set("n", String(nutzung));
    p.set("wp", wp);
    p.set("ea", ea);
    if (ea !== "nein") p.set("km", String(eaKm));
    if (anlage === 4) p.set("ck", String(customKwp));
    if (oKosten !== null) p.set("k", String(oKosten));
    if (oEv !== null) p.set("ev", String(oEv));
    p.set("st", String(oStrom));
    p.set("ei", String(oEinsp));
    p.set("eia", einspeisungAn ? "1" : "0");
    p.set("er", String(oErtrag));
    if (plz) p.set("plz", plz);
    if (flowType === "empfehlung") {
      p.set("flow", "emp");
      if (htIdx >= 0) p.set("ht", String(htIdx));
      if (daIdx >= 0) p.set("da", String(daIdx));
    }
    return `${window.location.origin}${window.location.pathname}?${p.toString()}`;
  };

  const shareText = `Meine PV-Anlage (${kwp} kWp) amortisiert sich in ${be ? be.i : ">25"} Jahren.`;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(buildShareUrl());
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch { prompt("Link kopieren:", buildShareUrl()); }
  };

  const handleNativeShare = async () => {
    try { await navigator.share({ title: "Solar Check – Mein Ergebnis", text: shareText, url: buildShareUrl() }); } catch {}
  };

  const handleWhatsApp = () => {
    window.open(`https://wa.me/?text=${encodeURIComponent(shareText + "\n" + buildShareUrl())}`, "_blank");
  };

  const handleSave = useCallback(async () => {
    if (!user || saving) return;
    setSaving(true);
    try {
      const row = paramsToRow(
        { anlage, customKwp, speicher, personen, nutzung, wp, ea, eaKm, oKosten, oEv, oStrom, oEinsp, einspeisungAn, oErtrag, plz, fuelType, flowType: flowType as "manual" | "empfehlung", haustyp: htIdx >= 0 ? htIdx : null, dachart: daIdx >= 0 ? daIdx : null, budgetLimit: null },
        { kwp, amortisationJahre: be ? be.i : null, rendite25j: Math.round(real.data.years[YEARS - 1]?.kum ?? 0) }
      );
      const spLabel = spKwh > 0 ? ` + ${spKwh} kWh` : "";
      const res = await fetch("/api/calculations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...row, name: `${kwp} kWp${spLabel}` }),
      });
      if (res.ok) {
        const { id } = await res.json();
        setSaved(true);
        setSavedCalcId(id);
        setTimeout(() => setSaved(false), 2500);
      }
    } catch { /* silent */ }
    setSaving(false);
  }, [user, saving, anlage, customKwp, speicher, personen, nutzung, wp, ea, eaKm, oKosten, oEv, oStrom, oEinsp, einspeisungAn, oErtrag, plz, fuelType, kwp, spKwh, be, real, flowType, htIdx, daIdx]); // eslint-disable-line react-hooks/exhaustive-deps

  // Empfehlungs-Kontext für "Warum diese Anlage?"
  const empfehlungKontext = flowType === "empfehlung" && htIdx >= 0 && daIdx >= 0 ? (() => {
    const ht = HAUSTYPEN[htIdx];
    const da = DACHARTEN[daIdx];
    const nutzbar = Math.round(ht.footprint * da.factor);
    const maxKwp = Math.round(nutzbar * 0.2 * 10) / 10;
    const grundverbrauch = PERSONEN[personen].verbrauch;
    let extraVerbrauch = 0;
    if (wp !== "nein") extraVerbrauch += 3500;
    if (ea !== "nein") extraVerbrauch += Math.round(eaKm * 0.18);
    const gesamtVerbrauch = grundverbrauch + extraVerbrauch;
    const dachAuslastung = Math.round((kwp / maxKwp) * 100);
    return { ht, da, nutzbar, maxKwp, grundverbrauch, extraVerbrauch, gesamtVerbrauch, dachAuslastung };
  })() : null;

  return (
    <div style={{ background: v('--color-bg'), fontFamily: v('--font-text'), color: v('--color-text-primary'), minHeight: "100vh", padding: "20px 16px" }}>
      <div style={{ maxWidth: v('--page-max-width'), margin: "0 auto" }}>

        {/* Header — Navigation bar */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
          <Link href="/" style={{ textDecoration: "none", display: "inline-flex" }}><Logo height={22} /></Link>
          <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
            <Link href="/rechner" style={{ fontSize: 13, fontWeight: 600, color: v('--color-accent'), textDecoration: "none" }}>Rechner</Link>
            {!authLoading && (
              user ? (
                <Link href="/dashboard" style={{ fontSize: 13, fontWeight: 600, color: v('--color-accent'), textDecoration: "none", display: "flex", alignItems: "center", gap: 4 }}>
                  ◉ Einloggen
                </Link>
              ) : (
                <button onClick={() => { setShowLogin(!showLogin); setLoginSent(false); setLoginError(""); }} style={{
                  background: "none", border: "none", color: v('--color-accent'), fontSize: 13, fontWeight: 600, cursor: "pointer",
                  padding: 0, fontFamily: v('--font-text'),
                }}>
                  ◉ Einloggen
                </button>
              )
            )}
          </div>
        </div>

        {/* Title */}
        <div style={{ textAlign: "center", marginBottom: 24 }}>
          <h1 style={{ fontSize: 22, fontWeight: 800, letterSpacing: "-0.02em", color: v('--color-text-primary'), lineHeight: 1.2 }}>Lohnt sich Photovoltaik?</h1>
          <p style={{ fontSize: 13, color: v('--color-text-muted'), marginTop: 6 }}>Ehrlich berechnet. Ohne Leadfunnel.</p>
        </div>

        {/* Inline Login — only during question steps, sticky bar handles result page */}
        {showLogin && !user && !isResult && (
          <div className="fu" style={{
            background: v('--color-bg'), borderRadius: v('--radius-md'), padding: "16px", marginBottom: 16,
            border: `1px solid ${v('--color-border')}`,
          }}>
            {loginSent ? (
              <div style={{ textAlign: "center" }}>
                <div style={{ fontSize: 14, fontWeight: 600, color: v('--color-accent'), marginBottom: 6 }}>Link gesendet!</div>
                <div style={{ fontSize: 12, color: v('--color-text-secondary') }}>Prüfe deine E-Mails und klicke den Link zum Anmelden.</div>
              </div>
            ) : (
              <form onSubmit={handleLogin} style={{ display: "flex", gap: 8 }}>
                <input
                  type="email"
                  placeholder="E-Mail-Adresse"
                  value={loginEmail}
                  onChange={e => setLoginEmail(e.target.value)}
                  style={{
                    flex: 1, padding: "10px 12px", borderRadius: v('--radius-md'), fontSize: 14,
                    background: v('--color-bg-muted'), border: `1px solid ${v('--color-border')}`, color: v('--color-text-primary'),
                    fontFamily: v('--font-text'), outline: "none",
                  }}
                />
                <button type="submit" style={{
                  padding: "10px 16px", borderRadius: v('--radius-md'), fontSize: 13, fontWeight: 600,
                  background: v('--color-accent'), border: "none", color: v('--color-text-on-accent'), cursor: "pointer",
                  fontFamily: v('--font-text'), whiteSpace: "nowrap",
                }}>
                  Link senden
                </button>
              </form>
            )}
            {loginError && <div style={{ fontSize: 12, color: v('--color-negative'), marginTop: 8 }}>{loginError}</div>}
            <div style={{ fontSize: 11, color: v('--color-text-faint'), marginTop: 8, textAlign: "center" }}>
              Passwordless per Magic Link · Keine Werbung
            </div>
          </div>
        )}

        {/* Progress */}
        {!isResult && (
          <div style={{ display: "flex", gap: 4, marginBottom: 28 }}>
            {STEPS.map((_, i) => (
              <div key={i} style={{ flex: 1, height: 3, borderRadius: 2, background: i <= step ? v('--color-accent') : v('--color-progress-inactive'), transition: "background 0.3s" }} />
            ))}
          </div>
        )}

        {/* ── QUESTIONS ── */}
        {!isResult && (
          <div className="fu" key={step}>
            <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 18, color: v('--color-text-primary') }}>{STEPS[step]}</h2>

            {step === 0 && (
              <div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                  {ANLAGEN.map((a, i) => (
                    <OptionCard key={i} selected={anlage === i} onClick={() => { setAnlage(i); setOKosten(null); setOEv(null); }} label={a.label} sub={a.sub} icon={a.icon} />
                  ))}
                </div>
                <div style={{
                  display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
                  marginTop: 14, fontSize: 13, color: v('--color-text-muted'),
                }}>
                  <span>oder</span>
                  <InlineEdit value={customKwp} onCommit={v => { setCustomKwp(Math.round(v)); setAnlage(4); setOKosten(null); setOEv(null); }} unit=" kWp" step={1} min={1} max={50} width={48} />
                </div>
              </div>
            )}

            {step === 1 && (
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                {SPEICHER.map((s, i) => (
                  <OptionCard key={i} selected={speicher === i} onClick={() => { setSpeicher(i); setOKosten(null); }} label={s.label} sub={s.sub} icon={s.icon} />
                ))}
              </div>
            )}

            {step === 2 && (
              <div>
                <div style={{ fontSize: 13, fontWeight: 600, color: v('--color-text-muted'), marginBottom: 8, textTransform: "uppercase", letterSpacing: "0.04em" }}>Personen im Haushalt</div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 6, marginBottom: 20 }}>
                  {PERSONEN.map((p, i) => (
                    <button key={i} onClick={() => { setPersonen(i); setOEv(null); }} style={{
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
                    <OptionCard key={i} selected={nutzung === i} onClick={() => { setNutzung(i); setOEv(null); }} label={n.label} sub={n.sub} />
                  ))}
                </div>
              </div>
            )}

            {step === 3 && (
              <div>
                <TriToggle label="⚡ Wärmepumpe" options={TRI} value={wp} onChange={v => { setWp(v); setOEv(null); }} />
                <TriToggle label="🚗 Elektroauto" options={TRI} value={ea} onChange={v => { setEa(v); setOEv(null); }} />
                {ea !== "nein" && (
                  <div style={{ marginBottom: 18, marginTop: -10 }}>
                    <div style={{ fontSize: 12, fontWeight: 600, color: v('--color-text-secondary'), marginBottom: 6 }}>Laufleistung ca.</div>
                    <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                      {EA_KM_PRESETS.map(km => (
                        <button key={km} onClick={() => { setEaKm(km); setOEv(null); }} style={{
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
                            if (!isNaN(n) && n >= 1000 && n <= 50000) { setEaKm(n); setOEv(null); }
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
                <div style={{ fontSize: 12, color: v('--color-text-muted'), marginTop: 4, lineHeight: 1.5 }}>
                  Beides erhöht den Eigenverbrauch deutlich — weniger Einspeisung, mehr Ersparnis.
                </div>
              </div>
            )}

            <div style={{ display: "flex", justifyContent: "space-between", marginTop: 24 }}>
              {step > 0 ? (
                <button onClick={back} style={{ padding: "10px 20px", borderRadius: v('--radius-md'), fontSize: 14, fontWeight: 600, background: "transparent", border: `1px solid ${v('--color-border-muted')}`, color: v('--color-text-secondary'), cursor: "pointer" }}>Zurück</button>
              ) : <div />}
              <button onClick={next} style={{ padding: "10px 32px", borderRadius: v('--radius-md'), fontSize: 14, fontWeight: 700, background: v('--color-accent'), border: "none", color: v('--color-text-on-accent'), cursor: "pointer" }}>
                {step === STEPS.length - 1 ? "Berechnen ✦" : "Weiter →"}
              </button>
            </div>
          </div>
        )}

        {/* ── RESULT ── */}
        {isResult && (
          <div className="fu">
            {/* Hero with amortisation */}
            <div style={{
              textAlign: "center", padding: "24px 20px 20px", marginBottom: 16,
              background: v('--color-bg-muted'), borderRadius: v('--radius-lg'), border: `1px solid ${v('--color-border')}`,
            }}>
              <div style={{ fontSize: 12, color: v('--color-text-secondary'), textTransform: "uppercase", letterSpacing: "0.06em", fontWeight: 600, marginBottom: 8 }}>
                Deine PV-Anlage amortisiert sich in
              </div>
              <div style={{ fontSize: 56, fontWeight: 800, color: v('--color-accent'), fontFamily: v('--font-mono'), lineHeight: 1 }}>
                {be ? be.i : ">25"}<span style={{ fontSize: 22, fontWeight: 600, marginLeft: 4 }}>Jahren</span>
              </div>

              {/* Editable parameters grid */}
              <div style={{
                display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px 16px",
                marginTop: 18, padding: "14px 16px", background: v('--color-bg-muted'),
                borderRadius: v('--radius-md'), textAlign: "left", fontSize: 13,
              }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{ color: v('--color-text-secondary') }}>Investition</span>
                  <InlineEdit value={kosten} onCommit={v => setOKosten(v)} unit=" €" step={500} min={500} max={80000} width={68} />
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{ color: v('--color-text-secondary') }}>Eigenverbr.</span>
                  <InlineEdit value={effEv} onCommit={v => setOEv(v)} unit="%" step={1} min={10} max={90} width={40} />
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{ color: v('--color-text-secondary') }}>Strompreis</span>
                  <InlineEdit value={oStrom} onCommit={setOStrom} unit=" €" step={0.01} min={0.15} max={0.60} width={52} />
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <span style={{ color: v('--color-text-secondary') }}>Einspeisung</span>
                    <span onClick={() => setEinspeisungAn(!einspeisungAn)} style={{
                      width: 32, height: 18, borderRadius: 9, padding: 2, cursor: "pointer",
                      background: einspeisungAn ? v('--color-accent') : v('--color-border-muted'), transition: "background 0.2s",
                      display: "inline-flex", alignItems: "center", flexShrink: 0,
                    }}>
                      <span style={{
                        width: 14, height: 14, borderRadius: "50%", background: v('--color-text-primary'),
                        transform: einspeisungAn ? "translateX(14px)" : "translateX(0)",
                        transition: "transform 0.2s",
                      }} />
                    </span>
                  </span>
                  {einspeisungAn ? (
                    <InlineEdit value={oEinsp} onCommit={setOEinsp} unit=" ct" step={0.01} min={4} max={12} width={48} />
                  ) : (
                    <span style={{ fontFamily: v('--font-mono'), fontWeight: 700, color: v('--color-text-faint'), fontSize: 13 }}>aus</span>
                  )}
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{ color: v('--color-text-secondary') }}>Ertrag{plzLoading && <span style={{ color: v('--color-accent'), fontSize: 10, marginLeft: 4 }}>…</span>}</span>
                  <InlineEdit value={oErtrag} onCommit={setOErtrag} unit=" kWh/kWp" step={10} min={700} max={1400} width={48} />
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{ color: v('--color-text-secondary') }}>Standort</span>
                  <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
                    <input
                      value={plz}
                      placeholder="PLZ"
                      maxLength={5}
                      onChange={e => {
                        const val = e.target.value.replace(/\D/g, "").slice(0, 5);
                        setPlz(val);
                        if (val.length === 5) fetchPvgis(val);
                      }}
                      style={{
                        width: 52, textAlign: "center", fontSize: 13, fontWeight: 700,
                        fontFamily: v('--font-mono'),
                        color: plz.length === 5 ? v('--color-accent') : v('--color-text-secondary'),
                        background: plz.length === 5 ? v('--color-accent-dim') : v('--color-bg-muted'),
                        border: plz.length === 5 ? `1px solid ${v('--color-border-accent')}` : `1px dashed ${v('--color-text-faint')}`,
                        borderRadius: v('--radius-sm'), padding: "3px 4px", outline: "none",
                      }}
                    />
                    {plzSource && <span style={{ fontSize: 10, color: v('--color-text-faint') }}>{plzSource === "pvgis" ? "✓" : "~"}</span>}
                  </span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{ color: v('--color-text-secondary') }}>Anlage</span>
                  <span style={{ fontFamily: v('--font-mono'), fontWeight: 700, color: v('--color-text-primary'), fontSize: 13 }}>
                    {kwp} kWp{spKwh > 0 ? ` + ${spKwh} kWh` : ""}
                  </span>
                </div>
              </div>

              <div style={{ fontSize: 11, color: v('--color-text-faint'), marginTop: 10 }}>
                Werte anklicken zum Anpassen
              </div>
            </div>

            {/* Empfehlungs-Kontext: Warum diese Anlage? */}
            {empfehlungKontext && (
              <details style={{
                background: v('--color-bg'), borderRadius: v('--radius-md'), padding: "14px 16px", marginBottom: 16,
                border: `1px solid ${v('--color-border')}`,
              }}>
                <summary style={{ fontSize: 14, fontWeight: 700, color: v('--color-text-primary'), cursor: "pointer", listStyle: "none", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span>Warum diese Anlage?</span>
                  <span style={{ fontSize: 11, color: v('--color-text-muted'), fontWeight: 400 }}>Details ▾</span>
                </summary>
                <div style={{ marginTop: 14, fontSize: 13, color: v('--color-text-muted'), lineHeight: 1.7 }}>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "6px 16px", marginBottom: 12 }}>
                    <div>
                      <span style={{ color: v('--color-text-secondary') }}>Grundverbrauch</span>
                      <div style={{ fontFamily: v('--font-mono'), fontWeight: 600, color: v('--color-text-primary') }}>{empfehlungKontext.grundverbrauch.toLocaleString("de-DE")} kWh</div>
                    </div>
                    {empfehlungKontext.extraVerbrauch > 0 && (
                      <div>
                        <span style={{ color: v('--color-text-secondary') }}>+ Großverbraucher</span>
                        <div style={{ fontFamily: v('--font-mono'), fontWeight: 600, color: v('--color-text-primary') }}>{empfehlungKontext.extraVerbrauch.toLocaleString("de-DE")} kWh</div>
                      </div>
                    )}
                    <div>
                      <span style={{ color: v('--color-text-secondary') }}>Gesamtverbrauch</span>
                      <div style={{ fontFamily: v('--font-mono'), fontWeight: 700, color: v('--color-text-primary') }}>{empfehlungKontext.gesamtVerbrauch.toLocaleString("de-DE")} kWh</div>
                    </div>
                    <div>
                      <span style={{ color: v('--color-text-secondary') }}>Dachfläche nutzbar</span>
                      <div style={{ fontFamily: v('--font-mono'), fontWeight: 600, color: v('--color-text-primary') }}>~{empfehlungKontext.nutzbar} m² → max {empfehlungKontext.maxKwp} kWp</div>
                    </div>
                  </div>
                  <div style={{ fontSize: 12, color: v('--color-text-secondary'), lineHeight: 1.6, borderTop: `1px solid ${v('--color-border')}`, paddingTop: 10 }}>
                    <strong style={{ color: v('--color-text-muted') }}>{empfehlungKontext.ht.label} + {empfehlungKontext.da.label}:</strong>{" "}
                    Deine Dachfläche bietet Platz für max. {empfehlungKontext.maxKwp} kWp.{" "}
                    {kwp < empfehlungKontext.maxKwp
                      ? `Die empfohlenen ${kwp} kWp nutzen ${empfehlungKontext.dachAuslastung}% — optimiert auf hohen Eigenverbrauch.`
                      : `Die empfohlenen ${kwp} kWp nutzen die volle Dachfläche.`
                    }
                    {kwp < empfehlungKontext.maxKwp && empfehlungKontext.maxKwp - kwp >= 3 && (
                      <span style={{ display: "block", marginTop: 4, color: v('--color-text-muted') }}>
                        Eine größere Anlage ({empfehlungKontext.maxKwp} kWp) wäre möglich, senkt aber den Eigenverbrauchsanteil.
                      </span>
                    )}
                  </div>
                </div>
              </details>
            )}

            {/* Quick Settings */}
            <div style={{ marginBottom: 16 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: v('--color-text-secondary'), textTransform: "uppercase", letterSpacing: "0.04em", marginBottom: 8 }}>Starke Einflussfaktoren</div>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                <button onClick={() => { setWp(wp === "nein" ? "ja" : "nein"); setOEv(null); }} style={{
                  padding: "8px 14px", borderRadius: v('--radius-md'), fontSize: 13, fontWeight: 600, cursor: "pointer",
                  background: wp !== "nein" ? v('--color-bg-accent') : v('--color-bg'),
                  border: wp !== "nein" ? `1.5px solid ${v('--color-accent-light')}` : `1.5px solid ${v('--color-border')}`,
                  color: wp !== "nein" ? v('--color-accent') : v('--color-text-secondary'),
                  display: "flex", alignItems: "center", gap: 6,
                }}>
                  Wärmepumpe
                  <span style={{ width: 14, height: 14, borderRadius: 3, border: wp !== "nein" ? `1.5px solid ${v('--color-accent-light')}` : `1.5px solid ${v('--color-border-muted')}`, background: wp !== "nein" ? v('--color-bg-accent') : v('--color-bg'), display: "inline-flex", alignItems: "center", justifyContent: "center", fontSize: 9, color: v('--color-accent') }}>{wp !== "nein" ? "✓" : ""}</span>
                </button>
                <button onClick={() => { setEa(ea === "nein" ? "ja" : "nein"); setOEv(null); }} style={{
                  padding: "8px 14px", borderRadius: v('--radius-md'), fontSize: 13, fontWeight: 600, cursor: "pointer",
                  background: ea !== "nein" ? v('--color-bg-accent') : v('--color-bg'),
                  border: ea !== "nein" ? `1.5px solid ${v('--color-accent-light')}` : `1.5px solid ${v('--color-border')}`,
                  color: ea !== "nein" ? v('--color-accent') : v('--color-text-secondary'),
                  display: "flex", alignItems: "center", gap: 6,
                }}>
                  E-Auto
                  <span style={{ width: 14, height: 14, borderRadius: 3, border: ea !== "nein" ? `1.5px solid ${v('--color-accent-light')}` : `1.5px solid ${v('--color-border-muted')}`, background: ea !== "nein" ? v('--color-bg-accent') : v('--color-bg'), display: "inline-flex", alignItems: "center", justifyContent: "center", fontSize: 9, color: v('--color-accent') }}>{ea !== "nein" ? "✓" : ""}</span>
                </button>
                <button onClick={() => {
                  if (oKosten !== null) {
                    // Manueller Preis: Inline-Prompt für Speicherkosten
                    const defaultSpKosten = speicher === 0
                      ? (2000 + SPEICHER[2].kwh * 650) // ON: 10kWh default
                      : (2000 + spKwh * 650); // OFF: aktuelle Größe
                    setSpKostenDraft(String(defaultSpKosten));
                    setSpKostenPrompt(true);
                  } else {
                    setSpeicher(speicher === 0 ? 2 : 0); setOEv(null);
                  }
                }} style={{
                  padding: "8px 14px", borderRadius: v('--radius-md'), fontSize: 13, fontWeight: 600, cursor: "pointer",
                  background: speicher > 0 ? v('--color-bg-accent') : v('--color-bg'),
                  border: speicher > 0 ? `1.5px solid ${v('--color-accent-light')}` : `1.5px solid ${v('--color-border')}`,
                  color: speicher > 0 ? v('--color-accent') : v('--color-text-secondary'),
                  display: "flex", alignItems: "center", gap: 6,
                }}>
                  Speicher
                  {speicher > 0 && <span style={{ fontSize: 11 }}>{spKwh} kWh</span>}
                  <span style={{ width: 14, height: 14, borderRadius: 3, border: speicher > 0 ? `1.5px solid ${v('--color-accent-light')}` : `1.5px solid ${v('--color-border-muted')}`, background: speicher > 0 ? v('--color-bg-accent') : v('--color-bg'), display: "inline-flex", alignItems: "center", justifyContent: "center", fontSize: 9, color: v('--color-accent') }}>{speicher > 0 ? "✓" : ""}</span>
                </button>
              </div>
              {spKostenPrompt && (
                <div style={{
                  marginTop: 8, padding: "10px 14px", borderRadius: v('--radius-md'),
                  background: v('--color-bg'), border: `1.5px solid ${v('--color-accent')}`,
                  display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap",
                }}>
                  <span style={{ fontSize: 12, color: v('--color-text-muted') }}>
                    {speicher > 0 ? "Speicherkosten abziehen:" : "Speicherkosten:"}
                  </span>
                  <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
                    <input
                      autoFocus
                      value={spKostenDraft}
                      onChange={e => setSpKostenDraft(e.target.value.replace(/[^\d]/g, ""))}
                      onKeyDown={e => {
                        if (e.key === "Enter") {
                          const n = parseInt(spKostenDraft);
                          if (!isNaN(n) && n >= 0 && n <= 50000) {
                            if (speicher > 0) {
                              setOKosten(Math.max(oKosten! - n, 500));
                              setSpeicher(0);
                            } else {
                              setOKosten(oKosten! + n);
                              setSpeicher(2);
                            }
                            setOEv(null);
                          }
                          setSpKostenPrompt(false);
                        }
                        if (e.key === "Escape") setSpKostenPrompt(false);
                      }}
                      style={{
                        width: 64, textAlign: "right", fontSize: 13, fontWeight: 700,
                        fontFamily: v('--font-mono'), color: v('--color-accent'),
                        background: v('--color-accent-dim'), border: `1px solid ${v('--color-accent')}`,
                        borderRadius: v('--radius-sm'), padding: "5px 6px", outline: "none",
                      }}
                    />
                    <span style={{ fontSize: 12, color: v('--color-text-secondary') }}>€</span>
                  </span>
                  <button onClick={() => {
                    const n = parseInt(spKostenDraft);
                    if (!isNaN(n) && n >= 0 && n <= 50000) {
                      if (speicher > 0) {
                        setOKosten(Math.max(oKosten! - n, 500));
                        setSpeicher(0);
                      } else {
                        setOKosten(oKosten! + n);
                        setSpeicher(2);
                      }
                      setOEv(null);
                    }
                    setSpKostenPrompt(false);
                  }} style={{
                    padding: "5px 12px", borderRadius: v('--radius-sm'), fontSize: 11, fontWeight: 600,
                    background: v('--color-accent'), border: "none", color: v('--color-text-on-accent'), cursor: "pointer",
                  }}>OK</button>
                  <button onClick={() => setSpKostenPrompt(false)} style={{
                    padding: "5px 8px", borderRadius: v('--radius-sm'), fontSize: 11, fontWeight: 600,
                    background: "transparent", border: `1px solid ${v('--color-border-muted')}`, color: v('--color-text-muted'), cursor: "pointer",
                  }}>Abbrechen</button>
                </div>
              )}
              {ea !== "nein" && (
                <div style={{ marginTop: 8, display: "flex", gap: 6, alignItems: "center", paddingLeft: 4 }}>
                  <span style={{ fontSize: 11, color: v('--color-text-muted') }}>Laufleistung:</span>
                  {EA_KM_PRESETS.map(km => (
                    <button key={km} onClick={() => { setEaKm(km); setOEv(null); }} style={{
                      padding: "5px 8px", borderRadius: v('--radius-sm'), fontSize: 11, fontWeight: 600, cursor: "pointer",
                      background: eaKm === km ? v('--color-accent-dim') : v('--color-bg'),
                      border: eaKm === km ? `1px solid ${v('--color-accent')}` : `1px solid ${v('--color-border')}`,
                      color: eaKm === km ? v('--color-accent') : v('--color-text-secondary'),
                    }}>{(km / 1000).toFixed(0)}k</button>
                  ))}
                  <span style={{ display: "inline-flex", alignItems: "center", gap: 3 }}>
                    <input
                      value={EA_KM_PRESETS.includes(eaKm) ? "" : String(eaKm)}
                      placeholder="km"
                      onChange={e => {
                        const n = parseInt(e.target.value.replace(/\D/g, ""));
                        if (!isNaN(n) && n >= 1000 && n <= 50000) { setEaKm(n); setOEv(null); }
                      }}
                      style={{
                        width: 48, textAlign: "center", fontSize: 11, fontWeight: 600,
                        fontFamily: v('--font-mono'),
                        color: !EA_KM_PRESETS.includes(eaKm) ? v('--color-accent') : v('--color-text-faint'),
                        background: !EA_KM_PRESETS.includes(eaKm) ? v('--color-accent-dim') : v('--color-bg'),
                        border: !EA_KM_PRESETS.includes(eaKm) ? `1px solid ${v('--color-accent')}` : `1px solid ${v('--color-border')}`,
                        borderRadius: v('--radius-sm'), padding: "5px 4px", outline: "none",
                      }}
                    />
                    <span style={{ fontSize: 10, color: v('--color-text-faint') }}>km</span>
                  </span>
                </div>
              )}
            </div>

            {/* Stats row */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 16 }}>
              <div style={{ background: v('--color-bg'), borderRadius: v('--radius-md'), padding: "14px 16px", border: `1px solid ${v('--color-border')}` }}>
                <div style={{ fontSize: 11, color: v('--color-text-secondary'), textTransform: "uppercase", letterSpacing: "0.04em", fontWeight: 600 }}>Rendite 25 Jahre</div>
                <div style={{ fontSize: 22, fontWeight: 800, fontFamily: v('--font-mono'), color: real.data.total >= 0 ? v('--color-positive') : v('--color-negative'), marginTop: 4 }}>
                  {real.data.total > 0 ? "+" : ""}{real.data.total.toLocaleString("de-DE")} €
                </div>
              </div>
              <div style={{ background: v('--color-bg'), borderRadius: v('--radius-md'), padding: "14px 16px", border: `1px solid ${v('--color-border')}` }}>
                <div style={{ fontSize: 11, color: v('--color-text-secondary'), textTransform: "uppercase", letterSpacing: "0.04em", fontWeight: 600 }}>⌀ Ersparnis / Jahr</div>
                <div style={{ fontSize: 22, fontWeight: 800, fontFamily: v('--font-mono'), color: v('--color-positive'), marginTop: 4 }}>
                  {Math.round((real.data.total + kosten) / YEARS).toLocaleString("de-DE")} €
                </div>
              </div>
            </div>

            {/* Gas/Öl reference (nur bei WP) */}
            {wp !== "nein" && (() => {
              const autarky = Math.min(effEv / 100 * jahresertrag / (PERSONEN[personen].verbrauch + 3500 + (ea !== "nein" ? Math.round(eaKm * 0.18) : 0)), 1);
              const fuelCost = calcFuelCost25(3500, fuelType);
              const wpGridCost = calcWpGridCost25(3500, autarky, oStrom, 0.03);
              const netSaving = fuelCost - wpGridCost;
              return (
              <div style={{ background: v('--color-bg'), borderRadius: v('--radius-md'), padding: "12px 16px", marginBottom: 16, border: `1px solid ${v('--color-border')}` }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                  <span style={{ fontSize: 11, color: v('--color-text-secondary'), textTransform: "uppercase", letterSpacing: "0.04em", fontWeight: 600 }}>
                    WP vs. {FUEL[fuelType].label}heizung · 25 Jahre
                  </span>
                  <div style={{ display: "flex", gap: 4 }}>
                    {(["gas", "oil"] as const).map(ft => (
                      <button key={ft} onClick={() => setFuelType(ft)} style={{
                        padding: "3px 8px", borderRadius: v('--radius-sm'), fontSize: 10, fontWeight: 600, cursor: "pointer",
                        background: fuelType === ft ? v('--color-negative-dim') : "transparent",
                        border: fuelType === ft ? `1px solid ${v('--color-negative-border')}` : `1px solid ${v('--color-border-muted')}`,
                        color: fuelType === ft ? v('--color-negative') : v('--color-text-muted'),
                      }}>{FUEL[ft].label}</button>
                    ))}
                  </div>
                </div>
                <div style={{ display: "flex", alignItems: "baseline", gap: 8, flexWrap: "wrap" }}>
                  <div>
                    <span style={{ fontSize: 11, color: v('--color-negative') }}>{FUEL[fuelType].label}: </span>
                    <span style={{ fontSize: 16, fontWeight: 700, fontFamily: v('--font-mono'), color: v('--color-negative'), textDecoration: "line-through", opacity: 0.7 }}>
                      {fuelCost.toLocaleString("de-DE")} €
                    </span>
                  </div>
                  <div>
                    <span style={{ fontSize: 11, color: v('--color-text-secondary') }}>WP Netz: </span>
                    <span style={{ fontSize: 16, fontWeight: 700, fontFamily: v('--font-mono'), color: v('--color-text-secondary') }}>
                      {wpGridCost.toLocaleString("de-DE")} €
                    </span>
                  </div>
                </div>
                <div style={{ fontSize: 20, fontWeight: 800, fontFamily: v('--font-mono'), color: v('--color-positive'), marginTop: 4 }}>
                  Ersparnis: {netSaving.toLocaleString("de-DE")} €
                </div>
                <div style={{ fontSize: 11, color: v('--color-text-muted'), marginTop: 4, lineHeight: 1.5 }}>
                  {Math.round(3500 * 3.5).toLocaleString("de-DE")} kWh Wärme/Jahr · WP-Autarkie {Math.round(autarky * 100)} % · inkl. CO₂-Abgabe
                </div>
              </div>
            ); })()}

            {/* Chart */}
            <div style={{ background: v('--color-bg'), borderRadius: v('--radius-lg'), padding: "14px 10px 6px", marginBottom: 16, border: `1px solid ${v('--color-border')}` }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "0 6px", marginBottom: 6 }}>
                <span style={{ fontSize: 13, fontWeight: 700, color: v('--color-text-primary') }}>Amortisation</span>
                <div style={{ display: "flex", gap: 12 }}>
                  {SCENARIOS.map(s => (
                    <span key={s.id} style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 10, color: v('--color-text-secondary') }}>
                      <span style={{ width: 8, height: 3, borderRadius: 2, background: s.color, display: "inline-block", opacity: s.id === "realistic" ? 1 : 0.5 }} />
                      {s.label}
                    </span>
                  ))}
                </div>
              </div>
              <Chart scenarios={scenarioData} kosten={kosten} />
            </div>

            {/* Scenario pills */}
            <div style={{ display: "flex", gap: 8, marginBottom: 20 }}>
              {scenarioData.map(s => (
                <div key={s.id} style={{
                  flex: 1, padding: "10px 8px", borderRadius: v('--radius-md'), textAlign: "center",
                  background: v('--color-bg'), borderTop: `3px solid ${s.color}`,
                }}>
                  <div style={{ fontSize: 10, color: s.color, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.04em" }}>{s.label}</div>
                  <div style={{ fontSize: 18, fontWeight: 800, fontFamily: v('--font-mono'), color: v('--color-text-primary'), margin: "4px 0 2px" }}>{s.data.be ? `${s.data.be.i} J.` : ">25 J."}</div>
                  <div style={{ fontSize: 10, color: v('--color-text-muted') }}>Strom +{(s.strom * 100).toFixed(0)}%/a</div>
                </div>
              ))}
            </div>

            {/* Monthly production chart or PLZ CTA */}
            {!monthlyProfile && (
              <div
                onClick={() => {
                  const el = document.querySelector<HTMLInputElement>('input[placeholder="PLZ"]');
                  if (el) { el.scrollIntoView({ behavior: "smooth", block: "center" }); el.focus(); }
                }}
                style={{
                  background: v('--color-bg'), borderRadius: v('--radius-lg'), padding: "20px 16px", marginBottom: 16,
                  border: `1px dashed ${v('--color-border-muted')}`, textAlign: "center", cursor: "pointer",
                }}
              >
                <div style={{ fontSize: 13, fontWeight: 600, color: v('--color-text-secondary'), marginBottom: 4 }}>
                  Jahresverlauf & exaktere Prognose
                </div>
                <div style={{ fontSize: 12, color: v('--color-text-faint') }}>
                  PLZ eingeben für standortgenauen Ertrag + monatliche Berechnung
                </div>
              </div>
            )}
            {monthlyProfile && (
              <div style={{ background: v('--color-bg'), borderRadius: v('--radius-lg'), padding: "14px 14px 10px", marginBottom: 16, border: `1px solid ${v('--color-border')}` }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: v('--color-text-primary'), marginBottom: 10 }}>Monatsertrag</div>
                <div style={{ display: "flex", alignItems: "flex-end", gap: 4, height: 100, padding: "0 2px" }}>
                  {(() => { const max = Math.max(...monthlyProfile); return monthlyProfile.map((m, i) => {
                    const barH = Math.max(Math.round((m / max) * 70), 3);
                    return (
                      <div key={i} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center" }}>
                        <span style={{ fontSize: 9, fontFamily: v('--font-mono'), color: v('--color-text-secondary'), marginBottom: 3 }}>{Math.round(m * kwp).toLocaleString("de-DE")}</span>
                        <div style={{ width: "100%", height: barH, borderRadius: "3px 3px 0 0", background: m === max ? v('--color-accent') : v('--color-border-accent') }} />
                        <span style={{ fontSize: 9, color: v('--color-text-faint'), marginTop: 3 }}>{["J","F","M","A","M","J","J","A","S","O","N","D"][i]}</span>
                      </div>
                    );
                  }); })()}
                </div>
                <div style={{ fontSize: 10, color: v('--color-text-faint'), textAlign: "center", marginTop: 6 }}>kWh/Monat · {plz && `PLZ ${plz}`}</div>
              </div>
            )}

            {/* Methodology note */}
            <div style={{
              background: v('--color-bg'), borderRadius: v('--radius-md'), padding: "12px 16px", marginBottom: 16,
              border: `1px solid ${v('--color-border')}`, fontSize: 12, color: v('--color-text-muted'), lineHeight: 1.6,
            }}>
              <Link href="/methodik" style={{ fontWeight: 700, color: v('--color-text-secondary'), textDecoration: "none", borderBottom: `1px dashed ${v('--color-text-faint')}` }}>Methodik</Link>
              <span style={{ color: v('--color-text-muted') }}>{" "}· Eigenverbrauch kalibriert an HTW Berlin Daten (±5%) · Degradation 0,5%/a · Einspeisevergütung fix 20 J.</span>
            </div>

            {/* Save (logged in) */}
            {user && (
              <div style={{ marginBottom: 16 }}>
                <button onClick={handleSave} disabled={saving} style={{
                  width: "100%", padding: "12px", borderRadius: v('--radius-md'), fontSize: 14, fontWeight: 700,
                  background: saved ? v('--color-accent-dim') : v('--color-accent-dim'),
                  border: saved ? `1px solid ${v('--color-accent')}` : `1px solid ${v('--color-border-accent')}`,
                  color: saved ? v('--color-accent') : v('--color-accent'), cursor: saving ? "wait" : "pointer",
                  fontFamily: v('--font-text'), transition: "all 0.2s",
                }}>
                  {saved ? "✓ Gespeichert!" : saving ? "Speichert..." : "Ergebnis speichern"}
                </button>
                {savedCalcId && !saved && (
                  <div style={{ textAlign: "center", marginTop: 6 }}>
                    <Link href="/dashboard" style={{ fontSize: 12, color: v('--color-text-muted'), textDecoration: "none", borderBottom: `1px dashed ${v('--color-text-faint')}` }}>
                      Meine Berechnungen →
                    </Link>
                  </div>
                )}
              </div>
            )}

            {/* Share */}
            <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
              <button onClick={handleCopy} style={{
                flex: 1, padding: "10px 12px", borderRadius: v('--radius-md'), fontSize: 13, fontWeight: 600,
                background: copied ? v('--color-accent-dim') : v('--color-bg-muted'),
                border: copied ? `1px solid ${v('--color-accent')}` : `1px solid ${v('--color-border')}`,
                color: copied ? v('--color-accent') : v('--color-text-muted'), cursor: "pointer",
                transition: "all 0.2s",
              }}>
                {copied ? "✓ Kopiert!" : "🔗 Link kopieren"}
              </button>
              {canShare && (
                <button onClick={handleNativeShare} style={{
                  flex: 1, padding: "10px 12px", borderRadius: v('--radius-md'), fontSize: 13, fontWeight: 600,
                  background: v('--color-bg-muted'), border: `1px solid ${v('--color-border')}`, color: v('--color-text-muted'), cursor: "pointer",
                }}>
                  📤 Teilen
                </button>
              )}
              <button onClick={handleWhatsApp} style={{
                flex: 1, padding: "10px 12px", borderRadius: v('--radius-md'), fontSize: 13, fontWeight: 600,
                background: v('--color-bg-muted'), border: `1px solid ${v('--color-border')}`, color: v('--color-text-muted'), cursor: "pointer",
              }}>
                💬 WhatsApp
              </button>
            </div>

            {/* Restart */}
            <button onClick={restart} style={{
              width: "100%", padding: "12px", borderRadius: v('--radius-md'), fontSize: 13, fontWeight: 600,
              background: "transparent", border: `1px solid ${v('--color-border-muted')}`, color: v('--color-text-secondary'), cursor: "pointer",
            }}>↺ Neu berechnen</button>

            <div style={{ textAlign: "center", fontSize: 11, color: v('--color-text-faint'), padding: "20px 0 8px", lineHeight: 1.6 }}>
              Keine Datensammlung · Keine Werbung<br />
              Alle Angaben ohne Gewähr · Keine Steuer- oder Anlageberatung
            </div>
          </div>
        )}

        <div style={{ display: "flex", justifyContent: "center", gap: 16, padding: `24px 0 ${isResult && !user ? 80 : 16}px` }}>
          <Link href="/methodik" style={{ fontSize: 11, color: v('--color-text-faint'), textDecoration: "none" }}>Methodik</Link>
          <Link href="/impressum" style={{ fontSize: 11, color: v('--color-text-faint'), textDecoration: "none" }}>Impressum</Link>
          <Link href="/datenschutz" style={{ fontSize: 11, color: v('--color-text-faint'), textDecoration: "none" }}>Datenschutz</Link>
        </div>
      </div>

      {/* Sticky Bottom Bar — CTA für nicht-eingeloggte Nutzer */}
      {isResult && !user && !authLoading && (
        <div style={{
          position: "fixed", bottom: 0, left: 0, right: 0, zIndex: 100,
          background: `linear-gradient(to top, ${v('--color-bg')} 80%, transparent)`,
          padding: "20px 16px 16px",
        }}>
          <div style={{ maxWidth: v('--page-max-width'), margin: "0 auto" }}>
            {showLogin && loginSent ? (
              <div style={{
                background: v('--color-bg'), borderRadius: v('--radius-md'), padding: "14px 16px",
                border: `1px solid ${v('--color-border')}`, textAlign: "center",
              }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: v('--color-accent') }}>Link gesendet!</div>
                <div style={{ fontSize: 12, color: v('--color-text-secondary'), marginTop: 4 }}>Prüfe deine E-Mails.</div>
              </div>
            ) : showLogin ? (
              <form onSubmit={handleLogin} style={{
                display: "flex", gap: 8,
                background: v('--color-bg'), borderRadius: v('--radius-md'), padding: "12px",
                border: `1px solid ${v('--color-border')}`,
              }}>
                <input
                  type="email"
                  placeholder="E-Mail-Adresse"
                  value={loginEmail}
                  onChange={e => setLoginEmail(e.target.value)}
                  autoFocus
                  style={{
                    flex: 1, padding: "10px 12px", borderRadius: v('--radius-md'), fontSize: 14,
                    background: v('--color-bg-muted'), border: `1px solid ${v('--color-border')}`, color: v('--color-text-primary'),
                    fontFamily: v('--font-text'), outline: "none",
                  }}
                />
                <button type="submit" style={{
                  padding: "10px 16px", borderRadius: v('--radius-md'), fontSize: 13, fontWeight: 600,
                  background: v('--color-accent'), border: "none", color: v('--color-text-on-accent'), cursor: "pointer",
                  fontFamily: v('--font-text'), whiteSpace: "nowrap",
                }}>
                  Link senden
                </button>
              </form>
            ) : (
              <button onClick={() => { setShowLogin(true); setLoginSent(false); setLoginError(""); }} style={{
                width: "100%", padding: "14px", borderRadius: v('--radius-md'), fontSize: 15, fontWeight: 700,
                background: v('--color-accent'), border: "none", color: v('--color-text-on-accent'), cursor: "pointer",
                fontFamily: v('--font-text'),
              }}>
                Ergebnisse speichern
              </button>
            )}
            {loginError && <div style={{ fontSize: 12, color: v('--color-negative'), marginTop: 6, textAlign: "center" }}>{loginError}</div>}
          </div>
        </div>
      )}
    </div>
  );
}
