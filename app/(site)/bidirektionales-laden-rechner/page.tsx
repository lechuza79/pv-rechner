import { Metadata } from "next";
import { pageMetadata } from "../../../lib/seo";
import { fetchSpotPrices } from "../../../lib/energy-api";
import { calcArbitrage, toSpotHours, type SpotHour } from "../../../lib/v2h-arbitrage";
import { V2H, V2H_PROFILES } from "../../../lib/v2h-config";
import V2hClient, { type ProfileFactor } from "./v2h";

export const metadata: Metadata = pageMetadata({
  path: "/bidirektionales-laden-rechner",
  title: "Bidirektionales Laden: Was steckt in deinem Autoakku? | Solar Check",
  description:
    "Ein E-Auto hat den fünf- bis achtfachen Akku eines Heimspeichers. Was das heute kann, was noch fehlt und was Zurückspeisen zu Börsenpreisen bringen würde — mit echten deutschen Strompreisen gerechnet.",
  ogImageTitle: "Was steckt in deinem Autoakku?",
  ogImageSubtitle: "Bidirektionales Laden — ehrlich eingeordnet.",
});

// Preise ändern sich täglich; einmal pro Stunde neu ist mehr als genug.
export const revalidate = 3600;

/** Zeitraum: die zurückliegenden 12 Monate, an echten Kalendertagen verankert
 *  (kein hartkodiertes Jahr — sonst friert die Auswertung beim Jahreswechsel ein). */
function lastTwelveMonths(): { start: string; end: string } {
  const end = new Date();
  const start = new Date(end);
  start.setFullYear(start.getFullYear() - 1);
  const iso = (d: Date) => d.toISOString().slice(0, 10);
  return { start: iso(start), end: iso(end) };
}

export default async function Page() {
  const { start, end } = lastTwelveMonths();

  let prices: SpotHour[] = [];
  let priceError = false;
  try {
    const rows = await fetchSpotPrices("DE-LU", start, end);
    prices = toSpotHours(
      rows.map(r => Math.floor(new Date(r.ts).getTime() / 1000)),
      rows.map(r => (r.data?.price_eur_mwh ?? null) as number | null),
    );
  } catch {
    priceError = true;
  }

  // Je Standzeit-Profil den Ertrag PRO kWh handelbarem Volumen vorrechnen. So muss
  // die volle Preisreihe (8.760 Punkte) nicht an den Browser — der Client skaliert
  // die Zahl nur noch mit dem Volumen des gewählten Fahrzeugs.
  const referenceVolume = Math.min(V2H.wallboxKw * 3, 57);
  const factors: ProfileFactor[] = V2H_PROFILES.map(p => {
    if (prices.length === 0) {
      return { id: p.id, revenuePerKwh: 0, medianSpreadCt: 0, cyclesPerKwh: 0 };
    }
    const r = calcArbitrage({
      prices,
      availabilityByHour: p.availabilityByHour,
      availabilityWeekend: p.availabilityWeekend,
      usableKwh: 57,
      batteryGrossKwh: 77,
      wallboxKw: V2H.wallboxKw,
      roundtrip: V2H.carRoundtrip,
    });
    return {
      id: p.id,
      revenuePerKwh: r.annualRevenue / referenceVolume,
      medianSpreadCt: r.medianSpreadCt,
      cyclesPerKwh: r.cyclesPerYear / referenceVolume,
    };
  });

  return (
    <V2hClient
      factors={factors}
      priceError={priceError}
      periodStart={start}
      periodEnd={end}
    />
  );
}
