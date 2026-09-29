"use client";
import CalculatorContent from "../../../components/calculator/CalculatorContent";

import CalculatorTheme from "../../../components/calculator/CalculatorTheme";
import "../../../components/calculator/result-design.css";
import "../../../components/calculator/input-design.css";
import "./pv-flow.css";
import { PvSizeQuestion, PvStorageQuestion } from "../../../components/PvSystemQuestions";
import { useState, useMemo, useEffect, useCallback, useRef } from "react";
import Link from "next/link";
import { useAuth } from "../../../lib/auth";
import Modal from "../../../components/Modal";
import AnmeldeFormular from "../../../components/AnmeldeFormular";
import { useSharedPlz, readLocation } from "../../../lib/location";
import { paramsToRow } from "../../../lib/types";
import { einspeiseVerlauf, type EinspeiseRegime } from "../../../lib/einspeise-regime";
import { MARKTWERT_NIVEAU_CT } from "../../../lib/marktwert-config";
import { calculatePvMarketProfile } from "../../../lib/pv-consumer-model";
import PvPlantFields from "../../../components/PvPlantFields";
import PvConsumerSection from "../../../components/PvConsumerSection";
// ResultVerguetung umschließt ResultRegime — deshalb hier nur der äußere Import.
import ResultVerguetung from "./_components/ResultVerguetung";
import ErgebnisAnBetrieb, { type PartnerAngabe } from "../../../components/ErgebnisAnBetrieb";
// HEIZSYSTEM/HEIZSYSTEM_SHORT/WP_M2_PRESETS brauchte der entfallene
// Verbrauchs-Abschnitt; die Gebäudefragen holen sie sich jetzt selbst aus
// components/GebaeudeField.
import { YEAR, YEARS, DEGRAD, ANLAGEN, SPEICHER, PERSONEN, NUTZUNG, TRI, EA_KM_PRESETS, SCENARIOS, SHARE_KEYS, HAUSTYPEN, HAUSTYP_WP, DACHARTEN, INSULATION_BESTAND, NATIONAL_AVG_YIELD, EINSPEISESATZ_MAX_CT, type Heizsystem } from "../../../lib/constants";
import { DIREKT_KEY } from "../../../lib/share-keys";
import { estimateCost, calcEigenverbrauch, calcEigenverbrauchExakt, calcWeightedFeedIn, calc, batteryReplaceCost, paramInt, paramFloat, paramFloatOrNull, paramStr, vollEinspeisungGesperrt } from "../../../lib/calc";
import { simulatePvYear, simulateExampleDay, EXAMPLE_DAYS } from "../../../lib/pv-sim";
import { calcWpAnnualElectricity, DEFAULT_WP_BUILDING, wpGebaeudeUebersprungenFolge } from "../../../lib/heatpump";
import PvConsumerFields, {consumersComplete, type PvConsumerValues} from "../../../components/PvConsumerFields";
import OptionCard from "../../../components/OptionCard";
import DachField, { DACH_FIELDS } from "../../../components/DachField";
import GebaeudeField, { GEBAEUDE_FIELDS, type GebaeudeWerte } from "../../../components/GebaeudeField";
import Toast from "../../../components/Toast";
import { dachErtragHinweis, dachErtragKwp, dachNeigungsFaktor, dachUebersprungenFolge, ERTRAG_OPTIMUM_MIN, ERTRAG_OPTIMUM_MAX } from "../../../lib/dach-ertrag";
import { TILT_ORIENTATIONS, type TiltOrientation } from "../../../lib/tilt-config";
import TriToggle from "../../../components/TriToggle";
import InlineEdit from "../../../components/InlineEdit";
import PresetNumberInput from "../../../components/PresetNumberInput";
import { calcExtraConsumption, calcEaAnnual, KLIMA_DEFAULT_M2, type HouseholdProfile } from "../../../lib/consumption";
import { klimaSchnellschaetzungKwh } from "../../../lib/aircon";
import { DEFAULT_AIRCON_CONFIG as CFG } from "../../../lib/aircon-config";
import { useCoolingDegree } from "../../../lib/useCoolingDegree";
import KlimaDetailModal from "../../../components/KlimaDetailModal";
import { CategoryBarChart } from "../../../components/charts/CategoryBarChart";
import { v, iconSizes } from "../../../lib/theme";
import { usePrices } from "../../../lib/prices";
import { DEFAULT_PRICES } from "../../../lib/prices-config";
import { useFeedInRates } from "../../../lib/feedin";
import { IconChevronDown, IconSun } from "../../../components/Icons";
import FlowNav from "../../../components/FlowNav";
import FlowSchritte from "../../../components/FlowSchritte";
import { AccordionField, ChoiceButtons } from "../../../components/AccordionField";
import ScenarioTabs from "../../../components/ScenarioTabs";
import { trackEvent, trackFunnelStep, type Funnel } from "../../../lib/analytics";
import ResultOverview from "../../../components/calculator/ResultOverview";
import ResultSettings from "../../../components/ResultSettings";
import StatCard from "../../../components/calculator/ResultStatCard";
import { useResultIntro } from "../../../components/calculator/useResultIntro";
import PvCoolingEditor from "../../../components/PvCoolingEditor";
import PvResultRace from "./_components/PvResultRace";
import StandortField from "../../../components/StandortField";
// ResultSection steht schon oben; ResultVerbrauch ist entfallen (die
// Verbraucher haben je einen eigenen Abschnitt).
import ResultStats from "./_components/ResultStats";
import ResultActions from "../../../components/calculator/ResultActions";
import ResultFunding from "../../../components/ResultFunding";
import { stackFunding, type FundingProgram } from "../../../lib/funding-programs";
import { useFoerderung } from "../../../lib/use-foerderung";

// Großverbraucher-Detailfragen in ihrer Akkordeon-Reihenfolge. Pro aktivem
// Verbraucher wird immer nur die erste noch offene Frage aufgeklappt.
// Die vier Gebäudefragen kommen aus dem Baustein — eine Quelle, kein zweites
// Tippen der Schlüssel.
const WP_FIELDS = GEBAEUDE_FIELDS;
const EA_FIELDS = ["ea-km"] as const;
const KLIMA_FIELDS = ["klima-rooms"] as const;
// Auch die Dach-Fragen laufen über diesen Zustand. Sie standen zuerst außen vor
// und das Ergebnis übergab ein festes „alles beantwortet"-Set — dadurch ließ
// sich eine ungültig gewordene Ausrichtung nicht zurücknehmen, die Frage kam
// nicht wieder und der Ertrag fiel still auf den Bestfall zurück.
// Modell-Annahme für die Klima-Schnellschätzung, aus der geteilten Config (kein
// Drift zum Klimaanlagen-Rechner). Langlabel auf den Kurznamen vor der Klammer.
const KLIMA_DEVICE_LABEL = (CFG.devices.find(d => d.id === CFG.defaultDeviceId)?.label ?? "Split-Anlage").split(" (")[0];

