"use client";
import {WIDGET_MAX_WIDTH,WIDGETS} from '../../lib/widget-registry';
import {useWidgetHost} from '../dashboard/WidgetHost';
import {WidgetNextStep} from '../WidgetExport';
import {useState} from 'react';
import {useSearchParams} from 'next/navigation';
import StrommixWidget from '../StrommixWidget';
import {useWidgetTheme} from '../../lib/useWidgetTheme';
import {WIDGET_SETTINGS_DEFAULTS} from '../../lib/widget-settings';
import {WidgetPresentationProvider,useWidgetPresentation} from '../dashboard/WidgetPresentationContext';
export default function StrommixEmbed() {
 const appearance=useWidgetPresentation();
 const host=useWidgetHost();
 const allocated=appearance.layout==='allocated';
 const params=useSearchParams();
 const [range,setRange]=useState(params.get('range')??'7d');
 const [settings,setSettings]=useState(WIDGET_SETTINGS_DEFAULTS);
 useWidgetTheme({onSettings:partial=>{setSettings(previous=>({...previous,...partial}));if(partial.range)setRange(partial.range);}});
 return <WidgetPresentationProvider appearance={{...appearance,sharing:settings.share?appearance.sharing:'off'}}>
  <div style={{maxWidth:WIDGET_MAX_WIDTH,width:"100%",margin:"0 auto",...(allocated?{height:"100%",minHeight:0,display:"flex",flexDirection:"column"} as const:{})}}><StrommixWidget onsite={settings.onsite} switchable={settings.switchable} range={range} branding={settings.branding} embed={settings.embed}/>
  {!host&&!appearance.partner&&<div data-sc-export-ignore="" style={{padding:"14px 24px"}}><WidgetNextStep widget={WIDGETS.strommix}/></div>}</div>
 </WidgetPresentationProvider>;
}
