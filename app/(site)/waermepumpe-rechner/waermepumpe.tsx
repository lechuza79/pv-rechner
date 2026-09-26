"use client";
import "./result-design.css";
import "./input-design.css";
import { AccordionField } from "../../../components/AccordionField";
import { BEG_EINKOMMEN_OPTIONS, confirmedBegBonuses } from "../../../lib/beg-funding-options";
import { BegFundingQuestions, type BegFundingScreen } from "../../../components/BegFundingQuestions";
import FlowSchritte from "../../../components/FlowSchritte";
import { useState, useMemo, useEffect, useRef, type ReactNode } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import FlowNav from "../../../components/FlowNav";
import Toast from "../../../components/Toast";
import {
  SITUATION, WOHNFLAECHEN, WP_M2_MIN, WP_M2_MAX, INSULATION_BESTAND, INSULATION_NEUBAU,
  PERSONEN, HEIZSYSTEM, WP_TYPE, WP_FUEL_OPTIONS, HAUSTYP_WP, YEAR,
} from "../../../lib/constants";
import { waermeAusEndenergie, OEL_KWH_PRO_LITER } from "../../../lib/heat-consumption";
import { verbrauchSpecKwh } from "../../../lib/heatpump-core";
import {  calcHeatPump, calcHeatPumpScenarios, heatPumpScenarioAdj, estimatePvCoverageOfWp, calcBegSubsidy, type HeatPumpInputs, type HeatPumpResult } from "../../../lib/heatpump";
import {
  DEFAULT_HEATPUMP_CONFIG,
  begStufeAm,
  begNaechsteStufe,
  type BegStand,
} from "../../../lib/heatpump-config";
import PersonalHeatRace from "./_components/PersonalHeatRace";
import { useResultIntro } from "./_components/useResultIntro";
import BegStandSchalter, { BegStandHilfe } from "./_components/BegStandSchalter";
import { BEG_ANTRAG_KURZ, BEG_ANTRAG_HREF } from "../../../lib/beg-antrag";
import { greenGasApplies, fossilReplacementInvestment, kesselDerAblesung, referenzFuerEinheit } from "../../../lib/fossil-reference";
import { gasMixSeries, heatCostComparisonSeries } from "../../../lib/greengas";
import { bioTreppeStufenText, gmodgStandSatz, GMODG_RECHTSSTAND } from "../../../lib/greengas-config";
import OptionCard from "../../../components/OptionCard";
import ResultSection from "../../../components/ResultSection";
import GebaeudeField, { GEBAEUDE_FIELDS } from "../../../components/GebaeudeField";
import StandNoteView from "../../../components/StandNoteView";
import WpGeraeteEmpfehlung, { WpAuswahlHeading } from "../../../components/WpGeraeteEmpfehlung";
import { type StandSeite } from "../../../lib/stand-format";
import InlineEdit from "../../../components/InlineEdit";
import StandortField from "../../../components/StandortField";
import KfwFoerderpraxis from "../../../components/KfwFoerderpraxis";
import { useKfwKreis } from "../../../lib/use-kfw-kreis";
import { useSharedPlz } from "../../../lib/location";
import ResultFunding from "../../../components/ResultFunding";
import { stackFunding, programmeNebenBundesfoerderung, zeilenBisDeckel } from "../../../lib/funding-programs";
import { useFoerderung } from "../../../lib/use-foerderung";
import { type HeizungsfoerderungBund } from "../../../lib/kfw-format";
import {
  istGeteilterLink,
  wpAusParametern,
  wpZuParametern,
  type WpZustand,
} from "../../../lib/wp-share-state";
import GasPriceStackChart from "../../../components/charts/GasPriceStackChart";
import HeatCostCompareChart from "../../../components/charts/HeatCostCompareChart";
import Modal from "../../../components/Modal";
import WpPvFlow from "../../../components/WpPvFlow";
import { wpPvRecommendation } from "../../../lib/wp-pv-recommend";
import GlossaryTerm from "../../../components/GlossaryTerm";
import InfoTooltip from "../../../components/InfoTooltip";
import { IconAlert, IconSettings, IconRefresh, IconCheck, IconCopy, IconPlus, IconShare, IconWhatsApp } from "../../../components/Icons";
import { v, iconSizes, tokens } from "../../../lib/theme";
import { trackEvent } from "../../../lib/analytics";
import { trackFunnelStep, type Funnel } from "../../../lib/analytics";
import Switch from "../../../components/Switch";
import SelectField from "../../../components/SelectField";

/** Einheit, in der ein Nutzer seinen Jahresverbrauch von der Abrechnung abliest. */
type VerbrauchEinheit = "gas" | "oel";

const HOUSE_ILLUSTRATIONS: Record<string, string> = { frei: "house-large", doppel: "house-semi", reihenend: "house-row-end", reihenmitte: "house-row-middle" };

const STEPS = ["Situation", "Haus", "Dämmung", "Haushalt", "Heizung"];

