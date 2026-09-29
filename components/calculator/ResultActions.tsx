"use client";
import { useEffect, useRef, useState } from 'react';
import { IconShare, IconCopy, IconCheck, IconWhatsApp, IconRefresh } from '../Icons';
import { v, iconSizes } from '../../lib/theme';

/** The accepted WP action row, shared by calculator result pages. */
export default function ResultActions({ onForward, onCopy, onWhatsApp, onReset, onSave, sticky = true, copied = false, saveLabel = "Speichern", saveDisabled = false }: {
  onForward: () => void; onCopy: () => void; onWhatsApp: () => void; onReset: () => void; onSave: () => void; sticky?: boolean; copied?: boolean; saveLabel?: string; saveDisabled?: boolean;
}) {
  const anchor = useRef<HTMLDivElement>(null);
  const [stuck, setStuck] = useState(false);
  useEffect(() => {
    const update = () => { const el = anchor.current; if (el && sticky) setStuck(el.getBoundingClientRect().top <= parseFloat(getComputedStyle(el).top) + 1); };
    update(); window.addEventListener('scroll', update, { passive: true }); window.addEventListener('resize', update);
    return () => { window.removeEventListener('scroll', update); window.removeEventListener('resize', update); };
  }, [sticky]);
  const iconStyle = (aktiv?: boolean) => ({
    width: 40, height: 40, borderRadius: v('--radius-pill'), cursor: "pointer" as const,
    background: aktiv ? v('--color-accent-dim') : v('--color-bg'),
    border: `1px solid ${aktiv ? v('--color-accent') : v('--color-border-accent')}`,
    color: v('--color-accent'),
    display: "flex" as const, alignItems: "center" as const, justifyContent: "center" as const,
    flexShrink: 0 as const, transition: "all 0.2s",
  });
  return <div ref={anchor} data-sticky={sticky} className={`wp-result-actionbar${stuck ? ' is-stuck' : ''}`} role="region" aria-label="Ergebnisaktionen">
    <div className="wp-result-actionbar-inner">
      <div className="wp-result-actionbar-secondary">
        <button type="button" className="wp-forward-secondary" onClick={onForward}><IconShare size={iconSizes.md} /> Weiterleiten</button>
        <div className="wp-result-share">
          <button type="button" onClick={onCopy} aria-label="Link zu diesem Ergebnis kopieren" title="Link kopieren" style={iconStyle(copied)}>{copied ? <IconCheck size={iconSizes.md} /> : <IconCopy size={iconSizes.md} />}</button>
          <button type="button" onClick={onWhatsApp} aria-label="Ergebnis per WhatsApp teilen" title="WhatsApp" style={iconStyle()}><IconWhatsApp size={iconSizes.md} /></button>
          <button type="button" onClick={onReset} aria-label="Neu berechnen" title="Neu berechnen" style={iconStyle()}><IconRefresh size={iconSizes.md} /></button>
        </div>
      </div>
      <button type="button" className="wp-save-primary" onClick={onSave} disabled={saveDisabled}>{saveLabel}</button>
      <span className="wp-actionbar-status" role="status">{copied ? 'Link kopiert' : ''}</span>
    </div>
  </div>;
}
