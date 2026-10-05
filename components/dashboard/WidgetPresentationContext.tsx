'use client';
import {createContext,useContext,type ReactNode} from 'react';
import type {WidgetAppearance} from '../../lib/widget-appearance';
const PresentationContext=createContext<WidgetAppearance>({});
/** Optional host configuration; existing consumers retain their own defaults. */
export function WidgetPresentationProvider({appearance,children}:{appearance:WidgetAppearance;children:ReactNode}) {
 return <PresentationContext.Provider value={appearance}>{children}</PresentationContext.Provider>;
}
export function useWidgetPresentation(){return useContext(PresentationContext);}
