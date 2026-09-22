import "server-only";
import { isDeepStrictEqual } from "node:util";
import { supabase } from "./supabase-server";
import { type Fund } from "./social-funde";

/**
 * Der Vorrat an Geschichten: was der Suchlauf gefunden hat, und was ein Mensch
 * damit vorhat.
 *
 * ZWEI BESITZER, EINE ZEILE. Satz, Zahlen und Grundlage gehören dem Lauf und
 * werden bei jedem Durchgang überschrieben — sie sind gerechnet und sollen dem
 * Datenstand folgen. Stand und Notiz gehören dem Menschen und werden vom Lauf
 * nie angefasst. Dieselbe Trennung wie im Förderkatalog zwischen Programmdaten
 * und Beleg-Spalten, und aus demselben Grund: Ein Lauf, der die Vormerkung
 * eines Menschen überschreibt, macht die Ansicht wertlos.
 */

// Die Stände selbst stehen in einem eigenen Modul OHNE Server-Bindung: Diese
// Datei liest die Datenbank, die Liste im Browser braucht aber die
// Beschriftungen. Sie hier zu führen brach den Aufbau mit „importiert etwas,
// das nur auf dem Server läuft" — dieselbe Trennung wie beim
// Aktualisierungsstand der Rechner.
export {
  FUND_STAND_LABEL,
  HAND_STAENDE,
  standMitAbleitung,
  type FundStand,
} from "./social-fundstand";
import type { FundStand } from "./social-fundstand";

export type VorratsFund = Fund & {
  kennung: string;
  stand: FundStand;
  notiz: string | null;
  zuletztGesehen: string;
  erstmalsGesehen: string;
};

type Zeile = {
  kennung: string;
  orte: string[] | null;
  laender: string[] | null;
  evergreen: boolean | null;
  muster: string;
  kategorie: string;
  satz: string;
  staerke: number;
  werte: Fund["werte"];
  grundlage: string;
  stand: string;
  notiz: string | null;
  zuletzt_gesehen: string;
  erstmals_gesehen: string;
};

function ausZeile(z: Zeile): VorratsFund {
  return {
    kennung: z.kennung,
    orte: z.orte ?? [],
    laender: z.laender ?? [],
    evergreen: z.evergreen ?? false,
    muster: z.muster as Fund["muster"],
    kategorie: z.kategorie,
    satz: z.satz,
    staerke: Number(z.staerke),
    werte: z.werte ?? [],
    grundlage: z.grundlage,
    stand: (z.stand as FundStand) ?? "offen",
    notiz: z.notiz,
    zuletztGesehen: z.zuletzt_gesehen,
    erstmalsGesehen: z.erstmals_gesehen,
  };
}

/**
 * Store computed findings without touching editorial state.
 * Identical repeated findings are harmless. Conflicting claims with the same
 * identity are a finder bug and must fail before any write, never pick a winner.
 */
export async function schreibeFunde(funde: Fund[], jetztIso: string): Promise<number> {
  if (!supabase || funde.length === 0) return 0;

  const beste = new Map<string, Fund>();
  for (const f of funde) {
    const bisher = beste.get(f.kennung);
    if (bisher && !isDeepStrictEqual(bisher, f)) {
      throw new Error(`Conflicting story identities: ${f.kennung}. The finder must distinguish these observations.`);
    }
    beste.set(f.kennung, f);
  }

  const zeilen = [...beste.values()].map((f) => ({
    kennung: f.kennung,
    muster: f.muster,
    kategorie: f.kategorie,
    satz: f.satz,
    staerke: Number.isFinite(f.staerke) ? Number(f.staerke.toFixed(4)) : 0,
    werte: f.werte,
    grundlage: f.grundlage,
    orte: f.orte ?? [],
    laender: f.laender ?? [],
    evergreen: f.evergreen ?? false,
    zuletzt_gesehen: jetztIso,
  }));

  let geschrieben = 0;
  for (let i = 0; i < zeilen.length; i += 500) {
    const teil = zeilen.slice(i, i + 500);
    // Ohne `stand` und `notiz` in der Nutzlast: Was nicht mitgeschickt wird,
    // bleibt beim Aktualisieren stehen. Sie hier mitzugeben — und sei es mit
    // dem Vorgabewert — setzte bei jedem Lauf jede Vormerkung zurück.
    const { error } = await supabase.from("social_funde").upsert(teil, { onConflict: "kennung" });
    if (error) throw new Error(`Vorrat schreiben fehlgeschlagen: ${error.message}`);
    geschrieben += teil.length;
  }
  return geschrieben;
}

