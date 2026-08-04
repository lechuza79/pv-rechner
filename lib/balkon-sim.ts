// Balkon-PV — Stunden-Simulation über ein Jahr.
//
// Rechnet auf der GETEILTEN Basis (siehe CLAUDE.md „Geteilte Rechen-Basis"):
//   - Standort-Ertrag: PVGIS-Monatswerte (12 × kWh/kWp) — dieselbe Quelle wie der PV-Rechner
//   - Haushaltslast:   calcHourlyConsumption() (BDEW H0 / VDI 4655) — dieselbe wie die Live-Simulation
//   - Kalender:        DAYS_IN_MONTH aus lib/consumption.ts
//
// Warum überhaupt simulieren statt Jahressummen: Bei Balkon-PV passiert alles
// Entscheidende INNERHALB eines Tages und zwischen den Jahreszeiten —
//   1. Der Wechselrichter kappt die Mittagsspitze (nicht die Jahresmenge).
//   2. Ein Speicher lädt mittags und entlädt abends.
//   3. Im Sommer gibt es Überschuss satt, im Winter praktisch keinen.
// Mit Jahressummen ist all das unsichtbar: Der Standort wirkte bei gedeckelten
// Anlagen gar nicht, und ein größerer Speicher brachte rechnerisch nie einen
// Unterschied. Deshalb fallen Clipping, Eigenverbrauch und Speicher-Nutzen hier
// als ERGEBNIS an, statt als kalibrierte Konstanten angenommen zu werden.
//
// ─── Validiert gegen den HTW Stecker-Solar-Simulator (07/2026) ──────────────
// Gegenprobe gegen das oeffentliche Standardwerkzeug fuer Balkon-PV (HTW Berlin,
// Datenstand 08/2024). Damit Modelle und nicht Standorte verglichen werden, wurde
// unser Standort auf den HTW-Standort kalibriert (Lindenberg/Brandenburg, Wetter-
// jahr 2017): Sued 35 Grad, 800 Wp am 800-W-Wechselrichter = 791 kWh/a bei beiden.
// Referenzfall danach 800 Wp / 2.100 kWh Haushalt (HTW-Vorgabe fuer 2 Personen in
// der Wohnung) / tagQuote 0,30.
//
//   Ertrag Sued aufgestaendert   790 vs 791 kWh   (−0,1 %)
//   Ertrag Sued senkrecht        542 vs 552 kWh   (−1,8 %)
//   Nutzungsgrad Sued 35 Grad   50,0 % vs 48,3 %  (+3,5 %)
//   Nutzungsgrad Sued senkrecht 61,1 % vs 56,3 %  (+8,5 %)
//   Speicher 1 kWh, Zugewinn    +144 vs +165 kWh  (−13 %), Saettigung bei beiden ~1,5 kWh
//
// Die Ertraege auf der Suedachse decken sich also praktisch. Die verbleibenden
// Abweichungen sind ERKLAERBAR und laufen in bekannte Richtungen:
//
// 1. Eigenverbrauch etwas zu hoch (+3 bis +9 %): Wir rechnen mit dem BDEW-H0-
//    Standardlastprofil, die HTW mit 41 GEMESSENEN Haushaltsprofilen. H0 ist
//    geglaettet — echte Haushalte haben kurze harte Spitzen (Wasserkocher, Herd),
//    die eine 800-W-Anlage nicht decken kann. Glaetten schoent den Eigenverbrauch
//    also systematisch. Die Richtung ist erwartet, die Groesse klein; ein Wechsel
//    auf gemessene Profile waere ein Eingriff in die geteilte Rechen-Basis
//    (calcHourlyConsumption) und damit in JEDEN Rechner der Seite.
// 2. Speicher-Zugewinn etwas zu niedrig (−13 %): Folge von 1. — wo direkt schon
//    mehr genutzt wird, bleibt weniger Ueberschuss zum Einspeichern. Die
//    Saettigungsgrenze (ab ~1,5 kWh bringt mehr Kapazitaet fast nichts) ist bei
//    beiden Modellen dieselbe, und nur die traegt die Empfehlung.
// 3. Ost/West und Nord: siehe lib/solar-year.ts — dort divergieren PVGIS und die
//    HTW im Strahlungsmodell, das ist keine Eigenheit dieser Simulation.
//
// Nicht validiert: Verschattung (die HTW modelliert sie explizit, wir werfen sie
// mit Nord in eine Option) und Ertraege oberhalb von 800 Wp (die HTW-Werte fuer
// 2.000 Wp liegen 6,5 % unter unseren — teils die dokumentierte Verdichtungs-
// Abweichung von +3,5 % im haertesten Clipping-Fall, siehe lib/solar-year.ts).

