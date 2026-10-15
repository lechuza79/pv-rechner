import {expect, test} from '@playwright/test';

// A wide race previously kept grid-positioned children inside a flex host.
// Its outer card still fit the dashboard, concealing a collapsed plot and
// playback controls overlapping the next row. Check the inner rectangles too.
for (const width of [390, 1440, 1920]) {
  test(`race content stays within its dashboard card at ${width}px`, async ({page}) => {
    await page.setViewportSize({width, height: 1000});
    await page.goto('/widget-galerie/layout-referenz');
    const races = page.locator('[data-chart-animation="race"]');
    await expect(races).toHaveCount(2);
    // The setting is a React-controlled select. Chosen before hydration, React
    // restores its server value ("Automatisch abspielen") and both races keep
    // playing, so the layout below would be measured mid-animation. Prove the
    // pause reached the races and choose again otherwise (see e2e/klick.ts).
    const animation = page.getByRole('combobox', {name: 'Animationen', exact: true});
    await expect(async () => {
      await animation.selectOption({label: 'Angehalten'}, {timeout: 3_000});
      await expect(animation).toHaveValue('off', {timeout: 1_000});
      await expect(races.getByRole('button', {name: 'Anhalten', exact: true})).toHaveCount(0, {timeout: 1_000});
    }).toPass({timeout: 20_000});
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