/** Read every matching row in bounded pages; display limits never restrict discovery. */
async function readPages<T>(page: (from: number, to: number) => PromiseLike<{ data: T[] | null; error: { message: string } | null }>): Promise<T[]> {
  const rows: T[] = [];
  const size = 500;
  for (let from = 0; ; from += size) {
    const result = await page(from, from + size - 1);
    if (result.error) throw new Error(`Vorrat lesen fehlgeschlagen: ${result.error.message}`);
    const current = result.data ?? [];
    rows.push(...current);
    if (current.length < size) return rows;
  }
}

/** Read the matching inventory before applying explicitly requested presentation limits. */
export async function leseFunde(opts: {
  stand?: FundStand;
  muster?: string;
  ort?: string;
  land?: string;
  evergreen?: boolean;
  suche?: string;
  /** Explicit presentation limit, applied after filtering and fair interleaving. */
  grenze?: number;
  jeMuster?: number;
  /** Internal municipality/county lookup; filtered by the database before pagination. */
  orte?: string[];
}): Promise<VorratsFund[]> {
  const db = supabase;
  if (!db) return [];
  const rows = await readPages<Zeile>((from, to) => {
    let q = db.from("social_funde").select("kennung, muster, kategorie, satz, staerke, werte, grundlage, orte, laender, evergreen, stand, notiz, zuletzt_gesehen, erstmals_gesehen")
      .order("kennung", { ascending: true }).range(from, to);
    if (opts.stand) q = q.eq("stand", opts.stand);
    if (opts.muster) q = q.eq("muster", opts.muster);
    if (opts.ort) q = q.contains("orte", [opts.ort]);
    if (opts.orte) q = q.overlaps("orte", opts.orte);
    if (opts.land) q = q.contains("laender", [opts.land]);
    if (opts.evergreen !== undefined) q = q.eq("evergreen", opts.evergreen);
    if (opts.suche?.trim()) {
      const word = opts.suche.trim().replace(/[%,()]/g, " ");
      q = q.or(`satz.ilike.%${word}%,grundlage.ilike.%${word}%`);
    }
    return q;
  });
  const groups = new Map<string, VorratsFund[]>();
  for (const row of rows) {
    const f = ausZeile(row);
    const group = groups.get(f.muster) ?? [];
    group.push(f);
    groups.set(f.muster, group);
  }
  const ordered = [...groups.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([, group]) =>
    group.sort((a, b) => b.staerke - a.staerke || a.kennung.localeCompare(b.kennung))
      .slice(0, opts.jeMuster));
  // Strengths measure different things across patterns; round-robin preserves diversity.
  const result: VorratsFund[] = [];
  for (let index = 0; ordered.some(group => index < group.length); index++) {
    for (const group of ordered) if (group[index]) result.push(group[index]);
  }
  return result.slice(0, opts.grenze);
}

/** Einen einzelnen Fund holen — der Weg für einen Zuruf mit Kennung. */
export async function leseFund(kennung: string): Promise<VorratsFund | null> {
  if (!supabase) return null;
  const { data, error } = await supabase
    .from("social_funde")
    .select(
      "kennung, muster, kategorie, satz, staerke, werte, grundlage, orte, laender, evergreen, stand, notiz, zuletzt_gesehen, erstmals_gesehen",
    )
    .eq("kennung", kennung)
    .maybeSingle();
  if (error) throw new Error(`Fund lesen fehlgeschlagen: ${error.message}`);
  return data ? ausZeile(data as Zeile) : null;
}

/** Wie viele je Muster und Stand — für die Übersicht. */
export async function zaehleFunde(): Promise<{ muster: string; stand: string; zahl: number }[]> {
  if (!supabase) return [];
  const db = supabase;
  const data = await readPages<{ muster: string; stand: string }>((from, to) => db.from("social_funde").select("muster, stand").order("kennung").range(from, to));
  const zaehler = new Map<string, number>();
  for (const z of data ?? []) {
    const k = `${z.muster}|${z.stand}`;
    zaehler.set(k, (zaehler.get(k) ?? 0) + 1);
  }
  return [...zaehler.entries()].map(([k, zahl]) => {
    const [muster, stand] = k.split("|");
    return { muster, stand, zahl };
  });
}