// `embedded` = gerendert in einem Modal (z. B. aus dem Förder-Ratgeber), nicht
// als eigene Seite: dann ohne 100vh-Höhe, ohne Seitentitel und volle Breite —
// den Titel liefert der Modal-Header. Kein iframe, keine URL-/Storage-Kopplung.
// Eingebettet gibt es auch keine Stand-Zeile, deshalb reicht der Ratgeber kein
// `stand` durch; auf der eigenen Seite kommt es fertig aufgelöst von page.tsx.
export default function Waermepumpe({
  embedded = false,
  stand,
  kfw = null,
}: {
  embedded?: boolean;
  stand?: StandSeite;
  /**
   * Was aus der Bundesförderung im letzten Jahrgang wirklich geworden ist —
   * auf dem Server nachgeschlagen und hereingereicht, damit die Seite statisch
   * bleibt und die Tabellen hinter dem Dienstschlüssel bleiben. Fehlt sie
   * (kein Datenbankzugriff), entfällt der Abschnitt lautlos.
   */
  kfw?: HeizungsfoerderungBund | null;
} = {}) {
  // ── Step state ───────────────────────────────────────────────
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [heatingKnown, setHeatingKnown] = useState(false);
  const [heatingScreen, setHeatingScreen] = useState<BegFundingScreen>("heizung");
  const [fundingConfirmed, setFundingConfirmed] = useState(false);
  const [fundingAgeUnknown, setFundingAgeUnknown] = useState(false);
  const [fundingQuestion, setFundingQuestion] = useState<BegFundingScreen>("heizung");
  const [fundingTimingConfirmed, setFundingTimingConfirmed] = useState(false);
  const resumeFundingAge = useRef(false);
  const fundingCategory = useRef<"fossil" | "gas" | "other">("gas");
  const [fundingNotice, setFundingNotice] = useState(false);
  const [fundingPromptDismissed, setFundingPromptDismissed] = useState(false);
  const [fundingEditorVersion, setFundingEditorVersion] = useState(0);
  const [fundingCheckOpen, setFundingCheckOpen] = useState(false);
  const [fundingCheckStage, setFundingCheckStage] = useState<"timing" | "questions" | "review">("timing");
  const [fundingDraftQuestion, setFundingDraftQuestion] = useState<BegFundingScreen>("heizung");
  const [fundingDraft, setFundingDraft] = useState({ stand: "jetzt" as BegStand, eu: false, heating: "gas_neu" as AltheizungKey, ageUnknown: false, income: "none" as EinkommenKey, child: false });
  const fundingDraftCategory = useRef<"fossil" | "gas" | "other">("gas");

  const fundingEdited = useRef(false);
  const previousFunding = useRef<number | null>(null);
  const [fundingStep, setFundingStep] = useState<string | null>(null);
  const [inputEditing, setInputEditing] = useState<string | null>(null);
  const activeInput = inputEditing ?? (step === 1 ? "haustyp" : step === 4 ? "heizsystem" : "daemmung");
  const [inputExpanded, setInputExpanded] = useState<Set<string>>(new Set());
  const inputOpen = (key: string, _previous?: string) => activeInput === key || inputExpanded.has(key);
  const toggleInput = (key: string) => setInputExpanded(previous => {
    const next = new Set(previous);
    if (next.has(key)) next.delete(key); else next.add(key);
    return next;
  });
  // Welche Fragen wirklich beantwortet sind. Die Werte darunter behalten ihre
  // Startwerte (die Rechnung braucht sie), geben sich aber nicht mehr als
  // Auswahl aus — Flow-Konvention: keine Vorauswahl, Weiter erst nach echter
  // Wahl.
  const [beantwortet, setBeantwortet] = useState<Set<string>>(new Set());
  const markBeantwortet = (key: string) =>
    setBeantwortet(prev => (prev.has(key) ? prev : new Set(prev).add(key)));
  const [situation, setSituation] = useState<"bestand" | "neubau">("bestand");
  const [flaecheIdx, setFlaecheIdx] = useState(1);         // 140 m² default
  const [customFlaeche, setCustomFlaeche] = useState<number | null>(null);
  const [customFlaecheDraft, setCustomFlaecheDraft] = useState<string>("");
  const [haustypIdx, setHaustypIdx] = useState(0);         // freistehend default
  const [insulationIdx, setInsulationIdx] = useState(1);   // teilsaniert / KfW 55
  const [personen, setPersonen] = useState(2);             // 3–4
  const [heizsystem, setHeizsystem] = useState<"fbh" | "hk_neu" | "hk_alt">("fbh");
  // Welche Gebäudefrage im Ergebnis gerade aufgeklappt ist.
  const [gebaeudeEditing, setGebaeudeEditing] = useState<string | null>(null);
  const [wpType, setWpType] = useState<"lwwp" | "swwp">("lwwp");

  // PV-Integration (Ergebnis-Overlay)
  const [pvStatus, setPvStatus] = useState<"nein" | "geplant" | "vorhanden">("nein");
  const [pvKwp, setPvKwp] = useState<number>(10);
  const [pvSpeicher, setPvSpeicher] = useState<number>(10);
  const [pvSettingsOpen, setPvSettingsOpen] = useState(false);
  const [pvConfigured, setPvConfigured] = useState(false);
  const openPvSettings = () => setPvSettingsOpen(true);
  const togglePv = () => {
    if (pvStatus !== "nein") {
      setPvStatus("nein");
    } else if (pvConfigured) {
      setPvStatus("vorhanden");
    } else {
      const preset = wpPvRecommendation({ personen, haustyp: haustypIdx, wohnflaeche, annualKwh: result.eWp });
      setPvKwp(preset.kwp); setPvSpeicher(preset.speicherKwh);
      setPvStatus("vorhanden");
    }
  };


  // ── Result overrides (editable) ──────────────────────────────
  const [oGasPrice, setOGasPrice] = useState<number | null>(null);
  const [oStromPrice, setOStromPrice] = useState<number | null>(null);
  const [oFuel, setOFuel] = useState<string>("gas_neu");
  const [oJaz, setOJaz] = useState<number | null>(null);
  const [oQges, setOQges] = useState<number | null>(null);
  // Gemessener Jahresverbrauch statt Schätzung aus Fläche × Kennwert. Er schreibt
  // auf denselben Override wie das Eingabefeld im Ergebnis (oQges) — eine Größe,
  // ein Wert. `verbrauchKwh` hält die daraus abgeleitete Wärmemenge für die Anzeige.
  const [verbrauchDraft, setVerbrauchDraft] = useState<string>("");
  const [verbrauchEinheit, setVerbrauchEinheit] = useState<VerbrauchEinheit>("gas");
  const [verbrauchKwh, setVerbrauchKwh] = useState<number | null>(null);
  const [oHeizlast, setOHeizlast] = useState<number | null>(null);
  // Anschaffung der fossilen Alternative (0 = die vorhandene Heizung hält die 20 Jahre durch).
  const [oFossilInvest, setOFossilInvest] = useState<number | null>(null);
  // BEG Klima-Geschwindigkeits-Bonus: braucht BEIDES — Selbstnutzung und eine
  // passende alte Heizung. Früher war das ein einziger Schalter, was Vermietern
  // fälschlich den Bonus geben konnte und das Alterskriterium verdeckte.
  const [selbstnutzer, setSelbstnutzer] = useState(true);        // Eigennutzer? (Bedingung für Klima- UND Einkommens-Bonus)
  const [altheizung, setAltheizung] = useState<AltheizungKey>("gas_alt"); // welche Heizung wird ersetzt
  const [einkommen, setEinkommen] = useState<EinkommenKey>("none");   // BEG Einkommens-Bonus (gestaffelt nach Haushaltseinkommen)
  const [kindImHaushalt, setKindImHaushalt] = useState(false);        // Familienzuschlag hebt die Einkommensgrenze
  const [heizkoerperTausch, setHeizkoerperTausch] = useState(false);  // Maßnahme: alte HK auf Niedertemperatur tauschen
  // ── Förderstand: heute oder ab dem nächsten Stichtag ─────────
  // Voreinstellung „jetzt", weil das für jeden gilt, der in diesem Jahr
  // beantragt. Die beiden Stufen kommen aus dem Fahrplan der Richtlinie und
  // werden NICHT auf ein festes Jahr verdrahtet: Am 01.01.2027 wären „heute"
  // und „ab 2027" dieselbe Sache, und ein Rechner mit zwei gleichen Zuständen
  // sieht kaputt aus. `heute` einmal je Render — ein Datum mitten im Render
  // erzeugt sonst bei jedem Durchlauf ein neues Objekt und damit eine
  // Neuberechnung.
  const heute = useMemo(() => new Date(), []);
  const stufeJetzt = useMemo(() => begStufeAm(heute), [heute]);
  const stufeNaechste = useMemo(() => begNaechsteStufe(heute), [heute]);
  const [begStand, setBegStand] = useState<BegStand>("jetzt");
  // Ursprung des Geräts — Voreinstellung „nein", weil das die Richtung ist, in
  // der niemand enttäuscht wird. Gefragt wird trotzdem sichtbar: Der Bonus ist
  // betragsgleich mit der Halbierung, ihn stillschweigend wegzulassen behauptete
  // eine Kürzung, die es für ein EU-Gerät gar nicht gibt.
  const [euUrsprung, setEuUrsprung] = useState(false);
  const begStufe = begStand === "naechste" && stufeNaechste ? stufeNaechste : stufeJetzt;
  // ── Kommunale Förderung ──────────────────────────────────────
  // Der Wohnort wird bewusst NICHT im Frageweg erhoben: Er ändert nichts am
  // Gebäude und nichts an der Wärmepumpe, sondern nur daran, ob die Gemeinde
  // etwas dazugibt. Ein sechster Schritt für eine Frage, die bei den allermeisten
  // Orten „nein" ergibt, kostet mehr Abbrüche als er Nutzen bringt — deshalb
  // steht der Check im Ergebnis, wo er eine bereits gerechnete Zahl verbessert.
  const [plz, setPlz] = useState("");
  const foerderQuelle = useFoerderung("waermepumpe");
  const [checkedPlz, setCheckedPlz] = useState("");
  const lookupFunding = (value: string) => {
    setCheckedPlz(value);
    void foerderQuelle.ausPlz(value);
  };
  useSharedPlz(plz, remembered => {
    // An explicit shared-link location wins over this device's remembered location.
    const params = new URLSearchParams(window.location.search);
    if (istGeteilterLink(params) && wpAusParametern(params).plz) return;
    setPlz(remembered);
    lookupFunding(remembered);
  });
  const kfwKreis = useKfwKreis(foerderQuelle.ags);
  // Der Kreisbezug hängt am Ort, den der Fördercheck ohnehin schon aufgelöst
  // hat — keine zweite Ortsfrage, kein Abruf ohne Ort.
  const [fundingEnabled, setFundingEnabled] = useState(true);
  // Szenario-Auswahl (steuert TCO/Amortisation/Ersparnis/CO₂ + Chart):
  //  "gruengas"                       = beschlossenes Heizungsgesetz (GModG Bio-Treppe),
  //                                     Gesetz vom 23.07.2026, verkündet am 28.07.2026
  //                                     (BGBl. 2026 I Nr. 226), in Kraft seit 29.07.2026
  //                                     → Default, hervorgehoben. (Hier stand „beschlossen
  //                                     10.07.2026" — dieses Datum ließ sich an keiner
  //                                     amtlichen Quelle belegen, Council 28.07.2026.)
  //  "pessimistic"/"realistic"/"optimistic" = reine Preis-Annahmen OHNE Grüngas.
  const [scenario, setScenario] = useState("gruengas");

  // Welche Referenzheizungen zur Wahl stehen, hängt daran, ob eine Anschaffung
  // angesetzt ist — nicht am Energieträger:
  //  · Anschaffung > 0 → die fossile Alternative wird NEU eingebaut. Dann gehören nur
  //    Geräte in die Liste, die man heute neu einbaut; ein alter Kessel mit 80 %
  //    Nutzungsgrad wäre ein Widerspruch (Kosten des Neubaus, Verbrauch der Altanlage).
  //  · Anschaffung = 0 → die vorhandene Heizung läuft weiter. Dann ist genau der alte
  //    Kessel der richtige Vergleich, und die Neugeräte passen nicht.
  // Heizöl steht in BEIDEN Fällen zur Wahl, auch im Neubau: Die 65-%-Erneuerbaren-
  // Pflicht (§§ 71–73 GEG), auf die ein früherer Ausschluss gestützt war, ist mit dem
  // GModG gestrichen worden (Art. 1 Nr. 32); für zu errichtende Gebäude verweist § 10
  // Abs. 2 Nr. 3 n. F. auf die §§ 42–45, und § 42 Abs. 2 Nr. 1 nennt Gas, Heizöl und
  // Flüssiggas ausdrücklich als zulässige Option.
  const ersatzInvest = oFossilInvest ?? fossilReplacementInvestment(WP_FUEL_OPTIONS.find(f => f.id === oFuel)?.kind ?? "gas", DEFAULT_HEATPUMP_CONFIG);
  const fuelOptions = WP_FUEL_OPTIONS.filter(f => ersatzInvest > 0 ? !f.bestandsanlage : !!f.bestandsanlage).map(fuel => ({ ...fuel, displayLabel: `${fuel.bestandsanlage ? "vorhandene" : "neue"} ${fuel.kind === "oil" ? "Ölheizung" : fuel.bestandsanlage ? "Gasheizung" : "Gas-Brennwerttherme"}` }));
  // Der Energieträger überlebt den Wechsel zwischen Neueinbau und Bestand. Vorher
  // fiel die Auswahl auf den ersten Eintrag der Liste zurück — also auf Gas —,
  // sobald jemand mit Heizöl die Anschaffung auf 0 setzte. Damit wechselten still
  // Grundgebühr und CO₂-Faktor mit, ohne dass die Frage „Gas oder Öl?" je anders
  // beantwortet worden wäre (Council 18.08.2026).
  const gewaehlt = WP_FUEL_OPTIONS.find(f => f.id === oFuel);
  const fuel = fuelOptions.find(f => f.id === oFuel)
    ?? fuelOptions.find(f => f.kind === gewaehlt?.kind)
    ?? fuelOptions[0];
  // Die Grüngas-Pflicht ist ein GAS-Szenario: Der Preispfad hängt an der
  // Biomethan-Beimischung und an Gas-Netzentgelten (lib/greengas.ts). Bei Heizöl
  // gibt es beides nicht — das Szenario verschwindet dann aus der Auswahl, und ein
  // vorher gewähltes „Grüngas" fällt auf die mittlere Preisannahme zurück, statt
  // eine Zahl zu zeigen, für die uns die Grundlage fehlt.
  // Zweite Bedingung: Es muss überhaupt eine Heizung neu eingebaut werden. Setzt
  // jemand die Anschaffung auf 0 („meine Heizung hält die 20 Jahre durch"), gibt es
  // keinen Neueinbau — dann greift § 43 Abs. 1 für ihn nicht, und die Bio-Treppe zu
  // rechnen wäre wieder derselbe Fehler, nur nutzergesteuert. Im NEUBAU greift sie
  // dagegen sehr wohl: § 10 Abs. 2 Nr. 3 n. F. verweist auf die §§ 42–45 entsprechend.
  // Die Regel selbst steht in lib/fossil-reference.ts — sie entscheidet zugleich in der
  // Rechnung und im PV-Rechner. Hier nur abfragen, nicht ein zweites Mal formulieren.
  const referenceDevice = fuel.kind === "oil" ? "Ölheizung" : ersatzInvest > 0 ? "Gas-Brennwerttherme" : "Gasheizung";
  const gruengasVerfuegbar = greenGasApplies({ fuelKind: fuel.kind, fossilInvest: ersatzInvest });
  const effScenario = !gruengasVerfuegbar && scenario === "gruengas" ? "realistic" : scenario;
  const greenGas = effScenario === "gruengas";
  // "Mehr erfahren"-Modal: sammelt alle erklärenden Texte zum Grüngas-Szenario.
  const [showGasInfo, setShowGasInfo] = useState(false);
  // Secondary-Block "Angenommene Energiepreise" (die 3 Preis-Modelle) auf-/zugeklappt.
  // Hieß bis 10.09.2026 "Marktübliche Preissteigerung" — das behauptet einen
  // Marktdurchschnitt. Seit dem 06.09.2026 ist jeder der sechs Pfade ein
  // Studienwert aus zwei benannten Quellen; "marktüblich" wäre dafür das
  // falsche Wort und zugleich die schwächere Aussage.
  const [preisExpanded, setPreisExpanded] = useState(false);
  // Ziel des Verweises unter der großen Zahl — dort steht die Erklärung der
  // Preismodelle samt Umschalter.

  // ── Geteilter Link ───────────────────────────────────────────
  //
  // GELESEN WIRD IM BROWSER, nicht auf dem Server. Die Adresse in der
  // Seitenkomponente auszuwerten würde die Seite dynamisch machen — jeder
  // Besucher zahlte dann den vollen Aufbau, obwohl fast keiner über einen
  // geteilten Link kommt. Der Rechner läuft ohnehin im Browser; hier kostet es
  // nichts.
  //
  // NUR EINMAL, und das ist der Punkt: Ein Effekt, der die Adresse dauerhaft
  // beobachtet, würde die Eingaben des Nutzers bei jeder Adressänderung wieder
  // überschreiben. Deshalb ein Merker, der nach dem ersten Lauf zusperrt.
  const linkGelesen = useRef(false);
  useEffect(() => {
    if (linkGelesen.current) return;
    linkGelesen.current = true;
    // Direkt aus der Adresse des Fensters, NICHT über den Adress-Hook von Next:
    // Der ist auf einer vorgerenderten Seite beim ersten Durchlauf noch leer,
    // und dieser Effekt läuft genau einmal — er würde die Angaben des Links
    // dann für immer verpassen. Gemessen: Der Rechner blieb bei Frage eins
    // stehen, obwohl alle Werte in der Adresse standen. Im Browser ist
    // `location.search` immer vollständig.
    const p = new URLSearchParams(window.location.search);
    if (!istGeteilterLink(p)) return;
    const z = wpAusParametern(p);
    setSituation(z.situation);
    const preset = WOHNFLAECHEN.findIndex(f => f.m2 === z.wohnflaeche);
    if (preset >= 0) { setFlaecheIdx(preset); setCustomFlaeche(null); }
    else { setCustomFlaeche(z.wohnflaeche); setCustomFlaecheDraft(String(z.wohnflaeche)); }
    const ht = HAUSTYP_WP.findIndex(h => h.id === z.haustyp);
    if (ht >= 0) setHaustypIdx(ht);
    setInsulationIdx(z.daemmung);
    setPersonen(z.personen);
    setHeizsystem(z.heizsystem);
    setWpType(z.wpType);
    setOFuel(z.brennstoff);
    setHeizkoerperTausch(z.heizkoerperTausch);
    setScenario(z.szenario);
    setFundingConfirmed(z.fundingConfirmed ?? false);
    if (z.fundingConfirmed) setFundingQuestion("result");
    setFundingAgeUnknown(z.fundingAgeUnknown ?? false);
    setHeatingKnown(z.heatingKnown || z.fundingConfirmed || false);
    if (z.heatingKnown || z.fundingConfirmed) { setHeatingScreen("result"); setFundingQuestion(z.fundingConfirmed ? "result" : "einkommen"); }
    setSelbstnutzer(z.selbstnutzer);
    setAltheizung(z.altheizung);
    setEinkommen(z.einkommen);
    setKindImHaushalt(z.kindImHaushalt);
    setEuUrsprung(z.euUrsprung);
    setBegStand(z.begStand);
    setFundingEnabled(z.foerderungAn);
    setPvStatus(z.pvStatus);
    setPvConfigured(z.pvConfirmed);
    setPvKwp(z.pvKwp);
    setPvSpeicher(z.pvSpeicher);
    setOGasPrice(z.gaspreis);
    setOStromPrice(z.strompreis);
    setOJaz(z.jaz);
    setOQges(z.heizwaerme);
    setOHeizlast(z.heizlast);
    setOFossilInvest(z.fossilInvest);
    if (z.plz) { setPlz(z.plz); lookupFunding(z.plz); }
    // Ein geteilter Link ZEIGT ein Ergebnis — er stellt keine Fragen noch
    // einmal. Alle Antworten gelten damit als gegeben; ohne das stünde der
    // Empfänger vor einem Flow, dessen Weiter-Knopf gesperrt ist, obwohl alle
    // Werte gesetzt sind.
    setBeantwortet(new Set(["situation", "flaeche", "haustyp", "daemmung", "personen", "heizsystem", "wptyp"]));
    setStep(STEPS.length);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /** Der aktuelle Zustand als Datensatz — eine Quelle für Link und Prüfung. */
  const shareZustand = (): WpZustand => ({
    situation,
    wohnflaeche: customFlaeche ?? WOHNFLAECHEN[flaecheIdx].m2,
    haustyp: HAUSTYP_WP[haustypIdx]?.id ?? "frei",
    daemmung: insulationIdx,
    personen,
    heizsystem,
    wpType,
    brennstoff: oFuel,
    heizkoerperTausch,
    szenario: scenario,
    weg: "ist",
    fundingConfirmed,
    heatingKnown,
    fundingAgeUnknown,
    selbstnutzer,
    altheizung,
    einkommen,
    kindImHaushalt,
    euUrsprung,
    begStand,
    foerderungAn: fundingEnabled,
    plz,
    pvStatus,
    pvConfirmed: pvConfigured,
    pvKwp,
    pvSpeicher,
    gaspreis: oGasPrice,
    strompreis: oStromPrice,
    jaz: oJaz,
    investition: null,
    heizwaerme: oQges,
    heizlast: oHeizlast,
    fossilInvest: oFossilInvest,
  });

  // Die Adresse des RECHNERS, nicht die der Seite, auf der er gerade steht.
  //
  // Er wohnt auch in einem Fenster auf dem Förder-Ratgeber. Über den Pfad des
  // Fensters gebaut, zeigte der Link dorthin — der Empfänger landete auf einem
  // Artikel mit einer Query, die dort niemand liest, und sähe die geteilte
  // Rechnung nie. Genau dieser Fehler ist dem PV-Rechner schon einmal passiert.
  const buildShareUrl = () => {
    const p = wpZuParametern(shareZustand()).toString();
    return `${window.location.origin}/waermepumpe-rechner${p ? `?${p}` : ""}`;
  };

  /** Was in der Nachricht steht, bevor der Link kommt. */
  const shareText = () =>
    `Wärmepumpe statt ${fuel.refLabel}: ${sel.einsparungProJahr > 0 ? "spart" : "kostet"} ${Math.abs(sel.einsparungProJahr).toLocaleString("de-DE")} € im Jahr.`;

  const [settingsOpen, setSettingsOpen] = useState(false);
  const [pricesOpen, setPricesOpen] = useState(false);
  const [productHints, setProductHints] = useState<import("../../../lib/wp-hinweise").Hinweis[]>([]);
  const heatingAnswers: Partial<Record<BegFundingScreen, string>> = heatingKnown ? {
    heizung: altheizung === "oel_kohle" ? "Öl, Kohle, Gas-Etage oder Nachtspeicher" : altheizung === "andere" ? "Etwas anderes" : "Gas-Zentralheizung, Holz oder Pellets",
    ...((altheizung === "gas_alt" || altheizung === "gas_neu") ? { alter: fundingAgeUnknown ? "Weiß ich nicht" : altheizung === "gas_alt" ? "20 Jahre oder älter" : "Jünger als 20 Jahre" } : {}),
  } : {};

  const settingsValues = () => ({ haustypIdx, wohnflaeche, insulationIdx, heizsystem, wpType, oQges, oHeizlast, oJaz, oFossilInvest });
  const [settingsDraft, setSettingsDraft] = useState<ReturnType<typeof settingsValues> | null>(null);
  const settingsInitial = useRef<ReturnType<typeof settingsValues> | null>(null);
  const openSettings = () => { const values = settingsValues(); settingsInitial.current = values; setSettingsDraft(values); setSettingsOpen(true); };
  const updateSettings = (patch: Partial<ReturnType<typeof settingsValues>>) => setSettingsDraft(previous => previous ? { ...previous, ...patch } : previous);
  const settingsChanged = settingsDraft !== null && JSON.stringify(settingsDraft) !== JSON.stringify(settingsInitial.current);
  const priceValues = () => ({ oGasPrice, oStromPrice, scenario });
  const [priceDraft, setPriceDraft] = useState<ReturnType<typeof priceValues> | null>(null);
  const priceInitial = useRef<ReturnType<typeof priceValues> | null>(null);
  const openPrices = () => { const values = priceValues(); priceInitial.current = values; setPriceDraft(values); setPricesOpen(true); };
  const updatePrices = (patch: Partial<ReturnType<typeof priceValues>>) => setPriceDraft(previous => previous ? { ...previous, ...patch } : previous);
  const pricesChanged = priceDraft !== null && JSON.stringify(priceDraft) !== JSON.stringify(priceInitial.current);
  const [resultDetailsOpen, setResultDetailsOpen] = useState(false);
  const [saveOpen, setSaveOpen] = useState(false);
  const [resetOpen, setResetOpen] = useState(false);
  const [forwardOpen, setForwardOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const canShare = typeof navigator !== "undefined" && typeof navigator.share === "function";
  const shareBtnStyle = (aktiv?: boolean) => ({
    width: 40, height: 40, borderRadius: v('--radius-pill'), cursor: "pointer" as const,
    background: aktiv ? v('--color-accent-dim') : v('--color-bg'),
    border: `1px solid ${aktiv ? v('--color-accent') : v('--color-border-accent')}`,
    color: v('--color-accent'),
    display: "flex" as const, alignItems: "center" as const, justifyContent: "center" as const,
    flexShrink: 0 as const, transition: "all 0.2s",
  });
  const handleCopy = async () => {
    trackEvent("waermepumpe_geteilt");
    const url = buildShareUrl();
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch { prompt("Link kopieren:", url); }
  };
  const handleNativeShare = async () => {
    trackEvent("waermepumpe_geteilt");
    try { await navigator.share({ title: "Solar Check – Meine Wärmepumpen-Rechnung", text: shareText(), url: buildShareUrl() }); } catch {}
  };
  const resetCalculation = () => { window.location.assign(window.location.pathname); };
  const saveResult = () => {
    const content = ["Solar Check – Wärmepumpen-Rechnung", new Date().toLocaleDateString("de-DE"), "", shareText(), `Eigenanteil nach Förderung: ${result.investNetto.toLocaleString("de-DE")} €`, `Bundesförderung: ${result.beg.amount.toLocaleString("de-DE")} €`, "", "Berechnung mit allen Angaben wieder öffnen:", buildShareUrl(), "", "Modellrechnung. Preise und Förderbedingungen können sich ändern."].join("\n");
    const url = URL.createObjectURL(new Blob([content], { type: "text/plain;charset=utf-8" }));
    const link = document.createElement("a");
    link.href = url; link.download = "solar-check-waermepumpe.txt";
    document.body.appendChild(link); link.click(); link.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
    setSaveOpen(false);
  };
  const handleWhatsApp = () => {
    trackEvent("waermepumpe_geteilt");
    window.open(`https://wa.me/?text=${encodeURIComponent(`${shareText()}\n${buildShareUrl()}`)}`, "_blank");
  };

  const isResult = step >= STEPS.length;
  const [resultRevision, setResultRevision] = useState(0);
  const resultIntro = useResultIntro(isResult, resultRevision);
  const overviewRef = useRef<HTMLDivElement>(null);
  const actionbarRef = useRef<HTMLDivElement>(null);
  const [actionsStuck, setActionsStuck] = useState(false);
  useEffect(() => {
    if (!isResult) return;
    const update = () => {
      const bar = actionbarRef.current;
      if (bar) setActionsStuck(bar.getBoundingClientRect().top <= parseFloat(getComputedStyle(bar).top) + 1);
    };
    update();
    window.addEventListener("scroll", update, { passive: true });
    window.addEventListener("resize", update);
    return () => { window.removeEventListener("scroll", update); window.removeEventListener("resize", update); };
  }, [isResult]);
  const fundingNoticeRef = useRef<HTMLElement>(null);
  const [fundingNoticeRevealed, setFundingNoticeRevealed] = useState(false);
  useEffect(() => {
    const notice = fundingNoticeRef.current;
    if (!isResult || !notice) return;
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) {
        setFundingNoticeRevealed(true);
        observer.disconnect();
      }
    }, { threshold: 0.5 });
    observer.observe(notice);
    return () => observer.disconnect();
  }, [isResult, situation]);

  // Ereignis je erreichtem Schritt, Reihenfolge wie STEPS, danach das Ergebnis.
  // Bis 29.08.2026 meldete dieser Rechner NUR das Ergebnis — wo jemand abbricht,
  // war unsichtbar. Länge und Reihenfolge sind festgenagelt (siehe `lib/analytics.ts`).
  const FUNNEL: Funnel = [
    null,
    "waermepumpe_schritt_groesse",
    "waermepumpe_schritt_daemmung",
    "waermepumpe_schritt_haushalt",
    "waermepumpe_schritt_heizsystem",
    "waermepumpe_ergebnis",
  ];
  const next = () => {
    if (step >= STEPS.length) return;
    const target = step + 1;
    trackFunnelStep(FUNNEL, target);
    setStep(target);
  };
  const back = () => step > 0 && setStep(step - 1);

  // Was jeder Schritt braucht — an einer Stelle, damit Freigabe und Hinweis
  // nicht auseinanderlaufen. Reihenfolge wie STEPS.
  const stepAnforderung: { erfuellt: boolean; hinweis: string }[] = [
    { erfuellt: beantwortet.has("situation"), hinweis: "Bitte erst Neubau oder Bestand wählen." },
    {
      erfuellt: beantwortet.has("flaeche") && beantwortet.has("haustyp"),
      hinweis: beantwortet.has("flaeche")
        ? "Bitte noch den Haustyp wählen."
        : "Bitte Wohnfläche und Haustyp angeben.",
    },
    { erfuellt: beantwortet.has("daemmung"), hinweis: "Bitte erst den Dämmstandard wählen." },
    { erfuellt: beantwortet.has("personen"), hinweis: "Bitte erst die Haushaltsgröße wählen." },
    {
      erfuellt: beantwortet.has("heizsystem") && beantwortet.has("wptyp") && (situation === "neubau" || heatingKnown),
      hinweis: situation === "bestand" && !heatingKnown ? "Bitte die vorhandene Heizung angeben." : beantwortet.has("heizsystem")
        ? "Bitte noch den Wärmepumpen-Typ wählen."
        : "Bitte bestehendes Heizsystem und Wärmepumpen-Typ wählen.",
    },
  ];
  const stepBeantwortet = stepAnforderung[step]?.erfuellt ?? true;
  const stepHinweis = stepAnforderung[step]?.hinweis ?? "";

  // ── Resolved wohnfläche ──────────────────────────────────────
  const wohnflaeche = customFlaeche ?? WOHNFLAECHEN[flaecheIdx].m2;

  // Abgelesener Brennstoffverbrauch → Heizwärme. Was der Zähler zählt, ist
  // Endenergie; was das Gebäude braucht, ist das abzüglich der Kesselverluste
  // (lib/heat-consumption.ts). Heizöl kommt in Litern von der Rechnung.
  const applyVerbrauch = (raw: string, einheit: VerbrauchEinheit, referenz: typeof WP_FUEL_OPTIONS[number] = fuel) => {
    const n = parseInt(raw);
    if (raw === "" || isNaN(n) || n <= 0) { setVerbrauchKwh(null); setOQges(null); return; }
    const endenergie = einheit === "oel" ? n * OEL_KWH_PRO_LITER : n;
    // Unplausibles gar nicht erst übernehmen (Tippfehler, Monats- statt Jahreswert).
    if (endenergie < 2000 || endenergie > 120000) { setVerbrauchKwh(null); setOQges(null); return; }
    const waerme = Math.round(waermeAusEndenergie(endenergie, kesselDerAblesung(einheit, referenz)));
    setVerbrauchKwh(waerme);
    setOQges(waerme);
  };

  // ── Rechen-Config ────────────────────────────────────────────
  // Der geprüfte Config-Snapshot (lib/heatpump-config.ts). Die Investition kommt
  // bewusst NICHT aus einer gescrapten Portal-Kostenseite, sondern ist an echten
  // Angeboten kalibriert (Verbraucherzentrale RLP) und wird vom jährlichen
  // WP-Wächter gepflegt — siehe scripts/waermepumpe-verify.md.
  const cfg = DEFAULT_HEATPUMP_CONFIG;

  // ── Build inputs + calculate ─────────────────────────────────
  const inputsOhneFoerderung: HeatPumpInputs = useMemo(() => ({
    situation, wohnflaeche, insulationIdx,
    personen: PERSONEN[personen].count,
    heizsystem, wpType, heizkoerperTausch,
    haustypFaktor: HAUSTYP_WP[haustypIdx].faktor,
    fuelKind: fuel.kind,
    greenGas,
    pv: pvStatus !== "nein" ? { status: pvStatus, kwp: pvKwp, speicherKwh: pvSpeicher } : undefined,
    begStufe: begStufe,
    override: {
      qGes: oQges ?? undefined,
      heizlast: oHeizlast ?? undefined,
      jaz: oJaz ?? undefined,
      stromPrice: oStromPrice ?? undefined,
      gasPrice: oGasPrice ?? fuel.price,
      gasEfficiency: fuel.efficiency,
      gasCo2: fuel.co2PerKwh,
      fossilErsatzInvest: oFossilInvest ?? undefined,
      // Beide Boni setzen Selbstnutzung voraus (KfW 458) — als Vermieter bleibt
      // nur die Grundförderung, deshalb hier weder Klima noch Einkommen.
      ...confirmedBegBonuses(fundingConfirmed, selbstnutzer, altheizungKlima(altheizung), fundingAgeUnknown, einkommenIncome(einkommen), kindImHaushalt),
      // Nicht an die Selbstnutzung gebunden — anders als Klima- und
      // Einkommens-Bonus verlangt der Wertschöpfungs-Bonus sie nicht.
      euUrsprung,
    },
  }), [situation, wohnflaeche, insulationIdx, personen, heizsystem, wpType, heizkoerperTausch, haustypIdx, greenGas, pvStatus, pvKwp, pvSpeicher, oQges, oHeizlast, oJaz, oStromPrice, oGasPrice, oFossilInvest, fuel, fundingConfirmed, fundingAgeUnknown, selbstnutzer, altheizung, einkommen, kindImHaushalt, begStufe, euUrsprung]);

  // ── Kommunaler Zuschuss ──────────────────────────────────────
  // Henne und Ei: Der Zuschuss kann von der Investition abhängen (Prozentsätze),
  // die Investition hängt am Zuschuss. Deshalb erst OHNE Förderung rechnen, um
  // die Investition zu bekommen, und den Zuschuss dann in den echten Lauf geben.
  // Der Vorlauf ist eine reine Funktion ohne Zustand — nachrechnen ist billiger
  // und ehrlicher, als die Investitionsformel hier ein zweites Mal aufzuschreiben.
  //
  // BEZUGSGRÖSSE IST DER BASIS-WEG, nicht der gewählte Sanierungs-Weg. Für einen
  // pauschalen Zuschuss (der einzige rechenbare Fall im Katalog) ist das
  // gleichgültig. Käme je ein PROZENTUALER kommunaler WP-Zuschuss dazu, würde er
  // auf der Investition des Basis-Wegs gerechnet, während daneben die des
  // gewählten Wegs steht — abgezogen wird zwar genau der angezeigte Betrag, die
  // Bemessungsgrundlage wäre aber die falsche. Ein Test in
  // lib/__tests__/waermepumpe-kommunalfoerderung.test.ts schlägt an, sobald ein
  // solches Programm auftaucht; dann gehört hier der Patch des aktiven Wegs
  // hinein (`wege` hängt nicht an `inputs`, ist also zirkelfrei erreichbar).
  const foerderBasis = useMemo(() => calcHeatPump(inputsOhneFoerderung, cfg), [inputsOhneFoerderung, cfg]);
  // Programme, die eine Bundesförderung ausschließen, fallen hier raus — die BEG
  // ist oben schon abgezogen, sie stünden also auf einem Stapel, den ihre eigene
  // Richtlinie verbietet.
  const kommunaleProgramme = useMemo(
    () => programmeNebenBundesfoerderung(foerderQuelle.programme),
    [foerderQuelle.programme],
  );
  const foerderStack = useMemo(
    () => stackFunding(kommunaleProgramme, { technik: "waermepumpe", kosten: foerderBasis.investBrutto }),
    [kommunaleProgramme, foerderBasis.investBrutto],
  );
  // Drei Gründe, warum nicht gerechnet wird — jeder trägt unten seinen eigenen Satz:
  // abgeschaltet, von Hand gesetzte Investition (da steckt die Förderung schon
  // drin), oder Neubau. Neubau: Der einzige rechenbare kommunale Zuschuss im
  // Katalog (Poing) setzt den AUSTAUSCH einer mindestens zwei Jahre alten Heizung
  // voraus, und die BEG gibt es im Neubau ohnehin nicht. Sobald ein Programm
  // auftaucht, das den Neubau fördert, gehört diese Bedingung ins Programm statt
  // hierher — der Katalog kennt dafür heute kein Feld.
  const foerderAktiv = fundingEnabled && situation === "bestand";
  const inputs: HeatPumpInputs = useMemo(
    () => ({ ...inputsOhneFoerderung, kommunalFoerderung: foerderAktiv ? foerderStack.total : 0 }),
    [inputsOhneFoerderung, foerderAktiv, foerderStack.total],
  );

  // ── Realistische Wege (Szenario-Vergleich) ───────────────────
  // Ein unsaniertes Haus bleibt selten 20 Jahre unangetastet. Statt nur den
  // Ist-Zustand zu zeigen, rechnen wir die realistischen Sanierungs-/Heizungs-
  // wege durch. Jeder Weg ist ein Patch auf die Gebäude-/Heizungs-Eingaben.
  // Sanierungskosten (Dämmung) werden NICHT der WP zugerechnet — sie zahlen aufs
  // Gebäude ein (Komfort, Werterhalt, Heizkosten unabhängig vom System). Der
  // Heizkörpertausch bleibt drin, den macht man nur für die Wärmepumpe.
  const activeInputs = inputs;
  // MIT dem gewählten Szenario rechnen — sonst zeigen die editierbaren Kernannahmen
  // (Arbeitszahl, Brennstoffpreis) und die Aufschlüsselung „Rechnung im Detail" einen
  // anderen Fall als die große Zahl darüber. Bis 28.07.2026 lief `result` ohne
  // Szenario-Justierung: Bei „Pessimistisch" belegte die Aufschlüsselung eine
  // Einsparung von +23.917 €, während im Hero −5.268 € stand (Council-Prüfung).
  // Beim Grüngas-Fall bleibt die Aufschlüsselung am Preis-Pfad „realistisch" —
  // das ist derselbe Nebenannahmen-Satz, mit dem `gruengasResult` rechnet.
  const result = useMemo(
    () => calcHeatPump(activeInputs, cfg, heatPumpScenarioAdj(greenGas ? "realistic" : effScenario, cfg)),
    [activeInputs, cfg, effScenario, greenGas],
  );

  useEffect(() => {
    if (fundingEdited.current && previousFunding.current !== null && previousFunding.current !== result.investNetto) setFundingNotice(true);
    previousFunding.current = result.investNetto;
  }, [result.investNetto]);
  const showUpdatedResult = () => {
    setResultRevision(revision => revision + 1);
    setFundingNotice(false);
    document.getElementById("wp-ueberblick")?.scrollIntoView({ behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth", block: "start" });
  };

  const openFundingCheck = () => {
    setFundingDraft({ stand: begStand, eu: euUrsprung, heating: altheizung, ageUnknown: fundingAgeUnknown, income: einkommen, child: kindImHaushalt });
    fundingDraftCategory.current = "gas";
    setFundingDraftQuestion(heatingKnown ? "einkommen" : "heizung");
    setFundingCheckStage("timing");
    setFundingPromptDismissed(true);
    setFundingCheckOpen(true);
  };
  const applyFundingCheck = () => {
    fundingEdited.current = false;
    setBegStand(fundingDraft.stand); setEuUrsprung(fundingDraft.eu);
    setAltheizung(fundingDraft.heating); setFundingAgeUnknown(fundingDraft.ageUnknown);
    setEinkommen(fundingDraft.income); setKindImHaushalt(fundingDraft.child);
    setHeatingKnown(true); setFundingConfirmed(true); setFundingEditorVersion(version => version + 1); setFundingTimingConfirmed(true); setFundingQuestion("result");
     setFundingStep(null); setFundingCheckOpen(false);
    showUpdatedResult();
  };
  const fundingDraftStage = fundingDraft.stand === "naechste" && stufeNaechste ? stufeNaechste : stufeJetzt;
  const draftFundingFor = (stufe: typeof stufeJetzt, euUrsprung: boolean) => calcBegSubsidy(situation, wpType, result.investBrutto, {
    ...confirmedBegBonuses(true, selbstnutzer, altheizungKlima(fundingDraft.heating), fundingDraft.ageUnknown, einkommenIncome(fundingDraft.income), fundingDraft.child),
    stufe, euUrsprung,
  }, cfg);
  const fundingDraftResult = draftFundingFor(fundingDraftStage, fundingDraft.eu);

  // Was der Wechsel des Förderstands in EURO ausmacht — beide Stände auf
  // derselben Investition gerechnet.
  //
  // WARUM NICHT EINFACH DIE PROZENTPUNKTE: Weil der Fördersatz bei 70 % bzw.
  // 80 % gekappt ist und deshalb nicht jeder die vollen 15 Punkte verliert. Ein
  // selbstnutzender Haushalt mit niedrigem Einkommen und altem Gaskessel kommt
  // heute auf 30 + 16 + 40 = 86 Punkte und wird auf 80 gekappt; nach der
  // Halbierung sind es 71, also ungekappt. Ihn kostet die Halbierung 9 Punkte,
  // nicht 15 — „der Zuschuss halbiert sich" wäre für ihn schlicht falsch. Wer
  // dagegen keinen Einkommens-Bonus bekommt (der Regelfall), verliert die
  // vollen 15. Nur der Euro-Betrag stimmt für beide.
  const begVergleich = useMemo(() => {
    const opts = {
      ...confirmedBegBonuses(fundingConfirmed, selbstnutzer, altheizungKlima(altheizung), fundingAgeUnknown, einkommenIncome(einkommen), kindImHaushalt),
    };
    const fuer = (stufe: typeof stufeJetzt, eu: boolean) =>
      calcBegSubsidy(situation, wpType, result.investBrutto, { ...opts, stufe, euUrsprung: eu }, cfg).amount;
    return {
      // Heute gibt es den EU-Bonus noch nicht — der Schalter wäre hier wirkungslos.
      jetzt: fuer(stufeJetzt, false),
      naechsteOhneEu: stufeNaechste ? fuer(stufeNaechste, false) : 0,
      naechsteMitEu: stufeNaechste ? fuer(stufeNaechste, true) : 0,
    };
  }, [situation, wpType, result.investBrutto, cfg, fundingConfirmed, fundingAgeUnknown, selbstnutzer, altheizung, einkommen, kindImHaushalt, stufeJetzt, stufeNaechste]);

  // Der Betrag, der neben der BEG noch Platz hat — die Anspruchshöhe, nicht die
  // Anzeige-Entscheidung. `kappung` hängt deshalb bewusst NICHT an `foerderAktiv`:
  // Der Schalter „Förderung anrechnen" wird nur neben einer Förderzeile gerendert,
  // und ohne Zeilen verschwände beim Ausschalten der Schalter gleich mit — aus
  // „anrechnen" würde ein Einwegschalter. Solange gerechnet wird, ist `kappung`
  // identisch mit `result.kommunal.angerechnet`.
  const kappung = Math.min(foerderStack.total, result.kommunal.spielraum);
  // Die Zeilen müssen sich zu genau dieser Summe addieren, deshalb werden sie der
  // Reihe nach aufgefüllt, bis der Spielraum aufgebraucht ist. Eine Förderzeile
  // anzuzeigen, die nicht in der Investition steckt, wäre der Widerspruch zwischen
  // Text und Zahl, den dieses Projekt als schwersten Fehler führt.
  const foerderZeilen = useMemo(
    () => zeilenBisDeckel(foerderStack.applied, kappung),
    [foerderStack.applied, kappung],
  );

  const foerderHinweis = useMemo(() => {
    if (!fundingEnabled || foerderStack.total === 0) return undefined;
    if (kappung >= foerderStack.total) return undefined;
    const grenze = Math.round(DEFAULT_HEATPUMP_CONFIG.begKumulierungsGrenze * 100);
    return result.kommunal.spielraum === 0
      ? `Bundesförderung und kommunaler Zuschuss zusammen dürfen ${grenze} % der geförderten Kosten nicht übersteigen. Deine BEG-Förderung schöpft das bereits aus, deshalb ist der kommunale Zuschuss hier nicht eingerechnet — beantragen kannst du ihn trotzdem, entschieden wird es im Bescheid.`
      : `Bundesförderung und kommunaler Zuschuss zusammen dürfen ${grenze} % der geförderten Kosten nicht übersteigen. Neben deiner BEG-Förderung bleiben davon ${result.kommunal.spielraum.toLocaleString("de-DE")} € — mehr wird nicht angerechnet.`;
  }, [fundingEnabled, foerderStack.total, kappung, result.kommunal.spielraum]);
  // Die drei Preis-Szenarien rechnen bewusst OHNE Grüngas-Pflicht — sie zeigen die
  // reine Energiepreis-Bandbreite ("was, wenn die Pflicht doch nicht greift").
  const scenariosPlain = useMemo(() => calcHeatPumpScenarios({ ...activeInputs, greenGas: false }, cfg), [activeInputs, cfg]);
  // Gesetzes-Fall: Grüngas-Pflicht (Bio-Treppe) mit realistischen Nebenannahmen
  // (Strompreis/Arbeitszahl wie "realistisch", Gaspreis-Mittelpfad). Reale Rechtslage.
  /**
   * Die drei Preispfade MIT Grüngas-Pflicht.
   *
   * Bis 05.09.2026 gab es die Grüngas-Rechnung nur als EINEN Wert (mittlerer
   * Preispfad). Die Bandbreite unter der großen Zahl griff deshalb auf die
   * Pfade OHNE Pflicht zurück — und mischte damit zwei völlig verschiedene
   * Fragen: „wie stark steigen die Preise?" (offen) und „kommt das Gesetz?"
   * (beschlossen). Was dabei herauskam, hat der Betreiber beanstandet:
   * „−18.010 € bis +39.029 €" unter einem Ergebnis von +25.165 € — die Spanne
   * wechselte das Vorzeichen, und die Zahl darüber war damit wertlos.
   *
   * Das Minimum stammte aus dem Fall „Gesetz kommt nicht UND Strom wird teuer
   * UND Gas bleibt billig". Ein beschlossenes Gesetz als Münzwurf neben zwei
   * Preisannahmen zu stellen, ist keine Vorsicht, sondern eine falsche
   * Gewichtung.
   */
  const scenariosGruengas = useMemo(
    () => calcHeatPumpScenarios({ ...activeInputs, greenGas: true }, cfg),
    [activeInputs, cfg],
  );
  // Der mittlere Pfad davon IST die bisherige Grüngas-Rechnung — dieselben
  // Eingaben, dieselbe Anpassung. Aus dem Satz gezogen statt ein zweites Mal
  // gerechnet: zwei Aufrufe derselben Größe laufen sonst beim nächsten Umbau
  // auseinander.
  const gruengasResult = useMemo(
    () => scenariosGruengas.find(s => s.id === "realistic")!,
    [scenariosGruengas],
  );

  // Meta des Gesetzes-Falls (Label + Farbe für Auswahl, Chart und Hero). KEIN
  // `explain` — die Erklärung zum Grüngas-Fall steht vollständig im Modal
  // („Mehr erfahren"), und ein zweiter Text daneben wäre eine Kopie, die
  // auseinanderläuft. Der eingeklappte Preis-Block erklärt sein eigenes Modell
  // aus `selPrice.explain`.
  const GRUENGAS_META = {
    id: "gruengas", label: "Neues Heizungsgesetz", color: v('--color-positive'),
    sub: "Grüngas-Pflicht ab 2029",
  };

  // Gewählter Fall: treibt die Ergebnis-Zahlen (TCO/Amortisation/Ersparnis/CO₂).
  const selPrice = scenariosPlain.find(s => s.id === effScenario) ?? scenariosPlain.find(s => s.id === "realistic")!;
  const sel = greenGas ? { ...GRUENGAS_META, ...gruengasResult } : selPrice;

  // Was die Wärmepumpe gegenüber der fossilen Alternative WIRKLICH mehr kostet.
  // Genau diese Größe amortisiert sich — nicht die Investition. Kann null oder
  // negativ werden, wenn die Förderung die Anlage unter den Preis einer neuen
  // fossilen Heizung drückt; dann ist „Amortisation" als Wort sinnlos.
  const mehrkosten = sel.investNetto - sel.gasInvest;

  // Bandbreite über ALLE gerechneten Annahmen (die drei Preispfade und, wo sie gilt,
  // die Grüngas-Pflicht). Sie steht im Hero unter der großen Zahl — die Antwort auf
  // „woher kennt ihr die Gas- und Ölpreise der Zukunft?" ist: gar nicht, hier ist die
  // Spanne. Der aktive Fall liegt immer innerhalb dieser Spanne.
  // Die Bandbreite über alle Preispfade stand bis 05.09.2026 unter der großen
  // Zahl und ist mit ihr entfallen — siehe den Kommentar an der Anzeigestelle.
  // Was sie leisten sollte (keine Prognose behaupten), leistet jetzt der
  // Verweis auf das gerechnete Modell.

  // Mehr-Ersparnis durch die Grüngas-Pflicht gegenüber reiner Preisfortschreibung.
  const realisticPlain = scenariosPlain.find(s => s.id === "realistic")!;
  const greenGasDelta = Math.abs(gruengasResult.tcoEinsparung - realisticPlain.tcoEinsparung);
  // PV-Deckung für die WP+PV-Linie: echter Wert, wenn eine PV im Rechner aktiv ist;
  // sonst die Deckung einer typischen Ergänzungs-PV (10 kWp + 5 kWh), transparent
  // ausgewiesen. Basis: dieselbe HTW-Heuristik wie im WP-Rechner (geteilt).
  const pvCoverageForChart = result.pvCoverage > 0
    ? result.pvCoverage
    : estimatePvCoverageOfWp(10, result.eWp, 5);
  // Charts zeigen den Gesetzes-Fall (Bio-Treppe, Mittelpfad "base").
  const gasStackData = useMemo(() => gasMixSeries(DEFAULT_HEATPUMP_CONFIG.years, "base", YEAR), []);
  const heatCostData = useMemo(
    () => heatCostComparisonSeries({
      years: DEFAULT_HEATPUMP_CONFIG.years,
      startYear: YEAR,
      scenario: "base",
      gasEfficiency: fuel.efficiency,
      jaz: gruengasResult.jaz,
      wpTarifEurKwh: oStromPrice ?? DEFAULT_HEATPUMP_CONFIG.wpTarif,
      stromInflation: heatPumpScenarioAdj("realistic", cfg).stromInflation,
      pvCoverage: pvCoverageForChart,
    }),
    [fuel.efficiency, gruengasResult.jaz, oStromPrice, cfg, pvCoverageForChart]
  );

  const insulationOptions = situation === "bestand" ? INSULATION_BESTAND : INSULATION_NEUBAU;
  // ── Render ───────────────────────────────────────────────────
  return (
    <div className={isResult ? "wp-calculator-page wp-result-page" : "wp-calculator-page wp-input-page"} style={{ ...({ "--wp-chevron-size": `${iconSizes.sm}px`, "--wp-positive": tokens["--color-positive"] } as React.CSSProperties), background: v('--color-bg'), fontFamily: v('--font-text'), color: v('--color-text-primary'), minHeight: embedded ? undefined : "100vh", padding: embedded ? 0 : "0 16px 20px" }}>
      <style>{`:root:has(.wp-calculator-page){${Object.entries(tokens).filter(([key]) => key.startsWith("--color-") || key.startsWith("--shadow-")).map(([key,value]) => `${key}:${value}!important`).join(";")}}`}</style>
      <div style={{ maxWidth: embedded ? "100%" : isResult ? 1240 : v('--page-max-width'), margin: "0 auto" }}>
        {!embedded && (
          <div className={isResult ? "wp-result-heading" : undefined} style={{ textAlign: "center", marginBottom: 24 }}>

            <h1 className={isResult ? "wp-visually-hidden" : undefined} style={{ fontSize: v("--font-size-h2"), fontWeight: 800, letterSpacing: "-0.02em", lineHeight: 1.2 }}>
              {isResult ? "Dein Heizkostenvergleich." : "Lohnt sich eine Wärmepumpe?"}
            </h1>
            {isResult && <><nav className="wp-section-nav" aria-label="Dein Ergebnis"><a href="#wp-ueberblick" aria-current="location">Überblick</a><a href="#wp-geraete">Passende Geräte</a><button type="button" onClick={() => openSettings()}>Einstellungen</button></nav></>}
            {!isResult && (
              <p style={{ fontSize: v("--font-size-small"), color: v('--color-text-muted'), marginTop: 6 }}>
                Fünf Schritte, ehrlich berechnet. Keine Anmeldung.
              </p>
            )}
          </div>
        )}

        {!isResult && <FlowSchritte schritte={STEPS} aktiv={step} onSprung={i => { setInputEditing(null); setStep(i); }} />}

        {/* ── STEPS ── */}
        {!isResult && (
          <>
          <div className="fu wp-input-step" key={step}>

            {/* 0: Situation */}
            {step === 0 && (
              <div className="wp-paired-options" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                {SITUATION.map(s => (
                  <OptionCard key={s.id} selected={beantwortet.has("situation") && situation === s.id} onClick={() => {
                    setSituation(s.id as "bestand" | "neubau");
                    setInsulationIdx(1); // reset to middle when switching
                    markBeantwortet("situation");
                  }} label={s.label} sub={s.sub} />
                ))}
              </div>
            )}

            {/* House questions use the same progressive disclosure as the other flows. */}
            {step === 1 && <div>
              <AccordionField completedStyle="check" label="Haustyp" open={inputOpen("haustyp")} answered={beantwortet.has("haustyp")} summary={HAUSTYP_WP[haustypIdx].label} onEdit={() => toggleInput("haustyp")}>
                <div className="wp-house-options">
                  {HAUSTYP_WP.map((h, i) => <OptionCard key={h.id} illustration={`/illustrations/wp-input-neon-v2/${HOUSE_ILLUSTRATIONS[h.id]}.webp`} group="haustyp" selected={beantwortet.has("haustyp") && haustypIdx === i} onClick={() => { setHaustypIdx(i); markBeantwortet("haustyp"); setInputEditing("flaeche"); setInputExpanded(previous => { const next = new Set(previous); next.delete("haustyp"); return next; }); }} label={h.label} sub={h.sub} />)}
                </div>
              </AccordionField>
              <AccordionField completedStyle="check" label="Wohnfläche" available={activeInput === "flaeche" || beantwortet.has("flaeche")} open={inputOpen("flaeche", "haustyp")} answered={beantwortet.has("flaeche")} summary={`${wohnflaeche} m²`} onEdit={() => toggleInput("flaeche")}>
                <div className="wp-area-options">
                  {WOHNFLAECHEN.map((f, i) => <OptionCard key={i} group="flaeche" selected={beantwortet.has("flaeche") && customFlaeche === null && flaecheIdx === i} onClick={() => { setFlaecheIdx(i); setCustomFlaeche(null); setCustomFlaecheDraft(""); markBeantwortet("flaeche"); setInputEditing("done"); setInputExpanded(previous => { const next = new Set(previous); next.delete("flaeche"); return next; }); }} label={f.label} sub={f.sub} />)}
                </div>
                <div className="wp-custom-area">
                  <label htmlFor="wp-custom-area">Eigene Wohnfläche</label>
                  <input id="wp-custom-area" type="number" min={WP_M2_MIN} max={WP_M2_MAX} value={customFlaecheDraft} placeholder="m²" onChange={e => {
                    const raw = e.target.value;
                    setCustomFlaecheDraft(raw);
                    const value = Number(raw);
                    if (raw && value >= WP_M2_MIN && value <= WP_M2_MAX) {
                      setCustomFlaeche(value); markBeantwortet("flaeche");
                    } else {
                      setCustomFlaeche(null);
                      setBeantwortet(previous => { const next = new Set(previous); next.delete("flaeche"); return next; });
                    }
                  }} />
                  <span>m²</span>
                </div>
              </AccordionField>
            </div>}

            {/* 2: Dämmstandard */}
            {step === 2 && (
              <div>
                <div className="wp-insulation-question">
                <div className="wp-insulation-options">
                  {insulationOptions.map((opt, i) => (
                    // Angezeigt wird der erwartete VERBRAUCH, nicht der Norm-Bedarf:
                    // Diese Zahl kann ein Bewohner mit seiner Abrechnung vergleichen,
                    // die Normzahl nicht (siehe lib/heat-consumption.ts).
                    <OptionCard key={i} selected={beantwortet.has("daemmung") && insulationIdx === i} onClick={() => { setInsulationIdx(i); markBeantwortet("daemmung"); }} label={opt.label} sub={`${opt.sub} · ~${verbrauchSpecKwh(situation, i, cfg)} kWh/m²·a`} />
                  ))}
                </div>

                </div>

                {/* Wer seine Abrechnung kennt, muss nicht schätzen. Der gemessene
                    Verbrauch schlägt jeden Kennwert — er ersetzt den Jahresbedarf,
                    NICHT die Heizlast (die Anlagengröße bleibt am Dämmstandard). */}
                {situation === "bestand" && (
                  <div className="wp-bill-input">
                  <div>
                    <div className="wp-bill-heading"><label htmlFor="wp-annual-consumption">Verbrauch laut Abrechnung</label><span>Optional</span></div>
                    <p className="wp-bill-description">Mit deinem Jahresverbrauch rechnen wir genauer. Einschließlich Warmwasser, wenn es über deine Heizung läuft.</p>
                    <div className="wp-bill-fields">
                      <input
                        id="wp-annual-consumption" type="text" inputMode="numeric"
                        placeholder={verbrauchEinheit === "oel" ? "z. B. 2000" : "z. B. 18000"}
                        value={verbrauchDraft}
                        onChange={e => {
                          const raw = e.target.value.replace(/\D/g, "");
                          setVerbrauchDraft(raw);
                          applyVerbrauch(raw, verbrauchEinheit);
                        }}
                        aria-label={verbrauchEinheit === "oel" ? "Heizölverbrauch pro Jahr in Litern" : "Gasverbrauch pro Jahr in Kilowattstunden"}
                        style={{ width: 110, textAlign: "right", fontSize: v("--font-size-body"), fontWeight: 700, fontFamily: v('--font-mono'), background: v('--color-bg'), border: `1px solid ${v('--color-border')}`, borderRadius: v('--radius-sm'), padding: "8px 10px", outline: "none" }}
                      />
                      <SelectField
                        value={verbrauchEinheit}
                        onChange={e => {
                          const next = e.target.value as VerbrauchEinheit;
                          setVerbrauchEinheit(next);
                          const naechste = WP_FUEL_OPTIONS.find(f => f.id === referenzFuerEinheit(fuel.id, next)) ?? fuel;
                          if (naechste.id !== fuel.id) { setOFuel(naechste.id); setOGasPrice(null); }
                          applyVerbrauch(verbrauchDraft, next, naechste);
                        }}
                        ariaLabel="Einheit des Verbrauchs"
                        size="sm"
                      >
                        <option value="gas">kWh Gas pro Jahr</option>
                        <option value="oel">Liter Heizöl pro Jahr</option>
                      </SelectField>
                      {verbrauchKwh !== null && (
                        <button
                          onClick={() => { setVerbrauchDraft(""); setVerbrauchKwh(null); setOQges(null); }}
                          style={{ fontSize: v("--font-size-small"), fontWeight: 600, color: v('--color-text-muted'), background: "none", border: "none", cursor: "pointer", textDecoration: "underline" }}
                        >
                          Wieder schätzen
                        </button>
                      )}
                    </div>
                    {verbrauchKwh !== null && (
                      <div style={{ fontSize: v("--font-size-small"), color: v('--color-text-secondary'), marginTop: 10, lineHeight: 1.5 }}>
                        Gerechnet wird mit <strong>{Math.round(verbrauchKwh).toLocaleString("de-DE")} kWh</strong> Wärme im Jahr
                        {" "}(<span style={{ fontFamily: v('--font-mono') }}>{Math.round(verbrauchKwh / Math.max(1, wohnflaeche))}</span> kWh je m²).
                        {" "}Das ist weniger als dein Zählerstand, weil ein Teil als Abgasverlust verloren geht — bei deiner Heizung rund{" "}
                        {Math.round((1 - kesselDerAblesung(verbrauchEinheit, fuel)) * 100)} %.
                        {" "}Den Dämmstandard brauchen wir trotzdem — er bestimmt die Größe der Wärmepumpe, nicht die Kosten.
                      </div>
                    )}
                  </div>
                  </div>
                )}
              </div>
            )}

            {/* 3: Haushalt */}
            {step === 3 && (
              <div>
                <div className="wp-input-label">Personen im Haushalt</div>
                <div className="wp-person-options" style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 6 }}>
                  {PERSONEN.map((p, i) => {
                    const aktiv = beantwortet.has("personen") && personen === i;
                    return (
                    // Kennzeichnung von Hand statt OptionCard: schmale
                    // Zahlenreihe, siehe PV-Rechner.
                    <button key={i} data-flow-option={p.label === "1" ? "1 Person" : `${p.label} Personen`} aria-pressed={aktiv}
                      onClick={() => { setPersonen(i); markBeantwortet("personen"); }} style={{
                      padding: "14px 4px", borderRadius: v('--radius-md'), fontSize: v("--font-size-lead"), fontWeight: 700, cursor: "pointer", textAlign: "center",
                      background: aktiv ? v('--color-accent-dim') : v('--color-bg-muted'),
                      border: aktiv ? `2px solid ${v('--color-accent')}` : `2px solid ${v('--color-border')}`,
                      color: aktiv ? v('--color-accent') : v('--color-text-secondary'),
                    }}>{p.label}</button>
                    );
                  })}
                </div>
                <div style={{ fontSize: v("--font-size-small"), color: v('--color-text-muted'), marginTop: 12, lineHeight: 1.5 }}>
                  Warmwasser-Bedarf wird mit {DEFAULT_HEATPUMP_CONFIG.wwPerPerson} kWh/Person·a angesetzt (Verbraucherzentrale).
                </div>
              </div>
            )}

            {/* 4: Heizsystem + WP-Typ */}
            {step === 4 && (
              <div>
                <AccordionField completedStyle="check" label="Heizflächen" open={inputOpen("heizsystem")} answered={beantwortet.has("heizsystem")} summary={HEIZSYSTEM.find(h => h.id === heizsystem)?.label} onEdit={() => toggleInput("heizsystem")}>
                <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: 8, marginBottom: 18 }}>
                  {HEIZSYSTEM.map(h => (
                    <OptionCard key={h.id} group="heizsystem" selected={beantwortet.has("heizsystem") && heizsystem === h.id} onClick={() => { setHeizsystem(h.id as typeof heizsystem); markBeantwortet("heizsystem"); setInputEditing("wptyp"); setInputExpanded(previous => { const next = new Set(previous); next.delete("heizsystem"); return next; }); }} label={h.label} sub={h.sub} />
                  ))}
                </div>
                </AccordionField>
                <AccordionField completedStyle="check" label="Wärmepumpen-Typ" available={activeInput === "wptyp" || beantwortet.has("wptyp")} open={inputOpen("wptyp", "heizsystem")} answered={beantwortet.has("wptyp")} summary={WP_TYPE.find(w => w.id === wpType)?.label} onEdit={() => toggleInput("wptyp")}>
                <div className="wp-paired-options" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                  {WP_TYPE.map(w => (
                    <OptionCard key={w.id} group="wptyp" selected={beantwortet.has("wptyp") && wpType === w.id} onClick={() => { setWpType(w.id as typeof wpType); markBeantwortet("wptyp"); setInputEditing("done"); setInputExpanded(previous => { const next = new Set(previous); next.delete("wptyp"); return next; }); }} label={w.label} sub={w.sub} />
                  ))}
                </div>
                </AccordionField>
                {situation === "bestand" && beantwortet.has("wptyp") && <BegFundingQuestions progressive unknownAgeBonus={false}
                  initialAnswers={heatingAnswers} screen={heatingScreen} onEditScreen={setHeatingScreen} stufe={stufeJetzt}
                  go={next => { if (next === "alter") setHeatingScreen(next); else { setHeatingScreen("result"); setHeatingKnown(true); setFundingQuestion("einkommen"); } }}
                  setNeubau={() => {}} setSelbstnutzer={() => {}} setEinkommen={() => {}} setKind={() => {}}
                  onHeatingCategory={category => { fundingCategory.current = category; setHeatingKnown(false); }}
                  setFossil={enabled => setAltheizung(fundingCategory.current === "fossil" ? "oel_kohle" : fundingCategory.current === "other" ? "andere" : enabled ? "gas_alt" : "gas_neu")}
                  setAlterUnbekannt={setFundingAgeUnknown}
                />}
              </div>
            )}

          </div>
            {/* Keep viewport navigation outside the animated step. */}
            <div className="wp-flow-footer">
              <FlowNav
                weiterAktiv={stepBeantwortet}
                weiterLabel={step === STEPS.length - 1 ? "Ergebnis anzeigen" : "Weiter"}
                nebenWeiter={step === 4 && situation === "bestand" && !heatingKnown && beantwortet.has("heizsystem") && beantwortet.has("wptyp") ? (
                  <button type="button" className="wp-selection-details-link" onClick={() => {
                    setFundingConfirmed(false);
                    setFundingQuestion("heizung");
                    next();
                  }}>Später im Fördercheck beantworten</button>
                ) : undefined}
                onWeiter={() => {
                  setInputExpanded(new Set());
                  setInputEditing(null); next();
                }}
                // Im ersten Schritt führt Zurück aus dem Flow heraus auf die
                // Startseite — wie vorher, nur im gemeinsamen Baustein.
                onZurueck={step > 0 ? () => {
                  setInputExpanded(new Set()); setInputEditing(null); back();
                } : () => router.push("/")}
                inaktivHinweis={stepHinweis}
              />
            </div>
          </>
        )}

        {/* ── RESULT ── */}
        {isResult && (
          // Keep the calculation and product comparison in separate sections.
          <div className="wp-ergebnis">
          <div className="wp-result-main">
          <div className="wp-result-layout">
          <div className="wp-result-primary">
            <section id="wp-ueberblick" className="wp-overview" aria-label="Dein Ergebnis">
              <div className="wp-overview-top">
            <div className="wp-result-column">
              <div ref={overviewRef} className="wp-result-hero">
              <div className="wp-overview-head">
                <div className="wp-result-label">
                  <span className="wp-result-label-copy"><strong className="wp-result-label-title">{sel.tcoEinsparung >= 0 ? "Einsparungen" : "Mehrkosten"} über {DEFAULT_HEATPUMP_CONFIG.years} Jahre</strong> mit{" "}
                  <button type="button" className="wp-assumptions-trigger" onClick={() => { openPrices(); setPreisExpanded(true); }}>
                    {greenGas || effScenario === "realistic" ? "realistischer" : effScenario === "optimistic" ? "optimistischer" : "pessimistischer"} Preisentwicklung
                  </button></span>
                  <div className="wp-result-tools"><button className="wp-result-details-link" type="button" onClick={() => setResultDetailsOpen(true)}>Details</button><button type="button" className="wp-settings-trigger" aria-label="Rechnung einstellen" title="Einstellungen" onClick={() => openSettings()}><IconSettings size={iconSizes.xl} /></button></div>
                  <Modal open={resultDetailsOpen} onClose={() => setResultDetailsOpen(false)} title="Dein Heizkostenvergleich im Detail" intro="So setzt sich die Einsparung über 20 Jahre zusammen." maxWidth={640}>
                    <TcoBreakdown r={sel} situation={situation} jahre={DEFAULT_HEATPUMP_CONFIG.years} sanierungHinweis={false} refLabel={fuel.refLabel} />
                    <div className="wp-calculation-details">
                      <p>Die Beträge vergleichen Wärmepumpe und Vergleichsheizung im jeweiligen Gebäudezustand. Dämmkosten und Dämmförderung fehlen; ob sich die Dämmung lohnt, wird hier nicht berechnet.</p>
                      <ResultSection title="Technische Rechenwerte" summary="Wärme- und Strombedarf">
                        <DetailGrid items={[
                          ["Heizwärme pro Jahr", `${sel.qHeiz.toLocaleString("de-DE")} kWh`],
                          ["Warmwasser pro Jahr", `${sel.qWw.toLocaleString("de-DE")} kWh`],
                          ["Wärmebedarf gesamt pro Jahr", `${sel.qGes.toLocaleString("de-DE")} kWh`],
                          ["Heizlast Gebäude", `${sel.heizlastKw.toLocaleString("de-DE")} kW`],
                          ["Auslegung Wärmepumpe", `${sel.auslegungKw.toLocaleString("de-DE")} kW`],
                          ["Vorlauftemperatur", `${sel.flowTemp} °C`],
                          ["Jahresarbeitszahl (JAZ)", sel.jaz.toFixed(2).replace(".", ",")],
                          ["Strombedarf Wärmepumpe pro Jahr", `${sel.eWp.toLocaleString("de-DE")} kWh`],
                        ]} />
                      </ResultSection>
                      <p className="wp-calculation-source-note">Die Werte folgen deinem gewählten Gebäudezustand und der eingestellten Preisentwicklung. Es sind Modellwerte, keine Messung am Haus. <Link href="/datenstand">Quellen und Datenstand</Link></p>
                    </div>
                  </Modal>
                </div>
              </div>
              <div className="wp-profit-comparison">
                <span className="wp-profit-illustration" aria-hidden="true"><img src="/illustrations/funding-check-neon.svg" alt="" width={1024} height={1024} /></span>
                <div className="wp-profit-content">
              <div className="wp-profit-row">
              <div ref={resultIntro.anchor} className="wp-result-value" style={{ fontSize: v("--font-size-display-lg"), fontWeight: 800, color: v('--color-text-primary'), fontFamily: v('--font-mono'), lineHeight: 1.1, textAlign: "center" }}>
                {sel.tcoEinsparung > 0 && <span className="wp-result-plus" style={{ color: tokens["--color-positive"] }} aria-label="Plus"><IconPlus size={iconSizes.md} /></span>}<span className="wp-result-count"><span className="wp-result-count-space" aria-hidden="true">{Math.abs(sel.tcoEinsparung).toLocaleString("de-DE")}</span><span className="wp-result-count-live">{Math.round(Math.abs(sel.tcoEinsparung) * resultIntro.progress).toLocaleString("de-DE")}</span></span> <span className="wp-result-currency">€</span>
              </div>
                <div className="wp-pv-toggle-group">
                  {resultIntro.stage === "solar" && <span className="wp-solar-pointer" aria-hidden="true" />}
                <Switch className="wp-pv-switch" an={pvStatus !== "nein"} onChange={togglePv} label="Mit Solaranlage" text="Mit Solaranlage" />

                </div>
              </div>
              <div className="wp-reference-inline">
                <span>vs.</span>
                <span className="wp-reference-picker"><SelectField size="sm" ariaLabel="Referenzheizung wählen" value={fuel.id}
                  onChange={e => { setOFuel(e.target.value); setOGasPrice(null); }}>
                  {fuelOptions.map(f => <option key={f.id} value={f.id}>{f.displayLabel}</option>)}
                </SelectField></span>


              </div>
                </div>
              </div>
              {pvStatus !== "nein" && <p className="wp-pv-preset">{pvConfigured ? "Deine Anlage" : "Angenommen"}: {pvKwp.toLocaleString("de-DE")} kWp · {pvSpeicher.toLocaleString("de-DE")} kWh Speicher <button type="button" onClick={openPvSettings}>Anpassen</button></p>}
              <p className="wp-result-summary">
                {mehrkosten > 0 && sel.amortisationsJahre !== null && sel.amortisationsJahre > 0 && (
                  <>Im Vergleich {sel.gasInvest > 0 ? `zur neuen ${referenceDevice}` : `zum Weiterbetrieb deiner ${referenceDevice}`} rechnet sich die Wärmepumpe <strong>nach {sel.amortisationsJahre} {sel.amortisationsJahre === 1 ? "Jahr" : "Jahren"}</strong>.{" "}</>
                )}
                {sel.tcoEinsparung >= 0
                  ? <>Über {DEFAULT_HEATPUMP_CONFIG.years} Jahre kostet dich die Wärmepumpe <strong>{sel.tcoEinsparung.toLocaleString("de-DE")} € weniger</strong> als {ersatzInvest > 0 ? "eine neue" : "deine vorhandene"} {referenceDevice}.</>
                  : <>Über {DEFAULT_HEATPUMP_CONFIG.years} Jahre kostet dich die Wärmepumpe <strong>{Math.abs(sel.tcoEinsparung).toLocaleString("de-DE")} € mehr</strong> als {ersatzInvest > 0 ? "eine neue" : "deine vorhandene"} {referenceDevice}.</>}
                {" "}Anschaffung nach Förderung, Betrieb und Wartung sind eingerechnet.
              </p>
              {fuel.kind === "oil" && <p className="wp-building-comparison-note">Ölvergleich: UBA-Preisprojektion statt aktuellem Marktpreis. Die Kostenreferenz umfasst eine neue Komplettanlage mit Tank; Instandhaltung und Prüfungen sind eingerechnet. Zusätzliche Kosten für Bioheizöl fehlen.</p>}
              {/* WELCHE ANNAHME hinter der Zahl steht — nicht, wie weit sie
                  streuen könnte.

                  Bis 05.09.2026 stand hier die Bandbreite über alle gerechneten
                  Annahmen („Je nach Annahme sind es −17.805 € bis +48.186 €").
                  Sie kam Ende Juli dazu, nachdem ein Nutzer die einzelne große
                  Zahl als Prognose gelesen hatte — richtige Absicht, falsches
                  Mittel: Eine Spanne, die das Vorzeichen wechselt, entwertet die
                  Zahl darüber vollständig. Der Betreiber am 05.09.2026: „damit
                  ist unser ergebnis ja für die tonne."

                  DAS PROBLEM WAR NICHT DIE SPANNE, SONDERN WAS SIE MASS. Die
                  Pfade reichten von Strom +5 % bis +1 % pro Jahr, und +5 % ist
                  in keinem messbaren Zehnjahresfenster der letzten 19 Jahre je
                  vorgekommen (höchster Wert 3,97 %, und dessen Treiber — der
                  Aufbau der EEG-Umlage — existiert seit 2022 nicht mehr).
                  Zusätzlich trug der ungünstige Pfad eine 10 % schlechtere
                  Jahresarbeitszahl mit sich, also eine Annahme über das GERÄT,
                  die an keinem der drei Reiter ablesbar war.

                  Statt einer Bandbreite steht hier jetzt, WELCHES Modell
                  gerechnet wird, mit dem Weg zu den anderen. Die Erklärung und
                  die Umschaltung liegen im Preis-Block darüber — beides
                  existierte schon, es fehlte nur der Verweis. Wer es genauer
                  will, ändert Strompreis, Gaspreis und Jahresarbeitszahl
                  ohnehin direkt: alle drei sind unten editierbar.

                  Betreiber-Entscheidung: „Schreiben wir rechnen mit einem
                  realistischen Szenario, dort erklärt + editierbar in die
                  anderen." */}

            <Modal open={pvSettingsOpen} onClose={() => setPvSettingsOpen(false)} title="Solaranlage einrechnen" maxWidth={640}>
              {pvSettingsOpen && <WpPvFlow onCancel={() => setPvSettingsOpen(false)} context={{ personen, haustyp: haustypIdx, wohnflaeche, annualKwh: result.eWp }} initial={pvConfigured || pvStatus !== "nein" ? { kwp: pvKwp, storage: pvSpeicher } : undefined} onApply={({ kwp, storage }) => {
                setPvKwp(kwp); setPvSpeicher(storage); setPvStatus("vorhanden");
                setPvConfigured(true); setPvSettingsOpen(false); showUpdatedResult();
              }} />}
            </Modal>




            </div>

            </div>
            {/* Chart */}
            <div className="wp-result-chart">
              <PersonalHeatRace key={resultRevision} result={sel} reference={fuel.refLabel} autoplay={resultIntro.stage === "race"} />

            </div>

              </div>
            {/* Sekundäre Stats */}
            <div className="wp-result-stats" style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8, marginBottom: 16 }}>
              {/* Payback refers to the additional cost compared with the alternative. */}
              <StatCard
                label={mehrkosten > 0 ? "Amortisation" : "Mehrkosten"}
                value={mehrkosten <= 0
                  ? "keine"
                  : sel.amortisationsJahre !== null ? `${sel.amortisationsJahre}` : "> 20"}
                unit={mehrkosten > 0 ? (sel.amortisationsJahre === 1 ? "Jahr" : "Jahre") : undefined}
                positive={mehrkosten <= 0 || (sel.amortisationsJahre !== null && sel.amortisationsJahre <= 15)}
                helpTitle="Worauf sich diese Zahl bezieht"
                helpAriaLabel="Worauf bezieht sich die Amortisation?"
                help={mehrkosten <= 0
                  ? `Die Wärmepumpe kostet dich nach Förderung ${sel.investNetto.toLocaleString("de-DE")} € — das ist ${Math.abs(mehrkosten).toLocaleString("de-DE")} € WENIGER als die ${sel.gasInvest.toLocaleString("de-DE")} € für eine neue ${fuel.refLabel}. Es gibt also keine Mehrkosten, die sich erst rechnen müssten; die Ersparnis beim Heizen kommt oben drauf. Achtung: Das heißt nicht, dass die Anlage nichts kostet — du zahlst die ${sel.investNetto.toLocaleString("de-DE")} € trotzdem.`
                  : `Nicht die ganze Investition, sondern nur der Unterschied zur Alternative. Die Wärmepumpe kostet dich nach Förderung ${sel.investNetto.toLocaleString("de-DE")} €, eine neue ${fuel.refLabel} ${sel.gasInvest.toLocaleString("de-DE")} € — bleiben ${mehrkosten.toLocaleString("de-DE")} € Mehrkosten. Die sind nach dieser Zeit durch die niedrigeren Heizkosten wieder eingespielt. Steht bei dir gar kein Heizungstausch an, setz die neue ${fuel.refLabel} oben auf 0; dann rechnet sich die volle Investition gegen den Weiterbetrieb.`}
              />
              <StatCard label="⌀ Ersparnis/Jahr" value={sel.einsparungProJahr.toLocaleString("de-DE")} unit="€" positive={sel.einsparungProJahr > 0} />
              <StatCard
                label="CO₂ eingespart"
                value={Math.round(sel.co2Einsparung / 1000).toLocaleString("de-DE")} unit="t"
                positive={sel.co2Einsparung > 0}
                helpTitle="CO₂-Einsparung"
                helpAriaLabel="Was bedeutet die CO₂-Zahl?"
                help="Vermiedener CO₂-Ausstoß über 20 Jahre: die Emissionen der fossilen Heizung minus die Emissionen aus dem Strom, den die Wärmepumpe verbraucht (deutscher Strommix). Es ist also netto eingespartes CO₂, nicht ausgestoßenes — der Stromverbrauch der Wärmepumpe ist schon abgezogen."
              />
            </div>
            </section>

