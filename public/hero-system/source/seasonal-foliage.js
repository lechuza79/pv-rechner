// A visual calendar for German scenes, not observed local phenology.
// Keep this independent of rendering so both stage generations share it.
const clamp = value => Math.max(0, Math.min(1, value));
export function smoothstep(start, end, value) {
  const t = clamp((value - start) / (end - start));
  return t * t * (3 - 2 * t);
}
const calendar = new Intl.DateTimeFormat('en-GB', {
  timeZone: 'Europe/Berlin', month: 'numeric', day: 'numeric',
  hour: 'numeric', minute: 'numeric', hourCycle: 'h23',
});
export function seasonalFoliage(date) {
  const parts = Object.fromEntries(calendar.formatToParts(date).map(p => [p.type, Number(p.value)]));
  const {month, day, hour, minute} = parts;
  if (month < 3) return {color: 1, loss: 1};
  // Use a fixed leap year only to measure calendar intervals, without DST jumps.
  const days = (Date.UTC(2000, month - 1, day, hour, minute) - Date.UTC(2000, 8, 15)) / 86400000;
  return {color: smoothstep(0, 61, days), loss: smoothstep(16, 77, days)};
}
export function foliageState(state) {
  return state.foliage ?? (state.season === 'winter' ? {color: 1, loss: 1}
    : state.season === 'autumn' ? {color: .65, loss: .25} : {color: 0, loss: 0});
}
export function leafSeed(index) {
  const value = Math.sin((index + 1) * 127.1) * 43758.5453;
  return value - Math.floor(value);
}
