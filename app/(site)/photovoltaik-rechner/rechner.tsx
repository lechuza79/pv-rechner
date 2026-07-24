"use client";
import { useState, useMemo, useEffect, useCallback, useRef } from "react";
import Link from "next/link";
import { useAuth, signInWithMagicLink } from "../../../lib/auth";
import { useSharedPlz, readLocation } from "../../../lib/location";
import { paramsToRow } from "../../../lib/types";
import { YEARS, ANLAGEN, SPEICHER, PERSONEN, NUTZUNG, TRI, EA_KM_PRESETS, SCENARIOS, SHARE_KEYS, HAUSTYPEN, HAUSTYP_WP, DACHARTEN, INSULATION_BESTAND, HEIZSYSTEM, HEIZSYSTEM_SHORT, WP_M2_PRESETS, NO_PLZ_DEFAULT_YIELD, type Heizsystem } from "../../../lib/constants";
import { estimateCost, calcEigenverbrauch, calcWeightedFeedIn, calc, batteryReplaceCost, paramInt, paramFloat, paramStr } from "../../../lib/calc";
import { simulatePvYear, simulateExampleDay, EXAMPLE_DAYS } from "../../../lib/pv-sim";
import { calcWpAnnualElectricity, calcJAZ, flowTempForSystem, DEFAULT_WP_BUILDING } from "../../../lib/heatpump";
import OptionCard from "../../../components/OptionCard";
import TriToggle from "../../../components/TriToggle";
import InlineEdit from "../../../components/InlineEdit";
import PresetNumberInput from "../../../components/PresetNumberInput";
import GlossaryTerm from "../../../components/GlossaryTerm";
import { calcExtraConsumption, calcEaAnnual, KLIMA_DEFAULT_M2, type HouseholdProfile } from "../../../lib/consumption";
import { calcAircon } from "../../../lib/aircon";
import { DEFAULT_AIRCON_CONFIG as CFG } from "../../../lib/aircon-config";
import { useCoolingDegree } from "../../../lib/useCoolingDegree";
import KlimaDetailModal from "../../../components/KlimaDetailModal";
import Chart from "./_components/Chart";
import { v, iconSizes } from "../../../lib/theme";
import { usePrices } from "../../../lib/prices";
import { DEFAULT_PRICES } from "../../../lib/prices-config";
import { useFeedInRates } from "../../../lib/feedin";
import { IconArrowRight, IconSparkle, IconChevronDown, IconRefresh, IconSun } from "../../../components/Icons";
import { AccordionField, ChoiceButtons } from "../../../components/AccordionField";
import ScenarioTabs from "../../../components/ScenarioTabs";
import { useChartExport } from "../../../lib/useChartExport";
import { trackEvent } from "../../../lib/analytics";
import ChartExportBar from "../../../components/ChartExportBar";
import ResultHeroCard from "./_components/ResultHeroCard";
import QuickSettings from "./_components/QuickSettings";
import ResultStats from "./_components/ResultStats";
import ResultActions from "./_components/ResultActions";
import ResultFunding from "./_components/ResultFunding";
import { stackFunding, type FundingProgram } from "../../../lib/funding-programs";

// Großverbraucher-Detailfragen in ihrer Akkordeon-Reihenfolge. Pro aktivem
// Verbraucher wird immer nur die erste noch offene Frage aufgeklappt.
const WP_FIELDS = ["wp-haustyp", "wp-flaeche", "wp-daemmung", "wp-heizsystem"] as const;
const EA_FIELDS = ["ea-km"] as const;
const KLIMA_FIELDS = ["klima-rooms"] as const;
const GV_FIELDS = [...WP_FIELDS, ...EA_FIELDS, ...KLIMA_FIELDS];
// Modell-Annahme für die Klima-Schnellschätzung, aus der geteilten Config (kein
// Drift zum Klimaanlagen-Rechner). Langlabel auf den Kurznamen vor der Klammer.
const KLIMA_DEVICE_LABEL = (CFG.devices.find(d => d.id === CFG.defaultDeviceId)?.label ?? "Split-Anlage").split(" (")[0];

