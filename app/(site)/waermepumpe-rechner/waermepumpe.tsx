"use client";
import { useState, useMemo, type ReactNode } from "react";
import Link from "next/link";
import {
  SITUATION, WOHNFLAECHEN, INSULATION_BESTAND, INSULATION_NEUBAU,
  PERSONEN, HEIZSYSTEM, WP_TYPE, WP_FUEL_OPTIONS, HAUSTYP_WP, YEAR,
} from "../../../lib/constants";
import { calcHeatPump, calcHeatPumpScenarios, heatPumpScenarioAdj, estimatePvCoverageOfWp, type HeatPumpInputs, type HeatPumpResult } from "../../../lib/heatpump";
import { DEFAULT_HEATPUMP_CONFIG } from "../../../lib/heatpump-config";
import { greenGasApplies } from "../../../lib/fossil-reference";
import { gasMixSeries, heatCostComparisonSeries } from "../../../lib/greengas";
import { bioTreppeStufenText, gmodgStandSatz, GMODG_RECHTSSTAND } from "../../../lib/greengas-config";
import OptionCard from "../../../components/OptionCard";
import InlineEdit from "../../../components/InlineEdit";
import HeatPumpChart from "./_components/HeatPumpChart";
import GasPriceStackChart from "../../../components/charts/GasPriceStackChart";
import HeatCostCompareChart from "../../../components/charts/HeatCostCompareChart";
import Modal from "../../../components/Modal";
import GlossaryTerm from "../../../components/GlossaryTerm";
import InfoTooltip from "../../../components/InfoTooltip";
import { IconArrowRight, IconRefresh, IconChevronDown, IconSun, IconSparkle, IconCheck } from "../../../components/Icons";
import { v, iconSizes } from "../../../lib/theme";
import { trackEvent } from "../../../lib/analytics";

const STEPS = ["Situation", "Größe & Typ", "Dämmstandard", "Haushalt", "Heizsystem"];

