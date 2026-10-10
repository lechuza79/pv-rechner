import './dashboard.css';
import InfoTooltip from '../InfoTooltip';
import type {ReactNode, HTMLAttributes, Ref} from 'react';
import {WIDGET_COLUMNS, type WidgetKind} from '../../lib/dashboard/model';

export function WidgetFrame({showHeading = true, title, titleContent, eyebrow, subtitle, exportSubtitle, headingMeta, kind, context, help, helpExportNote = true, helpPlacement = 'tools', menu, settings, settingsPlacement = 'header', children, artwork, masthead, bodyAside, footer, className = '', ref, ...attributes}: {
  showHeading?: boolean;
  title: string; titleContent?: ReactNode; eyebrow?: ReactNode; subtitle?: ReactNode; exportSubtitle?: ReactNode; headingMeta?: ReactNode; kind: WidgetKind; context?: ReactNode; help?: ReactNode; settings?:ReactNode; settingsPlacement?:'header'|'below-title';
  children: ReactNode; artwork?:ReactNode; masthead?:ReactNode; bodyAside?:ReactNode; className?: string;
  /** 'title': the subject-matter help sits right beside the headline (charts with an options menu). */
  helpPlacement?: 'tools' | 'title' | 'menu';
  /** Disable when the export already carries the same explanation inline. */
  helpExportNote?: boolean;
  /** Options menu, top right. */
  menu?: ReactNode;
  /** Below the body: footer actions and image-only parts (see ExportableWidgetFrame). */
  footer?: ReactNode;
  ref?: Ref<HTMLElement>;
} & Omit<HTMLAttributes<HTMLElement>, 'title'>) {
  return <article {...attributes} ref={ref} className={`sc-widget sc-dashboard ${className}`} data-columns={WIDGET_COLUMNS[kind]} data-widget-kind={kind}>
    {artwork}
    {masthead}
    {showHeading && <header className="sc-widget-head"><h4>{eyebrow && <span className="sc-widget-eyebrow">{eyebrow}</span>}{titleContent ?? title}{help&&helpPlacement==='title'&&'\u00a0'}{help&&helpPlacement==='title'&&<span className="sc-widget-title-help"><InfoTooltip exportNote={helpExportNote} ariaLabel={`Informationen zu ${title}`} size={16}>{help}</InfoTooltip></span>}{subtitle && <span className="sc-widget-subtitle" data-sc-export-ignore={exportSubtitle ? "" : undefined}>{subtitle}</span>}{exportSubtitle && <span className="sc-widget-subtitle" data-sc-export-only="block" style={{display:"none"}}>{exportSubtitle}</span>}{headingMeta && <span className="sc-widget-heading-meta">{headingMeta}</span>}</h4><div className="sc-widget-tools">{settingsPlacement==='header'&&settings}{help&&helpPlacement==='tools'&&<InfoTooltip exportNote={helpExportNote} ariaLabel={`Informationen zu ${title}`} size={16}>{help}</InfoTooltip>}{menu}</div></header>}
    {settingsPlacement==='below-title'&&settings&&<div className="sc-widget-settings-row">{settings}</div>}
    {context && <div className="sc-widget-context">{context}</div>}
    <div className="sc-widget-body">{children}{bodyAside}</div>
    {footer}
  </article>;
}
