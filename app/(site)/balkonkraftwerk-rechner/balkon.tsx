"use client";
import { useState, useMemo, useCallback, useEffect, useRef } from "react";
import Link from "next/link";
import OptionCard from "../../../components/OptionCard";
import InlineEdit from "../../../components/InlineEdit";
import Header from "../../../components/Header";
import InfoTooltip from "../../../components/InfoTooltip";
import StandortField from "../../../components/StandortField";
import { IconArrowRight, IconRefresh, IconCheck } from "../../../components/Icons";
import { v } from "../../../lib/theme";
import { usePrices } from "../../../lib/prices";
import { PERSONEN } from "../../../lib/constants";
import { DEFAULT_BALKON_CONFIG as CFG, type BalkonSetId, type BalkonStorageId } from "../../../lib/balkon-config";
import { calcBalkon, recommendBalkon, type BalkonInputs, type BalkonOption } from "../../../lib/balkon";
import { trackEvent } from "../../../lib/analytics";
import { DataSourceNote } from "../../../components/PoweredBy";
import { DATA_SOURCES } from "../../../lib/data-sources";

const STEPS = ["Haushalt & Standort", "Ausrichtung"];

// Klartext-Beschreibung einer Konfiguration (Set + Speicher-Entscheidung).
function storageName(id: BalkonStorageId): string {
  const st = CFG.storage.find(s => s.id === id)!;
  return st.kwh > 0 ? `mit ~${st.kwh.toLocaleString("de-DE")} kWh Speicher` : "ohne Speicher";
}
// Kurzlabel ohne Größen-Qualifier für die Karten-Überschrift ("4 Module").
function setShort(setId: BalkonSetId): string {
  return CFG.sets.find(s => s.id === setId)!.label.replace(/\s*\(.*\)/, "");
}
function configLabel(setId: BalkonSetId, storageId: BalkonStorageId): string {
  return `${CFG.sets.find(s => s.id === setId)!.label}, ${storageName(storageId)}`;
}