/** Was ein Mensch entscheidet: Stand und Notiz. */
export async function setzeStand(
  kennung: string,
  stand: FundStand,
  notiz?: string,
): Promise<void> {
  if (!supabase) throw new Error("Datenbank nicht verfügbar");
  const feld: { stand: FundStand; notiz?: string } = { stand };
  if (notiz !== undefined) feld.notiz = notiz;
  const { error } = await supabase.from("social_funde").update(feld).eq("kennung", kennung);
  if (error) throw new Error(`Stand setzen fehlgeschlagen: ${error.message}`);
}

/**
 * Alle Orte, die im Vorrat vorkommen — für den Filter.
 *
 * Aus dem Feld, nicht aus den Sätzen: Ein Filter, der „Dörfer" als Ortsnamen
 * anbietet, führt in die Irre.
 */
export async function orteImVorrat(): Promise<{
  kommunen: { name: string; zahl: number }[];
  laender: { name: string; zahl: number }[];
}> {
  if (!supabase) return { kommunen: [], laender: [] };
  const db = supabase;
  const data = await readPages<{ orte: string[] | null; laender: string[] | null }>((from, to) => db.from("social_funde").select("orte, laender").order("kennung").range(from, to));

  const zaehle = (feld: "orte" | "laender") => {
    const zaehler = new Map<string, number>();
    for (const z of data ?? []) {
      for (const o of (z[feld] as string[] | null) ?? []) {
        if (o) zaehler.set(o, (zaehler.get(o) ?? 0) + 1);
      }
    }
    return [...zaehler.entries()]
      .map(([name, zahl]) => ({ name, zahl }))
      .sort((a, b) => a.name.localeCompare(b.name, "de"));
  };
  return { kommunen: zaehle("orte"), laender: zaehle("laender") };
}


/**
 * Die Funde, die für EINE Ortsseite in Frage kommen — Ort, Landkreis, Land.
 *
 * WARUM NICHT NUR DER ORT SELBST: Die Muster suchen Auffälliges, und ein
 * durchschnittlicher Ort ist per Definition keins. Gemessen am 05.09.2026:
 * 313 Funde nennen einen Ort, verteilt auf 197 Gemeinden — bei 11.000
 * Ortsseiten stünde damit auf 98 % von ihnen nie einer. Ein Fund über den
 * eigenen Landkreis oder über den Nachbarort im selben Kreis ist auf dieser
 * Seite aber genauso eine Nachricht; nur die NÄHE unterscheidet sie.
 *
 * Die Reihenfolge ist die Nähe: der eigene Ort zuerst, dann der Landkreis,
 * dann das Land. Within each tier, patterns are interleaved; strengths are
 * comparable only within one pattern. An explicit limit belongs to display.
 *
 * `stand` bleibt Sache des Aufrufers: Ein Fund im Zustand „offen" hat noch
 * niemand angesehen und gehört nicht auf eine öffentliche Seite.
 */
export async function fundeFuerOrt(opts: {
  ort: string;
  /** Die übrigen Gemeinden des Landkreises — die Seite lädt sie ohnehin. */
  kreisOrte?: string[];
  land?: string | null;
  stand?: FundStand;
  grenze?: number;
}): Promise<VorratsFund[]> {
  const nearby = [...new Set([opts.ort, ...(opts.kreisOrte ?? [])])];
  const [local, state] = await Promise.all([
    leseFunde({ stand: opts.stand, orte: nearby }),
    opts.land ? leseFunde({ stand: opts.stand, land: opts.land }) : Promise.resolve([]),
  ]);
  const alle = [...new Map([...local, ...state.filter(f => !f.orte?.length)].map(f => [f.kennung, f])).values()];
  const kreis = new Set((opts.kreisOrte ?? []).filter((n) => n !== opts.ort));
  const naehe = (f: VorratsFund): number => {
    // Beide Listen sind am Typ optional: Ein bundesweiter Fund nennt bewusst
    // niemanden. Leer und fehlend sind hier dasselbe.
    const orte = f.orte ?? [];
    const laender = f.laender ?? [];
    if (orte.includes(opts.ort)) return 0;
    if (orte.some((o) => kreis.has(o))) return 1;
    if (opts.land && laender.includes(opts.land) && orte.length === 0) return 2;
    return 99;
  };
  return alle
    .map((f) => ({ f, n: naehe(f) }))
    .filter((x) => x.n < 99)
    .sort((a, b) => a.n - b.n)
    .slice(0, opts.grenze)
    .map((x) => x.f);
}
