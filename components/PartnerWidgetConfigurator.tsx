'use client';
import {useEffect, useRef, useState, type CSSProperties} from 'react';
import AutoHeightIframe from './AutoHeightIframe';
import ActionButton from './ActionButton';
import SelectField from './SelectField';
import Logo from './Logo';
import OptionalDisclosure from './OptionalDisclosure';
import {IconCheck, IconCopy} from './Icons';
import {tokens} from '../lib/theme';
import {partnerEmbedCode, PARTNER_EMBED_WIDTHS, type PartnerEmbedWidth} from '../lib/partner-embed-code';
import {PARTNER_WIDGET_HEIGHTS, type PartnerWidgetHeight, type WidgetHeaderMode} from '../lib/widget-brand';
import styles from './PartnerWidgetConfigurator.module.css';

/** Configures the existing public renderer; choices belong to each copied embed. */
export default function PartnerWidgetConfigurator({partner, label}: {partner: string; label: string}) {
  const [width, setWidth] = useState<PartnerEmbedWidth>(720);
  const [widgetHeight, setWidgetHeight] = useState<PartnerWidgetHeight>(720);
  const [header, setHeader] = useState<WidgetHeaderMode>('full');
  const [measured, setMeasured] = useState<{key:string; height:number}>();
  const previewKey = [header, width, widgetHeight].join('-');
  const actualHeight = measured?.key === previewKey ? measured.height : undefined;
  const removedHeight = actualHeight === undefined ? undefined : widgetHeight - actualHeight;
  const [copied, setCopied] = useState(false);
  const [failed, setFailed] = useState(false);
  const [codeOpen, setCodeOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const codeField = useRef<HTMLTextAreaElement>(null);
  const revision = useRef(0);
  const code = partnerEmbedCode(partner, 'regional-annual-growth', header, 'https://solar-check.io', width, widgetHeight, actualHeight ?? widgetHeight);
  useEffect(() => { revision.current++; setCopied(false); setFailed(false); }, [code]);
  useEffect(() => {
    if (failed) { codeField.current?.focus(); codeField.current?.select(); }
  }, [failed]);
  useEffect(() => {
    if (!copied) return;
    const timer = setTimeout(() => setCopied(false), 2400);
    return () => clearTimeout(timer);
  }, [copied]);
  async function copy() {
    const current = revision.current;
    setBusy(true);
    let timeout: ReturnType<typeof setTimeout> | undefined;
    try {
      await Promise.race([
        navigator.clipboard.writeText(code),
        new Promise<never>((_, reject) => { timeout = setTimeout(() => reject(new Error('Clipboard timeout')), 1500); }),
      ]);
      if (current === revision.current) { setCopied(true); setFailed(false); }
    } catch {
      if (current === revision.current) {
        setCodeOpen(true);
        setFailed(true);
      }
    } finally { clearTimeout(timeout); setBusy(false); }
  }
  return <main className={styles.page} style={tokens as CSSProperties}>
    <header className={styles.heading}>
      <a href="https://solar-check.io" aria-label="Solar Check"><Logo variant="result"/></a>
      <p>{label}</p>
      <h1>Widget einbetten</h1>
      <p>Darstellung wählen, Vorschau prüfen und den Code auf Ihrer Website einfügen.</p>
    </header>
    <div className={styles.workspace}>
    <aside className={styles.sidebar} aria-label="Widget-Einstellungen">
    <section className={styles.settings} aria-label="Darstellung">
      <div><label htmlFor="partner-width">Maximale Breite</label>
        <SelectField id="partner-width" ariaLabel="Maximale Breite" value={width} onChange={e => setWidth(Number(e.target.value) as PartnerEmbedWidth)} block>
          {PARTNER_EMBED_WIDTHS.map(value => <option key={value} value={value}>{value} px</option>)}
        </SelectField>
      </div>
      <div><label htmlFor="partner-height">Widget-Höhe</label>
        <SelectField id="partner-height" ariaLabel="Widget-Höhe" value={widgetHeight} onChange={e => setWidgetHeight(Number(e.target.value) as PartnerWidgetHeight)} block>
          {PARTNER_WIDGET_HEIGHTS.map(value => <option key={value} value={value}>{value === 600 ? "Kompakt" : value === 720 ? "Standard" : "Groß"} {removedHeight !== undefined && <>· {Math.round(value - removedHeight)} px</>}</option>)}
        </SelectField>
      </div>
      <div><label htmlFor="partner-header">Kopfbereich</label>
        <SelectField id="partner-header" ariaLabel="Kopfbereich" value={header} onChange={e => setHeader(e.target.value as WidgetHeaderMode)} block>
          <option value="full">Logo und Überschrift</option>
          <option value="title">Nur Überschrift</option>
          <option value="none">Ohne Kopfbereich</option>
        </SelectField>
      </div>
      <div className={styles.code}>
        <OptionalDisclosure label="Einbettungscode anzeigen" open={codeOpen} onOpenChange={setCodeOpen}
          action={<ActionButton variant="primary" onClick={copy} disabled={busy || actualHeight === undefined} aria-label={copied ? 'Code kopiert' : 'Einbettungscode kopieren'} aria-live="polite">
            {copied ? <IconCheck/> : <IconCopy/>}{copied ? 'Code kopiert' : 'Code kopieren'}
          </ActionButton>}>
          <textarea ref={codeField} aria-label="Einbettungscode" readOnly value={code} spellCheck={false}/>
          {failed && <p role="status">Kopieren war nicht möglich. Der Code ist zum manuellen Kopieren markiert.</p>}
        </OptionalDisclosure>
      </div>
      <p className={styles.hint}>Auf schmaleren Bildschirmen passt sich die Breite an. Ohne Kopfbereich wird die Kachel entsprechend kürzer.</p>
    </section>
    </aside>
    <section aria-label="Vorschau" className={styles.preview}>
      <h2>Vorschau</h2>
      <div className={styles.frame} style={{maxWidth: width}}>
        <AutoHeightIframe key={previewKey} onHeightChange={height => setMeasured(previous => previous?.key === previewKey && previous.height === height ? previous : {key:previewKey,height})} src={`/embed/partner/${partner}/regional-annual-growth/${header}${widgetHeight === 720 ? '' : '/' + widgetHeight}`} title="Vorschau: Zubau pro Jahr" fallbackHeight={widgetHeight} framed={false} loading="eager"/>
      </div>
    </section>
    </div>
  </main>;
}
