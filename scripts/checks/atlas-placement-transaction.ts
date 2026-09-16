// Run with node --conditions react-server --env-file=.env.local --import tsx.
// Exercises publication in a subtransaction and rolls back every test mutation.
import { supabase } from '../../lib/supabase-server';
async function main() {
 const {error}=await supabase!.rpc('exec_sql',{sql: `
do $check$
declare previous uuid; actual uuid; rejected boolean;
begin
 select lauf_id into previous from atlas_platzierung_aktiv;
 if previous is null then raise exception 'Missing baseline'; end if;
 begin
  insert into atlas_platzierung_laeufe(id,begonnen_am) values
   ('10000000-0000-4000-8000-000000000001',clock_timestamp()+interval '1 hour'),
   ('10000000-0000-4000-8000-000000000002',clock_timestamp()+interval '2 hours');
  insert into atlas_platzierung_zeilen(lauf_id,region_id,platzierungen) values
   ('10000000-0000-4000-8000-000000000001','test','[]'),
   ('10000000-0000-4000-8000-000000000002','test','[]');
  rejected := false;
  begin perform atlas_platzierungen_veroeffentlichen('10000000-0000-4000-8000-000000000002',2);
  exception when others then rejected := true; end;
  if not rejected then raise exception 'Partial snapshot was published'; end if;
  select lauf_id into actual from atlas_platzierung_aktiv;
  if actual <> previous then raise exception 'Partial snapshot changed pointer'; end if;
  perform atlas_platzierungen_veroeffentlichen('10000000-0000-4000-8000-000000000002',1);
  select lauf_id into actual from atlas_platzierung_aktiv;
  if actual <> '10000000-0000-4000-8000-000000000002'::uuid then raise exception 'Atomic publication failed'; end if;
  if (select count(*) from atlas_platzierungen) <> 1 then raise exception 'Reader mixed generations'; end if;
  rejected := false;
  begin perform atlas_platzierungen_veroeffentlichen('10000000-0000-4000-8000-000000000001',1);
  exception when others then rejected := true; end;
  if not rejected then raise exception 'Older snapshot was published'; end if;
  raise exception sqlstate 'ZX001' using message='Rollback test data';
 exception when sqlstate 'ZX001' then null;
 end;
 select lauf_id into actual from atlas_platzierung_aktiv;
 if actual <> previous then raise exception 'Test rollback failed'; end if;
end $check$;`});
 if(error)throw error; console.log('Database transaction checks passed: partial rejected, atomic publication, stale generation rejected, all test changes rolled back');
}
main().catch(e=>{console.error(e);process.exitCode=1});
