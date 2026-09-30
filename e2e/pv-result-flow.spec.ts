import { DEFAULT_PRICES } from "../lib/prices-config";
import { DEFAULT_FEED_IN } from "../lib/feedin-config";
import { FUNDING_PROGRAMS } from "../lib/funding-programs";
import {test,expect} from "@playwright/test";
test.beforeEach(async ({page})=>{
  await page.route("**/api/prices",route=>route.fulfill({json:DEFAULT_PRICES}));
  await page.route("**/api/feedin",route=>route.fulfill({json:DEFAULT_FEED_IN}));
  await page.emulateMedia({reducedMotion:"reduce"});
});
const result="/photovoltaik-rechner?a=1&s=1&p=2&n=1&ht=2&da=0&az=sued";
for(const width of [375,1280]) test(`PV draft editing, sharing and layout at ${width}`,async({page})=>{
  await page.setViewportSize({width,height:900});
  await page.addInitScript(()=>{Object.defineProperty(navigator,"clipboard",{value:{writeText:async(text:string)=>{document.documentElement.dataset.copiedLink=text;}}});});
  await page.goto(`${result}&flow=emp`);
  const hero=page.locator(".wp-result-hero");
  await expect(hero).toContainText("Einsparungen über 25 Jahre");
  const recommendation = hero.locator(".pv-result-recommendation");
  await expect(recommendation).toContainText("Unsere Empfehlung für deinen Haushalt");
  await expect(recommendation).toContainText("8 kWp");
  expect((await recommendation.boundingBox())!.y).toBeLessThan((await hero.locator(".wp-profit-comparison").boundingBox())!.y);

  const specs = recommendation.locator(".pv-result-plant-specs > span");
  const firstSpec = (await specs.nth(0).boundingBox())!;
  const secondSpec = (await specs.nth(1).boundingBox())!;
  expect(secondSpec.y > firstSpec.y || secondSpec.x >= firstSpec.x + firstSpec.width + 16).toBe(true);
  const introBox = (await recommendation.boundingBox())!;
  expect((await hero.locator(".wp-overview-head").boundingBox())!.y).toBeGreaterThanOrEqual(introBox.y + introBox.height);
  await hero.screenshot({path:`/tmp/pv-recommendation-${width}.png`});
  const opener=page.getByRole("button",{name:/Deine Anlage & Rechengrundlagen/});
  const before=await hero.locator(".wp-result-summary").textContent();
  await opener.click();
  const dialog=page.getByRole("dialog",{name:"Deine Anlage & Rechengrundlagen"});
  await expect(dialog.getByRole("button",{name:/^Ergebnis neu berechnen/})).toBeDisabled();
  await dialog.getByRole("button",{name:"8 kWp bearbeiten",exact:true}).click();
  await dialog.locator("input").fill("12,5");
  await dialog.locator("input").press("Enter");
  await dialog.getByRole("button",{name:"Abbrechen"}).click();
  await expect(hero.locator(".wp-result-summary")).toHaveText(before!);
  await opener.click();
  await dialog.getByRole("button",{name:"8 kWp bearbeiten",exact:true}).click();
  await dialog.locator("input").fill("12,5");
  await dialog.locator("input").press("Enter");
  await dialog.getByRole("button",{name:/^Ergebnis neu berechnen/}).click();
  await expect(opener).toContainText("12,5 kWp");
  await expect(recommendation).toContainText("Deine angepasste Anlage");
  await expect(recommendation).toContainText("12,5 kWp");
  await page.getByRole("button",{name:"Link zu diesem Ergebnis kopieren"}).click();
  const link=await page.locator("html").getAttribute("data-copied-link");
  expect(link).toContain("ck=12.5");
  await page.goto(link!);
  await expect(opener).toContainText("12,5 kWp");
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
  await page.getByRole("slider",{name:"Tag wählen"}).press("End");
  await page.screenshot({path:`/tmp/pv-result-${width}.png`,fullPage:true});
});

