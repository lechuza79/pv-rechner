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
// applies to the page's technology (rooftop PV, or the balcony system for a
// balcony-only programme — see foerderseiteTraegt), the status when it is not
// active — nothing else.

/** Measured: up to 60 characters without the brand suffix, Google keeps our title. */
export const TITEL_BUDGET = 60;
/** Google cuts descriptions around 155–160 characters. */
export const BESCHREIBUNG_BUDGET = 158;

/**
 * How a city funding page speaks about its programme — the ONE switch that
 * title, description, intro and FAQ all read (01.10.2026):
 *  - "balkon": active, balcony systems only (München, and since 06.10.2026
 *    every balcony-only place): a "Balkonkraftwerk-Förderung" page
 *  - "ohneDach": active, but neither rooftop PV nor balcony systems (heat
 *    pumps only — such programmes carry no page of their own)
 *  - "darlehen": active rooftop-PV programme that lends instead of paying
 *    (Kaufungen; recognised by istFinanzierung). Never called "Zuschuss".
 *  - "zuschuss": active rooftop-PV grant
 *  - "inaktiv" / "keins": programme not running / no programme
 */
export type StadtseiteFall = "keins" | "inaktiv" | "balkon" | "ohneDach" | "darlehen" | "zuschuss";

/**
 * Funds balcony systems but no rooftop PV. The page then speaks about
 * "Balkonkraftwerk-Förderung" in title, description, heading, intro and FAQ —
 * whatever the status: an ended balcony programme was never a PV programme.
 */
export function nurBalkon(f: Pick<FundingProgram, "foerdert"> | undefined): boolean {
  return !!f && !foerdertDach(f) && (f.foerdert ?? []).includes("balkon");
}

export function stadtseiteFall(f: FundingProgram | undefined): StadtseiteFall {
  if (!f) return "keins";
  if (f.status !== "aktiv") return "inaktiv";
  if (nurBalkon(f)) return "balkon";
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
  const balkon = nurBalkon(f);
  const status = f && !aktiv ? `: ${FUNDING_STATUS_LABEL[f.status]}` : "";
  const title = balkon
    ? kappeTitel(
        `Balkonkraftwerk-Förderung ${stadt} ${jahr}${status}`,
        `Balkonkraftwerk-Förderung ${stadt}${status}`,
        `Balkon-Förderung ${stadt}${status}`,
      )
    : ohneDach
    ? `PV-Förderung ${stadt} ${jahr}: ${nurAndereTechnik(f!)}`
    : fall === "darlehen"
    ? `PV-Förderung ${stadt} ${jahr}: zinsloses Darlehen`
    : !f || aktiv
    ? titelVoll.length <= TITEL_BUDGET ? titelVoll : `PV-Förderung ${stadt} ${jahr}`
    : `PV-Förderung ${stadt} ${jahr}: ${FUNDING_STATUS_LABEL[f.status]}`;

  const ort = `${ortPraeposition(stadt)} ${stadt}`;
  const Ort = `${ort[0].toUpperCase()}${ort.slice(1)}`;
  if (balkon && aktiv) {
    const satz = saetzeFuer(f!.rates, "balkon")[0];
    return {
      title,
      description: kappe(
        satz ? `${Ort} gibt es eine Förderung für Balkonkraftwerke über das Programm „${f!.name}“ (${satz.label}: ${satz.value}). Bedingungen und Antrag.` : null,
        `${Ort} gibt es eine Förderung für Balkonkraftwerke über das Programm „${f!.name}“. Beträge, Bedingungen und Antrag — keine Dachanlagen.`,
        `${Ort} gibt es eine kommunale Förderung für Balkonkraftwerke. Beträge, Bedingungen und Antrag — für Dachanlagen zahlt das Programm nichts.`,
      ),
    };
  }
  if (balkon) {
    return {
      title,
      description: kappe(
        `Die Balkonkraftwerk-Förderung „${f!.name}“ ${ort} ist derzeit ${FUNDING_STATUS_LABEL[f!.status]}. Was es gab und was bundesweit für Balkonkraftwerke gilt.`,
        `Die Balkonkraftwerk-Förderung ${ort} ist derzeit ${FUNDING_STATUS_LABEL[f!.status]}. Was es gab und was bundesweit für Balkonkraftwerke gilt.`,
      ),
    };
  }
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

/** The first title within budget — never a title cut in half. */
function kappeTitel(...kandidaten: string[]): string {
  return kandidaten.find((k) => k.length <= TITEL_BUDGET) ?? kandidaten[kandidaten.length - 1];
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
