'use client';
import {createContext, useContext, type ReactNode} from 'react';
import type {WidgetAppearance} from '../../lib/widget-appearance';
type WidgetHost = {instanceId?:string;query: Record<string, string>; appearance: WidgetAppearance};
const Context = createContext<WidgetHost | null>(null);
export const useWidgetHost = () => useContext(Context);
/** Scope configuration to one widget instead of mutating its containing document. */
export function WidgetHostProvider({instanceId, query, appearance, children}: WidgetHost & {children: ReactNode}) {
  return <Context.Provider value={{instanceId, query, appearance}}>{children}</Context.Provider>;
}

/** Place selection belongs to the host configuration, never to public widget controls. */
export function useWidgetPlace(defaultPlace:string){
 return useWidgetHost()?.query.ags??defaultPlace;
}