// `embedded` = gerendert in einem Modal (z. B. aus dem Förder-Ratgeber), nicht
// als eigene Seite: dann ohne 100vh-Höhe, ohne Seitentitel und volle Breite —
// den Titel liefert der Modal-Header. Kein iframe, keine URL-/Storage-Kopplung.
export default function Waermepumpe({ embedded = false }: { embedded?: boolean } = {}) {
  // ── Step state ───────────────────────────────────────────────
  const [step, setStep] = useState(0);
  const [situation, setSituation] = useState<"bestand" | "neubau">("bestand");
  const [flaecheIdx, setFlaecheIdx] = useState(1);         // 140 m² default
  const [customFlaeche, setCustomFlaeche] = useState<number | null>(null);
  const [customFlaecheDraft, setCustomFlaecheDraft] = useState<string>("");
  const [haustypIdx, setHaustypIdx] = useState(0);         // freistehend default
  const [insulationIdx, setInsulationIdx] = useState(1);   // teilsaniert / KfW 55
  const [personen, setPersonen] = useState(2);             // 3–4
  const [heizsystem, setHeizsystem] = useState<"fbh" | "hk_neu" | "hk_alt">("fbh");
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
  const [wegId, setWegId] = useState("ist");  // aktiver Sanierungs-/Maßnahmen-Weg (Szenario-Vergleich)
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
  const fuel = fuelOptions.find(f => f.id === oFuel) ?? fuelOptions[0];
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

  const isResult = step >= STEPS.length;
  const next = () => {
    if (step >= STEPS.length) return;
    const target = step + 1;
    if (target === STEPS.length) trackEvent("waermepumpe_ergebnis");
    setStep(target);
  };
  const back = () => step > 0 && setStep(step - 1);

  // ── Resolved wohnfläche ──────────────────────────────────────
  const wohnflaeche = customFlaeche ?? WOHNFLAECHEN[flaecheIdx].m2;

  // ── Rechen-Config ────────────────────────────────────────────
  // Der geprüfte Config-Snapshot (lib/heatpump-config.ts). Die Investition kommt
  // bewusst NICHT aus einer gescrapten Portal-Kostenseite, sondern ist an echten
  // Angeboten kalibriert (Verbraucherzentrale RLP) und wird vom jährlichen
  // WP-Wächter gepflegt — siehe scripts/waermepumpe-verify.md.
  const cfg = DEFAULT_HEATPUMP_CONFIG;

  // ── Build inputs + calculate ─────────────────────────────────
  const inputs: HeatPumpInputs = useMemo(() => ({
    situation, wohnflaeche, insulationIdx,
    personen: PERSONEN[personen].count,
    heizsystem, wpType, heizkoerperTausch,
    haustypFaktor: HAUSTYP_WP[haustypIdx].faktor,
    fuelKind: fuel.kind,
    greenGas,
    pv: pvStatus !== "nein" ? { status: pvStatus, kwp: pvKwp, speicherKwh: pvSpeicher } : undefined,
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
    },
  }), [situation, wohnflaeche, insulationIdx, personen, heizsystem, wpType, heizkoerperTausch, haustypIdx, greenGas, pvStatus, pvKwp, pvSpeicher, oQges, oHeizlast, oJaz, oInvest, oStromPrice, oGasPrice, oFossilInvest, fuel, selbstnutzer, altheizung, einkommen, kindImHaushalt]);

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
                      value={customFlaecheDraft}
                      onChange={e => {
                        // Nur Ziffern akzeptieren, aber während der Eingabe jeden Wert im Feld zulassen
                        const raw = e.target.value.replace(/\D/g, "");
                        setCustomFlaecheDraft(raw);
                        if (raw === "") {
                          setCustomFlaeche(null);
                        } else {
                          const n = parseInt(raw);
                          if (!isNaN(n) && n >= 30 && n <= 500) setCustomFlaeche(n);
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
                    <OptionCard key={h.id} selected={haustypIdx === i} onClick={() => setHaustypIdx(i)} label={h.label} sub={h.sub} />
                  ))}
                </div>
                <div style={{ fontSize: 12, color: v('--color-text-muted'), marginTop: 10, lineHeight: 1.5 }}>
                  Geteilte Wände mit Nachbarn senken den Wärmeverlust — ein Reihenhaus braucht eine kleinere (günstigere) Wärmepumpe als ein freistehendes Haus gleicher Größe.
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
                <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>{step === STEPS.length - 1 ? <>Ergebnis anzeigen <IconArrowRight size={iconSizes.md} /></> : <>Weiter <IconArrowRight size={iconSizes.md} /></>}</span>
              </button>
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
                  {bioTreppeStufenText()} ihrer Wärme klimafreundlich erzeugen — bei Öl über Bioheizöl, wahlweise auch über
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
                  { h: "Die Bio-Treppe (§ 43 GModG)", p: `Das Gebäudemodernisierungsgesetz verpflichtet eine Heizung für Gas, Heizöl oder Flüssiggas, die nach dem ${GMODG_RECHTSSTAND.inKraftSeit} neu eingebaut wird — beim Einbau in ein bestehendes Gebäude ebenso wie in Neubauten, die bis zum ${GMODG_RECHTSSTAND.neubauBioTreppeBis} errichtet werden —, ab 2029 einen wachsenden Anteil klimafreundlicher Brennstoffe beizumischen. Das Gesetz nennt vier Stufen: ${bioTreppeStufenText()}. Anrechenbar sind neben Biomethan auch Bioheizöl, biogenes Flüssiggas sowie Wasserstoff und dessen Derivate; beim Netzgas läuft es auf Biomethan hinaus, und das kostet rund doppelt so viel wie Erdgas. Zusammen mit steigenden Netzentgelten — weil immer weniger Haushalte am Gasnetz hängen — treibt das den Gaspreis deutlich stärker als die allgemeine Teuerung. Statt beizumischen lässt sich die Pflicht auch über Solarthermie, eine Lüftungsanlage mit Wärmerückgewinnung oder eine Wärmepumpen-Hybridheizung erfüllen (§ 43 Absatz 3 bis 5 GModG); fällt die alte Anlage irreparabel aus, greift sie zwölf Monate später (§ 43 Absatz 7). Wir rechnen den teuersten Weg, die reine Beimischung.` },
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
                      : <>rechnet sich eine Wärmepumpe schon: <span style={{ fontWeight: 700, fontFamily: v('--font-mono'), color: v('--color-positive') }}>+{istResult.tcoEinsparung.toLocaleString("de-DE")} €</span>{istResult.amortisationsJahre !== null ? `, Amortisation in ${istResult.amortisationsJahre} Jahren` : ""}.</>}
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
                <div style={{ fontSize: 11.5, color: v('--color-text-muted'), marginBottom: 10 }}>
                  {Math.round(result.beg.rate * 100)} % der förderfähigen Kosten
                  {result.investBrutto > DEFAULT_HEATPUMP_CONFIG.begMaxCap
                    ? <> · gedeckelt bei {DEFAULT_HEATPUMP_CONFIG.begMaxCap.toLocaleString("de-DE")} € (deine Anlage liegt darüber, daher {Math.round(result.beg.rate * 100)} % × {DEFAULT_HEATPUMP_CONFIG.begMaxCap.toLocaleString("de-DE")} €)</>
                    : null}
                </div>
                <div style={{ fontSize: 12, color: v('--color-text-muted'), display: "flex", alignItems: "center", gap: 5, marginBottom: 6 }}>
                  <span style={{ display: "inline-block", width: 13, height: 13, borderRadius: 3, background: v('--color-accent'), flexShrink: 0 }} />
                  Grundförderung 30 % — bekommt jeder Heizungstausch im Bestand
                </div>
                <BonusToggle checked={selbstnutzer} onChange={c => { setSelbstnutzer(c); setOInvest(null); }} label="Ich wohne selbst im Gebäude" tipTitle="Selbstnutzung">
                  Sowohl der Klima-Geschwindigkeits-Bonus als auch der Einkommens-Bonus setzen voraus, dass du selbst im Gebäude wohnst. Wer vermietet, bekommt nur die Grundförderung von 30 %. Quelle: KfW Merkblatt 458 (BEG EM), gültig ab 21.07.2026.
                </BonusToggle>
                {selbstnutzer ? (
                  <>
                    <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: v('--color-text-secondary'), marginBottom: 4, flexWrap: "wrap" }}>
                      <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
                        Alte Heizung
                        <InfoTooltip title="Klima-Geschwindigkeits-Bonus" ariaLabel="Klima-Geschwindigkeits-Bonus">
                          16 % Zusatzförderung, wenn eine funktionierende fossile Heizung ersetzt wird: Öl, Kohle und Nachtspeicher zählen unabhängig vom Alter, Gas-, Holz- und Pelletheizungen erst ab 20 Jahren. Das Baujahr steht auf dem Typenschild am Kessel. Der Bonus sinkt ab dem 1. Februar 2027 schrittweise. Quelle: KfW Merkblatt 458 (BEG EM), gültig ab 21.07.2026.
                        </InfoTooltip>
                      </span>
                      <select value={altheizung} onChange={e => { setAltheizung(e.target.value as AltheizungKey); setOInvest(null); }}
                        style={{ fontSize: 12, padding: "3px 6px", borderRadius: v('--radius-md'), border: `1px solid ${v('--color-border')}`, background: v('--color-bg'), color: v('--color-text-secondary'), cursor: "pointer" }}>
                        {ALTHEIZUNG_OPTIONS.map(o => <option key={o.key} value={o.key}>{o.label}</option>)}
                      </select>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: v('--color-text-secondary'), marginBottom: 4, flexWrap: "wrap" }}>
                      <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
                        Einkommens-Bonus
                        <InfoTooltip title="Einkommens-Bonus" ariaLabel="Einkommens-Bonus">
                          Zusatzförderung für selbstnutzende Eigentümer, gestaffelt nach zu versteuerndem Haushaltsjahreseinkommen: bis 30.000 € +40 %, bis 40.000 € +30 %, bis 50.000 € +10 %. Bei der untersten Stufe steigt der Förderdeckel auf 80 %. Quelle: KfW Merkblatt 458 (BEG EM), gültig ab 21.07.2026.
                        </InfoTooltip>
                      </span>
                      <select value={einkommen} onChange={e => { setEinkommen(e.target.value as EinkommenKey); setOInvest(null); }}
                        style={{ fontSize: 12, padding: "3px 6px", borderRadius: v('--radius-md'), border: `1px solid ${v('--color-border')}`, background: v('--color-bg'), color: v('--color-text-secondary'), cursor: "pointer" }}>
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
              </div>
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

              {/* Editierbare Kernannahmen */}
              <div style={{ marginTop: 18, borderTop: `1px solid ${v('--color-border-accent')}`, paddingTop: 14, fontSize: 13, lineHeight: 2 }}>
                <div>Heizwärmebedarf: <InlineEdit value={result.qGes} onCommit={v => setOQges(v)} unit=" kWh" min={1000} max={80000} step={500} width={90} /></div>
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
              <StatCard label="Amortisation" value={sel.amortisationsJahre !== null ? `${sel.amortisationsJahre} J` : "> 20 J"} positive={sel.amortisationsJahre !== null && sel.amortisationsJahre <= 15} />
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
                    Voreingestellt ist der Regelfall: selbstnutzender Eigentümer, der eine mindestens 20 Jahre alte Gasheizung ersetzt (Grundförderung + Klima-Geschwindigkeits-Bonus). Selbstnutzung und alte Heizung kannst du oben umstellen; der Einkommens-Bonus hängt von deinem Haushaltseinkommen ab und ist standardmäßig nicht eingerechnet. Die Förderung muss vor der Beauftragung bei der KfW beantragt werden — ob die Boni bei dir greifen, hängt von deiner individuellen Situation ab.
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

            {/* Aktionen */}
            <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
              <Link href={`/photovoltaik-rechner${pvStatus !== "nein" ? `?a=${pvKwp <= 5 ? 0 : pvKwp <= 8 ? 1 : pvKwp <= 10 ? 2 : pvKwp <= 15 ? 3 : 4}${pvKwp > 15 ? `&ck=${pvKwp}` : ""}&s=${pvSpeicher === 0 ? 0 : pvSpeicher <= 5 ? 1 : pvSpeicher <= 10 ? 2 : 3}&wp=ja` : ""}`} style={{ flex: 1, padding: "12px", borderRadius: v('--radius-md'), fontSize: 13, fontWeight: 700, background: v('--color-accent'), border: "none", color: v('--color-text-on-accent'), cursor: "pointer", textDecoration: "none", textAlign: "center" }}>
                PV-Rechner öffnen <IconArrowRight size={iconSizes.sm} />
              </Link>
              <button onClick={() => { setHeizkoerperTausch(false); setWegId("ist"); setSelbstnutzer(true); setAltheizung("gas_alt"); setEinkommen("none"); setKindImHaushalt(false); setOHeizlast(null); setOQges(null); setOJaz(null); setOInvest(null); setOGasPrice(null); setOStromPrice(null); setOFossilInvest(null); setOFuel("gas_neu"); setHaustypIdx(0); setStep(0); }} style={{ flex: 1, padding: "12px", borderRadius: v('--radius-md'), fontSize: 13, fontWeight: 600, background: "transparent", border: `1px solid ${v('--color-border-muted')}`, color: v('--color-text-secondary'), cursor: "pointer" }}>
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
const ALTHEIZUNG_OPTIONS: { key: AltheizungKey; label: string; klima: boolean }[] = [
  { key: "oel_kohle", label: "Öl, Kohle oder Nachtspeicher", klima: true },
  { key: "gas_alt",   label: "Gas, Holz oder Pellets — 20 Jahre oder älter", klima: true },
  { key: "gas_neu",   label: "Gas, Holz oder Pellets — jünger als 20 Jahre", klima: false },
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
          {r.amortisationsJahre !== null ? `Amortisation ${r.amortisationsJahre} J` : `Amortisation > ${DEFAULT_HEATPUMP_CONFIG.years} J`}
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
