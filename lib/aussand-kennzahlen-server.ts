/**
 * Loads the data for the per-sending figures (lib/aussand-kennzahlen.ts) and
 * asks the visitor statistics which place pages were opened in which window.
 *
 * Callable from Next (admin route) and from a tsx script: no `server-only`, no
 * Next imports — the caller hands in the database client.
 *
 * VISITS ARE ASKED PER LAND, AND SPLIT WHEN VERCEL TRUNCATES. Vercel returns at
 * most 100 rows (page × referrer) and puts the rest into "Others" — exactly
 * the small places with few visits. When "Others" carries visitors, the query
 * is repeated per district and finally per page, so no recipient disappears
 * in the bucket.
 */
import type { SupabaseClient } from "@supabase/supabase-js";
import { aggregat, herkunftJeSeite, ANALYTICS_SEIT, type Zeitraum } from "./web-analytics";
import { ordneHerkunft } from "./outreach-herkunft";
import { liesNotiz } from "./outreach-ruecklauf";
import { adressen, ladeRegionen } from "./outreach-adressen";
import { heuteInBerlin } from "./zeit";
import {
  SEITE_FENSTER,
  baueKennzahlen,
  fensterVorbei,
  plusTage,
  sendeTag,
  type Brief,
  type Fenster,
  type Fund,
  type Kennzahlen,
  type PresseMail,
} from "./aussand-kennzahlen";

/** Visits from these origins do not mean anyone opened the page from our mail. */
const NICHT_GEOEFFNET = new Set(["suche", "pruefdienst", "intern"]);

/** Vercel accepts at most 62 days per query. */
const MAX_TAGE_JE_ABFRAGE = 60;
const PARALLEL = 4;

async function alleZeilen<T>(
  db: SupabaseClient,
  tabelle: string,
  spalten: string,
  sortierung: string,
  filter?: (q: any) => any,
): Promise<T[]> {
  const raus: T[] = [];
  for (let von = 0; ; von += 1000) {
    let q = db.from(tabelle).select(spalten).order(sortierung).range(von, von + 999);
    if (filter) q = filter(q);
    const { data, error } = await q;
    if (error) throw new Error(`${tabelle}: ${error.message}`);
    if (!data?.length) break;
    raus.push(...(data as T[]));
    if (data.length < 1000) break;
  }
  return raus;
}

/** Small concurrency gate so the analytics API is not hammered. */
function begrenzer(n: number) {
  let laufend = 0;
  const warteschlange: (() => void)[] = [];
  return async function <T>(f: () => Promise<T>): Promise<T> {
    if (laufend >= n) await new Promise<void>((r) => warteschlange.push(r));
    laufend++;
    try {
      return await f();
    } finally {
      laufend--;
      warteschlange.shift()?.();
    }
  };
}

/** Splits [seit, bis) into chunks the API accepts. */
function abschnitte(z: Zeitraum): Zeitraum[] {
  const raus: Zeitraum[] = [];
  for (let s = z.seit; s < z.bis; s = plusTage(s, MAX_TAGE_JE_ABFRAGE)) {
    const e = plusTage(s, MAX_TAGE_JE_ABFRAGE);
    raus.push({ seit: s, bis: e < z.bis ? e : z.bis });
  }
  return raus;
}

export type BesuchsStatistik = {
  /** Paths with at least one counted visitor in the period. */
  besucht(pfade: Map<string, string | null>, zeitraum: Zeitraum): Promise<Set<string>>;
  abfragen: () => number;
};

export function besuchsStatistik(): BesuchsStatistik {
  const gate = begrenzer(PARALLEL);
  const memo = new Map<string, Promise<{ zeilen: Record<string, string | number>[]; others: number }>>();
  let zaehler = 0;

  function frage(art: "praefix" | "pfad", wert: string, z: Zeitraum) {
    const key = `${art}|${wert}|${z.seit}|${z.bis}`;
    let p = memo.get(key);
    if (!p) {
      p = gate(async () => {
        zaehler++;
        const zeilen =
          art === "praefix"
            ? await herkunftJeSeite(wert, z, 100)
            : await aggregat({
                datensatz: "visits",
                zeitraum: z,
                nach: ["requestPath", "referrerHostname"],
                filter: `requestPath eq '${wert.replace(/'/g, "''")}'`,
                limit: 100,
              });
        const others = zeilen
          .filter((r) => r.requestPath === "Others" || r.referrerHostname === "Others")
          .reduce((a, r) => a + Number(r.visitors ?? 0), 0);
        return { zeilen, others };
      });
      memo.set(key, p);
    }
    return p;
  }

  async function einAbschnitt(pfade: Map<string, string | null>, z: Zeitraum): Promise<Set<string>> {
    const raus = new Set<string>();
    const werte = (zeilen: Record<string, string | number>[]) => {
      for (const r of zeilen) {
        const pfad = String(r.requestPath ?? "");
        if (!pfade.has(pfad) || Number(r.visitors ?? 0) <= 0) continue;
        if (NICHT_GEOEFFNET.has(ordneHerkunft(String(r.referrerHostname ?? ""), pfade.get(pfad)))) continue;
        raus.add(pfad);
      }
    };
    // Group by land prefix: ["", "solar-atlas", land, ...]
    const laender = new Map<string, string[]>();
    for (const p of pfade.keys()) {
      const land = `/${p.split("/").slice(1, 3).join("/")}/`;
      laender.set(land, [...(laender.get(land) ?? []), p]);
    }
    await Promise.all(
      [...laender].map(async ([land, inLand]) => {
        const a = await frage("praefix", land, z);
        werte(a.zeilen);
        if (a.others <= 0) return;
        // Truncated: ask per district, then per page.
        const kreise = new Map<string, string[]>();
        for (const p of inLand) {
          const k = `/${p.split("/").slice(1, 4).join("/")}`;
          kreise.set(k, [...(kreise.get(k) ?? []), p]);
        }
        await Promise.all(
          [...kreise].map(async ([kreis, inKreis]) => {
            const b = await frage("praefix", kreis, z);
            werte(b.zeilen);
            if (b.others <= 0) return;
            await Promise.all(
              inKreis.filter((p) => !raus.has(p)).map(async (p) => werte((await frage("pfad", p, z)).zeilen)),
            );
          }),
        );
      }),
    );
    return raus;
  }

  return {
    async besucht(pfade, zeitraum) {
      const seit = zeitraum.seit < ANALYTICS_SEIT ? ANALYTICS_SEIT : zeitraum.seit;
      if (!pfade.size || seit >= zeitraum.bis) return new Set();
      const teile = await Promise.all(abschnitte({ seit, bis: zeitraum.bis }).map((z) => einAbschnitt(pfade, z)));
      return new Set(teile.flatMap((s) => [...s]));
    },
    abfragen: () => zaehler,
  };
}

