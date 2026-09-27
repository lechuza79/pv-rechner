import type {ReactNode} from 'react';
import './data-sources-section.css';
/** Shared quiet attribution section between trust and footer. */
export default function DataSourcesSection({children}:{children:ReactNode}){
 return <section className="sc-data-sources" aria-label="Daten und Quellen"><h2>Daten &amp; Quellen</h2><div>{children}</div></section>;
}
