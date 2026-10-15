'use client';
import {createContext, useContext, useRef, useMemo, useState, useEffect, useCallback, useSyncExternalStore, type ReactNode} from 'react';
import {widgetBasisCss} from '../../lib/widget-basis-css';
import {createWidgetResourceStore, type WidgetSnapshots, type WidgetSnapshot} from '../../lib/widget-resource';
const basis=widgetBasisCss('[data-widget-host="dashboard"]','[data-widget-host="dashboard"]');
const fallback = createWidgetResourceStore();
const Context = createContext(fallback);
/** Server observations survive hydration; all children share requests and updates. */
export function WidgetDataProvider({snapshots, children}: {snapshots: WidgetSnapshots; children: ReactNode}) {
  const [store] = useState(() => createWidgetResourceStore(snapshots));
  useEffect(()=>store.seed(snapshots),[store,snapshots]);
  return <Context.Provider value={store}><style dangerouslySetInnerHTML={{__html:basis}}/>{children}</Context.Provider>;
}
export function useWidgetResource<T>(endpoint: string | null, defaultValue: T, ttl = 300_000, initialSnapshot?: WidgetSnapshot) {
  const store = useContext(Context);
  const supplied = useRef(initialSnapshot);
  useEffect(() => { supplied.current = initialSnapshot; }, [initialSnapshot]);
  const subscribe = useCallback((listener: () => void) => endpoint ? store.subscribe(endpoint, listener) : () => {}, [store, endpoint]);
  const read = useCallback(() => store.read(endpoint ?? ''), [store, endpoint]);
  // Hydration must use this instance's server observation, even when another
  // widget has already refreshed the shared endpoint before this one hydrates.
  const serverSnapshot = useMemo(() => initialSnapshot
    ? {...initialSnapshot, loading: false, error: null}
    : undefined, [initialSnapshot?.data, initialSnapshot?.fetchedAt, initialSnapshot?.refreshPending]);
  const readServer = useCallback(() => serverSnapshot ?? read(), [serverSnapshot, read]);
  const state = useSyncExternalStore(subscribe, read, readServer);
  const refetch = useCallback(() => { if (endpoint) void store.load(endpoint, ttl, true); }, [store, endpoint, ttl]);
  useEffect(() => {
    if (!endpoint) return;
    // Supplied values are observations, not an implicit switch to snapshot mode.
    // An unknown observation age stays stale and refreshes without blanking the chart.
    if (supplied.current && store.read(endpoint).data === undefined)
      store.seed({[endpoint]: supplied.current});
    void store.load(endpoint, ttl);
    const refresh = () => { if (!document.hidden) void store.load(endpoint, ttl); };
    const timer = setInterval(refresh, Math.min(ttl, 300_000));
    window.addEventListener('online', refresh);
    document.addEventListener('visibilitychange', refresh);
    return () => { clearInterval(timer); window.removeEventListener('online', refresh); document.removeEventListener('visibilitychange', refresh); };
  }, [endpoint, store, ttl]);
  useEffect(() => {
    if ((!state.error && !state.refreshPending) || !endpoint) return;
    const timer = setTimeout(() => { void store.load(endpoint, ttl, true); }, 8000);
    return () => clearTimeout(timer);
  }, [state, endpoint, store, ttl]);
  return {data: (state.data === undefined ? defaultValue : state.data) as T,
    loading: !!endpoint && state.data === undefined && !initialSnapshot && !state.error,
    error: state.error, fetchedAt: state.fetchedAt, isStale: state.data !== undefined && (!!state.error || Date.now() - state.fetchedAt >= ttl), refetch};
}