type KontaktZeile = {
  region_id: string;
  kampagne: string | null;
  contacted_at: string;
  outreach_status: string;
  website: string | null;
  notes: string | null;
};

/** Everything needed for the table, read from the database and the visitor statistics. */
export async function ladeAussandKennzahlen(db: SupabaseClient, heute = heuteInBerlin()): Promise<Kennzahlen> {
  const [kontakte, mails, pubsGemeinde, pubsPresse, regionen] = await Promise.all([
    alleZeilen<KontaktZeile>(
      db,
      "kommunen_kontakt",
      "region_id, kampagne, contacted_at, outreach_status, website, notes",
      "region_id",
      (q) => q.not("contacted_at", "is", null),
    ),
    alleZeilen<{ id: number; domain: string; zielgruppe: string; anlass: string; bezug: string[] | null; gesendet_am: string; antwort_art: string | null }>(
      db,
      "aussendungen",
      "id, domain, zielgruppe, anlass, bezug, gesendet_am, antwort_art",
      "id",
    ),
    alleZeilen<{ region_id: string; url: string; mit_link: boolean; gesehen_ab: string | null }>(
      db,
      "kommunen_veroeffentlichung",
      "region_id, url, mit_link, gesehen_ab",
      "url",
    ),
    alleZeilen<{ region_id: string; url: string; mit_link: boolean; gesehen_ab: string | null }>(
      db,
      "aussendung_veroeffentlichung",
      "region_id, url, mit_link, gesehen_ab",
      "url",
    ),
    ladeRegionen(db),
  ]);

  const briefe: Brief[] = kontakte.map((k) => ({
    regionId: k.region_id,
    kampagne: k.kampagne,
    gesendetAm: k.contacted_at,
    zugestellt:
      k.outreach_status !== "bounce" && !liesNotiz(k.notes).verlauf.some((v) => v.art === "unzustellbar"),
  }));
  const presse: PresseMail[] = mails.map((m) => ({
    domain: m.domain,
    zielgruppe: m.zielgruppe,
    anlass: m.anlass,
    bezug: m.bezug ?? [],
    gesendetAm: m.gesendet_am,
    zugestellt: m.antwort_art !== "unzustellbar",
  }));
  const funde: Fund[] = [...pubsGemeinde, ...pubsPresse].map((p) => ({
    regionId: p.region_id,
    url: p.url,
    mitLink: p.mit_link,
    gesehenAb: p.gesehen_ab,
  }));

  const pfadJeRegion = adressen(regionen, [...new Set(kontakte.map((k) => k.region_id))], { mitKreisen: true });
  const websiteJeRegion = new Map(kontakte.map((k) => [k.region_id, k.website] as const));

  // Opened pages per (send day, window): one set of queries per combination.
  const statistik = besuchsStatistik();
  const morgen = plusTage(heute, 1);
  const jeTag = new Map<string, Map<string, string | null>>();
  for (const b of briefe) {
    const pfad = pfadJeRegion.get(b.regionId);
    if (!b.zugestellt || !pfad) continue;
    const tag = sendeTag(b.gesendetAm);
    const m = jeTag.get(tag) ?? new Map<string, string | null>();
    m.set(pfad, websiteJeRegion.get(b.regionId) ?? null);
    jeTag.set(tag, m);
  }
  const geoeffnetJe = new Map<string, Set<string>>();
  await Promise.all(
    [...jeTag].flatMap(([tag, pfade]) =>
      SEITE_FENSTER.filter((w) => fensterVorbei(tag, w, heute)).map(async (w) => {
        const bis = w === "bisher" ? morgen : plusTage(tag, w + 1);
        geoeffnetJe.set(`${tag}|${w}`, await statistik.besucht(pfade, { seit: tag, bis }));
      }),
    ),
  );

  return baueKennzahlen({
    briefe,
    presse,
    funde,
    mitSeite: new Set(pfadJeRegion.keys()),
    geoeffnet: (regionId: string, tag: string, w: Fenster) => {
      const pfad = pfadJeRegion.get(regionId);
      return !!pfad && !!geoeffnetJe.get(`${tag}|${w}`)?.has(pfad);
    },
    heute,
  });
}
