'use client';
import {useEffect,useState} from 'react';
import AtomHeroPreviews from '../../../../components/energy/AtomHeroPreviews';
import WidgetPresentation from '../../../../components/dashboard/WidgetPresentation';
import {loadTrade} from '../../../../lib/electricity-trade-client';
import type {TradeResult} from '../../../../lib/electricity-trade';
import type {StrommixYtd} from '../../../../lib/strommix-ytd';
import type {NuclearImportResponse} from '../../../../lib/nuclear-import';
export default function Preview({ytd,nuclear,asOf}:{ytd:StrommixYtd|null;nuclear:NuclearImportResponse|null;asOf:string}){
 const [trade,setTrade]=useState<TradeResult|null>(null);
 useEffect(()=>{let active=true;loadTrade(`/api/energy/trade?period=year&year=${asOf.slice(0,4)}`).then(data=>{if(active)setTrade(data);}).catch(()=>{});return()=>{active=false;};},[asOf]);
 return <WidgetPresentation appearance={{theme:'dark',sharing:'off'}}><AtomHeroPreviews ytd={ytd} nuclear={nuclear} trade={trade} asOf={asOf} targets={{share:'#atom-anteil',daily:'#atom-import',trade:'#stromhandel'}}/></WidgetPresentation>;
}
