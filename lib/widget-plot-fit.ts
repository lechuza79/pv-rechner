/** Refit DOM-based plots after their surrounding labels change, including export clones. */
export function fitPodiumPlot(podium: HTMLElement) {
  const labels = [...podium.querySelectorAll<HTMLElement>('[data-podium-label]')];
  const labelHeight = Math.max(0, ...labels.map(label => label.getBoundingClientRect().height));
  const padding = getComputedStyle(podium);
  const rank = podium.querySelector<HTMLElement>('[data-podium-rank]');
  const rankHeight = rank ? rank.getBoundingClientRect().height + parseFloat(getComputedStyle(rank).marginTop) : 0;
  const available = podium.clientHeight - parseFloat(padding.paddingTop) - parseFloat(padding.paddingBottom) - labelHeight - 12 - rankHeight;
  podium.closest<HTMLElement>('[data-podium-visual]')?.style.setProperty('--ranking-plot-height', `${Math.max(0, Math.floor(available))}px`);
}
