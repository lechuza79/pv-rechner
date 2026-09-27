import { saetzeFuer, FUNDING_STATUS_LABEL, type FundingProgram } from "./funding-programs";
import { ortPraeposition } from "./atlas-orte";

// ─── Title and description of a city funding page ─────────────────────────────
//
// WHY (SEO audit 27.09.2026): 39 of these pages stood on Google's first page
// with 1,973 impressions and 20 clicks. The description opened with a stock
// question ("How many solar systems are there in …?"), named no amount and
// glued the programme name in without an article ("das Osnabrück saniert –
// Photovoltaik und …"); 17 of 22 sampled titles were over the 60-character
// budget measured for our titles (lib/atlas-titel.ts).
//
// Only what the programme record states is said here: the first rate that
// applies to rooftop PV (the only technology these pages are published for,
// see foerderseiteTraegt), the status when it is not active — nothing else.

/** Measured: up to 60 characters without the brand suffix, Google keeps our title. */
export const TITEL_BUDGET = 60;
/** Google cuts descriptions around 155–160 characters. */
export const BESCHREIBUNG_BUDGET = 158;

export function foerderStadtMeta(
  stadt: string,
  f: FundingProgram | undefined,
  jahr: number | string,
): { title: string; description: string } {
  const aktiv = f?.status === "aktiv";
  const titelVoll = `Photovoltaik-Förderung ${stadt} ${jahr}`;
  const title = !f || aktiv
    ? titelVoll.length <= TITEL_BUDGET ? titelVoll : `PV-Förderung ${stadt} ${jahr}`
    : `PV-Förderung ${stadt} ${jahr}: ${FUNDING_STATUS_LABEL[f.status]}`;

  const ort = `${ortPraeposition(stadt)} ${stadt}`;
  if (!f) {
    return {
      title,
      description: `Photovoltaik ${ort}: Anlagenbestand aus dem Marktstammdatenregister und Beispielrechnungen mit Zuschüssen, die bundesweit gelten.`,
    };
  }
  const programm = `„${f.name}“`;
  if (!aktiv) {
    return {
      title,
      description: kappe(
        `Das Programm ${programm} ${ort} ist derzeit ${FUNDING_STATUS_LABEL[f.status]}. Was es gab, was bundesweit gilt und Beispielrechnungen für deine PV-Anlage.`,
        `Das Förderprogramm ${ort} ist derzeit ${FUNDING_STATUS_LABEL[f.status]}. Was es gab, was bundesweit gilt und Beispielrechnungen für deine PV-Anlage.`,
      ),
    };
  }
  const satz = saetzeFuer(f.rates, "pv")[0];
  const mitSatz = satz ? `${ort[0].toUpperCase()}${ort.slice(1)} gibt es Förderung über das Programm ${programm} (${satz.label}: ${satz.value}). Mit Beispielrechnungen und Bedingungen.` : null;
  return {
    title,
    description: kappe(
      mitSatz,
      `${ort[0].toUpperCase()}${ort.slice(1)} gibt es Förderung über das Programm ${programm}. Beträge, Bedingungen und Beispielrechnungen für deine PV-Anlage.`,
      `${ort[0].toUpperCase()}${ort.slice(1)} gibt es ein kommunales Förderprogramm für Solaranlagen. Beträge, Bedingungen und Beispielrechnungen für deine PV-Anlage.`,
    ),
  };
}

/** The first candidate within budget — never a sentence cut in half. */
function kappe(...kandidaten: (string | null)[]): string {
  const passend = kandidaten.filter((k): k is string => !!k);
  return passend.find((k) => k.length <= BESCHREIBUNG_BUDGET) ?? passend[passend.length - 1];
}
