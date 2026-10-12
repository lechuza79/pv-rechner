import type {CSSProperties} from 'react';
import {chartMetadataLabel, type ChartMetadata} from '../../lib/chart-labels';

/** Shared export-only context for charts outside the dashboard frame. */
export function ChartExportMetadata({style, ...metadata}: ChartMetadata & {style?: CSSProperties}) {
  return <div data-sc-chart-metadata="" data-sc-export-only="block" style={{
    fontFamily:'var(--font-text)', fontSize:'var(--font-size-small)',
    fontWeight:400, lineHeight:1.5, color:'var(--color-text-secondary)',
    ...style, display:'none',
  }}>{chartMetadataLabel(metadata)}</div>;
}
