"use client";
import {useEffect,useId,useRef,useState,type ReactNode} from 'react';
import SecondaryButton from '../SecondaryButton';
import {createPortal} from 'react-dom';
import {IconSettings,IconClose} from '../Icons';
import foundation from '../social/atlas-foundations.module.css';
import styles from './WidgetSettingsFlyout.module.css';

/** Movable, non-modal settings keep the preview available while editing. */
export default function WidgetSettingsFlyout({title,children,wide=false,onClose}:{title:string;children:ReactNode;wide?:boolean;onClose?:()=>void}) {
  const id=useId();
  const [ready,setReady]=useState(false);
  useEffect(()=>setReady(true),[]);
  const trigger=useRef<HTMLButtonElement>(null);
  const panel=useRef<HTMLDivElement>(null);
  const drag=useRef<{x:number;y:number;left:number;top:number}|null>(null);
  const [position,setPosition]=useState<{left:number;top:number}|null>(null);
  const constrain=(left:number,top:number)=>({left:Math.max(8,Math.min(left,window.innerWidth-(panel.current?.offsetWidth??(wide?560:280))-8)),top:Math.max(8,Math.min(top,window.innerHeight-(panel.current?.offsetHeight??180)-8))});
  const close=()=>{onClose?.();setPosition(null);trigger.current?.focus({preventScroll:true});};
  useEffect(()=>{
    if(!position)return;
    panel.current?.focus({preventScroll:true});
    const resize=()=>setPosition(current=>current?constrain(current.left,current.top):null);
    resize();window.addEventListener('resize',resize);
    return()=>window.removeEventListener('resize',resize);
    // Focus only when the panel opens, not while it is dragged.
  },[!!position]);
  return <><SecondaryButton icon={<IconSettings size={16}/>} ref={trigger} disabled={!ready} type="button" className={styles.trigger} aria-label={`Einstellungen für ${title}`} aria-expanded={!!position} aria-controls={position?id:undefined} onClick={event=>{if(position){close();return;}const rect=event.currentTarget.getBoundingClientRect();setPosition(constrain(rect.left,rect.bottom+8));}}>Einstellungen</SecondaryButton>
    {position&&createPortal(<div id={id} ref={panel} role="dialog" aria-label={`Einstellungen für ${title}`} tabIndex={-1} className={`${foundation.foundation} ${styles.panel} ${wide?styles.wide:''}`} style={position} onKeyDown={event=>{if(event.key==='Escape'){event.stopPropagation();close();}}}>
      <header><button type="button" className={styles.handle} aria-label="Einstellungen verschieben" onPointerDown={event=>{if(event.button!==0)return;event.currentTarget.setPointerCapture(event.pointerId);drag.current={x:event.clientX,y:event.clientY,...position};}} onPointerMove={event=>{if(!drag.current)return;setPosition(constrain(drag.current.left+event.clientX-drag.current.x,drag.current.top+event.clientY-drag.current.y));}} onPointerUp={()=>{drag.current=null;}} onPointerCancel={()=>{drag.current=null;}} onKeyDown={event=>{const delta={ArrowLeft:[-16,0],ArrowRight:[16,0],ArrowUp:[0,-16],ArrowDown:[0,16]}[event.key];if(delta){event.preventDefault();setPosition(constrain(position.left+delta[0],position.top+delta[1]));}}}><IconSettings size={16}/><span>Einstellungen</span></button><button type="button" className={styles.close} aria-label="Einstellungen schließen" onClick={close}><IconClose size={16}/></button></header>
      <p>{title}</p>{children}
    </div>,document.body)}
  </>;
}
