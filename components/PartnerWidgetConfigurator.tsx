'use client';
import {useEffect, useRef, useState, type CSSProperties} from 'react';
import AutoHeightIframe from './AutoHeightIframe';
import ActionButton from './ActionButton';
import SelectField from './SelectField';
import Logo from './Logo';
import OptionalDisclosure from './OptionalDisclosure';
import {ModalSticky} from './Modal';
import {IconCheck, IconCopy} from './Icons';
import {tokens} from '../lib/theme';
import {embedCode} from '../lib/embed-code';
import {widgetPresentationContract} from '../lib/widget-appearance';
import {partnerEmbedCode, PARTNER_EMBED_WIDTHS, type PartnerEmbedWidth} from '../lib/partner-embed-code';
import {PARTNER_WIDGET_HEIGHTS, type PartnerWidgetHeight, type WidgetHeaderMode} from '../lib/widget-brand';
import styles from './PartnerWidgetConfigurator.module.css';

/** Configures the existing public renderer; choices belong to each copied embed. */
type EmbedWidget = {id: string; src: string; params?: Record<string,string>; title: string};
export default function PartnerWidgetConfigurator({partner, label, widget}: {partner?: string; label?: string; widget?: EmbedWidget}) {
  const [width, setWidth] = useState<PartnerEmbedWidth>(720);
  const [widgetHeight, setWidgetHeight] = useState<number>(720);
  const [header, setHeader] = useState<WidgetHeaderMode>('full');
  const [measured, setMeasured] = useState<{key:string; height:number}>();
  const compactHeight = widget ? widgetPresentationContract(widget.id,'compact')?.minAllocatedHeight : undefined;
  const compact = !!widget && compactHeight !== undefined && widgetHeight === compactHeight;
  const minimumHeight = widget ? widgetPresentationContract(widget.id,compact ? 'compact' : 'full')?.minAllocatedHeight ?? 0 : 0;
  const heights = widget ? [compactHeight ?? Math.max(600,minimumHeight),720,840] : PARTNER_WIDGET_HEIGHTS;
  const frameHeight = Math.max(widgetHeight, minimumHeight);
  const embedParams = widget ? {...widget.params, ...(compact ? {presentation:'compact'} : {}), layout:'allocated'} : undefined;
  const previewSource = widget ? `${widget.src}?${new URLSearchParams(embedParams).toString()}` : '';
  const previewKey = [header, width, widgetHeight, previewSource].join('-');
  const actualHeight = measured?.key === previewKey ? measured.height : undefined;
  const removedHeight = actualHeight === undefined ? undefined : widgetHeight - actualHeight;
  const [copied, setCopied] = useState(false);
  const [failed, setFailed] = useState(false);
  const [codeOpen, setCodeOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const codeField = useRef<HTMLTextAreaElement>(null);
  const revision = useRef(0);
  const code = widget
    ? embedCode({src:widget.src, params:embedParams, width, height:frameHeight, resize:'fixed', titel:widget.title, siteUrl:'https://solar-check.io', attribution:null})
    : partnerEmbedCode(partner!, 'regional-annual-growth', header, 'https://solar-check.io', width, widgetHeight as PartnerWidgetHeight, actualHeight ?? widgetHeight);
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
  const copyButton = <ActionButton variant="primary" onClick={copy} disabled={busy || (!widget && actualHeight === undefined)} aria-label={copied ? 'Code kopiert' : 'Einbettungscode kopieren'} aria-live="polite">
            {copied ? <IconCheck/> : <IconCopy/>}{copied ? 'Code kopiert' : 'Code kopieren'}
          </ActionButton>;
  const content = <div className={`${styles.workspace} ${widget ? styles.dialogWorkspace : ''}`} style={widget ? tokens as CSSProperties : undefined}>
    <aside className={styles.sidebar} aria-label="Widget-Einstellungen">
    <section className={styles.settings} aria-label="Darstellung">
      <div><label htmlFor="partner-width">Maximale Breite</label>
        <SelectField id="partner-width" ariaLabel="Maximale Breite" value={width} onChange={e => setWidth(Number(e.target.value) as PartnerEmbedWidth)} block>
          {PARTNER_EMBED_WIDTHS.map(value => <option key={value} value={value}>{value} px</option>)}
        </SelectField>
      </div>
      <div><label htmlFor="partner-height">Widget-Höhe</label>
        <SelectField id="partner-height" ariaLabel="Widget-Höhe" value={widgetHeight} onChange={e => setWidgetHeight(Number(e.target.value) as PartnerWidgetHeight)} block>
          {heights.map((value,index) => <option key={value} value={value}>{['Kompakt','Standard','Groß'][index]} {widget ? `· ${value} px` : removedHeight !== undefined && <>· {Math.round(value - removedHeight)} px</>}</option>)}
        </SelectField>
      </div>
      {!widget && <div><label htmlFor="partner-header">Kopfbereich</label>
        <SelectField id="partner-header" ariaLabel="Kopfbereich" value={header} onChange={e => setHeader(e.target.value as WidgetHeaderMode)} block>
          <option value="full">Logo und Überschrift</option>
          <option value="title">Nur Überschrift</option>
          <option value="none">Ohne Kopfbereich</option>
        </SelectField>
      </div>}
      <div className={styles.code}>
        <OptionalDisclosure label="Einbettungscode anzeigen" open={codeOpen} onOpenChange={setCodeOpen}
          action={widget ? undefined : copyButton}>
          <textarea ref={codeField} aria-label="Einbettungscode" readOnly value={code} spellCheck={false}/>
          {failed && <p role="status">Kopieren war nicht möglich. Der Code ist zum manuellen Kopieren markiert.</p>}
        </OptionalDisclosure>
      </div>
      <p className={styles.hint}>{widget ? "Auf schmaleren Bildschirmen passt sich die Breite an. Quelle und Solar Check bleiben Teil der Grafik." : "Auf schmaleren Bildschirmen passt sich die Breite an. Ohne Kopfbereich wird die Kachel entsprechend kürzer."}</p>
    </section>
    </aside>
    <section aria-label="Vorschau" className={styles.preview}>
      <h2>Vorschau</h2>
      <div className={styles.frame} style={{maxWidth: width}}>
        {widget ? <iframe key={previewSource} src={previewSource} title={`Vorschau: ${widget.title}`} style={{width:'100%',height:frameHeight,border:0,display:'block'}} loading="eager"/> : <AutoHeightIframe key={previewKey} onHeightChange={height => setMeasured(previous => previous?.key === previewKey && previous.height === height ? previous : {key:previewKey,height})} src={`/embed/partner/${partner}/regional-annual-growth/${header}${widgetHeight === 720 ? '' : '/' + widgetHeight}`} title="Vorschau: Zubau pro Jahr" fallbackHeight={widgetHeight} framed={false} loading="eager"/>}
      </div>
    </section>
    </div>
  ;
  if (widget) return <>{content}<ModalSticky><div className={styles.dialogActions} style={tokens as CSSProperties}>{copyButton}<a href="/widget-nutzungsbedingungen" target="_blank" rel="noopener">Nutzungsbedingungen</a></div></ModalSticky></>;
  return <main className={styles.page} style={tokens as CSSProperties}>
    <header className={styles.heading}>
      <a href="https://solar-check.io" aria-label="Solar Check"><Logo variant="result"/></a>
      <p>{label}</p><h1>Widget einbetten</h1>
      <p>Darstellung wählen, Vorschau prüfen und den Code auf Ihrer Website einfügen.</p>
    </header>
    {content}
  </main>;
}
