import {expect, test} from '@playwright/test';

// A wide race previously kept grid-positioned children inside a flex host.
// Its outer card still fit the dashboard, concealing a collapsed plot and
// playback controls overlapping the next row. Check the inner rectangles too.
for (const width of [390, 1440, 1920]) {
  test(`race content stays within its dashboard card at ${width}px`, async ({page}) => {
    await page.setViewportSize({width, height: 1000});
    await page.goto('/widget-galerie/layout-referenz');
    await page.getByRole('combobox', {name: 'Animationen', exact: true})
      .selectOption({label: 'Angehalten'});
    const races = page.locator('[data-chart-animation="race"]');
    await expect(races).toHaveCount(2);
    for (const race of await races.all()) {
      await expect.poll(() => race.evaluate(root => {
        const card = root.closest('.sc-widget')!.getBoundingClientRect();
        const plot = root.querySelector('[data-race-plot]')!.getBoundingClientRect();
        const slider = root.querySelector('input[type="range"]')!;
        const player = slider.parentElement!.getBoundingClientRect();
        const panel = root.querySelector('.race-event-description')!
          .parentElement!.parentElement!.parentElement!.getBoundingClientRect();
        const wide = card.width >= 640;
        return {
          plotReadable: plot.height >= 180,
          playerContained: player.bottom <= card.bottom && player.right <= card.right,
          panelContained: panel.bottom <= card.bottom && panel.right <= card.right,
          arrangement: wide
            ? panel.left >= plot.right && Math.abs(panel.top - plot.top) < 2
            : panel.top >= plot.bottom,
        };
      })).toEqual({plotReadable: true, playerContained: true, panelContained: true, arrangement: true});
    }
  });
}
