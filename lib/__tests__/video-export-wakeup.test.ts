import { beforeEach, describe, expect, it, vi } from 'vitest';
const db=vi.hoisted(()=>({callVideoFn:vi.fn(),videoBackend:vi.fn()}));
vi.mock('../video-export-db',()=>db);
import {wakeVideoWorker} from '../video-export-wakeup';
beforeEach(()=>{vi.restoreAllMocks();vi.unstubAllEnvs();vi.unstubAllGlobals();db.videoBackend.mockReturnValue('supabase');db.callVideoFn.mockReset();vi.spyOn(console,'error').mockImplementation(()=>{});});
describe('shared video worker dispatch',()=>{
 it('does not dispatch without credentials or in a local pilot',async()=>{
  vi.stubEnv('VIDEO_EXPORT_DISPATCH_TOKEN','');
  const fetcher=vi.fn();vi.stubGlobal('fetch',fetcher);
  expect(await wakeVideoWorker()).toBe(false);
  vi.stubEnv('VIDEO_EXPORT_DISPATCH_TOKEN','test-only');db.videoBackend.mockReturnValue('local');
  expect(await wakeVideoWorker()).toBe(false);expect(fetcher).not.toHaveBeenCalled();expect(db.callVideoFn).not.toHaveBeenCalled();
 });
 it('coalesces requests before reaching GitHub',async()=>{
  vi.stubEnv('VIDEO_EXPORT_DISPATCH_TOKEN','test-only');db.callVideoFn.mockResolvedValue({dispatch:false});
  const fetcher=vi.fn();vi.stubGlobal('fetch',fetcher);
  expect(await wakeVideoWorker()).toBe(true);expect(fetcher).not.toHaveBeenCalled();
 });
 it.each([200,204])('dispatches only the fixed worker on main (HTTP %s)',async(status)=>{
  vi.stubEnv('VIDEO_EXPORT_DISPATCH_TOKEN','test-only');db.callVideoFn.mockResolvedValue({dispatch:true});
  const fetcher=vi.fn().mockResolvedValue({status});vi.stubGlobal('fetch',fetcher);
  expect(await wakeVideoWorker()).toBe(true);
  expect(fetcher).toHaveBeenCalledWith('https://api.github.com/repos/lechuza79/pv-rechner/actions/workflows/video-export.yml/dispatches',expect.objectContaining({method:'POST',body:'{"ref":"main"}',redirect:'error'}));
 });
 it('retains accepted jobs when dispatch fails and never logs credentials',async()=>{
  vi.stubEnv('VIDEO_EXPORT_DISPATCH_TOKEN','test-only');db.callVideoFn.mockResolvedValue({dispatch:true});
  vi.stubGlobal('fetch',vi.fn().mockRejectedValue(new Error('test-only')));
  expect(await wakeVideoWorker()).toBe(false);expect(db.callVideoFn).toHaveBeenCalledTimes(1);
  expect(console.error).toHaveBeenCalledWith('video-export wakeup failed; queued job retained');
 });
});