// ─── Main ────────────────────────────────────────────────────────────────────
export default function PVRechner({
  initialParams,
  sharePfad,
  partner,
}: {
  initialParams?: Record<string, string | string[] | undefined>;
  /**
   * Pfad, auf den der Teilen-Link zeigt — nötig, wenn der Rechner NICHT unter
   * seiner eigenen Adresse läuft (26.08.2026).
   *
   * Er wird auch in einem Fenster auf den Förder-Stadtseiten geöffnet. Ohne
   * diesen Wert baute er den Link aus der Adresse der Seite, auf der er gerade
   * steht — der Empfänger landete dann auf einer Stadtseite mit einer Query,
   * die dort niemand liest, und sähe die geteilte Rechnung nie. Ein Teilen-Link,
   * der ins Leere führt, ist schlimmer als kein Teilen-Knopf.
   */
  sharePfad?: string;
  /**
   * Gesetzt auf der betriebseigenen Seite: Dann erscheint unter dem Ergebnis
   * der Rückkanal — der Nutzer kann seine fertige Rechnung an genau den
   * Betrieb schicken, von dessen Website er gekommen ist. Ohne diese Angabe
   * verhält sich der Rechner unverändert.
   */
  partner?: PartnerAngabe;
}) {
  // 'er' (Ertrag) und 'plz' sind reine Vorbefüll-Hinweise (z.B. von einer
  // regionalen Landingpage): sie seeden State, dürfen aber NICHT direkt ins
  // Ergebnis springen — das tut nur eine echte Konfiguration (a/s/p/n/…).
  // `direkt` öffnet nur die Direkteingabe statt des Empfehlungswegs und
  // beginnt deshalb bei der ersten Frage.
  const RESULT_KEYS = SHARE_KEYS.filter(k => k !== "er" && k !== "plz" && k !== "foe" && k !== DIREKT_KEY);
  const hasShare = !!initialParams && RESULT_KEYS.some(k => k in initialParams);

  // 5, nicht 4: Der Dach-Schritt ist inzwischen dazugekommen (Parallel-Session).
  const [step, setStep] = useState(hasShare && initialParams?.eingabe !== "1" ? 5 : 0);
  // Welche Fragen der Nutzer WIRKLICH beantwortet hat.
  //
  // Die Werte darunter tragen weiterhin sinnvolle Startwerte — die Rechnung
  // braucht sie, sobald ein geteilter Link direkt ins Ergebnis springt. Was sie
  // nicht mehr dürfen, ist sich als Auswahl AUSGEBEN: Nach der Flow-Konvention
  // startet kein Schritt mit einer Vorauswahl, und Weiter bleibt gesperrt, bis
  // wirklich jemand gewählt hat. Dasselbe Muster wie `gvAnswered` weiter unten.
  // Bei geteiltem Link gilt alles als beantwortet — die Werte kommen dort aus
  // den Parametern.
  const FLOW_FRAGEN = ["anlage", "speicher", "personen", "nutzung"] as const;
  const [beantwortet, setBeantwortet] = useState<Set<string>>(() => (hasShare ? new Set(FLOW_FRAGEN) : new Set()));
  const markBeantwortet = (key: string) =>
    setBeantwortet(prev => (prev.has(key) ? prev : new Set(prev).add(key)));
  const [anlage, setAnlage] = useState(hasShare ? paramInt(initialParams, "a", 2, 0, 4) : 2);
  // paramFloat, nicht paramInt: Die Größe ist in Halbschritten editierbar, und
  // parseInt hat die Nachkommastelle verschluckt — 12,5 kWp kamen beim Empfänger
  // des Links als 12 an, mit abweichender Investition und Amortisation.
  const [customKwp, setCustomKwp] = useState(hasShare ? paramFloat(initialParams, "ck", 12, 1, 50) : 12);
  const [speicher, setSpeicher] = useState(hasShare ? paramInt(initialParams, "s", 0, 0, SPEICHER.length - 1) : 0);
  // Freie Speichergröße aus dem Ergebnis heraus (Vorgaben sind Indizes, hier
  // steht die kWh-Zahl selbst). Null = es gilt die im Flow gewählte Vorgabe.
  const [oSpKwh, setOSpKwh] = useState<number | null>(hasShare ? paramFloatOrNull(initialParams, "sk", 0, 30) : null);
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

  // Brücke zum geteilten Gebäude-Baustein. Die vier Werte bleiben einzelne
  // States (sie hängen an je einem Share-Parameter), nach außen sind sie ein
  // Objekt — so sieht die Abfrage im Flow und im Ergebnis identisch aus, ohne
  // dass die URL-Kopplung dafür umgebaut werden muss.
  const gebaeudeWerte: GebaeudeWerte = {
    haustypIdx: wpHaustyp,
    wohnflaeche: wpWohnflaeche,
    insulationIdx: wpInsulation,
    heizsystem: wpHeizsystem,
  };
  const setGebaeudeWerte = (patch: Partial<GebaeudeWerte>) => {
    if (patch.haustypIdx !== undefined) setWpHaustyp(patch.haustypIdx);
    if (patch.wohnflaeche !== undefined) setWpWohnflaeche(patch.wohnflaeche);
    if (patch.insulationIdx !== undefined) setWpInsulation(patch.insulationIdx);
    if (patch.heizsystem !== undefined) setWpHeizsystem(patch.heizsystem);
    setOEv(null); // Eigenverbrauch neu herleiten — der Heizstrom hat sich geändert.
  };
  const dachZusammenfassung = () =>
    dachartIdx !== null && ausrichtung !== null
      ? `${DACHARTEN[dachartIdx].label} · ${TILT_ORIENTATIONS.find(o => o.key === ausrichtung)?.label}`
        + (neigungGrad !== null ? ` · ${neigungGrad}°` : "")
      : "nicht angegeben";

  // Progressive Disclosure im Großverbraucher-Step: welche Detail-Fragen der
  // Nutzer schon aktiv beantwortet hat (kein Preset vorausgewählt) + welche zum
  // Nachbearbeiten wieder aufgeklappt ist. Bei geteilter URL gelten alle als
  // gesetzt (die Werte kommen ja aus den Parametern → direkt eingeklappt zeigen).
  const [gvAnswered, setGvAnswered] = useState<Set<string>>(() => new Set(hasShare ? [...DACH_FIELDS, ...([["wht","wp-haustyp"],["wf","wp-flaeche"],["wi","wp-daemmung"],["wh","wp-heizsystem"],["km","ea-km"],["klr","klima-rooms"]] as const).filter(([param])=>initialParams?.[param] !== undefined).map(([,field])=>field)] : []));
  const [gvEditing, setGvEditing] = useState<string | null>(null);
  const markGvAnswered = (key: string) => {
    setGvAnswered(prev => (prev.has(key) ? prev : new Set(prev).add(key)));
    setGvEditing(null);
  };
  // Eine Antwort zurücknehmen: nötig, wenn eine Folgeantwort durch eine neue
  // Vorgabe ungültig wird (Dachform-Wechsel verwirft eine Nord-Ausrichtung).
  // Ohne das galt die Frage weiter als beantwortet und der Ertrag fiel still
  // auf den Bestfall zurück.
  const nimmGvZurueck = (key: string) => {
    setGvAnswered(prev => { if (!prev.has(key)) return prev; const n = new Set(prev); n.delete(key); return n; });
  };
  // Welche Frage einer Section ist offen: die zum Bearbeiten angeklickte, sonst
  // die erste noch offene. null = alle beantwortet (alles eingeklappt).
  const openGvField = (keys: readonly string[]): string | null => {
    if (gvEditing && keys.includes(gvEditing)) return gvEditing;
    return keys.find(k => !gvAnswered.has(k)) ?? null;
  };
  const wpAlleBeantwortet = WP_FIELDS.every(k => gvAnswered.has(k));

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
  const [oEinsp, setOEinsp] = useState<number | null>(hasShare && initialParams?.ei ? (() => { const n = Number(initialParams.ei); return isFinite(n) && n >= 0 && n <= EINSPEISESATZ_MAX_CT ? n : null; })() : null);
  const [einspeisungModus, setEinspeisungModus] = useState<"aus" | "teil" | "voll">(
    hasShare ? (initialParams?.eia === "2" ? "voll" : initialParams?.eia === "0" ? "aus" : "teil") : "teil"
  );
  const [oErtrag, setOErtrag] = useState(initialParams?.er ? paramInt(initialParams, "er", NATIONAL_AVG_YIELD, ERTRAG_OPTIMUM_MIN, ERTRAG_OPTIMUM_MAX) : NATIONAL_AVG_YIELD);
  // Vergütungsregime: heutige Konditionen (Default — sie gelten für jede Anlage,
  // die bis Ende 2026 ans Netz geht) oder der Entwurf für Neuanlagen ab 2027.
  // Der Börsenerlös nach der Förderphase ist bewusst separat schaltbar und
  // standardmäßig AUS, damit die Grundrechnung ohne eine Annahme über künftige
  // Börsenpreise auskommt.
  const [regime, setRegime] = useState<EinspeiseRegime>(
    hasShare && initialParams?.rg === "2027" ? "reform2027" : "heute",
  );
  const [marktErloes, setMarktErloes] = useState(hasShare ? initialParams?.mk === "1" : false);
  const [oMarktwert, setOMarktwert] = useState<number | null>(
    hasShare && initialParams?.mw
      ? (() => { const n = Number(initialParams.mw); return isFinite(n) && n >= 0 && n <= 30 ? n : null; })()
      : null,
  );
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
  // Abruf, Mehrdeutigkeit einer PLZ und Vorbelegung stecken im geteilten Hook —
  // Balkon- und Wärmepumpen-Rechner benutzen denselben.
  const foerderQuelle = useFoerderung("pv", seedFoeId);
  const [appliedPrograms, setAppliedPrograms] = useState<FundingProgram[] | null>(null);
  const fundingPrograms = appliedPrograms ?? foerderQuelle.programme;
  const [pendingPlace, setPendingPlace] = useState<{plz: string; ags: string; name: string} | null>(null);
  const [checkedPlace, setCheckedPlace] = useState<{plz: string; ags: string; name: string} | null>(null);
  const [locationDirty, setLocationDirty] = useState(false);
  const [fundingError, setFundingError] = useState<string | null>(null);
  const [appliedAgs, setAppliedAgs] = useState<string | null>(() => typeof initialParams?.ags === "string" && /^\d{8}$/.test(initialParams.ags) ? initialParams.ags : null);
  useEffect(() => {
    if (locationDirty || pendingPlace) return;
    const place = foerderQuelle.kandidaten?.find(p => p.ags === foerderQuelle.ags);
    if (place) { setCheckedPlace({plz,ags:place.ags,name:place.ort}); setAppliedAgs(place.ags); }
  }, [foerderQuelle.kandidaten, foerderQuelle.ags, plz, locationDirty, pendingPlace]);
  const [fundingDraft, setFundingDraft] = useState<boolean | null>(null);
  // Ob die Förderung eingerechnet wird, bleibt hier: eine Anzeige-Entscheidung.
  const [fundingEnabled, setFundingEnabled] = useState<boolean>(!!seedFoeId);

  // Einmaliger PLZ-Toast beim ersten Anzeigen des Ergebnisses.
  const [plzToast, setPlzToast] = useState(false);
  const plzToastShown = useRef(false);

  // Gas/Öl-Referenz (nur bei WP)
  const [fuelType, setFuelType] = useState<"gas" | "oil">("gas");

  // Empfehlungs-Flow Kontext
  const flowType = hasShare && initialParams?.flow === "emp" ? "empfehlung" : "manual";
  const htIdx = hasShare ? paramInt(initialParams, "ht", -1, 0, 3) : -1;

  // ── Dach: Form + Ausrichtung ────────────────────────────────────────────
  // Die Dachform kommt aus dem Empfehlungs-Flow bereits mit (`da`) — dort wird
  // sie für die Dachfläche gebraucht. Sie ist hier ECHTER State, nicht nur ein
  // gelesener Parameter: der Nutzer soll sie auch im manuellen Flow angeben und
  // im Ergebnis ändern können.
  const [dachartIdx, setDachartIdx] = useState<number | null>(() => {
    if (!hasShare) return null;
    const i = paramInt(initialParams, "da", -1, 0, DACHARTEN.length - 1);
    return i >= 0 ? i : null;
  });
  const [ausrichtung, setAusrichtung] = useState<TiltOrientation | null>(
    hasShare
      ? (paramStr(initialParams, "az", "", ["sued", "suedostwest", "ostwest", "nord"]) as TiltOrientation) || null
      : null,
  );
  // Neigung in Grad. null = nicht angegeben → es gilt die typische Neigung der
  // Dachform. Bewusst keine Pflichtangabe: nach Süden liegen zwischen 30° und
  // 50° ganze 1 Prozentpunkt, nach Norden bis zu 27 (siehe lib/dach-ertrag.ts).
  const [neigungGrad, setNeigungGrad] = useState<number | null>(() => {
    if (!hasShare) return null;
    const g = paramInt(initialParams, "ng", -1, 0, 90);
    return g >= 0 ? g : null;
  });
  const daIdx = dachartIdx ?? -1;

  // Überspringbare Fragen melden ihre Folge als Toast. Der Text ist die
  // Gegenleistung fürs Überspringen — die Annahme wird ausgesprochen, statt
  // still zu gelten. Ein String statt eines Flags, damit dieselbe Mechanik für
  // Dach und Gebäude reicht.
  const [folgeToast, setFolgeToast] = useState<string | null>(null);

  const yieldRequest = useRef(0);
  // PLZ → PVGIS Ertrag laden
  const fetchPvgis = async (inputPlz: string, lookupFunding = true) => {
    if (!/^\d{5}$/.test(inputPlz)) return false;
    const request = ++yieldRequest.current;
    if (lookupFunding) foerderQuelle.ausPlz(inputPlz, appliedAgs ?? undefined);
    setPlzLoading(true);
    let succeeded = false;
    try {
      // PLZ → Koordinaten (lazy load)
      const plzRes = await fetch("/plz.json");
      const plzData: Record<string, [number, number]> = await plzRes.json();
      const coords = plzData[inputPlz];
      if (!coords) { if (request === yieldRequest.current) setPlzLoading(false); return false; }
      const [lat, lon] = coords;
      const res = await fetch(`/api/pvgis?lat=${lat}&lon=${lon}&plzPrefix=${inputPlz.slice(0, 2)}`);
      const data = await res.json();
      if (request !== yieldRequest.current) return false;
      if (data.annual && data.annual >= 700 && data.annual <= 1400) {
        succeeded = true;
        setOErtrag(data.annual);
        setPlzSource(data.source);
        if (data.monthly && data.monthly.length === 12) setMonthlyProfile(data.monthly);
      }
    } catch { /* Fallback: oErtrag bleibt unverändert */ }
    if (request === yieldRequest.current) setPlzLoading(false);
    return succeeded;
  };

  // Auto-fetch bei Share-URL mit PLZ
  useEffect(() => { if (plz) fetchPvgis(plz); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Ohne PLZ im Link: den gemerkten Standort übernehmen und direkt anwenden,
  // damit der Ertrag stimmt, ohne dass die PLZ erneut eingegeben werden muss.
  useSharedPlz(plz, (shared) => { setAppliedAgs(null); setAppliedPrograms(null); setCheckedPlace(null); setPlz(shared); void foerderQuelle.ausPlz(shared); void fetchPvgis(shared, false); });

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
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [savedCalcId, setSavedCalcId] = useState<string | null>(initialParams?.calc ? String(initialParams.calc) : null);
  // Merkt sich, dass die Anmeldung aus dem "Speichern"-Knopf kam. Meldet sich
  // jemand hier im Fenster an, bleibt er auf seinem Ergebnis stehen — dann muss
  // die Berechnung noch gespeichert werden, sobald der Anmelde-Zustand
  // umgesprungen ist. Wer über Google geht, verlässt die Seite; für den greift
  // die im Browser vorgemerkte Berechnung, die der eigene Bereich abholt.
  const [speichernNachLogin, setSpeichernNachLogin] = useState(false);

  // Auto-save wird jetzt vom Dashboard übernommen (pendingSave in localStorage)

  // Share state
  const [copied, setCopied] = useState(false);
  const [canShare, setCanShare] = useState(false);
  useEffect(() => { setCanShare(typeof navigator !== "undefined" && !!navigator.share); }, []);

  const kwp = anlage <= 3 ? ANLAGEN[anlage].kwp : customKwp;
  const spKwh = oSpKwh ?? SPEICHER[speicher].kwh;
  // Brutto = vom Nutzer editierte oder geschätzte Investition. Förderung (falls
  // aktiviert) reduziert sie zur effektiven Investition, mit der gerechnet wird.
  const bruttoKosten = oKosten !== null ? oKosten : estimateCost(kwp, spKwh, prices);
  const fundingStack = useMemo(
    () => stackFunding(fundingPrograms, { technik: "pv", kwp, speicherKwh: spKwh, kosten: bruttoKosten }),
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
    () => klimaSchnellschaetzungKwh({ rooms: klimaRooms, cdh: cooling.cdhSet.avg5, stromPrice: oStrom }),
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
  const extraVerbrauch = calcExtraConsumption(wp, ea, eaKm, klima, KLIMA_DEFAULT_M2, effKlimaKwh, wpKwh);
  const gesamtVerbrauch = grundverbrauch + extraVerbrauch;

  // ── Der Ertrag, mit dem tatsächlich gerechnet wird ──────────────────────
  // `oErtrag` ist das Standort-OPTIMUM (PVGIS liefert mit optimaler Neigung
  // nach Süden). Erst das Dach macht daraus den Ertrag dieser Anlage. Ab hier
  // gilt ausschließlich `effErtrag` — Geldrechnung UND Stundensimulation, sonst
  // laufen Ersparnis und Autarkie auseinander (siehe lib/dach-ertrag.ts).
  const effErtrag = dachErtragKwp(oErtrag, dachartIdx, ausrichtung, neigungGrad);

  // Das Ertrags-Feld im Ergebnis zeigt und nimmt den Ertrag DIESER Anlage. Wer
  // ihn von Hand setzt, meint „mein Dach bringt X" — also auf das Standort-
  // Optimum zurückrechnen, damit ein späterer Dachwechsel wieder sauber davon
  // skaliert (sonst wäre die Handeingabe nach dem nächsten Klick wieder weg).
  //
  // Die GRENZEN des Feldes müssen dabei mitskalieren. Sie gelten für den
  // angezeigten Wert, die Rückrechnung erzeugt aber das Optimum — und das muss
  // in `ERTRAG_OPTIMUM_MIN…MAX` bleiben, weil der Teilen-Parameter `er` genau
  // diesen Bereich liest. Ohne Skalierung lag das Ergebnis bei Nordlage IMMER
  // darüber: Eingabe 700 bei Faktor 0,45 ergibt 1.556, der Empfänger des Links
  // fiel auf den Default zurück und sah 428 statt 700 kWh/kWp.
  const ertragFaktor = dachNeigungsFaktor(dachartIdx, ausrichtung, neigungGrad);
  const ertragMin = Math.ceil(ERTRAG_OPTIMUM_MIN * ertragFaktor);
  const ertragMax = Math.floor(ERTRAG_OPTIMUM_MAX * ertragFaktor);
  const setErtragVonHand = (val: number) =>
    setOErtrag(Math.min(ERTRAG_OPTIMUM_MAX, Math.max(ERTRAG_OPTIMUM_MIN, Math.round(val / ertragFaktor))));

  const evEingaben = { personenIdx: personen, nutzungIdx: nutzung, speicherKwh: spKwh, wp, ea, eaKm, klima, klimaM2: KLIMA_DEFAULT_M2, klimaKwh: effKlimaKwh, wpKwh, kwp, ertragKwp: effErtrag, baseKwh: oVerbrauch };
  const autoEv = calcEigenverbrauch(evEingaben);
  const effEv = oEv !== null ? oEv : autoEv;
  // Angezeigt wird der ganze Prozentwert, gerechnet mit dem ungerundeten: Die
  // Rundung kippte im Geld stufenweise, und eine größere Anlage wies dann weniger
  // Gewinn aus als eine kleinere (Rechenmodell-Council 12.09.2026). Ein von Hand
  // gesetzter Wert gilt so, wie er eingetippt wurde.
  const effEvRechnung = oEv !== null ? oEv : calcEigenverbrauchExakt(evEingaben);
  // Volleinspeisung is incompatible with WP/E-Auto (they require self-consumption)
  const vollDisabled = vollEinspeisungGesperrt({ wp, ea, speicherKwh: spKwh });
  const effEinspeisungModus = vollDisabled && einspeisungModus === "voll" ? "teil" : einspeisungModus;
  const jahresertrag = kwp * effErtrag;
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
    () => simulatePvYear({ kwp, speicherKwh: spKwh, monthlyYieldPerKwp: monthlyProfile, ertragKwp: effErtrag, household }),
    [kwp, spKwh, monthlyProfile, effErtrag, household],
  );
  // Bei Volleinspeisung geht alles ins Netz und der Haushalt bezieht alles aus
  // dem Netz — die Simulation kennt diesen Modus nicht und lieferte die
  // Autarkie eines Teileinspeisers (30 % ohne Speicher).
  const monthlyConsumption = useMemo(() => pvSim.monthly.map(m => m.consumption), [pvSim]);
  const autarkie = effEinspeisungModus === "voll" ? 0 : pvSim.autarky;
  // Die Monatsbalken kommen aus dem PVGIS-Optimum (Süd, ideale Neigung); jede
  // andere Zahl der Seite rechnet mit dem Ertrag DIESES Dachs. Bis 05.09.2026
  // zeigten die Balken bei Ost/West 10.500 kWh neben einem Jahresertrag von
  // 8.400. Die Dach-Matrix skaliert nur die Menge, nicht die Form — ein Faktor
  // genügt (lib/dach-ertrag.ts).
  const balkenFaktor = oErtrag > 0 ? effErtrag / oErtrag : 1;
  // Beispieltage (24-h-Detail) für das Modal — sonniger/trüber Wintertag + Sommertag.
  const exampleDays = useMemo(
    () => EXAMPLE_DAYS.map(d => ({
      key: d.key, label: d.label,
      day: simulateExampleDay({ kwp, speicherKwh: spKwh, monthlyYieldPerKwp: monthlyProfile, ertragKwp: effErtrag, household }, d.month, d.dayType),
    })),
    [kwp, spKwh, monthlyProfile, effErtrag, household],
  );

  // Feed-in: weighted EEG rate based on system size + effective mode
  const autoEinsp = effEinspeisungModus === "voll"
    ? calcWeightedFeedIn(kwp, feedInRates.vollUnder10, feedInRates.vollOver10, feedInRates.thresholdKwp)
    : calcWeightedFeedIn(kwp, feedInRates.teilUnder10, feedInRates.teilOver10, feedInRates.thresholdKwp);
  const effEinsp = oEinsp ?? autoEinsp;

  // ── Konditionen ab 2027 (Entwurf) ──────────────────────────────────────────
  // Zweite Stunden-Jahressimulation, diesmal mit der Preisform und dem geplanten
  // Einspeisedeckel. Sie liefert zwei Größen, die nicht geschätzt werden dürfen:
  // wie viel vom Überschuss am Deckel überhaupt durchkommt, und was die
  // verbleibende Kilowattstunde im Vergleich zum vollen Ertrag wert ist. Beides
  // hängt am Speicher und am Verbrauchsprofil dieses Haushalts, also fällt es aus
  // derselben Simulation an wie die Autarkie — statt aus einer zweiten Annahme.
  const calculateMarketProfile = (mode: "aus" | "teil" | "voll", profile: HouseholdProfile = household) =>
    calculatePvMarketProfile({kwp, storageKwh:spKwh, monthly:monthlyProfile, yieldPerKwp:effErtrag}, mode, profile);
  const marktSim = useMemo(() => calculateMarketProfile(effEinspeisungModus), [kwp, spKwh, monthlyProfile, effErtrag, household, effEinspeisungModus]);

  const einspeiseVerlaufJahre = useMemo(() => einspeiseVerlauf({
    regime,
    kwp,
    // Der Entwurf gilt für Neuanlagen ab 2027. Wer heute rechnet und die
    // Reform-Konditionen wählt, plant frühestens für 2027 — deshalb ist das
    // das früheste zulässige Inbetriebnahmejahr, nicht das laufende.
    inbetriebnahmeJahr: Math.max(2027, YEAR),
    heuteSatzCt: effEinspeisungModus === "aus" ? 0 : effEinsp,
    marktErloes,
    profilFaktor: marktSim.profilFaktor,
    niveauCt: oMarktwert ?? MARKTWERT_NIVEAU_CT,
  }), [regime, kwp, effEinsp, effEinspeisungModus, marktErloes, marktSim.profilFaktor, oMarktwert]);

  const einspeiseModell = useMemo(() => {
    if (regime === "heute") return undefined;
    return {
      satzCtImJahr: (i: number) => einspeiseVerlaufJahre[i - 1]?.satzCt ?? 0,
      // Die Grundgebühr steht je Jahr im Verlauf: In den Übergangsjahren nimmt
      // der Netzbetreiber ab, da gibt es keinen Vermarkter und keine Gebühr.
      fixkostenImJahr: (i: number) => einspeiseVerlaufJahre[i - 1]?.fixkosten ?? 0,
      einspeiseAnteil: marktSim.einspeiseAnteil,
    };
  }, [regime, einspeiseVerlaufJahre, marktSim.einspeiseAnteil]);

  const scenarioData = useMemo(() => SCENARIOS.map(s => ({...s,
    data: calc({kwp, kosten, strompreis:oStrom,
      eigenverbrauch:effEinspeisungModus === "voll" ? 0 : Math.min(effEvRechnung+s.evDelta,95,(gesamtVerbrauch/jahresertrag)*100),
      einspeisung:effEinspeisungModus === "aus" ? 0 : effEinsp,
      stromSteigerung:s.strom, ertragKwp:effErtrag, monthly:monthlyProfile,
      batteryReplace:batteryReplaceCost(spKwh,prices),
      einspeiseModell:effEinspeisungModus === "aus" ? undefined : einspeiseModell,
    })})),[kwp,kosten,oStrom,effEvRechnung,effEinsp,effEinspeisungModus,effErtrag,monthlyProfile,spKwh,prices,gesamtVerbrauch,jahresertrag,einspeiseModell]);

  const [hasConsumerAddons, setHasConsumerAddons] = useState(false);
  const [consumerRevision, setConsumerRevision] = useState(0);
  const consumerValues = {nutzung,wp,ea,eaKm,klima,klimaRooms,klimaKwh,wpHaustyp,wpWohnflaeche,wpInsulation,wpHeizsystem};
  const applyConsumers = (draft:PvConsumerValues) => {setNutzung(draft.nutzung);setWp(draft.wp);setEa(draft.ea);setEaKm(draft.eaKm);setKlima(draft.klima);setKlimaRooms(draft.klimaRooms);setKlimaKwh(draft.klimaKwh);setWpHaustyp(draft.wpHaustyp);setWpWohnflaeche(draft.wpWohnflaeche);setWpInsulation(draft.wpInsulation);setWpHeizsystem(draft.wpHeizsystem);setOEv(null);};

  // Was der Börsenerlös über die Laufzeit ausmacht: dasselbe Szenario einmal mit
  // und einmal ohne Marktbewertung. Die Zahl steht am Schalter selbst — sonst
  // klickt man ihn und sieht nichts, weil die Wirkung erst nach der
  // Übergangszahlung einsetzt und die Amortisation in ganzen Jahren meist nicht
  // bewegt.
  const marketImpact = (draft: {regime: EinspeiseRegime; modus: "aus" | "teil" | "voll"; einsp: number; niveau: number | null}, profile: typeof marktSim) => {
    if (draft.regime !== "reform2027" || draft.modus === "aus") return undefined;
    const s = SCENARIOS.find(x => x.id === scenario) ?? SCENARIOS[1];
    const gemeinsam = {
      kwp, kosten, strompreis: oStrom,
      eigenverbrauch: draft.modus === "voll"
        ? 0
        : Math.min(effEvRechnung + s.evDelta, 95, (gesamtVerbrauch / jahresertrag) * 100),
      einspeisung: draft.einsp,
      // Der Ertrag DIESER Anlage, nicht das Standort-Optimum: Hier stand `oErtrag`
      // und damit ein Bestfall-Dach, während jede andere Zahl der Seite mit dem
      // echten Dach rechnet. Die Wirkung des Börsenerlöses war dadurch bei einem
      // Ost/West-Dach 25 % zu groß, beim Nord-Pultdach 32 % (Council 18.08.2026).
      stromSteigerung: s.strom, ertragKwp: effErtrag, monthly: monthlyProfile,
      batteryReplace: batteryReplaceCost(spKwh, prices),
    };
    const total = (mk: boolean) => {
      const verlauf = einspeiseVerlauf({
        regime: draft.regime, kwp, inbetriebnahmeJahr: Math.max(2027, YEAR),
        heuteSatzCt: draft.einsp, marktErloes: mk,
        profilFaktor: profile.profilFaktor,
        niveauCt: draft.niveau ?? MARKTWERT_NIVEAU_CT,
      });
      return calc({
        ...gemeinsam,
        einspeiseModell: {
          satzCtImJahr: (i: number) => verlauf[i - 1]?.satzCt ?? 0,
          fixkostenImJahr: (i: number) => verlauf[i - 1]?.fixkosten ?? 0,
          einspeiseAnteil: profile.einspeiseAnteil,
        },
      }).total;
    };
    // Kein `Math.max(0, …)`: Seit die Grundgebühr nur noch anfällt, wo sich die
    // Vermarktung trägt, kann die Differenz nicht mehr negativ werden — und wenn
    // doch, wäre genau das die Auskunft, die an den Schalter gehört. Eine auf
    // null gekappte Zahl neben einer sinkenden Hauptzahl erklärt gar nichts.
    return total(true) - total(false);
  };

  // Das aktuell gewählte Szenario treibt alle Ergebniszahlen. Fallback auf
  // „realistic", falls der State (z. B. aus einer alten Share-URL) nicht passt.
  const sel = scenarioData.find(s => s.id === scenario) ?? scenarioData.find(s => s.id === "realistic")!;
  const be = sel.data.be;

  const STEPS = ["Wie groß soll die Anlage werden?", "Dein Dach", "Batteriespeicher?", "Dein Haushalt", "Großverbraucher"];
  // One word each for the step indicator; the current one is the step heading.
  const SCHRITT_NAMEN = ["Anlage", "Dach", "Speicher", "Haushalt", "Verbraucher"];
  const isResult = step >= STEPS.length;
  const [resultRevision, setResultRevision] = useState(0);
  const [technicalOpen, setTechnicalOpen] = useState(false);
  const [locationOpen, setLocationOpen] = useState(false);
  const [resultDetailsOpen, setResultDetailsOpen] = useState(false);
  const resultCardRef = useRef<HTMLDivElement>(null);
  const intro = useResultIntro(isResult, resultRevision, false);
  const revealUpdatedResult = () => {
    setResultRevision(n => n + 1);
    setLocationOpen(false);
    requestAnimationFrame(() => document.getElementById("pv-ueberblick")?.scrollIntoView({behavior: "smooth", block: "start"}));
  };
  const previewFunding = stackFunding(foerderQuelle.programme, {technik: "pv", kwp, speicherKwh: spKwh, kosten: bruttoKosten});
  const locationChanged = pendingPlace !== null || (fundingDraft !== null && fundingDraft !== fundingEnabled);
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
    if (!plzToast || intro.progress < 1) return;
    const t = setTimeout(() => setPlzToast(false), 6000);
    return () => clearTimeout(t);
  }, [plzToast, intro.progress]);

  // Ereignis je erreichtem Schritt, Reihenfolge wie STEPS, danach das Ergebnis.
  // Bis 29.08.2026 fehlte hier der Dach-Schritt (eingefügt am 07.08.2026, Liste
  // nicht nachgezogen) — seither bezeichnete jeder Name den falschen Schritt.
  // Länge und Reihenfolge sind jetzt festgenagelt; Begründung in `lib/analytics.ts`.
  //
  // Das Ergebnis zählt als reine Zahl: Bis 27.08.2026 gingen hier Anlagen- und
  // Speichergröße als Ereignis-Eigenschaften mit — der einzige Posten, der
  // etwas über den NUTZER sagte statt über die Seite, und genau der, an dem die
  // Einwilligungsfreiheit der Messung gekippt wäre.
  const FUNNEL: Funnel = [
    null,
    "pv_schritt_dach",
    "pv_schritt_speicher",
    "pv_schritt_haushalt",
    "pv_schritt_verbraucher",
    "pv_ergebnis",
  ];
  const next = () => {
    if (step >= STEPS.length) return;
    const target = step + 1;
    trackFunnelStep(FUNNEL, target);
    setStep(target);
  };
  const back = () => step > 0 && setStep(step - 1);

  // Was der aktuelle Schritt braucht, bevor es weitergeht — an EINER Stelle,
  // damit Freigabe und Hinweistext nie auseinanderlaufen. Reihenfolge wie STEPS.
  //
  // Zwei Schritte verlangen bewusst NICHTS:
  //   „Dein Dach" (1) trägt ein ausdrückliches „Weiß ich nicht — überspringen".
  //   Eine Frage mit eigenem Ausweg ist keine Pflichtfrage; wer überspringt,
  //   bekommt stattdessen den Toast mit der Annahme und ihrer Fehlerrichtung.
  //   „Großverbraucher" (4) fragt Ein/Aus: „keine Wärmepumpe, kein E-Auto,
  //   keine Klimaanlage" ist der Ausgangszustand, keine vorausgewählte Antwort —
  //   wer nichts davon hat, soll nicht erst dreimal „nein" antworten müssen.
  const stepAnforderung: { erfuellt: boolean; hinweis: string }[] = [
    { erfuellt: beantwortet.has("anlage"), hinweis: "Bitte erst eine Anlagengröße wählen." },
    { erfuellt: true, hinweis: "" },
    { erfuellt: beantwortet.has("speicher"), hinweis: "Bitte erst eine Speichergröße wählen — „Kein Speicher“ zählt auch." },
    {
      // Im Direktmodus ersetzt der eingetippte Jahresverbrauch die Personenfrage.
      erfuellt: (verbrauchMode || beantwortet.has("personen")) && beantwortet.has("nutzung"),
      hinweis: !beantwortet.has("nutzung") && (verbrauchMode || beantwortet.has("personen"))
        ? "Bitte noch das Nutzungsprofil wählen."
        : "Bitte Haushalt und Nutzungsprofil angeben.",
    },
    { erfuellt: true, hinweis: "" },
  ];
  const stepBeantwortet = step >= STEPS.length || (stepAnforderung[step]?.erfuellt ?? true);
  const stepHinweis = stepAnforderung[step]?.hinweis ?? "";
  const restart = () => {
    if (!sharePfad) {
      const path = window.location.pathname === "/photovoltaik-rechner/ergebnis" ? "/photovoltaik-rechner" : window.location.pathname;
      window.location.assign(flowType === "manual" ? `${path}?${DIREKT_KEY}=1` : path);
      return;
    }
    setBeantwortet(new Set()); setGvAnswered(new Set()); setGvEditing(null); setStep(0); setOKosten(null); setOEv(null); setOVerbrauch(null); setDachartIdx(null); setAusrichtung(null); // Die Adresse nur aufräumen, wenn der Rechner unter seiner EIGENEN läuft.
    // Im Fenster einer Stadtseite gehört sie dieser Seite; ein Neustart des
    // Rechners darf ihr nicht die Query wegnehmen.
    if (typeof window !== "undefined" && !sharePfad) window.history.replaceState(null, "", window.location.pathname); };

  const buildShareUrl = () => {
    const p = new URLSearchParams();
    p.set("a", String(anlage));
    p.set("s", String(speicher));
    if (oSpKwh !== null) p.set("sk", String(oSpKwh));
    p.set("p", String(personen));
    p.set("n", String(nutzung));
    if (initialParams?.flaeche) p.set("flaeche", String(initialParams.flaeche));
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
    // Das Vergütungsregime gehört in den Link: Wer eine Reform-Rechnung teilt,
    // teilt sonst eine Zahl, die beim Empfänger anders herauskommt.
    if (regime === "reform2027") p.set("rg", "2027");
    if (marktErloes) p.set("mk", "1");
    if (oMarktwert !== null) p.set("mw", String(oMarktwert));
    // `er` ist das Standort-OPTIMUM, `da`/`az` machen daraus wieder den Ertrag
    // dieser Anlage. Beides muss mit — sonst rechnet der Empfänger ein anderes
    // Dach als der Absender (dieselbe Regel wie bei Regime und Marktwert).
    p.set("er", String(oErtrag));
    if (dachartIdx !== null) p.set("da", String(dachartIdx));
    if (ausrichtung !== null) p.set("az", ausrichtung);
    if (neigungGrad !== null) p.set("ng", String(neigungGrad));
    if (scenario !== "realistic") p.set("sc", scenario);
    if (plz) p.set("plz", plz);
    if (appliedAgs) p.set("ags", appliedAgs);
    // Förderung: das wirksamste angerechnete Programm mitgeben, damit der Link
    // dieselbe Förderung vorab scharf schaltet.
    if (fundingEnabled && fundingStack.applied.length > 0) p.set("foe", fundingStack.applied[fundingStack.applied.length - 1].program.id);
    if (flowType === "empfehlung") {
      p.set("flow", "emp");
      if (htIdx >= 0) p.set("ht", String(htIdx));
    }
    return `${window.location.origin}${sharePfad ?? window.location.pathname}?${p.toString()}`;
  };

  const shareText = `Meine PV-Anlage (${kwp} kWp) amortisiert sich in ${be ? be.i : ">25"} Jahren.`;

  const handleCopy = async () => {
    trackEvent("pv_geteilt");
    try {
      await navigator.clipboard.writeText(buildShareUrl());
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch { prompt("Link kopieren:", buildShareUrl()); }
  };

  const handleNativeShare = async () => {
    if (!canShare) { await handleCopy(); return; }
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
        { anlage, customKwp, speicher, personen, nutzung, wp, ea, eaKm, oKosten, oEv, oStrom, oEinsp, einspeisungModus, oErtrag: effErtrag, plz, fuelType, flowType: flowType as "manual" | "empfehlung", haustyp: htIdx >= 0 ? htIdx : null, dachart: daIdx >= 0 ? daIdx : null, budgetLimit: null },
        { kwp, amortisationJahre: be ? be.i : null, rendite25j: Math.round(sel.data.total) }
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
  }, [authState, saving, anlage, customKwp, speicher, personen, nutzung, wp, ea, eaKm, oKosten, oEv, oStrom, oEinsp, einspeisungModus, effErtrag, plz, fuelType, kwp, spKwh, be, sel, flowType, htIdx, daIdx]); // eslint-disable-line react-hooks/exhaustive-deps

  /**
   * Anmeldefenster öffnen und die Berechnung schon einmal im Browser vormerken.
   *
   * Die Vormerkung greift für den Weg über Google: Dabei verlässt der Browser
   * die Seite und kommt im eigenen Bereich wieder an, der sie dort abholt. Wer
   * sich mit Passwort anmeldet, bleibt hier stehen — für den speichert der
   * Effekt darunter, sobald der Anmelde-Zustand umgesprungen ist.
   */
  const oeffneAnmeldung = useCallback(() => {
    if (isResult) {
      const row = paramsToRow(
        { anlage, customKwp, speicher, personen, nutzung, wp, ea, eaKm, oKosten, oEv, oStrom, oEinsp, einspeisungModus, oErtrag: effErtrag, plz, fuelType, flowType: flowType as "manual" | "empfehlung", haustyp: htIdx >= 0 ? htIdx : null, dachart: daIdx >= 0 ? daIdx : null, budgetLimit: null },
        { kwp, amortisationJahre: be ? be.i : null, rendite25j: Math.round(sel.data.total) }
      );
      const spLabel = spKwh > 0 ? ` + ${spKwh} kWh` : "";
      try {
        localStorage.setItem("pendingSave", JSON.stringify({ ...row, name: `${kwp} kWp${spLabel}` }));
      } catch {
        // Browser-Speicher gesperrt — dann greift nur der Weg über das Passwort.
      }
      setSpeichernNachLogin(true);
    }
    setShowLogin(true);
  }, [isResult, anlage, customKwp, speicher, personen, nutzung, wp, ea, eaKm, oKosten, oEv, oStrom, oEinsp, einspeisungModus, effErtrag, plz, fuelType, flowType, htIdx, daIdx, kwp, spKwh, be, sel]); // eslint-disable-line react-hooks/exhaustive-deps

  // Anmeldung im Fenster abgeschlossen: jetzt speichern, was der Knopf
  // versprochen hat. Hängt am Anmelde-Zustand, nicht am Klick — der Zustand
  // springt erst um, nachdem die Sitzung steht.
  useEffect(() => {
    if (!speichernNachLogin || authState.status !== "authed") return;
    setSpeichernNachLogin(false);
    try {
      localStorage.removeItem("pendingSave");
    } catch {
      // ignorieren
    }
    handleSave();
  }, [speichernNachLogin, authState.status, handleSave]);

  // Empfehlungs-Kontext für "Warum diese Anlage?"
  const empfehlungKontext = flowType === "empfehlung" && htIdx >= 0 && daIdx >= 0 ? (() => {
    const ht = HAUSTYPEN[htIdx];
    const da = DACHARTEN[daIdx];
    const nutzbar = paramFloat(initialParams, "flaeche", Math.round(ht.footprint * da.factor), 5, 500);
    const maxKwp = Math.round(nutzbar * 0.2 * 10) / 10;
    const dachAuslastung = Math.round((kwp / maxKwp) * 100);
    return { ht, da, nutzbar, maxKwp, grundverbrauch, extraVerbrauch, gesamtVerbrauch, dachAuslastung };
  })() : null;
  // grundverbrauch/extraVerbrauch/gesamtVerbrauch oben aufgelöst (respektiert oVerbrauch).

  return (
    <div className="wp-calculator-page wp-input-page pv-calculator-page" style={{ background: v('--color-bg'), fontFamily: v('--font-text'), color: v('--color-text-primary'), padding: "0 16px 20px" }}>
      <CalculatorTheme />

        <KlimaDetailModal
          open={klimaDetailOpen}
          onClose={() => setKlimaDetailOpen(false)}
          rooms={klimaRooms}
          plz={plz}
          stromPrice={oStrom}
          onApply={kwh => { setKlimaKwh(kwh); setOEv(null); }}
        />

      <CalculatorContent>

        {!isResult && <div style={{textAlign:"center", marginBottom:24}}><h1>PV-Rechner</h1><p>Berechne deine Anlage mit deinen eigenen Angaben.</p></div>}

        {/* Progress */}
        {!isResult && <FlowSchritte schritte={SCHRITT_NAMEN} aktiv={step} onSprung={setStep} />}

        {/* ── QUESTIONS ── */}
        {!isResult && (
          <div className="wp-input-step fu" key={step}>

            {step === 0 && (
              <PvSizeQuestion answered={beantwortet.has("anlage")} selected={anlage} customKwp={customKwp} onSelect={i => { setAnlage(i); setOKosten(null); setOEv(null); markBeantwortet("anlage"); }} onCustom={value => { setCustomKwp(Math.round(value)); setAnlage(4); setOKosten(null); setOEv(null); markBeantwortet("anlage"); }} />
            )}

            {step === 1 && (
              <div>
                <p style={{ fontSize: v("--font-size-body"), color: v('--color-text-muted'), marginTop: 0, marginBottom: 14, lineHeight: 1.5 }}>
                  Dachform und Ausrichtung entscheiden mit darüber, wie viel Strom die Anlage bringt —
                  zwischen einem Süddach und einem Norddach liegen über 40 Prozent.
                </p>
                <DachField completedStyle="check" karten
                  dachartIdx={dachartIdx}
                  setDachartIdx={setDachartIdx}
                  ausrichtung={ausrichtung}
                  setAusrichtung={setAusrichtung}
                  neigungGrad={neigungGrad}
                  setNeigungGrad={setNeigungGrad}
                  beantwortet={gvAnswered}
                  markiereBeantwortet={markGvAnswered}
                  nimmZurueck={nimmGvZurueck}
                  bearbeitet={gvEditing}
                  setBearbeitet={setGvEditing}
                  hinweis={dachErtragHinweis(effErtrag, dachartIdx, ausrichtung, !!plzSource, neigungGrad)}
                  onWeissNicht={() => {
                    setDachartIdx(null);
                    setAusrichtung(null);
                    setNeigungGrad(null);
                    setFolgeToast(dachUebersprungenFolge());
                    next();
                  }}
                />
              </div>
            )}

            {step === 2 && (
              <PvStorageQuestion answered={beantwortet.has("speicher")} selected={oSpKwh === null ? speicher : -1} onSelect={i => { setSpeicher(i); setOSpKwh(null); setOKosten(null); markBeantwortet("speicher"); }} />
            )}

            {step === 3 && (
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
                      // „Verbrauch kenne ich" ersetzt die Personenfrage: Wer den
                      // Jahreswert eingibt, hat den Haushalt beantwortet — sonst
                      // bliebe Weiter gesperrt und niemand sähe, woran es liegt.
                      if (opt.mode) markBeantwortet("personen");
                    }} style={{
                      flex: 1, padding: "8px 4px", borderRadius: v("--radius-pill"), fontSize: v("--font-size-small"), fontWeight: 600, cursor: "pointer",
                      background: verbrauchMode === opt.mode ? v('--color-cta') : "transparent",
                      border: "none",
                      color: verbrauchMode === opt.mode ? v('--color-text-on-accent') : v('--color-text-muted'),
                      transition: "all 0.15s",
                    }}>{opt.label}</button>
                  ))}
                </div>

                {!verbrauchMode ? (
                  <>
                    <div style={{ fontSize: v("--font-size-small"), fontWeight: 600, color: v('--color-text-muted'), marginBottom: 8, textTransform: "uppercase", letterSpacing: "0.04em" }}>Personen im Haushalt</div>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 6, marginBottom: 20 }}>
                      {PERSONEN.map((p, i) => {
                        // Gewählt erst, wenn wirklich jemand gewählt hat — der
                        // Startwert allein markiert nichts (Flow-Konvention).
                        const aktiv = beantwortet.has("personen") && personen === i;
                        return (
                        // data-flow-option/-group von Hand statt OptionCard: Die
                        // Zahlenreihe ist bewusst schmal (vier Spalten), eine
                        // Auswahlkarte mit Unterzeile würde den Schritt doppelt
                        // so hoch machen. Die Kennzeichnung ist dieselbe, damit
                        // der Flow-Läufer die Frage trotzdem bedienen kann; die
                        // Gruppe trennt sie vom Nutzungsprofil daneben.
                        <button key={i} data-flow-option={p.label === "1" ? "1 Person" : `${p.label} Personen`} data-flow-group="personen" aria-pressed={aktiv}
                          onClick={() => { setPersonen(i); setOEv(null); markBeantwortet("personen"); }} style={{
                          padding: "10px 4px", borderRadius: v('--radius-md'), fontSize: v("--font-size-body"), fontWeight: 700, cursor: "pointer", textAlign: "center",
                          background: aktiv ? v('--color-accent-dim') : v('--color-bg-muted'),
                          border: aktiv ? `2px solid ${v('--color-accent')}` : `2px solid ${v('--color-border')}`,
                          color: aktiv ? v('--color-accent') : v('--color-text-secondary'),
                        }}>{p.label}</button>
                        );
                      })}
                    </div>
                  </>
                ) : (
                  <div style={{ marginBottom: 20 }}>
                    <div style={{ fontSize: v("--font-size-small"), fontWeight: 600, color: v('--color-text-muted'), marginBottom: 8, textTransform: "uppercase", letterSpacing: "0.04em" }}>Jahresverbrauch Haushalt</div>
                    <div style={{
                      display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8,
                      background: v('--color-bg-muted'), borderRadius: v('--radius-md'), padding: "14px 16px",
                      border: `1.5px solid ${v('--color-accent')}`,
                    }}>
                      <span style={{ fontSize: v("--font-size-small"), color: v('--color-text-secondary') }}>Dein Stromverbrauch pro Jahr</span>
                      <InlineEdit value={oVerbrauch ?? PERSONEN[personen].verbrauch} onCommit={val => { setOVerbrauch(Math.round(val)); setOEv(null); }} unit=" kWh" step={100} min={500} max={30000} width={72} />
                    </div>
                    <div style={{ fontSize: v("--font-size-small"), color: v('--color-text-muted'), marginTop: 8, lineHeight: 1.5 }}>
                      Der Wert von deiner Stromrechnung — ohne Wärmepumpe und E-Auto. Die rechnen wir im nächsten Schritt separat dazu.
                    </div>
                  </div>
                )}
                <div style={{ fontSize: v("--font-size-small"), fontWeight: 600, color: v('--color-text-muted'), marginBottom: 8, textTransform: "uppercase", letterSpacing: "0.04em" }}>Nutzungsprofil</div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                  {NUTZUNG.map((n, i) => (
                    <OptionCard key={i} group="nutzung" selected={beantwortet.has("nutzung") && nutzung === i} onClick={() => { setNutzung(i); setOEv(null); markBeantwortet("nutzung"); }} label={n.label} sub={n.sub} />
                  ))}
                </div>
              </div>
            )}

            {step === 4 && (
              <div>
                {/* Warum diese Verbraucher zählen — Kontext als Infobox */}
                <div style={{
                  display: "flex", gap: 10, alignItems: "flex-start",
                  background: v('--color-bg-accent'), border: `1px solid ${v('--color-border-accent')}`,
                  borderRadius: v('--radius-md'), padding: "12px 14px", marginBottom: 18,
                }}>
                  <IconSun size={iconSizes.lg} color={v('--color-accent')} style={{ flexShrink: 0, marginTop: 1 }} />
                  <span style={{ fontSize: v("--font-size-small"), color: v('--color-text-secondary'), lineHeight: 1.55 }}>
                    Alle drei erhöhen deinen Eigenverbrauch — Klimaanlagen besonders, weil sie genau dann
                    kühlen, wenn die Sonne scheint. Die Wärmepumpe zieht ihren Strom vor allem im Winter,
                    das E-Auto nur beim Laden tagsüber.
                  </span>
                </div>

                {/* ── Wärmepumpe ── */}
                <TriToggle label="⚡ Wärmepumpe" options={TRI} value={wp} onChange={v => { setWp(v); setOEv(null); }} />
                {wp !== "nein" && (
                  <div style={{ marginBottom: 28, marginTop: -4 }}>
                    <div style={{ fontSize: v("--font-size-caption"), color: v('--color-text-muted'), marginBottom: 12, lineHeight: 1.5 }}>
                      Wie viel Heizstrom deine Wärmepumpe braucht, berechnen wir aus den Angaben zu deinem Gebäude.
                    </div>
                    <GebaeudeField completedStyle="check"
                      werte={gebaeudeWerte}
                      setWerte={setGebaeudeWerte}
                      beantwortet={gvAnswered}
                      markiereBeantwortet={markGvAnswered}
                      bearbeitet={gvEditing}
                      setBearbeitet={setGvEditing}
                      hinweis={wpAlleBeantwortet && wpKwh != null
                        ? `Daraus ergeben sich rund ${wpKwh.toLocaleString("de-DE")} kWh Heizstrom pro Jahr.`
                        : undefined}
                      onWeissNicht={() => {
                        // Defaults gelten ohnehin — hier wird nur ausgesprochen,
                        // WAS gilt, und die Kette als beantwortet markiert, damit
                        // die Folgefragen nicht weiter nachrücken.
                        WP_FIELDS.forEach(markGvAnswered);
                        setFolgeToast(wpGebaeudeUebersprungenFolge(wpKwh ?? 0));
                      }}
                    />
                  </div>
                )}

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
                                padding: "7px 10px", borderRadius: v('--radius-sm'), fontSize: v("--font-size-small"), fontWeight: 600, cursor: "pointer",
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
                            <div style={{ fontSize: v("--font-size-small"), color: v('--color-text-secondary'), lineHeight: 1.5 }}>
                              Kühlung im Sommer.{" "}
                              {klimaKwh !== null
                                ? <>Übernommen: <strong style={{ color: v('--color-text-primary') }}>{klimaKwhEff.toLocaleString("de-DE")} kWh/Jahr</strong>.</>
                                : <>Verbrauch ca. <strong style={{ color: v('--color-text-primary') }}>{klimaKwhEff.toLocaleString("de-DE")} kWh/Jahr</strong>.</>}
                            </div>
                            <div style={{ fontSize: v("--font-size-caption"), color: v('--color-text-faint'), marginTop: 3, lineHeight: 1.4 }}>
                              Angenommen: {KLIMA_DEVICE_LABEL}, ~{CFG.defaultRoomM2} m² je Raum.
                            </div>
                          </div>
                          <button onClick={() => setKlimaDetailOpen(true)} style={{
                            flexShrink: 0, padding: "8px 14px", borderRadius: v("--radius-pill"), fontSize: v("--font-size-small"), fontWeight: 700, cursor: "pointer",
                            background: v('--color-bg'), border: `1.5px solid ${v('--color-accent')}`, color: v('--color-accent'),
                          }}>exakter berechnen</button>
                        </div>
                      )}
                    </div>
                  );
                })()}
              </div>
            )}

            <div style={{ marginTop: 24 }}>
              <FlowNav
                weiterAktiv={stepBeantwortet}
                weiterLabel={step === STEPS.length - 1 ? "Berechnen" : "Weiter"}
                onWeiter={next}
                onZurueck={back}
                zurueckSichtbar={step > 0}
                inaktivHinweis={stepHinweis}
              />
            </div>
          </div>
        )}

        {/* ── RESULT ── */}
        <Toast
          alignTo={resultCardRef} tone="awareness" open={plzToast && intro.progress === 1 && !hasConsumerAddons}
          onClose={() => setPlzToast(false)}
          onClick={() => {setLocationOpen(true);setPlzToast(false);requestAnimationFrame(()=>document.getElementById("pv-einstellungen")?.scrollIntoView({behavior:"smooth"}));}}
        >
          {fundingActive
            ? "Standort prüfen für einen genaueren Ertrag"
            : "Vielleicht gibt es Förderung an deinem Wohnort"}
        </Toast>

        {/* Folge einer übersprungenen Frage. Neutral statt blau: das ist eine
            Auskunft, keine Handlungsaufforderung — und sie verschwindet von
            selbst, weil sie nichts erwartet. */}
        <Toast
          open={folgeToast !== null}
          onClose={() => setFolgeToast(null)}
          tone="neutral"
          autoHideMs={9000}
        >
          {folgeToast}
        </Toast>

        {isResult && (
          <div className="wp-ergebnis wp-result-main">
            <ResultOverview id="pv-ueberblick" saving={Math.round(sel.data.total)} years={YEARS}
              scenarioLabel={sel.resultLabel} progress={intro.progress} anchor={intro.anchor} heroRef={resultCardRef}
              onScenario={() => document.getElementById("pv-prices-trigger")?.click()}
              onDetails={() => setResultDetailsOpen(true)} onSettings={() => document.getElementById("pv-settings-trigger")?.click()}
              chart={<PvResultRace key={resultRevision} result={sel.data} consumption={gesamtVerbrauch} price={oStrom} rate={sel.strom} monthlyConsumption={monthlyConsumption} autoplay={intro.stage === "race"} />}
              stats={<>
                <StatCard label="Amortisation" value={be ? String(be.i) : `>${YEARS}`} unit="Jahre" help="Zeit, bis Stromersparnis und Einspeiseerlöse die Anschaffung nach Förderung ausgeglichen haben." />
                <StatCard label="Vorteil im 1. Jahr" value={Math.round(sel.data.years[1].j).toLocaleString("de-DE")} unit="€" help="Vermiedene Stromkosten plus Einspeiseerlöse im ersten Jahr." />
                <StatCard label="Autarkie" value={String(autarkie)} unit="%" help="Anteil deines Stromverbrauchs, den deine Anlage selbst deckt." />
              </>}>
              <p className="wp-result-summary">Deine PV-Anlage amortisiert sich {be ? <>in <strong>{be.i} Jahren</strong></> : <>nicht innerhalb von {YEARS} Jahren</>}. Über {YEARS} Jahre zahlst du insgesamt <strong>{Math.round(Math.abs(sel.data.total)).toLocaleString("de-DE")} € {sel.data.total >= 0 ? "weniger" : "mehr"}</strong> als nur mit Netzstrom. Anschaffung nach Förderung, Reststrom, Einspeiseerlöse und gegebenenfalls Speichertausch sind eingerechnet.</p>
              <p className="pv-result-reason">{kwp.toLocaleString("de-DE")} kWp {spKwh > 0 ? `mit ${spKwh.toLocaleString("de-DE")} kWh Speicher` : "ohne Speicher"}. {empfehlungKontext ? `Ausgangspunkt ist die Empfehlung für deinen Haushalt. Hier rechnest du mit der angezeigten Größe und deinen aktuellen Angaben.` : "Berechnet mit deinen Anlagenangaben."} <button type="button" className="wp-result-details-link" onClick={() => {setTechnicalOpen(true); requestAnimationFrame(() => document.getElementById("pv-details")?.scrollIntoView({behavior:"smooth"}));}}>Details</button></p>
            </ResultOverview>
            <ResultActions copied={copied} onCopy={handleCopy} onForward={handleNativeShare} onWhatsApp={handleWhatsApp} onReset={restart}
              onSave={authState.status === "anon" ? oeffneAnmeldung : handleSave} saveLabel={saved ? "Gespeichert" : saving ? "Speichert …" : "Speichern"} saveDisabled={authState.status === "loading" || saving || saved} />
            {authState.status === "authed" && savedCalcId && <p><Link href="/dashboard">Meine Berechnungen</Link></p>}
            {partner && <ErgebnisAnBetrieb partner={partner} ergebnisUrl={typeof window !== "undefined" ? buildShareUrl() : ""} plz={plz} />}
            <PvConsumerSection key={consumerRevision} id="pv-consumer" values={consumerValues} answered={gvAnswered}
              basis={{personen,baseKwh:grundverbrauch,kwp,storageKwh:spKwh,yieldPerKwp:effErtrag,monthly:monthlyProfile,
                electricityPrice:oStrom,cost:kosten,replacementCost:batteryReplaceCost(spKwh,prices),scenario:sel.id,
                feedInMode:einspeisungModus,feedInRate:oEinsp,feedInRates,regime,marketRevenue:marktErloes,
                marketValue:oMarktwert??MARKTWERT_NIVEAU_CT,coolingDegreeDays:cooling.cdhSet.avg5}}
              baselineBenefit={sel.data.total} manualSelfConsumption={oEv!==null} plz={plz}
              fuelType={fuelType} onFuelTypeChange={setFuelType} onPendingChange={setHasConsumerAddons}
              onApply={(draft,answered)=>{applyConsumers(draft);setGvAnswered(new Set(answered));revealUpdatedResult();}} />
            <section id="pv-details" className="pv-result-settings wp-input-page">
            <AccordionField completedStyle="check" label="Ertrag und technische Details" open={technicalOpen} answered summary={`${Math.round(jahresertrag).toLocaleString("de-DE")} kWh/Jahr`} onEdit={()=>setTechnicalOpen(!technicalOpen)}>
            {empfehlungKontext && (
              <details open style={{
                background: v('--color-bg'), borderRadius: v('--radius-md'), padding: "14px 16px", marginBottom: 16,
                border: `1px solid ${v('--color-border')}`,
              }}>
                <summary style={{ fontSize: v("--font-size-body"), fontWeight: 700, color: v('--color-text-primary'), cursor: "pointer", listStyle: "none", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span>Warum diese Anlage?</span>
                  <span style={{ fontSize: v("--font-size-caption"), color: v('--color-text-muted'), fontWeight: 400, display: "inline-flex", alignItems: "center", gap: 4 }}>Details <IconChevronDown size={iconSizes.xs} /></span>
                </summary>
                <div style={{ marginTop: 14, fontSize: v("--font-size-body"), color: v('--color-text-muted'), lineHeight: 1.7 }}>
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
                  <div style={{ fontSize: v("--font-size-small"), color: v('--color-text-secondary'), lineHeight: 1.6, borderTop: `1px solid ${v('--color-border')}`, paddingTop: 10 }}>
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

            <ResultStats
              effEv={effEinspeisungModus === "voll" ? 0 : effEv} autarkie={autarkie}
              jahresertrag={jahresertrag} gesamtVerbrauch={gesamtVerbrauch} speicherKwh={spKwh} monthly={pvSim.monthly} exampleDays={exampleDays}
            />

            {/* Monthly production chart or PLZ CTA */}
            {monthlyProfile && (
              <div style={{ background: v('--color-bg'), borderRadius: v('--radius-lg'), padding: "14px 14px 10px", marginBottom: 16, border: `1px solid ${v('--color-border')}` }}>
                <div style={{ fontSize: v("--font-size-small"), fontWeight: 700, color: v('--color-text-primary'), marginBottom: 10 }}>Monatsertrag</div>
                <CategoryBarChart label="Erwarteter Solarertrag je Monat" unit="kWh" rows={monthlyProfile.map((m,index)=>({id:String(index),label:["Jan","Feb","Mär","Apr","Mai","Jun","Jul","Aug","Sep","Okt","Nov","Dez"][index],value:Math.round(m * kwp * balkenFaktor)}))} />
                <div style={{ fontSize: v("--font-size-micro"), color: v('--color-text-faint'), textAlign: "center", marginTop: 6 }}>kWh/Monat · {plz && `PLZ ${plz}`}</div>
              </div>
            )}

            </AccordionField></section>
            <section id="pv-einstellungen" className="pv-result-settings wp-input-page">
              <h2>Einstellungen & Förderung</h2>
              <ResultSettings flow triggerId="pv-settings-trigger" title="Deine Anlage & Rechengrundlagen" summary={`${kwp.toLocaleString("de-DE")} kWp · ${spKwh.toLocaleString("de-DE")} kWh Speicher`}
                values={{kwp, spKwh, invest:bruttoKosten, strom:oStrom, verbrauch:grundverbrauch, ertrag:effErtrag, ev:effEv}}
                onApply={draft => {
                  const hardwareChanged = draft.kwp !== kwp || draft.spKwh !== spKwh;
                  if (draft.kwp !== kwp) {setCustomKwp(draft.kwp); setAnlage(4);}
                  if (draft.spKwh !== spKwh) setOSpKwh(draft.spKwh);
                  if (draft.invest !== bruttoKosten) setOKosten(draft.invest); else if (hardwareChanged) setOKosten(null);
                  if (draft.strom !== oStrom) {setOStrom(draft.strom); setOStromSynced(true);}
                  if (draft.verbrauch !== grundverbrauch) setOVerbrauch(draft.verbrauch);
                  if (draft.ertrag !== effErtrag) setErtragVonHand(draft.ertrag);
                  if (draft.ev !== effEv) setOEv(draft.ev); else if (hardwareChanged || draft.verbrauch !== grundverbrauch) setOEv(null);
                  revealUpdatedResult();
                }}>
                {(draft, update) => <PvPlantFields values={draft} update={update} ertragMin={ertragMin} ertragMax={ertragMax} showSelfConsumption={effEinspeisungModus !== "voll"} />}
              </ResultSettings>
              <ResultSettings flow triggerId="pv-prices-trigger" title="Preise und Preisentwicklung" summary={sel.label} values={{scenario}} onApply={draft => {setScenario(draft.scenario); revealUpdatedResult();}}>
                {(draft, update) => <ScenarioTabs tabs={scenarioData.map(s => ({id:s.id,label:s.label,explain:s.explain,sub:s.sub,source:s.source}))} selected={draft.scenario} onSelect={scenario => update({scenario})} />}
              </ResultSettings>
              <ResultSettings flow title="Dach und Ausrichtung" summary={dachZusammenfassung()} values={{dachartIdx,ausrichtung,neigungGrad}} onApply={draft => {setDachartIdx(draft.dachartIdx);setAusrichtung(draft.ausrichtung);setNeigungGrad(draft.neigungGrad);revealUpdatedResult();}}>
                {(draft,update) => <DachField completedStyle="check" karten dachartIdx={draft.dachartIdx} setDachartIdx={dachartIdx=>update({dachartIdx})} ausrichtung={draft.ausrichtung} setAusrichtung={ausrichtung=>update({ausrichtung})} neigungGrad={draft.neigungGrad} setNeigungGrad={neigungGrad=>update({neigungGrad})} beantwortet={gvAnswered} markiereBeantwortet={markGvAnswered} nimmZurueck={nimmGvZurueck} bearbeitet={gvEditing} setBearbeitet={setGvEditing} />}
              </ResultSettings>
              <ResultSettings flow title="Haushalt & Großverbraucher" summary={`${gesamtVerbrauch.toLocaleString("de-DE")} kWh/Jahr insgesamt`}
                values={consumerValues} canApply={draft=>consumersComplete(draft,gvAnswered)}
                onApply={draft=>{applyConsumers(draft);setConsumerRevision(revision=>revision+1);revealUpdatedResult();}}>
                {(draft,update)=><>
                  <PvConsumerFields values={draft} update={update} answered={gvAnswered} onAnswered={markGvAnswered}/>
                  {draft.klima!=="nein" && <PvCoolingEditor rooms={draft.klimaRooms} kwh={draft.klimaKwh} plz={plz} price={oStrom} onApply={klimaKwh=>update({klimaKwh})}/>}
                </>}
              </ResultSettings>
              <ResultSettings flow title="Einspeisung und Vergütung" summary={effEinspeisungModus==="aus"?"Ohne Vergütung":`${effEinsp.toLocaleString("de-DE")} ct/kWh · ${regime==="heute"?"heutige Konditionen":"Entwurf ab 2027"}`}
                values={{modus:effEinspeisungModus,einsp:oEinsp,regime,marktErloes,niveau:oMarktwert}}
                onApply={draft=>{setEinspeisungModus(draft.modus);setOEinsp(draft.einsp);setRegime(draft.regime);setMarktErloes(draft.marktErloes);setOMarktwert(draft.niveau);revealUpdatedResult();}}>
                {(draft,update) => {
                  const rate = draft.einsp ?? (draft.modus === "voll"
                    ? calcWeightedFeedIn(kwp, feedInRates.vollUnder10, feedInRates.vollOver10, feedInRates.thresholdKwp)
                    : calcWeightedFeedIn(kwp, feedInRates.teilUnder10, feedInRates.teilOver10, feedInRates.thresholdKwp));
                  const profile = draft.modus === effEinspeisungModus ? marktSim : calculateMarketProfile(draft.modus);
                  const preview = einspeiseVerlauf({regime:draft.regime,kwp,inbetriebnahmeJahr:Math.max(2027,YEAR),heuteSatzCt:draft.modus === "aus" ? 0 : rate,marktErloes:draft.marktErloes,profilFaktor:profile.profilFaktor,niveauCt:draft.niveau??MARKTWERT_NIVEAU_CT});
                  return <ResultVerguetung defaultOpen modus={draft.modus} setModus={modus=>update({modus})} vollDisabled={vollDisabled} effEinsp={rate} setOEinsp={einsp=>update({einsp})}
                    regime={draft.regime} setRegime={regime=>update({regime})} marktErloes={draft.marktErloes} setMarktErloes={marktErloes=>update({marktErloes})}
                    niveauCt={draft.niveau??MARKTWERT_NIVEAU_CT} setNiveauCt={niveau=>update({niveau})} profilFaktor={profile.profilFaktor} einspeiseAnteil={profile.einspeiseAnteil}
                    verlauf={preview} heuteSatzCt={rate} vollGewaehlt={draft.modus==="voll"} marktWirkungEuro={marketImpact({...draft,einsp:rate},profile)} eigenerSatz={draft.einsp!==null} setEigenerSatz={b=>update({einsp:b?rate:null})} setHeuteSatzCt={einsp=>update({einsp})} />;
                }}
              </ResultSettings>
              <AccordionField completedStyle="check" label="Standort & Förderung" open={locationOpen} answered={!!plzSource} summary={checkedPlace?`${checkedPlace.plz} ${checkedPlace.name}`:plz||"Noch offen"} onEdit={()=>setLocationOpen(!locationOpen)}>
                <p>Mit deinem Standort prüfen wir mögliche Zuschüsse und passen den Ertrag an.</p>
                <StandortField searchPlaces plz={pendingPlace?.plz??plz} onPlzChange={()=>{}} loading={foerderQuelle.laedt || plzLoading} confirmed={!!checkedPlace&&!locationDirty} checkedPlace={locationDirty?null:checkedPlace} onSubmit={()=>{}}
                  onSearchChange={()=>{setLocationDirty(true);setPendingPlace(null);setFundingError(null);}}
                  onPlaceSelect={async place=>{setFundingError(null);setAppliedPrograms(current=>current??fundingPrograms);const ok=await foerderQuelle.ausPlz(place.plz,place.ags);if(ok){setPendingPlace(place);setCheckedPlace(place);setLocationDirty(false);setFundingDraft(true);}else{setFundingError("Die Förderprüfung ist gerade nicht erreichbar. Bitte versuche es erneut; dein bisheriges Ergebnis bleibt erhalten.");throw new Error("Funding lookup unavailable");}}} />
                {fundingError ? <p role="alert">{fundingError}</p> : <ResultFunding design="result" title="Förderung" showAllProgramsLink={false} technik="pv" loading={foerderQuelle.laedt} candidates={foerderQuelle.kandidaten} chosenAgs={foerderQuelle.ags} onChooseAgs={foerderQuelle.waehleOrt} programs={foerderQuelle.programme} applied={previewFunding.applied} total={previewFunding.total} enabled={fundingDraft??fundingEnabled} onToggle={setFundingDraft} brutto={bruttoKosten} />}
                <FlowNav zurueckSichtbar={false} weiterLabel="Ergebnis neu berechnen" weiterAktiv={locationChanged&&!foerderQuelle.laedt&&!plzLoading&&!locationDirty} inaktivHinweis="Prüfe zuerst deinen Standort oder ändere eine Angabe." onWeiter={async()=>{
                  if (pendingPlace && !await fetchPvgis(pendingPlace.plz, false)) {
                    setFundingError("Der Standort-Ertrag konnte nicht geladen werden. Bitte versuche es erneut; dein bisheriges Ergebnis bleibt erhalten.");
                    return;
                  }
                  setAppliedPrograms(foerderQuelle.programme);
                  if(fundingDraft!==null)setFundingEnabled(fundingDraft);
                  if(pendingPlace){setAppliedAgs(pendingPlace.ags);setPlz(pendingPlace.plz);}
                  setPendingPlace(null);setFundingDraft(null);setFundingError(null);setPlzToast(false);revealUpdatedResult();
                }} />
              </AccordionField>
            </section>
            <Modal open={resultDetailsOpen} onClose={()=>setResultDetailsOpen(false)} title="So entsteht dein Ergebnis">
              <p>Wir vergleichen deinen Strombezug ohne Photovoltaik mit deiner Anlage über {YEARS} Jahre.</p>
              <p>Anschaffung vor Förderung: {Math.round(bruttoKosten).toLocaleString("de-DE")} €. Angerechnete Förderung: {Math.round(foerderung).toLocaleString("de-DE")} €. Dein Eigenanteil: {Math.round(kosten).toLocaleString("de-DE")} €.</p>
              <p>Stromersparnis, Einspeiseerlöse, Leistungsverlust und der angenommene Speichertausch kommen aus derselben Rechnung wie der Verlauf.</p>
              <Link href="/methodik">Methodik und Quellen</Link>
            </Modal>

            <footer className="pv-result-methodology">
              <h3>Rechengrundlagen & Quellen</h3>
              <p>Der Eigenverbrauch wird mit einem an HTW-Berlin-Daten kalibrierten Modell geschätzt; die Autarkie mit einem stündlichen Jahresverlauf. Angenommener Leistungsverlust: {(DEGRAD * 100).toLocaleString("de-DE")} % pro Jahr. {effEinspeisungModus === "aus" ? "Ohne Einspeisevergütung gerechnet." : regime === "reform2027" ? "Einspeisung nach dem Entwurf ab 2027." : "Einspeisevergütung für 20 Jahre berücksichtigt."}</p>
              <p><Link href="/datenstand">Datenstand und Quellen</Link> · <Link href="/methodik" onClick={()=>trackEvent("pv_methodik")}>So rechnen wir</Link></p>
              <p>Alle Angaben ohne Gewähr · Keine Steuer- oder Anlageberatung</p>
            </footer>
          </div>
        )}

        {/* Footer kommt aus dem (site)-Layout. Hier nur Abstand, damit die
            sticky Login-Leiste den Seitenfuß nicht verdeckt. */}
      </CalculatorContent>



      {/* Anmelden aus dem Ergebnis heraus — dieselbe Maske wie auf der
          Anmeldeseite, im Dialog statt als eigene Seite: Wer sein Ergebnis vor
          sich hat, soll es beim Anmelden nicht verlassen müssen. */}
      <Modal
        open={showLogin && authState.status === "anon"}
        onClose={() => {
          setShowLogin(false);
          // Ohne Anmeldung bleibt keine Vormerkung liegen. Sonst holt der
          // eigene Bereich sie beim nächsten Anmelden ab und speichert eine
          // Berechnung, die der Nutzer inzwischen verworfen hat.
          setSpeichernNachLogin(false);
          try {
            localStorage.removeItem("pendingSave");
          } catch {
            // ignorieren
          }
        }}
        title="Berechnung speichern"
        intro="Dafür brauchst du ein Konto. Danach findest du deine Berechnungen jederzeit in deinem Bereich wieder."
      >
        <AnmeldeFormular kompakt next="/dashboard" onErfolg={() => setShowLogin(false)} />
      </Modal>
    </div>
  );
}
