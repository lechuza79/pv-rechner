"use client";
import {useWidgetResource} from '../components/dashboard/WidgetData';
export type CachedFetchState<T> = {data:T; loading:boolean; error:string|null; isStale:boolean; refetch:()=>void};
export type CachedFetchOptions = {longLived?:boolean; keyPrefix?:string};
/** Compatibility API; all consumers use the same request store and initial data. */
export function useCachedFetch<T>(endpoint:string|null, _cacheKey:string, defaultValue:T, options:CachedFetchOptions={}):CachedFetchState<T> {
 return useWidgetResource(endpoint, defaultValue, options.longLived ? 24*60*60_000 : 300_000);
}
