// Ein echtes Kaufangebot durch unseren Rechenkern schicken.
//
// DAS IST DER GANZE PUNKT DER FLÄCHE. Ein Shop schreibt an sein Set „1000 Watt,
// 2,11 kWh Speicher, 849,99 €". Was davon in DIESEM Haushalt ankommt, sagt er
// nicht — und kann er nicht sagen, weil er den Haushalt nicht kennt. Wir rechnen
// dieselbe Konfiguration mit derselben Stundensimulation durch, mit der auch der
// Rechner darüber arbeitet, und empfehlen dann das Angebot mit dem höchsten
// Gewinn über die Lebensdauer.
//
// KEIN ZWEITES FUNDAMENT: Hier entsteht keine eigene Ertrags-, Eigenverbrauchs-
// oder Wirtschaftlichkeitsrechnung. Das Angebot wird in eine abgeleitete
// Balkon-Konfiguration übersetzt und `calcBalkon` übergeben — dieselbe Funktion,
// dieselben Annahmen, dieselben Wirkungsgrade. Läuft der Rechner künftig anders,
// läuft die Empfehlung automatisch mit.

import { calcBalkon, type BalkonInputs, type BalkonResult } from "./balkon";
import { DEFAULT_BALKON_CONFIG, type BalkonConfig } from "./balkon-config";
import { balkonFunding, type BalkonFundingContext } from "./balkon-funding";
import { fundingZaehlt } from "./funding-programs";
import { angebotModulAnzahl, type ShopAngebot } from "./shop-solakon";

/** Ein Angebot mit dem, was es für diesen Haushalt bedeutet. */
export interface BewertetesAngebot {
  angebot: ShopAngebot;
  ergebnis: BalkonResult;
  fundingEuro: number;
  fundingNeedsInput?: boolean;
  fundingNotes?: string[];
  fundingLabel?: string;
  fundingReasons?: string[];
  storageComparison?: { additionalInvestment: number; payback: number } | null;
}

/** Die Haushaltsangaben, die für alle Angebote gleich sind. */
export type AngebotBasis = Omit<BalkonInputs, "setId" | "storageId" | "invest">;

/**
 * Eine Balkon-Konfiguration, in der genau dieses Angebot steht.
 *
 * Die Kennungen der Config sind ein fester Wertebereich („duo", „small"), damit
 * der Rechner sie im Frageweg anbieten kann. Wir belegen zwei davon mit den
 * echten Produktdaten, statt den Rechenkern für freie Werte zu öffnen — das
 * hielte eine zweite Tür auf, durch die irgendwann jemand andere Zahlen
 * hineinreicht als die, die der Rechner selbst benutzt.
 */
export function configFuerAngebot(angebot: Pick<ShopAngebot, "moduleWp" | "inverterW" | "speicherKwh" | "preis"> & { haendler?: string; batteryCoupling?: "ac" | "dc" }, cfg: BalkonConfig = DEFAULT_BALKON_CONFIG): BalkonConfig {
  const set = cfg.sets.find(s => s.id === "duo")!;
  const speicher = cfg.storage.find(s => s.id === "small")!;

  // Solakon ONE: direct PV input (2600 W), shared AC output (800 W).
  // Source: https://www.solakon.de/cdn/shop/files/Solakon_ONE_Datenblatt.pdf
  // Solakon ONE default minimum charge: 15%, unavailable to the household.
  // https://serviceportal.solakon.de/help/solakon-one/minimale-ladung-speicherheizung-am-solakon-one
  return {
    ...cfg,
    sets: [{ ...set, moduleWp: angebot.moduleWp, inverterW: angebot.inverterW, price: angebot.preis }],
    // Der Speicherpreis ist hier IMMER 0: Der Angebotspreis enthält den Speicher
    // bereits. Ihn zusätzlich anzusetzen zählte ihn doppelt.
    storage: [
      { ...cfg.storage.find(s => s.id === "none")!, kwh: 0, price: 0 },
      { ...speicher, kwh: angebot.speicherKwh, usableBatteryKwh: angebot.haendler === "solakon" ? angebot.speicherKwh * .85 : undefined, price: 0, batteryCoupling: angebot.haendler === "solakon" ? "dc" : angebot.batteryCoupling },
    ],
  };
}