</div>
            <div ref={actionbarRef} className={`wp-result-actionbar${actionsStuck ? " is-stuck" : ""}`} role="region" aria-label="Ergebnisaktionen">
              <div className="wp-result-actionbar-inner">
                <div className="wp-result-actionbar-secondary">
                  <button type="button" className="wp-forward-secondary" onClick={() => canShare ? handleNativeShare() : setForwardOpen(true)}><IconShare size={iconSizes.md} /> Weiterleiten</button>
                  <div className="wp-result-share">
                    <button type="button" onClick={handleCopy} title="Link kopieren" aria-label="Link zu diesem Ergebnis kopieren" style={shareBtnStyle(copied)}>{copied ? <IconCheck size={iconSizes.md} /> : <IconCopy size={iconSizes.md} />}</button>
                    <button type="button" onClick={handleWhatsApp} title="WhatsApp" aria-label="Ergebnis per WhatsApp teilen" style={shareBtnStyle()}><IconWhatsApp size={iconSizes.md} /></button>
                    <button type="button" onClick={() => setResetOpen(true)} title="Neu berechnen" aria-label="Neu berechnen" style={shareBtnStyle()}><IconRefresh size={iconSizes.md} /></button>
                  </div>
                </div>
                <button type="button" className="wp-save-primary" onClick={() => setSaveOpen(true)}>Speichern</button>
                <span className="wp-actionbar-status" role="status">{copied ? "Link kopiert" : ""}</span>
              </div>
            </div>
