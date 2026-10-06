import { FUNDING_STATUS_LABEL, type FundingProgram } from "./funding-programs";
import { alsListe, leitProgramm, nurAndereTechnikSatz, stadtseiteFall, stadtseiteThema, technikenSatz, type StadtProgramme } from "./foerder-stadt-meta";
import { BALKON_RECHT } from "./balkon-config";

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
  programme: StadtProgramme,
  opts: { amortYears?: number | null } = {},
): FaqItem[] {
  const faq: FaqItem[] = [];
  const year = new Date().getFullYear();
  // A page shows every programme of its place (06.10.2026). The FAQ speaks
  // about the one the page leads with and then names the others — never a
  // roof answer when no running programme pays for roofs.
  const liste = alsListe(programme);
  const program = leitProgramm(liste);
  const weitere = liste.filter((p) => p !== program);

  if (program && stadtseiteThema(liste) === "balkon") {
    // Balcony-only programme (since 06.10.2026 every such place has a page):
    // the FAQ speaks about Balkonkraftwerke throughout. The VAT sentence is the
    // shared legal statement of the balcony cluster (BALKON_RECHT), never a
    // second wording; whether the application must precede the purchase
    // differs between balcony programmes, so it is not asserted.
    const active = program.status === "aktiv";
    faq.push({
      q: `Welche Balkonkraftwerk-Förderung gibt es in ${cityName}?`,
      a: `In ${cityName} fördert ${program.traeger} über das Programm „${program.name}" Balkonkraftwerke, keine Dachanlagen. ${program.coveredCosts}.`
        + (active ? "" : ` Das Programm nimmt derzeit allerdings keine neuen Anträge an (${statusText(program.status)}).`),
    });
    faq.push({
      q: `Wie hoch ist die Balkonkraftwerk-Förderung in ${cityName}?`,
      a: `Die Fördersätze sind: ${program.rates.map((r) => `${r.label} — ${r.value}`).join("; ")}.`
        + (program.maxFoerderung ? ` Es gilt ${program.maxFoerderung}.` : ""),
    });
    faq.push({
      q: `Was gilt für Balkonkraftwerke in ${cityName} zusätzlich bundesweit?`,
      a: BALKON_RECHT.nullsteuer,
    });
    faq.push({
      q: `Muss der Förderantrag vor dem Kauf gestellt werden?`,
      a: `Das legt jedes Programm in seiner Förderrichtlinie selbst fest. Für „${program.name}" steht es in der Richtlinie des Trägers — am besten vor dem Kauf nachsehen, ob der Antrag schon vorher gestellt werden muss.`,
    });
  } else if (program) {
    const active = program.status === "aktiv";
    faq.push({
      q: `Welche Photovoltaik-Förderung gibt es in ${cityName}?`,
      // A programme without rooftop PV (München: balcony only) must not be
      // described as funding "Photovoltaik" (see foerdertDach).
      a: (stadtseiteFall(program) === "ohneDach"
        ? `In ${cityName} fördert ${program.traeger} über das Programm „${program.name}" ${nurAndereTechnikSatz(program)}, keine Dachanlagen. ${program.coveredCosts}.`
        : stadtseiteFall(program) === "darlehen"
        ? `In ${cityName} vergibt ${program.traeger} für Photovoltaik ein zinsloses Darlehen über das Programm „${program.name}". Der Betrag wird in Raten zurückgezahlt.`
        : `In ${cityName} fördert ${program.traeger} Photovoltaik über das Programm „${program.name}". Förderfähig sind ${program.coveredCosts}.`)
        + (active ? "" : ` Das Programm nimmt derzeit allerdings keine neuen Anträge an (${statusText(program.status)}).`),
    });
    faq.push({
      q: `Wie hoch ist die PV-Förderung in ${cityName}?`,
      a: `${stadtseiteFall(program) === "darlehen" ? "Die Konditionen sind" : "Die Fördersätze sind"}: ${program.rates.map((r) => `${r.label} — ${r.value}`).join("; ")}.`
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

  if (program && weitere.length > 0) {
    faq.push({
      q: `Welche weiteren Förderprogramme gibt es in ${cityName}?`,
      a: `Neben „${program.name}" gelten in ${cityName}: `
        + weitere
          .map((p) => `„${p.name}" (${p.traeger}) für ${technikenSatz([p])}${p.status === "aktiv" ? "" : `, derzeit ${FUNDING_STATUS_LABEL[p.status]}`}`)
          .join("; ")
        + ". Bedingungen und Beträge stehen je Programm auf dieser Seite.",
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
