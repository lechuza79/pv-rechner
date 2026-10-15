import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest';
import {mkdtemp, rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import type {DashboardConfiguration} from '../widget-dashboard';
const database = vi.hoisted(() => ({from: vi.fn()}));
vi.mock('../supabase-server', () => ({supabase: database}));
import {loadWidgetDashboard, saveWidgetDashboard} from '../widget-dashboard-store.server';
let directory: string;
const config: DashboardConfiguration = {version: 1, sections: [{id: 'test', title: 'Test', root: {id: 'trade', label: 'Trade', widgetId: 'stromhandel'}}], sources: {trade: '/embed/stromhandel?period=seven'}, appearance: {theme: 'dark'}};
beforeEach(async () => {
  directory = await mkdtemp(join(tmpdir(), 'widget-store-test-'));
  vi.spyOn(process, 'cwd').mockReturnValue(directory);
  vi.stubEnv('NODE_ENV', 'production');
  vi.stubEnv('WIDGET_PREVIEW_DATA', 'live');
  vi.stubEnv('VERCEL', '');
});
afterEach(async () => { vi.restoreAllMocks(); vi.unstubAllEnvs(); database.from.mockReset(); await rm(directory, {recursive: true, force: true}); });
describe('built preview dashboard persistence', () => {
  it('saves and reopens immutable versions without writing to the live database', async () => {
    const first = await saveWidgetDashboard(config);
    const second = await saveWidgetDashboard({...config, appearance: {theme: 'light'}});
    expect(first).not.toBe(second);
    expect(await loadWidgetDashboard(first)).toEqual(config);
    expect((await loadWidgetDashboard(second))?.appearance).toEqual({theme: 'light'});
    expect(database.from).not.toHaveBeenCalled();
  });
  it('rejects invalid configurations and traversal without touching the database', async () => {
    await expect(saveWidgetDashboard({...config, sources: {trade: 'https://example.com'}})).rejects.toThrow();
    expect(await loadWidgetDashboard('../secret')).toBeNull();
    expect(await loadWidgetDashboard('11111111-1111-4111-8111-111111111111')).toBeNull();
    expect(database.from).not.toHaveBeenCalled();
  });
  it('never selects local preview storage on the deployed application', async () => {
    vi.stubEnv('VERCEL', '1');
    database.from.mockReturnValue({insert: vi.fn().mockResolvedValue({error: null})});
    await saveWidgetDashboard(config);
    expect(database.from).toHaveBeenCalledWith('widget_dashboards');
  });
});