<aside className="wp-geraete-spalte" aria-label="Passende Geräte" id="wp-geraete">
<WpAuswahlHeading hints={productHints}
  auslegungKw={result.auslegungKw} vorlaufC={result.flowTemp} wpType={wpType}
  situation={activeInputs.situation} heizsystem={activeInputs.heizsystem}
  personen={activeInputs.personen} heizkoerperTausch={activeInputs.heizkoerperTausch ?? false}
/>
              {/* Die vier Gebäudeangaben speisen die fachlichen Hinweise an den
                  Kacheln. Sie kommen aus dem Stand NACH dem gewählten
                  Sanierungsweg, nicht aus den Rohantworten: Wer „Heizkörper fit
                  machen" gewählt hat, bekäme sonst einen Hinweis, der ihm genau
                  das noch einmal vorschlägt — und die Vorlauftemperatur daneben
                  käme aus dem Weg, der Hinweis aus der Rohantwort. */}
              <WpGeraeteEmpfehlung onHintsChange={setProductHints}
                buildShareUrl={buildShareUrl}
                fundingEstimate={situation === "bestand" ? {
                  gross: Math.round(result.investBrutto), net: Math.round(result.investBrutto - result.beg.amount), grant: result.beg.amount,
                  assumptions: !fundingConfirmed ? "Nur Grundförderung; persönliche Boni noch nicht geprüft." : `Angenommen: ${selbstnutzer ? "Selbstnutzung" : "keine Selbstnutzung"}, ${altheizung === "gas_alt" ? "Gas-, Holz- oder Pelletheizung ab 20 Jahren" : altheizung === "gas_neu" ? "Gas-, Holz- oder Pelletheizung unter 20 Jahren" : "Heizung gemäß Förderangaben"}${einkommen === "none" ? ", kein Einkommensbonus" : ", Einkommen gemäß Förderangaben"}.`,
                } : undefined}
                onFundingDetails={() => {
                  const section = document.getElementById("wp-investment-details");
                  section?.scrollIntoView({ behavior: "smooth", block: "start" });
                  setFundingStep("timing");
                }}
                auslegungKw={result.auslegungKw}
                vorlaufC={result.flowTemp}
                wpType={wpType}
                situation={activeInputs.situation}
                heizsystem={activeInputs.heizsystem}
                personen={activeInputs.personen}
                heizkoerperTausch={activeInputs.heizkoerperTausch ?? false}
              />
            </aside>
            <section className="wp-adjustments wp-investment-section" aria-label="Investition und Förderung">
              <div id="wp-investment-details">
                <div className="wp-disclosure-body">
