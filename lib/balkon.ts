// Balkon-PV / Steckersolar — reine Berechnungsfunktionen.
// Modell und Kalibrierung: siehe lib/balkon-config.ts.

import { DEFAULT_BALKON_CONFIG, type BalkonConfig, type BalkonSetId, type BalkonOrientationId, type BalkonPresenceId, type BalkonStorageId } from "./balkon-config";
import { DEFAULT_PRICES } from "./prices-config";

export interface BalkonInputs {
  setId: BalkonSetId;
  orientationId: BalkonOrientationId;
  presenceId: BalkonPresenceId;
  storageId?: BalkonStorageId; // optionaler Speicher (Default: ohne)
  haushaltKwh: number;     // Jahresverbrauch Haushalt (für Autarkie)
  specificYield: number;   // kWh/kWp am Standort (PVGIS oder Fallback)
  stromPrice: number;      // €/kWh
  priceIncrease?: number;  // jährlicher Strompreisanstieg (Default: PV-Systemwert, 3 %)
  invest?: number;         // optional überschriebene Anschaffung (Set + Speicher)
}

export interface BalkonResult {
  moduleKwp: number;
  inverterKw: number;
  annualYield: number;      // kWh/a nach Wechselrichter-Deckelung
  clipped: boolean;         // true, wenn der Wechselrichter den Ertrag begrenzt
  selfShare: number;        // Eigenverbrauchsanteil inkl. Speicher (0–1)
  selfUsedKwh: number;      // selbst genutzt inkl. Speicher (kWh/a)
  feedInKwh: number;        // unvergüteter Überschuss (kWh/a)
  savingPerYear: number;    // €/a
  autarky: number;          // 0–1
  invest: number;           // € (Set + Speicher, oder Override)
  amortYears: number;       // Jahre (Infinity wenn keine Ersparnis)
  co2PerYear: number;       // kg/a
  lifetimeSaving: number;   // € über die Lebensdauer, abzüglich Investition

  // Speicher-Aufschlüsselung (für ehrliche Darstellung der Mehrkosten)
  storageKwh: number;          // Kapazität (0 = ohne Speicher)
  storagePrice: number;        // Mehrkosten des Speichers (€)
  baseSelfUsedKwh: number;     // selbst genutzt OHNE Speicher (kWh/a)
  baseSavingPerYear: number;   // €/a ohne Speicher
  storageAddedKwh: number;     // vom Speicher zusätzlich selbst genutzt (kWh/a)
  storagePayback: number;      // Jahre, bis der Speicher allein sich rechnet (Infinity wenn nie)
}

function clamp(x: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, x));
}

export interface BalkonOption {
  setId: BalkonSetId;
  storageId: BalkonStorageId;
  result: BalkonResult;
}

export interface BalkonAlternative extends BalkonOption {
  label: string;   // Kurzlabel für den Umschalter (z. B. "Ohne Speicher")
  note: string;    // ein Satz, was diese Option ausmacht
}

export interface BalkonRecommendation {
  best: BalkonOption;              // effizienteste Kombination (Set + Speicher)
  setReason: string;              // Klartext: warum diese Set-Größe
  storageReason: string;         // Klartext: warum (kein) Speicher
  clear: boolean;                // klarer Sieger oder mehrere gleichwertig?
  alternatives: BalkonAlternative[]; // umschaltbare Alternativen (max. 2)
  ranked: BalkonOption[];        // alle Kombinationen nach 20-Jahres-Gewinn
}

const SET_ORDER: BalkonSetId[] = ["single", "duo", "max"];

/** Empfiehlt aus den Angaben (Haushalt, Anwesenheit, Ausrichtung, Standort) die
 *  wirtschaftlich effizienteste Konfiguration — Set-Größe UND ob sich ein
 *  Speicher lohnt — gemessen am Lebensdauer-Gewinn. Der Speicher-Zusatznutzen ist
 *  in calcBalkon auf die Speicher-Lebensdauer gedeckelt, deshalb gewinnt ein
 *  Speicher nur dann, wenn er sich innerhalb seiner Lebensdauer wirklich rechnet.
 *  Liefert zusätzlich Klartext-Begründungen und umschaltbare Alternativen. */
