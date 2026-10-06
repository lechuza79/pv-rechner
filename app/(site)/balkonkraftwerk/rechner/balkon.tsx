"use client";
import CalculatorContent from "../../../../components/calculator/CalculatorContent";

import { useState, useMemo, useCallback, useEffect, useRef, Fragment } from "react";
import Link from "next/link";
import AffiliateDetails from "../../../../components/AffiliateDetails";
import FlowNav, { FlowFooter } from "../../../../components/FlowNav";
import FlowSchritte from "../../../../components/FlowSchritte";
import OptionCard from "../../../../components/OptionCard";
import InlineEdit from "../../../../components/InlineEdit";
import InfoTooltip from "../../../../components/InfoTooltip";
import StandortField from "../../../../components/StandortField";
import { IconCheck } from "../../../../components/Icons";
import { v, iconSizes, fsPx } from "../../../../lib/theme";
import { usePrices } from "../../../../lib/prices";
import { PERSONEN, SCENARIOS } from "../../../../lib/constants";
import ScenarioTabs from "../../../../components/ScenarioTabs";
import { DEFAULT_BALKON_CONFIG as CFG, BALKON_RECHT, BALKON_DACH_HINWEIS_KWH, type BalkonSetId, type BalkonStorageId } from "../../../../lib/balkon-config";
import { calcBalkon, recommendBalkon, type BalkonInputs, type BalkonOption } from "../../../../lib/balkon";
import { referenceYearKwh } from "../../../../lib/solar-year";
import { trackFunnelStep, type Funnel } from "../../../../lib/analytics";
import { useSharedPlz, readLocation } from "../../../../lib/location";
import StandortPrompt from "../../../../components/StandortPrompt";
import Switch from "../../../../components/Switch";
import { AccordionField } from "../../../../components/AccordionField";
import ResultOverview from "../../../../components/calculator/ResultOverview";
import CalculatorTheme from "../../../../components/calculator/CalculatorTheme";
import Modal from "../../../../components/Modal";
import BalkonRace from "../../../../components/calculator/BalkonRace";
import ResultActions from "../../../../components/calculator/ResultActions";
import { useResultIntro } from "../../../../components/calculator/useResultIntro";
import "../../../../components/calculator/result-design.css";
import "./result.css";
import ResultSettings from "../../../../components/ResultSettings";
import ResultFunding from "../../../../components/ResultFunding";
import { useBalkonAngebote } from "../../../../lib/use-balkon-angebote";
import { balkonFunding, type BalkonFundingContext } from "../../../../lib/balkon-funding";
import { readBalkonHardware, writeBalkonHardware, type BalkonHardwareSnapshot } from "../../../../lib/balkon-share";
import { angebotBegruendung, speicherAnnahme, bewerteAngebot, besteAngebote, configFuerAngebot } from "../../../../lib/shop-angebot";
import type { ShopAngebot } from "../../../../lib/shop-solakon";
import BalkonAngebot, { BalkonProduktTeaser } from "../../../../components/BalkonAngebot";
import { useFoerderung } from "../../../../lib/use-foerderung";
import { type Wohnform } from "../../../../lib/funding-programs";
import { DataSourceNote } from "../../../../components/PoweredBy";
import { DATA_SOURCES } from "../../../../lib/data-sources";

import StatCard from "../../../../components/calculator/ResultStatCard";
import StandNoteView from "../../../../components/StandNoteView";
import type { StandSeite } from "../../../../lib/stand-format";

const STEPS = ["Haushalt & Standort", "Ausrichtung"];
// One word each for the step indicator; the current one is the step heading.
const SCHRITT_NAMEN = ["Haushalt", "Ausrichtung"];

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

