'use client';
import {createContext, useCallback, useContext} from 'react';

/** Renderers report content minima; the composition still owns placement. */
export const WidgetMinimumHeightContext = createContext<{
  id: string;
  report: (id: string, height: number) => void;
} | null>(null);

export function useWidgetMinimumHeight() {
  const context = useContext(WidgetMinimumHeightContext);
  const id = context?.id, report = context?.report;
  return useCallback((height: number) => {
    if (id && report) report(id, Math.ceil(height));
  }, [id, report]);
}
