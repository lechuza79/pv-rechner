"use client";
import {useState} from 'react';
import type {GalleryEntry} from '../../lib/widget-gallery';
import type {WidgetTheme,WidgetSharing} from '../../lib/widget-appearance';
import {ControlPanel,ControlField} from '../ControlPanel';
import SelectField from '../SelectField';
import WidgetPreviewCard from './WidgetPreviewCard';
import foundation from '../social/atlas-foundations.module.css';
import styles from './WidgetConfigurationGroup.module.css';

/** Shared defaults apply until a card explicitly overrides an option. */
export default function WidgetConfigurationGroup({entries,title,id,description,surfaceScheme}:{entries:GalleryEntry[];title?:string;id?:string;description?:string;surfaceScheme?:'light'|'dark'}) {
  const [theme,setTheme]=useState<WidgetTheme>('dark');
  const [background,setBackground]=useState(true);
  const [sharing,setSharing]=useState<WidgetSharing>('on');
  return <section data-story-scheme={surfaceScheme} id={id} aria-label={title??'Widget-Kombination'} className={`${foundation.foundation} ${styles.group}`}>
    {title&&<h2 className={styles.title}>{title}</h2>}{description&&<p>{description}</p>}
    <div className={styles.settings}><ControlPanel>
      <ControlField label="Theme" onReset={theme!=='dark'?()=>setTheme('dark'):undefined}><SelectField ariaLabel="Theme für alle Widgets" value={theme} onChange={e=>setTheme(e.target.value as WidgetTheme)}><option value="light">Hell</option><option value="dark">Dunkel</option><option value="hero">Hero</option></SelectField></ControlField>
      <ControlField label="Hintergrundbilder" onReset={!background?()=>setBackground(true):undefined} toggle={{enabled:background,onChange:setBackground}}/>
      <ControlField label="Teilen" onReset={sharing!=='on'?()=>setSharing('on'):undefined} toggle={{enabled:sharing!=='off',onChange:enabled=>setSharing(enabled?'on':'off')}}>
        {sharing!=='off'&&<SelectField ariaLabel="Teilen-Darstellung für alle Widgets" value={sharing==='on'?'secondary':sharing} onChange={e=>setSharing(e.target.value as WidgetSharing)}><option value="secondary">Secondary · Optionsmenü</option><option value="primary">Primary</option></SelectField>}
      </ControlField>
    </ControlPanel></div>
    <div className={styles.grid}>{entries.map(entry=><WidgetPreviewCard key={entry.id} entry={entry} defaults={{theme,background,sharing}}/>)}</div>
  </section>;
}
