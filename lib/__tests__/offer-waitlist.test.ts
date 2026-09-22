import { describe, expect, it, vi, afterEach } from 'vitest';
import { OFFER_CONSENT, tokenHash, validWaitlistToken, waitlistInput, waitlistToken } from '../offer-waitlist';
const db = vi.hoisted(() => ({from:vi.fn(),rpc:vi.fn()}));
vi.mock('../supabase-server',()=>({supabase:db}));
import { waitlistAction } from '../offer-waitlist-action';
const payload={email:' Person@Example.org ',website:'',consent:OFFER_CONSENT,elapsedMs:2000};
afterEach(()=>vi.clearAllMocks());
describe('offer waitlist',()=>{
 it('normalizes addresses and rejects invalid consent and malformed input',()=>{
  expect(waitlistInput(payload)).toEqual({email:'person@example.org',trap:false});
  expect(waitlistInput({...payload,consent:'newsletter'})).toBeNull();
  expect(waitlistInput({...payload,email:'<script>@example.org'})).toBeNull();
  expect(waitlistInput(null)).toBeNull();
 });
 it('silently catches filled bot fields and implausibly fast submissions',()=>{
  expect(waitlistInput({...payload,website:'bot.example'})).toEqual({email:'',trap:true});
  expect(waitlistInput({...payload,elapsedMs:20})).toEqual({email:'',trap:true});
 });
 it('uses distinct unpredictable tokens and stores only hashes',()=>{
  const a=waitlistToken(),b=waitlistToken();expect(a).not.toBe(b);expect(validWaitlistToken(a)).toBe(true);expect(tokenHash(a)).not.toBe(a);
 });
 it('mail scanners cannot confirm or delete on GET',async()=>{
  const req=new Request('https://solar-check.io/api/warteliste/bestaetigen?t='+waitlistToken());
  for(const remove of [false,true]){const r=await waitlistAction(req,remove);expect(r.status).toBe(200);expect(await r.text()).toContain('method="post"');}
  expect(db.from).not.toHaveBeenCalled();
 });
 it('rejects malformed tokens before database access',async()=>{
  const r=await waitlistAction(new Request('https://solar-check.io/api/warteliste/bestaetigen?t=bad',{method:'POST'}),false);
  expect(r.status).toBe(400);expect(db.from).not.toHaveBeenCalled();
 });
 it('rejects cross-origin mutations',async()=>{
  const r=await waitlistAction(new Request('https://solar-check.io/api/warteliste/bestaetigen?t='+waitlistToken(),{method:'POST',headers:{origin:'https://other.example'}}),false);
  expect(r.status).toBe(403);expect(db.from).not.toHaveBeenCalled();
 });
});
