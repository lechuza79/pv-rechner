// ─── Die Rechnung hinter dem geteilten Vorschaubild ─────────────────────────
//
// Ein geteilter Rechner-Link trägt den Zustand in der Adresse; das Vorschaubild
// im Chat rechnet daraus Amortisation und Gewinn. Bis 12.09.2026 las es davon
// nur einen Teil: Szenario-Reiter, von Hand gesetzter Verbrauch und Speicher,
// Klimaanlage, Dachneigung und die Konditionen ab 2027 fehlten. Eine WhatsApp-
// Nachricht nannte im Text „amortisiert sich in 11 Jahren", das Bild daneben 13;
// bei den Konditionen ab 2027 ohne Börsenerlös zeigte die Seite −1.876 € und
// keine Amortisation, das Bild +10.548 € in 13 Jahren (Rechenmodell-Council).
//
// Die Rechnung steht deshalb hier als reine Funktion, dieselben Bausteine in
// derselben Reihenfolge wie im Rechner, und ein Test hält jeden Schlüssel des
// Teilen-Links gegen diese Datei: Wer dem Link einen neuen hinzufügt, muss ihn
// hier lesen oder mit Grund ausnehmen.
//
// Was das Bild strukturell NICHT kann, und warum das vertretbar bleibt: Es läuft
// ohne Datenbank (Edge), also mit den Standardpreisen, ohne Monatsprofil des
// Standorts, mit den bundesweiten Kühlgradstunden und ohne kommunale Förderung —
// ob ein Programm Geld abziehen darf, entscheidet ein Abruf-Nachweis in der
// Datenbank. Die Formeln sind dieselben, einige Eingaben sind es nicht.

import { ANLAGEN, SPEICHER, PERSONEN, NUTZUNG, INSULATION_BESTAND, HAUSTYP_WP, DACHARTEN, NATIONAL_AVG_YIELD, SCENARIOS, YEAR, YEARS } from "./constants";
import { dachErtragKwp } from "./dach-ertrag";
import { type TiltOrientation } from "./tilt-config";
import { calcEigenverbrauchExakt, estimateCost, calcWeightedFeedIn, calc, batteryReplaceCost, paramInt, paramFloat, paramStr } from "./calc";
import { calcWpAnnualElectricity } from "./heatpump";
import { DEFAULT_FEED_IN } from "./feedin-config";
import { DEFAULT_PRICES } from "./prices-config";
import { calcExtraConsumption, calcEaAnnual, KLIMA_DEFAULT_M2, type HouseholdProfile } from "./consumption";
import { klimaSchnellschaetzungKwh } from "./aircon";
import { einspeiseVerlauf, einspeiseDeckelKw, profilFaktorAus } from "./einspeise-regime";
import { PREISFORM_MONAT_STUNDE, MARKTWERT_NIVEAU_CT } from "./marktwert-config";
import { simulateSolarYear, monthlyFromAnnual } from "./balkon-sim";
import { BATTERY_ROUNDTRIP } from "./pv-sim";

export type OgParams = Record<string, string | undefined>;

export interface OgRechnung {
  kwp: number;
  spKwh: number;
  ev: number;
  kosten: number;
  amortYears: number | null;
  gewinn25: number;
  avgSavings: number;
}

