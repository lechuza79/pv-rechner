// V2H — Netzhandel-Potenzial („Gedankenmodell") auf echten deutschen Börsenpreisen.
//
// WAS DAS IST UND WAS NICHT:
// Das hier ist KEINE Prognose und kein Angebot. Es ist die Antwort auf die Frage
// „Was wäre drin, wenn du mit deinem Autoakku am Strommarkt teilnehmen könntest?",
// gerechnet mit den tatsächlichen Day-Ahead-Preisen der zurückliegenden 12 Monate.
// In Deutschland fehlen dafür (Stand Juli 2026) noch flächendeckende dynamische
// Tarife und die Messsysteme — deshalb ist jede Zahl hier ausdrücklich ein
// Gedankenmodell und muss in der Oberfläche auch so beschriftet sein.
// Alles andere wäre eine irreführende geschäftliche Handlung (§ 5 UWG).
//
// WARUM DIESE RECHNUNG TROTZDEM EHRLICH IST:
// 1. Echte Preise, keine Annahme. Die Spreizung ist gemessen, nicht geschätzt.
// 2. Keine geschummelte Voraussicht. Day-Ahead-Preise stehen am Vortag fest — eine
//    Steuerung kennt sie also wirklich im Voraus. Das ist der seltene Fall, in dem
//    „perfekte Information" keine Schönrechnerei ist.
// 3. Nur Stunden, in denen das Auto laut Standzeit-Profil angesteckt ist.
// 4. Der Wirkungsgradverlust wird abgezogen, nicht ignoriert.
//
// WAS BEWUSST FEHLT (gehört sichtbar ins Ergebnis, nicht ins Kleingedruckte):
// - Netzentgelte, Steuern und Umlagen. Die Doppelbelastung ist zum 1.1.2026
//   entfallen, aber wie die Abrechnung am Ende aussieht, ist offen. Wir rechnen den
//   reinen Börsenpreis-Unterschied — die Zahl ist damit eine OBERGRENZE.
// - Die Akkualterung als Geldposten. Die zusätzlichen Vollzyklen weisen wir aus,
//   bepreisen sie aber nicht (die Datenlage zu realen Degradationskosten ist dünn).

/** Ein Preispunkt: Stunde des Tages + Preis in €/kWh. */
export interface SpotHour {
  /** 0–23 */
  hour: number;
  /** Tagesindex, um Tage voneinander zu trennen. */
  day: number;
  /** Wochentag 0–6 (5,6 = Wochenende). */
  weekday: number;
  /** €/kWh */
  price: number;
}

export interface ArbitrageInput {
  prices: SpotHour[];
  /** 24 Werte 0/1 — angesteckt an Werktagen. */
  availabilityByHour: number[];
  /** 24 Werte 0/1 — angesteckt am Wochenende. */
  availabilityWeekend: number[];
  /** Zyklierbares Volumen (kWh) — Akku minus Fahr-Reserve. */
  usableKwh: number;
  /** Brutto-Akkukapazität (kWh) — Bezugsgröße für die Vollzyklen. Ohne Angabe wird
   *  usableKwh genommen, was die Akkubelastung überzeichnen würde: Ein Vollzyklus
   *  meint immer den ganzen Akku, nicht nur das freigegebene Fenster. */
  batteryGrossKwh?: number;
  /** Lade-/Entladeleistung der Wallbox (kW). */
  wallboxKw: number;
  /** Roundtrip-Wirkungsgrad (0–1). */
  roundtrip: number;
  /** Wie viele Stunden je Richtung gehandelt werden (Standard 3). */
  hoursPerSide?: number;
}

export interface ArbitrageResult {
  /** Erlös über die ausgewertete Periode, hochgerechnet auf ein Jahr (€). */
  annualRevenue: number;
  /** Zusätzliche Vollzyklen pro Jahr — der Preis, den der Akku zahlt. */
  cyclesPerYear: number;
  /** Median der täglichen Preisspreizung (ct/kWh) — die Kennzahl dahinter. */
  medianSpreadCt: number;
  /** Tage, an denen sich der Handel überhaupt gelohnt hätte. */
  activeDays: number;
  /** Ausgewertete Tage insgesamt. */
  totalDays: number;
}

