import signals from './trust-signals.json';

/** Current Hero Stage trust block; text and source links are kept together. */
export default function HeroTrustBox() {
  return <section className="sc-trust" aria-label="Unsere Grundlagen"><div className="sc-trust-grid">
    {signals.map(signal => {
      let cursor = 0;
      const text: React.ReactNode[] = [];
      for (const link of signal.links) {
        const index = signal.text.indexOf(link.begriff, cursor);
        if (index < 0) continue;
        text.push(signal.text.slice(cursor, index), <a key={link.url} href={link.url}>{link.begriff}</a>);
        cursor = index + link.begriff.length;
      }
      text.push(signal.text.slice(cursor));
      return <div className="sc-trust-item" key={signal.motif}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={`/design/trust/${signal.motif}.svg`} width={48} height={48} alt="" />
        <h3>{signal.titel}</h3><p>{text}</p>
        {signal.mehr && <a className="sc-trust-more" href={signal.href}>Mehr erfahren ↗</a>}
      </div>;
    })}
  </div></section>;
}
