"use client";
import { useState, useMemo, useEffect, useRef, type ReactNode } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import FlowNav from "../../../components/FlowNav";
import {
  SITUATION, WOHNFLAECHEN, WP_M2_MIN, WP_M2_MAX, INSULATION_BESTAND, INSULATION_NEUBAU,
  PERSONEN, HEIZSYSTEM, WP_TYPE, WP_FUEL_OPTIONS, HAUSTYP_WP, YEAR, FUEL,
} from "../../../lib/constants";
import { waermeAusEndenergie, OEL_KWH_PRO_LITER } from "../../../lib/heat-consumption";
import { verbrauchSpecKwh } from "../../../lib/heatpump-core";
import { calcHeatPump, calcHeatPumpScenarios, heatPumpScenarioAdj, estimatePvCoverageOfWp, calcBegSubsidy, type HeatPumpInputs, type HeatPumpResult } from "../../../lib/heatpump";
import {
  DEFAULT_HEATPUMP_CONFIG,
  begStufeAm,
  begNaechsteStufe,
  type BegStand,
} from "../../../lib/heatpump-config";
import BegStandSchalter from "./_components/BegStandSchalter";
import { BEG_ANTRAG_KURZ, BEG_ANTRAG_HREF } from "../../../lib/beg-antrag";
import { greenGasApplies } from "../../../lib/fossil-reference";
import { gasMixSeries, heatCostComparisonSeries } from "../../../lib/greengas";
import { bioTreppeStufenText, gmodgStandSatz, GMODG_RECHTSSTAND } from "../../../lib/greengas-config";
import OptionCard from "../../../components/OptionCard";
import ResultSection from "../../../components/ResultSection";
import GebaeudeField, { GEBAEUDE_FIELDS } from "../../../components/GebaeudeField";
import StandNoteView from "../../../components/StandNoteView";
import { type StandSeite } from "../../../lib/stand-format";
import InlineEdit from "../../../components/InlineEdit";
import StandortField from "../../../components/StandortField";
import ResultFunding from "../../../components/ResultFunding";
import { stackFunding, programmeNebenBundesfoerderung, zeilenBisDeckel } from "../../../lib/funding-programs";
import { useFoerderung } from "../../../lib/use-foerderung";
import KfwFoerderpraxis, { kfwPraxisZusammenfassung } from "../../../components/KfwFoerderpraxis";
import { useKfwKreis } from "../../../lib/use-kfw-kreis";
import { type HeizungsfoerderungBund } from "../../../lib/kfw-format";
import {
  istGeteilterLink,
  wpAusParametern,
  wpZuParametern,
  type WpZustand,
} from "../../../lib/wp-share-state";
import HeatPumpChart from "./_components/HeatPumpChart";
import GasPriceStackChart from "../../../components/charts/GasPriceStackChart";
import HeatCostCompareChart from "../../../components/charts/HeatCostCompareChart";
import Modal from "../../../components/Modal";
import GlossaryTerm from "../../../components/GlossaryTerm";
import InfoTooltip from "../../../components/InfoTooltip";
import { IconArrowRight, IconRefresh, IconChevronDown, IconSun, IconSparkle, IconCheck, IconLink, IconShare, IconWhatsApp } from "../../../components/Icons";
import { v, iconSizes } from "../../../lib/theme";
import { trackEvent } from "../../../lib/analytics";
import { trackFunnelStep, type Funnel } from "../../../lib/analytics";

/** Einheit, in der ein Nutzer seinen Jahresverbrauch von der Abrechnung abliest. */
type VerbrauchEinheit = "gas" | "oel";

