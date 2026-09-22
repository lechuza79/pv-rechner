/**
 * Who links to us — one source for every report that counts backlinks.
 *
 * The outreach overview once counted only the status set by hand and listed
 * Nidda as "answered" while the backlink check already saw Nidda linking to us
 * (21.09.2026). A report that counts publications has to read the measurement.
 */
export const domainAus = (wert: string | null | undefined): string | null => {
  if (!wert) return null;
  const roh = wert.trim().toLowerCase().replace(/^https?:\/\//, "").split("/")[0].replace(/^www\./, "");
  return /^[a-z0-9-]+(\.[a-z0-9-]+)+$/.test(roh) ? roh : null;
};

/** Domains that link to solar-check.io, with the first linking page of each. */
export async function verlinkendeDomains(login: string, pass: string): Promise<{ domains: Map<string, string>; kosten: number }> {
  const res = await fetch("https://api.dataforseo.com/v3/backlinks/backlinks/live", {
    method: "POST",
    headers: { Authorization: "Basic " + Buffer.from(`${login}:${pass}`).toString("base64"), "Content-Type": "application/json" },
    body: JSON.stringify([{ target: "solar-check.io", mode: "as_is", limit: 1000, backlinks_status_type: "live", exclude_internal_backlinks: true }]),
  });
  const j: any = await res.json();
  const task = j.tasks?.[0];
  if (task?.status_code !== 20000) throw new Error(`Verweise: ${task?.status_message ?? res.status}`);
  const domains = new Map<string, string>();
  for (const it of task.result?.[0]?.items ?? []) {
    const d = domainAus(it.domain_from);
    if (d && !domains.has(d)) domains.set(d, it.url_from ?? "");
  }
  return { domains, kosten: j.cost ?? 0 };
}
