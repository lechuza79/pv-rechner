import {readFileSync} from 'node:fs';
import {runInNewContext} from 'node:vm';
import {describe,expect,it} from 'vitest';

const script=readFileSync(new URL('../../public/widgets/resize.js',import.meta.url),'utf8');
function setup(){
 const listeners:Record<string,((event:any)=>void)[]>={};
 const requests:unknown[]=[];
 const frame={src:'https://widgets.example/embed/test',style:{height:'100px'},contentWindow:{postMessage:(...args:unknown[])=>requests.push(args)}};
 const window={addEventListener:(name:string,callback:(event:any)=>void)=>{(listeners[name]??=[]).push(callback);}};
 const context={window,document:{baseURI:'https://host.example',querySelectorAll:()=>[frame],addEventListener:()=>{}},URL,HTMLIFrameElement:class{}};
 runInNewContext(script,context);
 return {frame,listeners,context,requests,send:(data:unknown,origin='https://widgets.example',source:unknown=frame.contentWindow)=>listeners.message[0]({data,origin,source})};
}
describe('External embed resize',()=>{
 it('accepts a height only from the matching frame and origin',()=>{
  const host=setup();
  host.send({type:'widget:height',height:612.3});
  expect(host.frame.style.height).toBe('613px');
  host.send({type:'widget:height',height:999},'https://other.example');
  host.send({type:'widget:height',height:999},undefined,{});
  expect(host.frame.style.height).toBe('613px');
 });
 it('rejects invalid heights and ignores unrelated messages',()=>{
  const host=setup();
  for(const height of [NaN,Infinity,-1,0,100001,'600',null])host.send({type:'widget:height',height});
  host.send({type:'other',height:600});
  expect(host.frame.style.height).toBe('100px');
 });
 it('requests measurement and installs one handler across repeated includes',()=>{
  const host=setup();
  expect(host.requests).toHaveLength(1);
  runInNewContext(script,host.context);
  expect(host.listeners.message).toHaveLength(1);
  expect(host.requests).toHaveLength(1);
 });
});
