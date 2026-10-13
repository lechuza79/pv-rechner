import {deflateSync, strToU8} from 'fflate';
import type {DashboardConfiguration} from './widget-dashboard';

/** Compact URL transport; the server still validates the reconstructed configuration. */
export function encodeDashboardConfiguration(configuration:DashboardConfiguration):string {
  const raw=JSON.stringify(configuration);
  if(raw.length>24000)throw new Error('Dashboard configuration too large');
  const bytes=deflateSync(strToU8(raw),{level:6});
  const encoded=btoa(String.fromCharCode(...bytes)).replaceAll('+','-').replaceAll('/','_').replace(/=+$/,'');
  if(encoded.length>8000)throw new Error('Dashboard link too large');
  return `z1.${encoded}`;
}
