import { afterEach, it, expect, vi } from 'vitest';
import { messeSocialAblauf } from '../../scripts/health-check';
import { advanceIncidents, emptyState } from '../health-incidents';
afterEach(()=>vi.unstubAllEnvs());
it('observes already warned accounts again without acknowledging delivery in the database',async()=>{
  vi.stubEnv('SUPABASE_URL','https://example.test'); vi.stubEnv('SUPABASE_SERVICE_KEY','test');
  const fetcher = vi.fn(async()=>new Response(JSON.stringify([{plattform:'instagram',anzeigename:'test',gueltig_bis:'2020-01-01',gewarnt_bei_stufe:0}])));
  expect(await messeSocialAblauf(fetcher)).toHaveLength(1);
  expect(await messeSocialAblauf(fetcher)).toHaveLength(1);
  expect(fetcher).toHaveBeenCalledTimes(2);
});
it('read failure remains unknown; failed delivery can retry from the last persisted state',async()=>{
  vi.stubEnv('SUPABASE_URL','https://example.test'); vi.stubEnv('SUPABASE_SERVICE_KEY','test');
  expect(await messeSocialAblauf(async()=>new Response('',{status:503}))).toBeNull();
  const finding={key:'social:instagram:test',text:'expired',operator:true};
  const previous=emptyState();
  const attempt=advanceIncidents(previous,[finding],new Date().toISOString());
  expect(attempt.escalations).toHaveLength(1);
  // A failed delivery never saves attempt.state. Retry starts from previous.
  expect(advanceIncidents(previous,[finding],new Date().toISOString()).escalations).toHaveLength(1);
  expect(advanceIncidents(attempt.state,[],new Date().toISOString(),['social:']).recovered).toEqual([]);
  expect(advanceIncidents(attempt.state,[finding],new Date().toISOString()).escalations).toEqual([]);
});