<div className="wp-investment-balance" onChangeCapture={() => { fundingEdited.current = true; }}>

                  <p className="wp-investment-eyebrow">Investition &amp; Förderung</p>
            {situation === "bestand" && <section ref={fundingNoticeRef} className={`wp-funding-action${fundingNoticeRevealed ? " is-revealed" : ""}`}><header className="wp-funding-notice-heading"><span className="wp-important"><span className="wp-funding-notice-icon" aria-hidden="true"><IconAlert size={20} /></span>Wichtig</span><h3>Vor Auftragsbeginn beantragen</h3></header>
                <div className="wp-funding-next" style={{ fontSize: v("--font-size-body"), color: v('--color-text-muted'), lineHeight: 1.5, marginTop: 10, paddingTop: 8, borderTop: `1px solid ${v('--color-border')}` }}>
                  {BEG_ANTRAG_KURZ}{" "}
                  <a href={BEG_ANTRAG_HREF} style={{ color: v('--color-accent'), fontWeight: 600, textDecoration: "none" }}>
                    Die Reihenfolge Schritt für Schritt
                  </a>
                </div>
            </section>}
            {/* 2. Förder-Settings — nach der Konklusion, sie bestimmen alle Zahlen */}
            {situation === "bestand" && (
              <div className="wp-funding-flow">
              <AccordionField completedStyle="check" label="Zeitpunkt der Antragstellung" headerHelp={<BegStandHilfe stand={begStand} naechste={stufeNaechste} />} open={fundingStep === "timing"} answered={fundingTimingConfirmed} summary={begStand === "naechste" ? stufeNaechste?.bezeichnung : "Heute"} onEdit={() => setFundingStep(fundingStep === "timing" ? null : "timing")}>
                <div className="wp-funding-timing-box">

                <div className="wp-funding-timing">
                <BegStandSchalter
                  stand={begStand}
                  setStand={s => { fundingEdited.current = true; setBegStand(s);  }}
                  jetzt={stufeJetzt}
                  naechste={stufeNaechste}
                  euUrsprung={euUrsprung}
                  setEuUrsprung={b => { setEuUrsprung(b);  }}
                  betragJetzt={begVergleich.jetzt}
                  betragNaechsteOhneEu={begVergleich.naechsteOhneEu}
                  betragNaechsteMitEu={begVergleich.naechsteMitEu}
                />
                </div>
                </div>
                <FlowNav weiterAktiv onWeiter={() => { setFundingTimingConfirmed(true); setFundingStep("personal"); }} />
              </AccordionField>
              <AccordionField completedStyle="check" label="Förderdetails ergänzen" open={fundingStep === "personal"} answered={fundingConfirmed && !fundingAgeUnknown} summary={fundingConfirmed ? "Angaben übernommen" : "Für einen genaueren Zuschuss"} onEdit={() => { setFundingStep(fundingStep === "personal" ? null : "personal"); resumeFundingAge.current = fundingAgeUnknown && fundingConfirmed; if (fundingAgeUnknown) setFundingQuestion("alter"); }}>
                <div className="wp-shared-funding-questions" id="wp-funding-questions">
                  <p>Gebäude und Wärmepumpen-Typ übernehmen wir aus deiner Rechnung. Für diesen Vergleich gehen wir von Selbstnutzung aus.</p>
                  <BegFundingQuestions key={fundingEditorVersion}
                    progressive
                    unknownAgeBonus={false}
                    initialAnswers={{ ...heatingAnswers, ...(fundingConfirmed ? {
                      heizung: altheizung === "oel_kohle" ? "Öl, Kohle, Gas-Etage oder Nachtspeicher" : altheizung === "andere" ? "Etwas anderes" : "Gas-Zentralheizung, Holz oder Pellets",
                      ...((altheizung === "gas_alt" || altheizung === "gas_neu") ? { alter: fundingAgeUnknown ? "Weiß ich nicht" : altheizung === "gas_alt" ? "20 Jahre oder älter" : "Jünger als 20 Jahre" } : {}),
                      einkommen: BEG_EINKOMMEN_OPTIONS.find(option => option.key === (einkommen === "bis30" ? "t30000" : einkommen === "bis40" ? "t40000" : einkommen === "bis50" ? "t50000" : einkommen === "bis60" ? "t60000" : "none"))?.label,
                      ...(einkommen !== "none" ? { kind: kindImHaushalt ? "Ja" : "Nein" } : {}),
                    } : {})}}
                    onEditScreen={setFundingQuestion}
                    screen={fundingQuestion}
                    stufe={begStufe}
                    go={next => {
                      if (resumeFundingAge.current && next === "einkommen") {
                        resumeFundingAge.current = false; setFundingStep("local"); return;
                      }
                      setFundingQuestion(next);
                      setFundingConfirmed(next === "result");
                      if (next === "result") { setHeatingKnown(true); setFundingConfirmed(true); setFundingStep("local"); }
                    }}
                    setNeubau={() => {}}
                    setSelbstnutzer={setSelbstnutzer}
                    onHeatingCategory={category => { fundingCategory.current = category; }}
                    setFossil={enabled => {
                      fundingEdited.current = true;

                      setAltheizung(fundingCategory.current === "fossil" ? "oel_kohle" : fundingCategory.current === "other" ? "andere" : enabled ? "gas_alt" : "gas_neu");
                    }}
                    setAlterUnbekannt={setFundingAgeUnknown}
                    setEinkommen={key => {
                      fundingEdited.current = true;
                      setEinkommen(key === "t30000" ? "bis30" : key === "t40000" ? "bis40" : key === "t50000" ? "bis50" : key === "t60000" ? "bis60" : "none");
                      if (key === "none") setKindImHaushalt(false);
                    }}
                    setKind={value => { fundingEdited.current = true; setKindImHaushalt(value);  }}
                  />
                </div>
              </AccordionField>
              </div>
            )}

            {/* 2b. Kommunale Förderung — der Ort wird erst HIER gefragt.
                 Reihenfolge mit Absicht: erst die BEG, dann was die Gemeinde
                 obendrauf legt. Umgekehrt stünde der kleinere Betrag über dem
                 größeren, und der Fördercheck läse sich wie die Hauptsache.

                 Frage und Antwort stehen in EINER Karte (`kopf`): Als eigener
                 Kasten darüber waren es zwei Rahmen mit zwei Überschriften für
                 eine Sache, und das Postleitzahl-Feld sprang beim Auflösen an
                 eine andere Stelle.

                 `programs` zeigt alles, was wir für den Ort kennen — abgezogen
                 wird nur, was `applied` trägt. `brutto` ist die Investition NACH
                 der BEG, weil die Karte `total` davon abzieht und das Ergebnis
                 „Investition nach Förderung" nennt; mit dem Bruttopreis stünde
                 dort dieselbe Zeile mit einem anderen Betrag als oben. */}
            <div className="wp-funding-flow">
            <AccordionField completedStyle="check" label="Förderung vor Ort" open={fundingStep === "local" || situation === "neubau"} answered={!!foerderQuelle.ags && plz === checkedPlz} summary={plz} onEdit={() => setFundingStep(fundingStep === "local" ? null : "local")}>
            <div className="wp-funding-local">
              <ResultFunding
                title=""
                showInvestmentTotal={false}
                federalFundingIncluded={situation === "bestand"}
                loading={foerderQuelle.laedt}
                candidates={foerderQuelle.kandidaten}
                chosenAgs={foerderQuelle.ags}
                onChooseAgs={foerderQuelle.waehleOrt}
                programs={foerderQuelle.programme}
                applied={situation === "bestand" ? foerderZeilen : []}
                total={kappung}
                enabled={foerderAktiv}
                onToggle={setFundingEnabled}
                brutto={Math.max(0, result.investBrutto - result.beg.amount)}
                technik="waermepumpe"
                hinweis={foerderHinweis}
                kopf={
                  <>
                    <div style={{ fontSize: v("--font-size-caption"), color: v('--color-text-muted'), lineHeight: 1.5, marginBottom: 10 }}>
                      {situation === "bestand" ? "Mit deiner Postleitzahl suchen wir nach zusätzlichen Programmen. Nur anrechenbare Zuschüsse werden oben vom Eigenanteil abgezogen." : "Finde Förderprogramme an deinem Wohnort. Im Neubau dient diese Suche zur Information; Zuschüsse werden hier nicht automatisch abgezogen."}
                    </div>
                    <div className="wp-funding-location" style={{ fontSize: v("--font-size-small") }}>
                      <StandortField
                        plz={plz}
                        onPlzChange={setPlz}
                        loading={foerderQuelle.laedt}
                        confirmed={!!foerderQuelle.ags && plz === checkedPlz}
                        onSubmit={() => lookupFunding(plz)}
                        label="Postleitzahl"
                        submitLabel="Förderung prüfen"
                      />
                    </div>
                  </>
                }
              />
            </div>

            </AccordionField>
            </div>

                  {situation === "bestand" && <div className="wp-funding-assumptions">
                    <strong>{fundingConfirmed ? "Deine Förderangaben" : "Grundförderung eingerechnet"}</strong>
                    {!fundingConfirmed && <button type="button" onClick={openFundingCheck}>Fördercheck machen →</button>}
                    {!fundingConfirmed && <p>Mit {Math.round(begStufe.grundfoerderung * 100)} % Grundförderung gerechnet. Weitere Boni prüfen wir im Fördercheck.</p>}
                    {fundingAgeUnknown && <p>Heizungsalter offen: Ein Austauschbonus ist noch nicht eingerechnet.</p>}
                  </div>}
                  {<>
                    <div className="wp-investment-row"><span>Anlage inklusive Installation <small>Modellschätzung</small></span><strong>{result.investBrutto.toLocaleString("de-DE")} €</strong></div>
                    {result.beg.amount > 0 && <div className="wp-investment-row"><span>Bundesförderung <InfoTooltip title="So wird dein Zuschuss berechnet" ariaLabel="Berechnung der Bundesförderung">                {/* Der gewählte Förderstand gehört in die Kopfzeile, nicht nur in
                    den Schalter weiter unten: Wer die Zahl darüber liest, muss
                    ohne Suchen sehen, nach welchem Stand sie gerechnet ist. */}
                <div style={{ fontSize: v("--font-size-caption"), color: v('--color-text-muted'), marginBottom: 10 }}>
                  {Math.round(result.beg.rate * 100)} % der förderfähigen Kosten
                  {stufeNaechste
                    ? <> · Stand {begStand === "naechste" ? stufeNaechste.bezeichnung : "heute"}</>
                    : null}
                  {result.investBrutto > begStufe.maxCap
                    ? <> · gedeckelt bei {begStufe.maxCap.toLocaleString("de-DE")} € (deine Anlage liegt darüber, daher {Math.round(result.beg.rate * 100)} % × {begStufe.maxCap.toLocaleString("de-DE")} €)</>
                    : null}
                </div>
                {/* Der Satz kommt aus der gewählten Stufe, nicht als getippte
                    Zahl. Er stand hier bis zum 26.08.2026 als „30 %" im Text —
                    genau die Sorte Zahl, die beim ersten Stichtag still falsch
                    wird, während die Rechnung daneben längst richtig rechnet. */}
                <div style={{ fontSize: v("--font-size-small"), color: v('--color-text-muted'), display: "flex", alignItems: "center", gap: 5, marginBottom: 6 }}>
                  Grundförderung im Modell: {Math.round(begStufe.grundfoerderung * 100)} %
                </div>
                </InfoTooltip><small>{fundingConfirmed && !fundingAgeUnknown ? "Nach deinen Förderangaben" : "Schätzung · Förderdetails ergänzen"}</small></span><strong>−{result.beg.amount.toLocaleString("de-DE")} €</strong></div>}
                    {result.kommunal.angerechnet > 0 && <div className="wp-investment-row"><span>Zusätzliche örtliche Förderung</span><strong>−{result.kommunal.angerechnet.toLocaleString("de-DE")} €</strong></div>}
                  </>}
                  <div className="wp-investment-total"><span>Dein geschätzter Eigenanteil</span><strong>{result.investNetto.toLocaleString("de-DE")} <small>€</small></strong></div>

            </div>
            {situation === "bestand" && kfw && <ResultSection title="Wer bekommt die Förderung wirklich?" summary="">
              <KfwFoerderpraxis daten={kfw} kreis={kfwKreis} nackt />
            </ResultSection>}


                </div>
              </div>
            </section>
            <Modal open={pricesOpen} onClose={() => setPricesOpen(false)} title="Preise und Preisentwicklung" intro="Heutige Tarife und Annahmen für die nächsten 20 Jahre. Änderungen werden erst beim Neuberechnen übernommen." maxWidth={640}>
              {priceDraft && <div className="wp-price-settings"><div className="wp-assumptions-content">
<div className="wp-settings-fields wp-price-tariffs">                <div>{fuel.kind === "oil" ? "Heizölpreis" : "Gaspreis"}: {(priceDraft.scenario === "gruengas")
                  ? <span style={{ fontStyle: "italic", color: v('--color-text-muted') }}>folgt dem gewählten Grüngas-Pfad</span>
                  : <InlineEdit value={Math.round((priceDraft.oGasPrice ?? fuel.price) * 100 * 100) / 100} onCommit={v => updatePrices({ oGasPrice: v / 100 })} unit=" ct/kWh" min={3} max={40} step={0.5} width={70} />}</div>
                <div>WP-Strompreis: <InlineEdit value={Math.round((priceDraft.oStromPrice ?? DEFAULT_HEATPUMP_CONFIG.wpTarif) * 100 * 100) / 100} onCommit={v => updatePrices({ oStromPrice: v / 100 })} unit=" ct/kWh" min={10} max={60} step={0.5} width={70} /></div>
</div>
            {/* Womit gerechnet wird — Rechtslage und Preispfad zusammen. */}
            <div style={{ marginBottom: 16 }}>
              <div style={{ fontSize: v("--font-size-small"), fontWeight: 700, color: v('--color-text-muted'), textTransform: "uppercase", letterSpacing: "0.04em", margin: "0 2px 8px" }}>
                Womit wir rechnen
              </div>
            {/* Szenario-Auswahl ganz oben: das beschlossene Heizungsgesetz (Grüngas-Pflicht,
                beschlossen, Inkrafttreten mit der Verkündung) gesondert + hervorgehoben, darunter drei reine
                Preis-Annahmen ohne Grüngas. Die Wahl rechnet alle Zahlen darunter um. */}
            <div style={{ marginBottom: 16 }}>
              {/* Primär: das Heizungsgesetz (Grüngas-Pflicht). Klickbare Kachel; das
                  „Mehr erfahren" darin öffnet das Modal (stopPropagation, damit der
                  Kachel-Klick nicht zugleich das Szenario umstellt). */}
              {gruengasVerfuegbar ? (
              <div>
                <OptionCard selected={priceDraft.scenario === "gruengas"} onClick={() => { updatePrices({ scenario: "gruengas" }); setPreisExpanded(false); }} label="Grüngas-Pflicht ab 2029" sub="Gas wird durch die gesetzliche Biomethan-Beimischung Jahr für Jahr teurer" />
                <button className="wp-selection-details-link" onClick={() => setShowGasInfo(true)}>Mehr erfahren</button>
              </div>
              ) : (
                /* Heizöl: Die Bio-Treppe des Heizungsgesetzes gilt zwar auch für Öl,
                   aber unser Preispfad bildet nur den Gas-Mix ab. Statt eine Zahl zu
                   erfinden, sagen wir offen, was in der Rechnung fehlt. */
                <div style={{ padding: "12px 14px", borderRadius: v('--radius-md'), background: v('--color-bg-muted'), border: `1px solid ${v('--color-border')}`, fontSize: v("--font-size-small"), color: v('--color-text-secondary'), lineHeight: 1.55 }}>
                  {ersatzInvest <= 0 ? (
                    <>
                      <strong style={{ color: v('--color-text-primary') }}>Ohne neue Heizung greift die Grüngas-Pflicht nicht.</strong>{" "}
                      Du hast die Anschaffung einer neuen {fuel.refLabel} auf 0 € gesetzt — deine jetzige Heizung läuft also
                      weiter. Die Beimischungspflicht des Heizungsgesetzes gilt nur für Heizungen, die neu eingebaut werden,
                      deshalb rechnen wir sie hier nicht mit. Bleibt die normale Teuerung und der steigende CO₂-Preis.
                      Eine Einschränkung: Zusätzlich soll eine Quote für alle Brennstoff-Anbieter kommen, die auch bestehende
                      Heizungen verteuern dürfte. Das Gesetz dazu liegt noch nicht vor — es muss bis zum {GMODG_RECHTSSTAND.quoteGesetzBis} vorgelegt
                      werden und nennt bisher nur das Ziel, ab 2045 vollständig auf klimaneutrale Brennstoffe umzustellen. Wir rechnen es nicht mit.
                    </>
                  ) : (
                  <>
                  <strong style={{ color: v('--color-text-primary') }}>Beim Heizöl fehlt ein Kostenblock — bewusst.</strong>{" "}
                  Das Heizungsgesetz nennt Heizöl gleichrangig neben Gas: Eine neu eingebaute Ölheizung muss ab 2029{" "}
                  {bioTreppeStufenText()} ihrer Wärme klimafreundlich erzeugen — bei Öl über Bioheizöl, in den Jahren 2029 bis 2034 bei ausreichender Auslegung auch über
                  Wasserstoff-Derivate oder ganz ohne Beimischung über Solarthermie, eine Lüftung mit Wärmerückgewinnung oder
                  eine Hybridlösung mit Wärmepumpe (§ 43 Abs. 3–5 GModG).
                  Dass das den Brennstoff verteuert, ist sicher — <strong>wie stark, ist es nicht.</strong> Marktangaben reichen
                  von wenigen Prozent Aufschlag bis zu rund der Hälfte, je nachdem ob man beigemischtes Bioheizöl oder reines
                  HVO betrachtet. Eine belastbare Preisreihe gibt es dafür bislang nicht, deshalb rechnen wir hier nur die
                  normale Teuerung und den steigenden CO₂-Preis. <strong>Deine Ölheizung dürfte also teurer werden, als hier
                  steht</strong> — die Wärmepumpe schneidet in Wirklichkeit eher besser ab als in dieser Rechnung.
                  </>
                  )}
                </div>
              )}

              <AccordionField completedStyle="check" label="Angenommene Energiepreise" open={preisExpanded} answered={priceDraft.scenario !== "gruengas"} summary={scenariosPlain.find(item => item.id === priceDraft.scenario)?.label} onEdit={() => setPreisExpanded(p => !p)}>
                <p>Ohne Grüngas-Pflicht: Wähle deine Annahme zur Entwicklung der Energiepreise.</p>
                <div className="wp-price-options">
                  {scenariosPlain.map(item => <OptionCard key={item.id} selected={priceDraft.scenario === item.id} label={item.label} sub={item.sub} onClick={() => updatePrices({ scenario: item.id })} />)}
                </div>
                {priceDraft.scenario !== "gruengas" && <p>{scenariosPlain.find(item => item.id === priceDraft.scenario)?.explain}</p>}
                {fuel.kind === "oil" && <p>Die Modelle verwenden denselben UBA-Ölpreispfad. Zusätzliche Bioheizöl-Kosten sind nicht enthalten.</p>}
              </AccordionField>
            </div>

            </div>
                            </div>
              </div>
              }
              <FlowNav zurueckLabel="Abbrechen" onZurueck={() => setPricesOpen(false)} weiterLabel="Ergebnis neu berechnen" weiterAktiv={pricesChanged} inaktivHinweis="Ändere zuerst eine Angabe." onWeiter={() => {
                if (!priceDraft) return;
                setOGasPrice(priceDraft.oGasPrice); setOStromPrice(priceDraft.oStromPrice); setScenario(priceDraft.scenario);
                setPricesOpen(false); showUpdatedResult();
              }} />
            </Modal>
            <Modal open={settingsOpen} onClose={() => setSettingsOpen(false)} title="Gebäude und Heiztechnik" intro="Passe deine Angaben an und übernimm sie anschließend in die Rechnung." maxWidth={720}>
              {settingsDraft && <div className="wp-calculator-page wp-settings wp-funding-flow wp-funding-modal">
              {/* Das Gebäude — dieselbe Abfrage wie im Flow, hier zum
                  Nachjustieren. Bis 08.08.2026 waren im Ergebnis nur die
                  ABGELEITETEN Größen editierbar (Heizwärme, Heizlast): Wer
                  merkte, dass er die Wohnfläche falsch angegeben hat, musste
                  den ganzen Flow neu durchlaufen.

                  Die abgeleiteten Werte bleiben darunter trotzdem stehen — das
                  ist die eine Stelle im Projekt, wo zwei Wege zur selben Zahl
                  richtig sind: Das Gebäude ist der Weg für alle, die schätzen;
                  die Heizwärme der für die, die ihre Gasrechnung danebenlegen.
                  Ein gemessener Wert schlägt jede Schätzung. */}
              <section className="wp-settings-section">
                <h3>Dein Gebäude</h3>
                <p>Bei geänderten Gebäudeangaben werden Wärmebedarf und Heizlast neu geschätzt.</p>
                  <GebaeudeField
                    completedStyle="check"
                    werte={settingsDraft}
                    setWerte={patch => updateSettings({ ...patch, oQges: null, oHeizlast: null })}
                    beantwortet={new Set(GEBAEUDE_FIELDS)}
                    /* Alle vier Fragen gelten hier als beantwortet (der Flow hat
                       sie gestellt), zu markieren gibt es also nichts — aber die
                       angeklickte Frage muss nach der Wahl wieder zuklappen.
                       Genau das erledigt dieser Callback in den anderen
                       Rechnern mit; eine leere Funktion ließ die Frage offen
                       stehen und der Baustein verhielt sich hier anders. */
                    markiereBeantwortet={() => setGebaeudeEditing(null)}
                    bearbeitet={gebaeudeEditing}
                    setBearbeitet={setGebaeudeEditing}
                    daemmstufen={insulationOptions}
                  />
              </section>

              <section className="wp-settings-section"><h3>Kosten der Vergleichsheizung</h3>
                <div className="wp-settings-fields wp-reference-cost">
                <div>
                  Neue {fuel.refLabel}: <InlineEdit value={settingsDraft.oFossilInvest ?? result.gasInvest} onCommit={v => updateSettings({ oFossilInvest: v })} unit=" €" min={0} max={40000} step={500} width={80} />
                {fuel.kind === "oil" && <p className="wp-building-comparison-note">KWW-Komplettreferenz für 20 kW: 25.704 € inkl. MwSt., Tank, Abgasweg und Puffer. Wenn vorhandene Teile bleiben, trage den tatsächlichen Angebotspreis ein. Instandhaltung und Prüfungen: 476 €/Jahr; der Umfang ist breiter als die Wartungspauschale der Wärmepumpe.</p>}
                  <InfoTooltip title="Warum eine neue Heizung in der Rechnung steht" ariaLabel="Warum steht eine neue Heizung in der Rechnung?">
                    Der Rechner vergleicht zwei Entscheidungen, die <strong>jetzt</strong> anstehen: Wärmepumpe oder neue fossile Heizung. Beide werden im ersten Jahr bezahlt, deshalb steht die Anschaffung auf der fossilen Seite — man spart sie sich mit der Wärmepumpe. Sie ist zugleich der Grund, warum die Beimischungspflicht greift: Die gilt nur für Heizungen, die neu eingebaut werden. <strong>Steht bei dir gar keine Entscheidung an, weil die Heizung noch lange läuft? Dann trag hier 0 ein</strong> — dann rechnet der Vergleich gegen den Weiterbetrieb, ohne Anschaffung und ohne Beimischungspflicht.
                  </InfoTooltip>
                </div>
</div>
              </section>
              {/* Editable model assumptions use the same field rhythm as the building inputs. */}
              <section className="wp-settings-section"><h3>Wärmebedarf und Wärmepumpe</h3><div className="wp-settings-fields">
                <div>
                  Wärmebedarf inkl. Warmwasser: <InlineEdit value={settingsDraft.oQges ?? result.qGes} onCommit={v => updateSettings({ oQges: v })} unit=" kWh" min={1000} max={80000} step={500} width={90} />
                  <InfoTooltip title="Woher diese Menge kommt" ariaLabel="Woher kommt der Jahres-Heizwärmebedarf?">
                    Geschätzt aus Wohnfläche, Dämmzustand und Personenzahl — und zwar als <strong>erwarteter Verbrauch</strong>, nicht als Norm-Bedarf. Der Unterschied ist groß: Die Norm rechnet ein Gebäude durch, in dem alle Räume auf Solltemperatur stehen. Real wird weniger geheizt (Räume bleiben kühl, nachts wird abgesenkt), im Altbau rund 30 % weniger.<br /><br />
                    <strong>Du kennst deinen Gas- oder Ölverbrauch? Trag ihn im Schritt „Dämmstandard" ein</strong> — oder rechne hier direkt: Jahresverbrauch in kWh × {Math.round(kesselDerAblesung("gas", fuel) * 100)} % (Nutzungsgrad deiner vorhandenen Gastherme; bei Öl {Math.round(kesselDerAblesung("oel", fuel) * 100)} %) — derselbe Faktor, mit dem der Schritt „Dämmstandard" rechnet. Ein gemessener Wert schlägt jede Schätzung.<br /><br />
                    Diese Menge steht auf beiden Seiten der Rechnung — sie bestimmt den Gasverbrauch genauso wie den Strom der Wärmepumpe. <strong>Wenn nach dem Wechsel wärmer oder in mehr Räumen geheizt wird, steigt sie</strong>, und die Ersparnis fällt kleiner aus als hier gezeigt. Nach Sanierungen wird dieser Effekt mit 10 bis 30 % beziffert; wie stark er bei einem reinen Heizungstausch auftritt, ist nicht belastbar gemessen — deshalb rechnen wir ihn nicht ein, sondern nennen ihn.
                  </InfoTooltip>
                </div>
                <div>
                  Heizlast: <InlineEdit value={settingsDraft.oHeizlast ?? result.heizlastKw} onCommit={v => updateSettings({ oHeizlast: v })} unit=" kW" min={3} max={40} step={0.5} width={60} fmt={v => (Math.round(v * 10) / 10).toString().replace(".", ",")} />
                  <span style={{ fontSize: v("--font-size-small"), color: v('--color-text-muted') }}>
                    {" "}· Anlage {result.auslegungKw.toLocaleString("de-DE")} kW
                  </span>
                  <InfoTooltip title="Heizlast und Anlagengröße" ariaLabel="Was ist die Heizlast?">
                    Die <strong>Heizlast</strong> ist die Leistung, die dein Gebäude am kältesten Tag braucht — wir schätzen sie aus Wohnfläche, Dämmzustand und Haustyp. <strong>Hast du eine Berechnung nach DIN EN 12831 vom Energieberater oder Heizungsbauer? Trag den Wert hier ein</strong>, dann rechnen alle Kosten damit.<br /><br />
                    Die <strong>Anlage</strong> wird bewusst kleiner ausgelegt als die Heizlast ({Math.round(DEFAULT_HEATPUMP_CONFIG.auslegungsfaktor * 100)} %): Die wenigen extrem kalten Stunden im Jahr deckt der eingebaute Heizstab günstiger ab, als wenn man die Wärmepumpe das ganze Jahr überdimensioniert betreibt. Diese Anlagengröße bestimmt den Preis.
                  </InfoTooltip>
                </div>
                <div>
                  Wärmepumpe:{" "}
                  <SelectField value={settingsDraft.wpType} onChange={e => { updateSettings({ wpType: e.target.value as "lwwp" | "swwp", oJaz: null }); }} ariaLabel="Bauart der Wärmepumpe" size="sm" ton="akzent">
                    {WP_TYPE.map(w => <option key={w.id} value={w.id}>{w.label}</option>)}
                  </SelectField>
                </div>
                <div><GlossaryTerm id="jaz">JAZ (Jahresarbeitszahl)</GlossaryTerm>: <InlineEdit value={settingsDraft.oJaz ?? result.jaz} onCommit={v => updateSettings({ oJaz: v })} unit="" min={2.0} max={5.5} step={0.1} width={60} fmt={v => v.toFixed(2).replace(".", ",")} /></div>

              </div>

              </section>
              </div>
              }
              <FlowNav zurueckLabel="Abbrechen" onZurueck={() => setSettingsOpen(false)} weiterLabel="Ergebnis neu berechnen" weiterAktiv={settingsChanged} inaktivHinweis="Ändere zuerst eine Angabe." onWeiter={() => {
                if (!settingsDraft) return;
                setHaustypIdx(settingsDraft.haustypIdx); setCustomFlaeche(settingsDraft.wohnflaeche); setInsulationIdx(settingsDraft.insulationIdx); setHeizsystem(settingsDraft.heizsystem); setWpType(settingsDraft.wpType);
                setOQges(settingsDraft.oQges); setOHeizlast(settingsDraft.oHeizlast); setOJaz(settingsDraft.oJaz); setOFossilInvest(settingsDraft.oFossilInvest);
                setSettingsOpen(false); showUpdatedResult();
              }} />
            </Modal>
          </div>


            <div className="wp-result-controls">
            <Modal open={fundingCheckOpen} onClose={() => setFundingCheckOpen(false)} title="Dein Fördercheck" intro="Wir prüfen mögliche zusätzliche Boni. Deine Rechnung wird erst beim Übernehmen geändert." maxWidth={640}>
              <div className="wp-calculator-page wp-funding-flow wp-funding-modal">
                {fundingCheckStage === "timing" && <>
                  <h3>Zeitpunkt der Antragstellung</h3>
                  <BegStandSchalter stand={fundingDraft.stand} setStand={stand => setFundingDraft(previous => ({ ...previous, stand }))}
                    betragJetzt={draftFundingFor(stufeJetzt, false).amount} betragNaechsteOhneEu={stufeNaechste ? draftFundingFor(stufeNaechste, false).amount : 0} betragNaechsteMitEu={stufeNaechste ? draftFundingFor(stufeNaechste, true).amount : 0}
                    jetzt={stufeJetzt} naechste={stufeNaechste} euUrsprung={fundingDraft.eu} setEuUrsprung={eu => setFundingDraft(previous => ({ ...previous, eu }))} />
                  <FlowNav weiterAktiv onWeiter={() => setFundingCheckStage("questions")} />
                </>}
                {fundingCheckStage === "questions" && <BegFundingQuestions progressive unknownAgeBonus={false}
                  screen={fundingDraftQuestion} onEditScreen={setFundingDraftQuestion}
                  stufe={fundingDraftStage} go={next => { setFundingDraftQuestion(next); if (next === "result") setFundingCheckStage("review"); }}
                  setNeubau={() => {}} setSelbstnutzer={() => {}}
                  onHeatingCategory={category => { fundingDraftCategory.current = category; }}
                  setFossil={enabled => setFundingDraft(previous => ({ ...previous, heating: fundingDraftCategory.current === "fossil" ? "oel_kohle" : fundingDraftCategory.current === "other" ? "andere" : enabled ? "gas_alt" : "gas_neu" }))}
                  setAlterUnbekannt={ageUnknown => setFundingDraft(previous => ({ ...previous, ageUnknown }))}
                  setEinkommen={key => setFundingDraft(previous => ({ ...previous, income: key === "t30000" ? "bis30" : key === "t40000" ? "bis40" : key === "t50000" ? "bis50" : key === "t60000" ? "bis60" : "none", child: key === "none" ? false : previous.child }))}
                  setKind={child => setFundingDraft(previous => ({ ...previous, child }))} />}
                {fundingCheckStage === "review" && <>
                  <p>Nach deinen Angaben: <strong>{Math.round(fundingDraftResult.rate * 100)} % Förderung · {fundingDraftResult.amount.toLocaleString("de-DE")} €</strong></p>
                  {fundingDraft.ageUnknown && <p>Ohne bestätigtes Heizungsalter rechnen wir keinen Austauschbonus ein.</p>}
                  <FlowNav weiterAktiv weiterLabel="Ergebnis neu berechnen" onWeiter={applyFundingCheck} onZurueck={() => { setFundingDraftQuestion("heizung"); setFundingCheckStage("questions"); }} />
                </>}
              </div>
            </Modal>
            <Toast alignTo={overviewRef} tone="awareness" open={isResult && situation === "bestand" && !fundingConfirmed && resultIntro.progress === 1 && !fundingPromptDismissed && !fundingCheckOpen && !fundingNotice} onClose={() => setFundingPromptDismissed(true)}>
              <span className="wp-funding-toast-content">Eventuell mehr Förderung möglich
                <button type="button" onClick={openFundingCheck}>Fördercheck machen</button>
              </span>
            </Toast>
            <Toast alignTo={overviewRef} tone="awareness" open={fundingNotice} onClose={() => setFundingNotice(false)}>
              <span className="wp-funding-toast-content">Förderung geändert · Ergebnis aktualisiert
                <button type="button" onClick={showUpdatedResult}>Zum neuen Ergebnis</button>
              </span>
            </Toast>

            <Modal open={saveOpen} onClose={() => setSaveOpen(false)} title="Ergebnis speichern" intro="Lade eine Textdatei mit deinem Ergebnis und einem Link zu allen Angaben herunter. Damit kannst du die Berechnung später wieder öffnen.">
              <div className="wp-result-actions"><button type="button" className="wp-save-primary" onClick={saveResult}>Datei herunterladen</button></div>
            </Modal>
            <Modal open={resetOpen} onClose={() => setResetOpen(false)} title="Neu berechnen?" intro="Aktuelle Infos gehen verloren. Speichere dein Ergebnis, wenn du es behalten möchtest.">
              <div className="wp-result-actions"><button type="button" onClick={() => setResetOpen(false)}>Abbrechen</button><button type="button" onClick={resetCalculation}>Neu berechnen</button></div>
            </Modal>
            <Modal open={forwardOpen} onClose={() => setForwardOpen(false)} title="Ergebnis weiterleiten" intro="Der Link enthält deine Angaben und öffnet direkt die Berechnung.">
              <div className="wp-result-actions"><button type="button" onClick={handleCopy}>{copied ? "Link kopiert" : "Link kopieren"}</button><a href={`mailto:?subject=${encodeURIComponent("Meine Wärmepumpen-Rechnung")}&body=${encodeURIComponent(shareText()+"\n"+(typeof window !== "undefined" ? buildShareUrl() : ""))}`}>Per E-Mail weiterleiten</a></div>
            </Modal>

            </div>
            {/* Modal: alle erklärenden Grüngas-Texte gebündelt (Modal-Baustein →
                Transitions/Fokus/Bottom-Sheet kommen aus components/Modal.tsx). */}
            <Modal open={showGasInfo} onClose={() => setShowGasInfo(false)} title="Grüngas-Pflicht: was dahintersteckt" intro="Warum eine neue Gasheizung durch das Heizungsgesetz teurer wird — und wie wir das rechnen." maxWidth={560}>
              {/* Kernaussage */}
              <div style={{ padding: "10px 12px", borderRadius: v('--radius-md'), background: v('--color-chart-positive-bg'), marginBottom: 18, fontSize: v("--font-size-small"), lineHeight: 1.6, color: v('--color-text-secondary') }}>
                Durch die Grüngas-Pflicht spart die Wärmepumpe über {DEFAULT_HEATPUMP_CONFIG.years} Jahre{" "}
                <span style={{ fontWeight: 700, fontFamily: v('--font-mono'), color: v('--color-positive') }}>+{greenGasDelta.toLocaleString("de-DE")} €</span>{" "}mehr als bei reiner Preisfortschreibung.
              </div>
              {/* Chart B: Heizkosten je kWh Wärme */}
              <div style={{ fontSize: v("--font-size-caption"), fontWeight: 700, color: v('--color-text-muted'), textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 2 }}>Heizkosten je Kilowattstunde Wärme</div>
              <div style={{ fontSize: v("--font-size-caption"), color: v('--color-text-muted'), marginBottom: 8 }}>Gasheizung mit Grüngas-Pflicht gegen Wärmepumpe, {YEAR}–{YEAR + DEFAULT_HEATPUMP_CONFIG.years - 1}</div>
              <HeatCostCompareChart data={heatCostData} pvCoveragePct={Math.round(pvCoverageForChart * 100)} />
              {/* Chart A: Gaspreis-Zusammensetzung */}
              <div style={{ fontSize: v("--font-size-caption"), fontWeight: 700, color: v('--color-text-muted'), textTransform: "uppercase", letterSpacing: "0.06em", margin: "20px 0 2px" }}>Woraus sich der Gaspreis zusammensetzt</div>
              <div style={{ fontSize: v("--font-size-caption"), color: v('--color-text-muted'), marginBottom: 8 }}>Endkundenpreis in ct/kWh — der Biomethan-Block wächst mit der Bio-Treppe</div>
              <GasPriceStackChart data={gasStackData} />
              {/* Erklärabschnitte */}
              <div style={{ fontSize: v("--font-size-body"), lineHeight: 1.6, color: v('--color-text-secondary'), marginTop: 22, borderTop: `1px solid ${v('--color-border')}`, paddingTop: 16 }}>
                {[
                  { h: "Die Bio-Treppe (§ 43 GModG)", p: `Das Gebäudemodernisierungsgesetz verpflichtet eine Heizung für Gas, Heizöl oder Flüssiggas, die nach dem ${GMODG_RECHTSSTAND.inKraftSeit} neu eingebaut wird — beim Einbau in ein bestehendes Gebäude ebenso wie in Neubauten, die bis zum ${GMODG_RECHTSSTAND.neubauBioTreppeBis} errichtet werden —, ab 2029 einen wachsenden Anteil klimafreundlicher Brennstoffe beizumischen. Das Gesetz nennt vier Stufen: ${bioTreppeStufenText()}. Anrechenbar sind neben Biomethan auch Bioheizöl, biogenes Flüssiggas sowie grüner, blauer, orangener oder türkiser Wasserstoff und dessen Derivate; beim Netzgas läuft es auf Biomethan hinaus, und das kostet rund doppelt so viel wie Erdgas. Zusammen mit steigenden Netzentgelten — weil immer weniger Haushalte am Gasnetz hängen — treibt das den Gaspreis deutlich stärker als die allgemeine Teuerung. Statt beizumischen lässt sich die Pflicht auch über Solarthermie, eine Lüftungsanlage mit Wärmerückgewinnung oder eine Wärmepumpen-Hybridheizung erfüllen (§ 43 Absatz 3 bis 5 GModG); fällt die alte Anlage irreparabel aus, bleibt zwölf Monate lang die Stufe stehen, die beim Einbau galt (§ 43 Absatz 7 GModG). Wir rechnen den teuersten Weg, die reine Beimischung.` },
                  { h: "Beschlossen ist die Pflicht, nicht der Preis", p: `${gmodgStandSatz()} Wie teuer Biomethan und Netzentgelte tatsächlich werden, ist dagegen eine Annahme — ein plausibler Korridor, keine punktgenaue Prognose. Ebenfalls Annahme ist der Weg nach 2040: Eine 100-%-Stufe steht nicht im Gesetz, die vollständige Klimaneutralität ab 2045 kündigt § 42a GModG nur an — als Quote für die Brennstoff-Anbieter, die dann auch Bestandsheizungen verteuern würde. Sie soll bis zum ${GMODG_RECHTSSTAND.quoteGesetzBis} in einem eigenen Gesetz geregelt werden; die Gesetzesbegründung geht von einem Start 2028 mit bis zu einem Prozent aus, im Gesetzestext steht das nicht. Wir rechnen sie nicht mit. Die drei Preis-Szenarien zeigen den Gegenfall: reine Energiepreis-Fortschreibung ohne die Grüngas-Pflicht.` },
                  { h: "Warum wir je Kilowattstunde Wärme rechnen", p: "Gas- und Strompreis lassen sich nicht direkt vergleichen: Eine Wärmepumpe macht aus einer Kilowattstunde Strom rund drei Kilowattstunden Wärme, ein Gaskessel aus einer Kilowattstunde Gas nur knapp eine. Deshalb rechnen wir beide auf die Kosten pro gelieferter Kilowattstunde Wärme um — die Jahresarbeitszahl der Wärmepumpe und der Kesselwirkungsgrad sind darin enthalten. Grundgebühr und Wartung bleiben außen vor, sie gehören nicht in einen Preis-je-Kilowattstunde-Vergleich." },
                  { h: "Quelle", p: "IW-Report 36/2026 „Wie hoch sind die Mehrkostenrisiken durch das Gebäudemodernisierungsgesetz?“ (Henger, Küper, Wünsch — Institut der deutschen Wirtschaft, Juli 2026). Die Preispfade stammen aus dem Anhang der Studie." },
                ].map((s, i) => (
                  <div key={i} style={{ marginTop: i === 0 ? 0 : 14 }}>
                    <div style={{ fontSize: v("--font-size-body"), fontWeight: 700, color: v('--color-text-primary'), marginBottom: 4 }}>{s.h}</div>
                    <p style={{ margin: 0 }}>{s.p}</p>
                  </div>
                ))}
              </div>
            </Modal>

          </div>
          </div>
        )}

        {/* Der Aktualisierungsstand steht INNERHALB der Rechner-Spalte, nicht
            unter ihr: Der Rahmen ist mindestens bildschirmhoch, ein Absatz
            dahinter läge hinter einer leeren Fläche und wäre praktisch
            unsichtbar. Im eingebetteten Widget entfällt er — dort trägt die
            einbettende Seite die Quellenangabe. */}
        {!embedded && <StandNoteView seite={stand} variant="cards" />}
      </div>
    </div>
  );
}

