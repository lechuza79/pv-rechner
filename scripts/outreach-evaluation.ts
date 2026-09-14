/** Read-only collection and local, reviewed outcome analysis. Never sends mail,
 * mutates outreach status or changes the concurrently running contact crawl. */
import { readFileSync, writeFileSync, mkdirSync, existsSync, readdirSync } from "node:fs";
import { resolve } from "node:path";
import { createClient } from "@supabase/supabase-js";
import { aggregat, ereignisseJeName } from "../lib/web-analytics";
import { evaluateOutreach, type EvaluationTarget, type PageAnalytics, type OutreachEvaluationInput } from "../lib/outreach-evaluation";
import { heuteInBerlin } from "../lib/zeit";
const arg=(key:string)=>process.argv.find(a=>a.startsWith(`--${key}=`))?.slice(key.length+3);
const read=(path:string)=>JSON.parse(readFileSync(resolve(path),"utf8"));
const save=(path:string,value:unknown)=>writeFileSync(path,JSON.stringify(value,null,2),{mode:0o600});
async function collect(directory:string) {
  for(const line of readFileSync(resolve(".env.local"),"utf8").split("\n")){
    const m=line.match(/^([A-Z0-9_]+)=(.*)$/);if(m&&!process.env[m[1]])process.env[m[1]]=m[2].replace(/^["']|["']$/g,"");
  }
  const db=createClient(process.env.SUPABASE_URL??process.env.NEXT_PUBLIC_SUPABASE_URL!,process.env.SUPABASE_SERVICE_KEY!,{auth:{persistSession:false}});
  type Region={region_id:string;name:string;slug:string|null;parent_region_id:string|null};
  const regions=new Map<string,Region>();
  for(let from=0;;from+=1000){
    const {data,error}=await db.from("mastr_regions").select("region_id,name,slug,parent_region_id").order("region_id").range(from,from+999);
    if(error)throw error;for(const row of data??[])regions.set(row.region_id,row);
    if(!data||data.length<1000)break;
  }
  const pathFor=(id:string)=>{
    const parts:string[]=[];const seen=new Set<string>();let cursor:string|null=id;
    while(cursor&&cursor!=="de"){
      if(seen.has(cursor))return null;seen.add(cursor);
      const region:Region|undefined=regions.get(cursor);if(!region?.slug)return null;
      parts.unshift(region.slug);cursor=region.parent_region_id;
    }
    return parts.length===3?`/solar-atlas/${parts.join("/")}`:null;
  };
  const targets:EvaluationTarget[]=[];
  for(let from=0;;from+=1000){
    const {data,error}=await db.from("kommunen_kontakt").select("region_id,contacted_at,kampagne,rollen_email,sent_to,sent_message_id").not("contacted_at","is",null).order("region_id").range(from,from+999);
    if(error)throw error;
    for(const r of data??[])targets.push({organizationId:r.region_id,name:regions.get(r.region_id)?.name??r.region_id,contactedAt:r.contacted_at!,campaign:r.kampagne,currentMailbox:r.rollen_email,sentTo:r.sent_to,sentMessageId:r.sent_message_id,pagePath:pathFor(r.region_id)});
    if(!data||data.length<1000)break;
  }
  const capturedAt=new Date().toISOString();
  const until=heuteInBerlin(new Date(Date.now()+86400000));
  const analytics:PageAnalytics[]=[];let next=0;
  await Promise.all(Array.from({length:4},async()=>{
    while(next<targets.length){
      const target=targets[next++];
      const row:PageAnalytics={organizationId:target.organizationId,since:target.contactedAt.slice(0,10),until,status:target.pagePath?"failed":"missing-path",groups:[]};
      if(target.pagePath){
        try{
          const groups=await aggregat({datensatz:"visits",zeitraum:{seit:row.since,bis:until},nach:["referrerHostname"],filter:`requestPath eq '${target.pagePath.replace(/'/g,"''")}'`,limit:100});
          row.status="read";row.groups=groups.map(g=>({referrer:String(g.referrerHostname??""),visitors:Number(g.visitors??0),pageviews:typeof g.pageviews==="number"?g.pageviews:typeof g.count==="number"?g.count:null}));
        }catch(e){row.error=String(e).slice(0,250);}
      }
      analytics.push(row);
      if(analytics.length%25===0)console.log(`Analytics read for ${analytics.length}/${targets.length} records`);
    }
  }));
  let globalEvents:unknown=null;let eventError:string|null=null;
  try{globalEvents=await ereignisseJeName({seit:"2026-08-27",bis:until});}catch(e){eventError=String(e).slice(0,250);}
  const snapshot={capturedAt,finishedAt:new Date().toISOString(),targets,analytics,globalEvents,eventError,
    limits:["Per-page queries include the sending calendar day, not just time after sending.","Today's day is partial; until is an exclusive next-day boundary.","Referrer visitors can overlap; do not sum them into unique people.","Global email-origin events cannot be joined to individual municipalities."]};
  save(resolve(directory,"snapshot.json"),snapshot);return snapshot;
}
const actionNames={response:"Echte Antwort","internal-forward":"Intern weitergegeben","material-prepared":"Meldung aufbereitet","press-distributed":"Presseverteilung belegt",publication:"Veröffentlichung belegt"};
async function main(){
  if(!arg("directory")||!arg("reviews"))throw Error("Use --directory=PRIVATE_DIRECTORY --reviews=REVIEWED_EVIDENCE.json [--collect] [--research=DIRECTORY]");
  const directory=resolve(arg("directory")!);mkdirSync(directory,{recursive:true,mode:0o700});
  const snapshotPath=resolve(directory,"snapshot.json");
  if(process.argv.includes("--collect")&&existsSync(snapshotPath))throw Error("Preserve existing snapshot; use a new output directory for fresh collection");
  const snapshot=process.argv.includes("--collect")?await collect(directory):read(snapshotPath);
  const reviews=read(arg("reviews")!);
  const input:OutreachEvaluationInput={targets:snapshot.targets,analytics:snapshot.analytics,sources:reviews.sources,actions:reviews.actions,recipients:reviews.recipients??[]};
  const evaluation=evaluateOutreach(input);
  save(resolve(directory,"reviewed-input.json"),input);
  const researchMatches:{organizationId:string;email:string;actions:string[];researchSourceUrls:string[]}[]=[];
  let observedResearchFiles=0;
  const researchedOrganizations = new Set<string>();
  if(arg("research")){
    const researchDir=resolve(arg("research")!);
    const entries=readdirSync(researchDir).filter(f=>f.endsWith(".json"));
    const outcomes=new Map(evaluation.rows.map(r=>[r.organizationId,r]));
    for(const file of entries){
      const result=read(resolve(researchDir,file));observedResearchFiles++;
      if(result.dataset!=="kommunen")continue;
      researchedOrganizations.add(result.organization_id);
      const outcome=outcomes.get(result.organization_id);if(!outcome)continue;
      for(const capability of outcome.mailboxCapabilities){
        const matches=(result.candidates??[]).filter((c:{email:string})=>c.email.toLowerCase()===capability.mailbox);
        if(matches.length)researchMatches.push({organizationId:outcome.organizationId,email:capability.mailbox,actions:capability.actions,researchSourceUrls:[...new Set<string>(matches.map((c:{sourceUrl:string})=>c.sourceUrl))]});
      }
    }
  }
  const researchChecks=evaluation.rows.flatMap(row=>row.mailboxCapabilities.map(capability=>({
    organizationId:row.organizationId,name:row.name,mailbox:capability.mailbox,
    status:!researchedOrganizations.has(row.organizationId)?"not-yet-recorded":researchMatches.some(m=>m.organizationId===row.organizationId&&m.email===capability.mailbox)?"found":"not-found-in-saved-result",
  })));
  const output={...evaluation,research:{observedAt:new Date().toISOString(),observedFiles:observedResearchFiles,matches:researchMatches,checks:researchChecks,completeness:"Snapshot of saved results only; the full crawl may still be running"}};
  save(resolve(directory,"evaluation.json"),output);
  const lines=["# Outreach: beobachtete Wirkung und Kontaktfunktion","",`Stand der Datenerfassung: ${snapshot.capturedAt}.`,"",`Bestand: ${evaluation.summary.recordedOrganizations} als angeschrieben dokumentierte Gemeinden. Das ist kein unabhängig bestätigter Versandnachweis und keine Abgrenzung der gesondert genannten 202 Aussendungen.`,"", "## Beobachtete Handlungen",""];
  for(const [key,label] of Object.entries(actionNames))lines.push(`- ${label}: ${evaluation.summary.organizationsByObservedAction[key]} Gemeinden.`);
  lines.push("",`Davon ${evaluation.summary.organizationsWithOfficialPublication} kommunale Veröffentlichungen und ${evaluation.summary.organizationsWithPersonalSocialPublication} persönlicher Social-Media-Beitrag. Die Handlungen können sich überschneiden. ${evaluation.summary.uniqueReplyMessages} echte Nachrichten stammen von ${evaluation.summary.organizationsByObservedAction.response} Gemeinden. Veröffentlichung und Antwort werden unabhängig gezählt; eine Veröffentlichung erfordert keine beobachtete Antwort.`,"", "## Fälle mit überprüfbaren Belegen","");
  for(const row of evaluation.rows.filter(r=>r.actions.length)){
    lines.push(`### ${row.name}`,"",[...new Set(row.observedActions.map(a=>actionNames[a]))].join("; ")+".");
    for(const a of row.actions){
      const source=a.source.kind==="page"?`[${a.source.publisher}](${a.source.url})`:`Postfachnachricht${a.actorMailbox?` von ${a.actorMailbox}`:""}${a.scope==="quoted-history"?" (zitierter Weiterleitungsverlauf)":""}`;
      lines.push(`- ${actionNames[a.action]}: ${source}.`);
    }
    if(row.originalRecipients.length)lines.push("- Früherer Empfänger nur aus zitierten Versandkopfzeilen belegt; kein unabhängig geprüftes Versandkuvert.");
    else if(row.dispatchEvidence==="original-recipient-unknown")lines.push("- Ursprünglicher Versandempfänger weiterhin unbestätigt; heutige Profiladresse wird nicht dafür eingesetzt.");
    const traffic=row.analytics;
    if(traffic?.status==="read")lines.push(`- Besuchsdaten gelesen ab ${traffic.since}; Herkunftsgruppen: ${traffic.groups.map(g=>`${g.referrer||"ohne Verweis"}: ${g.visitors}`).join("; ")||"keine gemessenen Besuche"}. Keine Zuordnung zu einer konkreten Person oder Mailöffnung.`);
    else lines.push("- Besuchsdaten nicht verfügbar; das bedeutet nicht null Besuche.");
    lines.push("");
  }
  lines.push("## Verwendung für die Kontaktsuche","","Ein Kontakt kann antworten, intern weiterleiten, Inhalte aufbereiten, Presse beliefern oder veröffentlichen. Keine Handlung wird aus Amtstitel oder Hierarchie abgeleitet. Belegte Handlungen werden einer Adresse nur bei passendem Quellenbeleg zugeordnet. Eine Veröffentlichung ohne belegte handelnde Adresse bleibt ein Organisationsbefund.","",`Bereits gespeicherte Erhebungsergebnisse gelesen: ${observedResearchFiles}. Exakte Übereinstimmungen mit durch Handlungen belegten Adressen: ${researchMatches.length}. Das sind noch keine Abdeckungs- oder Erfolgsquoten. Die Auswertung kann während und nach der Erhebung erneut ausgeführt werden.`,"", "## Grenzen", "", "Die Ausgangsdaten bleiben unverändert. Es wird nichts versendet und nichts in der Datenbank überschrieben. Geplante Weitergabe ist keine erfolgte Presseverteilung; Mailbehauptung ist keine verifizierte Veröffentlichung; Besucherherkunft ist nur ein Hinweis. Fehlende Antworten und fehlende Klicks beweisen keinen schlechten Kontakt. Die alten Rückläufe belegen keinen Effekt der heute verbesserten Suche. Globale Mail-Herkunftsereignisse bleiben ohne Gemeindezuordnung und werden nicht auf Empfänger verteilt.","",`Analytics: ${evaluation.summary.analyticsRead} Gemeinden gelesen, ${evaluation.summary.analyticsFailedOrUnavailable} fehlgeschlagen/nicht verfügbar, ${evaluation.summary.analyticsWithOverflow} mit nicht aufgeschlüsseltem Sammelposten. Herkunftsgruppen können sich überschneiden; ihre Besucher werden nicht zu eindeutigen Personen aufsummiert. Der Versandtag ist vollständig enthalten und der heutige Tag nur teilweise. Unterschiedlich lange Beobachtungsfenster ohne Vorhervergleich erlauben keinen Vergleich der Besuchswirkung. Eine kausale CR oder Überlegenheit einer Kontaktrolle wird daraus nicht berechnet.`);
  lines.push("", "## Abgleich tatsächlich handelnder Adressen", "");
  for(const check of researchChecks)lines.push(`- ${check.name}: ${check.mailbox} – ${check.status==="found"?"gefunden":check.status==="not-yet-recorded"?"noch kein Erhebungsergebnis gespeichert":"im gespeicherten Ergebnis nicht gefunden; gezielter Prüfpunkt"}.`);
  writeFileSync(resolve(directory,"ergebnis.md"),lines.join("\n")+"\n",{mode:0o600});
  console.log(JSON.stringify(evaluation.summary,null,2));
}
main().catch(e=>{console.error(e.message);process.exitCode=1;});
