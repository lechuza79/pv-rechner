import InfoTooltip from '../InfoTooltip';
import type {ReactNode, HTMLAttributes, Ref} from 'react';
import {WIDGET_COLUMNS, type WidgetKind} from '../../lib/dashboard/model';

export function WidgetFrame({title, headingMeta, kind, context, help, helpPlacement = 'tools', menu, settings, settingsPlacement = 'header', children, footer, className = '', ref, ...attributes}: {
  title: string; headingMeta?: ReactNode; kind: WidgetKind; context?: ReactNode; help?: ReactNode; settings?:ReactNode; settingsPlacement?:'header'|'below-title';
  children: ReactNode; className?: string;
  /** 'title': the subject-matter help sits right beside the headline (charts with an options menu). */
  helpPlacement?: 'tools' | 'title';
  /** Options menu, top right. */
  menu?: ReactNode;
  /** Below the body: footer actions and image-only parts (see ExportableWidgetFrame). */
  footer?: ReactNode;
  ref?: Ref<HTMLElement>;
} & Omit<HTMLAttributes<HTMLElement>, 'title'>) {
  return <article {...attributes} ref={ref} className={`sc-widget ${className}`} data-columns={WIDGET_COLUMNS[kind]} data-widget-kind={kind}>
    <header className="sc-widget-head"><h4>{title}{help&&helpPlacement==='title'&&<span className="sc-widget-title-help"><InfoTooltip ariaLabel={`Informationen zu ${title}`} size={16}>{help}</InfoTooltip></span>}{headingMeta && <span className="sc-widget-heading-meta">{headingMeta}</span>}</h4><div className="sc-widget-tools">{settingsPlacement==='header'&&settings}{help&&helpPlacement==='tools'&&<InfoTooltip ariaLabel={`Informationen zu ${title}`} size={16}>{help}</InfoTooltip>}{menu}</div></header>
    {settingsPlacement==='below-title'&&settings&&<div className="sc-widget-settings-row">{settings}</div>}
    {context && <div className="sc-widget-context">{context}</div>}
    <div className="sc-widget-body">{children}</div>
    {footer}
  </article>;
}