// ─── Helpers ───────────────────────────────────────────────────

// Transparente Aufschlüsselung, wie die Einsparung zustande kommt (20-J-TCO).
// sanierungHinweis: erklärt, warum ein Sanierungs-Weg wirtschaftlich oft
// schwächer aussieht (weniger Heizbedarf = weniger ersetztes Gas).
function TcoBreakdown({ r, jahre, sanierungHinweis, refLabel }: { r: HeatPumpResult; situation: "bestand" | "neubau"; jahre: number; sanierungHinweis?: boolean; refLabel: string }) {
  const euro = (n: number) => `${n.toLocaleString("de-DE")} €`;
  const Row = ({ label, val, strong, minus }: { label: string; val: number; strong?: boolean; minus?: boolean }) => (
    <div style={{ display: "flex", justifyContent: "space-between", gap: 16, padding: "6px 0", fontWeight: strong ? 700 : 400 }}>
      <span>{minus ? "− " : ""}{label}</span>
      <span style={{ fontFamily: v('--font-mono'), whiteSpace: "nowrap" }}>{euro(val)}</span>
    </div>
  );
  return (
    <div className="wp-cost-breakdown" style={{ fontSize: v("--font-size-body"), lineHeight: 1.5 }}>
      <p className="wp-cost-period">Kosten über {jahre} Jahre</p>
      <div style={{ marginBottom: 8 }}>
        <div style={{ fontWeight: 700, marginBottom: 2 }}>Wärmepumpe kostet</div>
        <Row label="Anschaffung inklusive Installation" val={r.investBrutto} />
        {r.beg.amount > 0 && <Row label="Förderung" val={-r.beg.amount} />}
        <Row label="Anschaffung nach Förderung" val={r.investNetto} strong />
        <Row label="Strom" val={r.stromKosten} />
        <Row label="Wartung + Grundpreis Zähler" val={r.wartungWp} />
        {r.pvBenefit > 0 && <Row label="Vorteil durch die Solaranlage" val={-r.pvBenefit} />}
        <div style={{ borderTop: `1px solid ${v('--color-border')}`, marginTop: 2, paddingTop: 2 }}><Row label="Summe" val={r.tcoWp} strong /></div>
      </div>
      <div style={{ marginBottom: 8 }}>
        <div style={{ fontWeight: 700, marginBottom: 2 }}>{r.gasInvest > 0 ? `Neue ${refLabel} kostet` : `Weiterbetrieb ${refLabel} kostet`}</div>
        {r.gasInvest > 0 && <Row label="Anschaffung" val={r.gasInvest} />}
        <Row label="Brennstoff (inkl. steigendem CO₂-Preis)" val={r.gasKosten} />
        {/* Grundgebühr nur zeigen, wenn es sie gibt — beim Öltank hängt an keinem
            Anschluss eine laufende Gebühr, eine „0 €"-Zeile wäre nur Rauschen. */}
        {r.gasFix > 0 && <Row label="Grundgebühr" val={r.gasFix} />}
        <Row label="Wartung" val={r.gasWartung} />
        <div style={{ borderTop: `1px solid ${v('--color-border')}`, marginTop: 2, paddingTop: 2 }}><Row label="Summe" val={r.tcoGas} strong /></div>
      </div>
      <div style={{ borderTop: `1px solid ${v('--color-border')}`, paddingTop: 6 }}>
        <Row label={r.tcoEinsparung >= 0 ? "Einsparung insgesamt" : "Mehrkosten insgesamt"} val={Math.abs(r.tcoEinsparung)} strong />
      </div>
      {sanierungHinweis && (
        <div style={{ marginTop: 8, paddingTop: 8, borderTop: `1px solid ${v('--color-border')}`, color: v('--color-text-muted'), lineHeight: 1.5 }}>
          {/* DIESER SATZ STAND FRÜHER UNTER DER WEGE-LISTE. Als sie am
              27.08.2026 zur Reiterzeile über der Zahl wurde, hatte er dort
              keinen Platz mehr und wäre beinahe ersatzlos verschwunden — beim
              Zusammenführen mit dem Hauptstand am 05.09.2026 ist genau das
              passiert und hier wieder behoben.

              Er muss ZUERST kommen: Ohne ihn liest sich ein Sanierungsweg wie
              geschenktes Geld — die Zahl daneben ist um Zehntausende größer,
              und die Kosten, die sie erzeugt haben, stehen nirgends. */}
          <strong style={{ color: v('--color-text-primary') }}>Die Sanierungskosten sind hier nicht enthalten.</strong>{" "}
          Die Dämmung zahlst du fürs Gebäude — Komfort, Werterhalt, dauerhaft weniger Heizenergie —, nicht für die Wärmepumpe. Der Heizkörpertausch steckt dagegen in der Investition: den macht man nur für sie.
          <div style={{ marginTop: 8 }}>
            Warum oft weniger als „nur Heizkörper tauschen"? Die Dämmung senkt den Heizbedarf — die Wärmepumpe ersetzt dadurch <strong>weniger teures Gas</strong>, also fällt die reine WP-Ersparnis kleiner aus. Der eigentliche Nutzen der Dämmung (dauerhaft weniger Energie und CO₂, egal mit welchem Heizsystem) steckt bewusst nicht in dieser Zahl — sie zeigt nur, wie sich die Wärmepumpe gegenüber Gas rechnet.
          </div>
        </div>
      )}
    </div>
  );
}

