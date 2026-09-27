/**
 * Does the published district package show exactly what the former
 * request-time loader computed? Compares, for real districts, the old path
 * (read every member town, aggregate at request time — verbatim copy of the
 * loader until 25.09.2026) with the page's new path (pointer → one package).
 *
 *   npm run kreise:vergleich -- --kreise=07339,01057,07232
 *   npm run kreise:vergleich -- --stichprobe=12      (random published districts)
 *
 * Differences allowed: none. The site list is compared by AGS (the old loader
 * pushed it in completion order, which was never meaningful). Reports sizes and
 * read times of both paths; timings are local and uncached, not production.
 */
import { loadEnvConfig } from "@next/env";
import { isDeepStrictEqual } from "node:util";

loadEnvConfig(process.cwd());
delete process.env.GEMEINDE_PAKET_LOKAL;
const arg = (n: string) => process.argv.find((a) => a.startsWith(`--${n}=`))?.split("=")[1];

async function main() {
  const { ladeGemeindePaket } = await import("../lib/gemeinde-paket-server");
  const { aggregateDistrictMonitor } = await import("../lib/district-monitor");
  const { aggregateDistrictEnergy } = await import("../lib/district-energy");
  const { paketFuer } = await import("../components/gemeinde/paket-teile");
  const { selectDistrictStories } = await import("../lib/district-stories");
  const { loadDistrictContent } = await import("../lib/district-monitor-server");
  const { DISTRICT_POINTER_PATH, isDistrictMember } = await import("../lib/district-package");
  const { getChildrenUncached } = await import("../lib/atlas");
  const url = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
  const kopf = { apikey: process.env.SUPABASE_SERVICE_KEY!, Authorization: `Bearer ${process.env.SUPABASE_SERVICE_KEY}` };

  /** The former loader, verbatim apart from the missing unstable_cache wrapper. */
  async function alt(ids: string[], town: string) {
    type P = Awaited<ReturnType<typeof ladeGemeindePaket>>;
    const stories: unknown[][] = new Array(ids.length);
    const sites: { ags: string; kwp: number }[] = [];
    const packets: (Pick<NonNullable<P>, "ags" | "registerStand" | "monitorHistory" | "monitorPeriods"> | null)[] = new Array(ids.length);
    let cursor = 0, bytes = 0;
    await Promise.all(Array.from({ length: Math.min(8, ids.length) }, async () => {
      while (cursor < ids.length) {
        const index = cursor++;
        const packet = await ladeGemeindePaket(ids[index]);
        bytes += packet ? JSON.stringify(packet).length : 0;
        stories[index] = packet ? (paketFuer("geschichten", packet).stories as unknown[]) : [];
        if (packet?.register) sites.push({ ags: packet.ags, kwp: packet.register.own.sums.alle.kwp });
        packets[index] = packet ? { ags: packet.ags, registerStand: packet.registerStand, monitorHistory: packet.monitorHistory, monitorPeriods: packet.monitorPeriods } : null;
      }
    }));
    const monitor = { ...aggregateDistrictMonitor(ids, packets, packets[0]?.registerStand ?? ""), energy: aggregateDistrictEnergy(ids, packets, town), sites: sites.length === ids.length && packets.every((p) => p?.registerStand === packets[0]?.registerStand) ? sites : null };
    return { content: { monitor, stories: selectDistrictStories(stories as never) }, bytes };
  }

  const pointer = await (await fetch(`${url}/storage/v1/object/gemeinde-pakete/${DISTRICT_POINTER_PATH}`, { headers: kopf })).json();
  let ids = arg("kreise")?.split(",") ?? [];
  const n = Number(arg("stichprobe") ?? 0);
  if (n) ids = [...ids, ...Object.keys(pointer.districts).sort(() => Math.random() - 0.5).slice(0, n)];
  let fehler = 0;
  for (const id of ids) {
    const r = await (await fetch(`${url}/rest/v1/mastr_regions?select=region_id,name,bezeichnung,parent_region_id&parent_region_id=eq.${id}`, { headers: kopf })).json() as { region_id: string; bezeichnung: string | null; parent_region_id: string | null }[];
    const nameRow = await (await fetch(`${url}/rest/v1/mastr_regions?select=name&region_id=eq.${id}`, { headers: kopf })).json() as { name: string }[];
    // Same membership rule as page and build; the old path differed only in counting retired keys.
    // …and in the page's order (ranking), as the former loader received them.
    const members = (await getChildrenUncached({ region_id: id, level: "landkreis" } as never)).filter((x) => isDistrictMember(x, id)).map((x) => x.region_id);
    if (members.length !== r.filter((x) => isDistrictMember(x, id)).length) throw new Error(`${id}: Seite und Register nennen verschieden viele Gemeinden`);
    const t0 = Date.now();
    const old = await alt(members, nameRow[0].name);
    const t1 = Date.now();
    const neu = await loadDistrictContent(id, members, "");
    const t2 = Date.now();
    const norm = (c: { monitor: { sites: { ags: string }[] | null } }) => ({ ...c, monitor: { ...c.monitor, sites: c.monitor.sites ? [...c.monitor.sites].sort((a, b) => a.ags.localeCompare(b.ags)) : null } });
    const gleich = neu.prepared.state !== "unavailable" && isDeepStrictEqual(norm(old.content as never), norm({ monitor: neu.monitor, stories: neu.stories } as never));
    if (!gleich) {
      fehler++;
      const a = norm(old.content as never) as unknown as { monitor: Record<string, unknown>; stories: unknown[] }, b = norm({ monitor: neu.monitor, stories: neu.stories } as never) as unknown as typeof a;
      for (const k of new Set([...Object.keys(a.monitor), ...Object.keys(b.monitor)])) if (!isDeepStrictEqual(a.monitor[k], b.monitor[k])) console.log(`   Monitor.${k} unterscheidet sich`);
      if (!isDeepStrictEqual(a.stories, b.stories)) console.log(`   Geschichten unterscheiden sich: ${JSON.stringify(a.stories.map((s) => (s as { town: string }).town))} / ${JSON.stringify(b.stories.map((s) => (s as { town: string }).town))}`);
    }
    console.log(`${id} ${nameRow[0].name}: ${members.length} Gemeinden · ${gleich ? "GLEICH" : `ABWEICHUNG (${neu.prepared.state})`} · Monitor ${old.content.monitor.status}, ${old.content.stories.length} Geschichten · alt ${members.length} Lesevorgänge ${(old.bytes / 1e6).toFixed(1)} MB ${t1 - t0} ms · neu 2 Lesevorgänge ${t2 - t1} ms`);
  }
  console.log(fehler ? `✖ ${fehler} von ${ids.length} Kreisen weichen ab` : `✓ ${ids.length} von ${ids.length} Kreisen gleich`);
  if (fehler) process.exit(1);
}
main().catch((e) => { console.error(e); process.exit(1); });
