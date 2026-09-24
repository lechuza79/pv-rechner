import { describe, it, expect } from "vitest";
import { ATLAS_CITIES, fundingFor, fundingForFrom, publishedCities, indexedCities, cityIndexFreigegeben, liveCities, archivedCities, foerderseiteTraegt } from "../atlas-cities";
import { allFundingPrograms } from "../funding-programs";
import { ALTBESTAND, ortSchluessel } from "../release-plan";

/** Seit Juni live — wird von einer neuen Regel nicht rückwirkend eingezogen. */
const ALT = new Set(ALTBESTAND["foerder-stadt"].map(ortSchluessel));
const istAlt = (ags: string) => ALT.has(ortSchluessel(ags));

// ─── Katalog und Städte-Verzeichnis dürfen nicht auseinanderlaufen ───────────
//
// Es sind zwei Listen: die Förderprogramme und die Städte, für die es eine Seite
// gibt. Verknüpft wurden sie bis zum 18.08.2026 von Hand über das Feld
// `fundingId` — und das wurde vergessen. Herne und Ludwigshafen standen im
// Verzeichnis, ihre Programme waren aufgenommen, die Seite sagte trotzdem nichts
// davon. Bremerhaven verpasste sogar ein AKTIVES Landesprogramm.
//
// Seither leitet fundingFor() die Zuordnung über den Gemeindeschlüssel ab.
// Dieser Test hält die andere Richtung fest: Kein Programm darf ohne Seite
// dastehen, ohne dass jemand den Grund hingeschrieben hat.

/**
 * Programme, die bewusst (noch) keine Stadtseite haben — mit Grund.
 *
 * Leer, und das ist das Ergebnis vom 19.08.2026: Bis dahin nahm dieser Test
 * eine ganze KLASSE von Programmen von der Seitenpflicht aus — alle mit
 * achtstelligem Gemeindeschlüssel, seinerzeit 61 Stück. Die Begründung war
 * richtig (das Verzeichnis führte fünfstellige Kreisschlüssel, und eine
 * Gemeinde damit einzutragen hätte den Bestand des ganzen Landkreises unter
 * ihren Namen gesetzt), aber eine Ausnahme, die mit jedem gefundenen
 * Dorfprogramm mitwächst, hört auf, eine Ausnahme zu sein: Sie hat den Zustand
 * festgehalten, statt ihn zu befristen. Jetzt trägt das Verzeichnis
 * achtstellige Schlüssel, und die Regel ist weg.
 */
