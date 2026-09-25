import InfoTooltip from '../InfoTooltip';
import type {ReactNode, HTMLAttributes} from 'react';
import {WIDGET_COLUMNS, type WidgetKind} from '../../lib/dashboard/model';

export function WidgetFrame({title, headingMeta, kind, context, help, settings, settingsPlacement = 'header', children, className = '', ...attributes}: {
  title: string; headingMeta?: ReactNode; kind: WidgetKind; context?: ReactNode; help?: ReactNode; settings?:ReactNode; settingsPlacement?:'header'|'below-title';
  children: ReactNode; className?: string;
} & Omit<HTMLAttributes<HTMLElement>, 'title'>) {
  return <article {...attributes} className={`sc-widget ${className}`} data-columns={WIDGET_COLUMNS[kind]} data-widget-kind={kind}>
    <header className="sc-widget-head"><h4>{title}{headingMeta && <span className="sc-widget-heading-meta">{headingMeta}</span>}</h4><div className="sc-widget-tools">{settingsPlacement==='header'&&settings}{help&&<InfoTooltip ariaLabel={`Informationen zu ${title}`} size={16}>{help}</InfoTooltip>}</div></header>
    {settingsPlacement==='below-title'&&settings&&<div className="sc-widget-settings-row">{settings}</div>}
    {context && <div className="sc-widget-context">{context}</div>}
    <div className="sc-widget-body">{children}</div>
  </article>;
}