/** Was ein Angebot diesem Haushalt bringt. */
export function bewerteAngebot(
  angebot: ShopAngebot,
  basis: AngebotBasis,
  cfg: BalkonConfig = DEFAULT_BALKON_CONFIG,
  funding?: BalkonFundingContext,
): BewertetesAngebot {
  const eigen = configFuerAngebot(angebot, cfg);
  const assessment = balkonFunding(angebot, angebot.preis, funding);
  const ergebnis = calcBalkon(
    { ...basis, setId: "duo", storageId: angebot.speicherKwh > 0 ? "small" : "none", invest: assessment.investment },
    eigen,
  );
  return {
    angebot, ergebnis, fundingEuro: assessment.grant,
    fundingLabel: assessment.label, fundingReasons: assessment.reasons,
    fundingNeedsInput: !!funding?.programs.some(program => fundingZaehlt(program) && program.nurWohnform && !funding.wohnform),
    fundingNotes: assessment.stack.applied.flatMap(({ program }) => {
      const scope = program.region ?? program.name;
      return [
        ...(program.balkonNurMitSpeicher ? [`${scope}: Gefördert werden nur Balkonkraftwerke mit Speicher.`] : []),
        ...(program.nurWohnform ? [`${scope}: Die Förderung gilt nur für ${program.nurWohnform === "mieter" ? "Mieterinnen und Mieter" : "Eigentümerinnen und Eigentümer"}.`] : []),
      ];
    }),
  };
}

/**
 * Aus allen Angeboten das beste für diesen Haushalt.
 *
 * MASSSTAB IST DER GEWINN ÜBER DIE LEBENSDAUER, nicht der Preis und schon gar
 * nicht die Provision. Das ist dieselbe Größe, nach der `recommendBalkon` die
 * Set-Größe wählt — ein anderer Maßstab hier hieße, dass die Empfehlung im
 * Ergebnis und die Empfehlung im Angebotsblock auseinanderlaufen können.
 *
 * ERST ENTDOPPELN, DANN RECHNEN — und das ist keine Feinheit, sondern der
 * Unterschied zwischen brauchbar und unbenutzbar. Der Shop führt je Set fast
 * hundert Varianten; unterscheiden tun sie sich überwiegend in Halterung und
 * Kabellänge, also in Dingen, zu denen unsere Rechnung nichts zu sagen hat.
 * Jede einzelne zu bewerten hieße, eine volle Jahressimulation über 8.760
 * Stunden dreihundertmal im Browser des Nutzers zu rechnen. Beim Bauen genau
 * daran gescheitert (09.09.2026): Der Block erschien im Browser-Test gar nicht
 * mehr, weil die Seite noch rechnete. Übrig bleiben die Kombinationen aus
 * Modulleistung und Speichergröße — rund zwanzig statt dreihundert.
 *
 * Nicht lieferbare Varianten fallen vorher heraus: Ein Set zu empfehlen, das man
 * nicht kaufen kann, ist keine Empfehlung.
 */

/** Modulleistung und Speichergröße — die beiden Größen, die die Rechnung bewegen. */
function kennung(a: ShopAngebot): string {
  return `${a.moduleWp}-${a.speicherKwh}`;
}

/**
 * Je Modul-/Speicher-Kombination die günstigste lieferbare Variante.
 *
 * Bei gleichem Nutzen entscheidet der Preis für den Nutzer — nicht die
 * Reihenfolge, in der der Shop seine Varianten ausgibt.
 */
export function guenstigsteJeKombination(angebote: ShopAngebot[]): ShopAngebot[] {
  const jeKombination = new Map<string, ShopAngebot>();
  for (const a of angebote) {
    if (!a.lieferbar) continue;
    const k = kennung(a);
    const vorhanden = jeKombination.get(k);
    if (!vorhanden || a.preis < vorhanden.preis) jeKombination.set(k, a);
  }
  return [...jeKombination.values()];
}

export function besteAngebote(
  angebote: ShopAngebot[],
  basis: AngebotBasis,
  cfg: BalkonConfig = DEFAULT_BALKON_CONFIG,
  funding?: BalkonFundingContext,
): BewertetesAngebot[] {
  const rated = guenstigsteJeKombination(angebote)
    .map(a => bewerteAngebot(a, basis, cfg, funding))
    .sort((a, b) => b.ergebnis.lifetimeSaving - a.ergebnis.lifetimeSaving);
  for (const entry of rated) {
    const reference = rated.find(other => other.angebot.moduleWp === entry.angebot.moduleWp && other.angebot.inverterW === entry.angebot.inverterW && other.angebot.speicherKwh === 0);
    if (!reference || entry.angebot.speicherKwh === 0) { entry.storageComparison = null; continue; }
    const additionalInvestment = entry.ergebnis.invest - reference.ergebnis.invest;
    let payback = additionalInvestment <= 0 ? 0 : Infinity;
    let accumulated = 0;
    for (let year = 0; year < Math.min(cfg.storageLifeYears, entry.ergebnis.annualCosts.grid.length); year++) {
      const benefit = reference.ergebnis.annualCosts.balcony[year] - entry.ergebnis.annualCosts.balcony[year];
      if (!Number.isFinite(payback) && benefit > 0 && accumulated + benefit >= additionalInvestment) payback = year + (additionalInvestment - accumulated) / benefit;
      accumulated += benefit;
    }
    entry.storageComparison = { additionalInvestment, payback };
  }
  return rated;
}