const OHNE_SEITE: Record<string, string> = {
  "tuebingen-sanierungspraemie-wp": "OFFEN (bis 03/2027). Heat-pump-only municipal grant of a town that ALREADY has a funding page -- and that page is headed \"Photovoltaik-F\u00f6rderung in T\u00fcbingen\" and resolves to tuebingen-pv-speicher, the roof array grant. A second page for the same town is not possible, and a heat-pump grant behind a photovoltaic headline would promise roof money this programme does not pay. Reachable through the postcode lookup in the heat-pump calculator, where it informs and deducts nothing -- the mandatory renovation roadmap is a priced precondition the calculator does not ask for. Revisit in MARCH 2027: the town's roof PV programme expires on 31 December 2026 by its own wording, so the shared municipality key may be free, and if the town relaunches neither, the question changes entirely.",
  "bremen-heizungstausch": "OFFEN (bis 06/2027). Discontinued state programme of a city state: applications stopped on 31 August 2025 and a discontinued programme carries no funding page. Both Bremen city entries point at bremen-rundumshaus through fundingId, because two state programmes on the same two-digit key are equally specific and would otherwise resolve to nothing at all. Reachable through the postcode lookup, where both programmes appear. Revisit when the Wärmewende loan announced in the climate action plan is actually launched -- resolved to be developed, not resolved to be offered.",
  "kaufungen-sondervermoegen": "OFFEN (bis 12/2026). Active municipal programme that lends instead of paying: 60 % of eligible cost as an INTEREST-FREE LOAN, up to 5,000 EUR for photovoltaics, repaid over 30 months. Whether a page headed \"Photovoltaik-Förderung in Kaufungen\" should carry a loan is a product question and belongs to the operator, not to a watcher run -- it is the first municipal loan-only programme that would qualify for a page, and the municipality would need a measured location yield in ATLAS_CITIES as well. Reachable through the postcode lookup, where it informs and deducts nothing. Revisit once the operator has decided.",
  "wertingen-photovoltaik": "OFFEN (bis 03/2027). Exhausted municipal programme: the town has reported since 27 September 2024 that the funds are used up and that no grant will be approved or paid until the next budget deliberation. An exhausted programme carries no funding page, and no guideline is published, so the page would have no rate to show. Reachable through the postcode lookup and the balcony funding overview. Revisit once the town reports new funds -- the notice is two budget years old and the town has not updated it.",
  "petershausen-photovoltaik": "OFFEN (bis 09/2027). Closed municipal programme: the municipality states on its own page that the photovoltaic grant was not renewed after 31 January 2024, and neither the bylaws, the forms page nor the climate page carry a guideline or a successor. A closed programme carries no funding page. Reachable through the postcode lookup. Revisit if Petershausen opens a new round.",
  "ehningen-steckerfertige-pv": "OFFEN (bis 03/2027). Active but balcony-only municipal programme (50 % up to 200 €, 75 % up to 500 € with a social pass): a page titled \"Photovoltaik-Förderung in Ehningen\" would promise roof funding the municipality does not pay. Reachable through the postcode lookup, the balcony calculator and the balcony funding overview. Revisit if Ehningen adds a roof or storage grant.",
  "florstadt-photovoltaik": "OFFEN (bis 12/2026). Closed town programme: the guideline of 12 December 2024 expired on 30 June 2025 by its own section 8, and the town's document index lists no successor. A closed programme carries no funding page, and the historical rates stay visible through the postcode lookup. Revisit if the town publishes a new guideline.",
  "bad-marienberg-erneuerbare-energien": "OFFEN (bis 03/2027). Mixed-technology programme of the Verbandsgemeinde, budget for 2026 exhausted (official notice 16 September 2026); an exhausted programme carries no funding page. All 18 member municipalities are individually audited in data/funding/municipal-reviews.json (17 September 2026). Reachable through the postcode lookup and the balcony overview. Revisit when the Verbandsgemeinde announces whether the programme continues in 2027.",
  "mainz-bingen-balkonkraftwerke": "OFFEN (bis 12/2026). Closed historical county programme (payments ended 30 April 2026); county-level pages are not released and a closed programme carries no funding page. Reachable through the postcode lookup.",
  "vg-hachenburg-erneuerbare-energien": "OFFEN (bis 03/2027). Balcony and heat-pump programme of the Verbandsgemeinde (no roof photovoltaics); the KIPKI budget of 237,000 EUR is exhausted (programme page read 18 September 2026). An exhausted programme without roof PV carries no funding page. All 33 member municipalities are listed individually in the funding area. Reachable through the postcode lookup. Revisit when the Verbandsgemeinde reports new funds.",
  "vg-wallmerod-lange-leben-im-dorf": "OFFEN (bis 03/2027). Building-renovation grant of the Verbandsgemeinde that covers a heating replacement among other measures and expressly excludes photovoltaics; a page titled \"Photovoltaik-Förderung\" would promise funding the programme refuses. All 21 member municipalities are listed individually in the funding area. Reachable through the postcode lookup. Revisit if the Verbandsgemeinde adds an energy-generation grant.",
  "stuhr-klimaschutz-speicher": "OFFEN (bis 03/2027). Exhausted storage-only municipal programme: Stuhr pays 500 EUR flat for the FIRST installation of a battery to an existing photovoltaic system and has never funded a roof array at all -- a page headed \"Photovoltaik-F\u00f6rderung in Stuhr\" would promise roof money the municipality expressly declined to pay (stated reason in 2022: higher sums would be needed to move owners). The 2026 pot was raised from 30,000 to 50,000 EUR and was paid out by the end of July; 102 applications were approved, 45 of them storage units. Reachable through the postcode lookup, where it informs and deducts nothing. Revisit in JANUARY 2027, not later: the council has relaunched this programme every year since 2020 and it runs dry by midsummer, so \"exhausted\" turns into a false answer as soon as the new round opens -- and the page watcher cannot see it, because the municipality empties its programme pages after exhaustion and recycles the addresses.",
  "gifhorn-kreis-balkonkraftwerke": "OFFEN (bis 03/2027). Exhausted balcony-only county programme (200 EUR flat, income-capped at twice the Buergergeld rate); county-level pages are not released, and a page titled \"Photovoltaik-Foerderung\" would promise roof funding the county never paid. The county budget carries 1,600 EUR for 2024 and 0.00 for 2025 through 2029, and the county's own service portal no longer lists the service (measured 23 September 2026). Reachable through the postcode lookup and the balcony overview. Revisit if the county budgets new funds.",
  "altenkirchen-balkonkraftwerke":"OFFEN (bis 12/2026). Closed historical county programme without a rate; county-level pages are not released. Reachable through the postcode lookup.",
  "altenkirchen-solarspeicher": "OFFEN (bis 12/2026). Exhausted historical county programme without a rate; county-level pages are not released. Reachable through the postcode lookup.",
  "erlangen-hoechstadt-waermepumpe": "OFFEN (bis 03/2027). Heat-pump-only county grant (250/500 EUR, no roof photovoltaics and no storage); a page titled \"Photovoltaik-Förderung\" would promise roof funding the county does not pay, and county-level pages are not released. Reachable through the postcode lookup. Revisit in January 2027: the time limit rolls forward with the county budget each year, and the page carried an expired one for six weeks in early 2025.",
  "ekm-altenkirchen": "OFFEN (bis 03/2027). Heat-pump-only discretionary grant of the EKM gGmbH for the whole county, no rate; a page titled \"Photovoltaik-Förderung\" would promise roof funding the committee expressly excludes, and county-level pages are not released. Reachable through the postcode lookup.",
  "mehren-balkonkraftwerke": "OFFEN (bis 03/2027). Active but balcony-only village programme (465 inhabitants): a page titled \"Photovoltaik-Förderung in Mehren\" would promise roof funding the village does not pay. Reachable through the postcode lookup.",
  "rauschenberg-balkon-solaranlagen": "OFFEN (bis 03/2027). Active but balcony-only town programme: a page titled \"Photovoltaik-Förderung in Rauschenberg\" would promise roof funding the town does not pay. Reachable through the postcode lookup and the balcony overview.",
  "schwarzenfeld-balkon-pv": "OFFEN (bis 03/2027). Active but balcony-only market-town programme (10 % of the invoice, up to 100 EUR): a page titled \"Photovoltaik-Förderung in Schwarzenfeld\" would promise roof funding the municipality does not pay. Reachable through the postcode lookup, the balcony calculator and the balcony funding overview. Revisit if Schwarzenfeld adds a roof or storage grant.",
  "goedenstorf-stecker-solar": "OFFEN (bis 03/2027). Active but balcony-only village programme (150 EUR flat, no calculation fields, about 1,100 inhabitants): a page titled \"Photovoltaik-Förderung in Gödenstorf\" would promise roof funding the municipality does not pay. Reachable through the postcode lookup, the balcony calculator and the balcony funding overview.",
  "cremlingen-balkonkraftwerk": "OFFEN (bis 03/2027). Active but balcony-only municipal programme (30 % of the net price, up to 300 EUR, tenants and condominium residents only): a page titled \"Photovoltaik-Förderung in Cremlingen\" would promise roof funding the municipality does not pay. Reachable through the postcode lookup and the balcony funding overview. Revisit if Cremlingen adds a roof or storage grant.",
  "kumhausen-balkon-pv": "OFFEN (bis 03/2027). Active but balcony-only municipal programme (100 EUR flat, capped at 20 % of the purchase price): a page titled \"Photovoltaik-Förderung in Kumhausen\" would promise roof funding the municipality does not pay. Reachable through the postcode lookup, the balcony calculator and the balcony funding overview. Revisit if Kumhausen adds a roof or storage grant.",
  "mutterstadt-balkonkraftwerke": "OFFEN (bis 03/2027). Active but balcony-only municipal programme (200 EUR flat), funded from budget appropriations that run to 31 December 2026: a page titled \"Photovoltaik-Förderung in Mutterstadt\" would promise roof funding the municipality does not pay. Reachable through the postcode lookup, the balcony calculator and the balcony funding overview. Revisit in January 2027: endetIso stops nothing by itself (no reader in fundingZaehlt or fundingAmount), so the entry keeps deducting until someone checks whether the council renewed the appropriation and otherwise flips status.",
  "mauer-balkonkraftwerke": "OFFEN (bis 03/2027). Active but balcony-only village programme (4,073 inhabitants): a page titled \"Photovoltaik-Förderung in Mauer\" would promise roof funding the municipality does not pay. Reachable through the postcode lookup and the balcony overview.",
  "weichering-solarberatung": "OFFEN (bis 03/2027). The village pays 400 EUR once for CONSULTING AND PLANNING a solar system, nothing towards buying or mounting one: a page titled \"Photovoltaik-Förderung in Weichering\" would promise an installation grant the municipality does not pay. It informs through the postcode lookup and deducts nothing. Revisit once someone has asked the town hall whether the grant still runs — the programme page is live and in the present tense, but it was published on 25 October 2022 and the guideline it links to is no longer on the forms page or anywhere in the 33 documents of the municipal bylaws.",
  "fritzlar-balkonkraftwerke-speicher": "OFFEN (bis 03/2027). Active but balcony-only programme, and only for balcony kits WITH storage: a page titled \"Photovoltaik-Förderung in Fritzlar\" would promise roof funding the town does not pay. Reachable through the postcode lookup and the balcony overview. Revisit when the guideline expires on 31 December 2027 or the town adds a roof grant.",
  "holzminden-solarfair": "OFFEN (bis 03/2027). Active but balcony-only programme bound to Wohngeld/Bürgergeld: a page titled \"Photovoltaik-Förderung in Holzminden\" would promise roof funding the town does not pay. Reachable through the postcode lookup.",
  "cochem-zell-solarstromspeicher": "OFFEN (bis 12/2026). Closed historical county programme (ended 31.03.2026); county-level pages are not released. Reachable through the postcode lookup.",
  "mayen-koblenz-balkonkraftwerke": "OFFEN (bis 12/2026). Closed historical county programme; the county entry already carries the storage programme as its page programme, and county-level pages are not released. Reachable through the postcode lookup.",
  "kaarst-stecker-pv": "OFFEN (bis 09/2027). Closed historical balcony-only programme (200 EUR flat, 200 applications, exhausted July 2023): a page titled \"Photovoltaik-Förderung\" would promise funding that ended three years ago and never covered roofs. Reachable through the postcode lookup and the balcony funding overview. Revisit if Kaarst opens a new round.",
  "nettetal-steckermodule": "OFFEN (bis 09/2027). Closed historical balcony-only programme (2023 fixed amounts, 2024 round for rented property); the city funding page no longer offers it: a page titled \"Photovoltaik-Förderung\" would promise funding that ended and never covered roofs. Reachable through the postcode lookup and the balcony funding overview. Revisit if Nettetal opens a new round.",
  "grossheide-balkonmodule": "OFFEN (bis 09/2027). Exhausted balcony-only programme (200 EUR flat, no funds since 18 February 2025): a page titled \"Photovoltaik-Förderung in Großheide\" would promise funding the municipality does not currently pay and never paid for roofs. Reachable through the postcode lookup and the balcony funding overview. Revisit if Großheide releases new funds.",
  "rhein-kreis-neuss-stecker-pv": "OFFEN (bis 09/2027). Closed county balcony-only programme (100/300 EUR flat, budget exhausted 30 April 2025): a county page titled \"Photovoltaik-Förderung\" would promise funding that ended and never covered roofs. Reachable through the postcode lookup and the balcony funding overview. Revisit if the county opens a new round.",
  "berkenthin-balkon-solar": "OFFEN (bis 09/2027). Closed balcony-only village programme (up to 200 EUR, 76 systems 2023–2025, ended per notice of 4 May 2026): a page titled \"Photovoltaik-Förderung in Berkenthin\" would promise funding that ended and never covered roofs. Reachable through the postcode lookup and the balcony funding overview. Revisit if Berkenthin opens a new round.",
  "wuerselen-balkonkraftwerke": "OFFEN (bis 03/2027). Active but balcony-only: a page titled \"Photovoltaik-Förderung in Würselen\" would promise roof funding the city does not pay. Reachable through the postcode lookup, the balcony calculator and the balcony funding overview. Revisit if the city adds a roof or storage grant.",
  "gronau-klima-umweltfonds": "OFFEN (bis 06/2027). Suspended since the budget freeze of 29 July 2026; applications are stopped for all four funding areas and the finance committee confirmed the freeze on 9 September 2026. A suspended programme pays nothing, so it carries no funding page. Reachable through the postcode lookup. Revisit when the city lifts the freeze or announces the 2027 fund.",
  "herzogenrath-klimaschutzinvestitionen": "OFFEN (bis 03/2027). Exhausted for 2026 and balcony/heat-pump only — the guideline funds small plug-in systems up to the de-minimis limit, not roof photovoltaics, so a page titled \"Photovoltaik-Förderung in Herzogenrath\" would promise what the city does not pay. Reachable through the postcode lookup. Revisit when the city releases its 2027 budget.",
  "bahrenhof-solar": "OFFEN (bis 12/2026). Closed village programme (guideline of 13 June 2023, expired 31 December 2023) in a municipality of 210 inhabitants. A closed programme carries no funding page, and the historical rates stay visible through the postcode lookup. Revisit if the municipality announces a new round.",
  "wakendorf-i-solar": "OFFEN (bis 12/2026). Closed village programme in Amt Trave-Land (guideline of 18 January 2023, extended by the 2024 application form to 31 December 2024); a closed programme carries no funding page, and the historical rates stay visible through the postcode lookup. Revisit if the municipality announces a new round.",
  "weede-mini-solar": "OFFEN (bis 12/2026). Closed village programme in Amt Trave-Land (guideline of 1 January 2023, extended by the 2024 application form to 31 December 2024); a closed programme carries no funding page, and the historical rates stay visible through the postcode lookup. Revisit if the municipality announces a new round.",
  "kalchreuth-regenerative-energien": "OFFEN (bis 03/2027). Heat-pump-only municipal grant whose validity is open — the guideline ends \"with the current budget year\" (2023) but the municipality still publishes it with its application forms (20 September 2026). Carried as status \"unsicher\", so it informs and deducts nothing; a page titled \"Photovoltaik-Förderung in Kalchreuth\" would promise roof funding the municipality does not pay at all. Reachable through the postcode lookup. Revisit when the municipality answers the enquiry (queued 20 September 2026).",
  "eckental-balkon": "OFFEN (bis 03/2027). Active but balcony-only market-town programme (50 EUR per household): a page titled \"Photovoltaik-Förderung in Eckental\" would promise roof funding the market town does not pay. Reachable through the postcode lookup, the balcony calculator and the balcony funding overview. Revisit if Eckental adds a roof or storage grant.",
  "bubenreuth-co2-einsparung": "OFFEN (bis 03/2027). Exhausted municipal programme — the municipality itself states on its funding page that the funds are used up and that no application is possible at present (read 20 September 2026). An exhausted programme pays nothing, so it carries no funding page; the historical rates stay visible through the postcode lookup. Revisit when the municipality announces a new round or a new budget year.",
  "herzogenaurach-co2-minderung": "OFFEN (bis 03/2027). Suspended municipal programme: the application stop has been extended indefinitely (council committee decision of 13 March 2024, live page read 20 September 2026), and the current guideline of 13 March 2023 funds no photovoltaics at all — only a flat heating-replacement grant. A page titled \"Photovoltaik-Förderung in Herzogenaurach\" would promise roof funding the town does not pay even when the programme runs. Reachable through the postcode lookup. Revisit when the town lifts the application stop.",
  "geschendorf-solar": "OFFEN (bis 12/2026). Closed village programme in Amt Trave-Land (guideline of 30 May 2024, expired 31 December 2024); a closed programme carries no funding page, and the historical rates stay visible through the postcode lookup. Revisit if the municipality announces a new round.",
  "vg-leiningerland-balkonkraftwerke": "OFFEN (bis 06/2027). Discontinued balcony-only programme of the Verbandsgemeinde (200 EUR flat per dwelling unit, 400 applications from about 80,000 EUR of KIPKI money, reported as finished on 26 June 2025): a page titled \"Photovoltaik-Förderung\" would promise roof funding this programme never paid, and a discontinued programme carries no funding page at all. None of the 21 member municipalities is in ATLAS_CITIES, so nothing falls to 404. Reachable through the postcode lookup and the balcony funding overview, for all 21 of them. Revisit by June 2027: the page this entry cites is a closed news article whose fingerprint will never move again, so a new round would be invisible to the page watcher -- the wait must run through this deadline, not through the crawler.",
  "germersheim-balkonkraftwerke": "OFFEN (bis 09/2027). Closed AND balcony-only town programme (125 EUR flat, inverter capped at 800 W, modules at 2,000 Wp, applications closed after 31 October 2025 out of a KIPKI budget of 40,000 EUR): either reason alone would rule the page out -- a closed programme pays nothing, and a page titled \"Photovoltaik-Förderung in Germersheim\" would promise roof funding the town never paid. ATLAS_CITIES holds no municipality of Landkreis Germersheim at all, so fundingFor never reaches this entry and nothing falls to 404. Reachable through the postcode lookup and the balcony funding overview. Revisit by September 2027: the state KIPKI money the grant came from can be drawn until 31 January 2027, so a second round is not ruled out -- and the page this entry cites is the town's climate chronicle, which would carry it.",
  "vg-hoehr-grenzhausen-balkonkraftwerke": "OFFEN (bis 02/2027). Active but balcony-only programme of the Verbandsgemeinde (200 EUR flat per dwelling unit, at least 800 Wp of modules): a page titled \"Photovoltaik-Förderung\" would promise roof funding the Verbandsgemeinde does not pay -- roof photovoltaics are funded by the town of Höhr-Grenzhausen and the village of Hillscheid under their OWN guidelines, which already carry the two pages. Both of those are pinned through fundingId, because the Verbandsgemeinde grant covers the same two eight-digit keys and would otherwise resolve to nothing at all. Reachable through the postcode lookup, the balcony calculator and the balcony funding overview, for all four member municipalities. Side effect to accept knowingly: the town page then points at an EXHAUSTED roof programme for good, while the one programme of the Verbandsgemeinde that is actually running gets no page at all -- defensible because a roof-funding page is not what it pays. Revisit by 31 January 2027, the last day KIPKI money can be drawn: the grant rests on a contingent of 500 systems announced in January 2024, and about 140 applications were reported by August 2024.",
  "gaildorf-balkonkraftwerke": "OFFEN (bis 12/2026). Closed AND balcony-only town programme (50 EUR per module, at most two; ran 1 January 2024 to 31 December 2025, official page read 20 September 2026). Either reason alone would rule the page out: a closed programme pays nothing, and a page titled \"Photovoltaik-Förderung in Gaildorf\" would promise roof funding the town never paid. The historical rates stay visible through the postcode lookup and the balcony funding overview. Revisit if the town announces a new round.",
  "pinneberg-gruendach-pv": "OFFEN (bis 03/2027). County green-roof grant that raises its rate by 10 EUR/m² when a photovoltaic system goes onto the roof, but expressly does not subsidise the system itself (guideline no. 4.1). Two reasons, either of which would do: a page titled \"Photovoltaik-Förderung\" would promise a panel grant the county refuses to pay, and ATLAS_CITIES holds no municipality of Kreis Pinneberg at all, so fundingFor never reaches it. Reachable through the postcode lookup for all 48 municipalities of the county. Revisit in January 2027: the programme page states the county relaunched its programmes \"auch für die Jahre 2025 und 2026\", which is a stated horizon rather than an end date.",
  "adendorf-steckersolar": "OFFEN (bis 03/2027). Active but balcony-only municipal programme (100 EUR per household): a page titled \"Photovoltaik-Förderung in Adendorf\" would promise roof funding the municipality does not pay. Its other roof programme, the green-roof grant, pays 5 EUR per square metre and knows no raised rate for a photovoltaic system, so it is no roof PV grant either. Reachable through the postcode lookup, the balcony calculator and the balcony funding overview. Revisit if Adendorf adds a roof or storage grant.",
  "ilmenau-steckersolar": "OFFEN (bis 03/2027). Active but balcony-only Samtgemeinde programme (100 EUR per household, guideline no. 5 b) for Barnstedt, Deutsch Evern, Embsen and Melbeck: a page titled \"Photovoltaik-Förderung\" would promise roof funding the Samtgemeinde does not pay, and no. 4 c expressly excludes fixed systems. Reachable through the postcode lookup, the balcony calculator and the balcony funding overview. Revisit if the Samtgemeinde adds a roof or storage grant.",
  "scharnebeck-steckersolar": "OFFEN (bis 03/2027). Active but balcony-only Samtgemeinde programme (75 EUR per household, guideline § 5 (2)) for its eight member municipalities: a page titled \"Photovoltaik-Förderung\" would promise roof funding the Samtgemeinde does not pay; its green-roof grant knows no raised rate for a PV system and its solar grant funds hot-water thermal systems. Reachable through the postcode lookup, the balcony calculator and the balcony funding overview. Revisit if the Samtgemeinde adds a roof or storage grant.",
  "vg-kandel-balkonkraftwerke": "OFFEN (bis 03/2027). Exhausted AND balcony-only Verbandsgemeinde programme for its seven member municipalities: the programme page states that all funds are used up and no further applications are accepted (read 23 September 2026), and a page titled \"Photovoltaik-Förderung\" would promise roof funding the Verbandsgemeinde does not pay. Either reason alone would rule the page out. Reachable through the postcode lookup, the balcony calculator and the balcony funding overview. Revisit when the Verbandsgemeinde reports new KIPKI funds.",
  "ransbach-baumbach-balkonkraftwerke": "OFFEN (bis 03/2027). Active but balcony-only Verbandsgemeinde programme (200 EUR flat, guideline § 4) for its eleven member municipalities: a page titled \"Photovoltaik-Förderung\" would promise roof funding the Verbandsgemeinde does not pay; its other grants fund rainwater cisterns and energy advice. Reachable through the postcode lookup, the balcony calculator and the balcony funding overview. Revisit if the Verbandsgemeinde adds a roof or storage grant.",
  "lueneburg-regenerative-energien": "OFFEN (bis 03/2027). Exhausted for 2026 (\"Der Fördermitteltopf für das Jahr 2026 ist leer\", programme page read 21 September 2026) and no roof PV grant: the city funds balcony systems for tenants and ground-source heat, and stopped funding roof PV from 2026. A page titled \"Photovoltaik-Förderung in Lüneburg\" would promise money the city does not pay. Reachable through the postcode lookup and the balcony funding overview. Revisit in January 2027 when the new round opens.",
  "sh-balkon-klimaschutz-bub": "OFFEN (bis 09/2027). Closed state programme of a territorial state (applications ended 16 November 2023, state decided not to continue); a state programme never creates a city page there (CLAUDE.md, 02.09.2026), and with three Schleswig-Holstein state programmes on key 01 fundingFor resolves Flensburg and Neumünster to none of them. Reachable through the postcode lookup and the balcony funding overview. Revisit if the state restarts the programme.",
  "sh-waermepumpe-klimaschutz-bub": "OFFEN (bis 09/2027). Closed state heat-pump grant of Schleswig-Holstein (applications ended 16 November 2023, not to be continued); a territorial state's programme never creates a city page, and a heat-pump-only grant under a page titled Photovoltaik-Förderung would promise roof funding. Reachable through the postcode lookup in the heat-pump calculator. Revisit if the state restarts it.",
  "sh-speicher-klimaschutz-bub": "OFFEN (bis 09/2027). Closed state battery grant of Schleswig-Holstein (applications 22 August to 16 November 2023, not to be continued); a territorial state's programme never creates a city page. Reachable through the postcode lookup. Revisit if the state restarts it.",
  "tuebingen-balkon-pv": "OFFEN (bis 06/2027). Tübingen trägt seit dem 24.09.2026 ZWEI Programme auf demselben Gemeindeschlüssel. Die Stadtseite zeigt das Dach-Programm (tuebingen-pv-speicher), weil nur dieses eine Dachanlage fördert und die Seite genau das im Titel verspricht; das Balkon-Programm gilt ohnehin nur für Inhaber der KreisBonusCard und bleibt über die Postleitzahl im Rechner und über die Balkon-Förderübersicht erreichbar. Wieder aufmachen, sobald es eine eigene Seitenfamilie für Balkon-Förderung gibt — dann gehört es dorthin statt in eine Ausnahme.",
  "vg-langenlonsheim-stromberg-balkonkraftwerke": "OFFEN (bis 03/2027). Exhausted AND balcony-only Verbandsgemeinde programme for its 16 Ortsgemeinden and the town of Stromberg: the 125 applications budgeted for 2026 are taken and the page carries a waiting-list notice, and a page titled \"Photovoltaik-Förderung\" would promise roof funding the Verbandsgemeinde does not pay -- either reason alone would rule the page out. None of the 17 keys is in ATLAS_CITIES (the only Bad Kreuznach municipality there is Lauschied, 07133057, which is not a member), so fundingFor never reaches this entry and nothing falls to 404. Reachable through the postcode lookup, the balcony calculator and the balcony funding overview, for all 17. Revisit in March 2027: the contingent has been renewed every year since 2024, so a new round is expected rather than merely possible, and the programme page is the one the page watcher already follows.",
  "badbergen-klimafonds": "OFFEN (bis 03/2027). Status unsicher: the guideline renews itself every 1 January, but the Samtgemeinde page names budget funds for Badbergen only for 2025 (read 24 September 2026), so the programme does not count and a page titled Photovoltaik-Förderung would promise money nobody has confirmed. Badbergen is not in ATLAS_CITIES, so fundingFor never reaches it. Reachable through the postcode lookup. Revisit once the page names 2026 or 2027 funds.",
  "vg-ruedesheim-balkonkraftwerke": "OFFEN (bis 03/2027). Closed balcony-only Verbandsgemeinde programme (100 EUR per device, 120,000 EUR in total, ended March 2026): a page titled Photovoltaik-Förderung would promise funding that has ended and never covered roofs. None of the 32 keys is in ATLAS_CITIES, so fundingFor never reaches it. Reachable through the postcode lookup and the balcony funding overview. Revisit if the Verbandsgemeinde opens a new round.",
  "bad-kreuznach-balkonkraftwerke": "OFFEN (bis 03/2027). Balcony-only programme of the town of Bad Kreuznach (250 EUR flat, applications until 31 March 2027 per the town): a page titled Photovoltaik-Förderung would promise roof funding the town does not pay. Bad Kreuznach is not in ATLAS_CITIES, so fundingFor never reaches it. Reachable through the postcode lookup, the balcony calculator and the balcony funding overview. Revisit when the programme ends or a balcony page family exists.",
  "havelland-stecker-solar": "OFFEN (bis 06/2027). Three reasons, any one of which would do: the county states on its own page that no applications are possible for 2026 (read 20 September 2026), the programme funds balcony systems only, and ATLAS_CITIES holds no municipality of this county at all, so fundingFor never reaches it. NOT because county pages are withheld - that release switch governs atlas place pages, not funding pages. Reachable through the postcode lookup and the balcony funding overview. Revisit when the county opens the 2027 round.",
};

