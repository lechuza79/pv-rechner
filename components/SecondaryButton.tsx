"use client";
import type {ComponentPropsWithRef,ReactNode} from 'react';
import {v} from '../lib/theme';
export const secondaryButtonStyle = {
  padding:"10px 20px",borderRadius:v("--radius-pill"),fontSize:v("--font-size-body"),
  fontWeight:600,background:"transparent",border:`1px solid ${v("--color-border-muted")}`,
  color:v("--color-text-secondary"),cursor:"pointer",
} as const;
/** Shared secondary action; hover and focus belong to the global theme. */
export default function SecondaryButton({icon,children,className='',style,...props}:ComponentPropsWithRef<'button'>&{icon?:ReactNode}) {
  return <button type="button" {...props} className={`sc-button-secondary ${className}`} style={{...secondaryButtonStyle,display:'inline-flex',alignItems:'center',justifyContent:'center',gap:8,...style}}>{icon}{children}</button>;
}
