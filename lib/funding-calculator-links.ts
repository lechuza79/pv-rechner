import { fundingAmount, type FundingProgram, type FundingTechnik } from "./funding-programs";

export const FUNDING_CALCULATORS: Record<FundingTechnik, { label: string; href: string }> = {
  pv: { label: "Photovoltaik", href: "/photovoltaik-rechner" },
  balkon: { label: "Balkonkraftwerk", href: "/balkonkraftwerk/rechner" },
  waermepumpe: { label: "Wärmepumpe", href: "/waermepumpe-rechner" },
};

export function fundingCalculatorHref(program: FundingProgram, technology: FundingTechnik): string {
  const href = FUNDING_CALCULATORS[technology].href;
  return technology === "pv" && program.status === "aktiv" && fundingAmount(program, { technik: "pv", kwp: 10, speicherKwh: 5, kosten: 20000 }).computable
    ? `${href}?foe=${encodeURIComponent(program.id)}` : href;
}
