import "server-only";
import { randomUUID } from "node:crypto";
import { supabase } from "./supabase-server";
import type { GemeindeStats } from "./awards";
import { computePlacements, type Placement } from "./award-hook";

// Staging generations keep partially uploaded or failed refreshes invisible.
// Readers join the singleton pointer; publishing that pointer is atomic.
export const PLACEMENT_SNAPSHOT_DDL = `
create table if not exists atlas_platzierung_laeufe (
  id uuid primary key,
  begonnen_am timestamptz not null default clock_timestamp(),
  erneuert_am timestamptz,
  orte integer
);
create table if not exists atlas_platzierung_zeilen (
  lauf_id uuid not null references atlas_platzierung_laeufe(id) on delete cascade,
  region_id text not null,
  platzierungen jsonb not null check (jsonb_typeof(platzierungen) = 'array'),
  primary key (lauf_id, region_id)
);
create table if not exists atlas_platzierung_aktiv (
  singleton boolean primary key default true check (singleton),
  lauf_id uuid not null references atlas_platzierung_laeufe(id)
);
alter table atlas_platzierung_laeufe enable row level security;
alter table atlas_platzierung_zeilen enable row level security;
alter table atlas_platzierung_aktiv enable row level security;
create or replace view atlas_platzierungen with (security_invoker = true) as
  select z.region_id, z.platzierungen, l.erneuert_am
  from atlas_platzierung_aktiv a
  join atlas_platzierung_laeufe l on l.id = a.lauf_id
  join atlas_platzierung_zeilen z on z.lauf_id = a.lauf_id;
revoke all on atlas_platzierungen from anon, authenticated;
grant select on atlas_platzierungen to service_role;
create or replace function atlas_platzierungen_veroeffentlichen(lauf uuid, erwartet integer)
returns void language plpgsql as $$
begin
  perform pg_advisory_xact_lock(73160916);
  if erwartet <= 0 or (select count(*) from atlas_platzierung_zeilen where lauf_id = lauf) <> erwartet then
    raise exception 'Incomplete placement snapshot';
  end if;
  if exists (
    select 1 from atlas_platzierung_aktiv a
    join atlas_platzierung_laeufe active on active.id = a.lauf_id
    join atlas_platzierung_laeufe candidate on candidate.id = lauf
    where active.begonnen_am >= candidate.begonnen_am
  ) then
    raise exception 'A newer placement snapshot is already active';
  end if;
  update atlas_platzierung_laeufe set erneuert_am = clock_timestamp(), orte = erwartet where id = lauf;
  insert into atlas_platzierung_aktiv(singleton, lauf_id) values (true, lauf)
    on conflict (singleton) do update set lauf_id = excluded.lauf_id;
  delete from atlas_platzierung_laeufe
    where begonnen_am < (select begonnen_am from atlas_platzierung_laeufe where id = lauf);
end;
$$;
revoke all on function atlas_platzierungen_veroeffentlichen(uuid, integer) from public, anon, authenticated;
grant execute on function atlas_platzierungen_veroeffentlichen(uuid, integer) to service_role;
notify pgrst, 'reload schema';
`;

export function placementRows(stats: GemeindeStats[], placements: Map<string, Placement[]>) {
  if (!stats.length) throw new Error("Cannot publish empty placement data");
  if (new Set(stats.map((g) => g.regionId)).size !== stats.length) {
    throw new Error("Duplicate municipality in placement data");
  }
  // Include municipalities without eligible rankings, so completeness is measurable.
  return stats.map((g) => ({ region_id: g.regionId, platzierungen: placements.get(g.regionId) ?? [] }));
}

export async function preparePlacementSnapshot() {
  if (!supabase) throw new Error("Database not configured");
  const { error: ddlError } = await supabase.rpc("exec_sql", { sql: PLACEMENT_SNAPSHOT_DDL });
  if (ddlError) throw new Error(`Placement schema: ${ddlError.message}`);
  const id = randomUUID();
  // Only first installation may need time for PostgREST to discover the table.
  for (let attempt = 0; ; attempt++) {
    const { error } = await supabase.from("atlas_platzierung_laeufe").insert({ id });
    if (!error) break;
    if (error.code !== "PGRST205" || attempt >= 5) {
      throw new Error(`Placement generation: ${error.message}`);
    }
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }
  return id;
}

// This runs only during the data refresh, never during a municipality request.
export async function writePlacementSnapshot(id: string, stats: GemeindeStats[], placements = computePlacements(stats)) {
  if (!supabase) throw new Error("Database not configured");
  if (!/^[0-9a-f-]{36}$/.test(id)) throw new Error("Invalid placement generation");
  const rows = placementRows(stats, placements);
  for (let i = 0; i < rows.length; i += 100) {
    const { error } = await supabase.from("atlas_platzierung_zeilen")
      .insert(rows.slice(i, i + 100).map((row) => ({ lauf_id: id, ...row })));
    if (error) throw new Error(`Placement batch: ${error.message}`);
  }
  // exec_sql avoids a PostgREST schema-cache race immediately after installation.
  const { error } = await supabase.rpc("exec_sql", {
    sql: `select atlas_platzierungen_veroeffentlichen('${id}'::uuid, ${rows.length});`,
  });
  if (error) throw new Error(`Placement publication: ${error.message}`);
  return { orte: rows.length };
}