export function ogRechnung(params: OgParams): OgRechnung {
  const anlageIdx = paramInt(params, "a", 2, 0, 4);
  const speicherIdx = paramInt(params, "s", 0, 0, SPEICHER.length - 1);
  const personenIdx = paramInt(params, "p", 1, 0, PERSONEN.length - 1);
  const nutzungIdx = paramInt(params, "n", 1, 0, NUTZUNG.length - 1);
  const wp = paramStr(params, "wp", "nein", ["nein", "geplant", "ja"]);
  const ea = paramStr(params, "ea", "nein", ["nein", "geplant", "ja"]);
  const eaKm = paramInt(params, "km", 15000, 1000, 50000);
  const klima = paramStr(params, "kl", "nein", ["nein", "geplant", "ja"]);
  const customKwp = paramFloat(params, "ck", 12, 1, 50);
  // `er` ist das Standort-OPTIMUM; `da`/`az`/`ng` machen daraus den Ertrag
  // DIESES Dachs — dieselbe Regel wie im Rechner (lib/dach-ertrag.ts).
  const ertragOptimum = paramInt(params, "er", NATIONAL_AVG_YIELD, 700, 1400);
  const dachart = params.da !== undefined ? paramInt(params, "da", -1, 0, DACHARTEN.length - 1) : -1;
  const ausrichtung = paramStr(params, "az", "", ["sued", "suedostwest", "ostwest", "nord"]) as TiltOrientation | "";
  const neigung = paramInt(params, "ng", -1, 0, 90);
  const ertragKwp = dachErtragKwp(ertragOptimum, dachart >= 0 ? dachart : null, ausrichtung || null, neigung >= 0 ? neigung : null);
  const strompreis = paramFloat(params, "st", DEFAULT_PRICES.electricityPrice, 0.05, 1.0);
  const modus = params.eia === "2" ? "voll" : params.eia === "0" ? "aus" : "teil";
  const szenario = SCENARIOS.find((s) => s.id === paramStr(params, "sc", "realistic", SCENARIOS.map((x) => x.id)))!;

  const kwp = anlageIdx < 4 ? ANLAGEN[anlageIdx].kwp : customKwp;
  const skVonHand = params.sk !== undefined ? paramFloat(params, "sk", -1, 0, 30) : -1;
  const spKwh = skVonHand >= 0 ? skVonHand : SPEICHER[speicherIdx].kwh;

  const oVerbrauch = params.vb !== undefined ? paramFloat(params, "vb", -1, 500, 30000) : -1;
  const grundverbrauch = oVerbrauch >= 0 ? oVerbrauch : PERSONEN[personenIdx].verbrauch;
  const klimaRooms = paramInt(params, "klr", 2, 1, 5);
  const klwh = params.klwh !== undefined ? paramFloat(params, "klwh", -1, 0, 20000) : -1;
  const klimaKwh = klima !== "nein"
    ? (klwh >= 0 ? Math.round(klwh) : klimaSchnellschaetzungKwh({ rooms: klimaRooms, stromPrice: strompreis }))
    : null;

  const wpKwh = wp !== "nein"
    ? calcWpAnnualElectricity({
        situation: "bestand",
        wohnflaeche: paramInt(params, "wf", 140, 20, 1000),
        insulationIdx: paramInt(params, "wi", 1, 0, INSULATION_BESTAND.length - 1),
        personen: PERSONEN[personenIdx].count,
        heizsystem: paramStr(params, "wh", "hk_neu", ["fbh", "hk_neu", "hk_alt"]) as "fbh" | "hk_neu" | "hk_alt",
        wpType: "lwwp",
        haustypFaktor: HAUSTYP_WP[paramInt(params, "wht", 0, 0, HAUSTYP_WP.length - 1)].faktor,
      })
    : null;
  const gesamtVerbrauch = grundverbrauch + calcExtraConsumption(wp, ea, eaKm, klima, KLIMA_DEFAULT_M2, klimaKwh, wpKwh);
  const jahresertrag = kwp * ertragKwp;

  const oEv = params.ev !== undefined ? paramInt(params, "ev", -1, 5, 95) : -1;
  const ev = oEv >= 0 ? oEv : calcEigenverbrauchExakt({
    personenIdx, nutzungIdx, speicherKwh: spKwh, wp, ea, eaKm, klima, klimaM2: KLIMA_DEFAULT_M2,
    klimaKwh, wpKwh, kwp, ertragKwp, baseKwh: oVerbrauch >= 0 ? oVerbrauch : null,
  });
  const oKosten = params.k !== undefined ? paramFloat(params, "k", -1, 500, 200000) : -1;
  const kosten = oKosten >= 0 ? oKosten : estimateCost(kwp, spKwh);
  const oEinsp = params.ei !== undefined ? paramFloat(params, "ei", -1, 0, 20) : -1;
  const autoEinsp = modus === "voll"
    ? calcWeightedFeedIn(kwp, DEFAULT_FEED_IN.vollUnder10, DEFAULT_FEED_IN.vollOver10, DEFAULT_FEED_IN.thresholdKwp)
    : calcWeightedFeedIn(kwp, DEFAULT_FEED_IN.teilUnder10, DEFAULT_FEED_IN.teilOver10, DEFAULT_FEED_IN.thresholdKwp);
  const einsp = oEinsp >= 0 ? oEinsp : autoEinsp;

  // Konditionen ab 2027: dieselbe Stunden-Simulation wie im Rechner, weil
  // Deckel-Anteil und Profilfaktor am Speicher und am Verbrauch hängen.
  const regime = params.rg === "2027" ? "reform2027" : "heute";
  let einspeiseModell: Parameters<typeof calc>[0]["einspeiseModell"];
  if (regime === "reform2027" && modus !== "aus") {
    const household: HouseholdProfile = {
      baseKwh: grundverbrauch,
      tagQuote: NUTZUNG[nutzungIdx].tagQuote,
      wpActive: wp !== "nein",
      eaActive: ea !== "nein",
      klimaActive: klima !== "nein",
      klimaM2: KLIMA_DEFAULT_M2,
      wpAnnualKwh: wpKwh ?? undefined,
      eaAnnualKwh: ea !== "nein" ? calcEaAnnual(eaKm) : undefined,
      klimaAnnualKwh: klimaKwh ?? undefined,
    };
    const gemeinsam = {
      moduleKwp: kwp, inverterKw: kwp, monthlyYieldPerKwp: monthlyFromAnnual(ertragKwp),
      orientation: "sued_flach" as const,
      household: modus === "voll" ? { ...household, baseKwh: 0, wpActive: false, eaActive: false, klimaActive: false } : household,
      batteryKwh: modus === "voll" ? 0 : spKwh,
      roundtrip: BATTERY_ROUNDTRIP,
      priceShape: PREISFORM_MONAT_STUNDE,
    };
    const ohneDeckel = simulateSolarYear(gemeinsam);
    const mitDeckel = simulateSolarYear({ ...gemeinsam, exportCapKw: einspeiseDeckelKw(kwp, "reform2027") });
    const oMarktwert = params.mw !== undefined ? paramFloat(params, "mw", -1, 0, 30) : -1;
    const verlauf = einspeiseVerlauf({
      regime,
      kwp,
      inbetriebnahmeJahr: Math.max(2027, YEAR),
      heuteSatzCt: einsp,
      marktErloes: params.mk === "1",
      profilFaktor: profilFaktorAus(mitDeckel),
      niveauCt: oMarktwert >= 0 ? oMarktwert : MARKTWERT_NIVEAU_CT,
    });
    einspeiseModell = {
      satzCtImJahr: (i: number) => verlauf[i - 1]?.satzCt ?? 0,
      fixkostenImJahr: (i: number) => verlauf[i - 1]?.fixkosten ?? 0,
      einspeiseAnteil: ohneDeckel.feedInKwh > 0 ? mitDeckel.feedInKwh / ohneDeckel.feedInKwh : 1,
    };
  }

  const result = calc({
    kwp, kosten, strompreis,
    eigenverbrauch: modus === "voll" ? 0 : Math.min(ev + szenario.evDelta, 95, (gesamtVerbrauch / jahresertrag) * 100),
    einspeisung: modus === "aus" ? 0 : einsp,
    stromSteigerung: szenario.strom, ertragKwp, monthly: null,
    batteryReplace: batteryReplaceCost(spKwh),
    einspeiseModell,
  });

  return {
    kwp,
    spKwh,
    ev,
    kosten,
    amortYears: result.be ? result.be.i : null,
    gewinn25: result.total,
    // Dieselbe Formel wie „⌀ Ersparnis / Jahr" auf der Seite.
    avgSavings: Math.round((result.total + kosten) / YEARS),
  };
}

/**
 * Schlüssel des Teilen-Links, die das Bild bewusst NICHT liest — je mit Grund.
 * Ein Schlüssel, der weder gelesen noch hier steht, macht den Test rot.
 */
export const OG_NICHT_GELESEN: Record<string, string> = {
  plz: "Anzeige im Bild; der Ertrag kommt über `er`, den der Link mitträgt.",
  foe: "Ob ein Programm Geld abzieht, hängt am Abruf-Nachweis in der Datenbank; das Bild läuft ohne.",
  flow: "Herkunft des Links (Empfehlungsweg), rechnet nicht.",
  ht: "Haustyp der Empfehlung für die Dachfläche; die Anlagengröße steht schon in `a`/`ck`.",
  bl: "Budget der Empfehlung; die gewählte Anlage steht schon im Link.",
  km2: "Der Rechner rechnet die Klimaanlage mit der Standardfläche; die Kühlmenge steht in `klwh`/`klr`.",
  direkt: "Öffnet nur die Direkteingabe statt des Empfehlungswegs, rechnet nicht.",
};
