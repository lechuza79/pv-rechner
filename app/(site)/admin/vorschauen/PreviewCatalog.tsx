'use client';

import { useState } from 'react';
import entries from '../../../../lib/design-previews.json';
import SelectField from '../../../../components/SelectField';
import { v } from '../../../../lib/theme';

export default function PreviewCatalog() {
  const [query, setQuery] = useState('');
  const [group, setGroup] = useState('Alle');
  const groups = ['Alle', ...new Set(entries.map(entry => entry.group))];
  const shown = entries.filter(entry => (group === 'Alle' || entry.group === group) &&
    `${entry.title} ${entry.description} ${entry.group}`.toLocaleLowerCase('de').includes(query.toLocaleLowerCase('de')));
  return <>
    <p style={{ color: v('--color-text-muted'), lineHeight: 1.6 }}>
      Entwürfe und Referenzstände aus den Solar-Check-Sessions. Beim Öffnen startet der lokale Vorschau-Starter den passenden Server auf deinem Mac.
    </p>
    <p style={{ fontSize: v('--font-size-small'), color: v('--color-text-muted') }}>
      Die lokalen Vorschauen sind auf dem Mac mit den gespeicherten Entwürfen verfügbar. Eine Freigabe hier bedeutet noch keine Veröffentlichung.
    </p>
    <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', margin: '24px 0' }}>
      <input aria-label="Vorschauen suchen" placeholder="Vorschauen suchen …" value={query} onChange={event => setQuery(event.target.value)}
        style={{ flex: '1 1 220px', padding: 12, border: `1px solid ${v('--color-border')}`, borderRadius: 10, background: v('--color-bg'), color: v('--color-text-primary') }} />
      <SelectField ariaLabel="Bereich" value={group} onChange={event => setGroup(event.target.value)} maxWidth={240}>
        {groups.map(value => <option key={value}>{value}</option>)}
      </SelectField>
    </div>
    <p role="status" style={{ fontSize: v('--font-size-small'), color: v('--color-text-muted') }}>{shown.length} von {entries.length} Vorschauen</p>
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 280px), 1fr))', gap: 16 }}>
      {shown.map(entry => <article key={entry.id} style={{ border: `1px solid ${v('--color-border')}`, background: v('--color-bg'), borderRadius: 16, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
        <a href={`http://localhost:4299/open/${entry.id}`} target="_blank" rel="noopener noreferrer" aria-label={`${entry.title} öffnen`}
          style={{ display: 'block', position: 'relative', aspectRatio: '16 / 9', overflow: 'hidden', background: v('--color-border'), borderBottom: `1px solid ${v('--color-border')}` }}>
          {entry.thumbnail ? <img src={entry.thumbnail} alt={`Miniatur: ${entry.title}`} width={800} height={450} loading="lazy" decoding="async"
            style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'top', display: 'block' }} /> :
            <span style={{ display: 'grid', height: '100%', placeContent: 'center', textAlign: 'center', padding: 24, color: v('--color-text-muted'), gap: 8 }}>
              <span aria-hidden="true" style={{ fontSize: v('--font-size-h2') }}>▧</span><span>{entry.thumbnailNote}</span>
            </span>}
        </a>
        <div style={{ padding: 22, display: 'flex', flexDirection: 'column', flex: 1 }}>
        <small style={{ color: v('--color-text-muted') }}>{entry.group} · {entry.status}</small>
        <h2 style={{ fontSize: v('--font-size-h3'), margin: '12px 0 8px' }}>{entry.title}</h2>
        <p style={{ color: v('--color-text-muted'), lineHeight: 1.5, flex: 1 }}>{entry.description}</p>
        <a href={`http://localhost:4299/open/${entry.id}`} target="_blank" rel="noopener noreferrer" style={{ color: v('--color-accent'), fontWeight: 700 }}>Vorschau öffnen ↗</a>
        </div>
      </article>)}
    </div>
    {shown.length === 0 && <p>Keine passende Vorschau. Ändere die Suche oder den Bereich.</p>}
    <p style={{ fontSize: v('--font-size-small'), marginTop: 24 }}><a href="http://localhost:4299/" target="_blank" rel="noopener noreferrer">Lokalen Vorschau-Starter öffnen ↗</a></p>
  </>;
}
