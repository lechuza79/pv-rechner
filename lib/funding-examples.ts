import { calcBalkon, type BalkonInputs } from "./balkon";
import { DEFAULT_BALKON_CONFIG } from "./balkon-config";
import { calc, calcEigenverbrauchExakt, estimateCost, calcWeightedFeedIn, batteryReplaceCost } from "./calc";
import { DEFAULT_FEED_IN } from "./feedin-config";
import { DEFAULT_PRICES } from "./prices-config";
import { PERSONEN, NUTZUNG, YEARS } from "./constants";
import { FUNDING_PROGRAMS, fundingAmount, type FundingProgram } from "./funding-programs";

// Shared example-calculation model for the funding landing pages. The city page
// and the Bundesland page both lead with three typical systems (5 / 10 / 15 kWp)
// so the visitor sees concrete economics before the program details. Keeping the
// math in one place means both pages rest on the same assumptions as the rechner
// (single source of truth: calc, calcEigenverbrauch, estimateCost).

export type FundingExample = {
  kwp: number;
  spKwh: number;
  brutto: number;
  foerderung: number;
  /** True if a concrete € amount could be derived; false for free-text-only programs. */
  foerderComputable: boolean;
  netto: number;
  assumption?: string;
  withoutFunding: { amort: number | null; total: number };
  amort: number | null;
  total: number;
};

const EXAMPLE_CONFIGS = [
  { kwp: 5, spKwh: 0 },
  { kwp: 10, spKwh: 5 },
  { kwp: 15, spKwh: 10 },
];

export function fundingExampleAssumptions(yieldKwhKwp: number): string {
  const format = (n: number) => n.toLocaleString("de-DE", { maximumFractionDigits: 2 });
  return `${PERSONEN[2].label} Personen, ${format(PERSONEN[2].verbrauch)} kWh Haushaltsstrom pro Jahr, Nutzungsprofil „${NUTZUNG[1].label}“, ohne Wärmepumpe und Elektroauto. Jahresertrag ${format(yieldKwhKwp)} kWh je kWp. Strompreis zu Beginn ${format(DEFAULT_PRICES.electricityPrice * 100)} ct/kWh, angenommene jährliche Änderung ${format(DEFAULT_PRICES.electricityIncrease * 100)} %. Investition nach dem Kostenmodell des Rechners; Speicherersatz im Jahr 15 berücksichtigt. Betrachtung über ${YEARS} Jahre; Amortisationszeiten auf ganze Jahre gerundet. Eigenverbrauch und Einspeisevergütung werden je Anlagengröße berechnet. Es handelt sich um Modellannahmen, nicht um ein Angebot oder eine Ertragsgarantie.`;
}

/**
 * Build the three example systems for a regional yield. Pass a funding program
 * to subtract its grant (city page); omit it for a yield-only view (Bundesland
 * page, where the grant varies by municipality).
 *
 * Assumptions come from the canonical DEFAULT_PRICES (Strompreis + Anstieg) and
 * estimateCost: these pages are statically generated, so no live prices — the
 * numbers are illustrative and the CTA leads into the rechner with live values.
 */
export function buildFundingExamples(yieldKwhKwp: number, f?: FundingProgram): FundingExample[] {
  return EXAMPLE_CONFIGS.map(({ kwp, spKwh }) => {
    const ev = calcEigenverbrauchExakt({
      personenIdx: 2, nutzungIdx: 1, speicherKwh: spKwh,
      wp: "nein", ea: "nein", eaKm: 15000, kwp, ertragKwp: yieldKwhKwp,
    });
    const brutto = estimateCost(kwp, spKwh);
    const einspeisung = calcWeightedFeedIn(kwp, DEFAULT_FEED_IN.teilUnder10, DEFAULT_FEED_IN.teilOver10);
    // Shared funding math (single source of truth, also used by the rechner).
    // Scenario rates remain confined to this illustrative calculation.
    // During catalogue rollout, use authored example metadata only if the live
    // programme still has exactly the reviewed rates and conditions. Live status
    // and verification remain authoritative; changed terms disable the fallback.
    const seed = f ? FUNDING_PROGRAMS[f.id] : undefined;
    const matchingTerms = f && seed && ["rates", "conditions", "coveredCosts", "eligibility", "url"]
      .every(key => JSON.stringify(f[key as keyof FundingProgram]) === JSON.stringify(seed[key as keyof FundingProgram]));
    const scenario = f?.exampleScenario ?? (matchingTerms ? seed?.exampleScenario : undefined);
    const exampleProgram = scenario ? { ...f!, ...scenario } : f;
    const fa = fundingAmount(exampleProgram, { technik: "pv", kwp, speicherKwh: spKwh, kosten: brutto });
    const foerderComputable = fa.computable;
    // Only subtract when the program currently accepts applications.
    const foerderung = fa.active ? fa.total : 0;
    const netto = Math.max(0, brutto - foerderung);
    const calculate = (kosten: number) => calc({
      kwp, kosten, strompreis: DEFAULT_PRICES.electricityPrice, eigenverbrauch: ev,
      einspeisung, stromSteigerung: DEFAULT_PRICES.electricityIncrease, ertragKwp: yieldKwhKwp, monthly: null,
      // Wie der Rechner: Ein Speicher wird im Jahr 15 ersetzt. Ohne diese Zeile
      // versprach die Förderseite 25.381 € Gewinn, der Rechner nach dem Klick
      // 23.727 € — gleiche Konfiguration, gleiche Beschriftung.
      batteryReplace: batteryReplaceCost(spKwh),
    });
    const result = calculate(netto);
    const baseline = foerderung > 0 ? calculate(brutto) : result;
    const assumption = foerderung > 0
      ? scenario?.assumption ?? "Beispiel für ein förderfähiges Vorhaben: Alle Voraussetzungen des genannten Programms sind erfüllt; Bewilligung und verfügbare Mittel vorausgesetzt."
      : undefined;
    return { assumption, withoutFunding: { amort: baseline.be ? baseline.be.i : null, total: baseline.total }, kwp, spKwh, brutto, foerderung, foerderComputable, netto, amort: result.be ? result.be.i : null, total: result.total };
  });
}

