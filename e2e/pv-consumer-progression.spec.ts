import { test, expect } from '@playwright/test';
import { akkordeonWaehlen, akkordeonOeffnen, waehle, weiterKlicken } from './flows';

test('flat roof and planned consumers reach a recommendation without technical questions', async ({page}) => {
  await page.setViewportSize({width:708,height:900});
  await page.goto('/photovoltaik-rechner');
  const houses=page.locator('.wp-house-options img');
  for(const src of await houses.evaluateAll(images=>images.map(image=>image.getAttribute('src')))) expect(src).toContain('/pv-house-neon/');
  expect(await houses.nth(2).getAttribute('src')).not.toBe(await houses.nth(3).getAttribute('src'));
  await page.screenshot({path:'/tmp/pv-simple-house.png',animations:'disabled'});
  await akkordeonWaehlen(page,'Haustyp',0);
  await page.screenshot({path:'/tmp/pv-simple-roofs.png',animations:'disabled'});
  await akkordeonWaehlen(page,'Dachform',1);
  await expect(page.locator('[data-flow-akkordeon="Dachform"]')).toContainText('Aufständerung empfohlen');
  await expect(page).toHaveURL(/az=sued/);
  await expect(page.locator('[data-flow-next]')).not.toHaveAttribute('aria-disabled','true');
  await page.screenshot({path:'/tmp/pv-simple-flat.png',animations:'disabled'});
  await weiterKlicken(page);
  await waehle(page,'3–4 Personen');
  await expect(page.locator('[data-flow-akkordeon-offen="Nutzungsprofil"]')).toBeVisible();
  await weiterKlicken(page);
  await akkordeonWaehlen(page,'Wärmepumpe',1);
  await expect(page.locator('[data-flow-akkordeon-offen="Elektroauto"]')).toBeVisible();
  await akkordeonWaehlen(page,'Elektroauto',1);
  await expect(page.locator('[data-flow-akkordeon-offen="Klimaanlage"]')).toBeVisible();
  await akkordeonWaehlen(page,'Klimaanlage',0);
  await page.screenshot({path:'/tmp/pv-simple-consumers.png',animations:'disabled'});
  await page.locator('[data-flow-next]').click();
  await expect(page).toHaveURL(/flow=emp/,{timeout:60000});
  await expect(page).toHaveURL(/wht=2/);
  await expect(page).toHaveURL(/km=15000/);
});

test('roof and consumer assumptions can be edited and survive navigation', async ({page}) => {
  await page.setViewportSize({width:375,height:850});
  await page.goto('/photovoltaik-rechner');
  await page.getByRole('button',{name:'Ich kenne meine Dachfläche',exact:true}).click();
  const area=page.getByLabel('Nutzbare Dachfläche',{exact:true});
  await area.fill('60'); await area.press('Enter');
  await akkordeonWaehlen(page,'Dachform',1);
  await akkordeonOeffnen(page,'Dachform');
  await page.getByText('Dachfläche und Neigung anpassen',{exact:true}).click();
  await page.getByRole('button',{name:'Flach aufgelegt Module liegen auf dem Dach',exact:true}).click();
  await expect(page).toHaveURL(/ng=0/);
  await expect(page).toHaveURL(/flaeche=60/);
  await akkordeonOeffnen(page,'Ausrichtung');
  await akkordeonWaehlen(page,'Ausrichtung',2);
  await weiterKlicken(page);
  await waehle(page,'1 Person');
  await akkordeonOeffnen(page,'Nutzungsprofil');
  await waehle(page,'Homeoffice');
  await weiterKlicken(page);
  await akkordeonWaehlen(page,'Wärmepumpe',1);
  await akkordeonOeffnen(page,'Wärmepumpe');
  await page.getByText('Gebäudeangaben anpassen',{exact:true}).click();
  await akkordeonOeffnen(page,'Wohnfläche');
  await akkordeonWaehlen(page,'Wohnfläche',2);
  await expect(page).toHaveURL(/wf=/);
  await page.screenshot({path:'/tmp/pv-simple-wp-edit.png',animations:'disabled'});
  await akkordeonOeffnen(page,'Elektroauto');
  await akkordeonWaehlen(page,'Elektroauto',1);
  await akkordeonOeffnen(page,'Elektroauto');
  await page.getByRole('button',{name:'15.000 km bearbeiten',exact:true}).click();
  const km=page.locator('[data-flow-akkordeon-offen="Elektroauto"] input');
  await km.fill('20000'); await km.press('Enter');
  await akkordeonOeffnen(page,'Klimaanlage');
  await akkordeonWaehlen(page,'Klimaanlage',0);
  await expect(page).toHaveURL(/km=20000/);
  await page.getByRole('button',{name:'Zurück',exact:true}).click();
  await expect(page.locator('[data-flow-akkordeon="Nutzungsprofil"]')).toContainText('Homeoffice');
  await page.locator('[data-flow-next]').click();
  await expect(page.getByRole('heading',{name:'Verbraucher',exact:true})).toBeVisible();
  await expect(page.locator('[data-flow-akkordeon="Elektroauto"]')).toContainText('20.000 km/Jahr');
  await page.screenshot({path:'/tmp/pv-simple-mobile.png',animations:'disabled'});
  await expect(page.getByRole('link',{name:'Direkt eingeben',exact:true})).toBeVisible();
  expect(await page.evaluate(()=>document.documentElement.scrollWidth <= innerWidth)).toBeTruthy();
});

test('visible questions and future steps open freely without bypassing required answers', async ({page}) => {
  await page.goto('/photovoltaik-rechner');
  for (const name of ['Dachform', 'Ausrichtung', 'Haustyp']) {
    await page.getByRole('button', {name, exact:true}).click();
    await expect(page.locator('[data-flow-akkordeon-offen]')).toHaveCount(1);
    await expect(page.locator(`[data-flow-akkordeon-offen="${name}"]`)).toBeVisible();
  }
  await page.getByRole('button',{name:'Zu Schritt 2: Haushalt',exact:true}).click();
  await page.getByRole('button',{name:'Nutzungsprofil',exact:true}).click();
  await waehle(page,'Homeoffice');
  await page.getByRole('button',{name:'Zu Schritt 3: Verbraucher',exact:true}).click();
  await expect(page.locator('.sc-fs li[data-zustand="fertig"]')).toHaveCount(0);
  for (const name of ['Klimaanlage','Elektroauto','Wärmepumpe']) {
    await page.getByRole('button',{name,exact:true}).click();
    await page.locator(`[data-flow-akkordeon-offen="${name}"]`).getByRole('button',{name:'Nein',exact:true}).click();
  }
  await expect(page.locator('[data-flow-next]')).toHaveAttribute('aria-disabled','true');
  await page.getByRole('button',{name:'Zurück zu Schritt 2: Haushalt',exact:true}).click();
  await expect(page.locator('[data-flow-akkordeon="Nutzungsprofil"]')).toContainText('Homeoffice');
});