export default function Balkon() {
  const [step, setStep] = useState(0);
  const [orientationId, setOrientationId] = useState<BalkonInputs["orientationId"]>(CFG.defaultOrientation);
  const [presenceId, setPresenceId] = useState<BalkonInputs["presenceId"]>(CFG.defaultPresence);
  const [personen, setPersonen] = useState(1); // Index in PERSONEN (Default: 2 Personen)

  // Manueller Wechsel auf eine Alternative (null = der Empfehlung folgen).
  const [override, setOverride] = useState<{ setId: BalkonSetId; storageId: BalkonStorageId } | null>(null);

  // Standort → Ertrag (kWh/kWp) via PVGIS
  const [plz, setPlz] = useState("");
  const [plzLoading, setPlzLoading] = useState(false);
  const [plzConfirmed, setPlzConfirmed] = useState(false);
  const [specificYield, setSpecificYield] = useState(CFG.specificYield);

  // Einmaliger PLZ-Toast, sobald das Ergebnis erscheint und noch kein Standort
  // gesetzt ist — nudget zur standortgenauen Ertragsrechnung (wie im PV-Rechner).
  const [plzToast, setPlzToast] = useState(false);
  const plzToastShown = useRef(false);

  // Klebt die Auswahl gerade oben? Nur dann bekommt sie einen Schatten (eingefadet).
  const stickyRef = useRef<HTMLDivElement>(null);
  const [stuck, setStuck] = useState(false);

  // Editierbare Overrides im Ergebnis
  const [oStrom, setOStrom] = useState<number | null>(null);
  const [oInvest, setOInvest] = useState<number | null>(null);
  const [oVerbrauch, setOVerbrauch] = useState<number | null>(null);

  const prices = usePrices();
  const strompreis = oStrom ?? (prices.electricityPrice > 0 ? prices.electricityPrice : CFG.stromPrice);
  // Strompreisanstieg systemweit konsistent mit dem PV-Rechner (gleiche Preis-Config).
  const priceIncrease = prices.electricityIncrease;
  const haushaltKwh = oVerbrauch ?? PERSONEN[personen].verbrauch;

  const isResult = step >= STEPS.length;

  // PLZ-Toast einmal einblenden, sobald das Ergebnis erscheint und noch kein
  // Standort übernommen wurde.
  useEffect(() => {
    if (!isResult || plzConfirmed || /^\d{5}$/.test(plz) || plzToastShown.current) return;
    plzToastShown.current = true;
    setPlzToast(true);
  }, [isResult, plzConfirmed, plz]);
  // Auto-Ausblenden nach 6 s (eigener Effekt, damit der Timer unter StrictMode
  // korrekt neu gesetzt wird).
  useEffect(() => {
    if (!plzToast) return;
    const t = setTimeout(() => setPlzToast(false), 6000);
    return () => clearTimeout(t);
  }, [plzToast]);

  // Schatten der klebenden Auswahl erst zeigen, wenn sie wirklich oben anliegt.
  useEffect(() => {
    const el = stickyRef.current;
    if (!el) return;
    const onScroll = () => setStuck(el.getBoundingClientRect().top <= 0.5);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [isResult]);

  const next = () => {
    if (step >= STEPS.length) return;
    const target = step + 1;
    if (target === STEPS.length) trackEvent("balkon_ergebnis");
    setStep(target);
  };
  const back = () => step > 0 && setStep(step - 1);

  const fetchPvgis = useCallback(async (inputPlz: string) => {
    if (!/^\d{5}$/.test(inputPlz)) return;
    setPlzLoading(true);
    try {
      const plzRes = await fetch("/plz.json");
      const plzData: Record<string, [number, number]> = await plzRes.json();
      const coords = plzData[inputPlz];
      if (coords) {
        const res = await fetch(`/api/pvgis?lat=${coords[0]}&lon=${coords[1]}&plzPrefix=${inputPlz.slice(0, 2)}`);
        const data = await res.json();
        if (typeof data.annual === "number") setSpecificYield(data.annual);
      }
      setPlzConfirmed(true);
    } catch { /* Fallback bleibt */ }
    setPlzLoading(false);
  }, []);

  const onPlzChange = (raw: string) => {
    setPlz(raw.replace(/\D/g, "").slice(0, 5));
    setPlzConfirmed(false);
  };

  // Empfehlung: effizienteste Konfiguration (Set + Speicher) aus den Eingaben.
  // Reagiert live auf die im Ergebnis editierbaren Werte (Strompreis, Verbrauch).
  const recommendation = useMemo(
    () => recommendBalkon({ orientationId, presenceId, haushaltKwh, specificYield, stromPrice: strompreis, priceIncrease }),
    [orientationId, presenceId, haushaltKwh, specificYield, strompreis, priceIncrease],
  );

  // Aktive Konfiguration: gewählte Alternative oder — Default — die Empfehlung.
  const active = override ?? { setId: recommendation.best.setId, storageId: recommendation.best.storageId };
  const activeIsBest = active.setId === recommendation.best.setId && active.storageId === recommendation.best.storageId;

  const inputs: BalkonInputs = useMemo(() => ({
    setId: active.setId, orientationId, presenceId, storageId: active.storageId,
    haushaltKwh, specificYield, stromPrice: strompreis, priceIncrease, invest: oInvest ?? undefined,
  }), [active.setId, active.storageId, orientationId, presenceId, haushaltKwh, specificYield, strompreis, priceIncrease, oInvest]);

  const r = useMemo(() => calcBalkon(inputs), [inputs]);
  const amortLabel = isFinite(r.amortYears) ? `${r.amortYears.toFixed(1).replace(".", ",")} J.` : "—";

  // Set-Größe und Speicher sind zwei GETRENNTE Entscheidungen. Jede ändert die
  // aktive Konfiguration; stimmt sie wieder mit der Empfehlung überein, folgen
  // wir automatisch der Empfehlung (override = null). Editierten Anschaffungspreis
  // dabei verwerfen, da sich der Standardpreis mit der Wahl ändert.
  const applySelection = (setId: BalkonSetId, storageId: BalkonStorageId) => {
    setOInvest(null);
    if (setId === recommendation.best.setId && storageId === recommendation.best.storageId) setOverride(null);
    else setOverride({ setId, storageId });
  };
  const selectSize = (setId: BalkonSetId) => applySelection(setId, active.storageId);
  const selectStorage = (storageId: BalkonStorageId) => applySelection(active.setId, storageId);
  const resetToRecommendation = () => { setOverride(null); setOInvest(null); };
  const resetAll = () => { setOverride(null); setOInvest(null); setStep(0); };

  const findCombo = (setId: BalkonSetId, storageId: BalkonStorageId): BalkonOption =>
    recommendation.ranked.find(o => o.setId === setId && o.storageId === storageId) ?? recommendation.best;

  // Set-Größen-Karten (alle in einer Reihe): jede zeigt die Ersparnis beim AKTUELL
  // gewählten Speicher — so sind alle Karten konsistent (kein Speicher-Durcheinander).
  const sizeOptions = CFG.sets.map(s => findCombo(s.id, active.storageId));

  // Speicher als aufklappbarer Schalter: an = eine Speichergröße gewählt.
  const storageOptions = CFG.storage.filter(s => s.kwh > 0);
  const storageOn = active.storageId !== "none";
  const toggleStorage = () => {
    if (storageOn) { selectStorage("none"); return; }
    // Beim Einschalten die wirtschaftlichste Größe für das aktive Set vorwählen.
    const bestForSet = recommendation.ranked
      .filter(o => o.setId === active.setId && o.storageId !== "none")
      .sort((a, b) => b.result.lifetimeSaving - a.result.lifetimeSaving)[0];
    selectStorage(bestForSet?.storageId ?? storageOptions[0].id);
  };

  const activeCombo = findCombo(active.setId, active.storageId);

  // Ein-Satz-Beschreibung der aktiven Konfiguration: die Empfehlung bekommt die
  // volle Begründung, jede Abweichung den Vergleich zur Empfehlung.
  const activeDescription = (): string => {
    if (activeIsBest) return `${recommendation.setReason} ${recommendation.storageReason}`;
    const dInvest = activeCombo.result.invest - recommendation.best.result.invest;
    const dSave = activeCombo.result.savingPerYear - recommendation.best.result.savingPerYear;
    if (dInvest <= 0) {
      return `${Math.abs(dInvest).toLocaleString("de-DE")} € günstiger als die Empfehlung, dafür rund ${Math.abs(dSave).toLocaleString("de-DE")} €/Jahr weniger Ersparnis.`;
    }
    return `${dInvest.toLocaleString("de-DE")} € teurer für rund ${dSave.toLocaleString("de-DE")} €/Jahr mehr Ersparnis.`;
  };

  // Cross-Flow-Teaser: Bei hohem Verbrauch holt eine Dachanlage deutlich mehr
  // (Balkon deckt nur die Grundlast). Schwelle bewusst konservativ.
  const roofWorthIt = haushaltKwh >= 3500;

  return (
    <div style={{ background: v('--color-bg'), fontFamily: v('--font-text'), color: v('--color-text-primary'), minHeight: "100vh", padding: "20px 16px" }}>
      <Header />
      <div style={{ maxWidth: v('--page-max-width'), margin: "0 auto" }}>
        <div style={{ textAlign: "center", marginBottom: 24 }}>
          <h1 style={{ fontSize: 20, fontWeight: 800, letterSpacing: "-0.02em", lineHeight: 1.2 }}>
            {isResult ? "Deine Empfehlung" : "Lohnt sich ein Balkonkraftwerk?"}
          </h1>
          {!isResult && (
            <p style={{ fontSize: 13, color: v('--color-text-muted'), marginTop: 6 }}>
              Für Miete und Eigentum ohne eigenes Dach. Wir empfehlen dir die passende Größe — mit oder ohne Speicher.
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

            {/* 0: Haushalt & Standort */}
            {step === 0 && (
              <div>
                <div style={{ fontSize: 13, fontWeight: 600, color: v('--color-text-muted'), marginBottom: 8, textTransform: "uppercase", letterSpacing: "0.04em" }}>Wie viele Personen im Haushalt?</div>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 6, marginBottom: 20 }}>
                  {PERSONEN.map((p, i) => (
                    <button key={p.label} onClick={() => { setPersonen(i); setOVerbrauch(null); }} style={{
                      padding: "14px 4px", borderRadius: v('--radius-md'), fontSize: 16, fontWeight: 700, cursor: "pointer", textAlign: "center",
                      background: personen === i ? v('--color-accent-dim') : v('--color-bg-muted'),
                      border: personen === i ? `2px solid ${v('--color-accent')}` : `2px solid ${v('--color-border')}`,
                      color: personen === i ? v('--color-accent') : v('--color-text-secondary'),
                    }}>{p.label}</button>
                  ))}
                </div>

                <div style={{ fontSize: 13, fontWeight: 600, color: v('--color-text-muted'), marginBottom: 8, textTransform: "uppercase", letterSpacing: "0.04em", display: "inline-flex", alignItems: "center", gap: 4 }}>
                  Tagsüber jemand zuhause?
                  <InfoTooltip title="Warum das zählt" ariaLabel="Warum fragen wir, ob tagsüber jemand zuhause ist?" size={12}>
                    Ein Balkonkraftwerk lohnt sich über den Strom, den du direkt verbrauchst, während die Sonne scheint.
                    Wer tagsüber zuhause ist (Homeoffice, Rente, Familie), nutzt mehr davon selbst — Überschuss fließt
                    sonst unvergütet ins Netz. Das entscheidet auch, ob sich ein Speicher lohnt.
                  </InfoTooltip>
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: 8, marginBottom: 20 }}>
                  {CFG.presence.map(p => (
                    <OptionCard key={p.id} selected={presenceId === p.id} onClick={() => setPresenceId(p.id)} label={p.label} sub={p.sub} />
                  ))}
                </div>

                <div style={{ fontSize: 13, fontWeight: 600, color: v('--color-text-muted'), marginBottom: 8, textTransform: "uppercase", letterSpacing: "0.04em" }}>Standort (für den echten Ertrag)</div>
                <form onSubmit={e => { e.preventDefault(); if (!plzConfirmed) fetchPvgis(plz); }} style={{ display: "flex", gap: 8 }}>
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
                <div style={{ fontSize: 12, color: plzConfirmed ? v('--color-positive') : v('--color-text-muted'), marginTop: 8, lineHeight: 1.5, fontWeight: plzConfirmed ? 600 : 400 }}>
                  {plzConfirmed
                    ? `Standort übernommen: ${specificYield} kWh je kWp und Jahr.`
                    : "Optional. Ohne PLZ rechnen wir mit einem deutschen Durchschnitt."}
                </div>
              </div>
            )}

            {/* 1: Ausrichtung */}
            {step === 1 && (
              <div>
                <div style={{ fontSize: 13, fontWeight: 600, color: v('--color-text-muted'), marginBottom: 8, textTransform: "uppercase", letterSpacing: "0.04em" }}>Wie hängen die Module?</div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: 8 }}>
                  {CFG.orientations.map(o => (
                    <OptionCard key={o.id} selected={orientationId === o.id} onClick={() => setOrientationId(o.id)} label={o.label} sub={o.sub} />
                  ))}
                </div>
                <div style={{ fontSize: 12, color: v('--color-text-muted'), marginTop: 10, lineHeight: 1.5 }}>
                  Senkrecht am Geländer bringt gut ein Viertel weniger als flach aufgeständert in Südrichtung — der Winkel ist
                  bei Balkon-PV der größte Hebel.
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
                <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>{step === STEPS.length - 1 ? <>Empfehlung anzeigen <IconArrowRight size={14} /></> : <>Weiter <IconArrowRight size={14} /></>}</span>
              </button>
            </div>
          </div>
        )}

        {/* PLZ-Toast: einmaliger Nudge zur standortgenauen Ertragsrechnung */}
        {plzToast && (
          <div
            className="fu"
            onClick={() => {
              const el = document.querySelector<HTMLInputElement>('input[aria-label="Postleitzahl eingeben"]');
              if (el) { el.scrollIntoView({ behavior: "smooth", block: "center" }); el.focus(); }
              setPlzToast(false);
            }}
            style={{
              position: "fixed", bottom: 20, left: "50%", transform: "translateX(-50%)",
              zIndex: 900, maxWidth: 440, width: "calc(100% - 32px)", cursor: "pointer",
              background: v('--color-accent'), color: v('--color-text-on-accent'),
              borderRadius: v('--radius-md'), padding: "12px 16px",
              boxShadow: "0 6px 24px rgba(0,0,0,0.25)", display: "flex", alignItems: "center", gap: 10,
              fontSize: 13, fontWeight: 600, lineHeight: 1.4,
            }}
          >
            <span style={{ flex: 1 }}>PLZ eingeben für einen standortgenauen Ertrag</span>
            <button onClick={e => { e.stopPropagation(); setPlzToast(false); }} aria-label="Schließen" style={{ border: "none", background: "transparent", color: v('--color-text-on-accent'), fontSize: 18, lineHeight: 0.8, cursor: "pointer", padding: 0, opacity: 0.85 }}>×</button>
          </div>
        )}

        {/* ── RESULT (empfehlungsgetrieben) ── */}
        {isResult && (
          <div className="fu">
            {/* Auswahl (Set-Größe + Speicher) — klebt beim Scrollen oben, damit die
                Wirkung auf die Kennzahlen darunter sichtbar bleibt. */}
            <div ref={stickyRef} style={{
              position: "sticky", top: 0, zIndex: 20, background: v('--color-bg'),
              paddingTop: 8, paddingBottom: 10, marginBottom: 6,
              boxShadow: stuck ? "0 8px 12px -8px rgba(0,0,0,0.12)" : "0 8px 12px -8px rgba(0,0,0,0)",
              transition: "box-shadow 0.25s ease",
            }}>
            {/* 1. Set-Größe — alle drei in einer Reihe. Blauer Rand markiert nur die
                AKTIVE Wahl; die Empfehlung bleibt über Marker + Erhebung erkennbar. */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 8, marginBottom: 10 }}>
              {sizeOptions.map(o => {
                const selected = active.setId === o.setId;
                const isRec = o.setId === recommendation.best.setId;
                return (
                  <button key={o.setId} onClick={() => selectSize(o.setId)} style={{
                    padding: "12px 6px", borderRadius: v('--radius-md'), cursor: "pointer", textAlign: "center",
                    display: "flex", flexDirection: "column", alignItems: "center", gap: 2, minWidth: 0,
                    background: selected ? v('--color-accent-dim') : v('--color-bg-muted'),
                    border: `2px solid ${selected ? v('--color-accent') : v('--color-border')}`,
                    boxShadow: isRec ? "0 4px 14px -4px rgba(19,101,234,0.30)" : "none",
                  }}>
                    <span style={{ fontSize: 13, fontWeight: 700, whiteSpace: "nowrap", color: selected ? v('--color-accent') : v('--color-text-primary') }}>{setShort(o.setId)}</span>
                    <span style={{ fontSize: 12, fontWeight: 700, fontFamily: v('--font-mono'), color: v('--color-positive') }}>~{o.result.savingPerYear.toLocaleString("de-DE")} €/J</span>
                    {isRec && <span style={{ display: "inline-flex", alignItems: "center", gap: 2, fontSize: 9, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.03em", color: v('--color-accent') }}><IconCheck size={9} /> Empf.</span>}
                  </button>
                );
              })}
            </div>

            {/* 2. Speicher — Schalter links, Größen rechts daneben, eine Zeile, ohne Box.
                Der Tooltip steht bewusst NEBEN dem Schalter (Button im Button wäre
                ungültiges HTML und würde den Schalter mit auslösen). */}
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <button onClick={toggleStorage} aria-pressed={storageOn} style={{
                background: "none", border: "none", padding: 0, cursor: "pointer", flexShrink: 0,
                display: "inline-flex", alignItems: "center", gap: 6,
              }}>
                <span aria-hidden style={{
                  width: 38, height: 22, borderRadius: 11, flexShrink: 0, position: "relative", display: "inline-block",
                  background: storageOn ? v('--color-accent') : v('--color-border-muted'), transition: "background 0.2s",
                }}>
                  <span style={{
                    position: "absolute", top: 3, left: storageOn ? 19 : 3, width: 16, height: 16, borderRadius: "50%",
                    background: v('--color-bg'), transition: "left 0.2s",
                  }} />
                </span>
                <span style={{ fontSize: 13, fontWeight: 700, whiteSpace: "nowrap", color: storageOn ? v('--color-accent') : v('--color-text-primary') }}>Speicher</span>
              </button>
              <InfoTooltip title="Was ein Speicher bringt" ariaLabel="Was bringt ein Speicher am Balkonkraftwerk?" size={12}>
                Ein kleiner Akku puffert den Tagesüberschuss für Abend und Nacht und hebt den Eigenverbrauch — er kostet aber
                extra und rechnet sich oft erst spät. Wir empfehlen ihn nur, wenn er sich klar amortisiert.
              </InfoTooltip>
              {!storageOn && recommendation.best.storageId !== "none" && (
                <span style={{ display: "inline-flex", alignItems: "center", gap: 2, fontSize: 9, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.03em", color: v('--color-accent'), whiteSpace: "nowrap" }}><IconCheck size={9} /> Empf.</span>
              )}

              {/* Größen: gleiche Höhe wie der Schalter (22 px, border-box), damit die
                  Zeile beim Ein-/Ausschalten nicht springt. Auswahl = blaue Unterstreichung. */}
              {storageOn && (
                <div style={{ display: "flex", gap: 12, alignItems: "center", minWidth: 0 }}>
                  {storageOptions.map(st => {
                    const selected = active.storageId === st.id;
                    return (
                      <button key={st.id} onClick={() => selectStorage(st.id)} style={{
                        background: "none", border: "none", borderBottom: `2px solid ${selected ? v('--color-accent') : "transparent"}`,
                        boxSizing: "border-box", height: 22, padding: 0, cursor: "pointer",
                        display: "inline-flex", alignItems: "center", whiteSpace: "nowrap",
                        fontFamily: "inherit", fontSize: 12, fontWeight: 700,
                        color: selected ? v('--color-accent') : v('--color-text-secondary'),
                        transition: "color 0.15s, border-color 0.15s",
                      }}>
                        ~{st.kwh.toLocaleString("de-DE")} kWh
                        <span style={{ fontWeight: 400, fontSize: 11, color: v('--color-text-muted'), marginLeft: 4 }}>+{st.price.toLocaleString("de-DE")} €</span>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
            </div>

            {/* Beschreibung der aktiven Konfiguration */}
            <div style={{ marginBottom: 16, padding: "12px 14px", borderRadius: v('--radius-md'), background: v('--color-accent-dim'), border: `1px solid ${v('--color-border-accent')}`, fontSize: 13, color: v('--color-text-secondary'), lineHeight: 1.6 }}>
              {activeIsBest ? (
                <>
                  <div style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", color: v('--color-text-muted'), marginBottom: 6 }}>
                    Warum diese Konfiguration?
                  </div>
                  <div>{recommendation.setReason} {recommendation.storageReason}</div>
                </>
              ) : (
                <div>
                  {activeDescription()} Empfohlen wäre <strong style={{ color: v('--color-accent') }}>{configLabel(recommendation.best.setId, recommendation.best.storageId)}</strong>.{" "}
                  <button onClick={resetToRecommendation} style={{ background: "none", border: "none", padding: 0, color: v('--color-accent'), fontWeight: 700, cursor: "pointer", textDecoration: "underline", fontSize: 13, fontFamily: "inherit" }}>Zur Empfehlung</button>
                </div>
              )}
            </div>

            {/* Hero: Gesamt-Ersparnis über die Laufzeit (pro Jahr steht in den Karten) */}
            <div style={{ padding: "24px 20px", marginBottom: 16, background: v('--color-bg-accent'), borderRadius: v('--radius-lg'), border: `1px solid ${v('--color-border-accent')}` }}>
              <div style={{ fontSize: 12, color: v('--color-text-secondary'), textTransform: "uppercase", letterSpacing: "0.06em", fontWeight: 600, marginBottom: 8, textAlign: "center" }}>
                Ersparnis in {CFG.lifetimeYears} Jahren
              </div>
              <div style={{ fontSize: 42, fontWeight: 800, color: v('--color-positive'), fontFamily: v('--font-mono'), lineHeight: 1.1, textAlign: "center" }}>
                {(r.lifetimeSaving + r.invest).toLocaleString("de-DE")} €
              </div>
              <div style={{ fontSize: 13, color: v('--color-text-muted'), marginTop: 6, textAlign: "center" }}>
                ~{r.savingPerYear.toLocaleString("de-DE")} €/Jahr · {r.annualYield.toLocaleString("de-DE")} kWh Ertrag/Jahr · davon {r.selfUsedKwh.toLocaleString("de-DE")} kWh selbst genutzt
              </div>

              {/* Editierbare Annahmen inkl. nachträglicher Standort-Eingabe */}
              <div style={{ marginTop: 18, borderTop: `1px solid ${v('--color-border-accent')}`, paddingTop: 14, fontSize: 13, lineHeight: 2 }}>
                <div>{r.storageKwh > 0 ? "Anschaffung (Set + Speicher)" : "Set-Preis"}: <InlineEdit value={r.invest} onCommit={val => setOInvest(Math.round(val))} unit=" €" min={100} max={4000} step={50} width={64} /></div>
                <div>Strompreis: <InlineEdit value={Math.round(strompreis * 100 * 100) / 100} onCommit={val => setOStrom(val / 100)} unit=" ct/kWh" min={10} max={70} step={1} width={70} /></div>
                <div>Haushaltsverbrauch: <InlineEdit value={haushaltKwh} onCommit={val => setOVerbrauch(Math.round(val))} unit=" kWh" min={800} max={12000} step={100} width={76} /></div>
                <StandortField plz={plz} onPlzChange={onPlzChange} loading={plzLoading} confirmed={plzConfirmed} onSubmit={() => fetchPvgis(plz)} />
              </div>
            </div>

            {/* Stats 2×2 */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 16 }}>
              <StatCard label="Amortisation" value={amortLabel} help="So lange dauert es, bis die Ersparnis die Anschaffung wieder eingespielt hat." />
              <StatCard label="Autarkie" value={`${Math.round(r.autarky * 100)} %`} valueColor={v('--color-positive')} help="Anteil deines Jahresstroms, den das Balkonkraftwerk selbst deckt. Bei kleinen Anlagen zweistellig — es deckt die Grundlast, nicht den ganzen Haushalt." />
              <StatCard label="Gewinn nach 20 J." value={`${r.lifetimeSaving > 0 ? "+" : ""}${r.lifetimeSaving.toLocaleString("de-DE")} €`} valueColor={r.lifetimeSaving >= 0 ? v('--color-positive') : v('--color-negative')} help={`Summe der Stromersparnis über 20 Jahre, abzüglich Anschaffung. Gerechnet mit 0,5 % Moduldegradation und ${(priceIncrease * 100).toLocaleString("de-DE")} % Strompreisanstieg pro Jahr (wie im PV-Rechner). Ein Speicher zählt nur bis zu seiner Lebensdauer mit.`} />
              <StatCard label="CO₂ gespart" value={`${r.co2PerYear.toLocaleString("de-DE")} kg/J`} help="Vermiedener CO₂-Ausstoß pro Jahr, gerechnet mit dem deutschen Netzstrom-Mix (0,38 kg/kWh)." />
            </div>

            {/* Tagesleistungskurve der empfohlenen/aktiven Set-Größe */}
            <SetPowerCurves sets={CFG.sets} selectedId={active.setId} orientationFactor={CFG.orientations.find(o => o.id === orientationId)!.factor} />
            <div style={{ fontSize: 12, color: v('--color-text-muted'), lineHeight: 1.5, margin: "10px 0 16px" }}>
              Seit 2024 darfst du nur bis <strong style={{ color: v('--color-text-primary') }}>800 Watt</strong> einspeisen.
              Nutzt du mehr Module
              <InfoTooltip title="Wie viele Module sind erlaubt?" ariaLabel="Wie viele Module sind erlaubt?" size={12}>
                Die Module dürfen zusammen bis <strong>2.000 Wp</strong> leisten — mehr als der Wechselrichter durchlässt. Das ist
                erlaubt und sinnvoll: Die Mittagsspitze wird gekappt, morgens und abends kommt aber mehr an.
              </InfoTooltip>
              , hast du morgens und abends mehr Ertrag — die Mittagsspitze bleibt bei 800 W gedeckelt.
            </div>

            {/* Speicher: ehrliche Mehrkosten/Nutzen-Aufschlüsselung */}
            {r.storageKwh > 0 && (() => {
              const extraSaving = r.savingPerYear - r.baseSavingPerYear;
              const paysOff = isFinite(r.storagePayback) && r.storagePayback <= CFG.storageLifeYears;
              return (
                <div style={{ background: v('--color-bg'), borderRadius: v('--radius-md'), padding: "14px 16px", marginBottom: 16, border: `1px solid ${v('--color-border')}`, fontSize: 13, color: v('--color-text-secondary'), lineHeight: 1.6 }}>
                  <div style={{ fontWeight: 700, color: v('--color-text-primary'), marginBottom: 6 }}>
                    Mit {r.storageKwh.toLocaleString("de-DE")}-kWh-Speicher
                  </div>
                  <div>
                    Der Speicher nutzt rund <strong style={{ color: v('--color-text-primary'), fontFamily: v('--font-mono') }}>{r.storageAddedKwh.toLocaleString("de-DE")} kWh</strong> Überschuss
                    zusätzlich selbst — das bringt <strong style={{ color: v('--color-positive'), fontFamily: v('--font-mono') }}>~{extraSaving.toLocaleString("de-DE")} €/Jahr</strong> mehr,
                    kostet aber <strong style={{ color: v('--color-negative'), fontFamily: v('--font-mono') }}>+{r.storagePrice.toLocaleString("de-DE")} €</strong> Aufpreis.
                  </div>
                  <div style={{ fontSize: 12, color: v('--color-text-muted'), marginTop: 8 }}>
                    {paysOff ? (
                      <>Der Speicher allein rechnet sich nach rund <strong style={{ color: v('--color-text-secondary') }}>{r.storagePayback.toFixed(1).replace(".", ",")} Jahren</strong> — innerhalb seiner Lebensdauer. Deshalb ist er bei deinem Verbrauch drin.</>
                    ) : (
                      <>Der Speicher allein amortisiert sich {isFinite(r.storagePayback) ? <>erst nach <strong style={{ color: v('--color-text-secondary') }}>{r.storagePayback.toFixed(1).replace(".", ",")} Jahren</strong></> : "in dieser Konstellation praktisch nicht"} — meist länger, als ein Balkonspeicher typischerweise hält. Ehrlich: <strong style={{ color: v('--color-text-secondary') }}>hier lohnt er sich nicht.</strong></>
                    )}
                  </div>
                </div>
              );
            })()}

            {/* Einspeise-/Anmeldehinweis */}
            <div style={{ background: v('--color-bg'), borderRadius: v('--radius-md'), padding: "14px 16px", marginBottom: 16, border: `1px solid ${v('--color-border')}`, fontSize: 13, color: v('--color-text-secondary'), lineHeight: 1.6 }}>
              {r.feedInKwh > 0 ? (
                <>Rund <strong style={{ color: v('--color-text-primary'), fontFamily: v('--font-mono') }}>{r.feedInKwh.toLocaleString("de-DE")} kWh</strong> Überschuss fließen unvergütet ins Netz — für Balkonkraftwerke gibt es keine Einspeisevergütung. Deshalb zählt nur der selbst genutzte Strom.</>
              ) : (
                <>Du nutzt praktisch den gesamten Ertrag selbst — kein Überschuss geht verloren.</>
              )}
              {r.clipped && (
                <div style={{ fontSize: 12, color: v('--color-text-muted'), marginTop: 6 }}>
                  Der 800-W-Wechselrichter begrenzt die Mittagsspitze. Ein größeres Set bringt hier nur noch wenig zusätzlichen Ertrag.
                </div>
              )}
              <div style={{ fontSize: 12, color: v('--color-text-muted'), marginTop: 6 }}>
                Anmeldung seit 2024 vereinfacht: eine Registrierung im Marktstammdatenregister genügt, keine Netzbetreiber-Genehmigung.
              </div>
            </div>

            {/* Miete/Eigentum-Hinweis */}
            <div style={{ background: v('--color-bg-muted'), borderRadius: v('--radius-md'), padding: "12px 16px", marginBottom: 16, border: `1px solid ${v('--color-border')}`, fontSize: 12, color: v('--color-text-muted'), lineHeight: 1.6 }}>
              <strong style={{ color: v('--color-text-secondary') }}>Miete oder Eigentum:</strong> Beides ist möglich. Seit 2024 gelten Steckersolargeräte
              als privilegierte Maßnahme — Vermieter und Eigentümergemeinschaft dürfen die Montage nur noch aus wichtigem Grund ablehnen.
              Ein kurzes Einverständnis vorab bleibt trotzdem sinnvoll.
            </div>

            {/* Cross-Flow: großes Dach lohnt mehr */}
            {roofWorthIt && (
              <div style={{ background: v('--color-bg'), borderRadius: v('--radius-md'), padding: "14px 16px", marginBottom: 16, border: `1px solid ${v('--color-accent')}`, fontSize: 13, color: v('--color-text-secondary'), lineHeight: 1.6 }}>
                Bei deinem Verbrauch von <strong style={{ color: v('--color-text-primary') }}>{haushaltKwh.toLocaleString("de-DE")} kWh</strong> deckt ein Balkonkraftwerk nur die Grundlast.
                Wenn du ein eigenes Dach oder eine Fläche hast, holt eine richtige Anlage ein Vielfaches heraus.{" "}
                <Link href="/photovoltaik-rechner" style={{ color: v('--color-accent'), textDecoration: "none", fontWeight: 600 }}>Große Anlage rechnen</Link>
              </div>
            )}

            {/* Aktionen */}
            <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
              <Link href="/photovoltaik-rechner" style={{ flex: 1, padding: "12px", borderRadius: v('--radius-md'), fontSize: 13, fontWeight: 700, background: v('--color-accent'), border: "none", color: v('--color-text-on-accent'), textDecoration: "none", textAlign: "center" }}>
                <span style={{ display: "inline-flex", alignItems: "center", gap: 6, justifyContent: "center" }}>Eigenes Dach? Große Anlage rechnen <IconArrowRight size={12} /></span>
              </Link>
              <button onClick={resetAll} style={{ flex: 1, padding: "12px", borderRadius: v('--radius-md'), fontSize: 13, fontWeight: 600, background: "transparent", border: `1px solid ${v('--color-border-muted')}`, color: v('--color-text-secondary'), cursor: "pointer" }}>
                <span style={{ display: "inline-flex", alignItems: "center", gap: 6, justifyContent: "center" }}><IconRefresh size={12} /> Neu berechnen</span>
              </button>
            </div>

            <div style={{ background: v('--color-bg'), borderRadius: v('--radius-md'), padding: "12px 16px", marginBottom: 16, border: `1px solid ${v('--color-border')}`, fontSize: 12, color: v('--color-text-muted'), lineHeight: 1.6 }}>
              <Link href="/methodik" style={{ fontWeight: 700, color: v('--color-text-secondary'), textDecoration: "none", borderBottom: `1px dashed ${v('--color-text-faint')}` }}>Methodik</Link>
              <span> · Ertrag standortgenau, Eigenverbrauch aus der Anlagengröße · Werte auf der </span>
              <Link href="/datenstand" style={{ color: v('--color-accent'), textDecoration: "none" }}>Datenstand-Seite</Link>.
              <div style={{ marginTop: 6 }}>
                <DataSourceNote source={DATA_SOURCES.pvgis} />
              </div>
            </div>

            <div style={{ textAlign: "center", fontSize: 11, color: v('--color-text-faint'), padding: "8px 0" }}>
              Näherungswerte. Realer Ertrag hängt von Verschattung, Modul und Montage ab. Keine Anlageberatung.
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// Typische Tagesleistungskurve je Set an einem Sonnentag — zeigt, wie der
// 800-W-Wechselrichter die Mittagsspitze deckelt: mehr Module = früher/länger auf
// Volllast (breitere Kurve), die Spitze bleibt gekappt. Rein illustrativ
// (Klarsonnen-Glockenkurve × Ausrichtung), keine Standort-/Wetterrechnung.
function SetPowerCurves({ sets, selectedId, orientationFactor }: {
  sets: { id: BalkonSetId; label: string; moduleWp: number; inverterW: number }[];
  selectedId: BalkonSetId;
  orientationFactor: number;
}) {
  const W = 320, H = 120, PADX = 6, PADT = 12, PADB = 6;
  const tStart = 6, tEnd = 20, yMax = 1.7, capKw = 0.8;
  const COLORS: Record<BalkonSetId, string> = {
    single: v('--color-accent-light'), duo: v('--color-accent'), max: v('--color-accent-dark'),
  };
  const shape = (t: number) => { const x = (t - tStart) / (tEnd - tStart); return x <= 0 || x >= 1 ? 0 : Math.pow(Math.sin(Math.PI * x), 1.3); };
  const xPix = (t: number) => PADX + ((t - tStart) / (tEnd - tStart)) * (W - 2 * PADX);
  const yPix = (p: number) => (H - PADB) - (Math.min(p, yMax) / yMax) * (H - PADT - PADB);
  const HOURS = Array.from({ length: 57 }, (_, i) => tStart + i * 0.25);
  const clipped = (moduleWp: number, inverterW: number) =>
    HOURS.map(t => `${xPix(t).toFixed(1)},${yPix(Math.min((moduleWp / 1000) * 0.82 * orientationFactor * shape(t), inverterW / 1000)).toFixed(1)}`).join(" ");
  const potential = (moduleWp: number) =>
    HOURS.map(t => `${xPix(t).toFixed(1)},${yPix((moduleWp / 1000) * 0.82 * orientationFactor * shape(t)).toFixed(1)}`).join(" ");
  const sel = sets.find(s => s.id === selectedId)!;
  const capY = yPix(capKw);

  return (
    <div style={{ marginTop: 4, background: v('--color-bg-muted'), border: `1px solid ${v('--color-border')}`, borderRadius: v('--radius-md'), padding: "12px 10px 6px" }}>
      <div style={{ fontSize: 11, fontWeight: 700, color: v('--color-text-muted'), textTransform: "uppercase", letterSpacing: "0.04em", marginBottom: 4, paddingLeft: 4 }}>Leistung an einem Sonnentag</div>
      <svg viewBox={`0 0 ${W} ${H}`} width="100%" style={{ display: "block" }} role="img" aria-label="Tagesleistung der Set-Größen mit Wechselrichter-Deckelung">
        {/* Wechselrichter-Deckel (800 W) */}
        <line x1={PADX} y1={capY} x2={W - PADX} y2={capY} stroke={v('--color-text-faint')} strokeWidth={1} strokeDasharray="3 3" />
        <text x={W - PADX} y={capY - 3} textAnchor="end" fontSize={9} fill={v('--color-text-muted')}>800-W-Deckel</text>
        {/* Modul-Potenzial des gewählten Sets (gestrichelt) — die gekappte Fläche */}
        <polyline points={potential(sel.moduleWp)} fill="none" stroke={COLORS[sel.id]} strokeWidth={1} strokeDasharray="2 2" opacity={0.45} />
        {/* Ist-Kurven (gedeckelt) je Set, gewähltes hervorgehoben */}
        {sets.map(s => {
          const isSel = s.id === selectedId;
          return <polyline key={s.id} points={clipped(s.moduleWp, s.inverterW)} fill="none" stroke={COLORS[s.id]} strokeWidth={isSel ? 2.5 : 1.2} opacity={isSel ? 1 : 0.45} strokeLinejoin="round" />;
        })}
      </svg>
      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 9, color: v('--color-text-faint'), padding: "0 6px", marginTop: -2 }}>
        <span>morgens</span><span>Mittag</span><span>abends</span>
      </div>
      <div style={{ display: "flex", gap: 12, justifyContent: "center", marginTop: 6, flexWrap: "wrap" }}>
        {sets.map(s => (
          <span key={s.id} style={{ display: "inline-flex", alignItems: "center", gap: 4, fontSize: 10, color: s.id === selectedId ? v('--color-text-primary') : v('--color-text-muted'), fontWeight: s.id === selectedId ? 700 : 400 }}>
            <span style={{ width: 12, height: 2.5, background: COLORS[s.id], borderRadius: 1, display: "inline-block" }} />
            {s.label}
          </span>
        ))}
      </div>
    </div>
  );
}

function StatCard({ label, value, sub, help, helpTitle, valueColor }: { label: string; value: string; sub?: string; help?: React.ReactNode; helpTitle?: string; valueColor?: string }) {
  return (
    <div style={{ padding: "14px 12px", borderRadius: v('--radius-md'), background: v('--color-bg'), border: `1px solid ${v('--color-border')}`, textAlign: "center" }}>
      <div style={{ fontSize: 10, fontWeight: 700, color: v('--color-text-muted'), textTransform: "uppercase", letterSpacing: "0.04em", marginBottom: 4, display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 3 }}>
        {label}
        {help && <InfoTooltip title={helpTitle ?? label} ariaLabel="Mehr Infos" size={12}>{help}</InfoTooltip>}
      </div>
      <div style={{ fontSize: 18, fontWeight: 800, fontFamily: v('--font-mono'), color: valueColor ?? v('--color-text-primary') }}>{value}</div>
      {sub && <div style={{ fontSize: 10, color: v('--color-text-faint'), fontFamily: v('--font-mono'), marginTop: 2 }}>{sub}</div>}
    </div>
  );
}
