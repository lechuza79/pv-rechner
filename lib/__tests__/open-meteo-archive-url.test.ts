import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { openMeteoArchiveUrls, redactApiKey } from '../open-meteo-archive-url';

const params = {
  latitude: 54.788, longitude: 9.442, start_date: '2026-07-31', end_date: '2026-08-31',
  hourly: 'temperature_2m,shortwave_radiation', models: 'era5', timezone: 'UTC', wind_speed_unit: 'ms',
};

/** The request exactly as the preparation run built it before this change. */
function legacyHref() {
  const url = new URL('https://archive-api.open-meteo.com/v1/archive');
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, String(v));
  return url.href;
}

describe('Abo-Zugang zu Open-Meteo', () => {
  it('lässt den Zwischenspeicher ohne Abo exakt wie bisher', () => {
    // The 3,419 saved answers are keyed on this hash; a different address would
    // orphan all of them and send the next run back into the daily limit.
    const { publicUrl, fetchUrl, subscribed } = openMeteoArchiveUrls(params);
    expect(subscribed).toBe(false);
    expect(publicUrl.href).toBe(legacyHref());
    expect(fetchUrl.href).toBe(legacyHref());
  });

  it('holt mit Abo über die Kundenadresse, speichert aber die öffentliche Form', () => {
    const { publicUrl, fetchUrl, subscribed } = openMeteoArchiveUrls(params, 'geheim-123');
    expect(subscribed).toBe(true);
    expect(fetchUrl.host).toBe('customer-archive-api.open-meteo.com');
    expect(fetchUrl.searchParams.get('apikey')).toBe('geheim-123');
    // Same cache entry with and without subscription: same data, same key.
    const hash = (u: URL) => createHash('sha256').update(u.href).digest('hex');
    expect(hash(publicUrl)).toBe(hash(openMeteoArchiveUrls(params).publicUrl));
    expect(publicUrl.href).not.toContain('geheim-123');
  });

  it('behandelt einen leeren Schlüssel wie kein Abo', () => {
    // An empty variable is how a parent process "unsets" things here; a request
    // to the customer host with an empty key would fail every time.
    expect(openMeteoArchiveUrls(params, '').subscribed).toBe(false);
    expect(openMeteoArchiveUrls(params, '   ').subscribed).toBe(false);
  });

  it('schwärzt den Schlüssel in Fehlermeldungen', () => {
    const { fetchUrl } = openMeteoArchiveUrls(params, 'geheim-123');
    expect(redactApiKey(fetchUrl)).not.toContain('geheim-123');
    expect(redactApiKey(fetchUrl)).toContain('apikey=***');
  });

  it('schreibt im Vorbereitungslauf nur die öffentliche Adresse weg', () => {
    // Read the run itself: the saved source must be built from the public form,
    // and the request with the key must only ever reach fetch().
    const run = readFileSync('scripts/story-prepare.ts', 'utf8');
    expect(run).toMatch(/sourceUrl:url\.href/);
    expect(run).toMatch(/publicUrl:url/);
    expect(run).not.toMatch(/sourceUrl:fetchUrl/);
    expect(run).not.toMatch(/atomic\([^)]*fetchUrl/);
  });
});
