import "server-only";
import { supabase } from "./supabase-server";
import { loadAwardStats } from "./awards-server";
import type { GemeindeStats } from "./awards";
import {
  aggregateArea,
  computeUtilityPlacements,
  findOverlaps,
  type UtilityArea,
  type UtilityMembership,
  type UtilityPlacement,
  type UtilityRecord,
  type ZuordnungQuelle,
  type ZuordnungRolle,
  type UtilityTyp,
  type Themenfund,
} from "./utilities";
import { selectUtilityHook, utilityHookText, type UtilityHookText } from "./utility-hook";

// Server-Loader für das Versorger-Cockpit.
//
// Die teure Hälfte — die Kennzahlen aller ~11.000 Gemeinden — kommt aus dem
// Award-Loader, der sie prozess-lokal für eine Stunde hält. Die Aggregation über
// ein Versorgungsgebiet ist danach reine Rechenarbeit im Speicher und kostet die
// Datenbank NICHTS zusätzlich. Frisch gelesen werden nur die beiden kleinen
// eigenen Tabellen (Dutzende Zeilen), weil sie im Cockpit laufend bearbeitet
// werden und ein Cache dort nur veraltete Stände zeigen würde.

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Row = Record<string, any>;

function toRecord(r: Row): UtilityRecord {
  return {
    id: r.id as string,
    name: r.name as string,
    typ: r.typ as UtilityTyp,
    website: (r.website as string) ?? null,
    kontaktEmail: (r.kontakt_email as string) ?? null,
    kontaktseiteUrl: (r.kontaktseite_url as string) ?? null,
    sitzGemeindeId: (r.sitz_gemeinde_id as string) ?? null,
    status: (r.status as string) ?? "offen",
    notiz: (r.notiz as string) ?? null,
    telefon: (r.telefon as string) ?? null,
    ort: (r.ort as string) ?? null,
    impressumUrl: (r.impressum_url as string) ?? null,
    rollenEmail: (r.rollen_email as string) ?? null,
    personenEmail: (r.personen_email as string) ?? null,
    verantwortlichZeile: (r.verantwortlich_zeile as string) ?? null,
    verantwortlichFunktion: (r.verantwortlich_funktion as string) ?? null,
    verantwortlichOperativ: (r.verantwortlich_operativ as boolean) ?? null,
    verbundDomain: (r.verbund_domain as string) ?? null,
    themen: Array.isArray(r.themen) ? (r.themen as Themenfund[]) : [],
    profilGeprueftAm: (r.profil_geprueft_am as string) ?? null,
  };
}

function toMembership(r: Row): UtilityMembership {
  return {
    utilityId: r.utility_id as string,
    regionId: r.commune_id as string,
    rolle: r.rolle as ZuordnungRolle,
    quelle: r.zuordnung_quelle as ZuordnungQuelle,
  };
}

export type UtilityBundle = {
  areas: UtilityArea[];
  placements: Map<string, UtilityPlacement[]>;
  memberships: UtilityMembership[];
  /** Gemeinde-Kennzahlen nach AGS — für die Detailliste der Zuordnungen. */
  statsByRegion: Map<string, GemeindeStats>;
};

/** Alle Versorger mit aufsummiertem Gebiet und ihren Platzierungen.
 *  Die Platzierungen brauchen die GESAMTE Menge (Rang ist relativ), deshalb wird
 *  immer alles geladen — bei einigen Dutzend Zeilen ist das die einfachste und
 *  zugleich schnellste Lösung. */
export async function loadUtilityBundle(): Promise<UtilityBundle> {
  if (!supabase) {
    return { areas: [], placements: new Map(), memberships: [], statsByRegion: new Map() };
  }

  const [utilRes, linkRes, stats] = await Promise.all([
    supabase.from("utilities").select("*").order("name"),
    supabase.from("utility_communes").select("*"),
    loadAwardStats(),
  ]);
  if (utilRes.error) throw new Error(`Versorger laden: ${utilRes.error.message}`);
  if (linkRes.error) throw new Error(`Zuordnungen laden: ${linkRes.error.message}`);

  const records = (utilRes.data ?? []).map(toRecord);
  const memberships = (linkRes.data ?? []).map(toMembership);
  const statsByRegion = new Map(stats.map((g) => [g.regionId, g]));
  const overlaps = findOverlaps(memberships);

  const areas = records.map((u) => aggregateArea(u, memberships, statsByRegion, overlaps));
  const placements = computeUtilityPlacements(areas);

  return { areas, placements, memberships, statsByRegion };
}

export type UtilityHookView = UtilityHookText & { categoryKey: string | null };

/** Der Aufhänger eines Versorgers, fertig als Text. */
export function hookFor(area: UtilityArea, placements: Map<string, UtilityPlacement[]>): UtilityHookView {
  const hook = selectUtilityHook(placements.get(area.utility.id));
  return { ...utilityHookText(hook, area), categoryKey: hook.categoryKey };
}
