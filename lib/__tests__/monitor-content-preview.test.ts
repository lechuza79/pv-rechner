import {afterEach,expect,it,vi} from 'vitest';
import {monitorContentForPreview} from '../monitor-content-preview';
afterEach(()=>vi.unstubAllEnvs());
it('limits a local storage outage to unavailable monitor data',async()=>{
  vi.stubEnv('NODE_ENV','development');
  const content=await monitorContentForPreview(Promise.reject(new Error('read timeout')));
  expect(content.prepared).toEqual({state:'unavailable',reason:'read-error'});
  expect(content.monitor.status).toBe('unavailable');
  expect(content.monitor.energy).toBeNull();
});
it('keeps production regeneration failures rejected to retain the last good page',async()=>{
  vi.stubEnv('NODE_ENV','production');
  const error=new Error('read timeout');
  await expect(monitorContentForPreview(Promise.reject(error))).rejects.toBe(error);
});
