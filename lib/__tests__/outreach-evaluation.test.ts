import { describe,it,expect } from "vitest";
import { evaluateOutreach, type OutreachEvaluationInput, type ActionReview } from "../outreach-evaluation";
const source={id:'mail:1',kind:'mail' as const,text:'Ich habe daraus eine Pressemitteilung gemacht. Vielen Dank.',from:'person@amt.de',subject:'Antwort',observedAt:'2026-09-14',eventAt:'2026-09-13'};
const target={organizationId:'ort',name:'Ort',contactedAt:'2026-09-01',campaign:'mail',currentMailbox:'heute@ort.de',sentTo:null,sentMessageId:null,pagePath:'/solar-atlas/land/kreis/ort'};
const review:ActionReview={organizationId:'ort',sourceId:source.id,action:'material-prepared',quote:'Ich habe daraus eine Pressemitteilung gemacht.',reviewedBy:'primary-source-review',reviewedAt:'2026-09-14',scope:'own-message',actorMailbox:'person@amt.de'};
const input=():OutreachEvaluationInput=>({targets:[target],sources:[source],actions:[review],recipients:[],analytics:[]});
describe('outreach actions, not titles',()=>{
 it('retains subscriptions independently of communication actions and rejects incomplete cohorts',()=>{
   const i=input();i.actions=[];
   i.subscriptions={status:"read",observedAt:"2026-09-15",current:{confirmed:1,pending:0},rows:[{organizationId:"ort",confirmed:1,pending:0,confirmedViaLetter:1,confirmedWithAdministrationClaim:null,confirmedViaLetterWithAdministrationClaim:null}]};
   const r=evaluateOutreach(i);expect(r.summary.subscriptions.confirmed).toBe(1);expect(r.rows[0].observedActions).toEqual([]);expect(r.rows[0].mailboxCapabilities).toEqual([]);
   i.subscriptions.rows=[];expect(()=>evaluateOutreach(i)).toThrow("exact cohort");
 });
 it('does not turn preparation into distribution or publication, regardless of title',()=>{
   const r=evaluateOutreach(input());expect(r.rows[0].observedActions).toEqual(['material-prepared']);expect(r.summary.organizationsByObservedAction.publication).toBe(0);
   expect(r.rows[0].mailboxCapabilities[0].mailbox).toBe('person@amt.de');
 });
 it('does not replace unknown original recipient with current profile or responder',()=>{
   expect(evaluateOutreach(input()).rows[0].dispatchEvidence).toBe('original-recipient-unknown');
 });
 it('counts organizations once when several real replies exist and deduplicates same source',()=>{
   const i=input();i.sources.push({...source,id:'mail:2'});i.actions=[{...review,action:'response'}, {...review,action:'response'}, {...review,sourceId:'mail:2',action:'response'}];
   const r=evaluateOutreach(i);expect(r.summary.organizationsByObservedAction.response).toBe(1);expect(r.summary.uniqueReplyMessages).toBe(2);
 });
 it('does not convert a referrer or a claim in an email into verified publication',()=>{
   const i=input();i.actions=[];i.analytics=[{organizationId:'ort',since:'2026-09-01',until:'2026-09-15',status:'read',groups:[{referrer:'facebook.com',visitors:40,pageviews:40}]}];
   expect(evaluateOutreach(i).summary.organizationsByObservedAction.publication).toBe(0);
   i.actions=[{...review,action:'publication',channel:'municipal'}];expect(()=>evaluateOutreach(i)).toThrow('public page');
 });
 it('keeps publication independent of whether a direct reply was observed',()=>{
   const i=input();i.sources=[{id:'page:1',kind:'page',url:'https://ort.de/solar',publisher:'Gemeinde Ort',text:'Solar Check Rangliste',observedAt:'2026-09-14',eventAt:null}];i.actions=[{...review,sourceId:'page:1',action:'publication',scope:'public-page',quote:'Solar Check Rangliste',channel:'municipal',actorMailbox:null}];
   const r=evaluateOutreach(i);expect(r.summary.organizationsByObservedAction.response).toBe(0);expect(r.summary.organizationsByObservedAction.publication).toBe(1);
   i.actions[0].actorMailbox='invented@ort.de';expect(()=>evaluateOutreach(i)).toThrow('actor mailbox');
   i.actions[0].actorMailbox=null;i.targets=[{...target,contactedAt:'2026-09-13T15:00:00Z'}];i.sources[0].eventAt='2026-09-13';expect(()=>evaluateOutreach(i)).not.toThrow();
   i.sources[0].eventAt='2026-09-12';expect(()=>evaluateOutreach(i)).toThrow('predates');
   i.sources[0].eventAt='invalid';expect(()=>evaluateOutreach(i)).toThrow('Invalid event');
 });
 it('rejects quotations mistaken for own replies but retains explicit forwarded history',()=>{
   const i=input();i.sources=[{...source,text:'Vielen Dank.\nVon: Zentrale\nIch habe daraus eine Pressemitteilung gemacht.'}];expect(()=>evaluateOutreach(i)).toThrow('history');
   i.actions=[{...review,action:'internal-forward',scope:'quoted-history',actorMailbox:null}];expect(evaluateOutreach(i).rows[0].observedActions).toEqual(['internal-forward']);
 });
 it('rejects automatic replies, invented quotations, actor mailboxes and duplicate identities',()=>{
   const i=input();i.sources=[{...source,subject:'Automatische Antwort'}];i.actions=[{...review,action:'response'}];expect(()=>evaluateOutreach(i)).toThrow('genuine reply');
   expect(()=>evaluateOutreach({...input(),actions:[{...review,quote:'Ich habe es verteilt.'}]})).toThrow('absent');
   expect(()=>evaluateOutreach({...input(),actions:[{...review,actorMailbox:'chef@ort.de'}]})).toThrow('Actor');
   expect(()=>evaluateOutreach({...input(),targets:[target,target]})).toThrow('Duplicate');
 });
 it('does not credit a forwarded recipient with sending the forward',()=>{
   const i=input();const text='Von: Zentrale <sender@ort.de>\nAn: Person <recipient@ort.de>\nBetreff: WG: Solar';
   i.sources=[{...source,text}];i.actions=[{...review,quote:text,scope:'quoted-history',action:'internal-forward',actorMailbox:'recipient@ort.de'}];
   expect(()=>evaluateOutreach(i)).toThrow('quoted sender');i.actions[0].actorMailbox='ender@ort.de';expect(()=>evaluateOutreach(i)).toThrow('quoted sender');i.actions[0].actorMailbox='sender@ort.de';expect(()=>evaluateOutreach(i)).not.toThrow();
 });
 it('keeps unknown and failed analytics separate from measured empty traffic',()=>{
   const i=input();i.analytics=[{organizationId:'ort',since:'2026-09-01',until:'2026-09-15',status:'failed',groups:[],error:'Forbidden'}];
   expect(evaluateOutreach(i).summary.analyticsFailedOrUnavailable).toBe(1);
   i.analytics[0].status='read';expect(evaluateOutreach(i).summary.analyticsRead).toBe(1);
 });
});
