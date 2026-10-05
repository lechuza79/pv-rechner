"use client";
import { IconShare, IconCopy } from './Icons';
import ActionButton, { ActionLink } from './ActionButton';
import { iconSizes } from '../lib/theme';

/** Identical product actions for every calculator; content remains domain-specific. */
export default function AffiliateActions({ url, onForward, onCopy, onShopClick, allowReferrer = false, forwardLabel = 'Produkt weiterleiten' }: { url: string; onForward: () => void; onCopy: () => void; forwardLabel?: string; onShopClick?: () => void; allowReferrer?: boolean }) {
  return <div className="wp-product-actions">
    <ActionButton type="button" variant="secondary" className="wp-product-forward" data-collapse-label title={forwardLabel} onClick={onForward} aria-label={forwardLabel}><IconShare size={iconSizes.lg} /><span>Weiterleiten</span></ActionButton>
    <ActionLink variant="primary" className="wp-product-shop" href={url} onClick={onShopClick} target="_blank" rel={allowReferrer ? "nofollow sponsored noopener" : "nofollow sponsored noopener noreferrer"} referrerPolicy={allowReferrer ? "origin" : undefined}>Zum Shop</ActionLink>
    <ActionButton type="button" iconOnly className="wp-product-copy" aria-label="Produktlink kopieren" title="Produktlink kopieren" onClick={onCopy}><IconCopy size={iconSizes.lg} /></ActionButton>
  </div>;
}
