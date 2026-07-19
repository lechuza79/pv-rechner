"use client";
import { useState, useMemo, useCallback, useEffect } from "react";
import { useRouter, useSearchParams, type ReadonlyURLSearchParams } from "next/navigation";
import Link from "next/link";
import { PERSONEN, NUTZUNG, TRI, EA_KM_PRESETS, HAUSTYPEN, DACHARTEN, SPEICHER, INSULATION_BESTAND, HEIZSYSTEM, SCENARIOS, HEIZSYSTEM_SHORT, WP_M2_PRESETS, type Heizsystem } from "../../../lib/constants";
import { recommend, economicsForScenario } from "../../../lib/recommend";
import ScenarioTabs from "../../../components/ScenarioTabs";
import { calcWpAnnualElectricity, DEFAULT_WP_BUILDING } from "../../../lib/heatpump";
import { AccordionField, ChoiceButtons } from "../../../components/AccordionField";
import { trackEvent } from "../../../lib/analytics";
import { stackFunding, type FundingProgram } from "../../../lib/funding-programs";
import OptionCard from "../../../components/OptionCard";
import TriToggle from "../../../components/TriToggle";
import InlineEdit from "../../../components/InlineEdit";
import PresetNumberInput from "../../../components/PresetNumberInput";
import { v, iconSizes } from "../../../lib/theme";
import { usePrices } from "../../../lib/prices";
import { useFeedInRates } from "../../../lib/feedin";
import Header from "../../../components/Header";
import { IconArrowRight, IconSparkle, IconChevronDown, IconRefresh } from "../../../components/Icons";

// ─── URL slug mappings (sprechende Werte statt Indizes) ─────────────────────
// Reihenfolge MUSS mit den Arrays in lib/constants.ts übereinstimmen
const HAUS_SLUGS    = ["reihenhaus", "doppelhaus", "efh", "grosses-efh"] as const;
const DACH_SLUGS    = ["satteldach", "flachdach", "walmdach", "pultdach"] as const;
const PERSONEN_SLUGS = ["1", "2", "4", "5plus"] as const;
const NUTZUNG_SLUGS = ["weg", "teils", "homeoffice", "zuhause"] as const;

// Defaults — werden aus der URL ausgelassen (saubere kurze URLs)
const HAUS_DEFAULT = 2;     // efh
const DACH_DEFAULT = 0;     // satteldach
const PERS_DEFAULT = 1;     // 2 Personen
const NUTZ_DEFAULT = 1;     // teils zuhause

// ─── URL-State helpers (resilient: kaputte Werte → fallback) ────────────────
type SP = ReadonlyURLSearchParams;
function parseSlug(sp: SP, key: string, slugs: readonly string[], fallback: number): number {
  const raw = sp.get(key);
  if (raw == null) return fallback;
  const idx = slugs.indexOf(raw);
  return idx >= 0 ? idx : fallback;
}
function parseOptionalIntParam(sp: SP, key: string, min: number, max: number): number | null {
  const raw = sp.get(key);
  if (raw == null) return null;
  const n = parseInt(raw);
  return Number.isFinite(n) && n >= min && n <= max ? n : null;
}
function parseRangedInt(sp: SP, key: string, fallback: number, min: number, max: number): number {
  const v = parseOptionalIntParam(sp, key, min, max);
  return v ?? fallback;
}
function parseStrParam(sp: SP, key: string, fallback: string, allowed: string[]): string {
  const raw = sp.get(key);
  if (raw == null) return fallback;
  return allowed.includes(raw) ? raw : fallback;
}
function parsePlzParam(sp: SP): string {
  const raw = sp.get("plz");
  return raw && /^\d{5}$/.test(raw) ? raw : "";
}

// Großverbraucher-Detailfragen in Akkordeon-Reihenfolge. Kein Haustyp — der
// kommt hier schon aus der Dach-Frage; keine Klimaanlage — die hat in diesem
// Flow keine Detailabfrage.
const WP_FIELDS = ["wp-flaeche", "wp-daemmung", "wp-heizsystem"] as const;
const EA_FIELDS = ["ea-km"] as const;
const GV_FIELDS = [...WP_FIELDS, ...EA_FIELDS];

