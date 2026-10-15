import {prepareNodeCapture, type ExportContext} from './chart-export';

/** Compatibility entry: downloads use the designed export with the visible theme. */
export function prepareDownloadSnapshot(node: HTMLElement, _context?: ExportContext, size?: {width:number;height:number}) {
  return prepareNodeCapture(node, 'export', size, false, true);
}
