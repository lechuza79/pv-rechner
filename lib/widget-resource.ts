/** Shared request identity and in-memory stale-while-revalidate store. No browser storage. */
export type WidgetSnapshot = {data: unknown; fetchedAt: number; refreshPending?: boolean};
export type WidgetSnapshots = Record<string, WidgetSnapshot>;
export function widgetResourceKey(endpoint: string) {
  const url = new URL(endpoint, 'https://solar-check.io');
  url.searchParams.sort();
  return url.pathname + url.search;
}
export type ResourceState = {data?: unknown; fetchedAt: number; loading: boolean; error: string | null; refreshPending?: boolean};
const EMPTY: ResourceState = {fetchedAt: 0, loading: false, error: null};
export function createWidgetResourceStore(initial: WidgetSnapshots = {}) {
  const values = new Map<string, ResourceState>(Object.entries(initial).map(([key, value]) => [widgetResourceKey(key), {...value, loading: false, error: null}]));
  const pending = new Map<string, Promise<void>>();
  const listeners = new Map<string, Set<() => void>>();
  const read = (key: string) => values.get(widgetResourceKey(key)) ?? EMPTY;
  const publish = (key: string, state: ResourceState) => {
    values.set(key, state);
    listeners.get(key)?.forEach(listener => listener());
  };
  return {
    /** Seed newly prepared instances without replacing fresher observations or the shared store. */
    seed(snapshots:WidgetSnapshots){
      for(const [endpoint,snapshot] of Object.entries(snapshots)){
        const key=widgetResourceKey(endpoint),current=read(key);
        if(current.data===undefined||snapshot.fetchedAt>current.fetchedAt)publish(key,{...snapshot,loading:false,error:null});
      }
    },
    read,
    subscribe(endpoint: string, listener: () => void) {
      const key = widgetResourceKey(endpoint);
      const group = listeners.get(key) ?? new Set();
      listeners.set(key, group); group.add(listener);
      return () => { group.delete(listener); if (!group.size) listeners.delete(key); };
    },
    async load(endpoint: string, ttl = 300_000, force = false) {
      const key = widgetResourceKey(endpoint);
      if (pending.has(key)) return pending.get(key);
      const before = read(key);
      if (!force && before.data !== undefined && Date.now() - before.fetchedAt < ttl) return;
      const request = (async () => {
        publish(key, {...before, loading: before.data === undefined, error: null});
        try {
          const response = await fetch(key, {signal: AbortSignal.timeout(65_000)});
          if (!response.ok) throw new Error(`Daten gerade nicht verfügbar (${response.status}).`);
          const data = await response.json();
          if (data === null || (typeof data === 'object' && 'error' in data)) throw new Error('Daten gerade nicht verfügbar.');
          const observedAt=Number(response.headers.get('X-Widget-Data-Fetched-At'));
          const fetchedAt=Number.isFinite(observedAt)&&observedAt>0&&observedAt<=Date.now()?observedAt:Date.now();
          publish(key, {data, fetchedAt, refreshPending:response.headers.get('X-Widget-Data-Stale')==='1', loading: false, error: null});
        } catch (error) {
          publish(key, {...before, loading: false, error: error instanceof Error ? error.message : 'Daten gerade nicht verfügbar.'});
        } finally { pending.delete(key); }
      })();
      pending.set(key, request);
      return request;
    },
  };
}
