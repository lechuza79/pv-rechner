import type {ReactNode} from 'react';
import Switch from './Switch';
import styles from './ControlPanel.module.css';
/** Shared configuration fields with optional enable and reset actions. */
export function ControlPanel({children}:{children:ReactNode}){return <div className={styles.panel}>{children}</div>}
export function ControlField({label,children,onReset,toggle}:{label:string;children?:ReactNode;onReset?:()=>void;toggle?:{enabled:boolean;onChange:(enabled:boolean)=>void;label?:string}}){
 return <div className={styles.field}>
  <div className={styles.heading}><span>{label}</span>{onReset&&<button type="button" className={styles.reset} aria-label={`${label} zurücksetzen`} onClick={onReset}>Reset</button>}</div>
  <div className={styles.body}>{toggle&&<div className={styles.toggle}><Switch an={toggle.enabled} onChange={toggle.onChange} label={toggle.label??label} text={toggle.enabled?'An':'Aus'}/></div>}
  {children}</div>
 </div>;
}
