import { space } from '../lib/theme';
import ContactPerson from './ContactPerson';
import type { ReactNode } from 'react';

/** The calculator product promise, portrait and disclosure share one layout. */
export default function AffiliateTrust({ promise, disclosure, seller, id }: { promise: ReactNode; disclosure: ReactNode; seller?: ReactNode; id?: string }) {
  return <div id={id} className="wp-product-trust" style={id ? { scrollMarginTop: 100 } : undefined}>
    <ContactPerson beforeName={<span className="wp-product-promise"><strong>Mein Versprechen:</strong> {promise}</span>} />
    <p className="wp-product-disclosure">{disclosure}</p>
    {seller && <p className="wp-product-seller" style={{ margin: `${space.sm}px 0 0` }}>{seller}</p>}
  </div>;
}