/**
 * 30 Sekunden statt der voreingestellten fünf.
 *
 * Diese Prüfungen lesen den halben Bestand ein — den Förderkatalog, das
 * Ortsverzeichnis, jede Datei des Repos. Auf einer ruhigen Maschine kosten sie
 * Sekundenbruchteile; auf einer belegten reißen sie das Vorgabelimit, und zwar
 * ohne dass irgendetwas am Code falsch wäre. Genau dafür gibt es im Projekt
 * schon das Vorbild in `energy-api.test.ts` („generous headroom so CPU load
 * can't trip the 5s default").
 *
 * Das Limit misst NICHTS Fachliches — es schützt vor einem hängenden Test.
 * Es anzuheben schwächt die Prüfung also nicht; ein Fehlschlag daran kostet
 * dagegen eine Stunde Suche nach einer Ursache, die es nicht gibt.
 */
const REPO_WEIT_MS = 30_000;

describe("Förderkatalog und Stadtseiten bleiben synchron", () => {
  const regional = allFundingPrograms().filter((p) => p.level !== "bund");

  it("jedes regionale Programm hat eine Stadtseite — oder einen ausgeschriebenen Grund", () => {
    const ohne = regional
      .filter((p) => !ATLAS_CITIES.some((c) => fundingFor(c)?.id === p.id))
      .map((p) => p.id);
    const unerklaert = ohne.filter((id) => !OHNE_SEITE[id]);
    expect(unerklaert, `ohne Seite und ohne Begründung: ${unerklaert.join(", ")}`).toEqual([]);
  });

  it("die Ausnahmeliste enthält nichts, was längst eine Seite hat", () => {
    // Sonst bleibt eine Begründung stehen, die niemand mehr prüft.
    const veraltet = Object.keys(OHNE_SEITE).filter((id) =>
      ATLAS_CITIES.some((c) => fundingFor(c)?.id === id),
    );
    expect(veraltet, `Ausnahme überflüssig: ${veraltet.join(", ")}`).toEqual([]);
  });

  it("jede Ausnahme nennt eine Frist", () => {
    for (const [id, grund] of Object.entries(OHNE_SEITE)) {
      expect(grund, id).toMatch(/OFFEN \(bis \d{2}\/\d{4}\)/);
    }
  });

  // Der Kern der Umstellung vom 19.08.2026: Ein Programm einer kreisangehörigen
  // Gemeinde bekommt seine Seite über den ACHTSTELLIGEN Schlüssel. Trüge der
  // Eintrag den fünfstelligen des Landkreises, stünde dessen Anlagenbestand
  // unter dem Ortsnamen — die Seite sähe dabei völlig normal aus.
  it("ein Gemeinde-Programm hängt an einem Eintrag mit Gemeindeschlüssel", () => {
    const falsch = regional
      .filter((p) => p.agsCode && p.agsCode.length === 8)
      .map((p) => ({ p, c: ATLAS_CITIES.find((c) => fundingFor(c)?.id === p.id) }))
      .filter(({ c }) => c && c.ags.length !== 8)
      .map(({ p, c }) => `${p.id} → ${c!.slug} (ags ${c!.ags})`);
    expect(falsch, `Kreisschlüssel unter Ortsnamen: ${falsch.join(", ")}`).toEqual([]);
  });

  // Jeder Eintrag mit Gemeindeschlüssel nennt seinen Landkreis: Mühlhausen und
  // Senden gibt es mehrfach in Deutschland, und ohne den Kreis daneben liest
  // man den Bestand des einen als den des anderen.
  it("jede kreisangehörige Gemeinde nennt ihren Landkreis", () => {
    const ohneKreis = ATLAS_CITIES.filter((c) => c.ags.length === 8 && !c.kreis).map((c) => c.slug);
    expect(ohneKreis, `ohne Landkreis: ${ohneKreis.join(", ")}`).toEqual([]);
  });

  it("keine Stadt zeigt auf ein Programm, das es nicht gibt", () => {
    const kaputt = ATLAS_CITIES.filter((c) => c.fundingId && !fundingFor(c)).map((c) => c.slug);
    expect(kaputt, `verwaiste Verknüpfung: ${kaputt.join(", ")}`).toEqual([]);
  });

  it("veröffentlicht wird nur, wo es auch ein Programm gibt", () => {
    for (const c of publishedCities()) expect(fundingFor(c), c.slug).toBeDefined();
  });
}, REPO_WEIT_MS);

