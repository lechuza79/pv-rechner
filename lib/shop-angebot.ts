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
import type { ShopAngebot } from "./shop-solakon";

/** Ein Angebot mit dem, was es für diesen Haushalt bedeutet. */
export interface BewertetesAngebot {
  angebot: ShopAngebot;
  ergebnis: BalkonResult;
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
function configFuerAngebot(angebot: ShopAngebot, cfg: BalkonConfig): BalkonConfig {
  const set = cfg.sets.find(s => s.id === "duo")!;
  const speicher = cfg.storage.find(s => s.id === "small")!;

  return {
    ...cfg,
    sets: [{ ...set, moduleWp: angebot.moduleWp, inverterW: angebot.inverterW, price: angebot.preis }],
    // Der Speicherpreis ist hier IMMER 0: Der Angebotspreis enthält den Speicher
    // bereits. Ihn zusätzlich anzusetzen zählte ihn doppelt.
    storage: [
      { ...cfg.storage.find(s => s.id === "none")!, kwh: 0, price: 0 },
      { ...speicher, kwh: angebot.speicherKwh, price: 0 },
    ],
  };
}

/** Was ein Angebot diesem Haushalt bringt. */
export function bewerteAngebot(
  angebot: ShopAngebot,
  basis: AngebotBasis,
  cfg: BalkonConfig = DEFAULT_BALKON_CONFIG,
): BewertetesAngebot {
  const eigen = configFuerAngebot(angebot, cfg);
  const ergebnis = calcBalkon(
    { ...basis, setId: "duo", storageId: angebot.speicherKwh > 0 ? "small" : "none" },
    eigen,
  );
  return { angebot, ergebnis };
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
): BewertetesAngebot[] {
  return guenstigsteJeKombination(angebote)
    .map(a => bewerteAngebot(a, basis, cfg))
    .sort((a, b) => b.ergebnis.lifetimeSaving - a.ergebnis.lifetimeSaving);
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
): AngebotsEmpfehlung | null {
  const bewertet = besteAngebote(angebote, basis, cfg);
  if (bewertet.length === 0) return null;
  return { beste: bewertet[0], alternativen: bewertet.slice(1, 3) };
}
