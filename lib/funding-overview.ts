import { deckt, fundingAmount, technikenVon, type FundingAnlage, type FundingProgram, type FundingTechnik } from "./funding-programs";

export const FUNDING_EXAMPLES: Record<FundingTechnik, { label: string; system: FundingAnlage }> = {
  pv: { label: "10 kWp Photovoltaik, 5 kWh Speicher, 20.000 € Kosten", system: { technik: "pv", kwp: 10, speicherKwh: 5, kosten: 20000 } },
  balkon: { label: "800 Wp Balkonkraftwerk ohne Speicher, 600 € Kosten; Wohnform offen", system: { technik: "balkon", wattPeak: 800, speicherKwh: 0, kosten: 600 } },
  waermepumpe: { label: "Wärmepumpe, 30.000 € förderfähige Kosten", system: { technik: "waermepumpe", kosten: 30000 } },
};

export function fundingExampleAmount(program: FundingProgram, technology: FundingTechnik): number | null {
  if (!technikenVon(program).includes(technology)) return null;
  const result = fundingAmount(program, FUNDING_EXAMPLES[technology].system);
  return result.active && result.computable ? result.total : null;
}

export type FundingOverviewEntry = Pick<FundingProgram, "id" | "name" | "agsCode" | "agsCodes"> & {
  technologies: FundingTechnik[];
  amounts: Record<FundingTechnik, number | null>;
};

export function orderFundingEntries<T extends FundingOverviewEntry>(entries: T[], technology: FundingTechnik | "", order: string, ags?: string): T[] {
  return entries.filter(entry => (!technology || entry.technologies.includes(technology)) && (!ags || deckt(entry, ags)))
    .sort((a, b) => {
      if (order === "amount" && technology) {
        const aAmount = a.amounts[technology];
        const bAmount = b.amounts[technology];
        if (aAmount !== bAmount) return (bAmount ?? -1) - (aAmount ?? -1);
      }
      return a.name.localeCompare(b.name, "de");
    });
}
