import {afterEach, expect, it, vi} from 'vitest';
import {mkdtemp, readdir, rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {isLocalStoryDesignEnvironment} from '../story-design-local';
import {readStoryDesignSnapshot, writeStoryDesignSnapshot, type StoryDesignSnapshot} from '../story-design-store';
import * as designs from '../../app/api/admin/story-design/route';
import * as patterns from '../../app/api/admin/story-text-pattern/route';

vi.mock('../admin-guard', () => ({isAdminSession: () => {throw new Error('Hosted requests must stop before authentication or storage');}}));
afterEach(() => vi.unstubAllEnvs());

it.each(['production', 'vercel-preview'])('blocks both routes and direct storage in %s', async mode => {
  vi.stubEnv('NODE_ENV', mode === 'production' ? 'production' : 'development');
  vi.stubEnv('VERCEL', mode === 'vercel-preview' ? '1' : '');
  expect(isLocalStoryDesignEnvironment()).toBe(false);
  const request = new Request('https://example.test/api/admin/story-design?id=' + 'a'.repeat(64));
  expect((await designs.GET(request)).status).toBe(404);
  expect((await designs.POST(request)).status).toBe(404);
  expect((await patterns.GET()).status).toBe(404);
  expect((await patterns.POST(request)).status).toBe(404);
  const directory = await mkdtemp(path.join(tmpdir(), 'story-local-boundary-'));
  try {
    await expect(readStoryDesignSnapshot('a'.repeat(64), directory)).rejects.toThrow('local development only');
    await expect(writeStoryDesignSnapshot({} as StoryDesignSnapshot, directory)).rejects.toThrow('local development only');
    expect(await readdir(directory)).toEqual([]);
  } finally { await rm(directory, {recursive:true, force:true}); }
});

it('keeps local development available', () => {
  vi.stubEnv('NODE_ENV', 'development');
  vi.stubEnv('VERCEL', '');
  expect(isLocalStoryDesignEnvironment()).toBe(true);
});