import { calcHourlyConsumption, wpHourlyWatts, type HouseholdProfile } from "./consumption";
import { SOLAR_YEAR_DE, referenceMonthKwh } from "./solar-year";

// Die PVGIS-Monatswerte des Standorts (/api/pvgis) gelten fuer OPTIMALE Neigung.
// Der Vergleich mit derselben Ausrichtung in der Referenzreihe ergibt, wie viel
// ergiebiger dieser Standort ist — dieser Faktor gilt dann fuer jede Ausrichtung.
const LOCATION_REFERENCE = "sued_flach";

export interface BalkonSimInput {
  moduleKwp: number;
  inverterKw: number;
  /** 12 × kWh/kWp aus PVGIS (Monatsprofil des Standorts). */
  monthlyYieldPerKwp: number[];
  /** Ausrichtung — waehlt die passende Referenzreihe (eigener Tagesverlauf!). */
  orientation: string;
  household: HouseholdProfile;
  /** Nutzbare Speicherkapazität in kWh (0 = ohne Speicher). */
  batteryKwh: number;
  /** Lade-/Entlade-Wirkungsgrad (0–1). */
  roundtrip: number;
  /**
   * Deckel der EINSPEISELEISTUNG in kW (nicht der Erzeugung). Was darüber
   * anfällt und weder verbraucht noch gespeichert werden kann, geht verloren.
   * Bildet § 9 Abs. 2b des EEG-2027-Entwurfs ab (50 % der installierten
   * Leistung für Neuanlagen). Undefiniert = kein Deckel, das ist die heutige
   * Rechtslage und der Default für alle bestehenden Aufrufer.
   *
   * Die Reihenfolge Verbrauch → Speicher → Einspeisung → Abregelung ist die
   * physikalisch richtige und macht den Effekt sichtbar, den der Entwurf
   * ausdrücklich bezweckt: Ein Speicher fängt genau die Spitze auf, die sonst
   * am Deckel verloren ginge.
   */
  exportCapKw?: number;
  /**
   * Normierte Preisform über [Monat][Stunde] (PREISFORM_MONAT_STUNDE). Wird sie
   * übergeben, summiert die Simulation zusätzlich die MIT DEM PREIS GEWICHTETE
   * Einspeisung auf. Ohne sie bleibt alles wie bisher.
   */
  priceShape?: ReadonlyArray<ReadonlyArray<number>>;
}

export interface BalkonSimResult {
  /** Ertrag nach Wechselrichter-Deckelung (kWh/a) — das, was im Haus ankommt. */
  annualYield: number;
  /** Ertrag, den die Module ohne Deckel geliefert hätten (kWh/a). */
  rawYield: number;
  /** Vom Wechselrichter gekappte Energie (kWh/a). */
  clippedKwh: number;
  /** Selbst genutzt, direkt + aus dem Speicher (kWh/a). */
  selfUsedKwh: number;
  /** Nur direkt genutzt, ohne Speicher-Beitrag (kWh/a). */
  directUsedKwh: number;
  /** Unvergüteter Überschuss ins Netz (kWh/a). */
  feedInKwh: number;
  /**
   * Am Einspeisedeckel verlorene Energie (kWh/a) — 0 ohne exportCapKw. Nicht
   * mit clippedKwh verwechseln: clippedKwh ist der Wechselrichter (technisch,
   * gibt es immer), curtailedKwh ist die gesetzliche Einspeisegrenze.
   */
  curtailedKwh: number;
  /** Mit der Preisform gewichtete Einspeisung (kWh/a) — 0 ohne priceShape. */
  feedInWeightedKwh: number;
  /**
   * Mit derselben Preisform gewichtete ERZEUGUNG (kWh/a) — 0 ohne priceShape.
   *
   * Der Bezugspunkt für den Profilfaktor, und zwar bewusst die eigene Erzeugung
   * und nicht das nationale Solarprofil: Unser Referenzjahr (SOLAR_YEAR_DE) und
   * die tatsächliche deutsche Einspeisung 2024/25 unterscheiden sich in der
   * Monatsverteilung um mehrere Prozent — ein Vergleich dagegen hätte dem
   * Haushalt einen Aufschlag von rund 8 % gutgeschrieben, der nichts mit seinem
   * Verhalten zu tun hat, sondern nur mit zwei verschiedenen Wetterjahren.
   *
   * Gegen die eigene Erzeugung gerechnet misst der Faktor genau das, was er
   * messen soll: Was macht der EIGENVERBRAUCH (und der Speicher) mit dem Wert
   * der übrig bleibenden Kilowattstunde? Eine Anlage, die alles einspeist, hat
   * per Konstruktion den Faktor 1,0 — und für genau die gilt der amtliche
   * Marktwert Solar, mit dem das Niveau gesetzt wird.
   */
  productionWeightedKwh: number;
}

