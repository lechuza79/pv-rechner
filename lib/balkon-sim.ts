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

/** E-Auto als Speicher (V2H). Optional — ohne dieses Feld rechnet die Simulation
 *  exakt wie bisher; für Balkon- und Dach-PV ändert sich nichts.
 *
 *  Ein Auto ist derselbe Speicher wie der Heimspeicher, nur mit drei Ergänzungen:
 *  Es ist nicht immer da, ein Teil des Akkus muss fürs Fahren bleiben, und die
 *  Wallbox deckelt die Leistung. Mehr ist V2H rechnerisch nicht. */
export interface CarBatteryInput {
  /** Nutzbare Akkukapazität (kWh). */
  usableKwh: number;
  /** Lade-/Entladegrenze der Wallbox (kW) — die echte Grenze, nicht die Akkugröße. */
  wallboxKw: number;
  /** Roundtrip-Wirkungsgrad über die Wallbox (0–1). */
  roundtrip: number;
  /** Fahr-Reserve: so viel bleibt fürs Fahren gesperrt (kWh). */
  minReserveKwh: number;
  /** 24 Werte 0..1 — Anteil der Stunde, in der das Auto werktags angesteckt ist. */
  availabilityByHour: number[];
  /** 24 Werte für Samstag/Sonntag. Ohne Wochenend-Trennung rechnet sich ein
   *  Pendler-Auto systematisch zu schlecht: Es stünde rechnerisch an 7 statt an
   *  5 Tagen tagsüber weg — dabei sind gerade die beiden Tage, an denen es in der
   *  Sonne steht, für V2H die wertvollsten. */
  availabilityWeekend: number[];
  /** Fahrbedarf pro Tag (kWh) — entlädt den Akku, während das Auto unterwegs ist. */
  drivingKwhPerDay: number;
  /** false = lädt nur (heutiger Normalfall), true = speist auch ins Haus zurück. */
  bidirectional: boolean;
}

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
  /** E-Auto als Speicher. Weglassen = kein Auto (Verhalten unverändert). */
  car?: CarBatteryInput;
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
  /** Fahrstrom über das Jahr (kWh) — 0 ohne Auto. */
  carDrivingKwh: number;
  /** Davon aus eigener PV geladen (kWh). Das ist der V2H-Gewinn auf der Ladeseite. */
  carFromPvKwh: number;
  /** Aus dem Netz nachgeladen, damit das Auto fahren kann (kWh). Kostet Geld. */
  carFromGridKwh: number;
  /** Aus dem Auto zurück ins Haus gespeist (kWh) — nur bei bidirektionalem Betrieb. */
  carToHomeKwh: number;
}

/** Stunden-Jahressimulation (12 Monate × Tagestypen × 24 h) mit durchlaufendem
 *  Speicher-Ladestand. Kern für ALLE Rechner (Balkon + Dach-PV) — Eigenverbrauch,
 *  Autarkie und Speicher-Nutzen fallen als Ergebnis an, nicht als Annahme.
 *  Liefert zusätzlich die Monatsaufschlüsselung für den Jahresverlauf. */
