"use client";
import { IconShare, IconExternal, IconCopy } from './Icons';
import { iconSizes } from '../lib/theme';

/** Identical product actions for every calculator; content remains domain-specific. */
export default function AffiliateActions({ url, onForward, onCopy, onShopClick, allowReferrer = false, forwardLabel = 'Produkt weiterleiten' }: { url: string; onForward: () => void; onCopy: () => void; forwardLabel?: string; onShopClick?: () => void; allowReferrer?: boolean }) {
  return <div className="wp-product-actions">
    <button type="button" className="wp-product-forward" onClick={onForward} aria-label={forwardLabel}><IconShare size={iconSizes.lg} /> Weiterleiten</button>
    <a className="wp-product-shop" href={url} onClick={onShopClick} target="_blank" rel={allowReferrer ? "nofollow sponsored noopener" : "nofollow sponsored noopener noreferrer"} referrerPolicy={allowReferrer ? "origin" : undefined}>Zum Shop <IconExternal size={iconSizes.md} /></a>
    <button type="button" className="wp-product-copy" aria-label="Produktlink kopieren" title="Produktlink kopieren" onClick={onCopy}><IconCopy size={iconSizes.lg} /></button>
  </div>;
}
