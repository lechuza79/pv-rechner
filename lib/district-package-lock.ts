/**
 * Mutual exclusion for district-package runs (local monthly run and CI).
 *
 * A pointer read before the write is only a check, not a lock: two runs can
 * read the same old pointer, both publish, and one run's cleanup can delete the
 * generation the other just made live. So every writing run holds a LEASE in
 * the database, taken and renewed atomically (same pattern as the placement
 * snapshot: advisory transaction lock + conditional upsert). Only the holder
 * builds, moves the pointer and removes old generations; it renews the lease
 * before each of those steps and stops if it lost it. A crashed holder's lease
 * expires (DISTRICT_LEASE_SECONDS) and the next run takes over.
 */
export const DISTRICT_LEASE_SECONDS = 20 * 60;

export const DISTRICT_LEASE_DDL = `
create table if not exists kreis_paket_sperre (
  singleton boolean primary key default true check (singleton),
  inhaber uuid not null,
  bis timestamptz not null
);
alter table kreis_paket_sperre enable row level security;
create or replace function kreis_paket_sperre_nehmen(wer uuid, sekunden integer)
returns boolean language plpgsql as $$
begin
  perform pg_advisory_xact_lock(73160917);
  insert into kreis_paket_sperre(singleton, inhaber, bis)
    values (true, wer, clock_timestamp() + make_interval(secs => sekunden))
  on conflict (singleton) do update set inhaber = excluded.inhaber, bis = excluded.bis
    where kreis_paket_sperre.inhaber = wer or kreis_paket_sperre.bis < clock_timestamp();
  return found;
end;
$$;
create or replace function kreis_paket_sperre_freigeben(wer uuid)
returns void language plpgsql as $$
begin
  delete from kreis_paket_sperre where inhaber = wer;
end;
$$;
revoke all on function kreis_paket_sperre_nehmen(uuid, integer) from public, anon, authenticated;
revoke all on function kreis_paket_sperre_freigeben(uuid) from public, anon, authenticated;
grant execute on function kreis_paket_sperre_nehmen(uuid, integer) to service_role;
grant execute on function kreis_paket_sperre_freigeben(uuid) to service_role;
notify pgrst, 'reload schema';
`;

export type DistrictLock = {
  /** Take or renew; false when another live run holds it. */
  hold(): Promise<boolean>;
  release(): Promise<void>;
};
