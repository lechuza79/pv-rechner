import { it, expect } from "vitest";
import { searchContactSources } from "../../scripts/lib/contact-source-search";
const target = { dataset: "versorger" as const, organization_id: "one", name: "Stadtwerke Beispiel Netz" };
it("retains search results as unverified even when the name and contact label match", async () => {
  const fetcher: typeof fetch = async () => Response.json({ status_code: 20000, cost: 0.01, tasks: [{ status_code: 20000, result: [{ items: [{ type: "organic", url: "https://example.de/impressum", title: target.name }, { type: "paid", url: "https://ads.de" }] }] }] });
  expect(await searchContactSources(target, { login: "test", password: "test", fetcher })).toMatchObject({ status: "found-unverified", sources: [{ url: "https://example.de/impressum" }] });
});
it("does not interpret failed or malformed provider tasks as empty results", async () => {
  const fetcher: typeof fetch = async () => Response.json({ status_code: 20000, tasks: [] });
  expect((await searchContactSources(target, { login: "test", password: "test", fetcher })).status).toBe("failed");
});
