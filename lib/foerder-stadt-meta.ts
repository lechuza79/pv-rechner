import { saetzeFuer, foerdertDach, istFinanzierung, FUNDING_STATUS_LABEL, type FundingProgram } from "./funding-programs";
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

/**
 * How a city funding page speaks about its programme — the ONE switch that
 * title, description, intro and FAQ all read (01.10.2026):
 *  - "ohneDach": active, but no rooftop PV (München: balcony only)
 *  - "darlehen": active rooftop-PV programme that lends instead of paying
 *    (Kaufungen; recognised by istFinanzierung). Never called "Zuschuss".
 *  - "zuschuss": active rooftop-PV grant
 *  - "inaktiv" / "keins": programme not running / no programme
 */
export type StadtseiteFall = "keins" | "inaktiv" | "ohneDach" | "darlehen" | "zuschuss";

export function stadtseiteFall(f: FundingProgram | undefined): StadtseiteFall {
  if (!f) return "keins";
  if (f.status !== "aktiv") return "inaktiv";
  if (!foerdertDach(f)) return "ohneDach";
  return istFinanzierung(f) ? "darlehen" : "zuschuss";
}

export function foerderStadtMeta(
  stadt: string,
  f: FundingProgram | undefined,
  jahr: number | string,
): { title: string; description: string } {
  const aktiv = f?.status === "aktiv";
  const fall = stadtseiteFall(f);
  // An active programme that funds no rooftop PV (München: balcony only) is not
  // "Photovoltaik-Förderung" in the sense of this page — see foerdertDach.
  const ohneDach = fall === "ohneDach";
  const titelVoll = `Photovoltaik-Förderung ${stadt} ${jahr}`;
  const title = ohneDach
    ? `PV-Förderung ${stadt} ${jahr}: ${nurAndereTechnik(f!)}`
    : fall === "darlehen"
    ? `PV-Förderung ${stadt} ${jahr}: zinsloses Darlehen`
    : !f || aktiv
    ? titelVoll.length <= TITEL_BUDGET ? titelVoll : `PV-Förderung ${stadt} ${jahr}`
    : `PV-Förderung ${stadt} ${jahr}: ${FUNDING_STATUS_LABEL[f.status]}`;

  const ort = `${ortPraeposition(stadt)} ${stadt}`;
  if (ohneDach) {
    return {
      title,
      description: kappe(
        `Das Programm „${f!.name}“ ${ort} fördert derzeit ${nurAndereTechnikSatz(f!)}, keine Dachanlagen. Was bundesweit gilt und Beispielrechnungen für deine PV-Anlage.`,
        `Das Förderprogramm ${ort} fördert derzeit ${nurAndereTechnikSatz(f!)}, keine Dachanlagen. Was bundesweit gilt und Beispielrechnungen für deine PV-Anlage.`,
      ),
    };
  }
  if (fall === "darlehen") {
    return {
      title,
      description: kappe(
        `${ort[0].toUpperCase()}${ort.slice(1)} gibt es für Photovoltaik ein zinsloses Darlehen über das Programm „${f!.name}“, zurückzuzahlen in Raten. Bedingungen und Beispielrechnungen.`,
        `${ort[0].toUpperCase()}${ort.slice(1)} gibt es für Photovoltaik ein zinsloses Darlehen der Gemeinde, zurückzuzahlen in Raten. Bedingungen und Beispielrechnungen für deine PV-Anlage.`,
      ),
    };
  }
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

/** Short title suffix for an active programme without rooftop PV. */
function nurAndereTechnik(f: FundingProgram): string {
  const t = f.foerdert ?? [];
  return t.length === 1 && t[0] === "balkon" ? "nur Balkonkraftwerke" : "keine Dachanlagen";
}

/** What such a programme does fund, as a sentence fragment ("nur Balkonkraftwerke"). */
export function nurAndereTechnikSatz(f: FundingProgram): string {
  const namen: Record<string, string> = { balkon: "Balkonkraftwerke", waermepumpe: "Wärmepumpen" };
  const liste = (f.foerdert ?? []).filter((t) => t !== "pv").map((t) => namen[t]).filter(Boolean);
  return liste.length ? `nur ${liste.join(" und ")}` : "andere Maßnahmen";
}
