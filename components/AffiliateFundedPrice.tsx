"use client";
import type { ReactNode } from "react";
import InfoTooltip from "./InfoTooltip";

/** Shared funded-price presentation; each calculator supplies its own assessment. */
export default function AffiliateFundedPrice({ amount, approximate = false, helpTitle, helpLabel, children, onDetails, emptyLabel }: {
  amount: string;
  emptyLabel?: string;
  approximate?: boolean;
  helpTitle: string;
  helpLabel: string;
  children: ReactNode;
  onDetails?: () => void;
}) {
  return <div className="wp-product-funded-price" data-empty={emptyLabel ? true : undefined}>
    {emptyLabel ? <div className="wp-funded-empty">{emptyLabel}</div> : <>
    <div className="wp-funded-amount"><strong>{approximate && <><small>ca.</small>{" "}</>}{amount} <small>€</small></strong></div>
    <div className="wp-funded-label"><span>mit Förderung</span></div>
    </>}
    <span className="wp-funded-help"><InfoTooltip ariaLabel={helpLabel} title={helpTitle}>{children}</InfoTooltip></span>
    {onDetails && <button type="button" className="wp-funded-footer" onClick={onDetails}>Förderung genau berechnen</button>}
  </div>;
}