function StatCard({ label, value, unit, positive, help, helpTitle, helpAriaLabel }: { label: string; value: string; unit?: string; positive: boolean; help?: ReactNode; helpTitle?: string; helpAriaLabel?: string }) {
  return (
    <div style={{ padding: "14px 12px", borderRadius: v('--radius-md'), background: v('--color-bg'), border: `1px solid ${v('--color-border')}`, textAlign: "center" }}>
      <div style={{ fontSize: v("--font-size-micro"), fontWeight: 700, color: v('--color-text-muted'), textTransform: "uppercase", letterSpacing: "0.04em", marginBottom: 4, display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 3 }}>
        {label}
        {help && <InfoTooltip title={helpTitle} ariaLabel={helpAriaLabel ?? "Mehr Infos"} size={iconSizes.sm}>{help}</InfoTooltip>}
      </div>
      <div style={{ fontSize: v("--font-size-h3"), fontWeight: 800, fontFamily: v('--font-mono'), color: positive ? v('--color-positive') : v('--color-text-primary') }}>{value}{unit && <> <span className="wp-stat-unit">{unit}</span></>}</div>
    </div>
  );
}

// BEG Einkommens-Bonus (KfW 458 ab 21.07.2026): gestaffelt nach zu versteuerndem
// Haushaltsjahreseinkommen. Das repräsentative Einkommen pro Stufe reicht, weil die
// Rechen-Engine (calcBegSubsidy) daraus die Stufe + den Familienzuschlag ableitet.
type EinkommenKey = "none" | "bis60" | "bis50" | "bis40" | "bis30";
const EINKOMMEN_OPTIONS: { key: EinkommenKey; label: string; income?: number }[] = [
  { key: "none",  label: "über 60.000 € / kein Bonus" },
  { key: "bis60", label: "bis 60.000 € (Familienzuschlag prüfen)", income: 60000 },
  { key: "bis50", label: "bis 50.000 € (+10 %)", income: 50000 },
  { key: "bis40", label: "bis 40.000 € (+30 %)", income: 40000 },
  { key: "bis30", label: "bis 30.000 € (+40 %)", income: 30000 },
];
const einkommenIncome = (k: EinkommenKey): number | undefined => EINKOMMEN_OPTIONS.find(o => o.key === k)?.income;

