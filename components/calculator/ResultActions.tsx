"use client";
import { useEffect, useRef, useState } from 'react';
import { IconShare, IconCopy, IconCheck, IconWhatsApp, IconRefresh } from '../Icons';
import { iconSizes } from '../../lib/theme';

import ActionButton from '../ActionButton';

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
  return <div ref={anchor} data-sticky={sticky} className={`wp-result-actionbar${stuck ? ' is-stuck' : ''}`} role="region" aria-label="Ergebnisaktionen">
    <div className="wp-result-actionbar-inner">
      <div className="wp-result-actionbar-secondary">
        <ActionButton type="button" variant="secondary" onClick={onForward}><IconShare size={iconSizes.md} /> Weiterleiten</ActionButton>
        <div className="wp-action-icons">
          <ActionButton type="button" onClick={onCopy} aria-label="Link zu diesem Ergebnis kopieren" title="Link kopieren" iconOnly active={copied}>{copied ? <IconCheck size={iconSizes.md} /> : <IconCopy size={iconSizes.md} />}</ActionButton>
          <ActionButton type="button" onClick={onWhatsApp} aria-label="Ergebnis per WhatsApp teilen" title="WhatsApp" iconOnly><IconWhatsApp size={iconSizes.md} /></ActionButton>
          <ActionButton type="button" onClick={onReset} aria-label="Neu berechnen" title="Neu berechnen" iconOnly><IconRefresh size={iconSizes.md} /></ActionButton>
        </div>
      </div>
      <ActionButton type="button" variant="primary" className="wp-action-save" onClick={onSave} disabled={saveDisabled}>{saveLabel}</ActionButton>
      <span className="wp-actionbar-status" role="status">{copied ? 'Link kopiert' : ''}</span>
    </div>
  </div>;
}