// Aus der Prüfrunde am 18.08.2026 — beide Fälle waren latent, kein Test hätte
// angeschlagen, und beide hätten Geld bewegt bzw. eine indexierte Seite entfernt.
describe("Zuordnung über den Gemeindeschlüssel", () => {
  const stadt = (ags: string) =>
    ({ slug: "test", name: "Test", ags, bundesland: "Rheinland-Pfalz", yieldKwhKwp: 1000 }) as any;

  it("ein Gemeinde-Programm gilt NICHT für den ganzen Landkreis", () => {
    // Höhr-Grenzhausen (07143032) liegt im Westerwaldkreis (07143). Die frühere
    // Fassung kürzte auf fünf Stellen und hätte den Zuschuss jeder Postleitzahl
    // des Kreises zugerechnet.
    expect(fundingFor(stadt("07143"))).toBeUndefined();
  });

  it("der spezifischere Schlüssel gewinnt, statt dass sich zwei aufheben", () => {
    const land = { id: "land", level: "land", agsCode: "04", status: "aktiv" } as any;
    const kommune = { id: "kommune", level: "kommune", agsCode: "04011", status: "aktiv" } as any;
    expect(fundingForFrom([land, kommune], stadt("04011"))?.id).toBe("kommune");
    // Ohne eigenes Programm bleibt es beim Landesprogramm — so kam Bremerhaven
    // überhaupt erst zu seiner Seite.
    expect(fundingForFrom([land, kommune], stadt("04012"))?.id).toBe("land");
  });

  it("echte Mehrdeutigkeit bleibt ungelöst, statt geraten zu werden", () => {
    const a = { id: "a", level: "kommune", agsCode: "06412", status: "aktiv" } as any;
    const b = { id: "b", level: "kommune", agsCode: "06412", status: "aktiv" } as any;
    expect(fundingForFrom([a, b], stadt("06412"))).toBeUndefined();
  });
});

