import type { FundingProgram } from "./funding-programs";

// FAQ wird aus den Förderdaten generiert (nicht separat gespeichert) — so
// spiegelt sie immer den Live-Stand der Programme aus der DB. Wird auf den
// Stadt-Seiten angezeigt UND als FAQPage-JSON-LD für Rich Results ausgegeben.

export interface FaqItem {
  q: string;
  a: string;
}

function statusText(s: FundingProgram["status"]): string {
  return s === "ausgeschoepft" ? "Mittel ausgeschöpft"
    : s === "pausiert" ? "pausiert"
    : s === "eingestellt" ? "eingestellt"
    : "Status derzeit unklar";
}

export function buildFundingFaq(
  cityName: string,
  program: FundingProgram | undefined,
  opts: { amortYears?: number | null } = {},
): FaqItem[] {
  const faq: FaqItem[] = [];
  const year = new Date().getFullYear();

  if (program) {
    const active = program.status === "aktiv";
    faq.push({
      q: `Welche Photovoltaik-Förderung gibt es in ${cityName}?`,
      a: `In ${cityName} fördert ${program.traeger} Photovoltaik über das Programm „${program.name}". Förderfähig sind ${program.coveredCosts}.`
        + (active ? "" : ` Das Programm nimmt derzeit allerdings keine neuen Anträge an (${statusText(program.status)}).`),
    });
    faq.push({
      q: `Wie hoch ist die PV-Förderung in ${cityName}?`,
      a: `Die Fördersätze sind: ${program.rates.map((r) => `${r.label} — ${r.value}`).join("; ")}.`
        + (program.maxFoerderung ? ` Es gilt ${program.maxFoerderung}.` : ""),
    });
    faq.push({
      q: `Lässt sich die Förderung in ${cityName} mit der Bundesförderung kombinieren?`,
      a: `Ja. Zusätzlich zur kommunalen Förderung gilt bundesweit die 0 % Mehrwertsteuer auf den Kauf und die Installation einer Photovoltaikanlage; über die KfW ist außerdem ein zinsgünstiger Kredit möglich.`,
    });
    faq.push({
      q: `Muss der Förderantrag vor dem Kauf gestellt werden?`,
      a: `In der Regel ja: Der Antrag muss meist vor dem Kauf oder der Montage bewilligt sein. Die genauen Bedingungen stehen in der offiziellen Förderrichtlinie des Programms.`,
    });
  } else {
    faq.push({
      q: `Welche Photovoltaik-Förderung gibt es in ${cityName}?`,
      a: `Für ${cityName} ist uns derzeit kein eigenes kommunales Förderprogramm für Photovoltaik bekannt. Bundesweit gilt jedoch die 0 % Mehrwertsteuer auf Kauf und Installation, und über die KfW ist ein zinsgünstiger Kredit möglich.`,
    });
  }

  const amort = opts.amortYears;
  faq.push({
    q: `Lohnt sich eine Photovoltaikanlage in ${cityName} ${year}?`,
    a: amort != null
      ? `In den meisten Fällen ja. Eine typische 10-kWp-Anlage mit Speicher amortisiert sich in ${cityName} in etwa ${amort} Jahren — abhängig von Eigenverbrauch, Strompreis und Förderung. Im PV-Rechner kannst du es mit deinen eigenen Werten nachrechnen.`
      : `Das hängt von Eigenverbrauch, Strompreis und Anlagengröße ab. Im PV-Rechner kannst du es für ${cityName} mit deinen eigenen Werten nachrechnen.`,
  });

  return faq;
}
