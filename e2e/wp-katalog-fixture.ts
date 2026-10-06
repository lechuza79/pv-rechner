import type { Page } from "@playwright/test";
import type { WpGeraet } from "../lib/wp-katalog";
import {
  empfehlungenFuer,
  einzelgeraeteAlternativ,
  paketLage,
  type WpFall,
} from "../lib/wp-empfehlung";

/**
 * A fixed heat-pump catalogue for browser tests that check the LAYOUT of the
 * device cards, not the merchant's assortment.
 *
 * Why: the live catalogue is only shown while the merchant feed is younger
 * than three days (KATALOG_MAX_ALTER_TAGE). When the feed went stale on
 * 06.10.2026, /api/wp-geraete answered "katalog-veraltet", no card rendered,
 * and the button-style test waited 30 s per width and retry until the whole
 * smoke step ran into its job limit — a red run that said nothing about our
 * code. The selection logic is the real one (same functions as the route);
 * only the catalogue rows are fixed. Tests that check statements about the
 * real assortment must keep using the live route.
 */
const MARKEN = ["Testmarke A", "Testmarke B", "Testmarke C", "Testmarke D"];
const LEISTUNGEN = [4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 18, 20, 22, 25, 28, 32, 36, 40];

export const WP_TEST_KATALOG: WpGeraet[] = MARKEN.flatMap((marke, m) =>
  LEISTUNGEN.map(kw => ({
    id: `test-${m}-${kw}`,
    name: `${marke} Monoblock ${kw} kW Paket mit Speicher`,
    marke,
    leistungKw: kw,
    herkunft: "ausgeschrieben" as const,
    bauart: "luft-wasser" as const,
    preisEur: 6000 + kw * 300 + m * 250 + 0.99,
    versandEur: 0,
    link: `https://example.com/wp/${m}-${kw}`,
    bildUrl: null,
    lieferbar: true,
    vorlaufMaxC: 70,
    kaeltemittel: "r290" as const,
    aufbau: "monoblock" as const,
    umfang: "paket" as const,
  })),
);

/** Answers /api/wp-geraete from the fixed catalogue, with the route's selection logic. */
export async function wpKatalogFixieren(page: Page): Promise<void> {
  await page.route("**/api/wp-geraete?**", route => {
    const p = new URL(route.request().url()).searchParams;
    const fall: WpFall = {
      auslegungKw: Number.parseFloat(p.get("kw") ?? ""),
      vorlaufC: Number.parseInt(p.get("vorlauf") ?? "", 10),
      wpType: p.get("typ") === "swwp" ? "swwp" : "lwwp",
    };
    return route.fulfill({
      json: {
        empfehlungen: empfehlungenFuer(WP_TEST_KATALOG, fall),
        alternativ: einzelgeraeteAlternativ(WP_TEST_KATALOG, fall),
        paketLage: paketLage(WP_TEST_KATALOG, fall),
        abgerufenIso: new Date().toISOString(),
        auswahlAus: WP_TEST_KATALOG.length,
      },
    });
  });
}