/** Ein Monat der Jahressimulation — alles in kWh. Basis für den Jahresverlauf.
 *  Produktions-Seite: production = direct + stored + feedIn (Wohin geht der Ertrag?).
 *  Verbrauchs-Seite:  consumption = selfUsed + gridDraw   (Woher kommt der Strom?). */
export interface SolarMonth {
  production: number;   // ins Haus gelieferter Ertrag (nach Wechselrichter)
  consumption: number;  // Gesamtverbrauch des Monats
  direct: number;       // Ertrag direkt verbraucht (ohne Umweg über den Speicher)
  stored: number;       // Ertrag in den Speicher geladen (deckt später Verbrauch)
  feedIn: number;       // Überschuss ins Netz
  selfUsed: number;     // Verbrauch aus Sonne + Speicher gedeckt (direct + entladen)
  gridDraw: number;     // aus dem Netz bezogen (= consumption − selfUsed)
}

export interface SolarYearResult extends BalkonSimResult {
  /** Gesamtverbrauch über das Jahr (kWh) — die Simulationsgrundlage der Last. */
  consumptionKwh: number;
  /** 12 Monatswerte für den Jahresverlauf. */
  monthly: SolarMonth[];
  /** Wärmepumpen-Last über das Jahr (kWh) — 0 ohne WP. */
  wpLoadKwh: number;
  /** Davon aus PV/Speicher gedeckt (kWh), stundenweise pro-rata der WP an der
   *  Gesamtlast zugeteilt. wpSelfCoveredKwh / wpLoadKwh ist die saisonal ehrliche
   *  WP-PV-Deckung — deutlich unter der Jahres-Autarkie, weil die WP-Last im
   *  dunklen Winterhalbjahr anfällt, wenn die PV kaum deckt. */
  wpSelfCoveredKwh: number;
}

/** Stunden-Jahressimulation (12 Monate × Tagestypen × 24 h) mit durchlaufendem
 *  Speicher-Ladestand. Kern für ALLE Rechner (Balkon + Dach-PV) — Eigenverbrauch,
 *  Autarkie und Speicher-Nutzen fallen als Ergebnis an, nicht als Annahme.
 *  Liefert zusätzlich die Monatsaufschlüsselung für den Jahresverlauf. */