export function recommendBalkon(
  base: Omit<BalkonInputs, "setId" | "storageId" | "invest">,
  cfg: BalkonConfig = DEFAULT_BALKON_CONFIG,
): BalkonRecommendation {
  const combos: BalkonOption[] = [];
  for (const s of cfg.sets) {
    for (const st of cfg.storage) {
      combos.push({ setId: s.id, storageId: st.id, result: calcBalkon({ ...base, setId: s.id, storageId: st.id }, cfg) });
    }
  }
  const ranked = [...combos].sort((a, b) => b.result.lifetimeSaving - a.result.lifetimeSaving);

  // Zwei getrennte Entscheidungen — bewusst NICHT rein nach 20-Jahres-Gewinn, weil
  // ein Speicher sich über die Lebensdauer fast immer knapp „rechnet" und dann
  // überall empfohlen würde. Das wäre unehrlich (Balkonspeicher lohnen sich oft
  // nicht).
  //
  // 1. Set-Größe: die modul-wirtschaftlichste (ohne Speicher gerechnet).
  const noStorage = combos.filter(o => o.storageId === "none");
  const rankedSets = [...noStorage].sort((a, b) => b.result.lifetimeSaving - a.result.lifetimeSaving);
  const bestSet = rankedSets[0];

  // 2. Speicher für dieses Set nur, wenn er sich klar (unter der Empfehl-Schwelle)
  //    amortisiert. Unter den qualifizierten Optionen (inkl. „ohne") gewinnt der
  //    höchste Lebensdauer-Gewinn.
  const setCombos = combos.filter(o => o.setId === bestSet.setId);
  const qualifying = setCombos.filter(o =>
    o.storageId === "none" ||
    (isFinite(o.result.storagePayback) && o.result.storagePayback <= cfg.storageRecommendMaxPayback),
  );
  const best = [...qualifying].sort((a, b) => b.result.lifetimeSaving - a.result.lifetimeSaving)[0] ?? bestSet;

  // Klarer Sieger bei der Set-Größe, wenn der Vorsprung zum zweitbesten spürbar ist.
  const setGap = bestSet.result.lifetimeSaving - (rankedSets[1]?.result.lifetimeSaving ?? bestSet.result.lifetimeSaving);
  const clear = setGap >= 100 && setGap >= Math.abs(bestSet.result.lifetimeSaving) * 0.08;

  const setLabel = (id: BalkonSetId) => cfg.sets.find(s => s.id === id)!.label;

  // ── Set-Begründung ──
  const setReason: Record<BalkonSetId, string> = {
    single: "Ein Modul reicht für deinen Bedarf und ist der günstigste Einstieg.",
    duo: "Zwei Module (Standard) sind für dich die wirtschaftlichste Balance aus Preis und Ertrag.",
    max: "Vier Module (Maximum) holen bei deiner Ausrichtung und deinem Verbrauch den meisten selbst genutzten Strom heraus.",
  };

  // ── Speicher-Begründung (ehrlich) ──
  let storageReason: string;
  if (best.storageId !== "none") {
    const p = best.result.storagePayback;
    storageReason = `Ein ${storageLabel(best.result.storageKwh)}-Speicher lohnt sich bei deinem Verbrauch — die Mehrkosten sind nach rund ${fmtYears(p)} Jahren wieder drin.`;
  } else {
    // Bester Speicher-Kandidat fürs empfohlene Set: wie schlecht wäre er?
    const withStorage = ranked
      .filter(o => o.setId === best.setId && o.storageId !== "none")
      .sort((a, b) => b.result.lifetimeSaving - a.result.lifetimeSaving)[0];
    if (withStorage && withStorage.result.storageAddedKwh > 0 && isFinite(withStorage.result.storagePayback)) {
      storageReason = `Ein Speicher würde sich bei dir erst nach rund ${fmtYears(withStorage.result.storagePayback)} Jahren rechnen — ohne bleibt unterm Strich mehr übrig.`;
    } else {
      storageReason = "Dein Set erzeugt zu wenig Überschuss, als dass sich ein Speicher lohnen würde.";
    }
  }

  // ── Alternativen (max. 2, umschaltbar) ──
  const alternatives: BalkonAlternative[] = [];
  const pushAlt = (o: BalkonOption | undefined, label: string, note: string) => {
    if (o && !(o.setId === best.setId && o.storageId === best.storageId) &&
        !alternatives.some(a => a.setId === o.setId && a.storageId === o.storageId)) {
      alternatives.push({ ...o, label, note });
    }
  };

  // 1. Speicher-Gegenstück (dieselbe Set-Größe, andere Speicher-Entscheidung).
  if (best.storageId !== "none") {
    const alt = combos.find(o => o.setId === best.setId && o.storageId === "none");
    if (alt) pushAlt(alt, "Ohne Speicher", `${(best.result.invest - alt.result.invest).toLocaleString("de-DE")} € günstiger, schneller amortisiert.`);
  } else {
    const alt = ranked.find(o => o.setId === best.setId && o.storageId !== "none" && o.result.storageAddedKwh > 0);
    if (alt) {
      const extra = alt.result.savingPerYear - alt.result.baseSavingPerYear;
      pushAlt(alt, `Mit ${storageLabel(alt.result.storageKwh)}-Speicher`, `+${extra.toLocaleString("de-DE")} €/Jahr, aber ${alt.result.storagePrice.toLocaleString("de-DE")} € Aufpreis.`);
    }
  }

  // 2. Größen-Alternative: nächstbeste Set-Größe (ohne Speicher).
  const sizeAlt = rankedSets.find(o => o.setId !== best.setId);
  if (sizeAlt) {
    const bigger = SET_ORDER.indexOf(sizeAlt.setId) > SET_ORDER.indexOf(best.setId);
    const label = bigger ? "Mehr Module" : "Kleineres Set";
    const note = bigger
      ? `${setLabel(sizeAlt.setId)}: mehr Ertrag, ~${sizeAlt.result.savingPerYear.toLocaleString("de-DE")} €/Jahr.`
      : `${setLabel(sizeAlt.setId)}: günstiger, ~${sizeAlt.result.savingPerYear.toLocaleString("de-DE")} €/Jahr.`;
    pushAlt(sizeAlt, label, note);
  }

  return { best, setReason: setReason[best.setId], storageReason, clear, alternatives, ranked };
}

