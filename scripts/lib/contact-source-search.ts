import { contactUrl, type ContactDataset } from "../../lib/contact-discovery";
export type SourceTarget = { dataset: ContactDataset; organization_id: string; name: string; website?: string | null; question?: string };
export type SourceSearchResult = { target: SourceTarget; query: string; observedAt: string; status: "found-unverified" | "no-results" | "failed"; error: string | null; cost: number | null; sources: { url: string; title: string; snippet: string }[] };

/** Search results are leads to primary sources, never proof of identity or role. */
export async function searchContactSources(target: SourceTarget, options: { login: string; password: string; fetcher?: typeof fetch }): Promise<SourceSearchResult> {
  const roles = { kommunen: "Klimaschutz Verwaltung Kontakt", fachbetriebe: "Unternehmen Kontakt Impressum", presse: "Redaktion Kontakt Verlag", versorger: "Kontakt Impressum Unternehmen" };
  const query = target.question ?? `"${target.name.replace(/"/g, "")}" ${roles[target.dataset]}`;
  const result: SourceSearchResult = { target, query, observedAt: new Date().toISOString(), status: "failed", error: null, cost: null, sources: [] };
  try {
    if (!target.name.trim() || !roles[target.dataset]) throw Error("Named organization and supported dataset required");
    if (!options.login || !options.password) throw Error("Search credentials unavailable");
    const response = await (options.fetcher ?? fetch)("https://api.dataforseo.com/v3/serp/google/organic/live/advanced", {
      method: "POST", signal: AbortSignal.timeout(45000),
      headers: { Authorization: `Basic ${Buffer.from(`${options.login}:${options.password}`).toString("base64")}`, "Content-Type": "application/json" },
      body: JSON.stringify([{ keyword: query, location_code: 2276, language_code: "de", depth: 10 }]),
    });
    if (!response.ok) throw Error(`Search HTTP ${response.status}`);
    const data = await response.json();
    const task = data?.tasks?.[0];
    result.cost = typeof data.cost === "number" ? data.cost : null;
    if (/no search results/i.test(String(task?.status_message ?? ""))) { result.status = "no-results"; return result; }
    if (data.status_code !== 20000 || task?.status_code !== 20000 || !Array.isArray(task.result)) throw Error(`Search task failed: ${String(task?.status_message ?? data.status_message ?? "Malformed response").slice(0, 150)}`);
    const seen = new Set<string>();
    for (const item of task.result[0]?.items ?? []) {
      const url = typeof item.url === "string" ? contactUrl(item.url) : null;
      if (item.type !== "organic" || !url || seen.has(url)) continue;
      seen.add(url); result.sources.push({ url, title: String(item.title ?? "").slice(0, 250), snippet: String(item.description ?? "").slice(0, 600) });
    }
    result.status = result.sources.length ? "found-unverified" : "no-results";
  } catch (error) { result.error = String(error).slice(0, 200); }
  return result;
}