export function simulateSolarYear(input: BalkonSimInput): SolarYearResult {
  let annualYield = 0, rawYield = 0, clippedKwh = 0;
  let selfUsedKwh = 0, directUsedKwh = 0, feedInKwh = 0, consumptionKwh = 0;
  let curtailedKwh = 0, feedInWeightedKwh = 0, productionWeightedKwh = 0;
  // WP-spezifische Deckung: Wie viel der (winterlastigen) Wärmepumpen-Last aus
  // PV/Speicher gedeckt wird. Pro-rata der WP an der Stundenlast — nur belastet,
  // wenn der Haushalt eine WP hat (Balkon: immer 0, kein Overhead).
  let wpLoadKwh = 0, wpSelfCoveredKwh = 0;
  const trackWp = input.household.wpActive === true;
  let soc = 0; // Speicher-Ladestand (kWh), läuft über das ganze Jahr durch
  const monthly: SolarMonth[] = [];

  const months = SOLAR_YEAR_DE[input.orientation] ?? SOLAR_YEAR_DE[LOCATION_REFERENCE];

  for (let m = 0; m < 12; m++) {
    // Die Referenzreihe liefert VERTEILUNG und Ausrichtung (welche Tage sonnig
    // sind, wie hoch und wann die Spitze steht). Der PVGIS-Monatswert liefert die
    // MENGE am Standort: Er gilt fuer optimale Neigung, also vergleichen wir ihn
    // mit derselben Ausrichtung in der Referenz — der so gewonnene Standortfaktor
    // gilt dann fuer jede Ausrichtung. Damit wandern die Spitzen mit: ein
    // sonnigerer Ort erzeugt hoehere Spitzen und clippt mehr.
    const refOptimal = referenceMonthKwh(LOCATION_REFERENCE, m);
    const locationScale = refOptimal > 0 ? input.monthlyYieldPerKwp[m] / refOptimal : 0;
    const scale = locationScale * input.moduleKwp;

    let mProd = 0, mCons = 0, mSelf = 0, mFeed = 0, mDirect = 0, mStored = 0;

    for (const dayType of months[m]) {
      for (let d = 0; d < dayType.days; d++) {
        for (let h = 0; h < 24; h++) {
        // Referenz ist W je kWp → /1000 = kWh in dieser Stunde je kWp.
        const dcKwh = (dayType.w[h] / 1000) * scale;
        const acKwh = Math.min(dcKwh, input.inverterKw); // Wechselrichter-Deckel
        rawYield += dcKwh;
        annualYield += acKwh;
        clippedKwh += dcKwh - acKwh;
        mProd += acKwh;

        const loadKwh = calcHourlyConsumption(input.household, h, m) / 1000;
        consumptionKwh += loadKwh;
        mCons += loadKwh;

        // Direktverbrauch zuerst — er ist immer verlustfrei.
        const direct = Math.min(acKwh, loadKwh);
        directUsedKwh += direct;
        selfUsedKwh += direct;
        mSelf += direct;
        mDirect += direct;
        let surplus = acKwh - direct;
        const deficit = loadKwh - direct;

        // Der Speicher haengt hier hinter dem Wechselrichter (AC-gekoppelt): Er
        // laedt aus dem GEDECKELTEN Ertrag, die gekappte Mittagsspitze ist fuer ihn
        // verloren. Reale Balkonspeicher (Anker, Zendure, Growatt) sind DC-gekoppelt
        // und koennten sie einfangen. Nachgerechnet (07/2026): Fuer die angebotenen
        // Groessen macht es exakt null Unterschied — 1,6 kWh sind aus dem normalen
        // Vormittags-Ueberschuss laengst voll, bevor mittags ueberhaupt gekappt wird.
        // Messbar wird es erst ab ~6 kWh (+46 kWh/a), und so grosse Speicher gibt es
        // am Balkon nicht. Deshalb bleibt die einfachere AC-Kopplung stehen; die HTW
        // modelliert an dieser Stelle ebenso. (Dach-PV nutzt dieselbe Kopplung — der
        // Fehler ist bei Dach-Wechselrichtern noch kleiner, weil kaum geclippt wird.)
        // Überschuss in den Speicher, soweit Platz ist.
        if (surplus > 0 && input.batteryKwh > 0) {
          const charge = Math.min(surplus, input.batteryKwh - soc);
          soc += charge;
          surplus -= charge;
          mStored += charge;
        }
        // Restbedarf aus dem Speicher decken (Wirkungsgrad beim Entladen).
        let dischargeCovered = 0;
        if (deficit > 0 && soc > 0) {
          const needed = deficit / input.roundtrip;
          const taken = Math.min(needed, soc);
          soc -= taken;
          dischargeCovered = taken * input.roundtrip;
          selfUsedKwh += dischargeCovered;
          mSelf += dischargeCovered;
        }
        // Gesetzliche Einspeisegrenze: Was der Deckel in dieser Stunde nicht
        // durchlässt, ist verloren — Verbrauch und Speicher hatten oben schon
        // ihre Chance. Ohne Deckel bleibt surplus unverändert.
        if (input.exportCapKw !== undefined && surplus > input.exportCapKw) {
          curtailedKwh += surplus - input.exportCapKw;
          surplus = input.exportCapKw;
        }
        if (input.priceShape) {
          const preis = input.priceShape[m]?.[h] ?? 1;
          feedInWeightedKwh += surplus * preis;
          productionWeightedKwh += acKwh * preis;
        }
        feedInKwh += surplus;
        mFeed += surplus;

        // WP-spezifische Deckung: Die in dieser Stunde gedeckte Energie (direkt +
        // aus dem Speicher) fließt physikalisch an alle gleichzeitigen Verbraucher.
        // Sie pro-rata nach Last-Anteil aufzuteilen, ist die neutrale Zuordnung —
        // im Winter ist die Deckung klein UND der WP-Anteil groß, also bekommt die
        // WP wenig ab; im Sommer ist die WP-Last fast null. So fällt die ehrliche
        // WP-Deckung als Ergebnis an, statt die Jahres-Autarkie zu missbrauchen.
        if (trackWp && loadKwh > 0) {
          const wpLoadHour = wpHourlyWatts(input.household, h, m) / 1000;
          wpLoadKwh += wpLoadHour;
          wpSelfCoveredKwh += (direct + dischargeCovered) * (wpLoadHour / loadKwh);
        }
        }
      }
    }

    monthly.push({
      production: Math.round(mProd),
      consumption: Math.round(mCons),
      direct: Math.round(mDirect),
      stored: Math.round(mStored),
      feedIn: Math.round(mFeed),
      selfUsed: Math.round(mSelf),
      gridDraw: Math.round(mCons - mSelf),
    });
  }

  return {
    annualYield: Math.round(annualYield),
    rawYield: Math.round(rawYield),
    clippedKwh: Math.round(clippedKwh),
    selfUsedKwh: Math.round(selfUsedKwh),
    directUsedKwh: Math.round(directUsedKwh),
    feedInKwh: Math.round(feedInKwh),
    curtailedKwh: Math.round(curtailedKwh),
    // Bewusst NICHT gerundet: Der Wert wird durch feedInKwh geteilt, um den
    // Profilfaktor zu bilden — auf ganze kWh gerundet wackelt der in der
    // zweiten Nachkommastelle.
    feedInWeightedKwh,
    productionWeightedKwh,
    consumptionKwh: Math.round(consumptionKwh),
    monthly,
    wpLoadKwh: Math.round(wpLoadKwh),
    wpSelfCoveredKwh: Math.round(wpSelfCoveredKwh),
  };
}

