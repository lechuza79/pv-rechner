import {describe,expect,it} from 'vitest';
import {renderToStaticMarkup} from 'react-dom/server';
import {readFileSync} from 'node:fs';
import {WidgetSetting} from '../../components/dashboard/WidgetSetting';
import {WidgetPresetButtons,WidgetIconButton,widgetDayLabel} from '../../components/dashboard/WidgetControls';

const options=[{value:'2026-09',label:'September 2026'},{value:'2026-08',label:'August 2026'},{value:'2026-07',label:'Juli 2026'}];
const disabled=(html:string,label:string)=>new RegExp(`<button[^>]*aria-label="${label}"[^>]*disabled`).test(html);
const setting=(value:string,extra:Partial<Parameters<typeof WidgetSetting>[0]>={})=>renderToStaticMarkup(<WidgetSetting label="Monat" value={value} onChange={()=>{}} options={options} stepper {...extra}/>);

describe('Shared widget controls',()=>{
 it('retains quick-period actions and exposes the active preset',()=>{
  let selected='7d';
  const control=WidgetPresetButtons({label:'Zeitraum',value:selected,options:[{value:'24h',label:'24 Std'},{value:'7d',label:'7 Tage'}],onChange:value=>{selected=value}});
  control.props.children[0].props.onClick();
  expect(selected).toBe('24h');
  const html=renderToStaticMarkup(control);
  expect(html).toContain('aria-pressed="true">7 Tage');
  expect(html).toContain('aria-pressed="false">24 Std');
 });
 it('stops reverse-ordered calendar navigation at its real month boundaries',()=>{
  const latest=setting('2026-09'),oldest=setting('2026-07'),middle=setting('2026-08');
  expect(disabled(latest,'Vorheriger Zeitraum')).toBe(false);
  expect(disabled(latest,'Nächster Zeitraum')).toBe(true);
  expect(disabled(oldest,'Vorheriger Zeitraum')).toBe(true);
  expect(disabled(oldest,'Nächster Zeitraum')).toBe(false);
  expect(disabled(middle,'Vorheriger Zeitraum')).toBe(false);
  expect(disabled(middle,'Nächster Zeitraum')).toBe(false);
  expect(latest).toContain('<option value="2026-09" selected="">September 2026</option>');
 });
 it('allows cyclic navigation while disabling empty, singleton and invalid selections',()=>{
  const loop=setting('2026-09',{loop:true});
  expect(disabled(loop,'Nächster Zeitraum')).toBe(false);
  for(const html of [setting('2026-09',{options:options.slice(0,1)}),setting('',{options:[]}),setting('missing')]){
   expect(disabled(html,'Vorheriger Zeitraum')).toBe(true);
   expect(disabled(html,'Nächster Zeitraum')).toBe(true);
  }
 });
 it('uses forward list order for non-calendar selections',()=>{
  const first=setting('2026-09',{order:'ascending'}),last=setting('2026-07',{order:'ascending'});
  expect(disabled(first,'Vorheriger Zeitraum')).toBe(true);
  expect(disabled(first,'Nächster Zeitraum')).toBe(false);
  expect(disabled(last,'Vorheriger Zeitraum')).toBe(false);
  expect(disabled(last,'Nächster Zeitraum')).toBe(true);
 });
 it('retains the separate Hero-stage shell',()=>{
  expect(setting('2026-09',{variant:'hero'})).toContain('class="sc-setting-stepper"');
  expect(setting('2026-09')).not.toContain('class="sc-setting-stepper"');
 });
 it('never labels a selected non-peak day as the best day',()=>{
  const format=(date:string)=>`Date ${date}`;
  expect(widgetDayLabel('2026-09-03','2026-09-12',true,format)).toBe('Date 2026-09-03');
  expect(widgetDayLabel('2026-09-03','2026-09-12',false,format)).toBe('Date 2026-09-03');
  expect(widgetDayLabel('2026-09-12','2026-09-12',false,format)).toBe('Bester Tag');
  expect(widgetDayLabel('2026-09-12','2026-09-12',true,format)).toBe('Date 2026-09-12');
 });
 it('preserves accessible playback state and forwards the action handler',()=>{
  let paused=false;
  const button=WidgetIconButton({label:'Wiedergabe pausieren','aria-pressed':true,onClick:()=>{paused=true},children:'Pause'});
  button.props.onClick();
  expect(paused).toBe(true);
  const html=renderToStaticMarkup(button);
  expect(html).toContain('aria-label="Wiedergabe pausieren"');
  expect(html).toContain('aria-pressed="true"');
  expect(html).toContain('type="button"');
 });
 it('only expands compact controls when the consumer explicitly opts in',()=>{
  const normal=renderToStaticMarkup(<WidgetIconButton label="Back" size="xs">Back</WidgetIconButton>);
  const responsive=renderToStaticMarkup(<WidgetIconButton label="Back" size="xs" expandOnWide>Back</WidgetIconButton>);
  expect(normal).not.toContain('data-expand-on-wide');
  expect(responsive).toContain('data-expand-on-wide="true"');
 });
 it('keeps the monthly consumer on actual shared instances rather than local button styling',()=>{
  const source=readFileSync('components/gemeinde/MonitorMonthlySolarChart.tsx','utf8');
  expect(source).toContain('<WidgetStepper');
  expect(source.match(/<WidgetIconButton /g)).toHaveLength(2);
  const css=readFileSync('components/gemeinde/MonitorMonthlySolarChart.module.css','utf8');
  expect(css).not.toContain('.dayControls');
  expect(css).not.toContain('.transport button');
 });
});