/**
 * Die Empfehlung: das beste Angebot, dazu höchstens zwei Alternativen, die sich
 * davon SPÜRBAR unterscheiden.
 */
export interface AngebotsEmpfehlung {
  beste: BewertetesAngebot;
  alternativen: BewertetesAngebot[];
}

export function empfiehlAngebot(
  angebote: ShopAngebot[],
  basis: AngebotBasis,
  cfg: BalkonConfig = DEFAULT_BALKON_CONFIG,
  funding?: BalkonFundingContext,
): AngebotsEmpfehlung | null {
  return empfehlungAusBewertung(besteAngebote(angebote, basis, cfg, funding));
}

export function empfehlungAusBewertung(bewertet: BewertetesAngebot[]): AngebotsEmpfehlung | null {
  if (bewertet.length === 0) return null;
  // Keep an affordable, battery-free comparison visible even when it ranks lower.
  const best = bewertet[0];
  const cheapest = [...bewertet].sort((a, b) => a.ergebnis.invest - b.ergebnis.invest)[0];
  const withoutBattery = bewertet.find(entry => entry.angebot.speicherKwh === 0);
  const candidates = [cheapest, withoutBattery, ...bewertet].filter((entry): entry is BewertetesAngebot => !!entry);
  const alternatives = [...new Map(candidates.filter(entry => entry !== best).map(entry => [entry.angebot.id, entry])).values()].slice(0, 2);
  return { beste: best, alternativen: alternatives };
}

/** Explain the existing offer ranking without claiming a market-wide optimum. */
export function angebotBegruendung(selected: BewertetesAngebot | undefined, ranked: BewertetesAngebot[], years: number, customPrice = false): string | null {
  if (!selected) return null;
  const { angebot: offer, ergebnis: result } = selected;
  const withStorage = offer.speicherKwh > 0;
  const everydayReason = withStorage
    ? "Mit Speicher nutzt du deinen Solarstrom auch später am Tag."
    : "Ohne Speicher sparst du dir dessen Anschaffungskosten.";
  const count = angebotModulAnzahl(offer);
  const size = count ? `Das Set mit ${count} Modulen` : "Dieses Set";
  const otherSizes = ranked.filter(entry => entry.angebot.moduleWp !== offer.moduleWp);
  const sizeReason = !customPrice && ranked[0]?.angebot.id === offer.id && result.lifetimeSaving > 0 && otherSizes.length > 0
    ? `${size} bringt dir unter den verglichenen Größen den größten finanziellen Vorteil.`
    : `${size} liegt deiner Rechnung zugrunde.`;
  const explain = (reason: string) => `${sizeReason} ${reason}`;
  if (customPrice) return explain(`${everydayReason} Gerechnet wird mit deinem eigenen Preis.`);
  if (ranked.length < 2) return explain(`${everydayReason} Für einen Vergleich fehlen weitere passende Angebote.`);
  if (ranked[0].angebot.id !== offer.id) return explain(everydayReason);
  if (result.lifetimeSaving <= 0) return explain(`Über ${years} Jahre entsteht bei deinen Angaben kein berechneter Vorteil gegenüber reinem Netzstrom.`);
  const opposite = ranked.find(entry => entry.angebot.moduleWp === offer.moduleWp && entry.angebot.inverterW === offer.inverterW && (entry.angebot.speicherKwh > 0) !== withStorage);
  if (!opposite || result.lifetimeSaving <= opposite.ergebnis.lifetimeSaving) return explain(everydayReason);
  return explain(withStorage
    ? "Bei dir lohnt sich der Speicher: Du nutzt mehr Solarstrom selbst und sparst damit mehr, als er zusätzlich kostet."
    : "Bei dir rechnet sich das Set ohne Speicher besser: Die zusätzliche Ersparnis mit Speicher deckt dessen Mehrkosten nicht.");
}

/** Explain the actual storage assumptions without claiming a verified bundle accessory. */
export function speicherAnnahme(hardware: { haendler?: string; speicherKwh: number }): string {
  if (hardware.haendler !== "solakon") return "Die angegebene Speichergröße ist die Nennkapazität; die tatsächlich nutzbare Kapazität ist nicht belegt. Die Rechnung setzt eine zum Verbrauch passende Speichersteuerung voraus.";
  return `Von ${hardware.speicherKwh.toLocaleString("de-DE")} kWh Nennkapazität rechnen wir mit ${(hardware.speicherKwh * .85).toLocaleString("de-DE", { maximumFractionDigits: 2 })} kWh nach 15 % Mindestladung (Werkseinstellung). Die bedarfsgerechte Abgabe setzt einen kompatiblen, eingerichteten Smart Meter voraus. Ohne aktiven Energieplan sind laut Hersteller 200 W voreingestellt. Ob der Smart Meter im Set enthalten ist, ist nicht bestätigt; zusätzliche Kauf- und Installationskosten bitte unter Zusatzkosten ergänzen.`;
}
