const day = new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Berlin' });
const date = new Intl.DateTimeFormat('de-DE', { timeZone: 'Europe/Berlin', day: 'numeric', month: 'short', year: 'numeric' });
const time = new Intl.DateTimeFormat('de-DE', { timeZone: 'Europe/Berlin', hour: '2-digit', minute: '2-digit' });

/** Shared display for observation and retrieval timestamps; never substitute one for the other. */
export function formatLiveDataTime(iso: string, now: Date): string {
  const value = new Date(iso);
  if (!Number.isFinite(value.getTime())) return 'nicht verfügbar';
  return `${day.format(value) === day.format(now) ? 'heute' : date.format(value)}, ${time.format(value)} Uhr`;
}
export const LIVE_DATA_CHECK_MS = 15 * 60 * 1000;
