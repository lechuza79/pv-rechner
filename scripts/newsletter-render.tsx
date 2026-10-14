import {aboVorschauLinks} from '../lib/abo-token';
import {renderNewsletterMail} from '../lib/newsletter-template';
import React from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import fs from 'node:fs';
import sharp from 'sharp';
import {MonthlySolarRadial} from '../components/charts/MonthlySolarRadial';
const [inputFile,outputFile,previewDir]=process.argv.slice(2);
const read=(p:string)=>JSON.parse(fs.readFileSync(p,'utf8'));
async function main(){
 const out=previewDir;fs.mkdirSync(out,{recursive:true});const mails:any[]=[],report:any[]=[];
 for(const {region:data,subscribers:abos} of read(inputFile)){
 const {regionId:id,name:town,added:count,addedKwp:kwp,stock,solar,pageUrl:page}=data;
 const video=new URL(data.videoUrl);
 const monthLabel=new Intl.DateTimeFormat('de-DE',{month:'long',year:'numeric',timeZone:'UTC'}).format(new Date(data.month+'-15T12:00:00Z'));
 // The standard widget draws all geometry and labels; the mail only adds its play affordance.
 let svg=renderToStaticMarkup(<MonthlySolarRadial data={{...solar,town}} layout="monitor" compact={false} displayDate={null} frame={null} playing={false} focused={false} artwork={false} onHover={()=>{}} onChoose={()=>{}} classes={{total:'total',unit:'unit',scale:'scale',hour:'hour'}}/>);
 svg=svg.replace('<svg ','<svg xmlns="http://www.w3.org/2000/svg" width="760" height="760" ').replace('><defs>','><rect width="560" height="560" fill="#F6F8F1"/><style>text{font-family:Arial,sans-serif;fill:#93AAA1}.total{font-size:34px;font-weight:700;fill:#173B42}.unit{font-size:16px}.scale,.hour{font-size:12px}</style><defs>');
 svg=svg.replaceAll('var(--atlas-text)','#173B42').replaceAll('var(--atlas-action)','#173B42').replaceAll('var(--atlas-card)','#F6F8F1');
 svg=svg.replace('</svg>','<circle cx="280" cy="280" r="33" fill="#173B42" fill-opacity=".72"/><path d="M274 269 Q273 268 273 271 L273 289 Q273 292 276 290 L292 282 Q295 280 292 278 Z" fill="#D4FF24"/></svg>');
 const png=await sharp(Buffer.from(svg)).png().toBuffer();fs.writeFileSync(`${out}/${id}.png`,png);
 for(const abo of abos){
 const variant=abo.ausVerwaltung?'kommunal':'allgemein';
 const template=fs.readFileSync(`scripts/templates/newsletter-${variant}.html`,'utf8');
 const mail=renderNewsletterMail(template,data,variant,'data:image/png;base64,'+png.toString('base64'),abo.links);
 mails.push({an:abo.email,...mail,newsletter:{campaign:'september-2026',variant},abo:{id:abo.id,regionId:id},anlass:monthLabel+': Solarzubau und modellierte Solarerzeugung im abonnierten Gebiet',bezug:[id]});
 fs.writeFileSync(`${out}/${id}-${variant}.html`,mail.html.replaceAll(abo.links.abmeldeUrl,aboVorschauLinks('https://solar-check.io').abmeldeUrl).replaceAll(abo.links.einstellungenUrl,aboVorschauLinks('https://solar-check.io').einstellungenUrl));
 }
 report.push({id,town,count,kwp,stock,totalMwh:solar.totalMwh,page,video:video.toString(),recipients:abos.length});
 }
 fs.writeFileSync(outputFile,JSON.stringify(mails),{mode:0o600});fs.writeFileSync(out+'/versandpruefung.json',JSON.stringify({report},null,2));console.log(JSON.stringify({prepared:mails.length,regions:report.length}));
}
main().catch(e=>{console.error(e);process.exitCode=1});
