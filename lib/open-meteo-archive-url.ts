/**
 * Addresses for the hosted Open-Meteo history API, free and subscribed.
 *
 * Two forms of one request. The PUBLIC form (free host, no key) is what gets
 * hashed into a cache key and written into a saved answer as its source; the
 * FETCH form (customer host plus key, when a subscription exists) is what goes
 * over the wire and nowhere else. Three things follow, and each is the reason
 * this is its own module:
 *
 * - The key never lands on disk. A saved answer carries its source URL, the
 *   prepared figures copy it, and those files are read by other tools. A key in
 *   there is a key in every copy.
 * - A subscription does not orphan the cache. Paid and free answer from the
 *   same data ("The API syntax is identical to the free tier — only the domain
 *   and key parameter differ", pricing page, read 18.09.2026), so both must map
 *   to the same cache entry; the 3,419 answers already saved stay usable.
 * - The saved source still points at a page a reader can open. The customer
 *   host answers nothing without a key.
 */
export const OPEN_METEO_ARCHIVE_PUBLIC = 'https://archive-api.open-meteo.com/v1/archive';
/** Customer host for the history API (confirmed in open-meteo/open-meteo issue #2126). */
export const OPEN_METEO_ARCHIVE_CUSTOMER = 'https://customer-archive-api.open-meteo.com/v1/archive';

export function openMeteoArchiveUrls(params: Record<string, string | number>, apiKey?: string | null) {
  const publicUrl = new URL(OPEN_METEO_ARCHIVE_PUBLIC);
  for (const [key, value] of Object.entries(params)) publicUrl.searchParams.set(key, String(value));
  const key = apiKey?.trim();
  if (!key) return { publicUrl, fetchUrl: publicUrl, subscribed: false };
  const fetchUrl = new URL(OPEN_METEO_ARCHIVE_CUSTOMER);
  publicUrl.searchParams.forEach((value, name) => fetchUrl.searchParams.set(name, value));
  fetchUrl.searchParams.set('apikey', key);
  return { publicUrl, fetchUrl, subscribed: true };
}

/** For log lines: the request as sent, with the key blanked out. */
export function redactApiKey(url: URL | string) {
  const copy = new URL(String(url));
  if (copy.searchParams.has('apikey')) copy.searchParams.set('apikey', '***');
  return copy.href;
}
