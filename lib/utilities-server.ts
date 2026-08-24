import "server-only";
import { supabase } from "./supabase-server";
import { withDbTimeout } from "./db-timeout";
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
import type { PruefBefund } from "./utility-check";

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
    pruefungAmpel: (r.pruefung_ampel as string) ?? null,
    pruefung: Array.isArray(r.pruefung) ? (r.pruefung as PruefBefund[]) : [],
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

/**
 * Alle Zeilen einer Tabelle, seitenweise.
 *
 * Ein einfaches `select()` liefert nur die ersten 1.000 Zeilen. Von 11.407
 * Zuordnungen kamen deshalb 1.000 an, und weil die auf wenige Versorger
 * entfielen, zeigte das Cockpit 13 statt 779 Versorger mit Gebiet — ohne
 * Fehlermeldung, nur mit einer fast leeren Tabelle. Dieselbe Falle hatte vorher
 * schon der Bestandsbericht; hier nicht mitgeprüft zu haben, war der Fehler.
 */
async function alleZeilen(tabelle: string, spalten: string): Promise<Row[]> {
  if (!supabase) return [];
  const out: Row[] = [];
  for (let von = 0; ; von += 1000) {
    // Zeitbudget je Block — sonst hält ein einziger hängender Block die ganze
    // Schleife bis zum Function-Limit fest.
    const { data, error } = await withDbTimeout(
      supabase.from(tabelle).select(spalten).range(von, von + 999),
      `${tabelle} ab ${von}`,
    );
    if (error) throw new Error(`${tabelle} laden: ${error.message}`);
    if (!data?.length) break;
    out.push(...(data as unknown as Row[]));
    if (data.length < 1000) break;
  }
  return out;
}

export type UtilityBundle = {
  areas: UtilityArea[];
  placements: Map<string, UtilityPlacement[]>;
  memberships: UtilityMembership[];
  /** Gemeinde-Kennzahlen nach AGS — für die Detailliste der Zuordnungen. */
  statsByRegion: Map<string, GemeindeStats>;
};

// Prozess-lokaler Halt für das fertige Bündel.
//
// Gemessen (27.07.2026): Ein kalter Aufbau kostet rund 4 Sekunden Datenbank —
// 10.742 Gemeinde-Kennzahlen, 11.247 Gebietsnamen, 937 Versorger und 11.407
// Zuordnungen. Die Gemeinde-Hälfte hielt der Award-Loader schon eine Stunde; die
// Versorger-Hälfte wurde bei JEDEM Filterwechsel neu gelesen, und genau das hat
// die Tabelle zäh gemacht.
//
// Kein Zeit-Ablauf, sondern gezieltes Verwerfen: Das Cockpit bearbeitet diese
// Daten laufend, und ein Stand von vor 30 Sekunden wäre dort schlimmer als ein
// langsamer Aufbau. Jede schreibende Route ruft `invalidateUtilityBundle()`.
let bundleCache: UtilityBundle | null = null;

/** Nach jedem Schreibvorgang aufrufen — sonst zeigt das Cockpit den alten Stand. */
export function invalidateUtilityBundle(): void {
  bundleCache = null;
}

/** Alle Versorger mit aufsummiertem Gebiet und ihren Platzierungen.
 *  Die Platzierungen brauchen die GESAMTE Menge (Rang ist relativ), deshalb wird
 *  immer alles geladen und danach gehalten. */
export async function loadUtilityBundle(): Promise<UtilityBundle> {
  if (!supabase) {
    return { areas: [], placements: new Map(), memberships: [], statsByRegion: new Map() };
  }
  if (bundleCache) return bundleCache;

  const [utilRows, linkRows, stats] = await Promise.all([
    alleZeilen("utilities", "*"),
    alleZeilen("utility_communes", "*"),
    loadAwardStats(),
  ]);

  const records = utilRows.map(toRecord);
  const memberships = linkRows.map(toMembership);
  const statsByRegion = new Map(stats.map((g) => [g.regionId, g]));
  const overlaps = findOverlaps(memberships);

  const areas = records.map((u) => aggregateArea(u, memberships, statsByRegion, overlaps));
  const placements = computeUtilityPlacements(areas);

  bundleCache = { areas, placements, memberships, statsByRegion };
  return bundleCache;
}

export type UtilityHookView = UtilityHookText & { categoryKey: string | null };

/** Der Aufhänger eines Versorgers, fertig als Text. */
export function hookFor(area: UtilityArea, placements: Map<string, UtilityPlacement[]>): UtilityHookView {
  const hook = selectUtilityHook(placements.get(area.utility.id));
  return { ...utilityHookText(hook, area), categoryKey: hook.categoryKey };
}
