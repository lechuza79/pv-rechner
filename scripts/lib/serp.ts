/**
 * One Google search through DataForSEO — the shared form of the function the
 * installer, press and funding scripts each carry a copy of. New stocks use
 * this one; the older copies are identical in behaviour.
 *
 * About 0.002 $ per query (measured 06.10.2026 on the live endpoint).
 */
export type SerpTreffer = { url: string; rang: number; titel: string };

export async function serp(frage: string, tiefe = 10): Promise<{ treffer: SerpTreffer[]; fehler: string | null; kosten: number }> {
  const login = process.env.DATAFORSEO_LOGIN;
  const passwort = process.env.DATAFORSEO_PASSWORD;
  if (!login || !passwort) return { treffer: [], fehler: "DATAFORSEO_LOGIN/PASSWORD fehlen", kosten: 0 };
  const auth = Buffer.from(`${login}:${passwort}`).toString("base64");
  try {
    const res = await fetch("https://api.dataforseo.com/v3/serp/google/organic/live/advanced", {
      method: "POST",
      headers: { Authorization: `Basic ${auth}`, "Content-Type": "application/json" },
      // One task per call — several are refused ("You can set only one task at a time").
      body: JSON.stringify([{ keyword: frage, location_code: 2276, language_code: "de", depth: tiefe }]),
    });
    if (!res.ok) return { treffer: [], fehler: `HTTP ${res.status}`, kosten: 0 };
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const daten: any = await res.json();
    const aufgabe = daten?.tasks?.[0];
    const kosten = Number(aufgabe?.cost ?? 0);
    // "No Search Results" is a result, not a failure.
    if (/no search results/i.test(String(aufgabe?.status_message ?? ""))) return { treffer: [], fehler: null, kosten };
    if (aufgabe?.status_code && aufgabe.status_code >= 40000) {
      return { treffer: [], fehler: String(aufgabe.status_message ?? aufgabe.status_code), kosten };
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const posten: any[] = aufgabe?.result?.[0]?.items ?? [];
    const treffer = posten
      .filter((p) => p?.type === "organic" && typeof p.url === "string")
      .map((p) => ({ url: String(p.url), rang: Number(p.rank_absolute ?? 0), titel: String(p.title ?? "").slice(0, 200) }));
    return { treffer, fehler: null, kosten };
  } catch (e) {
    return { treffer: [], fehler: e instanceof Error ? e.message : String(e), kosten: 0 };
  }
}