function storageLabel(kwh: number): string {
  return `~${kwh.toLocaleString("de-DE")} kWh`;
}

function fmtYears(y: number): string {
  return isFinite(y) ? y.toFixed(1).replace(".", ",") : "—";
}

export function calcBalkon(inputs: BalkonInputs, cfg: BalkonConfig = DEFAULT_BALKON_CONFIG): BalkonResult {
  const set = cfg.sets.find(s => s.id === inputs.setId) ?? cfg.sets[0];
  const orient = cfg.orientations.find(o => o.id === inputs.orientationId) ?? cfg.orientations[0];
  const presence = cfg.presence.find(p => p.id === inputs.presenceId) ?? cfg.presence[0];
  const storage = cfg.storage.find(s => s.id === (inputs.storageId ?? "none")) ?? cfg.storage[0];

  const moduleKwp = set.moduleWp / 1000;
  const inverterKw = set.inverterW / 1000;

  // Rohertrag aus Modulleistung × Standort-Ertrag × Ausrichtung, gedeckelt durch
  // den Wechselrichter (mehr Module bringen früh/spät mehr, die Mittagsspitze
  // wird abgeschnitten — das bildet die Volllaststunden-Grenze ab).
  const rawYield = moduleKwp * inputs.specificYield * orient.factor;
  const inverterCap = inverterKw * cfg.maxFullLoadHours;
  const annualYield = Math.round(Math.min(rawYield, inverterCap));
  const clipped = inverterCap < rawYield;

  // Eigenverbrauchsanteil OHNE Speicher: sinkt mit der Anlagengröße relativ zur
  // Grundlast.
  let baseShare = presence.selfShareBase * Math.pow(cfg.refYieldKwh / Math.max(annualYield, 1), cfg.sizeExp);
  baseShare = clamp(baseShare, cfg.selfShareMin, cfg.selfShareMax);

  // Mehr selbst nutzen als der Haushalt verbraucht, ist unmöglich.
  const baseSelfUsedKwh = Math.round(Math.min(annualYield * baseShare, inputs.haushaltKwh));

  // Speicher schiebt Tagesüberschuss in Abend/Nacht — begrenzt durch (a) den
  // vorhandenen Überschuss, (b) die realistische Jahres-Durchsatzmenge und (c)
  // die Eigenverbrauchs-Obergrenze bzw. den Rest-Haushaltsbedarf. Ehrlich: ein
  // Speicher hebt den Eigenverbrauch, macht die Anschaffung aber teurer.
  let storageAddedKwh = 0;
  if (storage.kwh > 0) {
    const surplus = Math.max(0, annualYield - baseSelfUsedKwh);
    const throughput = storage.kwh * cfg.storageEffCyclesPerYear * cfg.storageRoundtrip;
    const capKwh = Math.min(inputs.haushaltKwh, annualYield * cfg.storageSelfShareCap);
    const headroom = Math.max(0, capKwh - baseSelfUsedKwh);
    // Abrunden: hält die Eigenverbrauchs-Obergrenze exakt ein und rechnet den
    // Speicher-Nutzen eher konservativ als schön.
    storageAddedKwh = Math.floor(Math.min(surplus, throughput, headroom));
  }

  const selfUsedKwh = baseSelfUsedKwh + storageAddedKwh;
  const selfShare = annualYield > 0 ? selfUsedKwh / annualYield : 0;
  const feedInKwh = Math.max(0, annualYield - selfUsedKwh);

  const invest = inputs.invest ?? (set.price + storage.price);
  // Strompreisanstieg systemweit konsistent mit dem PV-Rechner (gleicher Wert aus
  // der Preis-Config, „realistisch" 3 %/Jahr), compoundend p·(1+g)^i.
  const priceIncrease = inputs.priceIncrease ?? DEFAULT_PRICES.electricityIncrease;

  // Jahr-1-Ersparnis (für die Anzeige „pro Jahr").
  const savingPerYear = Math.round(selfUsedKwh * inputs.stromPrice);
  const baseSavingPerYear = Math.round(baseSelfUsedKwh * inputs.stromPrice);

  const autarky = inputs.haushaltKwh > 0 ? clamp(selfUsedKwh / inputs.haushaltKwh, 0, 1) : 0;
  const co2PerYear = Math.round(selfUsedKwh * cfg.gridCo2PerKwh);

  // Lebensdauer-Rechnung mit Modul-Degradation UND jährlichem Strompreisanstieg.
  // Der Speicher-Zusatznutzen (storageAddedKwh) zählt nur bis zur Speicher-
  // Lebensdauer — danach laufen die Module weiter, der Akku aber nicht mehr.
  // Amortisation (ganzes Paket) und Speicher-Amortisation sind die Jahre, in
  // denen die kumulierte Ersparnis die (Mehr-)Kosten übersteigt (linear
  // interpoliert). Rechnet sich ein Speicher erst nach seiner Lebensdauer, bleibt
  // seine Amortisation „unendlich" — der ehrliche „lohnt sich nicht"-Fall.
  let lifetimeGross = 0;
  let cumTotal = 0, cumStorage = 0;
  let amortYears = Infinity, storagePayback = Infinity;
  for (let i = 0; i < cfg.lifetimeYears; i++) {
    const deg = Math.pow(1 - cfg.degradation, i);
    const sp = inputs.stromPrice * Math.pow(1 + priceIncrease, i);
    const storageSaving = i < cfg.storageLifeYears ? storageAddedKwh * deg * sp : 0;
    const yearSaving = baseSelfUsedKwh * deg * sp + storageSaving;
    lifetimeGross += yearSaving;

    const prevTotal = cumTotal;
    cumTotal += yearSaving;
    if (amortYears === Infinity && cumTotal >= invest && yearSaving > 0) {
      amortYears = i + (invest - prevTotal) / yearSaving;
    }
    const prevStorage = cumStorage;
    cumStorage += storageSaving;
    if (storage.price > 0 && storagePayback === Infinity && cumStorage >= storage.price && storageSaving > 0) {
      storagePayback = i + (storage.price - prevStorage) / storageSaving;
    }
  }
  const lifetimeSaving = Math.round(lifetimeGross - invest);

  return {
    moduleKwp, inverterKw, annualYield, clipped, selfShare,
    selfUsedKwh, feedInKwh, savingPerYear, autarky, invest,
    amortYears, co2PerYear, lifetimeSaving,
    storageKwh: storage.kwh, storagePrice: storage.price,
    baseSelfUsedKwh, baseSavingPerYear, storageAddedKwh, storagePayback,
  };
}
