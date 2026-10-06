import { saetzeFuer, foerdertDach, istFinanzierung, technikenVon, FUNDING_STATUS_LABEL, type FundingProgram, type FundingTechnik } from "./funding-programs";
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

/**
 * The programmes a city page shows — one programme (older callers) or the
 * whole set from fundingListFrom (06.10.2026: a page shows EVERY programme of
 * its place, not just the most specific one).
 */
export type StadtProgramme = FundingProgram | readonly FundingProgram[] | undefined;

export function alsListe(x: StadtProgramme): FundingProgram[] {
  if (!x) return [];
  return Array.isArray(x) ? [...x] : [x as FundingProgram];
}

/**
 * The switch over the SET of programmes. For a single programme it is exactly
 * the old per-programme switch; for several, the strongest active offer wins:
 * a roof grant before a roof loan before a balcony grant before anything else.
 * A page never promises roof money unless an ACTIVE programme pays it.
 */
export function stadtseiteFall(x: StadtProgramme): StadtseiteFall {
  const liste = alsListe(x);
  if (liste.length === 0) return "keins";
  const aktiv = liste.filter((p) => p.status === "aktiv");
  if (aktiv.length === 0) return "inaktiv";
  if (aktiv.some((p) => foerdertDach(p) && !istFinanzierung(p))) return "zuschuss";
  if (aktiv.some((p) => foerdertDach(p))) return "darlehen";
  if (aktiv.some((p) => nurBalkon(p))) return "balkon";
  return "ohneDach";
}

/**
 * The programme the page leads with — the one whose case stadtseiteFall
 * reports. Intro, title rate, example calculations and the first card speak
 * about it; the others follow as cards of their own.
 */
export function leitProgramm(x: StadtProgramme): FundingProgram | undefined {
  const liste = alsListe(x);
  const aktiv = liste.filter((p) => p.status === "aktiv");
  switch (stadtseiteFall(liste)) {
    case "zuschuss": return aktiv.find((p) => foerdertDach(p) && !istFinanzierung(p));
    case "darlehen": return aktiv.find((p) => foerdertDach(p));
    case "balkon": return aktiv.find((p) => nurBalkon(p));
    case "ohneDach": return aktiv[0];
    // Nothing running: lead with what the heading names (stadtseiteThema).
    default: return liste.find((p) => foerdertDach(p)) ?? liste.find((p) => nurBalkon(p)) ?? liste[0];
  }
}

/**
 * What the page is about, as its heading says it. A separate balcony-only
 * programme next to a roof programme puts both into the heading
 * ("Photovoltaik- und Balkonkraftwerk-Förderung in Tübingen"); a roof
 * programme that also pays for balcony systems does not — its own name tells.
 * Running programmes decide; only a page without any running one is described
 * by its ended programmes.
 */
export type StadtseiteThema = "pv" | "pvUndBalkon" | "balkon";

export function stadtseiteThema(x: StadtProgramme): StadtseiteThema {
  const liste = alsListe(x);
  const aktiv = liste.filter((p) => p.status === "aktiv");
  const relevant = aktiv.length > 0 ? aktiv : liste;
  const dach = relevant.some((p) => foerdertDach(p));
  const balkon = relevant.some((p) => nurBalkon(p));
  return dach && balkon ? "pvUndBalkon" : balkon ? "balkon" : "pv";
}

export const STADTSEITE_UEBERSCHRIFT: Record<StadtseiteThema, string> = {
  pv: "Photovoltaik-Förderung",
  pvUndBalkon: "Photovoltaik- und Balkonkraftwerk-Förderung",
  balkon: "Balkonkraftwerk-Förderung",
};

const TECHNIK_PLURAL: Record<FundingTechnik, string> = {
  pv: "Dachanlagen",
  balkon: "Balkonkraftwerke",
  waermepumpe: "Wärmepumpen",
};

/** "Dachanlagen und Balkonkraftwerke" — what these programmes fund, in one phrase. */
export function technikenSatz(programme: readonly FundingProgram[]): string {
  const reihenfolge: FundingTechnik[] = ["pv", "balkon", "waermepumpe"];
  const da = new Set(programme.flatMap((p) => technikenVon(p)));
  const worte = reihenfolge.filter((t) => da.has(t)).map((t) => TECHNIK_PLURAL[t]);
  return worte.length <= 1 ? (worte[0] ?? "") : `${worte.slice(0, -1).join(", ")} und ${worte[worte.length - 1]}`;
}

export function foerderStadtMeta(
  stadt: string,
  programme: StadtProgramme,
  jahr: number | string,
): { title: string; description: string } {
  const liste = alsListe(programme);
  const f = leitProgramm(liste);
  const laufend = liste.filter((p) => p.status === "aktiv");
  const thema = stadtseiteThema(liste);
  const aktiv = f?.status === "aktiv";
  const fall = stadtseiteFall(liste);
  // An active programme that funds no rooftop PV (München: balcony only) is not
  // "Photovoltaik-Förderung" in the sense of this page — see foerdertDach.
  const ohneDach = fall === "ohneDach";
  const titelVoll = `Photovoltaik-Förderung ${stadt} ${jahr}`;
  const balkon = thema === "balkon";
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
    : thema === "pvUndBalkon" && aktiv
    ? kappeTitel(
        `Photovoltaik- und Balkonkraftwerk-Förderung ${stadt} ${jahr}`,
        `PV- und Balkonkraftwerk-Förderung ${stadt} ${jahr}`,
        `PV- und Balkon-Förderung ${stadt} ${jahr}`,
        `PV-Förderung ${stadt} ${jahr}`,
      )
    : !f || aktiv
    ? titelVoll.length <= TITEL_BUDGET ? titelVoll : `PV-Förderung ${stadt} ${jahr}`
    : `PV-Förderung ${stadt} ${jahr}: ${FUNDING_STATUS_LABEL[f.status]}`;

  const ort = `${ortPraeposition(stadt)} ${stadt}`;
  const Ort = `${ort[0].toUpperCase()}${ort.slice(1)}`;
  // Several running programmes: say how many and what they fund, so the
  // snippet does not read as if the lead programme were all there is.
  const mehrere = laufend.length > 1
    ? `${Ort} gibt es ${laufend.length} Förderprogramme für ${technikenSatz(laufend)}. Beträge, Bedingungen und Antrag.`
    : null;
  if (balkon && aktiv) {
    const satz = saetzeFuer(f!.rates, "balkon")[0];
    return {
      title,
      description: kappe(
        mehrere,
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
  const mehrereMitSatz = laufend.length > 1 && satz
    ? `${Ort} gibt es ${laufend.length} Förderprogramme für ${technikenSatz(laufend)}, darunter ${programm} (${satz.label}: ${satz.value}).`
    : null;
  return {
    title,
    description: kappe(
      mehrereMitSatz,
      mehrere,
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