// ─── Gebaut heißt nicht freigegeben ──────────────────────────────────────────
//
// Die 60 Gemeindeseiten sind fertig, dürfen aber noch nicht in den Index: Für
// denselben Ort darf nie gleichzeitig eine frische Förder- und eine frische
// Atlas-Ortsseite erscheinen — Google braucht Wochen für die Zuordnung, und ein
// falsch zugeordneter Ort ist teuer zu korrigieren. Die Reihenfolge kommt aus
// dem Releaseplan.
/**
 * Kreisangehörige Städte, die schon vor der Welle im Index standen.
 *
 * Aachen, Hannover und Saarbrücken sind rechtlich kreisangehörig (StädteRegion,
 * Region, Regionalverband) und tragen seit dem 19.08.2026 deshalb ebenfalls
 * einen achtstelligen Schlüssel — vorher stand dort der der übergeordneten
 * Region, und die Seiten zeigten deren Bestand unter dem Stadtnamen. Sie sind
 * damit zwar kreisangehörig, gehören aber nicht zur neuen Welle: Ihre Seiten
 * gibt es seit Juni.
 */
const SCHON_IM_INDEX = [
  "aachen",
  "hannover",
  "saarbruecken",
  // Nidda kam am 26.08.2026 dazu, und zwar über den Releaseplan
  // (Schub „w4-nidda-rueckmeldung", status live) — also genau auf dem Weg, den
  // dieser Test verlangt, nicht an ihm vorbei.
  //
  // Der Grund ist bewusst KEIN Suchvolumen: Die Klimaschutz-Beauftragte der
  // Stadt hat uns ihr Förderprogramm selbst geschickt, und für den
  // Kommunen-Outreach ist der Satz „Ihr Programm steht in unserem Rechner" mit
  // Seite ein Link und ohne Seite eine Behauptung. Die volle Begründung samt
  // Messung steht am Schub.
  //
  // Damit ist die Welle NICHT eröffnet: Die übrigen kreisangehörigen Orte
  // bleiben gesperrt, und w1 bleibt zurückgenommen. Wer hier einen weiteren
  // Slug einträgt, braucht einen eigenen Schub mit eigenem Nachweis.
  "nidda",
];