const STEPS = ["Situation", "Größe & Typ", "Dämmstandard", "Haushalt", "Heizsystem"];

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

  // ── Result overrides (editable) ──────────────────────────────
  const [oGasPrice, setOGasPrice] = useState<number | null>(null);
  const [oStromPrice, setOStromPrice] = useState<number | null>(null);
  const [oFuel, setOFuel] = useState<string>("gas_neu");
  const [oJaz, setOJaz] = useState<number | null>(null);
  const [oInvest, setOInvest] = useState<number | null>(null);
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
  const [wegId, setWegId] = useState("ist");  // aktiver Sanierungs-/Maßnahmen-Weg (Szenario-Vergleich)
  // ── Kommunale Förderung ──────────────────────────────────────
  // Der Wohnort wird bewusst NICHT im Frageweg erhoben: Er ändert nichts am
  // Gebäude und nichts an der Wärmepumpe, sondern nur daran, ob die Gemeinde
  // etwas dazugibt. Ein sechster Schritt für eine Frage, die bei den allermeisten
  // Orten „nein" ergibt, kostet mehr Abbrüche als er Nutzen bringt — deshalb
  // steht der Check im Ergebnis, wo er eine bereits gerechnete Zahl verbessert.
  const [plz, setPlz] = useState("");
  const foerderQuelle = useFoerderung("waermepumpe");
  // Der Kreisbezug hängt am Ort, den der Fördercheck ohnehin schon aufgelöst
  // hat — keine zweite Ortsfrage, kein Abruf ohne Ort.
  const kfwKreis = useKfwKreis(foerderQuelle.ags);
  const [fundingEnabled, setFundingEnabled] = useState(true);
  const [showDetails, setShowDetails] = useState(false);
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
  const ersatzInvest = oFossilInvest ?? DEFAULT_HEATPUMP_CONFIG.fossilErsatzInvest;
  const fuelOptions = WP_FUEL_OPTIONS.filter(f => ersatzInvest > 0 ? !f.bestandsanlage : !!f.bestandsanlage);
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
  const gruengasVerfuegbar = greenGasApplies({ fuelKind: fuel.kind, fossilInvest: ersatzInvest });
  const effScenario = !gruengasVerfuegbar && scenario === "gruengas" ? "realistic" : scenario;
  const greenGas = effScenario === "gruengas";
  // "Mehr erfahren"-Modal: sammelt alle erklärenden Texte zum Grüngas-Szenario.
  const [showGasInfo, setShowGasInfo] = useState(false);
  // Secondary-Block "Marktübliche Preissteigerung" (die 3 Preis-Modelle) auf-/zugeklappt.
  const [preisExpanded, setPreisExpanded] = useState(false);

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
    setWegId(z.weg);
    setSelbstnutzer(z.selbstnutzer);
    setAltheizung(z.altheizung);
    setEinkommen(z.einkommen);
    setKindImHaushalt(z.kindImHaushalt);
    setEuUrsprung(z.euUrsprung);
    setBegStand(z.begStand);
    setFundingEnabled(z.foerderungAn);
    setPvStatus(z.pvStatus);
    setPvKwp(z.pvKwp);
    setPvSpeicher(z.pvSpeicher);
    setOGasPrice(z.gaspreis);
    setOStromPrice(z.strompreis);
    setOJaz(z.jaz);
    setOInvest(z.investition);
    setOQges(z.heizwaerme);
    setOHeizlast(z.heizlast);
    setOFossilInvest(z.fossilInvest);
    if (z.plz) { setPlz(z.plz); void foerderQuelle.ausPlz(z.plz); }
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
    weg: wegId,
    selbstnutzer,
    altheizung,
    einkommen,
    kindImHaushalt,
    euUrsprung,
    begStand,
    foerderungAn: fundingEnabled,
    plz,
    pvStatus,
    pvKwp,
    pvSpeicher,
    gaspreis: oGasPrice,
    strompreis: oStromPrice,
    jaz: oJaz,
    investition: oInvest,
    heizwaerme: oQges,
    heizlast: oHeizlast,
    fossilInvest: oFossilInvest,
  });

  const buildShareUrl = () => {
    const p = wpZuParametern(shareZustand()).toString();
    return `${window.location.origin}${window.location.pathname}${p ? `?${p}` : ""}`;
  };

  /** Was in der Nachricht steht, bevor der Link kommt. */
  const shareText = () =>
    `Wärmepumpe statt ${fuel.refLabel}: ${sel.einsparungProJahr > 0 ? "spart" : "kostet"} ${Math.abs(sel.einsparungProJahr).toLocaleString("de-DE")} € im Jahr.`;

  const [copied, setCopied] = useState(false);
  const canShare = typeof navigator !== "undefined" && typeof navigator.share === "function";
  const shareBtnStyle = (aktiv?: boolean) => ({
    width: 40, height: 40, borderRadius: v('--radius-md'), cursor: "pointer" as const,
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
  const handleWhatsApp = () => {
    trackEvent("waermepumpe_geteilt");
    window.open(`https://wa.me/?text=${encodeURIComponent(`${shareText()}\n${buildShareUrl()}`)}`, "_blank");
  };

  const isResult = step >= STEPS.length;
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
      erfuellt: beantwortet.has("heizsystem") && beantwortet.has("wptyp"),
      hinweis: beantwortet.has("heizsystem")
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
  const applyVerbrauch = (raw: string, einheit: VerbrauchEinheit) => {
    const n = parseInt(raw);
    if (raw === "" || isNaN(n) || n <= 0) { setVerbrauchKwh(null); setOQges(null); return; }
    const endenergie = einheit === "oel" ? n * OEL_KWH_PRO_LITER : n;
    // Unplausibles gar nicht erst übernehmen (Tippfehler, Monats- statt Jahreswert).
    if (endenergie < 2000 || endenergie > 120000) { setVerbrauchKwh(null); setOQges(null); return; }
    const waerme = Math.round(waermeAusEndenergie(endenergie, einheit === "oel" ? FUEL.oil.efficiency : FUEL.gas.efficiency));
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
      investNetto: oInvest ?? undefined,
      stromPrice: oStromPrice ?? undefined,
      gasPrice: oGasPrice ?? fuel.price,
      gasEfficiency: fuel.efficiency,
      gasCo2: fuel.co2PerKwh,
      fossilErsatzInvest: oFossilInvest ?? undefined,
      // Beide Boni setzen Selbstnutzung voraus (KfW 458) — als Vermieter bleibt
      // nur die Grundförderung, deshalb hier weder Klima noch Einkommen.
      klimaBonus: selbstnutzer && altheizungKlima(altheizung),
      haushaltseinkommen: selbstnutzer ? einkommenIncome(einkommen) : undefined,
      kindImHaushalt: selbstnutzer && kindImHaushalt,
      // Nicht an die Selbstnutzung gebunden — anders als Klima- und
      // Einkommens-Bonus verlangt der Wertschöpfungs-Bonus sie nicht.
      euUrsprung,
    },
  }), [situation, wohnflaeche, insulationIdx, personen, heizsystem, wpType, heizkoerperTausch, haustypIdx, greenGas, pvStatus, pvKwp, pvSpeicher, oQges, oHeizlast, oJaz, oInvest, oStromPrice, oGasPrice, oFossilInvest, fuel, selbstnutzer, altheizung, einkommen, kindImHaushalt, begStufe, euUrsprung]);

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
  const foerderAktiv = fundingEnabled && oInvest === null && situation === "bestand";
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
    // Ein Schritt die Dämm-Leiter hinauf — von unsaniert auf teilsaniert bzw. von
    // teilsaniert auf gut saniert.
    if (insulationIdx <= 1) {
      list.push({ id: "teil", titel: "Schrittweise Sanierung", kurz: "Dach/Fassade dämmen + passende Heizflächen", sanierung: true, patch: { insulationIdx: insulationIdx + 1, ...(heizsystem === "hk_alt" ? { heizkoerperTausch: true } : {}) } });
    }
    if (insulationIdx < INSULATION_BESTAND.length - 1) {
      // Zielstufe ist die oberste (vollsaniert), nicht mehr die dritte — sonst hieße
      // der Weg „Vollsanierung" und landete doch nur bei „gut saniert".
      // Niedertemperatur-Heizkörper statt Gratis-Fußbodenheizung: deren Kosten
      // zählen (ehrlich), sonst stünde die Vollsanierung künstlich zu gut da.
      list.push({ id: "voll", titel: "Vollsanierung", kurz: "Rundum-Dämmung + Niedertemperatur-Heizflächen", sanierung: true, patch: { insulationIdx: INSULATION_BESTAND.length - 1, ...(heizsystem === "hk_alt" ? { heizkoerperTausch: true } : {}) } });
    }
    return list;
  }, [situation, heizsystem, insulationIdx]);

  // Wege-Vergleich (und die Ist-Konklusion) mit dem gewählten Szenario rechnen,
  // damit sie nicht dem oben gewählten Szenario widersprechen. Die editierbaren
  // Detailwerte laufen weiter über `result` (Basisfall).
  const wegeResults = useMemo(() => wege.map(w => ({ ...w, r: calcHeatPump({ ...inputs, ...w.patch }, cfg, heatPumpScenarioAdj(effScenario, cfg)) })), [wege, inputs, cfg, effScenario]);
  const istResult = wegeResults.find(w => w.id === "ist")?.r ?? calcHeatPump(inputs, cfg);
  /** Mehrpreis der Wärmepumpe gegenüber der fossilen Alternative im Ist-Zustand. */
  const istMehrkosten = istResult.investNetto - istResult.gasInvest;
  const istNegativ = istResult.tcoEinsparung < 0;
  const istKnapp = istResult.amortisationsJahre === null || istResult.amortisationsJahre > 15 || istNegativ;
  // Wege dauerhaft zeigen (nicht an die knappe istKnapp-Schwelle koppeln — sonst
  // erscheinen/verschwinden Wege + Konklusion beim kleinsten Wertwechsel). Die
  // Konklusion rahmt das Ergebnis adaptiv (unwirtschaftlich / kaum / rechnet sich).
  const zeigeWege = situation === "bestand" && wege.length > 1;

  const activeWeg = (zeigeWege ? wegeResults.find(w => w.id === wegId) : null) ?? wegeResults.find(w => w.id === "ist");
  const activeInputs = useMemo(() => ({ ...inputs, ...(activeWeg?.patch ?? {}) }), [inputs, activeWeg]);
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
      klimaBonus: selbstnutzer && altheizungKlima(altheizung),
      haushaltseinkommen: selbstnutzer ? einkommenIncome(einkommen) : undefined,
      kindImHaushalt: selbstnutzer && kindImHaushalt,
    };
    const fuer = (stufe: typeof stufeJetzt, eu: boolean) =>
      calcBegSubsidy(situation, wpType, result.investBrutto, { ...opts, stufe, euUrsprung: eu }, cfg).amount;
    return {
      // Heute gibt es den EU-Bonus noch nicht — der Schalter wäre hier wirkungslos.
      jetzt: fuer(stufeJetzt, false),
      naechsteOhneEu: stufeNaechste ? fuer(stufeNaechste, false) : 0,
      naechsteMitEu: stufeNaechste ? fuer(stufeNaechste, true) : 0,
    };
  }, [situation, wpType, result.investBrutto, cfg, selbstnutzer, altheizung, einkommen, kindImHaushalt, stufeJetzt, stufeNaechste]);

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
    if (oInvest !== null) {
      return "Die Investition ist von Hand gesetzt — darin steckt der Preis, den du tatsächlich zahlst, also samt Förderung. Der Zuschuss wird deshalb nicht noch einmal abgezogen.";
    }
    if (!fundingEnabled || foerderStack.total === 0) return undefined;
    if (kappung >= foerderStack.total) return undefined;
    const grenze = Math.round(DEFAULT_HEATPUMP_CONFIG.begKumulierungsGrenze * 100);
    return result.kommunal.spielraum === 0
      ? `Bundesförderung und kommunaler Zuschuss zusammen dürfen ${grenze} % der geförderten Kosten nicht übersteigen. Deine BEG-Förderung schöpft das bereits aus, deshalb ist der kommunale Zuschuss hier nicht eingerechnet — beantragen kannst du ihn trotzdem, entschieden wird es im Bescheid.`
      : `Bundesförderung und kommunaler Zuschuss zusammen dürfen ${grenze} % der geförderten Kosten nicht übersteigen. Neben deiner BEG-Förderung bleiben davon ${result.kommunal.spielraum.toLocaleString("de-DE")} € — mehr wird nicht angerechnet.`;
  }, [oInvest, fundingEnabled, foerderStack.total, kappung, result.kommunal.spielraum]);
  // Die drei Preis-Szenarien rechnen bewusst OHNE Grüngas-Pflicht — sie zeigen die
  // reine Energiepreis-Bandbreite ("was, wenn die Pflicht doch nicht greift").
  const scenariosPlain = useMemo(() => calcHeatPumpScenarios({ ...activeInputs, greenGas: false }, cfg), [activeInputs, cfg]);
  // Gesetzes-Fall: Grüngas-Pflicht (Bio-Treppe) mit realistischen Nebenannahmen
  // (Strompreis/Arbeitszahl wie "realistisch", Gaspreis-Mittelpfad). Reale Rechtslage.
  const gruengasResult = useMemo(() => calcHeatPump({ ...activeInputs, greenGas: true }, cfg, heatPumpScenarioAdj("realistic", cfg)), [activeInputs, cfg]);

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
  const spanne = useMemo(() => {
    const werte = scenariosPlain.map(s => s.tcoEinsparung);
    if (gruengasVerfuegbar) werte.push(gruengasResult.tcoEinsparung);
    return { min: Math.min(...werte), max: Math.max(...werte) };
  }, [scenariosPlain, gruengasResult, gruengasVerfuegbar]);

  // Amortisationskurve: beim Gesetzes-Fall die Grüngas-Kurve hervorgehoben (grün) +
  // die 3 Preis-Szenarien als graue Vergleichslinien; sonst die 3 in Ampelfarben.
  const chartScenarios = greenGas
    ? [
        ...scenariosPlain.map(s => ({ id: s.id, color: v('--color-text-muted'), years: s.years, amortisationsJahre: s.amortisationsJahre })),
        { id: "gruengas", color: v('--color-positive'), years: gruengasResult.years, amortisationsJahre: gruengasResult.amortisationsJahre },
      ]
    : scenariosPlain.map(s => ({ id: s.id, color: s.color, years: s.years, amortisationsJahre: s.amortisationsJahre }));

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

  // Weg wechseln: baubezogene Overrides zurücksetzen, damit der Weg sauber greift
  const selectWeg = (id: string) => {
    setWegId(id);
    setOQges(null); setOJaz(null); setOInvest(null); setOHeizlast(null);
  };

  const insulationOptions = situation === "bestand" ? INSULATION_BESTAND : INSULATION_NEUBAU;
  // Der Gebäudezustand als Kopfzeile des Ergebnis-Abschnitts.
  const gebaeudeZusammenfassung = () =>
    `${HAUSTYP_WP[haustypIdx].label} · ${wohnflaeche} m² · ${insulationOptions[insulationIdx]?.label}`;

  // ── Render ───────────────────────────────────────────────────
  return (
    <div style={{ background: v('--color-bg'), fontFamily: v('--font-text'), color: v('--color-text-primary'), minHeight: embedded ? undefined : "100vh", padding: embedded ? 0 : "0 16px 20px" }}>
      <div style={{ maxWidth: embedded ? "100%" : v('--page-max-width'), margin: "0 auto" }}>
        {!embedded && (
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
        )}

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
                  <OptionCard key={s.id} selected={beantwortet.has("situation") && situation === s.id} onClick={() => {
                    setSituation(s.id as "bestand" | "neubau");
                    setInsulationIdx(1); // reset to middle when switching
                    markBeantwortet("situation");
                  }} label={s.label} sub={s.sub} />
                ))}
              </div>
            )}

            {/* 1: Wohnfläche */}
            {step === 1 && (
              <div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 12 }}>
                  {WOHNFLAECHEN.map((f, i) => (
                    <OptionCard key={i} group="flaeche" selected={beantwortet.has("flaeche") && customFlaeche === null && flaecheIdx === i} onClick={() => { setFlaecheIdx(i); setCustomFlaeche(null); markBeantwortet("flaeche"); }} label={f.label} sub={f.sub} />
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
                          // Ein eingetragener eigener Wert beantwortet die Frage
                          // genauso wie eine der Karten darüber.
                          if (!isNaN(n) && n >= WP_M2_MIN && n <= WP_M2_MAX) { setCustomFlaeche(n); markBeantwortet("flaeche"); }
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
                    <OptionCard key={h.id} group="haustyp" selected={beantwortet.has("haustyp") && haustypIdx === i} onClick={() => { setHaustypIdx(i); markBeantwortet("haustyp"); }} label={h.label} sub={h.sub} />
                  ))}
                </div>
                <div style={{ fontSize: 12, color: v('--color-text-muted'), marginTop: 10, lineHeight: 1.5 }}>
                  Geteilte Wände mit Nachbarn senken den Wärmeverlust — ein Reihenhaus braucht eine kleinere (günstigere) Wärmepumpe als ein freistehendes Haus gleicher Größe.
                </div>
              </div>
            )}

            {/* 2: Dämmstandard */}
            {step === 2 && (
              <div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: 8 }}>
                  {insulationOptions.map((opt, i) => (
                    // Angezeigt wird der erwartete VERBRAUCH, nicht der Norm-Bedarf:
                    // Diese Zahl kann ein Bewohner mit seiner Abrechnung vergleichen,
                    // die Normzahl nicht (siehe lib/heat-consumption.ts).
                    <OptionCard key={i} selected={beantwortet.has("daemmung") && insulationIdx === i} onClick={() => { setInsulationIdx(i); markBeantwortet("daemmung"); }} label={opt.label} sub={`${opt.sub} · ~${verbrauchSpecKwh(situation, i, cfg)} kWh/m²·a`} />
                  ))}
                </div>

                {/* Wer seine Abrechnung kennt, muss nicht schätzen. Der gemessene
                    Verbrauch schlägt jeden Kennwert — er ersetzt den Jahresbedarf,
                    NICHT die Heizlast (die Anlagengröße bleibt am Dämmstandard). */}
                {situation === "bestand" && (
                  <div style={{ marginTop: 20, padding: "14px 16px", borderRadius: v('--radius-md'), background: verbrauchKwh !== null ? v('--color-accent-dim') : v('--color-bg-muted'), border: `2px solid ${verbrauchKwh !== null ? v('--color-accent') : v('--color-border')}` }}>
                    <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 4 }}>
                      Du kennst deinen Verbrauch? Dann rechnen wir damit.
                    </div>
                    <div style={{ fontSize: 12, color: v('--color-text-muted'), lineHeight: 1.5, marginBottom: 10 }}>
                      Der Wert von deiner letzten Jahresabrechnung ist genauer als jede Schätzung aus Fläche und Baujahr. Warmwasser ist mit drin, wenn deine Heizung es macht.
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                      <input
                        type="text" inputMode="numeric"
                        placeholder={verbrauchEinheit === "oel" ? "z. B. 2000" : "z. B. 18000"}
                        value={verbrauchDraft}
                        onChange={e => {
                          const raw = e.target.value.replace(/\D/g, "");
                          setVerbrauchDraft(raw);
                          applyVerbrauch(raw, verbrauchEinheit);
                        }}
                        aria-label={verbrauchEinheit === "oel" ? "Heizölverbrauch pro Jahr in Litern" : "Gasverbrauch pro Jahr in Kilowattstunden"}
                        style={{ width: 110, textAlign: "right", fontSize: 14, fontWeight: 700, fontFamily: v('--font-mono'), background: v('--color-bg'), border: `1px solid ${v('--color-border')}`, borderRadius: v('--radius-sm'), padding: "8px 10px", outline: "none" }}
                      />
                      <select
                        value={verbrauchEinheit}
                        onChange={e => {
                          const next = e.target.value as VerbrauchEinheit;
                          setVerbrauchEinheit(next);
                          applyVerbrauch(verbrauchDraft, next);
                        }}
                        aria-label="Einheit des Verbrauchs"
                        style={{ fontSize: 13, fontWeight: 600, background: v('--color-bg'), border: `1px solid ${v('--color-border')}`, borderRadius: v('--radius-sm'), padding: "8px 8px", outline: "none" }}
                      >
                        <option value="gas">kWh Gas pro Jahr</option>
                        <option value="oel">Liter Heizöl pro Jahr</option>
                      </select>
                      {verbrauchKwh !== null && (
                        <button
                          onClick={() => { setVerbrauchDraft(""); setVerbrauchKwh(null); setOQges(null); }}
                          style={{ fontSize: 12, fontWeight: 600, color: v('--color-text-muted'), background: "none", border: "none", cursor: "pointer", textDecoration: "underline" }}
                        >
                          Wieder schätzen
                        </button>
                      )}
                    </div>
                    {verbrauchKwh !== null && (
                      <div style={{ fontSize: 12, color: v('--color-text-secondary'), marginTop: 10, lineHeight: 1.5 }}>
                        Gerechnet wird mit <strong>{Math.round(verbrauchKwh).toLocaleString("de-DE")} kWh</strong> Wärme im Jahr
                        {" "}(<span style={{ fontFamily: v('--font-mono') }}>{Math.round(verbrauchKwh / Math.max(1, wohnflaeche))}</span> kWh je m²).
                        {" "}Das ist weniger als dein Zählerstand, weil ein Teil als Abgasverlust verloren geht — bei deiner Heizung rund{" "}
                        {Math.round((1 - (verbrauchEinheit === "oel" ? FUEL.oil.efficiency : FUEL.gas.efficiency)) * 100)} %.
                        {" "}Den Dämmstandard brauchen wir trotzdem — er bestimmt die Größe der Wärmepumpe, nicht die Kosten.
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* 3: Haushalt */}
            {step === 3 && (
              <div>
                <div style={{ fontSize: 13, fontWeight: 600, color: v('--color-text-muted'), marginBottom: 8, textTransform: "uppercase", letterSpacing: "0.04em" }}>Personen im Haushalt</div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 6 }}>
                  {PERSONEN.map((p, i) => {
                    const aktiv = beantwortet.has("personen") && personen === i;
                    return (
                    // Kennzeichnung von Hand statt OptionCard: schmale
                    // Zahlenreihe, siehe PV-Rechner.
                    <button key={i} data-flow-option={p.label === "1" ? "1 Person" : `${p.label} Personen`} aria-pressed={aktiv}
                      onClick={() => { setPersonen(i); markBeantwortet("personen"); }} style={{
                      padding: "14px 4px", borderRadius: v('--radius-md'), fontSize: 16, fontWeight: 700, cursor: "pointer", textAlign: "center",
                      background: aktiv ? v('--color-accent-dim') : v('--color-bg-muted'),
                      border: aktiv ? `2px solid ${v('--color-accent')}` : `2px solid ${v('--color-border')}`,
                      color: aktiv ? v('--color-accent') : v('--color-text-secondary'),
                    }}>{p.label}</button>
                    );
                  })}
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
                    <OptionCard key={h.id} group="heizsystem" selected={beantwortet.has("heizsystem") && heizsystem === h.id} onClick={() => { setHeizsystem(h.id as typeof heizsystem); markBeantwortet("heizsystem"); }} label={h.label} sub={h.sub} />
                  ))}
                </div>
                <div style={{ fontSize: 13, fontWeight: 600, color: v('--color-text-muted'), marginBottom: 8, textTransform: "uppercase", letterSpacing: "0.04em" }}>Wärmepumpen-Typ</div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                  {WP_TYPE.map(w => (
                    <OptionCard key={w.id} group="wptyp" selected={beantwortet.has("wptyp") && wpType === w.id} onClick={() => { setWpType(w.id as typeof wpType); markBeantwortet("wptyp"); }} label={w.label} sub={w.sub} />
                  ))}
                </div>
              </div>
            )}

            {/* Nav */}
            <div style={{ marginTop: 24 }}>
              <FlowNav
                weiterAktiv={stepBeantwortet}
                weiterLabel={step === STEPS.length - 1 ? "Ergebnis anzeigen" : "Weiter"}
                onWeiter={next}
                // Im ersten Schritt führt Zurück aus dem Flow heraus auf die
                // Startseite — wie vorher, nur im gemeinsamen Baustein.
                onZurueck={step > 0 ? back : () => router.push("/")}
                inaktivHinweis={stepHinweis}
              />
            </div>
          </div>
        )}

        {/* ── RESULT ── */}
        {isResult && (
          <div className="fu">
            {/* Szenario-Auswahl ganz oben: das beschlossene Heizungsgesetz (Grüngas-Pflicht,
                beschlossen, Inkrafttreten mit der Verkündung) gesondert + hervorgehoben, darunter drei reine
                Preis-Annahmen ohne Grüngas. Die Wahl rechnet alle Zahlen darunter um. */}
            <div style={{ marginBottom: 16 }}>
              {/* Primär: das Heizungsgesetz (Grüngas-Pflicht). Klickbare Kachel; das
                  „Mehr erfahren" darin öffnet das Modal (stopPropagation, damit der
                  Kachel-Klick nicht zugleich das Szenario umstellt). */}
              {gruengasVerfuegbar ? (
              <div role="button" tabIndex={0} aria-pressed={greenGas}
                onClick={() => { setScenario("gruengas"); setPreisExpanded(false); }}
                onKeyDown={e => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); setScenario("gruengas"); setPreisExpanded(false); } }}
                style={{ cursor: "pointer", padding: "12px 14px", borderRadius: v('--radius-md'), background: greenGas ? v('--color-accent-dim') : v('--color-bg'), border: `1.5px solid ${greenGas ? v('--color-accent') : v('--color-border')}` }}>
                <span style={{ display: "inline-block", fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.04em", color: v('--color-text-on-accent'), background: v('--color-accent'), padding: "2px 7px", borderRadius: 999, marginBottom: 6 }}>Neues Heizungsgesetz</span>
                <div style={{ fontSize: 14, fontWeight: 700, color: greenGas ? v('--color-accent') : v('--color-text-primary') }}>Grüngas-Pflicht ab 2029</div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", gap: 10, marginTop: 2 }}>
                  <span style={{ fontSize: 11.5, color: v('--color-text-muted') }}>Gas wird durch die gesetzliche Biomethan-Beimischung Jahr für Jahr teurer</span>
                  <button onClick={e => { e.stopPropagation(); setShowGasInfo(true); }} style={{ background: "none", border: "none", padding: 0, color: v('--color-accent'), cursor: "pointer", fontSize: 12, fontFamily: "inherit", fontWeight: 700, whiteSpace: "nowrap", flexShrink: 0 }}>Mehr erfahren →</button>
                </div>
              </div>
              ) : (
                /* Heizöl: Die Bio-Treppe des Heizungsgesetzes gilt zwar auch für Öl,
                   aber unser Preispfad bildet nur den Gas-Mix ab. Statt eine Zahl zu
                   erfinden, sagen wir offen, was in der Rechnung fehlt. */
                <div style={{ padding: "12px 14px", borderRadius: v('--radius-md'), background: v('--color-bg-muted'), border: `1px solid ${v('--color-border')}`, fontSize: 12, color: v('--color-text-secondary'), lineHeight: 1.55 }}>
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

              {/* Secondary: die reinen Preis-Modelle, standardmäßig eingeklappt. */}
              <div style={{ marginTop: 8, borderRadius: v('--radius-md'), border: `1px solid ${v('--color-border')}`, overflow: "hidden", background: !greenGas ? v('--color-bg-muted') : "transparent" }}>
                <button onClick={() => setPreisExpanded(p => !p)} aria-expanded={preisExpanded}
                  style={{ width: "100%", display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8, padding: "10px 14px", background: "none", border: "none", cursor: "pointer", textAlign: "left" }}>
                  <span style={{ fontSize: 12.5, fontWeight: 600, color: !greenGas ? v('--color-text-primary') : v('--color-text-secondary') }}>
                    Marktübliche Preissteigerung{!greenGas ? ` · ${sel.label}` : ""}
                  </span>
                  <span style={{ display: "inline-flex", transform: preisExpanded ? "rotate(180deg)" : "none", transition: "transform .15s", color: v('--color-text-muted') }}><IconChevronDown size={iconSizes.sm} /></span>
                </button>
                {preisExpanded && (
                  <div style={{ padding: "0 14px 12px" }}>
                    <p style={{ fontSize: 11.5, color: v('--color-text-secondary'), lineHeight: 1.55, margin: "0 0 10px" }}>
                      Ohne die Grüngas-Pflicht — nur die normale Teuerung. Die drei Modelle spannen auf, wie stark Strom- und Gaspreis in {DEFAULT_HEATPUMP_CONFIG.years} Jahren steigen könnten (allgemeine Inflation plus CO₂-Preis auf fossile Energie). Aus Sicht der Wärmepumpe von ungünstig (Strom teuer, Gas billig) bis günstig (Strom stabil, Gas teuer).
                    </p>
                    <div style={{ display: "flex", borderRadius: v('--radius-md'), border: `1px solid ${v('--color-border')}`, overflow: "hidden", background: v('--color-bg') }} role="tablist" aria-label="Preis-Modell">
                      {scenariosPlain.map(s => {
                        const on = !greenGas && s.id === effScenario;
                        return (
                          <button key={s.id} role="tab" aria-selected={on} onClick={() => { setScenario(s.id); setPreisExpanded(true); }}
                            style={{ flex: 1, padding: "9px 6px", cursor: "pointer", textAlign: "center", background: on ? v('--color-accent-dim') : "transparent", border: "none", borderBottom: `2px solid ${on ? v('--color-accent') : "transparent"}` }}>
                            <div style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.03em", color: on ? v('--color-accent') : v('--color-text-muted') }}>{s.label}</div>
                            <div style={{ fontSize: 10, color: v('--color-text-muted'), fontFamily: v('--font-mono'), marginTop: 2 }}>{s.sub}</div>
                          </button>
                        );
                      })}
                    </div>
                    {!greenGas && (
                      // Bewusst selPrice statt sel: dieser Block erklärt IMMER das
                      // gewählte Preis-Modell. Über sel wäre der Text im Grüngas-Fall
                      // stumm — genau die Falle, in die eine Textkorrektur am
                      // 29.07.2026 lief (geändert wurde ein Satz, der nie erscheint).
                      <div style={{ fontSize: 11.5, color: v('--color-text-secondary'), lineHeight: 1.5, marginTop: 10 }}>{selPrice.explain}</div>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Modal: alle erklärenden Grüngas-Texte gebündelt (Modal-Baustein →
                Transitions/Fokus/Bottom-Sheet kommen aus components/Modal.tsx). */}
            <Modal open={showGasInfo} onClose={() => setShowGasInfo(false)} title="Grüngas-Pflicht: was dahintersteckt" intro="Warum eine neue Gasheizung durch das Heizungsgesetz teurer wird — und wie wir das rechnen." maxWidth={560}>
              {/* Kernaussage */}
              <div style={{ padding: "10px 12px", borderRadius: v('--radius-md'), background: v('--color-chart-positive-bg'), marginBottom: 18, fontSize: 12.5, lineHeight: 1.6, color: v('--color-text-secondary') }}>
                Durch die Grüngas-Pflicht spart die Wärmepumpe über {DEFAULT_HEATPUMP_CONFIG.years} Jahre{" "}
                <span style={{ fontWeight: 700, fontFamily: v('--font-mono'), color: v('--color-positive') }}>+{greenGasDelta.toLocaleString("de-DE")} €</span>{" "}mehr als bei reiner Preisfortschreibung.
              </div>
              {/* Chart B: Heizkosten je kWh Wärme */}
              <div style={{ fontSize: 11, fontWeight: 700, color: v('--color-text-muted'), textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 2 }}>Heizkosten je Kilowattstunde Wärme</div>
              <div style={{ fontSize: 11.5, color: v('--color-text-muted'), marginBottom: 8 }}>Gasheizung mit Grüngas-Pflicht gegen Wärmepumpe, {YEAR}–{YEAR + DEFAULT_HEATPUMP_CONFIG.years - 1}</div>
              <HeatCostCompareChart data={heatCostData} pvCoveragePct={Math.round(pvCoverageForChart * 100)} />
              {/* Chart A: Gaspreis-Zusammensetzung */}
              <div style={{ fontSize: 11, fontWeight: 700, color: v('--color-text-muted'), textTransform: "uppercase", letterSpacing: "0.06em", margin: "20px 0 2px" }}>Woraus sich der Gaspreis zusammensetzt</div>
              <div style={{ fontSize: 11.5, color: v('--color-text-muted'), marginBottom: 8 }}>Endkundenpreis in ct/kWh — der Biomethan-Block wächst mit der Bio-Treppe</div>
              <GasPriceStackChart data={gasStackData} />
              {/* Erklärabschnitte */}
              <div style={{ fontSize: 13, lineHeight: 1.6, color: v('--color-text-secondary'), marginTop: 22, borderTop: `1px solid ${v('--color-border')}`, paddingTop: 16 }}>
                {[
                  { h: "Die Bio-Treppe (§ 43 GModG)", p: `Das Gebäudemodernisierungsgesetz verpflichtet eine Heizung für Gas, Heizöl oder Flüssiggas, die nach dem ${GMODG_RECHTSSTAND.inKraftSeit} neu eingebaut wird — beim Einbau in ein bestehendes Gebäude ebenso wie in Neubauten, die bis zum ${GMODG_RECHTSSTAND.neubauBioTreppeBis} errichtet werden —, ab 2029 einen wachsenden Anteil klimafreundlicher Brennstoffe beizumischen. Das Gesetz nennt vier Stufen: ${bioTreppeStufenText()}. Anrechenbar sind neben Biomethan auch Bioheizöl, biogenes Flüssiggas sowie grüner, blauer, orangener oder türkiser Wasserstoff und dessen Derivate; beim Netzgas läuft es auf Biomethan hinaus, und das kostet rund doppelt so viel wie Erdgas. Zusammen mit steigenden Netzentgelten — weil immer weniger Haushalte am Gasnetz hängen — treibt das den Gaspreis deutlich stärker als die allgemeine Teuerung. Statt beizumischen lässt sich die Pflicht auch über Solarthermie, eine Lüftungsanlage mit Wärmerückgewinnung oder eine Wärmepumpen-Hybridheizung erfüllen (§ 43 Absatz 3 bis 5 GModG); fällt die alte Anlage irreparabel aus, bleibt zwölf Monate lang die Stufe stehen, die beim Einbau galt (§ 43 Absatz 7 GModG). Wir rechnen den teuersten Weg, die reine Beimischung.` },
                  { h: "Beschlossen ist die Pflicht, nicht der Preis", p: `${gmodgStandSatz()} Wie teuer Biomethan und Netzentgelte tatsächlich werden, ist dagegen eine Annahme — ein plausibler Korridor, keine punktgenaue Prognose. Ebenfalls Annahme ist der Weg nach 2040: Eine 100-%-Stufe steht nicht im Gesetz, die vollständige Klimaneutralität ab 2045 kündigt § 42a GModG nur an — als Quote für die Brennstoff-Anbieter, die dann auch Bestandsheizungen verteuern würde. Sie soll bis zum ${GMODG_RECHTSSTAND.quoteGesetzBis} in einem eigenen Gesetz geregelt werden; die Gesetzesbegründung geht von einem Start 2028 mit bis zu einem Prozent aus, im Gesetzestext steht das nicht. Wir rechnen sie nicht mit. Die drei Preis-Szenarien zeigen den Gegenfall: reine Energiepreis-Fortschreibung ohne die Grüngas-Pflicht.` },
                  { h: "Warum wir je Kilowattstunde Wärme rechnen", p: "Gas- und Strompreis lassen sich nicht direkt vergleichen: Eine Wärmepumpe macht aus einer Kilowattstunde Strom rund drei Kilowattstunden Wärme, ein Gaskessel aus einer Kilowattstunde Gas nur knapp eine. Deshalb rechnen wir beide auf die Kosten pro gelieferter Kilowattstunde Wärme um — die Jahresarbeitszahl der Wärmepumpe und der Kesselwirkungsgrad sind darin enthalten. Grundgebühr und Wartung bleiben außen vor, sie gehören nicht in einen Preis-je-Kilowattstunde-Vergleich." },
                  { h: "Quelle", p: "IW-Report 36/2026 „Wie hoch sind die Mehrkostenrisiken durch das Gebäudemodernisierungsgesetz?“ (Henger, Küper, Wünsch — Institut der deutschen Wirtschaft, Juli 2026). Die Preispfade stammen aus dem Anhang der Studie." },
                ].map((s, i) => (
                  <div key={i} style={{ marginTop: i === 0 ? 0 : 14 }}>
                    <div style={{ fontSize: 13.5, fontWeight: 700, color: v('--color-text-primary'), marginBottom: 4 }}>{s.h}</div>
                    <p style={{ margin: 0 }}>{s.p}</p>
                  </div>
                ))}
              </div>
            </Modal>

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
                      : <>rechnet sich eine Wärmepumpe schon: <span style={{ fontWeight: 700, fontFamily: v('--font-mono'), color: v('--color-positive') }}>+{istResult.tcoEinsparung.toLocaleString("de-DE")} €</span>{istMehrkosten <= 0
                        ? ", und sie kostet nach Förderung nicht mehr als eine neue Heizung"
                        : istResult.amortisationsJahre !== null ? `, die Mehrkosten sind nach ${istResult.amortisationsJahre} ${istResult.amortisationsJahre === 1 ? "Jahr" : "Jahren"} wieder drin` : ""}.</>}
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
                {/* Der gewählte Förderstand gehört in die Kopfzeile, nicht nur in
                    den Schalter weiter unten: Wer die Zahl darüber liest, muss
                    ohne Suchen sehen, nach welchem Stand sie gerechnet ist. */}
                <div style={{ fontSize: 11.5, color: v('--color-text-muted'), marginBottom: 10 }}>
                  {Math.round(result.beg.rate * 100)} % der förderfähigen Kosten
                  {stufeNaechste
                    ? <> · Stand {begStand === "naechste" ? stufeNaechste.bezeichnung : "heute"}</>
                    : null}
                  {result.investBrutto > begStufe.maxCap
                    ? <> · gedeckelt bei {begStufe.maxCap.toLocaleString("de-DE")} € (deine Anlage liegt darüber, daher {Math.round(result.beg.rate * 100)} % × {begStufe.maxCap.toLocaleString("de-DE")} €)</>
                    : null}
                </div>
                <BegStandSchalter
                  stand={begStand}
                  setStand={s => { setBegStand(s); setOInvest(null); }}
                  jetzt={stufeJetzt}
                  naechste={stufeNaechste}
                  euUrsprung={euUrsprung}
                  setEuUrsprung={b => { setEuUrsprung(b); setOInvest(null); }}
                  betragJetzt={begVergleich.jetzt}
                  betragNaechsteOhneEu={begVergleich.naechsteOhneEu}
                  betragNaechsteMitEu={begVergleich.naechsteMitEu}
                />
                {/* Der Satz kommt aus der gewählten Stufe, nicht als getippte
                    Zahl. Er stand hier bis zum 26.08.2026 als „30 %" im Text —
                    genau die Sorte Zahl, die beim ersten Stichtag still falsch
                    wird, während die Rechnung daneben längst richtig rechnet. */}
                <div style={{ fontSize: 12, color: v('--color-text-muted'), display: "flex", alignItems: "center", gap: 5, marginBottom: 6 }}>
                  <span style={{ display: "inline-block", width: 13, height: 13, borderRadius: 3, background: v('--color-accent'), flexShrink: 0 }} />
                  Grundförderung {Math.round(begStufe.grundfoerderung * 100)} % — bekommt jeder Heizungstausch im Bestand
                </div>
                <BonusToggle checked={selbstnutzer} onChange={c => { setSelbstnutzer(c); setOInvest(null); }} label="Ich wohne selbst im Gebäude" tipTitle="Selbstnutzung">
                  Sowohl der Klima-Geschwindigkeits-Bonus als auch der Einkommens-Bonus setzen voraus, dass du selbst im Gebäude wohnst. Wer vermietet, bekommt nur die Grundförderung von {Math.round(begStufe.grundfoerderung * 100)} %. Der Bonus für Wärmepumpen aus der EU ist dagegen nicht an die Selbstnutzung gebunden. Quelle: Förderrichtlinie BEG EM vom 17.07.2026.
                </BonusToggle>
                {selbstnutzer ? (
                  <>
                    {/* Ab dem 1. August 2028 gibt es den Klima-Geschwindigkeits-Bonus
                        nicht mehr. Die Frage nach der alten Heizung dann trotzdem
                        anzubieten, hieße eine Wahl anzubieten, die nichts bewirkt. */}
                    {begStufe.klimaBonus === 0 ? (
                      <div style={{ fontSize: 11.5, color: v('--color-text-muted'), lineHeight: 1.5, marginBottom: 4 }}>
                        Den Klima-Geschwindigkeits-Bonus für den Austausch einer alten fossilen Heizung
                        gibt es zu diesem Zeitpunkt nicht mehr.
                      </div>
                    ) : (
                    <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: v('--color-text-secondary'), marginBottom: 4, flexWrap: "wrap" }}>
                      <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
                        Alte Heizung
                        <InfoTooltip title="Klima-Geschwindigkeits-Bonus" ariaLabel="Klima-Geschwindigkeits-Bonus">
                          {Math.round(begStufe.klimaBonus * 100)} % Zusatzförderung, wenn eine funktionierende fossile Heizung ersetzt wird: Öl, Kohle, Nachtspeicher und die Gas-Etagenheizung zählen unabhängig vom Alter, eine Gas-Zentralheizung sowie Holz- und Pelletheizungen erst ab 20 Jahren. Maßgeblich ist, wann die alte Anlage in Betrieb ging — das Datum steht auf dem Typenschild am Kessel. Der Bonus sinkt ab dem 1. Februar 2027 halbjährlich um 4 Prozentpunkte und entfällt bei Antragstellung ab dem 1. August 2028. Quelle: Förderrichtlinie BEG EM vom 17.07.2026.
                        </InfoTooltip>
                      </span>
                      <select value={altheizung} onChange={e => { setAltheizung(e.target.value as AltheizungKey); setOInvest(null); }}
                        style={{ fontSize: 12, padding: "3px 6px", borderRadius: v('--radius-md'), border: `1px solid ${v('--color-border')}`, background: v('--color-bg'), color: v('--color-text-secondary'), cursor: "pointer", maxWidth: "100%" }}>
                        {ALTHEIZUNG_OPTIONS.map(o => <option key={o.key} value={o.key}>{o.label}</option>)}
                      </select>
                    </div>
                    )}
                    <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: v('--color-text-secondary'), marginBottom: 4, flexWrap: "wrap" }}>
                      <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
                        Einkommens-Bonus
                        <InfoTooltip title="Einkommens-Bonus" ariaLabel="Einkommens-Bonus">
                          Zusatzförderung für selbstnutzende Eigentümer, gestaffelt nach zu versteuerndem Haushaltsjahreseinkommen: bis 30.000 € +40 %, bis 40.000 € +30 %, bis 50.000 € +10 %. Bei der untersten Stufe steigt der Förderdeckel auf 80 %. Quelle: KfW Merkblatt 458 (BEG EM), gültig ab 21.07.2026.
                        </InfoTooltip>
                      </span>
                      <select value={einkommen} onChange={e => { setEinkommen(e.target.value as EinkommenKey); setOInvest(null); }}
                        style={{ fontSize: 12, padding: "3px 6px", borderRadius: v('--radius-md'), border: `1px solid ${v('--color-border')}`, background: v('--color-bg'), color: v('--color-text-secondary'), cursor: "pointer", maxWidth: "100%" }}>
                        {EINKOMMEN_OPTIONS.map(o => <option key={o.key} value={o.key}>{o.label}</option>)}
                      </select>
                    </div>
                    {einkommen !== "none" && (
                      <label style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 12, color: v('--color-text-secondary'), cursor: "pointer", marginBottom: 4 }}>
                        <input type="checkbox" checked={kindImHaushalt} onChange={e => { setKindImHaushalt(e.target.checked); setOInvest(null); }} style={{ cursor: "pointer" }} />
                        Mindestens ein Kind im Haushalt (Einkommensgrenze +10.000 €)
                      </label>
                    )}
                  </>
                ) : (
                  <div style={{ fontSize: 11.5, color: v('--color-text-muted'), lineHeight: 1.5, marginTop: 2 }}>
                    Als Vermieter bleibt es bei der Grundförderung — Klima- und Einkommens-Bonus sind an die Selbstnutzung gebunden.
                  </div>
                )}
                {oInvest !== null && (
                  <div style={{ fontSize: 11, color: v('--color-text-faint'), marginTop: 6 }}>Investition manuell überschrieben — Förderung wirkt erst wieder nach Zurücksetzen.</div>
                )}
                {/* Die Bedingung gehört an den Betrag, nicht in den Rechtstext am
                    Seitenende: Eine Zahl ohne diesen Satz sagt, wie viel es gibt,
                    und verschweigt das Einzige, was sie kosten kann. Wortlaut aus
                    lib/beg-antrag.ts — derselbe Satz steht im Förder-Check. */}
                <div style={{ fontSize: 11.5, color: v('--color-text-muted'), lineHeight: 1.5, marginTop: 10, paddingTop: 8, borderTop: `1px solid ${v('--color-border')}` }}>
                  {BEG_ANTRAG_KURZ}{" "}
                  <a href={BEG_ANTRAG_HREF} style={{ color: v('--color-accent'), fontWeight: 600, textDecoration: "none" }}>
                    Die Reihenfolge Schritt für Schritt
                  </a>
                </div>
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
            {situation === "bestand" && (
              <ResultFunding
                loading={foerderQuelle.laedt}
                candidates={foerderQuelle.kandidaten}
                chosenAgs={foerderQuelle.ags}
                onChooseAgs={foerderQuelle.waehleOrt}
                programs={foerderQuelle.programme}
                applied={foerderZeilen}
                total={kappung}
                enabled={foerderAktiv}
                onToggle={setFundingEnabled}
                brutto={Math.max(0, result.investBrutto - result.beg.amount)}
                technik="waermepumpe"
                hinweis={foerderHinweis}
                kopf={
                  <>
                    <div style={{ fontSize: 11.5, color: v('--color-text-muted'), lineHeight: 1.5, marginBottom: 10 }}>
                      Einzelne Städte und Gemeinden legen etwas auf die Bundesförderung drauf. Mit deiner Postleitzahl sehen wir im Förderkatalog nach.
                    </div>
                    <div style={{ fontSize: 13 }}>
                      <StandortField
                        plz={plz}
                        onPlzChange={setPlz}
                        loading={foerderQuelle.laedt}
                        confirmed={!!foerderQuelle.ags}
                        onSubmit={() => foerderQuelle.ausPlz(plz)}
                        label="Postleitzahl"
                      />
                    </div>
                  </>
                }
              />
            )}

            {/* Was aus der Bundesförderung wirklich geworden ist.

                Alles darüber beschreibt, was die Förderung HERGIBT — Sätze, Boni,
                Höchstbetrag. Die Frage, mit der die meisten herkommen, ist eine
                andere: „bekomme ich das auch?" Darauf antwortet nur das, was
                das Amt gezählt hat. Der Abschnitt steht deshalb direkt unter dem
                Förderblock und nicht am Seitenende.

                Nur im Bestand: Im Neubau gibt es diese Förderung nicht, und
                Zahlen zu einer Förderung zu zeigen, die der gerechnete Fall gar
                nicht bekommt, wäre die Sorte Zahl, die zur falschen Erwartung
                führt. */}
            {situation === "bestand" && kfw && (
              <ResultSection
                title="Wer bekommt die Förderung wirklich?"
                summary={kfwPraxisZusammenfassung(kfw)}
              >
                <KfwFoerderpraxis daten={kfw} kreis={kfwKreis} nackt />
              </ResultSection>
            )}

            {/* 3. Realistische Wege */}
            {zeigeWege && (
              <div style={{ marginBottom: 16 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
                  <IconSparkle size={iconSizes.md} color={v('--color-accent')} />
                  <span style={{ fontSize: 14, fontWeight: 700 }}>Deine Wege zur Wärmepumpe</span>
                </div>
                <div style={{ display: "grid", gap: 8 }}>
                  {wegeResults.map(w => (
                    <WegCard key={w.id} titel={w.titel} kurz={w.kurz} r={w.r} active={activeWeg?.id === w.id} onClick={() => selectWeg(w.id)} situation={situation} sanierung={w.sanierung} refLabel={fuel.refLabel} />
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
                  <TcoBreakdown r={sel} situation={situation} jahre={DEFAULT_HEATPUMP_CONFIG.years} sanierungHinweis={activeWeg?.sanierung ?? false} refLabel={fuel.refLabel} />
                </InfoTooltip>
              </div>
              <div style={{ fontSize: 42, fontWeight: 800, color: sel.tcoEinsparung >= 0 ? v('--color-positive') : v('--color-negative'), fontFamily: v('--font-mono'), lineHeight: 1.1, textAlign: "center" }}>
                {sel.tcoEinsparung >= 0 ? "+" : ""}{sel.tcoEinsparung.toLocaleString("de-DE")} €
              </div>
              {/* Die große Zahl gilt für EINE Preisannahme. Ohne die Bandbreite daneben
                  liest sie sich wie eine Prognose der Energiepreise der nächsten 20 Jahre
                  — die niemand hat (Nutzerkritik 28.07.2026). Deshalb steht die Spanne
                  aller gerechneten Annahmen direkt unter dem Wert, nicht nur im Tooltip. */}
              <div style={{ fontSize: 12, color: v('--color-text-muted'), marginTop: 8, textAlign: "center", lineHeight: 1.5 }}>
                Künftige Energiepreise kennt niemand. Je nach Annahme sind es{" "}
                <span style={{ fontFamily: v('--font-mono'), fontWeight: 700, whiteSpace: "nowrap" }}>
                  {spanne.min >= 0 ? "+" : ""}{spanne.min.toLocaleString("de-DE")} €
                </span>{" "}bis{" "}
                <span style={{ fontFamily: v('--font-mono'), fontWeight: 700, whiteSpace: "nowrap" }}>
                  {spanne.max >= 0 ? "+" : ""}{spanne.max.toLocaleString("de-DE")} €
                </span>.
              </div>
              <div style={{ fontSize: 13, color: v('--color-text-muted'), marginTop: 6, display: "flex", flexWrap: "wrap", alignItems: "center", justifyContent: "center", gap: 4 }}>
                {/* „vs. neue" + Auswahlfeld ergab „vs. neue Heizöl". Der Fall steht
                    jetzt im Satz, das Feld nennt nur noch das Gerät. */}
                vs. {ersatzInvest > 0 ? "neue Heizung:" : "Weiterbetrieb:"}
                {/* Beim Wechsel des Energieträgers den Preis-Override fallen lassen —
                    sonst bliebe ein von Hand gesetzter Gaspreis am Heizöl kleben und
                    die Umstellung wirkte wirkungslos. */}
                <select value={fuel.id} onChange={e => { setOFuel(e.target.value); setOGasPrice(null); }} aria-label="Referenzheizung wählen" style={{ fontFamily: v('--font-mono'), fontWeight: 700, color: v('--color-accent'), background: v('--color-accent-dim'), border: `1px solid ${v('--color-accent')}`, borderRadius: v('--radius-sm'), padding: "2px 6px", fontSize: 13 }}>
                  {fuelOptions.map(f => <option key={f.id} value={f.id}>{f.label}</option>)}
                </select>
                {situation === "neubau" ? "(Neubau)" : null}
                <InfoTooltip title="Wie sich der Brennstoffpreis entwickelt" ariaLabel="Wie sich der Brennstoffpreis in der Rechnung entwickelt">
                  {greenGas
                    ? <>Das Grüngas-Szenario ist aktiv: Der Gaspreis folgt dem GModG-Gas-Mix — mit der Bio-Treppe wird ab 2029 zunehmend teures Biomethan beigemischt, dazu steigen Netzentgelte und CO₂-Preis. Details und Verlauf siehst du im Grüngas-Block weiter unten. Die drei Szenarien im Diagramm rechnen mit niedrigem, mittlerem und hohem Preispfad.</>
                    : <>Der heutige Brennstoffpreis steigt in der Rechnung jedes Jahr — durch allgemeine Teuerung (realistisch rund 2 % pro Jahr) und durch den steigenden CO₂-Preis auf fossile Energie. Der CO₂-Preis liegt 2026 und 2027 bei 55–65 € pro Tonne und klettert ab 2028 mit dem EU-Emissionshandel voraussichtlich um etwa 8 € pro Tonne und Jahr. Die im heutigen Preis schon enthaltene CO₂-Abgabe wird dabei nicht doppelt gezählt. Die drei Szenarien im Diagramm rechnen mit unterschiedlich starkem Anstieg.</>}
                </InfoTooltip>
              </div>

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
              <div style={{ marginTop: 18 }}>
                <ResultSection title="Dein Gebäude" summary={gebaeudeZusammenfassung()}>
                  <GebaeudeField
                    werte={{ haustypIdx, wohnflaeche, insulationIdx, heizsystem }}
                    setWerte={patch => {
                      if (patch.haustypIdx !== undefined) setHaustypIdx(patch.haustypIdx);
                      if (patch.wohnflaeche !== undefined) setCustomFlaeche(patch.wohnflaeche);
                      if (patch.insulationIdx !== undefined) setInsulationIdx(patch.insulationIdx);
                      if (patch.heizsystem !== undefined) setHeizsystem(patch.heizsystem);
                      // Von Hand gesetzte Ableitungen zurücknehmen: Sie beschreiben
                      // das ALTE Gebäude und würden die neue Angabe stumm schalten.
                      setOQges(null);
                      setOHeizlast(null);
                    }}
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
                </ResultSection>
              </div>

              {/* Editierbare Kernannahmen */}
              <div style={{ marginTop: 18, borderTop: `1px solid ${v('--color-border-accent')}`, paddingTop: 14, fontSize: 13, lineHeight: 2 }}>
                <div>
                  Heizwärme pro Jahr: <InlineEdit value={result.qGes} onCommit={v => setOQges(v)} unit=" kWh" min={1000} max={80000} step={500} width={90} />
                  <InfoTooltip title="Woher diese Menge kommt" ariaLabel="Woher kommt der Jahres-Heizwärmebedarf?">
                    Geschätzt aus Wohnfläche, Dämmzustand und Personenzahl — und zwar als <strong>erwarteter Verbrauch</strong>, nicht als Norm-Bedarf. Der Unterschied ist groß: Die Norm rechnet ein Gebäude durch, in dem alle Räume auf Solltemperatur stehen. Real wird weniger geheizt (Räume bleiben kühl, nachts wird abgesenkt), im Altbau rund 30 % weniger.<br /><br />
                    <strong>Du kennst deinen Gas- oder Ölverbrauch? Trag ihn im Schritt „Dämmstandard" ein</strong> — oder rechne hier direkt: Jahresverbrauch in kWh × {Math.round(fuel.efficiency * 100)} % (Kessel-Nutzungsgrad). Ein gemessener Wert schlägt jede Schätzung.<br /><br />
                    Diese Menge steht auf beiden Seiten der Rechnung — sie bestimmt den Gasverbrauch genauso wie den Strom der Wärmepumpe. <strong>Wenn nach dem Wechsel wärmer oder in mehr Räumen geheizt wird, steigt sie</strong>, und die Ersparnis fällt kleiner aus als hier gezeigt. Nach Sanierungen wird dieser Effekt mit 10 bis 30 % beziffert; wie stark er bei einem reinen Heizungstausch auftritt, ist nicht belastbar gemessen — deshalb rechnen wir ihn nicht ein, sondern nennen ihn.
                  </InfoTooltip>
                </div>
                <div>
                  Heizlast: <InlineEdit value={result.heizlastKw} onCommit={v => setOHeizlast(v)} unit=" kW" min={3} max={40} step={0.5} width={60} fmt={v => (Math.round(v * 10) / 10).toString().replace(".", ",")} />
                  <span style={{ fontSize: 12, color: v('--color-text-muted') }}>
                    {" "}· Anlage {result.auslegungKw.toLocaleString("de-DE")} kW
                  </span>
                  <InfoTooltip title="Heizlast und Anlagengröße" ariaLabel="Was ist die Heizlast?">
                    Die <strong>Heizlast</strong> ist die Leistung, die dein Gebäude am kältesten Tag braucht — wir schätzen sie aus Wohnfläche, Dämmzustand und Haustyp. <strong>Hast du eine Berechnung nach DIN EN 12831 vom Energieberater oder Heizungsbauer? Trag den Wert hier ein</strong>, dann rechnen alle Kosten damit.<br /><br />
                    Die <strong>Anlage</strong> wird bewusst kleiner ausgelegt als die Heizlast ({Math.round(DEFAULT_HEATPUMP_CONFIG.auslegungsfaktor * 100)} %): Die wenigen extrem kalten Stunden im Jahr deckt der eingebaute Heizstab günstiger ab, als wenn man die Wärmepumpe das ganze Jahr überdimensioniert betreibt. Diese Anlagengröße bestimmt den Preis.
                  </InfoTooltip>
                </div>
                <div>
                  Wärmepumpe:{" "}
                  <select value={wpType} onChange={e => { setWpType(e.target.value as "lwwp" | "swwp"); setOInvest(null); setOJaz(null); }} style={{ fontFamily: v('--font-mono'), fontWeight: 700, color: v('--color-accent'), background: v('--color-accent-dim'), border: `1px solid ${v('--color-accent')}`, borderRadius: v('--radius-sm'), padding: "2px 6px", fontSize: 13 }}>
                    {WP_TYPE.map(w => <option key={w.id} value={w.id}>{w.label}</option>)}
                  </select>
                </div>
                <div><GlossaryTerm id="jaz">JAZ (Jahresarbeitszahl)</GlossaryTerm>: <InlineEdit value={result.jaz} onCommit={v => setOJaz(v)} unit="" min={2.0} max={5.5} step={0.1} width={60} fmt={v => v.toFixed(2).replace(".", ",")} /></div>
                <div>{fuel.kind === "oil" ? "Heizölpreis" : "Gaspreis"}: {greenGas
                  ? <span style={{ fontStyle: "italic", color: v('--color-text-muted') }}>folgt dem Grüngas-Pfad (Block unten)</span>
                  : <InlineEdit value={Math.round((oGasPrice ?? fuel.price) * 100 * 100) / 100} onCommit={v => setOGasPrice(v / 100)} unit=" ct/kWh" min={3} max={40} step={0.5} width={70} />}</div>
                <div>
                  Neue {fuel.refLabel}: <InlineEdit value={oFossilInvest ?? DEFAULT_HEATPUMP_CONFIG.fossilErsatzInvest} onCommit={v => setOFossilInvest(v)} unit=" €" min={0} max={40000} step={500} width={80} />
                  <InfoTooltip title="Warum eine neue Heizung in der Rechnung steht" ariaLabel="Warum steht eine neue Heizung in der Rechnung?">
                    Der Rechner vergleicht zwei Entscheidungen, die <strong>jetzt</strong> anstehen: Wärmepumpe oder neue fossile Heizung. Beide werden im ersten Jahr bezahlt, deshalb steht die Anschaffung auf der fossilen Seite — man spart sie sich mit der Wärmepumpe. Sie ist zugleich der Grund, warum die Beimischungspflicht greift: Die gilt nur für Heizungen, die neu eingebaut werden. <strong>Steht bei dir gar keine Entscheidung an, weil die Heizung noch lange läuft? Dann trag hier 0 ein</strong> — dann rechnet der Vergleich gegen den Weiterbetrieb, ohne Anschaffung und ohne Beimischungspflicht.
                  </InfoTooltip>
                </div>
                <div>WP-Strompreis: <InlineEdit value={Math.round((oStromPrice ?? DEFAULT_HEATPUMP_CONFIG.wpTarif) * 100 * 100) / 100} onCommit={v => setOStromPrice(v / 100)} unit=" ct/kWh" min={10} max={60} step={0.5} width={70} /></div>
                <div>Investition (nach Förderung): <InlineEdit value={result.investNetto} onCommit={v => setOInvest(v)} unit=" €" min={5000} max={80000} step={500} width={90} />{situation === "bestand" ? <span style={{ fontSize: 12, color: v('--color-text-muted') }}> · {result.investBrutto.toLocaleString("de-DE")} € vor {Math.round(result.beg.rate * 100)} % Förderung</span> : null}</div>
              </div>
            </div>

            {/* Sekundäre Stats */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8, marginBottom: 16 }}>
              {/* „Amortisation" war hier eine Lüge in einem Wort (31.07.2026): Amortisiert
                  wird NICHT die Investition, sondern der Mehrpreis gegenüber der fossilen
                  Alternative. Bei kleinen Häusern liegt der nahe null oder darunter — dann
                  stand dort „1 J" oder „0 J", und wer das las, verstand „die Anlage hat
                  sich nach einem Jahr bezahlt". In 33 von 84 durchgerechneten Fällen. */}
              <StatCard
                label={mehrkosten > 0 ? "Mehrkosten drin nach" : "Mehrkosten"}
                value={mehrkosten <= 0
                  ? "keine"
                  : sel.amortisationsJahre !== null ? `${sel.amortisationsJahre} J` : "> 20 J"}
                positive={mehrkosten <= 0 || (sel.amortisationsJahre !== null && sel.amortisationsJahre <= 15)}
                helpTitle="Worauf sich diese Zahl bezieht"
                helpAriaLabel="Worauf bezieht sich die Amortisation?"
                help={mehrkosten <= 0
                  ? `Die Wärmepumpe kostet dich nach Förderung ${sel.investNetto.toLocaleString("de-DE")} € — das ist ${Math.abs(mehrkosten).toLocaleString("de-DE")} € WENIGER als die ${sel.gasInvest.toLocaleString("de-DE")} € für eine neue ${fuel.refLabel}. Es gibt also keine Mehrkosten, die sich erst rechnen müssten; die Ersparnis beim Heizen kommt oben drauf. Achtung: Das heißt nicht, dass die Anlage nichts kostet — du zahlst die ${sel.investNetto.toLocaleString("de-DE")} € trotzdem.`
                  : `Nicht die ganze Investition, sondern nur der Unterschied zur Alternative. Die Wärmepumpe kostet dich nach Förderung ${sel.investNetto.toLocaleString("de-DE")} €, eine neue ${fuel.refLabel} ${sel.gasInvest.toLocaleString("de-DE")} € — bleiben ${mehrkosten.toLocaleString("de-DE")} € Mehrkosten. Die sind nach dieser Zeit durch die niedrigeren Heizkosten wieder eingespielt. Steht bei dir gar kein Heizungstausch an, setz die neue ${fuel.refLabel} oben auf 0; dann rechnet sich die volle Investition gegen den Weiterbetrieb.`}
              />
              <StatCard label="⌀ Ersparnis/Jahr" value={`${sel.einsparungProJahr.toLocaleString("de-DE")} €`} positive={sel.einsparungProJahr > 0} />
              <StatCard
                label="CO₂ 20 J"
                value={`${Math.round(sel.co2Einsparung / 1000).toLocaleString("de-DE")} t`}
                positive={sel.co2Einsparung > 0}
                helpTitle="CO₂-Einsparung"
                helpAriaLabel="Was bedeutet die CO₂-Zahl?"
                help="Vermiedener CO₂-Ausstoß über 20 Jahre: die Emissionen der fossilen Heizung minus die Emissionen aus dem Strom, den die Wärmepumpe verbraucht (deutscher Strommix). Es ist also netto eingespartes CO₂, nicht ausgestoßenes — der Stromverbrauch der Wärmepumpe ist schon abgezogen."
              />
            </div>

            {/* Chart */}
            <div style={{ background: v('--color-bg'), borderRadius: v('--radius-md'), padding: "16px 12px 8px", marginBottom: 16, border: `1px solid ${v('--color-border')}` }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: v('--color-text-muted'), textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 10, paddingLeft: 4 }}>
                {greenGas ? "Kumulierte Einsparung · Heizungsgesetz vs. Preis-Szenarien" : "Kumulierte Einsparung · 3 Szenarien"}
              </div>
              <HeatPumpChart
                scenarios={chartScenarios}
                horizon={DEFAULT_HEATPUMP_CONFIG.years}
                highlightId={greenGas ? "gruengas" : effScenario}
              />
              <div style={{ display: "flex", justifyContent: "center", flexWrap: "wrap", gap: 16, marginTop: 10, fontSize: 11 }}>
                {greenGas ? (
                  <>
                    <span style={{ display: "inline-flex", alignItems: "center", gap: 4, color: v('--color-text-secondary'), fontWeight: 700 }}>
                      <span style={{ width: 10, height: 2, background: v('--color-positive'), borderRadius: 1 }} /> Mit Grüngas-Pflicht
                    </span>
                    <span style={{ display: "inline-flex", alignItems: "center", gap: 4, color: v('--color-text-muted') }}>
                      <span style={{ width: 10, height: 2, background: v('--color-text-muted'), borderRadius: 1, opacity: 0.5 }} /> Preis-Szenarien (ohne)
                    </span>
                  </>
                ) : (
                  scenariosPlain.map(s => (
                    <span key={s.id} style={{ display: "inline-flex", alignItems: "center", gap: 4, color: s.id === effScenario ? v("--color-text-secondary") : v("--color-text-muted"), fontWeight: s.id === effScenario ? 700 : 400 }}>
                      <span style={{ width: 10, height: 2, background: s.color, borderRadius: 1, opacity: s.id === effScenario ? 1 : 0.5 }} /> {s.label}
                    </span>
                  ))
                )}
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
                <span style={{ fontSize: 11, color: v('--color-text-muted'), fontWeight: 400, display: "inline-flex", alignItems: "center", gap: 4 }}>Aufschlüsseln <IconChevronDown size={iconSizes.xs} /></span>
              </summary>
              <div style={{ marginTop: 14, fontSize: 13, color: v('--color-text-secondary'), lineHeight: 1.7 }}>
                <DetailGrid items={[
                  ["Heizwärme", `${result.qHeiz.toLocaleString("de-DE")} kWh`],
                  ["Warmwasser", `${result.qWw.toLocaleString("de-DE")} kWh`],
                  ["Gesamt thermisch", `${result.qGes.toLocaleString("de-DE")} kWh`],
                  ["Heizlast Gebäude", `${result.heizlastKw.toLocaleString("de-DE")} kW`],
                  ["Auslegung Wärmepumpe", `${result.auslegungKw.toLocaleString("de-DE")} kW`],
                  ["Vorlauftemperatur", `${result.flowTemp} °C`],
                  ["JAZ", result.jaz.toFixed(2).replace(".", ",")],
                  ["Strombedarf WP", `${result.eWp.toLocaleString("de-DE")} kWh`],
                  ["Invest brutto", `${result.investBrutto.toLocaleString("de-DE")} €`],
                  ["BEG-Förderung", `${(result.beg.rate * 100).toFixed(0)} % · ${result.beg.amount.toLocaleString("de-DE")} €`],
                  ["Invest netto", `${result.investNetto.toLocaleString("de-DE")} €`],
                  [`WP Strom 20 J`, `${result.stromKosten.toLocaleString("de-DE")} €`],
                  // Wartung und die Anschaffung der fossilen Alternative fehlten hier —
                  // dadurch ließ sich ausgerechnet die Summe darunter nicht nachrechnen.
                  ["WP Wartung + Grundpreis 20 J", `${result.wartungWp.toLocaleString("de-DE")} €`],
                  ...(result.gasInvest > 0 ? [[`Neue ${fuel.refLabel}`, `${result.gasInvest.toLocaleString("de-DE")} €`] as [string, string]] : []),
                  [`${fuel.label} Brennstoff 20 J`, `${result.gasKosten.toLocaleString("de-DE")} €`],
                  ...(result.gasFix > 0 ? [[`${fuel.label} Grundgebühr 20 J`, `${result.gasFix.toLocaleString("de-DE")} €`] as [string, string]] : []),
                  [`${fuel.refLabel} Wartung 20 J`, `${result.gasWartung.toLocaleString("de-DE")} €`],
                  ["TCO Wärmepumpe", `${result.tcoWp.toLocaleString("de-DE")} €`],
                  [`TCO ${fuel.refLabel}`, `${result.tcoGas.toLocaleString("de-DE")} €`],
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
                  Quellen: Fraunhofer ISE „WPsmart im Bestand" (JAZ-Modell), Verbraucherzentrale RLP, Auswertung von 160 Wärmepumpen-Angeboten (Investition), KfW Merkblatt 458 / BEG EM ab 21.07.2026 (Förderung), BDEW (Strom-/Gaspreise), dena-Gebäudereport &amp; DIN V 18599 (Heizwärmebedarf), BEHG + EU ETS2 (CO₂-Preispfad).
                </div>
                {inputs.situation === "bestand" && result.beg.amount > 0 && (
                  <div style={{ fontSize: 11, color: v('--color-text-muted'), paddingTop: 8, lineHeight: 1.6 }}>
                    Voreingestellt ist der Regelfall: selbstnutzender Eigentümer, der eine mindestens 20 Jahre alte Gasheizung ersetzt (Grundförderung + Klima-Geschwindigkeits-Bonus). Selbstnutzung und alte Heizung kannst du oben umstellen; der Einkommens-Bonus hängt von deinem Haushaltseinkommen ab und ist standardmäßig nicht eingerechnet. Ob die Boni bei dir greifen, hängt von deiner individuellen Situation ab. Wann der Antrag gestellt sein muss, steht oben am Förderbetrag — dort in der geprüften Fassung, statt hier ein zweites Mal.
                  </div>
                )}
              </div>
            </details>

            {/* PV-Synergie */}
            <div style={{ background: v('--color-bg'), borderRadius: v('--radius-md'), padding: "14px 16px", marginBottom: 16, border: `1px solid ${pvStatus !== "nein" ? v('--color-accent') : v('--color-border')}` }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
                <IconSun size={iconSizes.md} color={v('--color-accent')} />
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

                  <div style={{ marginTop: 10, fontSize: 12, color: v('--color-text-muted'), lineHeight: 1.6 }}>
                    WP-Synergie durch PV: <span style={{ fontWeight: 700, color: v('--color-positive'), fontFamily: v('--font-mono') }}>{result.pvBenefit.toLocaleString("de-DE")} €</span> über {DEFAULT_HEATPUMP_CONFIG.years} Jahre — die PV deckt <span style={{ fontFamily: v('--font-mono') }}>{Math.round(result.pvCoverage * 100)} %</span> des WP-Strombedarfs.
                    <div style={{ marginTop: 4, fontSize: 11, color: v('--color-text-faint') }}>
                      Angerechnet wird nur der Solarstrom, den die Wärmepumpe zusätzlich selbst verbraucht (spart den WP-Tarif statt niedriger Einspeisung). Die PV-Anschaffung und ihr voller Nutzen (Haushaltsstrom, Einspeisung) rechnest du im <Link href="/photovoltaik-rechner" style={{ color: v('--color-accent'), textDecoration: "underline" }}>PV-Rechner</Link> — das gehört nicht in die Wärmepumpe-vs-Gas-Rechnung.
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Teilen — der Link trägt die ganze Rechnung, auch den Förderstand.
                Ohne ihn bekäme der Empfänger unsere Förderannahme auf seine
                eigenen Gebäudewerte gerechnet. */}
            <div style={{ display: "flex", gap: 5, alignItems: "center", padding: "10px 0", marginBottom: 8 }}>
              <button
                onClick={handleCopy}
                title={copied ? "Kopiert!" : "Link kopieren"}
                aria-label="Link zu diesem Ergebnis kopieren"
                style={shareBtnStyle(copied)}
              >
                {copied ? <IconCheck size={iconSizes.md} /> : <IconLink size={iconSizes.md} />}
              </button>
              {canShare && (
                <button onClick={handleNativeShare} title="Teilen" aria-label="Ergebnis teilen" style={shareBtnStyle()}>
                  <IconShare size={iconSizes.md} />
                </button>
              )}
              <button onClick={handleWhatsApp} title="WhatsApp" aria-label="Ergebnis per WhatsApp teilen" style={shareBtnStyle()}>
                <IconWhatsApp size={iconSizes.md} />
              </button>
              <span style={{ fontSize: 12, color: v('--color-text-muted'), marginLeft: 4 }}>
                {copied ? "Link kopiert — er enthält deine ganze Rechnung." : "Ergebnis teilen"}
              </span>
            </div>

            {/* Aktionen */}
            <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
              <Link href={`/photovoltaik-rechner${pvStatus !== "nein" ? `?a=${pvKwp <= 5 ? 0 : pvKwp <= 8 ? 1 : pvKwp <= 10 ? 2 : pvKwp <= 15 ? 3 : 4}${pvKwp > 15 ? `&ck=${pvKwp}` : ""}&s=${pvSpeicher === 0 ? 0 : pvSpeicher <= 5 ? 1 : pvSpeicher <= 10 ? 2 : 3}&wp=ja` : ""}`} style={{ flex: 1, padding: "12px", borderRadius: v('--radius-md'), fontSize: 13, fontWeight: 700, background: v('--color-accent'), border: "none", color: v('--color-text-on-accent'), cursor: "pointer", textDecoration: "none", textAlign: "center" }}>
                PV-Rechner öffnen <IconArrowRight size={iconSizes.sm} />
              </Link>
              <button onClick={() => { setHeizkoerperTausch(false); setWegId("ist"); setSelbstnutzer(true); setAltheizung("gas_alt"); setEinkommen("none"); setKindImHaushalt(false); setOHeizlast(null); setOQges(null); setOJaz(null); setOInvest(null); setOGasPrice(null); setOStromPrice(null); setOFossilInvest(null); setOFuel("gas_neu"); setHaustypIdx(0); setStep(0); /* Die Adresse mitleeren: Sonst stehen die Angaben des geteilten Links noch darin, und ein Neuladen holt die gerade verworfene Rechnung zurück. */ if (typeof window !== "undefined") window.history.replaceState(null, "", window.location.pathname); }} style={{ flex: 1, padding: "12px", borderRadius: v('--radius-md'), fontSize: 13, fontWeight: 600, background: "transparent", border: `1px solid ${v('--color-border-muted')}`, color: v('--color-text-secondary'), cursor: "pointer" }}>
                <span style={{ display: "inline-flex", alignItems: "center", gap: 6, justifyContent: "center" }}><IconRefresh size={iconSizes.sm} /> Neu berechnen</span>
              </button>
            </div>

            <div style={{ textAlign: "center", fontSize: 11, color: v('--color-text-faint'), padding: "8px 0" }}>
              {/* „±15 %" stand zwei Zeilen unter einer selbst ausgewiesenen Spanne von
                  Faktor 15 — zwei Genauigkeitsaussagen, die einander widersprachen.
                  Die ehrliche ist die Spanne im Ergebnis. */}
              Gerechnet mit Durchschnittswerten über {DEFAULT_HEATPUMP_CONFIG.years} Jahre. Wie weit das Ergebnis je nach Energiepreis-Annahme auseinandergeht, steht als Spanne unter der Einsparung.
            </div>
          </div>
        )}

        {/* Der Aktualisierungsstand steht INNERHALB der Rechner-Spalte, nicht
            unter ihr: Der Rahmen ist mindestens bildschirmhoch, ein Absatz
            dahinter läge hinter einer leeren Fläche und wäre praktisch
            unsichtbar. Im eingebetteten Widget entfällt er — dort trägt die
            einbettende Seite die Quellenangabe. */}
        {!embedded && <StandNoteView seite={stand} />}
      </div>
    </div>
  );
}

// ─── Helpers ───────────────────────────────────────────────────

// Transparente Aufschlüsselung, wie die Einsparung zustande kommt (20-J-TCO).
// sanierungHinweis: erklärt, warum ein Sanierungs-Weg wirtschaftlich oft
// schwächer aussieht (weniger Heizbedarf = weniger ersetztes Gas).
function TcoBreakdown({ r, situation, jahre, sanierungHinweis, refLabel }: { r: HeatPumpResult; situation: "bestand" | "neubau"; jahre: number; sanierungHinweis?: boolean; refLabel: string }) {
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
        <Row label="Strom" val={r.stromKosten} />
        <Row label="Wartung" val={r.wartungWp} />
        {r.pvBenefit > 0 && <Row label="− PV-Synergie" val={-r.pvBenefit} />}
        <div style={{ borderTop: `1px solid ${v('--color-border')}`, marginTop: 2, paddingTop: 2 }}><Row label="Summe" val={r.tcoWp} strong /></div>
      </div>
      <div style={{ marginBottom: 8 }}>
        <div style={{ fontWeight: 700, marginBottom: 2 }}>{situation === "neubau" ? `Neue ${refLabel} kostet` : `Stattdessen neue ${refLabel} kostet`}</div>
        {r.gasInvest > 0 && <Row label="Anschaffung" val={r.gasInvest} />}
        <Row label="Brennstoff (inkl. steigendem CO₂-Preis)" val={r.gasKosten} />
        {/* Grundgebühr nur zeigen, wenn es sie gibt — beim Öltank hängt an keinem
            Anschluss eine laufende Gebühr, eine „0 €"-Zeile wäre nur Rauschen. */}
        {r.gasFix > 0 && <Row label="Grundgebühr" val={r.gasFix} />}
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
        {help && <InfoTooltip title={helpTitle} ariaLabel={helpAriaLabel ?? "Mehr Infos"} size={iconSizes.sm}>{help}</InfoTooltip>}
      </div>
      <div style={{ fontSize: 18, fontWeight: 800, fontFamily: v('--font-mono'), color: positive ? v('--color-positive') : v('--color-text-primary') }}>{value}</div>
    </div>
  );
}

// BEG Einkommens-Bonus (KfW 458 ab 21.07.2026): gestaffelt nach zu versteuerndem
// Haushaltsjahreseinkommen. Das repräsentative Einkommen pro Stufe reicht, weil die
// Rechen-Engine (calcBegSubsidy) daraus die Stufe + den Familienzuschlag ableitet.
type EinkommenKey = "none" | "bis50" | "bis40" | "bis30";
const EINKOMMEN_OPTIONS: { key: EinkommenKey; label: string; income?: number }[] = [
  { key: "none",  label: "über 50.000 € / kein Bonus" },
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
const ALTHEIZUNG_OPTIONS: { key: AltheizungKey; label: string; klima: boolean }[] = [
  { key: "oel_kohle", label: "Öl, Kohle, Nachtspeicher oder Gas-Etagenheizung", klima: true },
  { key: "gas_alt",   label: "Gas-Zentralheizung, Holz oder Pellets — 20 Jahre oder älter", klima: true },
  { key: "gas_neu",   label: "Gas-Zentralheizung, Holz oder Pellets — jünger als 20 Jahre", klima: false },
  { key: "andere",    label: "Etwas anderes (z. B. schon Strom/Wärmepumpe)", klima: false },
];
const altheizungKlima = (k: AltheizungKey): boolean => ALTHEIZUNG_OPTIONS.find(o => o.key === k)?.klima ?? false;

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

function WegCard({ titel, kurz, r, active, onClick, situation, sanierung, refLabel }: { titel: string; kurz: string; r: HeatPumpResult; active: boolean; onClick: () => void; situation: "bestand" | "neubau"; sanierung: boolean; refLabel: string }) {
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
          {active && <IconCheck size={iconSizes.md} color={v('--color-accent')} />}
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
              <TcoBreakdown r={r} situation={situation} jahre={DEFAULT_HEATPUMP_CONFIG.years} sanierungHinweis={sanierung} refLabel={refLabel} />
            </InfoTooltip>
          </span>
        </div>
        <div style={{ fontSize: 11, color: v('--color-text-muted') }}>
          {r.investNetto - r.gasInvest <= 0
            ? "keine Mehrkosten"
            : r.amortisationsJahre !== null ? `Mehrkosten drin nach ${r.amortisationsJahre} J` : `Mehrkosten > ${DEFAULT_HEATPUMP_CONFIG.years} J nicht drin`}
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