export function simulateSolarYear(input: BalkonSimInput): SolarYearResult {
  let annualYield = 0, rawYield = 0, clippedKwh = 0;
  let selfUsedKwh = 0, directUsedKwh = 0, feedInKwh = 0, consumptionKwh = 0;
  // WP-spezifische Deckung: Wie viel der (winterlastigen) Wärmepumpen-Last aus
  // PV/Speicher gedeckt wird. Pro-rata der WP an der Stundenlast — nur belastet,
  // wenn der Haushalt eine WP hat (Balkon: immer 0, kein Overhead).
  let wpLoadKwh = 0, wpSelfCoveredKwh = 0;
  const trackWp = input.household.wpActive === true;
  let soc = 0; // Speicher-Ladestand (kWh), läuft über das ganze Jahr durch
  const monthly: SolarMonth[] = [];

  // ─── E-Auto als Speicher (V2H) ─────────────────────────────────────────────
  // WICHTIG für Aufrufer: Wenn hier ein Auto übergeben wird, muss household.eaActive
  // FALSE sein. Sonst zählt der Fahrstrom doppelt — einmal als Haushaltslast und
  // einmal als Akku-Entladung. Der PV-Rechner kennt das E-Auto als VERBRAUCHER,
  // V2H macht es zum SPEICHER; das sind zwei verschiedene Rollen.
  const car = input.car;
  let carSoc = car ? car.minReserveKwh : 0; // startet mit Fahr-Reserve, nicht voll
  let carDrivingKwh = 0, carFromPvKwh = 0, carFromGridKwh = 0, carToHomeKwh = 0;
  // Fahrbedarf auf die Stunden verteilen, in denen das Auto unterwegs ist. Steht es
  // rechnerisch immer zuhause, wird der Bedarf gleichmäßig über den Tag verteilt —
  // gefahren wird ja trotzdem. Werktag und Wochenende getrennt, weil die
  // Abwesenheit sich unterscheidet.
  const awayShareOf = (a: number[]) => a.reduce((s, v) => s + (1 - v), 0);
  const perAwayHourOf = (a: number[]) => {
    const away = awayShareOf(a);
    return away > 0 ? (car!.drivingKwhPerDay / away) : (car!.drivingKwhPerDay / 24);
  };
  const weekdayAway = car ? awayShareOf(car.availabilityByHour) : 0;
  const weekendAway = car ? awayShareOf(car.availabilityWeekend) : 0;
  const weekdayPerHour = car ? perAwayHourOf(car.availabilityByHour) : 0;
  const weekendPerHour = car ? perAwayHourOf(car.availabilityWeekend) : 0;
  // Laufender Tageszähler für die Wochentags-Unterscheidung. Die Tagestypen sind
  // nach Sonnigkeit gruppiert, nicht chronologisch — dadurch verteilen sich die
  // „Wochenenden" gleichmäßig über trübe und sonnige Tage, was statistisch genau
  // richtig ist.
  let dayCounter = 0;

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
        const isWeekend = dayCounter % 7 >= 5;
        dayCounter++;
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

        // ─── E-Auto: fahren, laden, zurückspeisen ───────────────────────────
        // Reihenfolge ist bewusst: Fahren geht vor Rückspeisen. Wer morgens mit
        // leerem Akku dasteht, weil das Haus ihn nachts leergesaugt hat, hat vom
        // rechnerischen Vorteil nichts.
        if (car) {
          const availCurve = isWeekend ? car.availabilityWeekend : car.availabilityByHour;
          const avail = availCurve[h] ?? 1;
          const awayShare = isWeekend ? weekendAway : weekdayAway;
          const perAwayHour = isWeekend ? weekendPerHour : weekdayPerHour;

          // 1. Fahren — entlädt den Akku, während das Auto unterwegs ist.
          const need = perAwayHour * (awayShare > 0 ? (1 - avail) : 1);
          if (need > 0) {
            const fromBattery = Math.min(need, carSoc);
            carSoc -= fromBattery;
            // Was der heimische Akku nicht hergab, wurde unterwegs geladen —
            // das kostet genauso Geld wie Netzstrom zuhause.
            carFromGridKwh += need - fromBattery;
            carDrivingKwh += need;
          }

          if (avail > 0) {
            // Die Wallbox deckelt, was in dieser Stunde durch den Anschluss passt —
            // für Laden UND Entladen zusammen.
            let budget = car.wallboxKw * avail;

            // 2. PV-Überschuss ins Auto (nach dem Heimspeicher: der ist klein und
            //    regelt fein, das Auto nimmt die Grobmenge).
            if (surplus > 0 && budget > 0) {
              const charge = Math.min(surplus, budget, car.usableKwh - carSoc);
              if (charge > 0) {
                carSoc += charge;
                surplus -= charge;
                budget -= charge;
                carFromPvKwh += charge;
                // Zählt in der Monatsbilanz als eingespeichert — das Auto IST ein
                // Speicher. Sonst ginge die Gleichung production = direct + stored
                // + feedIn nicht mehr auf.
                mStored += charge;
              }
            }

            // 3. Restbedarf des Hauses aus dem Auto decken — nur oberhalb der
            //    Fahr-Reserve. Dadurch kann netzgeladene Energie nie ins Haus
            //    zurückfließen (das wäre ein Verlustgeschäft).
            const restDeficit = deficit - dischargeCovered;
            if (car.bidirectional && restDeficit > 0 && budget > 0) {
              // Rückspeisen erst OBERHALB von Reserve + einem Tag Fahrbedarf.
              // Ohne diese Schwelle speist das Auto abends alles ins Haus und muss
              // nachts fürs Fahren aus dem Netz nachladen — dann verschiebt man
              // Energie nur im Kreis und verliert dabei den Wirkungsgrad. Genau das
              // trat im ersten Lauf auf (V2H rechnete sich beim Pendler negativ).
              // Jede reale Steuerung hält diesen Puffer vor.
              const floor = car.minReserveKwh + car.drivingKwhPerDay;
              const usable = Math.max(0, carSoc - floor);
              const taken = Math.min(restDeficit / car.roundtrip, usable, budget);
              if (taken > 0) {
                carSoc -= taken;
                budget -= taken;
                const covered = taken * car.roundtrip;
                carToHomeKwh += covered;
                selfUsedKwh += covered;
                mSelf += covered;
              }
            }

            // 4. Unter die Fahr-Reserve gefallen? Aus dem Netz nachladen — das Auto
            //    muss morgens fahren können, auch wenn die Sonne nicht lieferte.
            if (carSoc < car.minReserveKwh && budget > 0) {
              const top = Math.min(car.minReserveKwh - carSoc, budget);
              carSoc += top;
              carFromGridKwh += top;
            }
          }
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
    consumptionKwh: Math.round(consumptionKwh),
    monthly,
    wpLoadKwh: Math.round(wpLoadKwh),
    wpSelfCoveredKwh: Math.round(wpSelfCoveredKwh),
    carDrivingKwh: Math.round(carDrivingKwh),
    carFromPvKwh: Math.round(carFromPvKwh),
    carFromGridKwh: Math.round(carFromGridKwh),
    carToHomeKwh: Math.round(carToHomeKwh),
  };
}

/** Balkon-Wrapper: identische Berechnung wie bisher, nur die Balkon-Felder. */
export function simulateBalkonYear(input: BalkonSimInput): BalkonSimResult {
  const { annualYield, rawYield, clippedKwh, selfUsedKwh, directUsedKwh, feedInKwh } = simulateSolarYear(input);
  return { annualYield, rawYield, clippedKwh, selfUsedKwh, directUsedKwh, feedInKwh };
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