describe("Index-Freigabe", () => {
  it("gibt genau die Orte frei, deren Programm aktiv ist und Dach-PV fördert", () => {
    // ENTSCHEIDUNG DES BETREIBERS, 01.09.2026: Eine Förderseite geht live,
    // sobald ihr Programm die Schwelle besteht — sie braucht keinen eigenen
    // Schub mehr (lib/atlas-cities.ts → foerderseiteTraegt). Der Test hält
    // seitdem nicht mehr eine Liste fest, sondern die REGEL: Was aktiv ist und
    // Dach-PV fördert, ist freigegeben; alles andere nicht.
    //
    // Das ist keine Aufweichung, sondern die schärfere Prüfung: Eine feste Zahl
    // hätte den Fall nicht gefangen, dass ein Programm auf „ausgeschöpft"
    // wechselt und seine Seite trotzdem stehen bleibt.
    const sollte = ATLAS_CITIES.filter((c) => {
      const p = fundingFor(c);
      return !!p && p.status === "aktiv" && (p.foerdert ?? ["pv"]).includes("pv");
    });
    const ist = ATLAS_CITIES.filter((c) => cityIndexFreigegeben(c));

    // Der Altbestand aus dem Releaseplan darf zusätzlich freigegeben sein — er
    // stand vor dieser Regel live und wird nicht rückwirkend eingezogen.
    const zuviel = ist
      .filter((c) => !sollte.includes(c))
      .filter((c) => !SCHON_IM_INDEX.includes(c.slug) && !istAlt(c.ags))
      .filter((c) => {
        const p = fundingFor(c);
        return !p || p.status === "aktiv";
      })
      .map((c) => c.slug);
    const zuwenig = sollte.filter((c) => !ist.includes(c)).map((c) => c.slug);

    expect(zuwenig, `Programm aktiv und Dach-PV, aber keine Seite: ${zuwenig.join(", ")}`).toEqual([]);
    expect(zuviel, `freigegeben ohne aktives Dach-PV-Programm: ${zuviel.join(", ")}`).toEqual([]);
  });

  it("gibt keine Seite frei, deren Topf leer ist", () => {
    // Eine Förderseite ohne abrufbares Geld beantwortet die Frage nicht, für die
    // jemand kommt. Betrifft Göttingen, Weyhe und Feucht.
    const leer = ATLAS_CITIES.filter((c) => {
      const p = fundingFor(c);
      return !!p && p.status === "ausgeschoepft" && !SCHON_IM_INDEX.includes(c.slug) && !istAlt(c.ags);
    }).filter((c) => cityIndexFreigegeben(c));
    expect(leer.map((c) => c.slug), "ausgeschöpftes Programm, trotzdem freigegeben").toEqual([]);
  });

  it("gibt keine Seite frei, die nur Balkonkraftwerke fördert", () => {
    // Der Seitentitel verspricht Photovoltaik-Förderung. 35 Orte fördern nur
    // Steckersolar — die brauchen eine eigene Seitenfamilie, keine falsche
    // Überschrift.
    const nurBalkon = ATLAS_CITIES.filter((c) => {
      const p = fundingFor(c);
      const f = p?.foerdert ?? ["pv"];
      return !!p && !f.includes("pv") && !SCHON_IM_INDEX.includes(c.slug) && !istAlt(c.ags);
    }).filter((c) => cityIndexFreigegeben(c));
    expect(nurBalkon.map((c) => c.slug), "nur Balkon-Förderung, trotzdem als PV-Seite freigegeben").toEqual([]);
  });

  it("die Seiten, die es längst gibt, bleiben freigegeben — und zwar dieselben", () => {
    // Gegenrichtung: Die Sperre darf nicht auf die Seiten übergreifen, die seit
    // Juni im Index stehen.
    //
    // Geprüft wird die IDENTITÄT, nicht nur die Anzahl. Der Test darüber hält
    // 37 fest; das allein überlebt einen Tausch (eine Seite fällt raus, eine
    // andere kommt rein) unbemerkt. Genau das stand am 19.08.2026 bevor: Die
    // Schlüsselkorrektur von Hannover (03241 = Region, 1,14 Mio. Einwohner →
    // 03241001 = Stadt) hätte der Stadt still die Freigabe genommen.
    //
    // Gemessen wird an den Städten, die ihr Programmstatus überhaupt
    // veröffentlichbar macht — NICHT am ganzen Verzeichnis: Die rund 70
    // programmlosen Städte (Nürnberg, Leipzig, Hamburg …) hatten nie eine Seite
    // und liefern seit Juni 404. Für sie eine Freigabe zu verlangen hieße, sie
    // für Seiten zu fordern, die es nicht gibt.
    const SEIT_JUNI_IM_INDEX = [
      "baden-baden", "berlin", "bonn", "bottrop", "bremen", "bremerhaven", "darmstadt",
      "dortmund", "duesseldorf", "essen", "frankfurt", "freiburg", "hannover", "heidelberg",
      "herne", "karlsruhe", "koeln", "krefeld", "kreis-bergstrasse", "kreis-viersen",
      "ludwigshafen", "mainz", "mannheim", "mayen-koblenz", "memmingen", "muenchen",
      "muenster", "osnabrueck", "potsdam", "regensburg", "rhein-erft-kreis", "schweinfurt",
      "schwerin", "stuttgart", "wiesbaden", "wolfsburg", "wuerzburg",
      // Nachträglich freigeschaltet, nicht seit Juni dabei: Nidda (26.08.2026,
      // Schub „w4-nidda-rueckmeldung"). Steht hier, weil dieser Test die
      // IDENTITÄT der freigegebenen Seiten hält — eine bewusste Freischaltung
      // muss sichtbar dazukommen, sonst könnte ein stiller Tausch sie ersetzen.
      "nidda",
    ];
    // GEPRÜFT WIRD DIE TEILMENGE, NICHT DIE GLEICHHEIT (05.09.2026).
    //
    // Bis hierher stand hier toEqual — der Test war damit zugleich eine
    // WACHSTUMSSPERRE. Das war bis zum 01.09.2026 richtig: Damals entschied der
    // Releaseplan über jede Freischaltung, eine neue Seite ohne Schub wäre eine
    // Nebenwirkung gewesen. Seitdem hat der Betreiber entschieden, dass eine
    // Förderseite live geht, sobald ihr Programm aktiv ist und Dach-PV fördert.
    // Der Test wurde bei dieser Umstellung nicht nachgezogen — und blieb grün,
    // weil isCityPublished sie ebenfalls nicht mitbekam. Zwei überholte
    // Annahmen, die einander bestätigten, während 21 Adressen in der Sitemap
    // standen und mit HTTP 404 antworteten.
    //
    // Was der Test WEITERHIN leistet und leisten soll: Keine der Seiten, die
    // seit Juni im Index stehen, darf ihre Freigabe still verlieren — genau der
    // Fall, den die Hannover-Schlüsselkorrektur ausgelöst hätte. Das ist eine
    // Teilmengen-Frage, keine Gleichheits-Frage.
    const freigegeben = new Set(indexedCities().map((c) => c.slug));
    const verloren = SEIT_JUNI_IM_INDEX.filter((s) => !freigegeben.has(s));
    expect(verloren, "seit Juni im Index und jetzt nicht mehr freigegeben").toEqual([]);

    // Und die Gegenrichtung, damit aus der Lockerung keine offene Tür wird: Was
    // NEU dazukommt, kommt über den zweiten, benannten Weg — nicht über einen
    // dritten, den niemand angemeldet hat.
    const altbestand = new Set(SEIT_JUNI_IM_INDEX);
    const ohneGrund = indexedCities()
      .filter((c) => !altbestand.has(c.slug) && !foerderseiteTraegt(c))
      .map((c) => c.slug);
    expect(ohneGrund, "neu im Index, ohne dass das Programm die Schwelle trägt").toEqual([]);
  });

  it("was nicht in den Index darf, steht auch nicht in der Sitemap", () => {
    // Sitemap und robots-Angabe hängen beide an cityIndexFreigegeben. Der Test
    // hält fest, dass niemand die eine Stelle ändert und die andere vergisst:
    // Eine Seite per Sitemap anzubieten und per robots zu verweigern wäre ein
    // Widerspruch, den von außen niemand sieht.
    //
    // Seit dem 19.08.2026 antwortet dort der Releaseplan statt eines Feldes je
    // Stadt (siehe cityIndexFreigegeben). Geprüft wird deshalb gegen den Plan.
    const widerspruch = indexedCities().filter((c) => !cityIndexFreigegeben(c)).map((c) => c.slug);
    expect(widerspruch, `in der Sitemap trotz Sperre: ${widerspruch.join(", ")}`).toEqual([]);
  });

  it("die Sperre in der Sitemap ist tragend, nicht dekorativ", () => {
    // Der Test darüber wäre für sich allein wertlos: Beide Seiten der Gleichung
    // fragen inzwischen denselben Plan, er kann also gar nicht mehr rot werden.
    // Erst zusammen mit dieser Prüfung sagt er etwas aus — nämlich dass es
    // überhaupt Städte GIBT, die der Filter entfernt.
    //
    // app/sitemap.ts baut seine Liste aus liveCities()/archivedCities(), und die
    // fragen nur den Programmstatus. Fiele der Filter dort weg, stünden diese
    // Städte am nächsten Tag in der Sitemap. Wird die Zahl hier 0, ist der
    // Filter tot und eine Regression unsichtbar.
    const vomFilterEntfernt = [...liveCities(), ...archivedCities()].filter((c) => !cityIndexFreigegeben(c));
    expect(vomFilterEntfernt.length).toBeGreaterThan(0);
  });
});
