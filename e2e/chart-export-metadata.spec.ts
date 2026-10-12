import {test, expect} from '@playwright/test';

// Cover both legacy node exports and the shared frame through actual PNG downloads.
for (const item of [
  {path:'/embed/anlagenbestand-deutschland', text:/Deutschland · Stand .+ · Anzahl Anlagen/, name:'anlagenbestand'},
  {path:'/embed/gruengas-heizkosten', text:/Muster-Einfamilienhaus · .+ · Stand .+ · in €/, name:'gruengas'},
]) {
  test(`${item.name}: data vintage and descriptive quantity survive export`, async ({page}, testInfo) => {
    await page.goto(item.path);
    const metadata=page.locator('[data-sc-chart-metadata]').first();
    await expect(metadata).toHaveText(item.text);
    await expect(metadata).toBeHidden();
    const downloadPromise=page.waitForEvent('download');
    await page.getByRole('button',{name:'Als Bild herunterladen',exact:true}).click();
    const download=await downloadPromise;
    await download.saveAs(testInfo.outputPath(`${item.name}.png`));
    expect(await download.failure()).toBeNull();
  });
}

test('shared ranking frame: descriptive count and date in the downloaded image', async ({page}, testInfo) => {
  await page.goto('/embed/galerie/gemeinde-ranking?ags=06440016&onsite=1');
  const subtitle=page.locator('.sc-widget-subtitle[data-sc-export-only]');
  await expect(subtitle).toHaveText(/Wetteraukreis · Stand .+ · Anzahl Anlagen/);
  await expect(subtitle).toBeHidden();
  await page.getByRole('button',{name:/Optionen für/}).click();
  await page.getByText('Download',{exact:true}).click();
  const downloadPromise=page.waitForEvent('download');
  await page.getByRole('button',{name:'PNG herunterladen',exact:true}).click();
  const download=await downloadPromise;
  await download.saveAs(testInfo.outputPath('ranking.png'));
  expect(await download.failure()).toBeNull();
});

test('country race: selected measure is exported as text without a dropdown', async ({page}) => {
  await page.goto('/embed/laender-strommix-pro-kopf?onsite=1&autoplay=off');
  const subtitle=page.locator('.sc-widget-subtitle[data-sc-export-only]');
  await expect(subtitle).toContainText('in kWh je Einwohner');
  await expect(subtitle.locator('select')).toHaveCount(0);
  await page.getByLabel('Darstellung',{exact:true}).selectOption('share');
  await expect(subtitle).toContainText('in %');
  await expect(subtitle).toContainText('Anteil an der Stromerzeugung');
  await expect(subtitle).not.toContainText('kWh');
});
