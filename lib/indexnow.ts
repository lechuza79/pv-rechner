// IndexNow — instantly tell Bing/Yandex (and partners) that URLs changed.
// The key is public by design: it must also be hosted at /<KEY>.txt so the
// search engine can verify ownership (see public/<KEY>.txt). Google does NOT
// participate in IndexNow and its old sitemap-ping was retired in 2023, so this
// only reaches the IndexNow network — still worth it for faster re-crawls.

export const INDEXNOW_KEY = "671d11d118bf5194c8b1890263855c1d";

const HOST = "solar-check.io";
const ENDPOINT = "https://api.indexnow.org/indexnow";

/**
 * Submits absolute or root-relative paths to IndexNow. Best-effort: never
 * throws, returns whether the submission was accepted. Skipped silently when
 * the URL list is empty. Caps at 10.000 URLs per the spec.
 */
export async function pingIndexNow(paths: string[]): Promise<{ ok: boolean; status?: number }> {
  const urlList = Array.from(new Set(paths))
    .slice(0, 10000)
    .map((p) => (p.startsWith("http") ? p : `https://${HOST}${p.startsWith("/") ? "" : "/"}${p}`));
  if (urlList.length === 0) return { ok: false };

  try {
    const res = await fetch(ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json; charset=utf-8" },
      body: JSON.stringify({ host: HOST, key: INDEXNOW_KEY, keyLocation: `https://${HOST}/${INDEXNOW_KEY}.txt`, urlList }),
    });
    return { ok: res.ok, status: res.status };
  } catch {
    return { ok: false };
  }
}