/** Balkon-Wrapper: identische Berechnung wie bisher, nur die Balkon-Felder. */
export function simulateBalkonYear(input: BalkonSimInput): BalkonSimResult {
  const { annualYield, rawYield, clippedKwh, selfUsedKwh, directUsedKwh, feedInKwh, curtailedKwh,
    feedInWeightedKwh, productionWeightedKwh } = simulateSolarYear(input);
  return { annualYield, rawYield, clippedKwh, selfUsedKwh, directUsedKwh, feedInKwh, curtailedKwh,
    feedInWeightedKwh, productionWeightedKwh };
}

/** Fallback-Monatsprofil, wenn keine PLZ gesetzt ist.
 *
 *  Nimmt die Monatsverteilung der Referenzreihe selbst (echtes deutsches Jahr) und
 *  skaliert sie auf die gewünschte Jahressumme. Damit gibt es keine zweite,
 *  erfundene Verteilung — ohne PLZ rechnen wir schlicht mit der Mitte Deutschlands.
 *  Sobald eine PLZ da ist, kommen die echten Monatswerte von PVGIS. */
export function monthlyFromAnnual(annualPerKwp: number): number[] {
  const ref = Array.from({ length: 12 }, (_, m) => referenceMonthKwh(LOCATION_REFERENCE, m));
  const refYear = ref.reduce((a, b) => a + b, 0);
  return refYear > 0 ? ref.map(v => (v / refYear) * annualPerKwp) : ref;
}