// Welche alte Heizung ersetzt wird, entscheidet über den Klima-Geschwindigkeits-Bonus:
// Öl/Kohle/Nachtspeicher zählen unabhängig vom Alter, Gas/Biomasse erst ab 20 Jahren.
type AltheizungKey = "oel_kohle" | "gas_alt" | "gas_neu" | "andere";
// Die Gas-ETAGENHEIZUNG steht bewusst in der altersfreien Zeile und nicht bei den
// übrigen Gasheizungen: Das Merkblatt zählt sie wörtlich neben Öl, Kohle und
// Nachtstromspeicher auf, „unabhängig von deren Alter" (KfW-Merkblatt 458,
// Stand 07/2026, S. 3, am 25.08.2026 im Volltext gelesen —
// docs/quellen/KfW-Merkblatt-458_BEG-Heizungsfoerderung_2026-07.pdf).
// Vorher fehlte sie ganz. Wer eine Gas-Etagenheizung unter 20 Jahren hatte,
// landete zwangsläufig in der Zeile ohne Bonus und bekam 16 % Förderung nicht
// gerechnet — ein Fehler, den man dem Ergebnis nicht ansieht, weil die Zahl
// einfach kleiner ist. Deshalb nennen die Gas-Zeilen jetzt ausdrücklich die
// ZENTRALheizung: „Gas" allein ließ beide Lesarten zu.
const ALTHEIZUNG_OPTIONS: { key: AltheizungKey; label: string; shortLabel?: string; klima: boolean }[] = [
  { key: "oel_kohle", label: "Öl, Kohle, Nachtspeicher oder Gas-Etagenheizung", klima: true },
  { key: "gas_alt", shortLabel: "Gas/Holz/Pellets: ab 20 Jahre", label: "Gas-Zentralheizung, Holz oder Pellets — 20 Jahre oder älter", klima: true },
  { key: "gas_neu", shortLabel: "Gas/Holz/Pellets: unter 20 Jahre", label: "Gas-Zentralheizung, Holz oder Pellets — jünger als 20 Jahre", klima: false },
  { key: "andere",    label: "Etwas anderes (z. B. schon Strom/Wärmepumpe)", klima: false },
];
const altheizungKlima = (k: AltheizungKey): boolean => ALTHEIZUNG_OPTIONS.find(o => o.key === k)?.klima ?? false;

function DetailGrid({ items }: { items: [string, string][] }) {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px 16px", marginBottom: 12 }}>
      {items.map(([label, value]) => (
        <div key={label}>
          <div style={{ color: v('--color-text-muted'), fontSize: v("--font-size-caption"), textTransform: "uppercase", letterSpacing: "0.04em" }}>{label}</div>
          <div style={{ fontFamily: v('--font-mono'), fontWeight: 600, color: v('--color-text-primary') }}>{value}</div>
        </div>
      ))}
    </div>
  );
}
