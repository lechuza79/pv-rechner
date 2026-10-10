'use client';
import type {ComponentProps} from 'react';
import {ExportableWidgetFrame} from '../dashboard/ExportableWidgetFrame';
import {WidgetPresentationProvider,useWidgetPresentation} from '../dashboard/WidgetPresentationContext';
import type {WidgetSettings} from '../../lib/widget-settings';
import styles from './EnergyWidgetFrame.module.css';

/** Legacy embed settings adapt to the same frame and actions as every new widget. */
export default function EnergyWidgetFrame({settings,children,...props}:Omit<ComponentProps<typeof ExportableWidgetFrame>,'settings'>&{settings:WidgetSettings}) {
 const appearance=useWidgetPresentation();
 return <WidgetPresentationProvider appearance={{...appearance,sharing:settings.share?appearance.sharing:'off'}}>
  <ExportableWidgetFrame {...props} data-story-scheme={appearance.theme==='hero'?'highlight':appearance.theme??'light'} settings={undefined} className={styles.frame} sourceVisible={!settings.onsite} exportNote={null}>
   <div className={styles.body}>{children}</div>
  </ExportableWidgetFrame>
 </WidgetPresentationProvider>;
}
