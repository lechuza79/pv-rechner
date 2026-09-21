import signals from './trust-signals.json';
const groups=[
 ['Rechner', [['PV-Anlage planen','/pv-bedarf-berechnen'],['PV durchrechnen','/photovoltaik-rechner'],['Balkonkraftwerk','/balkonkraftwerk/rechner'],['Wärmepumpe','/waermepumpe-rechner'],['Klimaanlage','/klimaanlage-stromkosten'],['Einspeisevergütung','/einspeiseverguetung-rechner'],['Live-Simulation','/pv-simulation']]],
 ['Themen & Förderung',[['Alle Ratgeber','/ratgeber'],['Balkonkraftwerk verstehen','/balkonkraftwerk'],['Balkonkraftwerk anmelden','/balkonkraftwerk/ratgeber/anmelden'],['Balkonkraftwerk mit Speicher','/balkonkraftwerk/ratgeber/mit-speicher'],['PV-Förderung','/photovoltaik-foerderung'],['Balkonkraftwerk-Förderung','/balkonkraftwerk/foerderung'],['Wärmepumpen-Förderung','/ratgeber/waermepumpe-foerderung'],['Glossar','/glossar']]],
 ['Atlas & Energiemonitor',[['Solar-Atlas','/solar-atlas'],['Strommix Deutschland','/strommix-deutschland'],['Atomstrom-Import','/atomstrom-import'],['Solaranlagen in Deutschland','/photovoltaik-bestand-deutschland'],['Solar-Zubau','/photovoltaik-zubau-deutschland'],['Datenstand & Quellen','/datenstand']]],
 ['Solar Check & Weiterverwenden',[['Über Solar Check','/ueber'],['So rechnen wir','/methodik'],['Kontakt','/kontakt'],['Medien & Creator','/presse'],['Widgets für deine Website','/energie-widgets'],['Nutzung & Lizenz','/lizenz']]]
];
export function mountSiteFooter(target,{logoElement,base='https://solar-check.io',homeHref='/',simulationHref,atlasHref}={}){
 const footer=document.createElement('footer');footer.className='sc-footer';
 const wrap=document.createElement('div');wrap.className='sc-footer-wrap';footer.append(wrap);
 const brand=document.createElement('a');brand.className='sc-footer-brand';brand.href=homeHref;brand.setAttribute('aria-label','Solar Check – Startseite');const logo=(logoElement || document.querySelector('.site-header .brand svg'))?.cloneNode(true);if(logo){logo.setAttribute('width','220');const ids=new Map();logo.querySelectorAll('[id]').forEach(n=>{const old=n.id;ids.set(old,'footer-'+old);n.id='footer-'+old;});logo.querySelectorAll('*').forEach(n=>{for(const attr of [...n.attributes]){let value=attr.value;for(const [old,next] of ids)value=value.replace('url(#'+old+')','url(#'+next+')');if(value!==attr.value)n.setAttribute(attr.name,value);}});brand.append(logo);}else brand.textContent='solar-check.io';wrap.append(brand);
 const tagline=document.createElement('p');tagline.className='sc-footer-tagline';tagline.textContent='Dein Dach. Deine Energie.';wrap.append(tagline);
 const nav=document.createElement('nav');nav.className='sc-footer-grid';nav.setAttribute('aria-label','Fußnavigation');wrap.append(nav);
 for(const [title,links] of groups){const section=document.createElement('section'),heading=document.createElement('h2');heading.textContent=title;section.append(heading);for(const [name,path] of links){const a=document.createElement('a');a.textContent=name;a.href=path==='/pv-simulation'&&simulationHref?simulationHref:path==='/solar-atlas'&&atlasHref?atlasHref:base+path;section.append(a);}nav.append(section);}
 const legal=document.createElement('div');legal.className='sc-footer-legal';for(const [name,path] of [['Impressum','/impressum'],['Datenschutz','/datenschutz']]){const a=document.createElement('a');a.textContent=name;a.href=base+path;legal.append(a);}wrap.append(legal);
 const disclaimer=document.createElement('p');disclaimer.className='sc-footer-disclaimer';disclaimer.textContent='Alle Berechnungen und Angaben sind unverbindliche Näherungswerte ohne Anspruch auf Richtigkeit, Aktualität oder Vollständigkeit und stellen keine Rechts-, Steuer- oder Anlageberatung dar.';wrap.append(disclaimer);target.replaceWith(footer);
 return {footer,dispose(){footer.remove();}};
}

export function mountTrustBox(target,{base='https://solar-check.io'}={}){
 const trust=document.createElement('section');trust.className='sc-trust';trust.setAttribute('aria-label','Unsere Grundlagen');const list=document.createElement('div');list.className='sc-trust-grid';trust.append(list);
 for(const signal of signals){const item=document.createElement('div');item.className='sc-trust-item';const icon=document.createElement('solar-trust-badge');icon.setAttribute('motif',signal.motif);icon.setAttribute('aria-hidden','true');const h=document.createElement('h3');h.textContent=signal.titel;const p=document.createElement('p');
 const matches=[...(signal.links||[]).map(l=>({...l,at:signal.text.indexOf(l.begriff)}))].filter(l=>l.at>=0).sort((a,b)=>a.at-b.at);let pos=0;for(const m of matches){p.append(signal.text.slice(pos,m.at));const a=document.createElement('a');a.textContent=m.begriff;a.href=m.url;p.append(a);pos=m.at+m.begriff.length;}p.append(signal.text.slice(pos));item.append(icon,h,p);if(signal.mehr){const a=document.createElement('a');a.className='sc-trust-more';a.href=base+signal.href;a.innerHTML='Mehr erfahren <svg width="20" height="20" viewBox="0 0 16 16" fill="none" aria-hidden="true"><path d="M3.333 8h9.334m0 0L8 3.333M12.667 8 8 12.667" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>' ;item.append(a);}list.append(item);}
 target.replaceWith(trust);
 return {trust,dispose(){trust.remove();}};
}

// Compatibility wrapper for the existing homepage mount.
export function mountFooter(target,{trustTarget,...options}={}){
 const site=mountSiteFooter(target,options);
 if(!trustTarget){trustTarget=document.createElement('div');site.footer.before(trustTarget);}
 const box=mountTrustBox(trustTarget,options);
 return {...site,...box,dispose(){site.dispose();box.dispose();}};
}
