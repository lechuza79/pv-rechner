import { fundingAmount, fundingZaehlt, stackFunding, type FundingProgram, type Wohnform } from "./funding-programs";

export interface BalkonFundingContext {
  programs: FundingProgram[];
  enabled: boolean;
  locationKnown?: boolean;
  wohnform?: Wohnform;
}

/** One grant assessment for the result and every competing package. */
export function balkonFunding(
  hardware: { moduleWp: number; speicherKwh: number },
  grossInvestment: number,
  context?: BalkonFundingContext,
) {
  const stack = stackFunding(context?.programs ?? [], {
    technik: "balkon", wattPeak: hardware.moduleWp, speicherKwh: hardware.speicherKwh,
    kosten: grossInvestment, wohnform: context?.wohnform,
  });
  const grant = context?.enabled ? stack.total : 0;
  const programs = context?.programs ?? [];
  let label = "Keine Förderung";
  let reasons: string[] = [];
  if (context && !context.enabled) {
    label = "Nicht angerechnet";
    reasons = ["Du hast die Förderung für diese Berechnung ausgeschaltet."];
  } else if (!programs.length) {
    label = context?.locationKnown ? "Keine Förderung" : "Standort prüfen";
    reasons = [context?.locationKnown ? "Für deinen Standort liegt uns kein passendes Förderprogramm vor." : "Wähle deinen Standort, damit wir passende Förderprogramme prüfen können."];
  } else if (grant === 0) {
    reasons = programs.map(program => {
      const scope = program.region ?? program.name;
      if (!fundingZaehlt(program)) {
        if (program.status === "aktiv") label = "Förderung offen";
        return `${scope}: Dieses Programm kann derzeit nicht angerechnet werden, weil es nicht aktiv ist oder eine aktuelle Bestätigung fehlt.`;
      }
      if (program.balkonNurMitSpeicher && hardware.speicherKwh <= 0) return `${scope}: Gefördert werden nur Balkonkraftwerke mit Speicher. Dieses Set hat keinen Speicher.`;
      if (program.nurWohnform && !context?.wohnform) {
        label = "Angaben fehlen";
        return `${scope}: Bitte gib an, ob du zur Miete oder im Eigentum wohnst.`;
      }
      if (program.nurWohnform && program.nurWohnform !== context?.wohnform) return `${scope}: Das Programm gilt nur für ${program.nurWohnform === "mieter" ? "Mieterinnen und Mieter" : "Eigentümerinnen und Eigentümer"}.`;
      const amount = fundingAmount(program, { technik: "balkon", wattPeak: hardware.moduleWp, speicherKwh: hardware.speicherKwh, kosten: grossInvestment, wohnform: context?.wohnform });
      if (!amount.computable) {
        label = "Förderung offen";
        return `${scope}: Die Bedingungen dieses Programms lassen sich mit deinen Angaben nicht automatisch berechnen. Bitte prüfe die Programmdetails.`;
      }
      return `${scope}: Für dieses Set ergibt sich nach den hinterlegten Förderregeln kein anrechenbarer Zuschuss.`;
    });
  }
  return { stack, grant, investment: Math.max(0, grossInvestment - grant), label, reasons };

}