/** Balcony pages use the existing balcony model, never rooftop examples. */
export function buildBalconyFundingExample(yieldKwhKwp: number, program?: FundingProgram) {
  const set = DEFAULT_BALKON_CONFIG.sets.find(s => s.id === "duo")!;
  const inputs: BalkonInputs = { setId: set.id, storageId: "none", orientationId: "sued_gelaender", presenceId: "teils", haushaltKwh: PERSONEN[1].verbrauch, specificYield: yieldKwhKwp, stromPrice: DEFAULT_PRICES.electricityPrice };
  const baseline = calcBalkon(inputs);
  const amount = fundingAmount(program, { technik: "balkon", wattPeak: set.moduleWp, kosten: baseline.invest });
  const grant = amount.active && amount.computable && !program?.balkonNurMitSpeicher ? Math.min(baseline.invest, amount.total) : 0;
  const result = grant > 0 ? calcBalkon({ ...inputs, invest: baseline.invest - grant }) : baseline;
  return { set, baseline, grant, result, householdKwh: inputs.haushaltKwh };
}

export type FundingCaseExample = {
  title: string;
  motif: string;
  grant: number;
  description: string;
  result?: FundingExample;
};

/** Reviewed Heidelberg categories; changed catalogue terms disable these examples. */
export function buildHeidelbergFundingCases(yieldKwhKwp: number, program?: FundingProgram): FundingCaseExample[] | null {
  if (program?.id !== "heidelberg-rev") return null;
  const reviewed = FUNDING_PROGRAMS[program.id];
  if (JSON.stringify(program.rates) !== JSON.stringify(reviewed.rates)) return null;
  const roof = buildFundingExamples(yieldKwhKwp, program)[0];
  const eligible = roof.foerderung > 0;
  if (!eligible) return null;
  return [
    { title: "Dach-PV · 5 kWp ohne Speicher", motif: "house", grant: roof.foerderung,
      description: "5 kWp vollständig förderfähige Dachanlage außerhalb der PV-Pflicht × 100 €/kWp = 500 € Zuschuss.", result: roof },
    { title: "Fassaden-PV · 5 kWp", motif: "facade-pv", grant: eligible ? Math.min(5 * 200, 10000) : 0,
      description: "5 kWp vollständig förderfähige Fassadenanlage × 200 €/kWp = 1.000 € Zuschuss. Ein 25-Jahre-Ergebnis fehlt hier, weil unser Rechner Fassadenertrag und Montagekosten noch nicht gesondert abbildet." },
    { title: "Mieterstrom / gemeinschaftliche Gebäudeversorgung", motif: "tenant-solar", grant: eligible ? Math.min(5000 * 0.5, 2500) : 0,
      description: "Angenommen: 5.000 € anerkannte förderfähige investive Kosten. 50 % davon ergeben 2.500 € Zuschuss und erreichen den Höchstbetrag. Ein 25-Jahre-Ergebnis fehlt hier, weil unser Rechner das gemeinsame Verbrauchs- und Abrechnungsmodell noch nicht abbildet." },
  ];
}

/** Local pages use the programme's supported model; specialised cases stay source-bound. */
export function buildLocalFundingCases(yieldKwhKwp: number, program?: FundingProgram): FundingCaseExample[] | null {
  if (program?.id === "heidelberg-rev") return buildHeidelbergFundingCases(yieldKwhKwp, program);
  if (!program) return null;
  const example = buildFundingExamples(yieldKwhKwp, program).find(item => item.foerderComputable && item.foerderung > 0);
  if (!example) return null;
  return [{
    title: `Dach-PV · ${example.kwp} kWp ${example.spKwh ? `mit ${example.spKwh} kWh Speicher` : "ohne Speicher"}`,
    motif: "house", grant: example.foerderung, result: example,
    description: example.assumption ?? "Beispiel für ein vollständig förderfähiges Vorhaben. Bewilligung und verfügbare Mittel vorausgesetzt.",
  }];
}