// ─── Main ────────────────────────────────────────────────────────────────────
export default function PVRechner({ initialParams }: { initialParams?: Record<string, string | string[] | undefined> }) {
  // 'er' (Ertrag) und 'plz' sind reine Vorbefüll-Hinweise (z.B. von einer
  // regionalen Landingpage): sie seeden State, dürfen aber NICHT direkt ins
  // Ergebnis springen — das tut nur eine echte Konfiguration (a/s/p/n/…).
  const RESULT_KEYS = SHARE_KEYS.filter(k => k !== "er" && k !== "plz" && k !== "foe");
  const hasShare = !!initialParams && RESULT_KEYS.some(k => k in initialParams);

  const [step, setStep] = useState(hasShare ? 4 : 0);
  const [anlage, setAnlage] = useState(hasShare ? paramInt(initialParams, "a", 2, 0, 4) : 2);
  const [customKwp, setCustomKwp] = useState(hasShare ? paramInt(initialParams, "ck", 12, 1, 50) : 12);
  const [speicher, setSpeicher] = useState(hasShare ? paramInt(initialParams, "s", 0, 0, SPEICHER.length - 1) : 0);
  const [personen, setPersonen] = useState(hasShare ? paramInt(initialParams, "p", 1, 0, 3) : 1);
  const [nutzung, setNutzung] = useState(hasShare ? paramInt(initialParams, "n", 1, 0, 3) : 1);
  const [wp, setWp] = useState(hasShare ? paramStr(initialParams, "wp", "nein", ["nein", "geplant", "ja"]) : "nein");
  const [ea, setEa] = useState(hasShare ? paramStr(initialParams, "ea", "nein", ["nein", "geplant", "ja"]) : "nein");
  const [eaKm, setEaKm] = useState(hasShare ? paramInt(initialParams, "km", 15000, 1000, 50000) : 15000);
  const [klima, setKlima] = useState(hasShare ? paramStr(initialParams, "kl", "nein", ["nein", "geplant", "ja"]) : "nein");
  // Klimaanlage: Anzahl gekühlter Räume (statt Wohnfläche — die kollidierte mit
  // der WP-Wohnfläche). Aus Räumen + Standort schätzen wir den Kühlstrom mit
  // demselben Wettermodell wie der Klimaanlagen-Rechner (calcAircon), kein Drift.
  const [klimaRooms, setKlimaRooms] = useState(hasShare ? paramInt(initialParams, "klr", 2, 1, 5) : 2);
  // Direkt übernommener Kühlstrom (kWh/a) — aus dem Detail-Modal oder dem
  // Klimaanlagen-Rechner. Hat Vorrang vor der Schnellschätzung; wird gelöscht,
  // sobald der Nutzer die Räume ändert (dann greift wieder die Schätzung).
  const [klimaKwh, setKlimaKwh] = useState<number | null>(hasShare && initialParams?.klwh ? (() => { const n = Number(initialParams.klwh); return isFinite(n) && n >= 0 && n <= 20000 ? Math.round(n) : null; })() : null);
  const setKlimaRoomsManual = (n: number) => { setKlimaRooms(n); setKlimaKwh(null); setOEv(null); };
  const [klimaDetailOpen, setKlimaDetailOpen] = useState(false);

  // Wärmepumpen-Gebäudedaten: nötig, damit der WP-Jahresstrom genauso aus dem
  // Heizwärmebedarf ÷ Arbeitszahl kommt wie im Wärmepumpen-Rechner (statt einer
  // Pauschale). Nur relevant wenn wp !== "nein". Bestand angenommen (LWWP).
  const [wpWohnflaeche, setWpWohnflaeche] = useState(hasShare ? paramInt(initialParams, "wf", DEFAULT_WP_BUILDING.wohnflaeche, 20, 1000) : DEFAULT_WP_BUILDING.wohnflaeche);
  const [wpInsulation, setWpInsulation] = useState(hasShare ? paramInt(initialParams, "wi", DEFAULT_WP_BUILDING.insulationIdx, 0, INSULATION_BESTAND.length - 1) : DEFAULT_WP_BUILDING.insulationIdx);
  const [wpHeizsystem, setWpHeizsystem] = useState<Heizsystem>(hasShare ? (paramStr(initialParams, "wh", DEFAULT_WP_BUILDING.heizsystem, ["fbh", "hk_neu", "hk_alt"]) as Heizsystem) : DEFAULT_WP_BUILDING.heizsystem);
  // Haustyp (geteilte Wände) für den WP-Strom — 0 = freistehend (Default).
  const [wpHaustyp, setWpHaustyp] = useState(hasShare ? paramInt(initialParams, "wht", 0, 0, HAUSTYP_WP.length - 1) : 0);

  // Progressive Disclosure im Großverbraucher-Step: welche Detail-Fragen der
  // Nutzer schon aktiv beantwortet hat (kein Preset vorausgewählt) + welche zum
  // Nachbearbeiten wieder aufgeklappt ist. Bei geteilter URL gelten alle als
  // gesetzt (die Werte kommen ja aus den Parametern → direkt eingeklappt zeigen).
  const [gvAnswered, setGvAnswered] = useState<Set<string>>(() => hasShare ? new Set(GV_FIELDS) : new Set());
  const [gvEditing, setGvEditing] = useState<string | null>(null);
  const markGvAnswered = (key: string) => {
    setGvAnswered(prev => (prev.has(key) ? prev : new Set(prev).add(key)));
    setGvEditing(null);
  };
  // Welche Frage einer Section ist offen: die zum Bearbeiten angeklickte, sonst
  // die erste noch offene. null = alle beantwortet (alles eingeklappt).
  const openGvField = (keys: readonly string[]): string | null => {
    if (gvEditing && keys.includes(gvEditing)) return gvEditing;
    return keys.find(k => !gvAnswered.has(k)) ?? null;
  };

  // Editable overrides (null = use auto-calculated)
  const [oKosten, setOKosten] = useState<number | null>(hasShare && initialParams?.k ? (() => { const n = Number(initialParams.k); return isFinite(n) && n >= 500 && n <= 200000 ? n : null; })() : null);
  const [oEv, setOEv] = useState<number | null>(hasShare && initialParams?.ev ? (() => { const n = Number(initialParams.ev); return isFinite(n) && n >= 5 && n <= 95 ? n : null; })() : null);
  // Direkt eingegebener Haushaltsverbrauch (kWh/a, ohne WP/E-Auto). null = aus Personen geschätzt.
  const [oVerbrauch, setOVerbrauch] = useState<number | null>(hasShare && initialParams?.vb ? (() => { const n = Number(initialParams.vb); return isFinite(n) && n >= 500 && n <= 30000 ? n : null; })() : null);
  // Eingabemodus für Step 2: Personenzahl schätzen vs. Jahresverbrauch direkt kennen.
  const [verbrauchMode, setVerbrauchMode] = useState(oVerbrauch !== null);
  // Strompreis-Startwert aus der kanonischen Quelle (DEFAULT_PRICES, BNetzA-
  // Strompreismonitor), NICHT hardcoded. Ein "st"-Param (geteilter Link oder
  // Crosslink von der Ratgeberseite) hat weiterhin Vorrang; sonst wird der
  // Default unten per usePrices() auf den Live-Wert aus market_prices nachgezogen.
  const [oStrom, setOStrom] = useState(hasShare ? paramFloat(initialParams, "st", DEFAULT_PRICES.electricityPrice, 0.05, 1.0) : DEFAULT_PRICES.electricityPrice);
  const [oStromSynced, setOStromSynced] = useState(hasShare); // synced when share-URL — no auto-update
  const [oEinsp, setOEinsp] = useState<number | null>(hasShare && initialParams?.ei ? (() => { const n = Number(initialParams.ei); return isFinite(n) && n >= 0 && n <= 20 ? n : null; })() : null);
  const [einspeisungModus, setEinspeisungModus] = useState<"aus" | "teil" | "voll">(
    hasShare ? (initialParams?.eia === "2" ? "voll" : initialParams?.eia === "0" ? "aus" : "teil") : "teil"
  );
  const [oErtrag, setOErtrag] = useState(initialParams?.er ? paramInt(initialParams, "er", NO_PLZ_DEFAULT_YIELD, 700, 1200) : NO_PLZ_DEFAULT_YIELD);
  // Gewähltes Szenario (Strompreis-Anstieg). Steuert ALLE Ergebniszahlen —
  // Amortisation, Rendite, ⌀ Ersparnis, Chart-Hervorhebung — nicht nur die
  // Amortisations-Kachel. Default „realistic" (3 %/a). Über die Kacheln wählbar.
  const [scenario, setScenario] = useState(hasShare ? paramStr(initialParams, "sc", "realistic", ["pessimistic", "realistic", "optimistic"]) : "realistic");

  // PLZ → standortspezifischer Ertrag + Monatsprofil
  const [plz, setPlz] = useState(typeof initialParams?.plz === "string" && /^\d{5}$/.test(initialParams.plz) ? initialParams.plz : "");
  const [plzLoading, setPlzLoading] = useState(false);
  const [plzSource, setPlzSource] = useState<string | null>(null);
  const [monthlyProfile, setMonthlyProfile] = useState<number[] | null>(null);

  // Förderung: PLZ → zutreffende Programme, serverseitig aus der DB aufgelöst
  // (/api/funding liefert die Programme mit). `foe` (Programm-ID) kann ein
  // Programm vorab scharf schalten (Link von einer Stadt-/Förderseite).
  const seedFoeId = typeof initialParams?.foe === "string" ? initialParams.foe : null;
  type FundingCandidate = { ort: string; ags: string; programs: FundingProgram[] };
  const [fundingCandidates, setFundingCandidates] = useState<FundingCandidate[] | null>(null);
  const [fundingAgs, setFundingAgs] = useState<string | null>(null);
  const [fundingPrograms, setFundingPrograms] = useState<FundingProgram[]>([]);
  const [fundingEnabled, setFundingEnabled] = useState<boolean>(!!seedFoeId);
  const [fundingLoading, setFundingLoading] = useState(false);

  // Einmaliger PLZ-Toast beim ersten Anzeigen des Ergebnisses.
  const [plzToast, setPlzToast] = useState(false);
  const plzToastShown = useRef(false);

  // Gas/Öl-Referenz (nur bei WP)
  const [fuelType, setFuelType] = useState<"gas" | "oil">("gas");

  // Empfehlungs-Flow Kontext
  const flowType = hasShare && initialParams?.flow === "emp" ? "empfehlung" : "manual";
  const htIdx = hasShare ? paramInt(initialParams, "ht", -1, 0, 3) : -1;
  const daIdx = hasShare ? paramInt(initialParams, "da", -1, 0, 3) : -1;

  // PLZ → zutreffende Förderprogramme (Kandidaten serverseitig auflösen)
  const fetchFunding = async (inputPlz: string) => {
    if (!/^\d{5}$/.test(inputPlz)) return;
    setFundingLoading(true);
    try {
      const res = await fetch(`/api/funding?plz=${inputPlz}`);
      const data = await res.json();
      const candidates: FundingCandidate[] = Array.isArray(data.candidates) ? data.candidates : [];
      setFundingCandidates(candidates);
      if (candidates.length === 1) {
        // Eindeutig → Programme direkt übernehmen.
        setFundingAgs(candidates[0].ags);
        setFundingPrograms(candidates[0].programs);
      } else {
        // Mehrdeutig → Nutzer fragen (X oder Y?), bis dahin keine Programme aktiv.
        setFundingAgs(null);
        setFundingPrograms([]);
      }
    } catch {
      setFundingCandidates([]);
      setFundingAgs(null);
      setFundingPrograms([]);
    }
    setFundingLoading(false);
  };

  // Bei mehrdeutiger PLZ: gewählten Ort übernehmen (Programme liegen schon vor).
  const chooseFundingAgs = (ags: string) => {
    setFundingAgs(ags);
    setFundingPrograms(fundingCandidates?.find((c) => c.ags === ags)?.programs ?? []);
  };

  // `foe`-Seed: Programm beim Laden serverseitig auflösen + scharf schalten.
  useEffect(() => {
    if (!seedFoeId) return;
    (async () => {
      setFundingLoading(true);
      try {
        const res = await fetch(`/api/funding?foe=${seedFoeId}`);
        const data = await res.json();
        if (Array.isArray(data.programs) && data.programs.length) {
          setFundingPrograms(data.programs);
          setFundingAgs(typeof data.ags === "string" ? data.ags : null);
        }
      } catch { /* ignore */ }
      setFundingLoading(false);
    })();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // PLZ → PVGIS Ertrag laden
  const fetchPvgis = async (inputPlz: string) => {
    if (!/^\d{5}$/.test(inputPlz)) return;
    fetchFunding(inputPlz);
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
  useEffect(() => { if (plz) fetchPvgis(plz); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Ohne PLZ im Link: den gemerkten Standort übernehmen und direkt anwenden,
  // damit der Ertrag stimmt, ohne dass die PLZ erneut eingegeben werden muss.
  useSharedPlz(plz, (shared) => { setPlz(shared); fetchPvgis(shared); });

  // Standort-Kühlgradstunden (für die Klima-Schnellschätzung + das Detail-Modal) —
  // derselbe geteilte Hook wie im Klimaanlagen-Rechner. Fetch, sobald eine gültige
  // PLZ vorliegt; ohne PLZ bleibt der deutsche Durchschnitt aus der Config.
  const cooling = useCoolingDegree();
  const coolingFetch = cooling.fetchForPlz;
  useEffect(() => { if (/^\d{5}$/.test(plz)) coolingFetch(plz); }, [plz, coolingFetch]);

  // Dynamic market prices + feed-in rates
  const prices = usePrices();
  const feedInRates = useFeedInRates();

  // Sync electricity price default once when central price loads — only for fresh calculations (not share-URLs).
  // Mark as synced even when the fetched price equals the current default:
  // otherwise this effect re-runs after the user's first manual edit and
  // snaps the value back to the central price.
  useEffect(() => {
    if (!oStromSynced && prices.electricityPrice > 0) {
      if (prices.electricityPrice !== oStrom) setOStrom(prices.electricityPrice);
      setOStromSynced(true);
    }
  }, [prices.electricityPrice, oStromSynced, oStrom]);

  // Auth + Save
  const authState = useAuth();
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
          { anlage, customKwp, speicher, personen, nutzung, wp, ea, eaKm, oKosten, oEv, oStrom, oEinsp, einspeisungModus, oErtrag, plz, fuelType, flowType: flowType as "manual" | "empfehlung", haustyp: htIdx >= 0 ? htIdx : null, dachart: daIdx >= 0 ? daIdx : null, budgetLimit: null },
          { kwp, amortisationJahre: be ? be.i : null, rendite25j: Math.round(sel.data.years[YEARS - 1]?.kum ?? 0) }
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
  // Brutto = vom Nutzer editierte oder geschätzte Investition. Förderung (falls
  // aktiviert) reduziert sie zur effektiven Investition, mit der gerechnet wird.
  const bruttoKosten = oKosten !== null ? oKosten : estimateCost(kwp, spKwh, prices);
  const fundingStack = useMemo(
    () => stackFunding(fundingPrograms, kwp, spKwh, bruttoKosten),
    [fundingPrograms, kwp, spKwh, bruttoKosten],
  );
  const foerderung = fundingEnabled ? fundingStack.total : 0;
  const kosten = Math.max(0, bruttoKosten - foerderung);
  // Grundverbrauch: direkt eingegeben oder aus Personenzahl geschätzt.
  const grundverbrauch = oVerbrauch ?? PERSONEN[personen].verbrauch;
  // Schnellschätzung des Kühlstroms: dasselbe Wettermodell wie der Klimaanlagen-
  // Rechner (calcAircon), mit Config-Defaults + gewählten Räumen + Standort-
  // Kühlgradstunden. So driften Schnellschätzung und Detail-Rechnung nie.
  const quickKlimaKwh = useMemo(
    () => calcAircon({
      deviceId: CFG.defaultDeviceId, rooms: klimaRooms, roomM2: CFG.defaultRoomM2,
      exposure: CFG.defaultExposure, targetTemp: CFG.defaultTargetTemp, window: "day",
      cdh: cooling.cdhSet.avg5, stromPrice: oStrom, pvActive: false,
    }).electricityKwh,
    [klimaRooms, cooling.cdhSet.avg5, oStrom],
  );
  // Effektiver Kühlstrom: übernommener Wert (Detail-Modal / Klimaanlagen-Rechner)
  // hat Vorrang vor der Schnellschätzung. null wenn keine Klimaanlage.
  const effKlimaKwh = klima !== "nein" ? (klimaKwh ?? quickKlimaKwh) : null;
  const klimaKwhEff = effKlimaKwh ?? 0;
  // WP-Jahresstrom aus den Gebäudedaten — dieselbe Physik wie der Wärmepumpen-
  // Rechner (Heizwärmebedarf ÷ Arbeitszahl). null wenn keine WP.
  const wpKwh = useMemo(
    () => (wp !== "nein"
      ? calcWpAnnualElectricity({ situation: "bestand", wohnflaeche: wpWohnflaeche, insulationIdx: wpInsulation, personen: PERSONEN[personen].count, heizsystem: wpHeizsystem, wpType: "lwwp", haustypFaktor: HAUSTYP_WP[wpHaustyp].faktor })
      : null),
    [wp, wpWohnflaeche, wpInsulation, personen, wpHeizsystem, wpHaustyp],
  );
  // Gebäudebasierte Jahresarbeitszahl — dieselbe JAZ, mit der wpKwh oben aus dem
  // Heizwärmebedarf hergeleitet wurde. Treibt die Wärmemenge (wpKwh × JAZ) und den
  // Gas-Vergleich in der WP-Kachel, damit sie nicht mehr an fixer COP 3,5 hängen.
  const wpJaz = useMemo(
    () => calcJAZ("lwwp", flowTempForSystem(wpHeizsystem)),
    [wpHeizsystem],
  );
  const extraVerbrauch = calcExtraConsumption(wp, ea, eaKm, klima, KLIMA_DEFAULT_M2, effKlimaKwh, wpKwh);
  const gesamtVerbrauch = grundverbrauch + extraVerbrauch;
  const autoEv = calcEigenverbrauch({ personenIdx: personen, nutzungIdx: nutzung, speicherKwh: spKwh, wp, ea, eaKm, klima, klimaM2: KLIMA_DEFAULT_M2, klimaKwh: effKlimaKwh, wpKwh, kwp, ertragKwp: oErtrag, baseKwh: oVerbrauch });
  const effEv = oEv !== null ? oEv : autoEv;
  // Volleinspeisung is incompatible with WP/E-Auto (they require self-consumption)
  const vollDisabled = wp !== "nein" || ea !== "nein";
  const effEinspeisungModus = vollDisabled && einspeisungModus === "voll" ? "teil" : einspeisungModus;
  const jahresertrag = kwp * oErtrag;
  // Lastprofil für die Stundensimulation — dieselben Verbrauchswerte wie oben,
  // nur als Stundenkurve (BDEW H0 + WP-Winterprofil + E-Auto + Klima).
  const household = useMemo<HouseholdProfile>(() => ({
    baseKwh: grundverbrauch,
    tagQuote: NUTZUNG[nutzung].tagQuote,
    wpActive: wp !== "nein",
    eaActive: ea !== "nein",
    klimaActive: klima !== "nein",
    klimaM2: KLIMA_DEFAULT_M2,
    wpAnnualKwh: wpKwh ?? undefined,
    eaAnnualKwh: ea !== "nein" ? calcEaAnnual(eaKm) : undefined,
    klimaAnnualKwh: effKlimaKwh ?? undefined,
  }), [grundverbrauch, nutzung, wp, ea, klima, wpKwh, eaKm, effKlimaKwh]);
  // Autarkiegrad + Jahresverlauf aus der Stunden-Jahressimulation (lib/pv-sim.ts →
  // simulatePvYear). Zeitaufgelöst statt aus dem Eigenverbrauch zurückgerechnet:
  // bildet den Winter- und Tag/Nacht-Mismatch direkt ab (keine 100-%-Fantasie bei
  // großen Anlagen), rechnet Wärmepumpe/E-Auto/Standort korrekt mit und liefert die
  // Monatsdaten fürs Modal sowie die WP-spezifische PV-Deckung (pvSim.wpAutarky) für
  // die WP-Kachel. Gegen das HTW-Kennfeld validiert (±3 pp bei gleichem Tagverbrauch).
  const pvSim = useMemo(
    () => simulatePvYear({ kwp, speicherKwh: spKwh, monthlyYieldPerKwp: monthlyProfile, ertragKwp: oErtrag, household }),
    [kwp, spKwh, monthlyProfile, oErtrag, household],
  );
  const autarkie = pvSim.autarky;
  // Beispieltage (24-h-Detail) für das Modal — sonniger/trüber Wintertag + Sommertag.
  const exampleDays = useMemo(
    () => EXAMPLE_DAYS.map(d => ({
      key: d.key, label: d.label,
      day: simulateExampleDay({ kwp, speicherKwh: spKwh, monthlyYieldPerKwp: monthlyProfile, ertragKwp: oErtrag, household }, d.month, d.dayType),
    })),
    [kwp, spKwh, monthlyProfile, oErtrag, household],
  );

  // Feed-in: weighted EEG rate based on system size + effective mode
  const autoEinsp = effEinspeisungModus === "voll"
    ? calcWeightedFeedIn(kwp, feedInRates.vollUnder10, feedInRates.vollOver10, feedInRates.thresholdKwp)
    : calcWeightedFeedIn(kwp, feedInRates.teilUnder10, feedInRates.teilOver10, feedInRates.thresholdKwp);
  const effEinsp = oEinsp ?? autoEinsp;

  const scenarioData = useMemo(() =>
    SCENARIOS.map(s => ({
      ...s,
      data: calc({
        kwp, kosten, strompreis: oStrom,
        // Szenario-EV zusätzlich gegen das physikalische Maximum kappen
        // (Verbrauch/Ertrag): man kann nie mehr selbst verbrauchen, als man
        // überhaupt verbraucht — sonst entsteht Phantom-Ersparnis in der
        // optimistischen Kurve. jahresertrag=0 → Infinity → Cap greift nicht.
        eigenverbrauch: effEinspeisungModus === "voll"
          ? 0
          : Math.min(effEv + s.evDelta, 95, (gesamtVerbrauch / jahresertrag) * 100),
        einspeisung: effEinspeisungModus === "aus" ? 0 : effEinsp,
        stromSteigerung: s.strom, ertragKwp: oErtrag, monthly: monthlyProfile,
        batteryReplace: batteryReplaceCost(spKwh, prices),
      }),
    })), [kwp, kosten, oStrom, effEv, effEinsp, effEinspeisungModus, oErtrag, eaKm, monthlyProfile, spKwh, prices, gesamtVerbrauch, jahresertrag]);

  // Das aktuell gewählte Szenario treibt alle Ergebniszahlen. Fallback auf
  // „realistic", falls der State (z. B. aus einer alten Share-URL) nicht passt.
  const sel = scenarioData.find(s => s.id === scenario) ?? scenarioData.find(s => s.id === "realistic")!;
  const be = sel.data.be;

  const STEPS = ["Wie groß soll die Anlage werden?", "Batteriespeicher?", "Dein Haushalt", "Großverbraucher"];
  const isResult = step >= STEPS.length;
  const fundingActive = fundingPrograms.some((p) => p.level !== "bund");

  // PLZ-Hinweis einmal als Toast einblenden, sobald das Ergebnis erscheint und
  // noch kein Standort gesetzt ist.
  useEffect(() => {
    // Skip the nudge when a PLZ is already present (e.g. handed over from the
    // Live-Simulation via ?plz=): plzSource only fills once the async location
    // lookup returns, so without this guard the toast flashes "PLZ eingeben"
    // even though the location is set and being applied.
    // A location arriving late retires the nudge instead of leaving it asking
    // for something that is already set.
    if (plzSource || /^\d{5}$/.test(plz)) { setPlzToast(false); return; }
    // readLocation() rather than waiting for the adopted PLZ to land in state:
    // the shared location is taken over in an effect, one render after this one
    // would otherwise have decided to nag.
    if (!isResult || plzToastShown.current || readLocation()) return;
    plzToastShown.current = true;
    setPlzToast(true);
  }, [isResult, plzSource, plz]);
  // Auto-Ausblenden nach 6 s — eigener Effekt, damit der Timer auch unter
  // StrictMode (doppelter Effekt-Invoke im Dev) korrekt neu gesetzt wird.
  useEffect(() => {
    if (!plzToast) return;
    const t = setTimeout(() => setPlzToast(false), 6000);
    return () => clearTimeout(t);
  }, [plzToast]);

  // Funnel-Events: feuern nur beim Vorwärtsgehen im direkten Rechner-Flow
  // (Share-/Empfehlungs-Aufrufe landen per URL direkt auf dem Ergebnis und
  // laufen nicht durch next()). So bildet die Event-Treppe echte Abbrüche ab.
  const FUNNEL_EVENTS = ["", "pv_schritt_speicher", "pv_schritt_haushalt", "pv_schritt_verbraucher"];
  const next = () => {
    if (step >= STEPS.length) return;
    const target = step + 1;
    if (target === STEPS.length) {
      // Ergebnis erreicht: anonymes Anfrageprofil mitgeben. Vercel Web
      // Analytics erlaubt im aktuellen Tarif nur 2 Eigenschaften pro Event
      // (Anlagengröße + Speicher). Die restlichen Profil-Dimensionen
      // (Personen, Nutzung, WP, E-Auto, Klima) brauchen das Plus-Add-on
      // (8 Eigenschaften) — dokumentiert in docs/analytics-events.md.
      trackEvent("pv_ergebnis", {
        anlage: anlage === 4 ? "custom" : `${kwp} kWp`,
        speicher: spKwh > 0 ? `${spKwh} kWh` : "kein",
      });
    } else if (FUNNEL_EVENTS[target]) {
      trackEvent(FUNNEL_EVENTS[target]);
    }
    setStep(target);
  };
  const back = () => step > 0 && setStep(step - 1);
  const restart = () => { setStep(0); setOKosten(null); setOEv(null); setOVerbrauch(null); if (typeof window !== "undefined") window.history.replaceState(null, "", window.location.pathname); };

  const buildShareUrl = () => {
    const p = new URLSearchParams();
    p.set("a", String(anlage));
    p.set("s", String(speicher));
    p.set("p", String(personen));
    p.set("n", String(nutzung));
    p.set("wp", wp);
    if (wp !== "nein") { p.set("wf", String(wpWohnflaeche)); p.set("wi", String(wpInsulation)); p.set("wh", wpHeizsystem); p.set("wht", String(wpHaustyp)); }
    p.set("ea", ea);
    if (ea !== "nein") p.set("km", String(eaKm));
    p.set("kl", klima);
    if (klima !== "nein") p.set("klr", String(klimaRooms));
    if (klima !== "nein" && klimaKwh !== null) p.set("klwh", String(klimaKwh));
    if (anlage === 4) p.set("ck", String(customKwp));
    if (oKosten !== null) p.set("k", String(oKosten));
    if (oEv !== null) p.set("ev", String(oEv));
    if (oVerbrauch !== null) p.set("vb", String(oVerbrauch));
    p.set("st", String(oStrom));
    if (oEinsp !== null) p.set("ei", String(oEinsp));
    p.set("eia", effEinspeisungModus === "voll" ? "2" : effEinspeisungModus === "aus" ? "0" : "1");
    p.set("er", String(oErtrag));
    if (scenario !== "realistic") p.set("sc", scenario);
    if (plz) p.set("plz", plz);
    // Förderung: das wirksamste angerechnete Programm mitgeben, damit der Link
    // dieselbe Förderung vorab scharf schaltet.
    if (fundingEnabled && fundingStack.applied.length > 0) p.set("foe", fundingStack.applied[fundingStack.applied.length - 1].program.id);
    if (flowType === "empfehlung") {
      p.set("flow", "emp");
      if (htIdx >= 0) p.set("ht", String(htIdx));
      if (daIdx >= 0) p.set("da", String(daIdx));
    }
    return `${window.location.origin}${window.location.pathname}?${p.toString()}`;
  };

  const shareText = `Meine PV-Anlage (${kwp} kWp) amortisiert sich in ${be ? be.i : ">25"} Jahren.`;

  // Chart export
  const chartExport = useChartExport({
    context: {
      title: "Amortisation",
      subtitle: `${kwp} kWp${spKwh > 0 ? ` · ${spKwh} kWh Speicher` : ""}`,
      stats: isResult ? [
        { label: "Amortisation", value: be ? `${be.i}` : ">25", unit: "Jahre" },
        { label: "Eigenverbrauch", value: `${Math.round(effEv)}`, unit: "%" },
        { label: "Kosten", value: kosten.toLocaleString("de-DE"), unit: "€" },
        { label: "Strompreis", value: oStrom.toLocaleString("de-DE"), unit: "€/kWh" },
      ] : undefined,
      legend: SCENARIOS.map(s => ({ color: s.color, label: s.label })),
    },
    filename: "solar-check-amortisation.png",
    shareText: `PV-Amortisation: ${kwp} kWp${spKwh > 0 ? ` + ${spKwh} kWh Speicher` : ""} – ${be ? `${be.i} Jahre` : ">25 Jahre"}`,
    shareUrl: typeof window !== "undefined" ? buildShareUrl() : undefined,
  });

  const handleCopy = async () => {
    trackEvent("pv_geteilt");
    try {
      await navigator.clipboard.writeText(buildShareUrl());
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch { prompt("Link kopieren:", buildShareUrl()); }
  };

  const handleNativeShare = async () => {
    trackEvent("pv_geteilt");
    try { await navigator.share({ title: "Solar Check – Mein Ergebnis", text: shareText, url: buildShareUrl() }); } catch {}
  };

  const handleWhatsApp = () => {
    trackEvent("pv_geteilt");
    window.open(`https://wa.me/?text=${encodeURIComponent(shareText + "\n" + buildShareUrl())}`, "_blank");
  };

  const handleSave = useCallback(async () => {
    if (authState.status !== "authed" || saving) return;
    setSaving(true);
    try {
      const row = paramsToRow(
        { anlage, customKwp, speicher, personen, nutzung, wp, ea, eaKm, oKosten, oEv, oStrom, oEinsp, einspeisungModus, oErtrag, plz, fuelType, flowType: flowType as "manual" | "empfehlung", haustyp: htIdx >= 0 ? htIdx : null, dachart: daIdx >= 0 ? daIdx : null, budgetLimit: null },
        { kwp, amortisationJahre: be ? be.i : null, rendite25j: Math.round(sel.data.years[YEARS - 1]?.kum ?? 0) }
      );
      const spLabel = spKwh > 0 ? ` + ${spKwh} kWh` : "";
      const res = await fetch("/api/calculations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...row, name: `${kwp} kWp${spLabel}` }),
      });
      if (res.ok) {
        const { id } = await res.json();
        trackEvent("pv_gespeichert");
        setSaved(true);
        setSavedCalcId(id);
        setTimeout(() => setSaved(false), 2500);
      }
    } catch { /* silent */ }
    setSaving(false);
  }, [authState, saving, anlage, customKwp, speicher, personen, nutzung, wp, ea, eaKm, oKosten, oEv, oStrom, oEinsp, einspeisungModus, oErtrag, plz, fuelType, kwp, spKwh, be, sel, flowType, htIdx, daIdx]); // eslint-disable-line react-hooks/exhaustive-deps

  // Empfehlungs-Kontext für "Warum diese Anlage?"
  const empfehlungKontext = flowType === "empfehlung" && htIdx >= 0 && daIdx >= 0 ? (() => {
    const ht = HAUSTYPEN[htIdx];
    const da = DACHARTEN[daIdx];
    const nutzbar = Math.round(ht.footprint * da.factor);
    const maxKwp = Math.round(nutzbar * 0.2 * 10) / 10;
    const dachAuslastung = Math.round((kwp / maxKwp) * 100);
    return { ht, da, nutzbar, maxKwp, grundverbrauch, extraVerbrauch, gesamtVerbrauch, dachAuslastung };
  })() : null;
  // grundverbrauch/extraVerbrauch/gesamtVerbrauch oben aufgelöst (respektiert oVerbrauch).

  return (
    <div style={{ background: v('--color-bg'), fontFamily: v('--font-text'), color: v('--color-text-primary'), padding: "0 16px 20px" }}>

        <KlimaDetailModal
          open={klimaDetailOpen}
          onClose={() => setKlimaDetailOpen(false)}
          rooms={klimaRooms}
          plz={plz}
          stromPrice={oStrom}
          onApply={kwh => { setKlimaKwh(kwh); setOEv(null); }}
        />

      <div style={{ maxWidth: v('--page-max-width'), margin: "0 auto" }}>

        {/* Title — aus der Empfehlung kommend als Fortsetzung framen, nicht als neuer Rechner */}
        {flowType === "empfehlung" ? (
          <div style={{ marginBottom: 24 }}>
            <button
              onClick={() => { if (typeof window !== "undefined") window.history.back(); }}
              style={{ background: "none", border: "none", color: v('--color-accent'), cursor: "pointer", fontSize: 13, fontWeight: 600, fontFamily: v('--font-text'), padding: 0, marginBottom: 10, display: "inline-flex", alignItems: "center", gap: 4 }}
            >
              <span style={{ transform: "rotate(180deg)", display: "inline-flex" }}><IconArrowRight size={iconSizes.sm} /></span> Zurück zur Empfehlung
            </button>
            <div style={{ textAlign: "center" }}>
              <h1 style={{ fontSize: 22, fontWeight: 800, letterSpacing: "-0.02em", color: v('--color-text-primary'), lineHeight: 1.2 }}>Deine Empfehlung im Detail</h1>
              <p style={{ fontSize: 13, color: v('--color-text-muted'), marginTop: 6 }}>So rechnet sich die empfohlene Anlage — alle Annahmen anpassbar.</p>
            </div>
          </div>
        ) : (
          <div style={{ textAlign: "center", marginBottom: 24 }}>
            <h1 style={{ fontSize: 22, fontWeight: 800, letterSpacing: "-0.02em", color: v('--color-text-primary'), lineHeight: 1.2 }}>Lohnt sich Photovoltaik?</h1>
            <p style={{ fontSize: 13, color: v('--color-text-muted'), marginTop: 6 }}>Direktes Ergebnis. Ohne Anmeldung, ohne Verkaufsanrufe.</p>
          </div>
        )}

        {/* Inline Login — only during question steps, sticky bar handles result page */}
        {showLogin && authState.status === "anon" && !isResult && (
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
                <p style={{ fontSize: 13, color: v('--color-text-muted'), marginTop: -10, marginBottom: 14, lineHeight: 1.5 }}>
                  Die Leistung wird in <GlossaryTerm id="kwp">kWp</GlossaryTerm> angegeben.
                </p>
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
              <div>
                <p style={{ fontSize: 13, color: v('--color-text-muted'), marginTop: -10, marginBottom: 14, lineHeight: 1.5 }}>
                  Die <GlossaryTerm id="speicherkapazitaet">Speicherkapazität</GlossaryTerm> wird in <GlossaryTerm id="kwh">kWh</GlossaryTerm> gemessen.
                </p>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                {[...SPEICHER.map((s, idx) => ({ ...s, idx }))]
                  .sort((a, b) => a.kwh - b.kwh)
                  .map(s => (
                    <OptionCard key={s.idx} selected={speicher === s.idx} onClick={() => { setSpeicher(s.idx); setOKosten(null); }} label={s.label} sub={s.sub} icon={s.icon} />
                  ))}
                </div>
              </div>
            )}

            {step === 2 && (
              <div>
                {/* Umschalter: Personen schätzen vs. Jahresverbrauch direkt eingeben */}
                <div style={{ display: "flex", gap: 4, marginBottom: 16, background: v('--color-bg-muted'), borderRadius: v('--radius-md'), padding: 3, border: `1px solid ${v('--color-border')}` }}>
                  {[
                    { mode: false, label: "Nach Personen" },
                    { mode: true, label: "Verbrauch kenne ich" },
                  ].map(opt => (
                    <button key={String(opt.mode)} onClick={() => {
                      if (opt.mode === verbrauchMode) return;
                      setVerbrauchMode(opt.mode);
                      // Beim Wechsel in den Direktmodus den geschätzten Wert als Startwert übernehmen.
                      setOVerbrauch(opt.mode ? PERSONEN[personen].verbrauch : null);
                      setOEv(null);
                    }} style={{
                      flex: 1, padding: "8px 4px", borderRadius: v('--radius-sm'), fontSize: 13, fontWeight: 600, cursor: "pointer",
                      background: verbrauchMode === opt.mode ? v('--color-accent') : "transparent",
                      border: "none",
                      color: verbrauchMode === opt.mode ? v('--color-text-on-accent') : v('--color-text-muted'),
                      transition: "all 0.15s",
                    }}>{opt.label}</button>
                  ))}
                </div>

                {!verbrauchMode ? (
                  <>
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
                  </>
                ) : (
                  <div style={{ marginBottom: 20 }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: v('--color-text-muted'), marginBottom: 8, textTransform: "uppercase", letterSpacing: "0.04em" }}>Jahresverbrauch Haushalt</div>
                    <div style={{
                      display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8,
                      background: v('--color-bg-muted'), borderRadius: v('--radius-md'), padding: "14px 16px",
                      border: `1.5px solid ${v('--color-accent')}`,
                    }}>
                      <span style={{ fontSize: 13, color: v('--color-text-secondary') }}>Dein Stromverbrauch pro Jahr</span>
                      <InlineEdit value={oVerbrauch ?? PERSONEN[personen].verbrauch} onCommit={val => { setOVerbrauch(Math.round(val)); setOEv(null); }} unit=" kWh" step={100} min={500} max={30000} width={72} />
                    </div>
                    <div style={{ fontSize: 12, color: v('--color-text-muted'), marginTop: 8, lineHeight: 1.5 }}>
                      Der Wert von deiner Stromrechnung — ohne Wärmepumpe und E-Auto. Die rechnen wir im nächsten Schritt separat dazu.
                    </div>
                  </div>
                )}
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
                {/* Warum diese Verbraucher zählen — Kontext als Infobox */}
                <div style={{
                  display: "flex", gap: 10, alignItems: "flex-start",
                  background: v('--color-bg-accent'), border: `1px solid ${v('--color-border-accent')}`,
                  borderRadius: v('--radius-md'), padding: "12px 14px", marginBottom: 18,
                }}>
                  <IconSun size={iconSizes.lg} color={v('--color-accent')} style={{ flexShrink: 0, marginTop: 1 }} />
                  <span style={{ fontSize: 12.5, color: v('--color-text-secondary'), lineHeight: 1.55 }}>
                    Alle drei erhöhen deinen Eigenverbrauch — Klimaanlagen besonders, weil sie genau dann
                    kühlen, wenn die Sonne scheint. Die Wärmepumpe zieht ihren Strom vor allem im Winter,
                    das E-Auto nur beim Laden tagsüber.
                  </span>
                </div>

                {/* ── Wärmepumpe ── */}
                <TriToggle label="⚡ Wärmepumpe" options={TRI} value={wp} onChange={v => { setWp(v); setOEv(null); }} />
                {wp !== "nein" && (() => {
                  const openKey = openGvField(WP_FIELDS);
                  return (
                    <div style={{ marginBottom: 28, marginTop: -4 }}>
                      <div style={{ fontSize: 11, color: v('--color-text-muted'), marginBottom: 12, lineHeight: 1.5 }}>
                        Wie viel Heizstrom deine Wärmepumpe braucht, berechnen wir aus den Angaben zu deinem Gebäude.
                      </div>
                      <AccordionField label="Haustyp" open={openKey === "wp-haustyp"} answered={gvAnswered.has("wp-haustyp")} summary={HAUSTYP_WP[wpHaustyp].label} onEdit={() => setGvEditing("wp-haustyp")}>
                        <ChoiceButtons options={HAUSTYP_WP} columns={2} selected={gvAnswered.has("wp-haustyp") ? wpHaustyp : null}
                          onSelect={i => { setWpHaustyp(i); setOEv(null); markGvAnswered("wp-haustyp"); }} render={h => h.label} />
                      </AccordionField>
                      <AccordionField label="Wohnfläche" open={openKey === "wp-flaeche"} answered={gvAnswered.has("wp-flaeche")} summary={`${wpWohnflaeche} m²`} onEdit={() => setGvEditing("wp-flaeche")}>
                        <div style={{ display: "flex", gap: 6, alignItems: "center", flexWrap: "wrap" }}>
                          {WP_M2_PRESETS.map(m2 => {
                            const active = gvAnswered.has("wp-flaeche") && wpWohnflaeche === m2;
                            return (
                              <button key={m2} onClick={() => { setWpWohnflaeche(m2); setOEv(null); markGvAnswered("wp-flaeche"); }} style={{
                                padding: "7px 10px", borderRadius: v('--radius-sm'), fontSize: 12, fontWeight: 600, cursor: "pointer",
                                background: active ? v('--color-accent-dim') : v('--color-bg-muted'),
                                border: active ? `1.5px solid ${v('--color-accent')}` : `1.5px solid ${v('--color-border')}`,
                                color: active ? v('--color-accent') : v('--color-text-muted'),
                              }}>{m2} m²</button>
                            );
                          })}
                          <PresetNumberInput value={wpWohnflaeche} presets={WP_M2_PRESETS} min={20} max={1000} unit="m²"
                            onCommit={n => { setWpWohnflaeche(n); setOEv(null); markGvAnswered("wp-flaeche"); }}
                            onFocus={() => setGvEditing("wp-flaeche")} onBlur={() => setGvEditing(null)} />
                        </div>
                      </AccordionField>
                      <AccordionField label="Dämmzustand" open={openKey === "wp-daemmung"} answered={gvAnswered.has("wp-daemmung")} summary={INSULATION_BESTAND[wpInsulation].label} onEdit={() => setGvEditing("wp-daemmung")}>
                        <ChoiceButtons options={INSULATION_BESTAND} columns={3} selected={gvAnswered.has("wp-daemmung") ? wpInsulation : null}
                          onSelect={i => { setWpInsulation(i); setOEv(null); markGvAnswered("wp-daemmung"); }} render={ins => ins.label} />
                      </AccordionField>
                      <AccordionField label="Heizsystem" open={openKey === "wp-heizsystem"} answered={gvAnswered.has("wp-heizsystem")} summary={HEIZSYSTEM.find(h => h.id === wpHeizsystem)?.label} onEdit={() => setGvEditing("wp-heizsystem")}>
                        <ChoiceButtons options={HEIZSYSTEM} columns={3} selected={gvAnswered.has("wp-heizsystem") ? HEIZSYSTEM.findIndex(h => h.id === wpHeizsystem) : null}
                          onSelect={i => { setWpHeizsystem(HEIZSYSTEM[i].id as Heizsystem); setOEv(null); markGvAnswered("wp-heizsystem"); }}
                          render={h => HEIZSYSTEM_SHORT[h.id]} />
                      </AccordionField>
                      {openKey === null && wpKwh != null && (
                        <div className="sc-acc" style={{ fontSize: 11, color: v('--color-text-faint'), marginTop: 4, lineHeight: 1.5 }}>
                          Daraus ergeben sich rund <strong style={{ color: v('--color-text-primary') }}>{wpKwh.toLocaleString("de-DE")} kWh</strong> Heizstrom pro Jahr.
                        </div>
                      )}
                    </div>
                  );
                })()}

                {/* ── Elektroauto ── */}
                <TriToggle label="🚗 Elektroauto" options={TRI} value={ea} onChange={v => { setEa(v); setOEv(null); }} />
                {ea !== "nein" && (() => {
                  const openKey = openGvField(EA_FIELDS);
                  return (
                    <div style={{ marginBottom: 28, marginTop: -4 }}>
                      <AccordionField label="Laufleistung ca." open={openKey === "ea-km"} answered={gvAnswered.has("ea-km")} summary={`${eaKm.toLocaleString("de-DE")} km`} onEdit={() => setGvEditing("ea-km")}>
                        <div style={{ display: "flex", gap: 6, alignItems: "center", flexWrap: "wrap" }}>
                          {EA_KM_PRESETS.map(km => {
                            const active = gvAnswered.has("ea-km") && eaKm === km;
                            return (
                              <button key={km} onClick={() => { setEaKm(km); setOEv(null); markGvAnswered("ea-km"); }} style={{
                                padding: "7px 10px", borderRadius: v('--radius-sm'), fontSize: 12, fontWeight: 600, cursor: "pointer",
                                background: active ? v('--color-accent-dim') : v('--color-bg-muted'),
                                border: active ? `1.5px solid ${v('--color-accent')}` : `1.5px solid ${v('--color-border')}`,
                                color: active ? v('--color-accent') : v('--color-text-muted'),
                              }}>{(km / 1000).toFixed(0)}k km</button>
                            );
                          })}
                          <PresetNumberInput value={eaKm} presets={EA_KM_PRESETS} min={1000} max={50000} unit="km"
                            onCommit={n => { setEaKm(n); setOEv(null); markGvAnswered("ea-km"); }}
                            onFocus={() => setGvEditing("ea-km")} onBlur={() => setGvEditing(null)} />
                        </div>
                      </AccordionField>
                    </div>
                  );
                })()}

                {/* ── Klimaanlage ── */}
                <TriToggle label="❄️ Klimaanlage" options={TRI} value={klima} onChange={v => { setKlima(v); setOEv(null); }} />
                {klima !== "nein" && (() => {
                  const openKey = openGvField(KLIMA_FIELDS);
                  return (
                    <div style={{ marginBottom: 28, marginTop: -4 }}>
                      <AccordionField label="Gekühlte Räume" open={openKey === "klima-rooms"} answered={gvAnswered.has("klima-rooms")} summary={`${klimaRooms} ${klimaRooms === 1 ? "Raum" : "Räume"}`} onEdit={() => setGvEditing("klima-rooms")}>
                        <ChoiceButtons options={[1, 2, 3, 4, 5]} selected={gvAnswered.has("klima-rooms") ? klimaRooms - 1 : null}
                          onSelect={i => { setKlimaRoomsManual(i + 1); markGvAnswered("klima-rooms"); }} render={n => n} />
                      </AccordionField>
                      {openKey === null && (
                        <div className="sc-acc" style={{
                          background: v('--color-bg-muted'), border: `1px solid ${v('--color-border')}`,
                          borderRadius: v('--radius-sm'), padding: "10px 12px",
                          display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap",
                        }}>
                          <div style={{ flex: "1 1 180px", minWidth: 0 }}>
                            <div style={{ fontSize: 12.5, color: v('--color-text-secondary'), lineHeight: 1.5 }}>
                              Kühlung im Sommer.{" "}
                              {klimaKwh !== null
                                ? <>Übernommen: <strong style={{ color: v('--color-text-primary') }}>{klimaKwhEff.toLocaleString("de-DE")} kWh/Jahr</strong>.</>
                                : <>Verbrauch ca. <strong style={{ color: v('--color-text-primary') }}>{klimaKwhEff.toLocaleString("de-DE")} kWh/Jahr</strong>.</>}
                            </div>
                            <div style={{ fontSize: 11, color: v('--color-text-faint'), marginTop: 3, lineHeight: 1.4 }}>
                              Angenommen: {KLIMA_DEVICE_LABEL}, ~{CFG.defaultRoomM2} m² je Raum.
                            </div>
                          </div>
                          <button onClick={() => setKlimaDetailOpen(true)} style={{
                            flexShrink: 0, padding: "8px 14px", borderRadius: v('--radius-sm'), fontSize: 12.5, fontWeight: 700, cursor: "pointer",
                            background: v('--color-bg'), border: `1.5px solid ${v('--color-accent')}`, color: v('--color-accent'),
                          }}>exakter berechnen</button>
                        </div>
                      )}
                    </div>
                  );
                })()}
              </div>
            )}

            <div style={{ display: "flex", justifyContent: "space-between", marginTop: 24 }}>
              {step > 0 ? (
                <button onClick={back} style={{ padding: "10px 20px", borderRadius: v('--radius-md'), fontSize: 14, fontWeight: 600, background: "transparent", border: `1px solid ${v('--color-border-muted')}`, color: v('--color-text-secondary'), cursor: "pointer" }}>Zurück</button>
              ) : <div />}
              <button onClick={next} style={{ padding: "10px 32px", borderRadius: v('--radius-md'), fontSize: 14, fontWeight: 700, background: v('--color-accent'), border: "none", color: v('--color-text-on-accent'), cursor: "pointer" }}>
                <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>{step === STEPS.length - 1 ? <><IconSparkle size={iconSizes.md} /> Berechnen</> : <>Weiter <IconArrowRight size={iconSizes.md} /></>}</span>
              </button>
            </div>
          </div>
        )}

        {/* ── RESULT ── */}
        {plzToast && (
          <div
            className="fu"
            onClick={() => {
              const el = document.querySelector<HTMLInputElement>('input[placeholder="PLZ"]');
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
            <span style={{ flex: 1 }}>
              {fundingActive
                ? "PLZ eingeben für einen standortgenauen Ertrag"
                : "PLZ eingeben für genauere Ergebnisse und mögliche Förderprogramme"}
            </span>
            <button onClick={e => { e.stopPropagation(); setPlzToast(false); }} aria-label="Schließen" style={{ border: "none", background: "transparent", color: v('--color-text-on-accent'), fontSize: 18, lineHeight: 0.8, cursor: "pointer", padding: 0, opacity: 0.85 }}>×</button>
          </div>
        )}

        {isResult && (
          <div className="fu">
            {/* Szenario-Wahl ganz oben: sie rechnet ALLES darunter um
                (Amortisation, Rendite, ⌀ Ersparnis, Chart). */}
            <ScenarioTabs
              tabs={scenarioData.map(s => ({ id: s.id, label: s.label, explain: s.explain, sub: `+${(s.strom * 100).toLocaleString("de-DE")} %/Jahr` }))}
              selected={scenario}
              onSelect={setScenario}
            />
            <ResultHeroCard
              be={be} kosten={bruttoKosten} setOKosten={setOKosten}
              oStrom={oStrom} setOStrom={setOStrom} oErtrag={oErtrag} setOErtrag={setOErtrag}
              kwp={kwp} spKwh={spKwh} effEv={effEv} setOEv={setOEv}
              effEinspeisungModus={effEinspeisungModus} setEinspeisungModus={setEinspeisungModus}
              vollDisabled={vollDisabled} effEinsp={effEinsp} setOEinsp={setOEinsp}
              plz={plz} setPlz={setPlz} plzLoading={plzLoading} plzSource={plzSource} fetchPvgis={fetchPvgis}
            />

            {/* Stromverbrauch — editierbar, mit Aufschlüsselung wenn WP/E-Auto aktiv */}
            <div style={{
              background: v('--color-bg'), borderRadius: v('--radius-md'), padding: "14px 16px", marginBottom: 16,
              border: `1px solid ${v('--color-border')}`,
            }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ fontSize: 13, fontWeight: 600, color: v('--color-text-secondary') }}>Stromverbrauch Haushalt</span>
                <InlineEdit value={grundverbrauch} onCommit={val => { setOVerbrauch(Math.round(val)); setOEv(null); }} unit=" kWh" step={100} min={500} max={30000} width={72} />
              </div>
              {extraVerbrauch > 0 && (
                <div style={{ marginTop: 10, paddingTop: 10, borderTop: `1px dashed ${v('--color-border')}`, fontSize: 12, color: v('--color-text-muted'), lineHeight: 1.8 }}>
                  {wp !== "nein" && (
                    <div style={{ display: "flex", justifyContent: "space-between" }}>
                      <span>+ Wärmepumpe</span>
                      <span style={{ fontFamily: v('--font-mono') }}>{(wpKwh ?? 0).toLocaleString("de-DE")} kWh</span>
                    </div>
                  )}
                  {ea !== "nein" && (
                    <div style={{ display: "flex", justifyContent: "space-between" }}>
                      <span>+ E-Auto</span>
                      <span style={{ fontFamily: v('--font-mono') }}>{calcExtraConsumption("nein", ea, eaKm).toLocaleString("de-DE")} kWh</span>
                    </div>
                  )}
                  {klima !== "nein" && (
                    <div style={{ display: "flex", justifyContent: "space-between" }}>
                      <span>+ Klimaanlage{klimaKwh !== null ? " *" : ""}</span>
                      <span style={{ fontFamily: v('--font-mono') }}>{klimaKwhEff.toLocaleString("de-DE")} kWh</span>
                    </div>
                  )}
                  <div style={{ display: "flex", justifyContent: "space-between", fontWeight: 700, color: v('--color-text-primary'), marginTop: 2 }}>
                    <span>Gesamt</span>
                    <span style={{ fontFamily: v('--font-mono') }}>{gesamtVerbrauch.toLocaleString("de-DE")} kWh</span>
                  </div>
                  {klimaKwh !== null && (
                    <div style={{ fontSize: 11, color: v('--color-text-faint'), marginTop: 4, lineHeight: 1.4 }}>
                      * Kühlstrom aus den Details bzw. dem <Link href="/klimaanlage-stromkosten" style={{ color: v('--color-accent'), textDecoration: "none" }}>Klimaanlagen-Rechner</Link> übernommen. Räume ändern für die Schnellschätzung.
                    </div>
                  )}
                </div>
              )}
            </div>

            <ResultFunding
              loading={fundingLoading}
              candidates={fundingCandidates}
              chosenAgs={fundingAgs}
              onChooseAgs={chooseFundingAgs}
              programs={fundingPrograms}
              applied={fundingStack.applied}
              total={fundingStack.total}
              enabled={fundingEnabled}
              onToggle={setFundingEnabled}
              brutto={bruttoKosten}
            />

            {/* Empfehlungs-Kontext: Warum diese Anlage? */}
            {empfehlungKontext && (
              <details open style={{
                background: v('--color-bg'), borderRadius: v('--radius-md'), padding: "14px 16px", marginBottom: 16,
                border: `1px solid ${v('--color-border')}`,
              }}>
                <summary style={{ fontSize: 14, fontWeight: 700, color: v('--color-text-primary'), cursor: "pointer", listStyle: "none", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span>Warum diese Anlage?</span>
                  <span style={{ fontSize: 11, color: v('--color-text-muted'), fontWeight: 400, display: "inline-flex", alignItems: "center", gap: 4 }}>Details <IconChevronDown size={iconSizes.xs} /></span>
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

            <QuickSettings
              wp={wp} setWp={setWp} ea={ea} setEa={setEa} eaKm={eaKm} setEaKm={setEaKm}
              klima={klima} setKlima={setKlima} klimaRooms={klimaRooms} setKlimaRooms={setKlimaRoomsManual}
              onKlimaDetails={() => setKlimaDetailOpen(true)}
              speicher={speicher} setSpeicher={setSpeicher} spKwh={spKwh}
              oKosten={oKosten} setOKosten={setOKosten} setOEv={() => setOEv(null)}
            />

            
            <ResultStats
              total={sel.data.total} kosten={kosten}
              wp={wp} wpKwh={wpKwh ?? 0} jaz={wpJaz} effEv={effEv} autarkie={autarkie} wpAutarky={pvSim.wpAutarky}
              jahresertrag={jahresertrag} gesamtVerbrauch={gesamtVerbrauch} speicherKwh={spKwh} monthly={pvSim.monthly} exampleDays={exampleDays}
              oStrom={oStrom} stromSteigerung={sel.strom} fuelType={fuelType} setFuelType={setFuelType}
            />

            {spKwh > 0 && effEinspeisungModus !== "voll" && (
              <div style={{
                background: v('--color-bg-muted'), border: `1px solid ${v('--color-border')}`,
                borderRadius: v('--radius-md'), padding: "12px 14px", marginBottom: 16,
                fontSize: 13, lineHeight: 1.6, color: v('--color-text-secondary'),
              }}>
                Dein Speicher hebt den <GlossaryTerm id="eigenverbrauch">Eigenverbrauch</GlossaryTerm> auf{" "}
                <strong style={{ color: v('--color-text-primary') }}>{Math.round(effEv)}%</strong> — so viel
                deines Solarstroms nutzt du übers Jahr selbst, der Rest fließt ins Netz. Dieser Wert ist der
                wichtigste Hebel für die Wirtschaftlichkeit: Jede selbst genutzte Kilowattstunde spart dir den
                vollen Strompreis, während eingespeister Strom nur die deutlich niedrigere Einspeisevergütung bringt.{" "}
                <Link href="/methodik" onClick={() => trackEvent("pv_methodik")} style={{ color: v('--color-accent'), textDecoration: "none", fontWeight: 600 }}>
                  Wie wir das berechnen
                </Link>
              </div>
            )}

            {/* Chart */}
            <div style={{ background: v('--color-bg'), borderRadius: v('--radius-lg'), padding: "14px 10px 6px", marginBottom: 16, border: `1px solid ${v('--color-border')}` }}>
              <div ref={chartExport.chartRef}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "0 6px", marginBottom: 6 }}>
                  <span style={{ fontSize: 13, fontWeight: 700, color: v('--color-text-primary') }}>Amortisation</span>
                  <div style={{ display: "flex", gap: 12 }}>
                    {SCENARIOS.map(s => (
                      <span key={s.id} style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 10, color: s.id === scenario ? v('--color-text-secondary') : v('--color-text-muted'), fontWeight: s.id === scenario ? 700 : 400 }}>
                        <span style={{ width: 8, height: 3, borderRadius: 2, background: s.color, display: "inline-block", opacity: s.id === scenario ? 1 : 0.5 }} />
                        {s.label}
                      </span>
                    ))}
                  </div>
                </div>
                <Chart scenarios={scenarioData} kosten={kosten} highlightId={scenario} />
              </div>
              <ChartExportBar
                onDownload={chartExport.downloadPng}
                onShare={chartExport.sharePng}
                onWhatsApp={chartExport.shareWhatsApp}
                onTwitter={chartExport.shareTwitter}
                isExporting={chartExport.isExporting}
                canNativeShare={chartExport.canNativeShare}
              />
            </div>

            {/* Szenario-Wahl steht ganz oben; der Chart hebt das gewählte hervor. */}

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
                  Standortgenaue Prognose & Fördermöglichkeiten
                </div>
                <div style={{ fontSize: 12, color: v('--color-text-faint') }}>
                  PLZ eingeben für exakten Ertrag, monatliche Berechnung und lokale Förderung
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
                        <div style={{ width: "100%", height: barH, borderRadius: "3px 3px 0 0", background: i === new Date().getMonth() ? v('--color-accent') : v('--color-border-accent') }} />
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
              <Link href="/methodik" onClick={() => trackEvent("pv_methodik")} style={{ fontWeight: 700, color: v('--color-text-secondary'), textDecoration: "none", borderBottom: `1px dashed ${v('--color-text-faint')}` }}>Methodik</Link>
              <span style={{ color: v('--color-text-muted') }}>{" "}· Eigenverbrauch kalibriert an HTW Berlin Daten (±5%) · Degradation 0,5%/a · Einspeisevergütung fix 20 J.</span>
            </div>

            {/* Hinweis auf die geplante EEG-Reform — nur relevant, wenn überhaupt
                eingespeist wird (Teil/Voll). Datierter Sachstand, siehe FAQ. */}
            {effEinspeisungModus !== "aus" && (
              <div style={{
                background: v('--color-bg'), borderRadius: v('--radius-md'), padding: "10px 14px", marginBottom: 16,
                border: `1px solid ${v('--color-border')}`, fontSize: 12, color: v('--color-text-secondary'), lineHeight: 1.6,
              }}>
                <strong style={{ fontWeight: 700 }}>Einspeisevergütung:</strong> für Inbetriebnahme bis Ende 2026 volle 20 Jahre garantiert (Bestandsschutz). Für Neuanlagen ab 2027 ist ein Wegfall geplant — beschlossen ist er noch nicht.{" "}
                <Link href="/lohnt-sich-pv-ohne-einspeiseverguetung" style={{ color: v('--color-accent'), textDecoration: "none", fontWeight: 600 }}>Was das für die Rechnung bedeutet →</Link>
              </div>
            )}

            <ResultActions
              copied={copied} canShare={canShare} authState={authState} saving={saving} saved={saved} savedCalcId={savedCalcId}
              onCopy={handleCopy} onNativeShare={handleNativeShare} onWhatsApp={handleWhatsApp}
              onSave={handleSave} onLoginClick={() => { setShowLogin(true); setLoginSent(false); setLoginError(""); }}
            />

            {/* Restart */}
            <button onClick={restart} style={{
              width: "100%", padding: "12px", borderRadius: v('--radius-md'), fontSize: 13, fontWeight: 600,
              background: "transparent", border: `1px solid ${v('--color-border-muted')}`, color: v('--color-text-secondary'), cursor: "pointer",
            }}><span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}><IconRefresh size={iconSizes.md} /> Neu berechnen</span></button>

            <div style={{ textAlign: "center", fontSize: 11, color: v('--color-text-faint'), padding: "20px 0 8px", lineHeight: 1.6 }}>
              Keine Lead-Erfassung · Keine Werbung<br />
              Alle Angaben ohne Gewähr · Keine Steuer- oder Anlageberatung
            </div>
          </div>
        )}

        {/* Footer kommt aus dem (site)-Layout. Hier nur Abstand, damit die
            sticky Login-Leiste den Seitenfuß nicht verdeckt. */}
        {isResult && authState.status === "anon" && showLogin && <div style={{ height: 64 }} />}
      </div>

      {/* Sticky Bottom Bar — Login-Formular für nicht-eingeloggte Nutzer */}
      {isResult && authState.status === "anon" && showLogin && (
        <div style={{
          position: "fixed", bottom: 0, left: 0, right: 0, zIndex: 100,
          background: `linear-gradient(to top, ${v('--color-bg')} 80%, transparent)`,
          padding: "20px 16px 16px",
        }}>
          <div style={{ maxWidth: v('--page-max-width'), margin: "0 auto" }}>
            {loginSent ? (
              <div style={{
                background: v('--color-bg'), borderRadius: v('--radius-md'), padding: "14px 16px",
                border: `1px solid ${v('--color-border')}`, textAlign: "center",
              }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: v('--color-accent') }}>Link gesendet!</div>
                <div style={{ fontSize: 12, color: v('--color-text-secondary'), marginTop: 4 }}>Prüfe deine E-Mails.</div>
              </div>
            ) : (
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
            )}
            {loginError && <div style={{ fontSize: 12, color: v('--color-negative'), marginTop: 6, textAlign: "center" }}>{loginError}</div>}
          </div>
        </div>
      )}
    </div>
  );
}
