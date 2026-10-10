/**
 * A funding city page shows EVERY programme of its place (06.10.2026).
 *
 * Until then the page showed exactly one programme, the most specific one, and
 * places with several lost the others without any sign: Tübingen funds roof
 * PV, balcony systems and heat pumps in three programmes and its page showed
 * only the roof; Hillscheid has its own programme and the Verbandsgemeinde's
 * balcony grant. Nothing looked broken — the page was simply incomplete.
 *
 * Checked here at the rendered page (data reads stubbed with the code seed):
 *   1. every programme of the place gets its own card;
 *   2. conditions and the maximum amount stay with THEIR programme — the roof
 *      programme's cap must never appear inside the balcony card (istDachSicht
 *      decides per card, never across programmes);
 *   3. heading and title name what the running programmes fund, and a place
 *      without a running roof programme never promises roof money;
 *   4. a single-programme page stays a single card.
 */
import { describe, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";

vi.mock("next/navigation", () => ({
  notFound: () => { throw new Error("notFound"); },
  redirect: (to: string) => { throw new Error(`redirect ${to}`); },
  usePathname: () => "/",
  useRouter: () => ({ push: () => {}, replace: () => {} }),
  useSearchParams: () => new URLSearchParams(),
}));
vi.mock("../funding-data", async () => {
  const { allFundingPrograms } = await import("../funding-programs");
  return { getFundingPrograms: async () => allFundingPrograms() };
});
vi.mock("../mastr-data", () => ({ getRegionAtlasData: async () => null }));
vi.mock("../atlas", () => ({ atlasPathForRegionId: async () => null }));
vi.mock("../funding-history", () => ({ getFundingHistoryFor: async () => [] }));

import StadtPage from "../../app/(site)/photovoltaik-foerderung/[bundesland]/[stadt]/page";
import { fundingListFor, cityBySlug } from "../atlas-cities";
import { foerderStadtMeta } from "../foerder-stadt-meta";
import { bedingungenFuer, getFundingProgram } from "../funding-programs";

async function seite(bundesland: string, stadt: string): Promise<string> {
  const jsx = await StadtPage({ params: Promise.resolve({ bundesland, stadt }) });
  return renderToStaticMarkup(jsx);
}

/** The markup of one programme card, cut at the next card. */
function karte(html: string, id: string): string {
  const start = html.indexOf(`data-foerderprogramm="${id}"`);
  expect(start, `card of ${id} missing`).toBeGreaterThan(-1);
  const next = html.indexOf("data-foerderprogramm=", start + 10);
  // The last card ends where the programme section ends (the overview link).
  const ende = next === -1 ? html.indexOf("Alle Förderprogramme im Überblick", start) : next;
  expect(ende).toBeGreaterThan(start);
  return html.slice(start, ende);
}

describe("Förder-Stadtseite mit mehreren Programmen", () => {
  it("Tübingen zeigt Dach-, Balkon- und Wärmepumpen-Programm, jedes in eigener Karte", async () => {
    const ids = fundingListFor(cityBySlug("tuebingen")!).map((p) => p.id);
    expect(ids).toEqual(expect.arrayContaining(["tuebingen-pv-speicher", "tuebingen-balkon-pv", "tuebingen-sanierungspraemie-wp"]));
    const html = await seite("baden-wuerttemberg", "tuebingen");
    for (const id of ids) karte(html, id);
    expect(html).toContain("Photovoltaik- und Balkonkraftwerk-Förderung in");
    // The roof programme leads: it carries the two ways of the page.
    expect(html.indexOf('data-foerderprogramm="tuebingen-pv-speicher"')).toBeLessThan(html.indexOf('data-foerderprogramm="tuebingen-balkon-pv"'));
  }, 60_000);

  it("Bedingungen und Höchstbetrag bleiben an ihrem Programm", async () => {
    // Rendered values are split into number and unit (zerlegeSatz), so the
    // cap is checked through the condition texts, which stand verbatim, and
    // through the cap row itself: a card shows "Höchstbetrag" only if ITS
    // programme carries one.
    const liste = fundingListFor(cityBySlug("tuebingen")!);
    const html = await seite("baden-wuerttemberg", "tuebingen");
    const escape = (t: string) => renderToStaticMarkup(<>{t}</>);
    for (const p of liste) {
      const eigene = karte(html, p.id);
      const eigeneTexte = bedingungenFuer(p.conditions).map(escape);
      for (const t of eigeneTexte) expect(eigene, `${p.id}: own condition missing`).toContain(t);
      for (const andere of liste) {
        if (andere.id === p.id) continue;
        for (const t of bedingungenFuer(andere.conditions).map(escape)) {
          if (eigeneTexte.includes(t)) continue;
          expect(eigene, `${andere.id}'s condition inside the card of ${p.id}`).not.toContain(t);
        }
      }
      expect(eigene.includes("Höchstbetrag"), `${p.id}: cap row`).toBe(Boolean(p.maxFoerderung));
    }
  }, 60_000);

  it("Hillscheid zeigt das eigene und das Programm der Verbandsgemeinde", async () => {
    const html = await seite("rheinland-pfalz", "hillscheid");
    karte(html, "hillscheid-energie");
    karte(html, "vg-hoehr-grenzhausen-balkonkraftwerke");
  }, 60_000);

  it("ohne laufendes Dachprogramm verspricht die Seite kein Dachgeld (Hockenheim)", async () => {
    const liste = fundingListFor(cityBySlug("hockenheim")!);
    expect(liste.length).toBeGreaterThan(1);
    const meta = foerderStadtMeta("Hockenheim", liste, 2026);
    expect(meta.title).toMatch(/^Balkon(kraftwerk)?-Förderung /);
    const html = await seite("baden-wuerttemberg", "hockenheim");
    for (const p of liste) karte(html, p.id);
    expect(html).toContain("Balkonkraftwerk-Förderung in");
    expect(html).not.toContain("Photovoltaik-Förderung in");
  }, 60_000);

  it("eine Seite mit einem Programm bleibt eine Karte", async () => {
    expect(fundingListFor(cityBySlug("mutterstadt")!).map((p) => p.id)).toHaveLength(1);
    const html = await seite("rheinland-pfalz", "mutterstadt");
    expect(html.match(/data-foerderprogramm=/g)).toHaveLength(1);
    expect(getFundingProgram(fundingListFor(cityBySlug("mutterstadt")!)[0].id)).toBeDefined();
  }, 60_000);
});