export default function Balkon({ stand }: { stand?: StandSeite }) {
  const [flowReady,setFlowReady] = useState(false);
  useEffect(()=>setFlowReady(true),[]);
  const [step, setStep] = useState(0);
  const [editingQuestion, setEditingQuestion] = useState<string | null>(null);
  // Welche Fragen wirklich beantwortet sind. Die Werte behalten ihre Startwerte
  // (die Rechnung braucht sie), geben sich aber nicht mehr als Auswahl aus —
  // Flow-Konvention: keine Vorauswahl, Weiter erst nach echter Wahl.
  const [beantwortet, setBeantwortet] = useState<Set<string>>(new Set());
  const markBeantwortet = (key: string) =>
    setBeantwortet(prev => (prev.has(key) ? prev : new Set(prev).add(key)));
  const [orientationUnknown, setOrientationUnknown] = useState(false);
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
  // 12 Monatswerte (kWh/kWp) von PVGIS — dieselbe Quelle wie der PV-Rechner.
  // Ohne PLZ null, dann rechnet das Modell mit dem deutschen Durchschnittsprofil.
  const [monthlyYield, setMonthlyYield] = useState<number[] | null>(null);

  // Einmaliger PLZ-Toast, sobald das Ergebnis erscheint und noch kein Standort
  // gesetzt ist — nudget zur standortgenauen Ertragsrechnung (wie im PV-Rechner).
  const [plzToast, setPlzToast] = useState(false);
  const plzToastShown = useRef(false);
  const resultCardRef = useRef<HTMLDivElement>(null);

  // Editierbare Overrides im Ergebnis
  const [oStrom, setOStrom] = useState<number | null>(null);
  const katalog = useBalkonAngebote();
  const [sharedHardware, setSharedHardware] = useState<BalkonHardwareSnapshot | null>(null);
  const [offerId, setOfferId] = useState<string | null>(null);
  const [oInvest, setOInvest] = useState<number | null>(null);
  const [additionalCosts, setAdditionalCosts] = useState(0);
  const [shadingLossPercent, setShadingLossPercent] = useState(0);
  const [oVerbrauch, setOVerbrauch] = useState<number | null>(null);

  const prices = usePrices();
  const strompreis = oStrom ?? (prices.electricityPrice > 0 ? prices.electricityPrice : CFG.stromPrice);
  // Strompreisanstieg systemweit konsistent mit dem PV-Rechner (gleiche Preis-Config).
  // Strompreis-Szenario: bewegt alle gezeigten Zahlen. Die EMPFEHLUNG (welches
  // Set / ob Speicher) bleibt am Basiswert verankert — sonst spränge sie beim
  // Umschalten. Balkon-Szenarien kennen kein evDelta (eigenes HTW-Modell).
  const [horizonYears, setHorizonYears] = useState<10 | 20>(10);
  const [horizonDraft, setHorizonDraft] = useState<10 | 20>(10);
  const [scenario, setScenario] = useState("realistic");
  const scenarioStrom = (SCENARIOS.find(s => s.id === scenario) ?? SCENARIOS[1]).strom;
  const haushaltKwh = oVerbrauch ?? PERSONEN[personen].verbrauch;

  const isResult = step >= STEPS.length;
  const [pricesOpen, setPricesOpen] = useState(false);
  const [scenarioDraft, setScenarioDraft] = useState("realistic");
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [settingsSection, setSettingsSection] = useState<string | null>(null);
  const [technicalOpen, setTechnicalOpen] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  // PLZ-Toast einmal einblenden, sobald das Ergebnis erscheint und noch kein
  // Standort übernommen wurde.
  useEffect(() => {
    // Ein spät eintreffender Standort nimmt den Hinweis zurück, statt weiter
    // nach etwas zu fragen, das längst gesetzt ist.
    if (plzConfirmed) { setPlzToast(false); return; }
    // readLocation() statt auf den übernommenen Standort im State zu warten:
    // die Übernahme landet einen Render später — bis dahin hätte dieser Effekt
    // schon entschieden zu nudgen.
    if (!isResult || plzToastShown.current || readLocation()) return;
    plzToastShown.current = true;
    setPlzToast(true);
  }, [isResult, plzConfirmed, plz]);
  // Ereignis je erreichtem Schritt, Reihenfolge wie STEPS, danach das Ergebnis.
  // Bis 29.08.2026 meldete dieser Rechner NUR das Ergebnis — wo jemand abbricht,
  // war unsichtbar. Länge und Reihenfolge sind festgenagelt (siehe `lib/analytics.ts`).
  const FUNNEL: Funnel = [
    null,
    "balkon_schritt_ausrichtung",
    "balkon_ergebnis",
  ];
  const next = () => {
    if (step >= STEPS.length) return;
    const target = step + 1;
    trackFunnelStep(FUNNEL, target);
    setStep(target);
  };
  const back = () => step > 0 && setStep(step - 1);

  // Was jeder Schritt braucht — an einer Stelle. Die PLZ ist bewusst KEINE
  // Bedingung: Sie ist als optional ausgewiesen, ohne sie rechnet der Rechner
  // mit dem deutschen Durchschnitt weiter.
  const stepAnforderung: { erfuellt: boolean; hinweis: string }[] = [
    {
      erfuellt: beantwortet.has("personen") && beantwortet.has("anwesenheit"),
      hinweis: beantwortet.has("personen")
        ? "Bitte noch angeben, ob tagsüber jemand zuhause ist."
        : "Bitte Haushaltsgröße und Anwesenheit angeben.",
    },
    { erfuellt: beantwortet.has("ausrichtung"), hinweis: "Bitte erst wählen, wie die Module hängen." },
  ];
  const activeQuestion = editingQuestion ?? (!beantwortet.has("personen") ? "personen" : !beantwortet.has("anwesenheit") ? "anwesenheit" : "standort");
  const stepBeantwortet = stepAnforderung[step]?.erfuellt ?? true;
  const stepHinweis = stepAnforderung[step]?.hinweis ?? "";

  const yieldRequest = useRef(0);
  const fetchPvgis = useCallback(async (inputPlz: string) => {
    if (!/^\d{5}$/.test(inputPlz)) return false;
    const request = ++yieldRequest.current;
    setPlzLoading(true);
    try {
      const plzRes = await fetch("/plz.json");
      if (!plzRes.ok) return false;
      const plzData: Record<string, [number, number]> = await plzRes.json();
      const coords = plzData[inputPlz];
      if (!coords) return false;
      const res = await fetch(`/api/pvgis?lat=${coords[0]}&lon=${coords[1]}&plzPrefix=${inputPlz.slice(0, 2)}`);
      if (!res.ok) return false;
      const data = await res.json();
      if (request !== yieldRequest.current || !Number.isFinite(data.annual) || data.annual < 700 || data.annual > 1400) return false;
      setSpecificYield(data.annual);
      if (data.monthly?.length === 12) setMonthlyYield(data.monthly);
      setPlzConfirmed(true);
      return true;
    } catch { return false; }
    finally { if (request === yieldRequest.current) setPlzLoading(false); }
  }, []);

  // Standort aus der Adresse — der Weg von der Förder-Übersicht hierher.
  //
  // An explicit link location takes precedence over the remembered postcode.
  // The shared-location hook reads the URL itself because state written
  // by this effect is not visible to other effects from the same render.
  //
  // Gelesen wird einmal beim Aufbau, nicht über useSearchParams: Die Seite ist
  // statisch, und ein Suspense-Rand nur für diesen einen Parameter würde den
  // ganzen Rechner dahinter aufhalten.
  const adresseGelesen = useRef(false);
  useEffect(() => {
    if (adresseGelesen.current) return;
    adresseGelesen.current = true;
    const q = new URLSearchParams(window.location.search);
    setOfferId(q.get("offer"));
    setSharedHardware(readBalkonHardware(q));

    const ausAdresse = q.get("plz");
    if (ausAdresse && /^\d{5}$/.test(ausAdresse)) {
      setPlz(ausAdresse);
      fetchPvgis(ausAdresse);
    }

    // Die drei Antworten der Fragestrecke — damit ein Ergebnis teilbar ist,
    // statt dass der Empfänger dreimal klickt. Angenommen wird nur, was es
    // wirklich gibt: eine unbekannte Kennung wird ignoriert, nie geraten.
    const gesetzt: string[] = [];

    const pe = Number(q.get("pe"));
    if (q.get("pe")?.trim() && Number.isInteger(pe) && pe >= 0 && pe < PERSONEN.length) {
      setPersonen(pe);
      gesetzt.push("personen");
    }

    const an = q.get("an");
    if (an && CFG.presence.some(p => p.id === an)) {
      setPresenceId(an as BalkonInputs["presenceId"]);
      gesetzt.push("anwesenheit");
    }

    const au = q.get("au");
    if (au === "unknown") {
      setOrientationUnknown(true);
      setOrientationId(CFG.defaultOrientation);
      gesetzt.push("ausrichtung");
    } else if (au && CFG.orientations.some(o => o.id === au)) {
      setOrientationId(au as BalkonInputs["orientationId"]);
      gesetzt.push("ausrichtung");
    }

    if (gesetzt.length > 0) {
      setBeantwortet(prev => new Set([...prev, ...gesetzt]));
    }
    const setId = q.get("set"), storageId = q.get("sp");
    if (CFG.sets.some(item => item.id === setId) && CFG.storage.some(item => item.id === storageId)) setOverride({ setId: setId as BalkonSetId, storageId: storageId as BalkonStorageId });
    if (q.get("years") === "20") setHorizonYears(20);
    const scenarioId = q.get("sc"); if (SCENARIOS.some(item => item.id === scenarioId)) setScenario(scenarioId!);
    const readNumber = (key: string, min: number, max: number, set: (value: number) => void) => { const raw = q.get(key); const value = Number(raw); if (raw?.trim() && Number.isFinite(value) && value >= min && value <= max) set(value); };
    readNumber("inv", 0, 20000, setOInvest); readNumber("strom", .1, .7, setOStrom); readNumber("verbrauch", 800, 12000, setOVerbrauch);
    readNumber("extra", 0, 10000, setAdditionalCosts); readNumber("shade", 0, 100, setShadingLossPercent);
    if (q.get("funding") === "0") setFundingEnabled(false);
    const home = q.get("wohnform"); if (home === "mieter" || home === "eigentuemer") setWohnform(home);
    // Nur ein VOLLSTÄNDIGER Satz springt ins Ergebnis. Mit einer halben Angabe
    // stünde der Empfänger vor einem Ergebnis, das zur Hälfte auf unseren
    // Startwerten beruht, ohne dass er es sieht.
    if (gesetzt.length === 3) setStep(STEPS.length);
  }, [fetchPvgis]);

  // Gemerkten Standort übernehmen und direkt anwenden — sonst stünde die PLZ
  // nur im Feld, während weiter mit dem Bundesschnitt gerechnet wird.
  const rememberedLocation = useSharedPlz(plz, (shared) => { setPlz(shared); fetchPvgis(shared); });

  const onPlzChange = (raw: string) => {
    ++yieldRequest.current;
    setPlzLoading(false);
    setPlz(raw.replace(/\D/g, "").slice(0, 5));
    setPlzConfirmed(false);
  };

  // Empfehlung: effizienteste Konfiguration (Set + Speicher) aus den Eingaben.
  // Reagiert live auf die im Ergebnis editierbaren Werte (Strompreis, Verbrauch).
  const recommendation = useMemo(
    () => recommendBalkon({ orientationId, presenceId, haushaltKwh, specificYield, monthlyYield, stromPrice: strompreis, priceIncrease: scenarioStrom, horizonYears, additionalCosts, shadingLossPercent }),
    [orientationId, presenceId, haushaltKwh, specificYield, monthlyYield, strompreis, scenarioStrom, horizonYears, additionalCosts, shadingLossPercent],
  );

  // Aktive Konfiguration: gewählte Alternative oder — Default — die Empfehlung.
  const active = override ?? { setId: recommendation.best.setId, storageId: recommendation.best.storageId };
  const activeIsBest = active.setId === recommendation.best.setId && active.storageId === recommendation.best.storageId;

  // Dieselben Haushaltsangaben, mit denen die Empfehlung oben gerechnet wurde —
  // damit ein Kaufangebot nie auf anderen Annahmen steht als das Ergebnis, über
  // dem es erscheint. Der Speicherpreis steckt beim Angebot im Setpreis, deshalb
  // wird `invest` bewusst NICHT durchgereicht.
  const angebotBasis = useMemo(
    () => ({ orientationId, presenceId, haushaltKwh, specificYield, monthlyYield, stromPrice: strompreis, priceIncrease: scenarioStrom, horizonYears, additionalCosts, shadingLossPercent }),
    [orientationId, presenceId, haushaltKwh, specificYield, monthlyYield, strompreis, scenarioStrom, horizonYears, additionalCosts, shadingLossPercent],
  );

  // ── Förderung ───────────────────────────────────────────────────────────────
  // Der Rechner hatte bis zum 02.09.2026 gar keinen Fördercheck, obwohl 43
  // Programme im Katalog einen Balkon-Betrag ausrechnen können. Bei einem Set um
  // 500 € sind 100 bis 200 € Zuschuss ein Fünftel bis ein Drittel des Preises —
  // der Posten mit der größten Hebelwirkung auf die Amortisation, und der
  // einzige, den wir nicht gezeigt haben.
  const foerderQuelle = useFoerderung("balkon");
  const [selectedLocationAgs, setSelectedLocationAgs] = useState<string>();
  const fundingPrograms = foerderQuelle.programme;
  const [fundingEnabled, setFundingEnabled] = useState(true);
  // Wohnform: nur gefragt, wo ein aufgelöstes Programm sie unterscheidet.
  // Sonst beantwortet sie niemand umsonst — dieselbe Regel wie bei den
  // Technik-Filtern auf der Förder-Stadtseite.
  const [wohnform, setWohnform] = useState<Wohnform | null>(null);
  const wohnformGefragt = fundingPrograms.some((p) => p.nurWohnform);

  // Dieselbe Postleitzahl wie für den Standort-Ertrag löst auch die Förderung
  // auf — der Rechner fragt sie also kein zweites Mal.
  const ausPlz = foerderQuelle.ausPlz;
  useEffect(() => { if (/^\d{5}$/.test(plz)) void ausPlz(plz, selectedLocationAgs); }, [plz, ausPlz, selectedLocationAgs]);

  const previewFundingContext = useMemo(() => ({ programs: fundingPrograms, enabled: fundingEnabled, wohnform: wohnform ?? undefined, locationKnown: !!foerderQuelle.ags }), [fundingPrograms, fundingEnabled, wohnform, foerderQuelle.ags]);

  // Keep lookup and selection changes in a draft until the shared apply action.
  const [appliedFunding, setAppliedFunding] = useState<BalkonFundingContext | null>(null);
  const [checkedLocation, setCheckedLocation] = useState<{ plz: string; ags: string; name: string } | null>(null);
  const [locationSearchDirty, setLocationSearchDirty] = useState(false);
  const [pendingPlace, setPendingPlace] = useState<{ plz: string; ags: string; name: string } | null>(null);
  const fundingContext = appliedFunding ?? previewFundingContext;
  const beginFundingEdit = () => setAppliedFunding(current => current ?? previewFundingContext);
  const fundingChanged = pendingPlace !== null || (appliedFunding !== null && JSON.stringify(appliedFunding) !== JSON.stringify(previewFundingContext));

  const ratedOffers = useMemo(() => besteAngebote(katalog.daten?.angebote ?? [], angebotBasis, CFG, fundingContext), [katalog.daten, angebotBasis, fundingContext]);
  const offerSetId = (offer: Pick<ShopAngebot, "moduleWp">): BalkonSetId => offer.moduleWp <= 600 ? "single" : offer.moduleWp <= 1200 ? "duo" : "max";
  const explicitOffer = useMemo(() => {
    const found = katalog.daten?.angebote.find(entry => entry.id === offerId && entry.lieferbar);
    return found ? bewerteAngebot(found, angebotBasis, CFG, fundingContext) : undefined;
  }, [katalog.daten, offerId, angebotBasis, fundingContext]);
  const selectedOffer = offerId ? explicitOffer
    : (override ? ratedOffers.find(entry => offerSetId(entry.angebot) === override.setId && (entry.angebot.speicherKwh > 0) === (override.storageId !== "none")) : ratedOffers[0]);
  const offer = selectedOffer?.angebot;
  const offerReason = angebotBegruendung(selectedOffer, ratedOffers, horizonYears, oInvest !== null);
  const hardware = offer ?? (offerId ? sharedHardware : null);
  const storageHelp = hardware && hardware.speicherKwh > 0 && <InfoTooltip title="Annahmen zum Speicher" ariaLabel="Hinweis zur Speicherberechnung">{speicherAnnahme(hardware)}</InfoTooltip>;
  const calculationConfig = useMemo(() => hardware ? configFuerAngebot(hardware) : CFG, [hardware]);
  const effectiveSetId = hardware ? offerSetId(hardware) : active.setId;
  const systemLabel = offer
    ? `${offer.produkt} · ${(offer.moduleWp / 1000).toLocaleString("de-DE")} kWp · ${offer.speicherKwh > 0 ? `${offer.speicherKwh.toLocaleString("de-DE")} kWh Speicher` : "ohne Speicher"}`
    : hardware ? `${(hardware.moduleWp / 1000).toLocaleString("de-DE")} kWp · ${hardware.speicherKwh.toLocaleString("de-DE")} kWh Speicher (geteilte Angaben)` : configLabel(active.setId, active.storageId);
  const chooseOffer = (next: ShopAngebot) => { setOfferId(next.id); setOInvest(null); };

  // Kartenzahlen im gewählten Szenario (die Empfehlung oben bleibt am Basiswert).
  const scenarioRec = recommendation;

  const bruttoInvest = oInvest ?? hardware?.preis ?? calcBalkon({
    setId: active.setId, orientationId, presenceId, storageId: active.storageId,
    haushaltKwh, specificYield, monthlyYield, stromPrice: strompreis, priceIncrease: scenarioStrom, horizonYears,
  }).invest;
  const fundingAssessment = useMemo(() => balkonFunding({
    moduleWp: hardware?.moduleWp ?? CFG.sets.find(x => x.id === active.setId)?.moduleWp ?? 0,
    speicherKwh: hardware?.speicherKwh ?? CFG.storage.find(x => x.id === active.storageId)?.kwh ?? 0,
  }, bruttoInvest, fundingContext), [hardware, active.setId, active.storageId, bruttoInvest, fundingContext]);
  const fundingPreview = useMemo(() => balkonFunding({
    moduleWp: hardware?.moduleWp ?? CFG.sets.find(x => x.id === active.setId)?.moduleWp ?? 0,
    speicherKwh: hardware?.speicherKwh ?? CFG.storage.find(x => x.id === active.storageId)?.kwh ?? 0,
  }, bruttoInvest, previewFundingContext), [hardware, active.setId, active.storageId, bruttoInvest, previewFundingContext]);
  const foerderung = fundingAssessment.grant;

  const inputs: BalkonInputs = useMemo(() => ({
    setId: hardware ? "duo" : active.setId, orientationId, presenceId, storageId: hardware ? (hardware.speicherKwh > 0 ? "small" : "none") : active.storageId,
    haushaltKwh, specificYield, monthlyYield, stromPrice: strompreis, priceIncrease: scenarioStrom, horizonYears, additionalCosts, shadingLossPercent,
    invest: fundingAssessment.investment,
  }), [active.setId, active.storageId, orientationId, presenceId, haushaltKwh, specificYield, monthlyYield, strompreis, scenarioStrom, horizonYears, additionalCosts, shadingLossPercent, bruttoInvest, foerderung, hardware, fundingAssessment.investment]);

  const r = useMemo(() => calcBalkon(inputs, calculationConfig), [inputs, calculationConfig]);
  const amortLabel = isFinite(r.amortYears) ? `${r.amortYears.toFixed(1).replace(".", ",")}` : "—";

  // Set-Größe und Speicher sind zwei GETRENNTE Entscheidungen. Jede ändert die
  // aktive Konfiguration; stimmt sie wieder mit der Empfehlung überein, folgen
  // wir automatisch der Empfehlung (override = null). Editierten Anschaffungspreis
  // dabei verwerfen, da sich der Standardpreis mit der Wahl ändert.
  const applySelection = (setId: BalkonSetId, storageId: BalkonStorageId) => {
    setOfferId(null);
    setOInvest(null);
    if (setId === recommendation.best.setId && storageId === recommendation.best.storageId) setOverride(null);
    else setOverride({ setId, storageId });
  };
  const selectSize = (setId: BalkonSetId) => applySelection(setId, active.storageId);
  const selectStorage = (storageId: BalkonStorageId) => applySelection(active.setId, storageId);
  const resetToRecommendation = () => { setOfferId(null); setOverride(null); setOInvest(null); };

  // Karten zeigen die Zahlen des gewählten Szenarios; welche Karte „Empfohlen"
  // heißt, entscheidet weiter `recommendation` (Basiswert).
  const findCombo = (setId: BalkonSetId, storageId: BalkonStorageId): BalkonOption =>
    scenarioRec.ranked.find(o => o.setId === setId && o.storageId === storageId) ?? scenarioRec.best;

  // Set-Größen-Karten (alle in einer Reihe): jede zeigt die Ersparnis beim AKTUELL
  // gewählten Speicher — so sind alle Karten konsistent (kein Speicher-Durcheinander).
  const sizeOptions = CFG.sets.map(s => findCombo(s.id, active.storageId));

  // Speicher als aufklappbarer Schalter: an = eine Speichergröße gewählt.
  const storageOptions = CFG.storage.filter(s => s.kwh > 0);
  const storageOn = hardware ? hardware.speicherKwh > 0 : active.storageId !== "none";
  const toggleStorage = () => {
    if (offer) {
      const next = ratedOffers.find(entry => entry.angebot.moduleWp === offer.moduleWp && (entry.angebot.speicherKwh > 0) !== storageOn);
      if (next) chooseOffer(next.angebot);
      else { setOfferId(null); setOInvest(null); setOverride({ setId: effectiveSetId, storageId: storageOn ? "none" : "small" }); }
      return;
    }
    if (offerId && !offer) { setOfferId(null); setSharedHardware(null); }
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
  const [resultRevision, setResultRevision] = useState(0);
  const intro = useResultIntro(isResult, `${r.lifetimeSaving}-${resultRevision}`, false);
  const revealUpdatedResult = () => {
    setSettingsSection(null);
    requestAnimationFrame(() => {
      document.getElementById("bkw-ueberblick")?.scrollIntoView({ behavior: "instant", block: "start" });
      // Restart the shared introduction once the updated result is in view.
      setResultRevision(value => value + 1);
    });
  };
  const shareUrl = () => {
    const url = new URL(window.location.pathname, window.location.origin);
    const data = { ...writeBalkonHardware(hardware), pe: String(personen), an: presenceId, au: orientationUnknown ? "unknown" : orientationId, set: effectiveSetId, sp: offer ? (storageOn ? "small" : "none") : active.storageId, years: String(horizonYears), extra: String(additionalCosts), shade: String(shadingLossPercent), sc: scenario,
      offer: offer?.id ?? offerId ?? "", plz, inv: oInvest === null ? "" : String(oInvest), strom: oStrom === null ? "" : String(oStrom), verbrauch: oVerbrauch === null ? "" : String(oVerbrauch), funding: fundingContext.enabled ? "1" : "0", wohnform: fundingContext.wohnform ?? "" };
    Object.entries(data).forEach(([key, value]) => { if (value) url.searchParams.set(key, value); });
    url.hash = "bkw-ueberblick";
    return url.toString();
  };
  const shareText = () => `Mein Balkonkraftwerk: ${systemLabel}. Modellvorteil über ${horizonYears} Jahre: ${r.lifetimeSaving.toLocaleString("de-DE")} € nach Anschaffung.`;
  const copyResult = async () => { try { await navigator.clipboard.writeText(shareUrl()); setCopied(true); window.setTimeout(() => setCopied(false), 2000); } catch { setShareOpen(true); } };
  const saveResult = () => {
    const url = URL.createObjectURL(new Blob([shareText(), "\n\nBerechnung wieder öffnen:\n", shareUrl()], { type: "text/plain;charset=utf-8" }));
    const link = document.createElement("a"); link.href = url; link.download = "solar-check-balkonkraftwerk.txt"; link.click(); window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  };
  const roofWorthIt = haushaltKwh >= BALKON_DACH_HINWEIS_KWH;

  return (
    <div data-flow-ready={flowReady} className={isResult ? "wp-calculator-page wp-result-page bkw-result-page" : "wp-calculator-page wp-input-page"} style={{ background: v('--color-bg'), fontFamily: v('--font-text'), color: v('--color-text-primary'), minHeight: "100vh", padding: "0 16px 20px" }}>
      <CalculatorTheme />
      <CalculatorContent state={isResult ? "result" : "input"} withOffers={isResult}>
        <div className={isResult ? "wp-result-heading" : undefined} style={{ textAlign: "center", marginBottom: isResult ? 24 : 16 }}>
          {/* In the question steps as small as the PV calculator's head: the focus
              belongs to the first question, not the title. */}
          <h1 className={isResult ? "wp-visually-hidden" : undefined} style={isResult ? {} : { fontSize: v('--font-size-h2') }}>
            {isResult ? "Deine Empfehlung" : "Balkonkraftwerk-Rechner"}
          </h1>
          {isResult && <nav className="wp-section-nav" aria-label="Ergebnisbereiche"><a href="#bkw-ueberblick" aria-current="location">Überblick</a><a href="#bkw-angebote">Passende Sets</a><a href="#bkw-einstellungen">Einstellungen</a></nav>}
          {!isResult && (
            <p style={{ fontSize: v("--font-size-small"), color: v('--color-text-muted'), marginTop: 6 }}>
              Lohnt sich ein Balkonkraftwerk für dich? Für Miete und Eigentum ohne eigenes Dach — wir empfehlen dir die passende Größe, mit oder ohne Speicher.
            </p>
          )}
        </div>

        {/* Progress */}
        {!isResult && <FlowSchritte schritte={SCHRITT_NAMEN} aktiv={step} onSprung={setStep} />}

        {/* ── STEPS ── */}
        {!isResult && (
          <div className="fu" key={step}>

            {/* 0: Haushalt & Standort */}
            {step === 0 && (
              <div>
                <AccordionField completedStyle="check" label="Personen im Haushalt" open={activeQuestion === "personen"} answered={beantwortet.has("personen")} summary={personen === 0 ? "1 Person" : `${PERSONEN[personen].label} Personen`} onEdit={() => setEditingQuestion("personen")}>
                  <div className="wp-person-options" style={{display:"grid",gridTemplateColumns:"repeat(2,minmax(0,1fr))",gap:12}}>
                    {PERSONEN.map((p,i)=><OptionCard key={p.label} group="personen" choiceIndex={i} selected={beantwortet.has("personen") && personen===i} label={p.label === "1" ? "1 Person" : `${p.label} Personen`} sub="" onClick={()=>{setPersonen(i);setOVerbrauch(null);markBeantwortet("personen");setEditingQuestion(null);}}/>)}
                  </div>
                </AccordionField>
                <AccordionField completedStyle="check" label="Tagsüber zuhause" open={activeQuestion === "anwesenheit"} answered={beantwortet.has("anwesenheit")} summary={CFG.presence.find(p=>p.id===presenceId)?.label} onEdit={()=>setEditingQuestion("anwesenheit")}>
                <div style={{ fontSize: v("--font-size-small"), fontWeight: 600, color: v('--color-text-muted'), marginBottom: 8, display: "inline-flex", alignItems: "center", gap: 4 }}>
                  Wie oft ist tagsüber jemand zuhause?
                  <InfoTooltip title="Warum das zählt" ariaLabel="Warum fragen wir, ob tagsüber jemand zuhause ist?" size={iconSizes.sm}>
                    Ein Balkonkraftwerk lohnt sich über den Strom, den du direkt verbrauchst, während die Sonne scheint.
                    Wer tagsüber zuhause ist (Homeoffice, Rente, Familie), nutzt mehr davon selbst — Überschuss fließt
                    sonst unvergütet ins Netz. Das entscheidet auch, ob sich ein Speicher lohnt.
                  </InfoTooltip>
                </div>
                <div className="wp-text-options">
                  {CFG.presence.map((p,i) => (
                    <OptionCard key={p.id} group="anwesenheit" choiceIndex={i} selected={beantwortet.has("anwesenheit") && presenceId === p.id} onClick={() => { setPresenceId(p.id); markBeantwortet("anwesenheit"); setEditingQuestion(null); }} label={p.label} sub={p.sub} />
                  ))}
                </div>

                </AccordionField>
                <AccordionField completedStyle="check" label="Standort (optional)" open={activeQuestion === "standort"} answered={plzConfirmed} summary={plz} onEdit={()=>setEditingQuestion("standort")}>

                <StandortField variant="flow" label="Postleitzahl" plz={plz} onPlzChange={onPlzChange}
                  loading={plzLoading} confirmed={plzConfirmed} remembered={rememberedLocation} onSubmit={() => fetchPvgis(plz)}
                  successMessage={`Für diesen Standort rechnen wir mit ${specificYield} kWh je kWp und Jahr.`}
                  helpText="Mit deiner PLZ prüfen wir den Ertrag vor Ort. Du kannst sie auch später ergänzen." />
                </AccordionField>
              </div>
            )}

            {/* 1: Ausrichtung */}
            {step === 1 && (
              <div>
                <AccordionField completedStyle="check" label="Wie hängen die Module?" open answered={beantwortet.has("ausrichtung")} onEdit={()=>{}}>
                <div className="wp-text-options">
                  {CFG.orientations.map((o,i) => (
                    <OptionCard key={o.id} choiceIndex={i} selected={beantwortet.has("ausrichtung") && !orientationUnknown && orientationId === o.id} onClick={() => { setOrientationUnknown(false); setOrientationId(o.id); markBeantwortet("ausrichtung"); }} label={o.label} sub={o.sub} />
                  ))}
                  <OptionCard choiceIndex={CFG.orientations.length} selected={orientationUnknown} label="Weiß noch nicht"
                    sub="Vorläufig mit Südbalkon, senkrecht am Geländer rechnen"
                    onClick={() => { setOrientationUnknown(true); setOrientationId(CFG.defaultOrientation); markBeantwortet("ausrichtung"); }} />
                </div>
                <div style={{ fontSize: v("--font-size-small"), color: v('--color-text-muted'), marginTop: 10, lineHeight: 1.5 }}>
                  Senkrecht am Geländer bringt gut ein Viertel weniger als flach aufgeständert in Südrichtung — der Winkel ist
                  bei Balkon-PV der größte Hebel.
                </div>
                </AccordionField>
              </div>
            )}

            {/* Nav */}
            <FlowFooter>
              <FlowNav
                weiterAktiv={stepBeantwortet}
                weiterLabel={step === STEPS.length - 1 ? "Empfehlung anzeigen" : "Weiter"}
                onWeiter={next}
                // No Zurück in the first step — the same in every calculator.
                onZurueck={back}
                zurueckSichtbar={step > 0}
                inaktivHinweis={stepHinweis}
              />
            </FlowFooter>
          </div>
        )}

        <StandortPrompt resultKey={JSON.stringify(r)} onResultChange={revealUpdatedResult} alignTo={resultCardRef} open={plzToast && intro.progress === 1} onClose={() => setPlzToast(false)}
          onSave={async place => {
            const programs = await foerderQuelle.uebernehmeOrt(place.plz, place.ags, () => fetchPvgis(place.plz));
            if (!programs) throw new Error("Location could not be applied");
            setAppliedFunding({ programs, enabled: fundingEnabled, wohnform: wohnform ?? undefined, locationKnown: true });
            setSelectedLocationAgs(place.ags); setPlz(place.plz); setCheckedLocation(place);
            setPendingPlace(null); setLocationSearchDirty(false); setPlzToast(false);
          }} />

        {/* ── RESULT (empfehlungsgetrieben) ── */}
        {isResult && (
          <div className="wp-ergebnis wp-result-main wp-result-layout bkw-result-main">

          <ResultOverview id="bkw-ueberblick" saving={r.lifetimeSaving} years={horizonYears}
            scenarioLabel={(SCENARIOS.find(s => s.id === scenario) ?? SCENARIOS[1]).resultLabel}
            onScenario={() => { setScenarioDraft(scenario); setHorizonDraft(horizonYears); setPricesOpen(true); }}
            onDetails={() => setDetailsOpen(true)} onSettings={() => document.getElementById("bkw-settings-trigger")?.click()}
            progress={intro.progress} anchor={intro.anchor} heroRef={resultCardRef}
            control={<Switch className="wp-pv-switch" an={storageOn} onChange={toggleStorage} label="Speicher mitrechnen" text="Mit Speicher" />}
            chart={<BalkonRace key={`${r.lifetimeSaving}-${r.invest}-${resultRevision}`} result={r} autoplay={intro.stage === "race"} />}
            stats={<>
              <StatCard label="Amortisation" value={amortLabel} unit={isFinite(r.amortYears) ? "Jahre" : undefined} help="Zeit, bis die Stromersparnis die Anschaffung nach Förderung ausgeglichen hat." />
              <StatCard label="Ersparnis im 1. Jahr" value={r.savingPerYear.toLocaleString("de-DE")} unit="€" help="Vermiedene Stromkosten im ersten Jahr. Der Kaufpreis wird bei Amortisation und Gesamtvorteil berücksichtigt." />
              <StatCard label="Autarkie" value={String(Math.round(r.autarky * 100))} unit="%" help="Anteil deines Jahresverbrauchs, den das Balkonkraftwerk selbst deckt." />
            </>}>
                {orientationUnknown && <p className="wp-pv-preset">Ausrichtung noch offen: Diese Beispielrechnung nimmt einen Südbalkon mit senkrechten Modulen am Geländer an.</p>}
                <p className="wp-result-summary">{Number.isFinite(r.amortYears) && <>Dein Balkonkraftwerk rechnet sich <strong>nach {r.amortYears.toLocaleString("de-DE", { maximumFractionDigits: 1 })} Jahren</strong>. </>}Über {horizonYears} Jahre zahlst du insgesamt <strong>{Math.abs(r.lifetimeSaving).toLocaleString("de-DE")} € {r.lifetimeSaving >= 0 ? "weniger" : "mehr"}</strong> als nur mit Netzstrom. Anschaffung nach Förderung{additionalCosts > 0 ? ", zusätzliche Kosten" : ""} und Reststrom sind eingerechnet.</p>
                {offerReason && <p className="bkw-offer-reason">{offerReason} <a href="#bkw-ertrag" onClick={() => setTechnicalOpen(true)}>Details</a>. {storageHelp}</p>}
                {offer ? <BalkonProduktTeaser offer={offer} /> : <p className="bkw-offer-price-note">{offerId && "Das geteilte Shopangebot ist aktuell nicht verfügbar. "}{hardware ? "Modellrechnung mit den geteilten Geräteangaben und dem gespeicherten Preis; kein aktuelles Kaufangebot." : "Modellrechnung mit typischen Setgrößen und Modellpreisen; aktuell ist kein passendes Shopangebot zugrunde gelegt."} {storageHelp}</p>}
          </ResultOverview>
          <ResultActions copied={copied} onCopy={copyResult} onForward={() => setShareOpen(true)} onWhatsApp={() => window.open(`https://wa.me/?text=${encodeURIComponent(shareText() + "\n" + shareUrl())}`, "_blank", "noopener,noreferrer")} onSave={saveResult} onReset={() => window.location.assign(window.location.pathname)} />
          <section id="bkw-angebote" className="bkw-offers" aria-label="Passende Sets"><BalkonAngebot basis={angebotBasis} funding={fundingContext} design="result" katalog={katalog} ratedOffers={ratedOffers} selectedOfferId={offer?.id} onFundingDetails={() => { setSettingsSection("location"); requestAnimationFrame(() => document.getElementById("bkw-einstellungen")?.scrollIntoView({ behavior: "smooth", block: "start" })); }} onCalculate={next => { chooseOffer(next); revealUpdatedResult(); }} /></section>
          <Modal open={pricesOpen} onClose={() => setPricesOpen(false)} title="Preise und Preisentwicklung">            {/* Strompreis-Szenario ganz oben: rechnet alle Zahlen darunter um. */}
            <ScenarioTabs
              tabs={SCENARIOS.map(s => ({ id: s.id, label: s.label, explain: s.explain, sub: s.sub, source: s.source }))}
              selected={scenarioDraft}
              onSelect={setScenarioDraft}
            />
<p>Wie lange möchtest du rechnen?</p><div className="bkw-offer-options">{([10, 20] as const).map(years => <OptionCard key={years} selected={horizonDraft === years} onClick={() => setHorizonDraft(years)} label={`${years} Jahre`} sub="" />)}</div>
<FlowNav weiterAktiv={scenarioDraft !== scenario || horizonDraft !== horizonYears} weiterLabel="Ergebnis neu berechnen" zurueckLabel="Abbrechen" onZurueck={() => setPricesOpen(false)} inaktivHinweis="Ändere zuerst den Zeitraum oder die Preisentwicklung." onWeiter={() => { setScenario(scenarioDraft); setHorizonYears(horizonDraft); setPricesOpen(false); revealUpdatedResult(); }} /></Modal>
          <Modal open={detailsOpen} onClose={() => setDetailsOpen(false)} title="Deine Stromkosten im Detail"><p>Über {horizonYears} Jahre sparen die selbst genutzten Solarerträge {(r.lifetimeSaving + r.invest).toLocaleString("de-DE")} € Stromkosten. Davon werden {r.invest.toLocaleString("de-DE")} € Anschaffung nach Förderung abgezogen. Es bleiben {r.lifetimeSaving.toLocaleString("de-DE")} € Vorteil.</p><p>Moduldegradation und begrenzte Speicherlebensdauer sind eingerechnet.</p></Modal>
          <Modal open={shareOpen} onClose={() => setShareOpen(false)} title="Ergebnis weiterleiten"><p>{shareText()}</p><div className="wp-result-actions"><button type="button" onClick={copyResult}>{copied ? "Link kopiert" : "Link kopieren"}</button><a href={`mailto:?subject=${encodeURIComponent("Meine Balkonkraftwerk-Rechnung")}&body=${encodeURIComponent(shareText() + "\n" + (typeof window !== "undefined" ? shareUrl() : ""))}`}>Per E-Mail weiterleiten</a></div></Modal>
          <div id="bkw-einstellungen" className="wp-investment-balance bkw-adjustments wp-funding-flow"><p className="wp-investment-eyebrow">Einstellungen & Förderung</p>
            <AccordionField completedStyle="check" label="Dein Balkonkraftwerk" answered summary={systemLabel} open={settingsSection === "system"} onEdit={() => setSettingsSection(settingsSection === "system" ? null : "system")}>
            {offer ? <>
              <p className="bkw-offer-price-note">Rechnung mit {systemLabel}: {bruttoInvest.toLocaleString("de-DE", { minimumFractionDigits: 2 })} €{oInvest !== null ? " (eigener Preis)" : " (Shoppreis)"}. Halterung, Versand und Montage bitte im Angebot prüfen.</p>
              <div className="bkw-offer-options">
                {Array.from(new Set(ratedOffers.map(entry => entry.angebot.moduleWp))).sort((a, b) => a - b).map(wp => {
                  const next = ratedOffers.find(entry => entry.angebot.moduleWp === wp && (entry.angebot.speicherKwh > 0) === storageOn) ?? ratedOffers.find(entry => entry.angebot.moduleWp === wp)!;
                  return <OptionCard key={wp} selected={offer.moduleWp === wp} onClick={() => chooseOffer(next.angebot)} label={`${(wp / 1000).toLocaleString("de-DE")} kWp`} sub={next.angebot.produkt} />;
                })}
              </div>
              <div className="bkw-offer-options">
                {ratedOffers.filter(entry => entry.angebot.moduleWp === offer.moduleWp).sort((a, b) => a.angebot.speicherKwh - b.angebot.speicherKwh).map(entry => <OptionCard key={entry.angebot.id} selected={entry.angebot.id === offer.id} onClick={() => chooseOffer(entry.angebot)} label={entry.angebot.speicherKwh > 0 ? `${entry.angebot.speicherKwh.toLocaleString("de-DE")} kWh Speicher` : "Ohne Speicher"} sub={`${entry.angebot.preis.toLocaleString("de-DE", { minimumFractionDigits: 2 })} € gesamt`} />)}
              </div>
              <p>Die Empfehlung hat unter den verfügbaren Partnerangeboten den höchsten berechneten Vorteil über {horizonYears} Jahre nach Förderung.</p>
              {offer.id !== ratedOffers[0]?.angebot.id && <button type="button" className="wp-assumptions-trigger" onClick={resetToRecommendation}>Zur Empfehlung</button>}
            </> : <>
              <p className="bkw-offer-price-note">{katalog.daten ? "Für diese Auswahl ist kein passendes Shopangebot verfügbar." : "Aktuelle Shoppreise sind noch nicht verfügbar."} Wir rechnen mit Modellpreisen und typischen Setgrößen.</p>
            {/* 1. Set-Größe — alle drei in einer Reihe. Blauer Rand markiert nur die
                AKTIVE Wahl; die Empfehlung bleibt über Marker + Erhebung erkennbar. */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 8, marginBottom: 10 }}>
              {sizeOptions.map(o => {
                const selected = active.setId === o.setId;
                const isRec = o.setId === recommendation.best.setId;
                return (
                  <OptionCard key={o.setId} selected={selected} onClick={() => selectSize(o.setId)}
                    label={setShort(o.setId)}
                    sub={`~${o.result.savingPerYear.toLocaleString("de-DE")} €/Jahr${isRec ? " · Empfehlung" : ""}`} />
                );
              })}
            </div>

            {/* 2. Speicher — Schalter links, Größen rechts daneben, eine Zeile, ohne Box.
                Der Tooltip steht bewusst NEBEN dem Schalter (Button im Button wäre
                ungültiges HTML und würde den Schalter mit auslösen). */}
            {/* UMBRECHEN ERLAUBT: Schalter, Hinweis und die beiden Größen stehen
                alle auf „nicht umbrechen" und brauchten zusammen 353 px. Auf
                einem 320-px-Telefon zieht der Browser daraufhin die ganze Seite
                auf, und jede Seite des Rechners lässt sich seitwärts schieben
                (gemessen 23.09.2026). Die Höhe bleibt dabei ruhig: Die Größen
                stehen ohnehin dauerhaft im Baum und werden nur ein- und
                ausgeblendet, die zweite Zeile entsteht also nicht erst beim
                Einschalten. */}
            <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", rowGap: 8 }}>
              <Switch an={storageOn} onChange={toggleStorage} label="Speicher mitrechnen" text="Speicher" />
              <InfoTooltip title="Was ein Speicher bringt" ariaLabel="Was bringt ein Speicher am Balkonkraftwerk?" size={iconSizes.sm}>
                Ein kleiner Akku puffert den Tagesüberschuss für Abend und Nacht und hebt den Eigenverbrauch — er kostet aber
                extra und rechnet sich oft erst spät. Wir empfehlen ihn nur, wenn er sich klar amortisiert.
              </InfoTooltip>
              {!storageOn && recommendation.best.storageId !== "none" && (
                <span style={{ display: "inline-flex", alignItems: "center", gap: 2, fontSize: v("--font-size-micro"), fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.03em", color: v('--color-accent'), whiteSpace: "nowrap" }}><IconCheck size={iconSizes.xs} /> Empf.</span>
              )}

              {/* Größen: gleiche Höhe wie der Schalter (22 px, border-box), damit die
                  Zeile beim Ein-/Ausschalten nicht springt. Auswahl = blaue Unterstreichung.
                  Bleiben dauerhaft im DOM und werden über Breite/Deckkraft eingeblendet —
                  das animiert sanft, statt hart zu erscheinen. */}
              <div aria-hidden={!storageOn} style={{
                display: "flex", gap: 10, alignItems: "center", minWidth: 0, marginLeft: 6,
                opacity: storageOn ? 1 : 0,
                transform: storageOn ? "translateY(0)" : "translateY(-8px)",
                pointerEvents: storageOn ? "auto" : "none",
                transition: "opacity 0.2s ease, transform 0.26s cubic-bezier(0.2, 0.8, 0.2, 1)",
              }}>
                {storageOptions.map((st, i) => {
                  const selected = active.storageId === st.id;
                  return (
                    <Fragment key={st.id}>
                      {i > 0 && <span aria-hidden style={{ width: 1, height: 14, background: v('--color-border'), flexShrink: 0 }} />}
                      <button onClick={() => selectStorage(st.id)} tabIndex={storageOn ? 0 : -1} style={{
                        background: "none", border: "none", borderBottom: `2px solid ${selected ? v('--color-accent') : "transparent"}`,
                        boxSizing: "border-box", height: 22, padding: 0, cursor: "pointer",
                        display: "inline-flex", alignItems: "center", whiteSpace: "nowrap",
                        fontFamily: "inherit", fontSize: v("--font-size-small"), fontWeight: 700,
                        color: selected ? v('--color-accent') : v('--color-text-secondary'),
                        transition: "color 0.15s, border-color 0.15s",
                      }}>
                        ~{st.kwh.toLocaleString("de-DE")} kWh
                        <span style={{ fontWeight: 400, fontSize: v("--font-size-caption"), color: v('--color-text-muted'), marginLeft: 4 }}>+{st.price.toLocaleString("de-DE")} €</span>
                      </button>
                    </Fragment>
                  );
                })}
              </div>
            </div>

            {/* Beschreibung der aktiven Konfiguration */}
            <div style={{ marginBottom: 16, padding: "12px 14px", borderRadius: v('--radius-md'), background: v('--color-accent-dim'), border: `1px solid ${v('--color-border-accent')}`, fontSize: v("--font-size-body"), color: v('--color-text-secondary'), lineHeight: 1.6 }}>
              {activeIsBest ? (
                <>
                  <div style={{ fontSize: v("--font-size-caption"), fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", color: v('--color-text-muted'), marginBottom: 6 }}>
                    Warum diese Konfiguration?
                  </div>
                  <div>{recommendation.setReason} {recommendation.storageReason}</div>
                </>
              ) : (
                <div>
                  {activeDescription()} Empfohlen wäre <strong style={{ color: v('--color-accent') }}>{configLabel(recommendation.best.setId, recommendation.best.storageId)}</strong>.{" "}
                  <button onClick={resetToRecommendation} style={{ background: "none", border: "none", padding: 0, color: v('--color-accent'), fontWeight: 700, cursor: "pointer", textDecoration: "underline", fontSize: v("--font-size-small"), fontFamily: "inherit" }}>Zur Empfehlung</button>
                </div>
              )}
            </div>

            </>}
            </AccordionField>

            <ResultSettings flow triggerId="bkw-settings-trigger" title="Deine Rechengrundlagen" summary={`${haushaltKwh.toLocaleString("de-DE")} kWh/Jahr · ${Math.round(strompreis * 100)} ct/kWh`}
              values={{ invest: bruttoInvest, strom: strompreis, verbrauch: haushaltKwh, extra: additionalCosts, shade: shadingLossPercent }}
              onApply={draft => {
                if (draft.invest !== bruttoInvest) setOInvest(draft.invest);
                setAdditionalCosts(draft.extra);
                setShadingLossPercent(draft.shade);
                if (draft.strom !== strompreis) setOStrom(draft.strom);
                if (draft.verbrauch !== haushaltKwh) setOVerbrauch(draft.verbrauch);
                revealUpdatedResult();
              }}>
              {(draft, update) => <>
                <div>{storageOn ? "Set inklusive Speicher" : "Set-Preis"}: <InlineEdit value={draft.invest} onCommit={val => update({ invest: Math.round(val) })} unit=" €" min={0} max={20000} step={50} width={64} /></div>
                <div>Zusätzliche Kosten: <InlineEdit value={draft.extra} onCommit={val => update({ extra: Math.round(val) })} unit=" €" min={0} max={10000} step={10} width={64} /></div>
                <p>Optional: zum Beispiel Halterung, Versand oder Montage, soweit noch nicht im Setpreis enthalten. Dafür rechnen wir keine zusätzliche Förderung an.</p>
                <div>Zusätzlicher Ertragsverlust durch Schatten: <InlineEdit value={draft.shade} onCommit={val => update({ shade: val })} unit=" %" min={0} max={100} step={5} width={64} /></div>
                <p>Optional deine Schätzung über das ganze Jahr. Ohne Angabe rechnen wir ohne zusätzlichen Schattenverlust.</p>
                <div>Strompreis: <InlineEdit value={Math.round(draft.strom * 10000) / 100} onCommit={val => update({ strom: val / 100 })} unit=" ct/kWh" min={10} max={70} step={1} width={70} /></div>
                <div>Haushaltsverbrauch: <InlineEdit value={draft.verbrauch} onCommit={val => update({ verbrauch: Math.round(val) })} unit=" kWh" min={800} max={12000} step={100} width={76} /></div>
              </>}
            </ResultSettings>
            <AccordionField completedStyle="check" label="Standort & Förderung" answered={plzConfirmed} summary={plz} open={settingsSection === "location"} onEdit={() => setSettingsSection(settingsSection === "location" ? null : "location")}>
              <p>Mit deinem Standort prüfen wir mögliche Zuschüsse und passen den Ertrag an.</p>
              <div>
                <StandortField searchPlaces checkedPlace={checkedLocation} onSearchChange={() => { setCheckedLocation(null); setLocationSearchDirty(true); }} onPlaceSelect={async place => { beginFundingEdit(); if (!await ausPlz(place.plz, place.ags)) throw new Error("Funding lookup failed"); setPendingPlace(place); setCheckedLocation(place); setLocationSearchDirty(false); }} plz={plz} onPlzChange={onPlzChange} loading={plzLoading} confirmed={plzConfirmed} onSubmit={() => fetchPvgis(plz)} label="Postleitzahl" submitLabel="Förderung prüfen" />
              </div>


            <ResultFunding showAllProgramsLink={false} design="result"
              loading={foerderQuelle.laedt}
              candidates={foerderQuelle.kandidaten}
              chosenAgs={foerderQuelle.ags}
              onChooseAgs={ags => { beginFundingEdit(); foerderQuelle.waehleOrt(ags); }}
              programs={fundingPrograms}
              applied={fundingPreview.stack.applied}
              total={fundingPreview.stack.total}
              enabled={fundingEnabled}
              onToggle={enabled => { beginFundingEdit(); setFundingEnabled(enabled); }}
              brutto={bruttoInvest}
              technik="balkon"
              kopf={wohnformGefragt ? (
                <div style={{ fontSize: v("--font-size-small"), color: v("--color-text-secondary"), marginTop: 10 }}>
                  {/* Nur sichtbar, wo ein Programm Mieter und Eigentümer trennt.
                      Ohne Antwort wird nicht gerechnet — der leere Topf für
                      Eigentümer ist real, eine Voreinstellung wäre geraten. */}
                  <div style={{ marginBottom: 6 }}>Ein Programm hier unterscheidet, ob du zur Miete oder im Eigentum wohnst:</div>
                  <div style={{ display: "flex", gap: 8 }}>
                    {([["mieter", "Zur Miete"], ["eigentuemer", "Im Eigentum"]] as const).map(([id, label]) => (
                      <button
                        key={id}
                        data-flow-option
                        aria-pressed={wohnform === id}
                        onClick={() => { beginFundingEdit(); setWohnform(wohnform === id ? null : id); }}
                        style={{
                          padding: "6px 12px", borderRadius: v("--radius-pill"), cursor: "pointer", fontSize: v("--font-size-small"),
                          border: `1px solid ${wohnform === id ? v("--color-accent") : v("--color-border")}`,
                          background: wohnform === id ? v("--color-bg-accent") : v("--color-bg"),
                          color: v("--color-text-primary"),
                        }}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                </div>
              ) : undefined}
            />
            <FlowNav zurueckSichtbar={false} weiterLabel="Ergebnis neu berechnen"
              weiterAktiv={fundingChanged && !locationSearchDirty && !foerderQuelle.laedt && !plzLoading}
              inaktivHinweis="Prüfe einen neuen Standort oder ändere die Förderung."
              onWeiter={async () => {
                setAppliedFunding(previewFundingContext);
                if (pendingPlace) {
                  setSelectedLocationAgs(pendingPlace.ags);
                  onPlzChange(pendingPlace.plz);
                  await fetchPvgis(pendingPlace.plz);
                  setPendingPlace(null);
                }
                revealUpdatedResult();
              }} />
            </AccordionField>

            </div>
            <div id="bkw-ertrag" className="wp-investment-balance bkw-adjustments wp-funding-flow"><AccordionField completedStyle="check" label="Ertrag und technische Details" answered summary={`${r.annualYield.toLocaleString("de-DE")} kWh/Jahr · ${Math.round(r.autarky * 100)} % Autarkie`} open={technicalOpen} onEdit={() => setTechnicalOpen(!technicalOpen)}>
            <div className="bkw-technical-content">
            <dl className="bkw-yield-summary">
              <div><dt>Erzeugt pro Jahr</dt><dd>{r.annualYield.toLocaleString("de-DE")} <small>kWh</small></dd></div>
              <div><dt>Selbst genutzt</dt><dd>{r.selfUsedKwh.toLocaleString("de-DE")} <small>kWh</small></dd></div>
              <div><dt>Überschuss</dt><dd>{r.feedInKwh.toLocaleString("de-DE")} <small>kWh</small></dd></div>
            </dl>
            <SetPowerCurves sets={offer ? [{ id: effectiveSetId, label: offer.produkt, moduleWp: offer.moduleWp, inverterW: offer.inverterW }] : CFG.sets} selectedId={effectiveSetId} orientationFactor={referenceYearKwh(orientationId) / referenceYearKwh("sued_flach")} />
            <p>Mehr Module liefern auch morgens und abends mehr Strom. Der Wechselrichter gibt höchstens <strong>800 Watt</strong> ab.
              <InfoTooltip title="Wie viele Module sind erlaubt?" ariaLabel="Wie viele Module sind erlaubt?" size={iconSizes.sm}>
                Die Module dürfen zusammen bis 2.000 Wp leisten. Die durchgezogene Kurve zeigt die begrenzte Leistung am Wechselrichter; die gestrichelte das mögliche Modulangebot. Ein passender Speicher kann einen Teil der Mittagsspitze zum Laden nutzen. Die Kurve ist eine Veranschaulichung eines Sonnentags, keine Wettervorhersage.
              </InfoTooltip>
            </p>
            <p>{r.feedInKwh > 0 ? <>Den Überschuss von rund <strong>{r.feedInKwh.toLocaleString("de-DE")} kWh pro Jahr</strong> nutzt du nicht selbst. {BALKON_RECHT.keineVerguetung}</> : <>Du nutzt praktisch den gesamten Ertrag selbst.</>}</p>
            {/* Speicher: ehrliche Mehrkosten/Nutzen-Aufschlüsselung */}
            {!offer && r.storageKwh > 0 && (() => {
              const extraSaving = r.savingPerYear - r.baseSavingPerYear;
              const paysOff = isFinite(r.storagePayback) && r.storagePayback <= CFG.storageLifeYears;
              return (
                <div className="bkw-technical-note">
                  <div style={{ fontWeight: 700, color: v('--color-text-primary'), marginBottom: 6 }}>
                    Mit {r.storageKwh.toLocaleString("de-DE")}-kWh-Speicher
                  </div>
                  <div>
                    Der Speicher nutzt rund <strong style={{ color: v('--color-text-primary'), fontFamily: v('--font-mono') }}>{r.storageAddedKwh.toLocaleString("de-DE")} kWh</strong> Überschuss
                    zusätzlich selbst — das bringt <strong style={{ color: v('--color-positive-text'), fontFamily: v('--font-mono') }}>~{extraSaving.toLocaleString("de-DE")} €/Jahr</strong> mehr,
                    kostet aber <strong style={{ color: v('--color-negative-text'), fontFamily: v('--font-mono') }}>+{r.storagePrice.toLocaleString("de-DE")} €</strong> Aufpreis.
                  </div>
                  <div style={{ fontSize: "var(--result-type-ui)", color: v('--color-text-muted'), marginTop: 8 }}>
                    {paysOff ? (
                      <>Der Speicher allein rechnet sich nach rund <strong style={{ color: v('--color-text-secondary') }}>{r.storagePayback.toFixed(1).replace(".", ",")} Jahren</strong> — innerhalb seiner Lebensdauer. Deshalb ist er bei deinem Verbrauch drin.</>
                    ) : (
                      <>Der Speicher allein amortisiert sich {isFinite(r.storagePayback) ? <>erst nach <strong style={{ color: v('--color-text-secondary') }}>{r.storagePayback.toFixed(1).replace(".", ",")} Jahren</strong></> : "in dieser Konstellation praktisch nicht"} — meist länger, als ein Balkonspeicher typischerweise hält. Ehrlich: <strong style={{ color: v('--color-text-secondary') }}>hier lohnt er sich nicht.</strong></>
                    )}
                  </div>
                </div>
              );
            })()}

            <AffiliateDetails title="Anschluss, Anmeldung & Nutzung">
              <h3>Anmeldung</h3>
              <p>{BALKON_RECHT.anmeldung}{r.storageKwh > 0 && " Mit Speicher ist das Gerät von der VDE-Produktnorm nicht abgedeckt; je nach Ausführung kann eine Rückfrage beim Netzbetreiber sinnvoll sein."}</p>
            {/* Steckdosen-Hinweis oberhalb der Schuko-Grenze der VDE-Vornorm.
                Bewusst KEIN "Pflicht"/"verboten": Gesetzlich sind 2.000 Wp erlaubt,
                die Vornorm ist freiwillig und richtet sich an Hersteller. */}
            {(offer?.moduleWp ?? CFG.sets.find(s => s.id === active.setId)!.moduleWp) > CFG.schukoMaxWp && (
              <div className="bkw-technical-note">
                <strong style={{ color: v('--color-text-secondary') }}>Zur Steckdose:</strong> Gesetzlich sind {(2000).toLocaleString("de-DE")} Wp Module an 800 W erlaubt — dein Set ist also zulässig.
                Die VDE-Vornorm (seit Dezember 2025) sieht für den normalen Schuko-Stecker aber nur bis {CFG.schukoMaxWp.toLocaleString("de-DE")} Wp vor; darüber eine spezielle
                Einspeisesteckdose, die eine Elektrofachkraft setzt (~{CFG.energySocketCostMin}–{CFG.energySocketCostMax} €). Die Norm ist{" "}
                <strong style={{ color: v('--color-text-secondary') }}>freiwillig</strong> und richtet sich an Hersteller, gilt aber als anerkannte Regel der Technik —
                im Schadensfall kann das gegenüber Versicherung oder Vermieter zählen. Für den normalen Schuko-Stecker muss die Modulleistung innerhalb dieser Grenze bleiben.
              </div>
            )}

            {/* Miete/Eigentum-Hinweis */}
            <div className="bkw-technical-note">
              <strong style={{ color: v('--color-text-secondary') }}>Miete oder Eigentum:</strong> Beides ist möglich. {BALKON_RECHT.mieteEigentum}
            </div>

            </AffiliateDetails>
            {/* Cross-Flow: großes Dach lohnt mehr */}
            {roofWorthIt && (
              <div className="bkw-technical-note">
                Bei deinem Verbrauch von <strong style={{ color: v('--color-text-primary') }}>{haushaltKwh.toLocaleString("de-DE")} kWh</strong> deckt ein Balkonkraftwerk nur die Grundlast.
                Wenn du ein eigenes Dach oder eine Fläche hast, holt eine richtige Anlage ein Vielfaches heraus.{" "}
                <Link href="/photovoltaik-rechner" style={{ color: v('--color-accent'), textDecoration: "none", fontWeight: 600 }}>Große Anlage rechnen</Link>
              </div>
            )}

            <div className="bkw-technical-note">
              <Link href="/methodik" style={{ fontWeight: 700, color: v('--color-text-secondary'), textDecoration: "none", borderBottom: `1px dashed ${v('--color-text-faint')}` }}>Methodik</Link>
              <span> · Ertrag standortgenau, Eigenverbrauch stündlich mit deinem Verbrauch verglichen · Werte auf der </span>
              <Link href="/datenstand" style={{ color: v('--color-accent'), textDecoration: "none" }}>Datenstand-Seite</Link>.
              <div style={{ marginTop: 6 }}>
                <DataSourceNote source={DATA_SOURCES.pvgis} />
              </div>
            </div>

            </div>
            </AccordionField></div>
            <div className="bkw-result-disclaimer">
              Näherungswerte. Realer Ertrag hängt von Verschattung, Modul und Montage ab. Keine Anlageberatung.
            </div>
            <StandNoteView seite={offer && stand && katalog.daten ? { ...stand, eintraege: [{ was: "Shoppreis des berechneten Sets", iso: katalog.daten.abgerufenIso.slice(0, 10), praezision: "tag" }, ...stand.eintraege.filter(entry => entry.was !== "Set- und Speicherpreise")] } : stand} variant="cards" />
          </div>
        )}
      </CalculatorContent>
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
    <div className="bkw-power-chart">
      <div style={{ fontSize: v("--font-size-caption"), fontWeight: 700, color: v('--color-text-muted'), marginBottom: 4, paddingLeft: 4 }}>Leistung an einem Sonnentag</div>
      <svg viewBox={`0 0 ${W} ${H}`} width="100%" style={{ display: "block" }} role="img" aria-label="Tagesleistung der Set-Größen mit Wechselrichter-Deckelung">
        {/* Wechselrichter-Deckel (800 W) */}
        <line x1={PADX} y1={capY} x2={W - PADX} y2={capY} stroke={v('--color-text-faint')} strokeWidth={1} strokeDasharray="3 3" />
        <text x={W - PADX} y={capY - 3} textAnchor="end" fontSize={fsPx("--font-size-micro")} fill={v('--color-text-muted')}>800-W-Deckel</text>
        {/* Modul-Potenzial des gewählten Sets (gestrichelt) — die gekappte Fläche */}
        <polyline points={potential(sel.moduleWp)} fill="none" stroke={COLORS[sel.id]} strokeWidth={1} strokeDasharray="2 2" opacity={0.45} />
        {/* Ist-Kurven (gedeckelt) je Set, gewähltes hervorgehoben */}
        {sets.map(s => {
          const isSel = s.id === selectedId;
          return <polyline key={s.id} points={clipped(s.moduleWp, s.inverterW)} fill="none" stroke={COLORS[s.id]} strokeWidth={isSel ? 2.5 : 1.2} opacity={isSel ? 1 : 0.45} strokeLinejoin="round" />;
        })}
      </svg>
      <div style={{ display: "flex", justifyContent: "space-between", fontSize: v("--font-size-micro"), color: v('--color-text-faint'), padding: "0 6px", marginTop: -2 }}>
        <span>morgens</span><span>Mittag</span><span>abends</span>
      </div>
      <div style={{ display: "flex", gap: 12, justifyContent: "center", marginTop: 6, flexWrap: "wrap" }}>
        {sets.map(s => (
          <span key={s.id} style={{ display: "inline-flex", alignItems: "center", gap: 4, fontSize: v("--font-size-micro"), color: s.id === selectedId ? v('--color-text-primary') : v('--color-text-muted'), fontWeight: s.id === selectedId ? 700 : 400 }}>
            <span style={{ width: 12, height: 2.5, background: COLORS[s.id], borderRadius: 1, display: "inline-block" }} />
            {s.label}
          </span>
        ))}
      </div>
    </div>
  );
}
