"use client";
import {WIDGET_MAX_WIDTH} from '../../lib/widget-registry';
import {useState} from 'react';
import {useSearchParams} from 'next/navigation';
import {StrommixRadarEmbed} from './StrommixRadarWidget';
import StrommixWidget from '../StrommixWidget';
import {useWidgetTheme} from '../../lib/useWidgetTheme';
import {WIDGET_SETTINGS_DEFAULTS} from '../../lib/widget-settings';
import {WidgetPresentationProvider} from '../dashboard/WidgetPresentationContext';
export default function StrommixEmbed() {
 const params=useSearchParams();
 const [range,setRange]=useState(params.get('range')??'7d');
 const [settings,setSettings]=useState(WIDGET_SETTINGS_DEFAULTS);
 useWidgetTheme({onSettings:partial=>{setSettings(previous=>({...previous,...partial}));if(partial.range)setRange(partial.range);}});
 return <WidgetPresentationProvider appearance={{sharing:settings.share?'on':'off'}}>
  <div style={{maxWidth:WIDGET_MAX_WIDTH,width:"100%",margin:"0 auto"}}>{params.get('darstellung')==='radar'?<StrommixRadarEmbed/>:<StrommixWidget onsite={settings.onsite} switchable={settings.switchable} range={range} branding={settings.branding} embed={settings.embed}/>}</div>
 </WidgetPresentationProvider>;
}