export default function Empfehlung() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const prices = usePrices();
  const feedIn = useFeedInRates();

  // ─── URL → State (Single Source of Truth) ─────────────────────────────────
  // Every read is reactive: when searchParams changes, this component re-renders.
  // Bad/missing/out-of-bounds values silently fall back to defaults — a shared
  // URL can never crash, no matter what someone tampered with.
  const haustyp    = parseSlug(searchParams, "haus", HAUS_SLUGS, HAUS_DEFAULT);
  const dachart    = parseSlug(searchParams, "dach", DACH_SLUGS, DACH_DEFAULT);
  const customRoofM2 = parseOptionalIntParam(searchParams, "flaeche", 5, 500);
  const personen   = parseSlug(searchParams, "personen", PERSONEN_SLUGS, PERS_DEFAULT);
  const nutzung    = parseSlug(searchParams, "nutzung", NUTZUNG_SLUGS, NUTZ_DEFAULT);
  const wp         = parseStrParam(searchParams, "wp", "nein", ["nein", "geplant", "ja"]);
  const ea         = parseStrParam(searchParams, "ea", "nein", ["nein", "geplant", "ja"]);
  const eaKm       = parseRangedInt(searchParams, "km", 15000, 1000, 50000);
  const klima      = parseStrParam(searchParams, "kl", "nein", ["nein", "geplant", "ja"]);
  // WP-Gebäudedaten (nur relevant bei aktiver WP) — dieselben Parameter wie der
  // PV-Rechner (wf/wi/wh), damit die Ergebnisseite sie direkt übernimmt.
  const wpWohnflaeche = parseRangedInt(searchParams, "wf", DEFAULT_WP_BUILDING.wohnflaeche, 20, 1000);
  const wpInsulation  = parseRangedInt(searchParams, "wi", DEFAULT_WP_BUILDING.insulationIdx, 0, INSULATION_BESTAND.length - 1);
  const wpHeizsystem  = parseStrParam(searchParams, "wh", DEFAULT_WP_BUILDING.heizsystem, ["fbh", "hk_neu", "hk_alt"]) as Heizsystem;
  const plz        = parsePlzParam(searchParams);
  const ertragKwp  = parseOptionalIntParam(searchParams, "ertrag", 700, 1400);
  const isRecommendation = searchParams.get("view") === "ergebnis";

  // Wizard-Step bleibt lokal — niemand teilt eine Halb-Eingabe-URL.
  // Beim "Eingaben ändern" wird auf den letzten Eingabe-Step zurückgesetzt.
  const [wizardStep, setWizardStep] = useState(0);
  const step = isRecommendation ? 3 : wizardStep;
  // Strompreis-Szenario für die gezeigte Rendite/Amortisation der Empfehlung.
  const [scenario, setScenario] = useState("realistic");

  // Progressive Disclosure im Großverbraucher-Step: welche Detailfragen der
  // Nutzer aktiv beantwortet hat (kein Preset vorausgewählt) + welche zum
  // Nachbearbeiten aufgeklappt ist. Rein lokal — aus der URL lässt sich das
  // NICHT ableiten: die Setter lassen Default-Werte weg, ein aktiv gewählter
  // Default hinterlässt also keinen Parameter. Wer mit einem fertigen Ergebnis
  // ankommt (view=ergebnis) hat alles gesetzt → direkt eingeklappt zeigen.
  const [gvAnswered, setGvAnswered] = useState<Set<string>>(() =>
    searchParams.get("view") === "ergebnis" ? new Set(GV_FIELDS) : new Set()
  );
  const [gvEditing, setGvEditing] = useState<string | null>(null);
  const markGvAnswered = (key: string) => {
    setGvAnswered(prev => (prev.has(key) ? prev : new Set(prev).add(key)));
    setGvEditing(null);
  };
  const openGvField = (keys: readonly string[]): string | null => {
    if (gvEditing && keys.includes(gvEditing)) return gvEditing;
    return keys.find(k => !gvAnswered.has(k)) ?? null;
  };

  // Transient UI state — not worth persisting
  const [plzLoading, setPlzLoading] = useState(false);
  const [plzSource, setPlzSource] = useState<string | null>(null);
  const [shareCopied, setShareCopied] = useState(false);

  // Förderung am Standort: PLZ → zutreffende Programme (serverseitig aus der DB).
  // Eindeutige PLZ → Programme direkt; mehrdeutige PLZ überlassen wir der
  // Ergebnisseite (dort fragt der Rechner „Stadt X oder Y?").
  const [fundingPrograms, setFundingPrograms] = useState<FundingProgram[]>([]);
  const [fundingOrt, setFundingOrt] = useState<string | null>(null);
  const fetchFunding = useCallback(async (inputPlz: string) => {
    if (!/^\d{5}$/.test(inputPlz)) return;
    try {
      const res = await fetch(`/api/funding?plz=${inputPlz}`);
      const data = await res.json();
      const candidates: { ort: string; ags: string; programs: FundingProgram[] }[] = Array.isArray(data.candidates) ? data.candidates : [];
      if (candidates.length === 1) {
        setFundingPrograms(candidates[0].programs);
        setFundingOrt(candidates[0].ort);
      } else {
        setFundingPrograms([]);
        setFundingOrt(null);
      }
    } catch {
      setFundingPrograms([]);
      setFundingOrt(null);
    }
  }, []);
  // Förderung auflösen, sobald wir auf der Empfehlungsseite sind und eine PLZ haben.
  useEffect(() => {
    if (isRecommendation && plz) fetchFunding(plz);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isRecommendation, plz]);

  // Local input buffer for the PLZ field. The URL only ever holds a complete,
  // valid 5-digit PLZ (parsePlzParam filters partials to ""), so a directly
  // URL-bound input would discard every keystroke until the 5th. Type freely
  // here; the URL syncs once the input is a full PLZ.
  const [plzInput, setPlzInput] = useState(plz);

  // Patch the URL — drops keys whose value equals the default (keeps URLs short).
  const updateUrl = useCallback((updates: Record<string, string | number | null>) => {
    const next = new URLSearchParams(searchParams.toString());
    for (const [key, value] of Object.entries(updates)) {
      if (value === null || value === "" || value === undefined) {
        next.delete(key);
      } else {
        next.set(key, String(value));
      }
    }
    router.replace(`/pv-bedarf-berechnen?${next.toString()}`, { scroll: false });
  }, [searchParams, router]);

  // Setters — each writes back to the URL with speaking slugs
  // Defaults werden weggelassen → kurze URLs
  const slugOrNull = <T extends readonly string[]>(idx: number, slugs: T, defaultIdx: number): string | null =>
    idx === defaultIdx ? null : slugs[idx];

  const setHaustyp     = (v: number) => updateUrl({ haus: slugOrNull(v, HAUS_SLUGS, HAUS_DEFAULT), flaeche: null });
  const setDachart     = (v: number) => updateUrl({ dach: slugOrNull(v, DACH_SLUGS, DACH_DEFAULT), flaeche: null });
  const setCustomRoofM2 = (v: number | null) => updateUrl({ flaeche: v });
  const setPersonen    = (v: number) => updateUrl({ personen: slugOrNull(v, PERSONEN_SLUGS, PERS_DEFAULT) });
  const setNutzung     = (v: number) => updateUrl({ nutzung: slugOrNull(v, NUTZUNG_SLUGS, NUTZ_DEFAULT) });
  const setWp          = (v: string) => updateUrl({ wp: v === "nein" ? null : v });
  const setEa          = (v: string) => updateUrl({ ea: v === "nein" ? null : v, km: v === "nein" ? null : eaKm });
  const setKlima       = (v: string) => updateUrl({ kl: v === "nein" ? null : v });
  const setEaKm        = (v: number) => updateUrl({ km: v });
  // WP-Gebäude: Defaults werden aus der URL ausgelassen (kurze URLs).
  const setWpWohnflaeche = (val: number) => updateUrl({ wf: val === DEFAULT_WP_BUILDING.wohnflaeche ? null : val });
  const setWpInsulation  = (val: number) => updateUrl({ wi: val === DEFAULT_WP_BUILDING.insulationIdx ? null : val });
  const setWpHeizsystem  = (val: Heizsystem) => updateUrl({ wh: val === DEFAULT_WP_BUILDING.heizsystem ? null : val });
  const setPlz         = (v: string) => updateUrl({ plz: v || null, ertrag: v ? ertragKwp : null });

  // Step-Navigation: Wizard ↔ Ergebnis
  const showRecommendation = () => updateUrl({ view: "ergebnis" });
  const hideRecommendation = () => {
    setWizardStep(STEPS.length - 1);
    updateUrl({ view: null });
  };

  // Wenn die URL nur PLZ ohne Ertrag enthält (typischer Fall einer geteilten URL):
  // PVGIS-Daten beim Mount nachholen, damit der Empfänger denselben Ertrag sieht.
  useEffect(() => {
    if (plz && !ertragKwp) fetchPvgis(plz);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchPvgis = async (inputPlz: string) => {
    if (!/^\d{5}$/.test(inputPlz)) return;
    setPlzLoading(true);
    try {
      const plzRes = await fetch("/plz.json");
      const plzData: Record<string, [number, number]> = await plzRes.json();
      const coords = plzData[inputPlz];
      if (!coords) { setPlzLoading(false); return; }
      const [lat, lon] = coords;
      const res = await fetch(`/api/pvgis?lat=${lat}&lon=${lon}&plzPrefix=${inputPlz.slice(0, 2)}`);
      const data = await res.json();
      if (data.annual && data.annual >= 700 && data.annual <= 1400) {
        // Write PLZ + Ertrag together: this runs after an async await, so the
        // updateUrl closure here predates setPlz and would otherwise drop the
        // freshly-set PLZ from the URL. Passing inputPlz keeps both in sync.
        updateUrl({ plz: inputPlz, ertrag: data.annual });
        setPlzSource(data.source);
      }
    } catch { /* keep default */ }
    setPlzLoading(false);
  };

  const STEPS = ["Dein Haus", "Dein Haushalt", "Großverbraucher"];
  const next = () => {
    if (wizardStep < STEPS.length - 1) setWizardStep(wizardStep + 1);
    else { trackEvent("empfehlung_ergebnis"); showRecommendation(); }
  };
  const back = () => wizardStep > 0 && setWizardStep(wizardStep - 1);

  // Auto-Berechnung der Dachfläche aus Haustyp + Dachart (für Anzeige in Step 0)
  const computedRoofM2 = Math.round(HAUSTYPEN[haustyp].footprint * DACHARTEN[dachart].factor);
  const effectiveRoofM2 = customRoofM2 ?? computedRoofM2;
  const previewMaxKwp = Math.round(effectiveRoofM2 * 0.2 * 2) / 2;

  // WP-Jahresstrom aus den Gebäudedaten (für Live-Hinweis im Step + Empfehlung)
  const wpKwh = calcWpAnnualElectricity({
    situation: "bestand", wohnflaeche: wpWohnflaeche, insulationIdx: wpInsulation,
    personen: PERSONEN[personen].count, heizsystem: wpHeizsystem, wpType: "lwwp",
  });

  // Empfehlung berechnen (mit PLZ-spezifischem Ertrag und ggf. eigener Dachfläche)
  const recInput = {
    personen, nutzung, wp, ea, eaKm, klima,
    haustyp, dachart, budgetLimit: null,
    ertragKwp: ertragKwp ?? undefined,
    customRoofM2: customRoofM2 ?? undefined,
    wpWohnflaeche, wpInsulation, wpHeizsystem,
  };
  // Die Empfehlung selbst bleibt am realistischen Szenario verankert — sonst
  // würde die empfohlene Anlagengröße beim Szenario-Umschalten springen.
  const rec = isRecommendation ? recommend(recInput, prices, feedIn) : null;
  // Rendite/Amortisation der empfohlenen Anlage je Strompreis-Szenario.
  const recScenarios = useMemo(() => (rec
    ? SCENARIOS.map(s => ({ ...s, eco: economicsForScenario(recInput, rec.kwp, rec.speicherKwh, { strom: s.strom, evDelta: s.evDelta }, prices, feedIn) }))
    : []),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [rec?.kwp, rec?.speicherKwh, personen, nutzung, wp, ea, eaKm, klima, haustyp, dachart, ertragKwp, customRoofM2, wpWohnflaeche, wpInsulation, wpHeizsystem, prices, feedIn]);
  const selRec = recScenarios.find(s => s.id === scenario) ?? recScenarios.find(s => s.id === "realistic");
  // Alternativen ebenfalls im gewählten Szenario, sonst widerspräche der
  // Vergleich der oben gewählten Annahme (gleiche Falle wie im WP-Rechner).
  const selScenarioDef = SCENARIOS.find(s => s.id === scenario) ?? SCENARIOS[1];
  const altEco = useMemo(() => (rec
    ? rec.alternatives.map(alt => economicsForScenario(recInput, alt.kwp, alt.speicherKwh, { strom: selScenarioDef.strom, evDelta: selScenarioDef.evDelta }, prices, feedIn))
    : []),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [rec?.kwp, rec?.speicherKwh, scenario, personen, nutzung, wp, ea, eaKm, klima, haustyp, dachart, ertragKwp, customRoofM2, wpWohnflaeche, wpInsulation, wpHeizsystem, prices, feedIn]);

  // Förderung für die empfohlene Anlage (gleiche Mathe wie Stadt-Seite + Rechner).
  // Nur aktive, pauschal berechenbare Programme tragen bei. Das zuletzt (am
  // spezifischsten) angewandte Programm wird im Ergebnis vorab scharf geschaltet.
  const fundingStack = rec
    ? stackFunding(fundingPrograms, rec.kwp, rec.speicherKwh, rec.reasoning.investition)
    : { total: 0, applied: [] };
  const armedFoeId = fundingStack.applied.length > 0
    ? fundingStack.applied[fundingStack.applied.length - 1].program.id
    : null;

  const goToResult = (kwp: number, speicherIdx: number) => {
    const anlageIdx = kwp <= 5 ? 0 : kwp <= 8 ? 1 : kwp <= 10 ? 2 : kwp <= 15 ? 3 : 4;
    const p = new URLSearchParams();
    p.set("a", String(anlageIdx));
    if (anlageIdx === 4) p.set("ck", String(kwp));
    p.set("s", String(speicherIdx));
    p.set("p", String(personen));
    p.set("n", String(nutzung));
    p.set("wp", wp);
    if (wp !== "nein") { p.set("wf", String(wpWohnflaeche)); p.set("wi", String(wpInsulation)); p.set("wh", wpHeizsystem); }
    p.set("ea", ea);
    if (ea !== "nein") p.set("km", String(eaKm));
    if (klima !== "nein") p.set("kl", klima);
    p.set("flow", "emp");
    p.set("ht", String(haustyp));
    p.set("da", String(dachart));
    if (plz) p.set("plz", plz);
    if (ertragKwp) p.set("er", String(ertragKwp));
    // Lokale Förderung scharf ans Ergebnis durchreichen, damit die Amortisation
    // sie einrechnet (wie bei einem Link von einer Förder-Stadtseite).
    if (armedFoeId) p.set("foe", armedFoeId);
    router.push(`/photovoltaik-rechner?${p.toString()}`);
  };

  const findSpeicherIdx = (kwh: number) => {
    const idx = SPEICHER.findIndex(s => s.kwh === kwh);
    return idx >= 0 ? idx : 0;
  };

  // Share: Native Share API → Clipboard fallback
  const shareUrl = async () => {
    const url = window.location.href;
    try {
      if (typeof navigator !== "undefined" && navigator.share) {
        await navigator.share({ title: "Meine PV-Empfehlung", url });
        return;
      }
      await navigator.clipboard.writeText(url);
      setShareCopied(true);
      setTimeout(() => setShareCopied(false), 2000);
    } catch { /* user cancelled */ }
  };

  return (
    <div style={{ background: v('--color-bg'), fontFamily: v('--font-text'), color: v('--color-text-primary'), minHeight: "100vh", padding: "20px 16px" }}>

        <Header />

      <div style={{ maxWidth: v('--page-max-width'), margin: "0 auto" }}>

        <div style={{ textAlign: "center", marginBottom: 24 }}>
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
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 16 }}>
                  {DACHARTEN.map((d, i) => (
                    <OptionCard key={i} selected={dachart === i} onClick={() => setDachart(i)} label={d.label} sub={d.sub} />
                  ))}
                </div>

                {/* Berechnete Dachfläche + Override */}
                <div style={{
                  background: v('--color-bg-muted'), borderRadius: v('--radius-md'), padding: "12px 14px",
                  border: `1px solid ${v('--color-border')}`,
                  display: "flex", flexDirection: "column", gap: 6,
                }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 8 }}>
                    <span style={{ fontSize: 12, fontWeight: 600, color: v('--color-text-secondary'), textTransform: "uppercase", letterSpacing: "0.04em" }}>
                      Nutzbare Dachfläche
                    </span>
                    <span style={{ fontSize: 13, color: v('--color-text-muted') }}>
                      max. <span style={{ fontFamily: v('--font-mono'), fontWeight: 700, color: v('--color-text-primary') }}>{previewMaxKwp} kWp</span>
                    </span>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                    <InlineEdit
                      value={effectiveRoofM2}
                      onCommit={v => setCustomRoofM2(v)}
                      unit=" m²"
                      min={5}
                      max={500}
                      step={1}
                      width={56}
                    />
                    <span style={{ fontSize: 12, color: v('--color-text-muted') }}>
                      {customRoofM2 !== null
                        ? <button onClick={() => setCustomRoofM2(null)} style={{ background: "none", border: "none", color: v('--color-accent'), cursor: "pointer", padding: 0, fontSize: 12, fontFamily: v('--font-text') }}>auf Auswahl zurücksetzen</button>
                        : "Klick zum Bearbeiten, wenn du deine Dachfläche genauer kennst"}
                    </span>
                  </div>
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
                {wp !== "nein" ? (() => {
                  const openKey = openGvField(WP_FIELDS);
                  return (
                    <div style={{ marginBottom: 28, marginTop: -4 }}>
                      <div style={{ fontSize: 11, color: v('--color-text-muted'), marginBottom: 12, lineHeight: 1.5 }}>
                        Wie viel Heizstrom deine Wärmepumpe braucht, berechnen wir aus den Angaben zu deinem Gebäude.
                      </div>
                      <AccordionField label="Wohnfläche" open={openKey === "wp-flaeche"} answered={gvAnswered.has("wp-flaeche")} summary={`${wpWohnflaeche} m²`} onEdit={() => setGvEditing("wp-flaeche")}>
                        <div style={{ display: "flex", gap: 6, alignItems: "center", flexWrap: "wrap" }}>
                          {WP_M2_PRESETS.map(m2 => {
                            const active = gvAnswered.has("wp-flaeche") && wpWohnflaeche === m2;
                            return (
                              <button key={m2} onClick={() => { setWpWohnflaeche(m2); markGvAnswered("wp-flaeche"); }} style={{
                                padding: "7px 10px", borderRadius: v('--radius-sm'), fontSize: 12, fontWeight: 600, cursor: "pointer",
                                background: active ? v('--color-accent-dim') : v('--color-bg-muted'),
                                border: active ? `1.5px solid ${v('--color-accent')}` : `1.5px solid ${v('--color-border')}`,
                                color: active ? v('--color-accent') : v('--color-text-muted'),
                              }}>{m2} m²</button>
                            );
                          })}
                          <PresetNumberInput value={wpWohnflaeche} presets={WP_M2_PRESETS} min={20} max={1000} unit="m²"
                            onCommit={n => { setWpWohnflaeche(n); markGvAnswered("wp-flaeche"); }}
                            onFocus={() => setGvEditing("wp-flaeche")} onBlur={() => setGvEditing(null)} />
                        </div>
                      </AccordionField>
                      <AccordionField label="Dämmzustand" open={openKey === "wp-daemmung"} answered={gvAnswered.has("wp-daemmung")} summary={INSULATION_BESTAND[wpInsulation].label} onEdit={() => setGvEditing("wp-daemmung")}>
                        <ChoiceButtons options={INSULATION_BESTAND} columns={3} selected={gvAnswered.has("wp-daemmung") ? wpInsulation : null}
                          onSelect={i => { setWpInsulation(i); markGvAnswered("wp-daemmung"); }} render={ins => ins.label} />
                      </AccordionField>
                      <AccordionField label="Heizsystem" open={openKey === "wp-heizsystem"} answered={gvAnswered.has("wp-heizsystem")} summary={HEIZSYSTEM.find(h => h.id === wpHeizsystem)?.label} onEdit={() => setGvEditing("wp-heizsystem")}>
                        <ChoiceButtons options={HEIZSYSTEM} columns={3} selected={gvAnswered.has("wp-heizsystem") ? HEIZSYSTEM.findIndex(h => h.id === wpHeizsystem) : null}
                          onSelect={i => { setWpHeizsystem(HEIZSYSTEM[i].id as Heizsystem); markGvAnswered("wp-heizsystem"); }}
                          render={h => HEIZSYSTEM_SHORT[h.id]} />
                      </AccordionField>
                      {openKey === null && (
                        <div className="sc-acc" style={{ fontSize: 11, color: v('--color-text-faint'), marginTop: 4, lineHeight: 1.5 }}>
                          Daraus ergeben sich rund <strong style={{ color: v('--color-text-primary') }}>{wpKwh.toLocaleString("de-DE")} kWh</strong> Heizstrom pro Jahr.
                        </div>
                      )}
                    </div>
                  );
                })() : (
                  <div style={{ fontSize: 12, color: v('--color-text-muted'), marginTop: -10, marginBottom: 16, lineHeight: 1.5, paddingLeft: 2 }}>
                    Eine Wärmepumpe erhöht deinen Stromverbrauch deutlich — eine größere PV-Anlage lohnt sich dann besonders.
                  </div>
                )}
                <TriToggle label="🚗 Elektroauto" options={TRI} value={ea} onChange={setEa} />
                {ea !== "nein" && (() => {
                  const openKey = openGvField(EA_FIELDS);
                  return (
                    <div style={{ marginBottom: 28, marginTop: -4 }}>
                      <AccordionField label="Laufleistung ca." open={openKey === "ea-km"} answered={gvAnswered.has("ea-km")} summary={`${eaKm.toLocaleString("de-DE")} km`} onEdit={() => setGvEditing("ea-km")}>
                        <div style={{ display: "flex", gap: 6, alignItems: "center", flexWrap: "wrap" }}>
                          {EA_KM_PRESETS.map(km => {
                            const active = gvAnswered.has("ea-km") && eaKm === km;
                            return (
                              <button key={km} onClick={() => { setEaKm(km); markGvAnswered("ea-km"); }} style={{
                                padding: "7px 10px", borderRadius: v('--radius-sm'), fontSize: 12, fontWeight: 600, cursor: "pointer",
                                background: active ? v('--color-accent-dim') : v('--color-bg-muted'),
                                border: active ? `1.5px solid ${v('--color-accent')}` : `1.5px solid ${v('--color-border')}`,
                                color: active ? v('--color-accent') : v('--color-text-muted'),
                              }}>{(km / 1000).toFixed(0)}k km</button>
                            );
                          })}
                          <PresetNumberInput value={eaKm} presets={EA_KM_PRESETS} min={1000} max={50000} unit="km"
                            onCommit={n => { setEaKm(n); markGvAnswered("ea-km"); }}
                            onFocus={() => setGvEditing("ea-km")} onBlur={() => setGvEditing(null)} />
                        </div>
                      </AccordionField>
                    </div>
                  );
                })()}
                {ea === "nein" && (
                  <div style={{ fontSize: 12, color: v('--color-text-muted'), marginTop: -10, marginBottom: 8, lineHeight: 1.5, paddingLeft: 2 }}>
                    Ein E-Auto erhöht deinen Verbrauch um ~2.700 kWh/Jahr (bei 15.000 km) — gut für die PV-Rentabilität.
                  </div>
                )}
                <TriToggle label="❄️ Klimaanlage" options={TRI} value={klima} onChange={setKlima} />
                <div style={{ fontSize: 12, color: v('--color-text-muted'), marginTop: -10, marginBottom: 8, lineHeight: 1.5, paddingLeft: 2 }}>
                  Eine Klimaanlage kühlt im Sommer — genau dann, wenn die Sonne scheint. Sie hebt den Eigenverbrauch
                  besonders stark. Eigener <Link href="/klimaanlage-stromkosten" style={{ color: v('--color-accent'), textDecoration: "none", fontWeight: 600 }}>Klimaanlagen-Rechner</Link> für die Stromkosten.
                </div>
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
                <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>{step === STEPS.length - 1 ? <><IconSparkle size={iconSizes.md} /> Empfehlung anzeigen</> : <>Weiter <IconArrowRight size={iconSizes.md} /></>}</span>
              </button>
            </div>
          </div>
        )}

        {/* ── RECOMMENDATION ── */}
        {isRecommendation && rec && (
          <div className="fu">
            {/* Strompreis-Szenario ganz oben: bewegt die gezeigte Rendite und
                Amortisation. Die empfohlene Anlagengröße bleibt bewusst fix. */}
            <ScenarioTabs
              tabs={SCENARIOS.map(s => ({ id: s.id, label: s.label, explain: s.explain, sub: `+${(s.strom * 100).toLocaleString("de-DE")} %/Jahr` }))}
              selected={scenario}
              onSelect={setScenario}
            />
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
                  + {rec.speicherKwh.toLocaleString("de-DE")} kWh Speicher
                </div>
              )}
              <div style={{ fontSize: 14, color: v('--color-text-secondary'), marginTop: 12 }}>
                Geschätzte Investition: <span style={{ fontWeight: 700, color: v('--color-text-primary'), fontFamily: v('--font-mono') }}>{rec.reasoning.investition.toLocaleString("de-DE")} €</span>
              </div>
              {selRec?.eco.paybackYears && (
                <div style={{ fontSize: 13, color: v('--color-text-muted'), marginTop: 4 }}>
                  Amortisation in ca. {selRec.eco.paybackYears} Jahren
                </div>
              )}
              <div style={{ fontSize: 13, color: v('--color-text-secondary'), marginTop: 8, paddingTop: 8, borderTop: `1px solid ${v('--color-border-accent')}` }}>
                Rendite nach 25 Jahren: <span style={{ fontWeight: 700, color: (selRec?.eco.npv25 ?? 0) >= 0 ? v('--color-positive') : v('--color-negative'), fontFamily: v('--font-mono') }}>
                  {(selRec?.eco.npv25 ?? 0) >= 0 ? "+" : ""}{Math.round(selRec?.eco.npv25 ?? 0).toLocaleString("de-DE")} €
                </span>
              </div>
              {rec.reasoning.budgetConstrained && (
                <div style={{ fontSize: 12, color: v('--color-negative'), marginTop: 8, fontWeight: 600 }}>
                  Budget-begrenzt — ohne Limit wäre mehr möglich
                </div>
              )}
            </div>

            {/* Standort (optional, präzisiert den Ertrag) */}
            <div style={{
              background: v('--color-bg'), borderRadius: v('--radius-md'), padding: "12px 16px", marginBottom: 16,
              border: `1px solid ${v('--color-border')}`,
            }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
                <div style={{ flex: "1 1 200px" }}>
                  <div style={{ fontSize: 12, fontWeight: 700, color: v('--color-text-secondary'), textTransform: "uppercase", letterSpacing: "0.04em", marginBottom: 4 }}>
                    Standort {ertragKwp ? "" : "(optional)"}
                  </div>
                  <div style={{ fontSize: 12, color: v('--color-text-muted'), lineHeight: 1.5 }}>
                    {ertragKwp
                      ? `PLZ ${plz}: ${ertragKwp} kWh/kWp/Jahr${plzSource ? ` · ${plzSource}` : ""}`
                      : "PLZ angeben — wir holen den echten Sonnenertrag deines Standorts. Sonst rechnen wir mit dem Bundesmittel (950 kWh/kWp)."}
                  </div>
                </div>
                <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                  <input
                    type="text"
                    inputMode="numeric"
                    placeholder="PLZ"
                    value={plzInput}
                    onChange={e => {
                      const v2 = e.target.value.replace(/\D/g, "").slice(0, 5);
                      setPlzInput(v2);
                      if (v2.length === 5) { setPlz(v2); fetchPvgis(v2); }
                      else setPlz("");
                    }}
                    style={{
                      width: 80, padding: "8px 10px", borderRadius: v('--radius-sm'), fontSize: 14, fontFamily: v('--font-mono'),
                      border: `1px solid ${v('--color-border')}`, background: v('--color-bg-muted'),
                      color: v('--color-text-primary'), outline: "none", textAlign: "center",
                    }}
                  />
                  {plzLoading && <span style={{ fontSize: 11, color: v('--color-text-muted') }}>lädt…</span>}
                </div>
              </div>
            </div>

            {/* Warum-Details */}
            <details style={{
              background: v('--color-bg'), borderRadius: v('--radius-md'), padding: "14px 16px", marginBottom: 16,
              border: `1px solid ${v('--color-border')}`,
            }}>
              <summary style={{ fontSize: 14, fontWeight: 700, color: v('--color-text-primary'), cursor: "pointer", listStyle: "none", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span>Warum diese Konfiguration?</span>
                <span style={{ fontSize: 11, color: v('--color-text-muted'), fontWeight: 400, display: "inline-flex", alignItems: "center", gap: 4 }}>Details <IconChevronDown size={iconSizes.xs} /></span>
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
                  {rec.reasoning.klimaConsumption > 0 && (
                    <div>
                      <div style={{ color: v('--color-text-secondary'), fontSize: 11, textTransform: "uppercase", letterSpacing: "0.04em" }}>+ Klimaanlage</div>
                      <div style={{ fontFamily: v('--font-mono'), fontWeight: 600, color: v('--color-text-primary') }}>{rec.reasoning.klimaConsumption.toLocaleString("de-DE")} kWh</div>
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
                    <div style={{ color: v('--color-text-secondary'), fontSize: 11, textTransform: "uppercase", letterSpacing: "0.04em" }}>Autarkie</div>
                    <div style={{ fontFamily: v('--font-mono'), fontWeight: 700, color: v('--color-positive') }}>{rec.reasoning.autarkie}%</div>
                  </div>
                  <div>
                    <div style={{ color: v('--color-text-secondary'), fontSize: 11, textTransform: "uppercase", letterSpacing: "0.04em" }}>Eigenverbrauch</div>
                    <div style={{ fontFamily: v('--font-mono'), fontWeight: 700, color: v('--color-text-primary') }}>{rec.reasoning.eigenverbrauch}%</div>
                  </div>
                </div>
                <div style={{ fontSize: 12, color: v('--color-text-muted'), borderTop: `1px solid ${v('--color-border')}`, paddingTop: 10, lineHeight: 1.6 }}>
                  {rec.kwp < rec.reasoning.maxRoofKwp
                    ? `Diese Konfiguration bringt über 25 Jahre die höchste Rendite — größere Anlagen senken den Eigenverbrauchsanteil zu stark.`
                    : `Die Empfehlung nutzt deine Dachfläche maximal aus (${rec.reasoning.maxRoofKwp} kWp).`
                  }
                  {rec.speicherKwh > 0 && ` Der ${rec.speicherKwh.toLocaleString("de-DE")} kWh Speicher hebt deine Autarkie von ${rec.reasoning.autarkieOhneSpeicher}% auf ${rec.reasoning.autarkie}% (Eigenverbrauch ${rec.reasoning.eigenverbrauchOhneSpeicher}% → ${rec.reasoning.eigenverbrauch}%).`}
                </div>
                {wp !== "nein" && (
                  <div style={{ fontSize: 12, color: v('--color-text-muted'), borderTop: `1px solid ${v('--color-border')}`, paddingTop: 10, marginTop: 10, lineHeight: 1.6 }}>
                    <strong style={{ color: v('--color-text-secondary'), fontWeight: 700 }}>Hinweis bei Wärmepumpe:</strong> Wir rechnen den Winter-Speicher-Effekt mit ein. Ein Teil deines Stroms wird genau dann gebraucht, wenn die Sonne kaum scheint — der Speicher kann das nur teilweise abfangen. Größere Speicher bringen hier weniger zusätzlichen Nutzen als die reine Verbrauchsmenge vermuten lässt.{" "}
                    <Link href="/methodik" style={{ color: v('--color-accent'), textDecoration: "none" }}>Mehr dazu in der Methodik →</Link>
                  </div>
                )}
              </div>
            </details>

            {/* Förderung am Standort */}
            {fundingStack.total > 0 && (
              <div style={{
                background: v('--color-bg-muted'), border: `1px solid ${v('--color-positive')}`,
                borderRadius: v('--radius-md'), padding: "12px 14px", marginBottom: 12,
              }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 10, marginBottom: 4 }}>
                  <span style={{ fontSize: 13, fontWeight: 700, color: v('--color-text-primary') }}>
                    Förderung{fundingOrt ? ` in ${fundingOrt}` : ""}
                  </span>
                  <span style={{ fontFamily: v('--font-mono'), fontWeight: 700, fontSize: 15, color: v('--color-positive') }}>
                    + {Math.round(fundingStack.total).toLocaleString("de-DE")} €
                  </span>
                </div>
                <div style={{ fontSize: 12, color: v('--color-text-muted'), lineHeight: 1.5 }}>
                  {fundingStack.applied.map((a) => a.program.name).join(", ")} senkt deine Investition für diese
                  Anlage um rund {Math.round(fundingStack.total).toLocaleString("de-DE")} €. Im Ergebnis ist die
                  Förderung bereits eingerechnet.
                </div>
              </div>
            )}

            {/* CTA */}
            <button onClick={() => goToResult(rec.kwp, rec.speicherIdx)} style={{
              width: "100%", padding: "14px", borderRadius: v('--radius-md'), fontSize: 15, fontWeight: 700,
              background: v('--color-accent'), border: "none", color: v('--color-text-on-accent'), cursor: "pointer",
              fontFamily: v('--font-text'), marginBottom: 12,
            }}>
<span style={{ display: "inline-flex", alignItems: "center", gap: 6, justifyContent: "center" }}>Ergebnis anzeigen <IconArrowRight size={iconSizes.md} /></span>
            </button>

            {/* Share + Eingaben ändern */}
            <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
              <button onClick={shareUrl} style={{
                flex: 1, padding: "10px", borderRadius: v('--radius-md'), fontSize: 13, fontWeight: 600,
                background: "transparent", border: `1px solid ${v('--color-border-muted')}`, color: v('--color-text-secondary'), cursor: "pointer",
                fontFamily: v('--font-text'),
              }}>
                {shareCopied ? "Link kopiert ✓" : "Empfehlung teilen"}
              </button>
              <button onClick={hideRecommendation} style={{
                flex: 1, padding: "10px", borderRadius: v('--radius-md'), fontSize: 13, fontWeight: 600,
                background: "transparent", border: `1px solid ${v('--color-border-muted')}`, color: v('--color-text-secondary'), cursor: "pointer",
                fontFamily: v('--font-text'),
              }}><span style={{ display: "inline-flex", alignItems: "center", gap: 6, justifyContent: "center" }}><IconRefresh size={iconSizes.md} /> Eingaben ändern</span></button>
            </div>

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
                          {alt.kwp} kWp{alt.speicherKwh > 0 ? ` + ${alt.speicherKwh.toLocaleString("de-DE")} kWh` : ""}
                        </span>
                      </div>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <span style={{ fontSize: 12, color: v('--color-text-muted') }}>{alt.reason}</span>
                        <span style={{ fontSize: 12, fontFamily: v('--font-mono'), color: v('--color-text-secondary') }}>
                          {alt.investition.toLocaleString("de-DE")} €
                        </span>
                      </div>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 6, paddingTop: 6, borderTop: `1px dashed ${v('--color-border')}` }}>
                        <span style={{ fontSize: 11, color: v('--color-text-muted'), textTransform: "uppercase", letterSpacing: "0.04em", fontWeight: 600 }}>Rendite 25 Jahre</span>
                        <span style={{ fontSize: 12, fontFamily: v('--font-mono'), fontWeight: 700, color: (altEco[i]?.npv25 ?? alt.npv25) >= 0 ? v('--color-positive') : v('--color-negative') }}>
                          {(altEco[i]?.npv25 ?? alt.npv25) >= 0 ? "+" : ""}{Math.round(altEco[i]?.npv25 ?? alt.npv25).toLocaleString("de-DE")} €
                        </span>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div style={{ textAlign: "center", fontSize: 11, color: v('--color-text-faint'), padding: "20px 0 8px", lineHeight: 1.6 }}>
              Die Empfehlung basiert auf Durchschnittswerten. Auf der Ergebnisseite kannst du alle Annahmen anpassen.
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
