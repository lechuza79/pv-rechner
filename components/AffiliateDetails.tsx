import type { ReactNode } from 'react';
import { IconChevronDown } from './Icons';
import { iconSizes } from '../lib/theme';

/** Product details use the same disclosure on each calculator. */
export default function AffiliateDetails({ children, title = "Details" }: { children: ReactNode; title?: string }) {
  return <details className="wp-card-disclosure wp-card-specs"><summary><span>{title}</span><IconChevronDown size={iconSizes.sm} /></summary>{children}</details>;
}