/** Netzhandel-Potenzial aus einer echten Preisreihe.
 *
 *  Vorgehen je Tag: Aus den Stunden, in denen das Auto angesteckt ist, die
 *  günstigsten N zum Laden und die teuersten N zum Zurückspeisen wählen. Gehandelt
 *  wird nur, wenn der Erlös die Ladekosten übersteigt — an Tagen mit flacher Kurve
 *  bleibt das Auto in Ruhe. */
export function calcArbitrage(input: ArbitrageInput): ArbitrageResult {
  const n = input.hoursPerSide ?? 3;
  const volume = Math.min(input.wallboxKw * n, input.usableKwh);

  // Preise nach Tagen gruppieren.
  const byDay = new Map<number, SpotHour[]>();
  for (const p of input.prices) {
    const list = byDay.get(p.day);
    if (list) list.push(p);
    else byDay.set(p.day, [p]);
  }

  let revenue = 0, cycles = 0, activeDays = 0, totalDays = 0;
  const spreads: number[] = [];

  for (const hours of Array.from(byDay.values())) {
    if (hours.length < 12) continue; // unvollständiger Tag
    totalDays++;
    const weekend = hours[0].weekday >= 5;
    const avail = weekend ? input.availabilityWeekend : input.availabilityByHour;

    // Nur Stunden, in denen das Auto tatsächlich am Netz hängt.
    const usable = hours.filter(h => (avail[h.hour] ?? 1) > 0).map(h => h.price);
    if (usable.length < n * 2) continue;

    usable.sort((a, b) => a - b);
    const buyAvg = usable.slice(0, n).reduce((s, v) => s + v, 0) / n;
    const sellAvg = usable.slice(-n).reduce((s, v) => s + v, 0) / n;
    spreads.push((sellAvg - buyAvg) * 100); // ct/kWh

    // Nur handeln, wenn nach Wirkungsgradverlust etwas übrig bleibt.
    const gain = sellAvg * input.roundtrip - buyAvg;
    if (gain > 0) {
      revenue += gain * volume;
      cycles += volume / Math.max(input.batteryGrossKwh ?? input.usableKwh, 1);
      activeDays++;
    }
  }

  if (totalDays === 0) {
    return { annualRevenue: 0, cyclesPerYear: 0, medianSpreadCt: 0, activeDays: 0, totalDays: 0 };
  }

  // Auf ein volles Jahr hochrechnen, falls die Reihe kürzer ist.
  const scale = 365 / totalDays;
  spreads.sort((a, b) => a - b);

  return {
    annualRevenue: Math.round(revenue * scale),
    cyclesPerYear: Math.round(cycles * scale),
    medianSpreadCt: Math.round((spreads[Math.floor(spreads.length / 2)] ?? 0) * 10) / 10,
    activeDays: Math.round(activeDays * scale),
    totalDays,
  };
}

/** Energy-Charts-Antwort in Stundenpunkte umwandeln.
 *  Die Reihe kommt viertelstündlich — gleiche Stunde wird gemittelt. */
export function toSpotHours(unixSeconds: number[], priceEurMwh: (number | null)[]): SpotHour[] {
  const buckets = new Map<string, { sum: number; count: number; h: SpotHour }>();
  for (let i = 0; i < unixSeconds.length; i++) {
    const v = priceEurMwh[i];
    if (v == null) continue;
    const d = new Date(unixSeconds[i] * 1000);
    const day = Math.floor(unixSeconds[i] / 86400);
    const key = `${day}-${d.getUTCHours()}`;
    const b = buckets.get(key);
    if (b) {
      b.sum += v;
      b.count++;
    } else {
      buckets.set(key, {
        sum: v,
        count: 1,
        h: { hour: d.getUTCHours(), day, weekday: d.getUTCDay() === 0 ? 6 : d.getUTCDay() - 1, price: 0 },
      });
    }
  }
  return Array.from(buckets.values()).map(b => ({ ...b.h, price: b.sum / b.count / 1000 }));
}