test("funding preview is applied explicitly and retains the selected place",async({page})=>{
  const program={...FUNDING_PROGRAMS["duesseldorf-klimafreundlich"],id:"pv-test-program",name:"PV-Testförderung",status:"aktiv",conditions:[],lastVerified:new Date().toISOString().slice(0,10),pageSeenAt:new Date().toISOString()};
  await page.route("**/api/suche?*",route=>route.fulfill({json:{orte:[{ags:"05111000",name:"Düsseldorf",kontext:"Nordrhein-Westfalen",links:[{href:"/photovoltaik-rechner?plz=40210"}]}]}}));
  await page.route("**/api/funding?*",route=>route.fulfill({json:{candidates:[{ags:"05111000",ort:"Düsseldorf",programs:[program]}]}}));
  await page.route("**/api/pvgis?*",route=>route.fulfill({json:{annual:1050,source:"Test-Standort"}}));
  await page.goto(result);
  const amount=page.locator(".wp-result-count-space");
  await expect(amount).not.toHaveText("0");
  const before=await amount.textContent();
  await page.getByRole("button",{name:/Standort & Förderung/}).click();
  const field=page.getByLabel("Postleitzahl oder Ort",{exact:true});
  await field.fill("Düsseldorf");
  await page.getByRole("button",{name:/40210 Düsseldorf/}).click();
  await page.getByRole("button",{name:"Förderung prüfen",exact:true}).click();
  await expect(page.locator(".sc-result-funding")).toContainText("PV-Testförderung");
  await expect(amount).toHaveText(before!);
  await expect(field).toHaveValue("40210 Düsseldorf");
  await expect(page.getByRole("button",{name:"Förderung prüfen",exact:true})).toBeDisabled();
  await page.getByRole("button",{name:/^Ergebnis neu berechnen/,exact:true}).click();
  await expect(amount).not.toHaveText(before!);
  await expect(page.getByRole("button",{name:/Standort & Förderung/})).toContainText("Düsseldorf");
});

test("feed-in changes remain a draft until recalculation",async({page})=>{
  await page.goto(result);
  const amount=page.locator(".wp-result-count-space");
  const before=await amount.textContent();
  const opener=page.getByRole("button",{name:/Einspeisung und Vergütung/});
  await opener.click();
  const dialog=page.getByRole("dialog",{name:"Einspeisung und Vergütung"});
  await dialog.getByRole("button",{name:/Ab 2027/}).click();
  await expect(dialog).toContainText("Übergangszahlung");
  await expect(amount).toHaveText(before!);
  await dialog.getByRole("button",{name:"Abbrechen"}).click();
  await expect(opener).toContainText("heutige Konditionen");
  await opener.click();
  await dialog.getByRole("button",{name:/Ab 2027/}).click();
  await dialog.getByRole("button",{name:/^Ergebnis neu berechnen/}).click();
  await expect(opener).toContainText("Entwurf ab 2027");
  await expect(amount).not.toHaveText(before!);
});


test("failed funding lookup preserves the result and can be retried", async ({ page }) => {
  let available = false;
  await page.route("**/api/suche?*", route => route.fulfill({ json: { orte: [{ ags: "05111000", name: "Düsseldorf", kontext: "Nordrhein-Westfalen", links: [{ href: "/photovoltaik-rechner?plz=40210" }] }] } }));
  await page.route("**/api/funding?*", route => available
    ? route.fulfill({ json: { candidates: [{ ags: "05111000", ort: "Düsseldorf", programs: [] }] } })
    : route.fulfill({ status: 503, json: { error: "Unavailable" } }));
  await page.goto(result);
  const amount = page.locator(".wp-result-count-space");
  await expect(amount).not.toHaveText("0");
  const before = await amount.textContent();
  await page.getByRole("button", { name: /Standort & Förderung/ }).click();
  await page.getByLabel("Postleitzahl oder Ort", { exact: true }).fill("Düsseldorf");
  await page.getByRole("button", { name: /40210 Düsseldorf/ }).click();
  const check = page.getByRole("button", { name: "Förderung prüfen", exact: true });
  await check.click();
  await expect(page.locator("#pv-einstellungen").getByRole("alert")).toContainText("bisheriges Ergebnis bleibt erhalten");
  await expect(amount).toHaveText(before!);
  await expect(check).toBeEnabled();
  available = true;
  await check.click();
  await expect(page.locator("#pv-einstellungen").getByRole("alert")).toHaveCount(0);
  await expect(check).toBeDisabled();
  await expect(page.locator(".sc-result-funding")).toContainText("kein aktives");
  await expect(amount).toHaveText(before!);
});
