export function mountGlobalNav(header,{active='',homeHref='/',atlasHref='/solar-atlas',calculatorsHref='/#hs-rechner',onWaitlist,artBase=new URL('./illustrations',import.meta.url).href.replace(/\/$/,'')}={}){
 if(!header||header.dataset.globalNav)return ()=>{};
 header.dataset.globalNav='true';header.classList.add('sc-global-header');
 header.querySelectorAll('nav,.header-cta,.mobile-menu').forEach(n=>n.remove());
 const brand=header.querySelector('.brand');if(brand)brand.href=homeHref;
 const base='';
 const link=(label,path,description='')=>`<a href="${base+path}">${label}${description?`<small>${description}</small>`:''}</a>`;
 const group=(label,items)=>`<details class="sc-nav-group"><summary>${label}<svg class="sc-nav-chevron" width="12" height="12" viewBox="0 0 12 8" fill="none" aria-hidden="true"><path d="M1 1.5l5 5 5-5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg></summary><div class="sc-nav-panel">${items}</div></details>`;
 const nav=document.createElement('nav');nav.className='sc-global-nav';nav.setAttribute('aria-label','Hauptnavigation');
 const tool=(image,title,description,actions,related='')=>`<article class="sc-nav-tool"><div class="sc-nav-art"><img loading="lazy" decoding="async" src="${artBase}/${image}-neon.webp" alt="" width="160" height="120"></div><div><h3>${title}</h3><p>${description}</p><div class="sc-nav-tool-actions">${actions}</div>${related}</div></article>`;
 const calculators=`<div class="sc-nav-tools">${tool('house','Solaranlage berechnen','Finde die passende PV-Anlage oder rechne deine konkrete Planung durch.',link('Passende Anlage finden','/pv-bedarf-berechnen')+link('Anlage durchrechnen','/photovoltaik-rechner'))}${tool('balcony-modern','Balkonkraftwerk berechnen','Was bringt dein Balkon – und welches Set lohnt sich für dich?',link('Balkonkraftwerk berechnen','/balkonkraftwerk/rechner'))}${tool('heatpump-modern','Wärmepumpe berechnen','Vergleiche Anschaffung und laufende Heizkosten mit deiner bisherigen Heizung.',link('Wärmepumpe durchrechnen','/waermepumpe-rechner'))}${tool('aircon','Klimaanlage berechnen','Vergleiche den Stromverbrauch und die Kosten verschiedener Klimageräte.',link('Klimaanlage berechnen','/klimaanlage-stromkosten'))}${tool('feed-in','Einspeisevergütung berechnen','Berechne Vergütung und Einnahmen für den Strom, den deine Anlage ins Netz einspeist.',link('Vergütung berechnen','/einspeiseverguetung-rechner'))}</div><div class="sc-nav-tool-actions sc-nav-all-calculators"><a href="${calculatorsHref}">Alle Rechner</a></div>`;
 const funding=`<p class="sc-nav-funding-note">Förderungen werden in unseren Rechnern automatisch berücksichtigt, sobald du deinen Standort angibst.</p><div class="sc-nav-tools">${tool('house','Förderung für deine Solaranlage','Finde Zuschüsse und Förderprogramme für Photovoltaik an deinem Standort.',link('PV-Förderung finden','/photovoltaik-foerderung'))}${tool('balcony-modern','Förderung für dein Balkonkraftwerk','Entdecke regionale Zuschüsse für Steckersolar und die Bedingungen dafür.',link('Balkon-Förderung finden','/balkonkraftwerk/foerderung'))}${tool('heatpump-modern','Förderung für deine Wärmepumpe','Erfahre, welche Zuschüsse beim Heizungstausch möglich sind und was du vor dem Antrag beachten solltest.',link('Wärmepumpen-Förderung ansehen','/ratgeber/waermepumpe-foerderung'))}</div>`;
 nav.innerHTML=group('Rechner',calculators)+`<button type="button" class="sc-nav-waitlist" data-waitlist>Angebot prüfen <small>Demnächst · Warteliste</small></button>`+group('Förderung',funding)+group('Themen & Ratgeber',link('Alle Ratgeber','/ratgeber')+link('Balkonkraftwerk','/balkonkraftwerk'))+`<a href="${atlasHref}" ${active==='atlas'?'aria-current="page"':''}>Solar-Atlas</a>`+group('Energiemonitor',link('Strommix Deutschland','/strommix-deutschland')+link('Strommix im Zeitverlauf','/langzeit-strommix')+link('Energie-Widgets','/energie-widgets'));
 nav.insertAdjacentHTML('beforeend', '<div class="sc-nav-actions"><a class="sc-nav-login" href="/login"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M15 3h5v18h-5M3 12h12m-4-4 4 4-4 4"/></svg>Einloggen</a><a class="sc-nav-contact" href="/kontakt"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="5" width="18" height="14" rx="2"/><path d="m3 6 9 7 9-7"/></svg>Kontakt</a></div>');
 const toggle=document.createElement('button');toggle.type='button';toggle.className='sc-nav-toggle';toggle.innerHTML='<span class="sc-burger" aria-hidden="true"><i></i><i></i><i></i></span>';toggle.setAttribute('aria-expanded','false');nav.id='sc-global-navigation';toggle.setAttribute('aria-controls',nav.id);header.append(toggle,nav);
 nav.querySelector('.sc-nav-group').classList.add('sc-nav-calculators');
 nav.querySelectorAll('.sc-nav-group')[1].classList.add('sc-nav-funding');
 const menuHead=document.createElement('div');menuHead.className='sc-menu-head';
 const menuBrand=document.createElement('a');menuBrand.className='sc-menu-brand';menuBrand.href=homeHref;menuBrand.setAttribute('aria-label','Solar Check – Startseite');
 const logo=document.createElement('img');logo.loading='lazy';logo.decoding='async';logo.src=new URL('./logo-result.svg',import.meta.url).href;logo.width=140;logo.height=33;logo.alt='solar-check.io';menuBrand.append(logo);
 const menuClose=document.createElement('button');menuClose.type='button';menuClose.className='sc-menu-close';menuClose.setAttribute('aria-label','Menü schließen');menuClose.innerHTML='<svg width="20" height="20" viewBox="0 0 20 20" aria-hidden="true"><path d="m3 3 14 14M17 3 3 17" fill="none" stroke="currentColor" stroke-width="1.5"/></svg>';
 menuHead.append(menuBrand,menuClose);nav.prepend(menuHead);menuClose.onclick=()=>{close();toggle.focus();};
 const mobile=matchMedia('(max-width:1280px)');
 const reduced=matchMedia('(prefers-reduced-motion: reduce)');
 const groups=[...nav.querySelectorAll('details')],groupAnimations=new Map();
 let previousOverflow='',menuOpen=false,menuAnimation;
 const animate=(element,frames,done)=>{
  if(reduced.matches){done();return null;}
  const animation=element.animate(frames,{duration:200,easing:'cubic-bezier(.2,.7,.2,1)',fill:'both'});
  animation.onfinish=()=>{done();animation.cancel();};return animation;
 };
 function setGroup(group,expanded,immediate=false){
  const panel=group.querySelector('.sc-nav-panel'),summary=group.querySelector('summary');
  const wasOpen=group.open,height=wasOpen?panel.getBoundingClientRect().height:0;
  const opacity=wasOpen?getComputedStyle(panel).opacity:0;
  groupAnimations.get(group)?.cancel();groupAnimations.delete(group);
  group.dataset.expanded=String(expanded);summary.setAttribute('aria-expanded',String(expanded));panel.inert=!expanded;
  if(immediate||reduced.matches||(!wasOpen&&!expanded)){group.open=expanded;return;}
  group.open=true;
  const target=panel.getBoundingClientRect().height;
  const frames=mobile.matches
   ? [{height:height+'px',opacity},{height:(expanded?target:0)+'px',opacity:expanded?1:0}]
   : [{opacity,transform:wasOpen?'none':'translateY(-6px)'},{opacity:expanded?1:0,transform:expanded?'none':'translateY(-6px)'}];
  const animation=animate(panel,frames,()=>{group.open=expanded;groupAnimations.delete(group);});
  if(animation)groupAnimations.set(group,animation);
 }
 const close=(immediate=false)=>{
  menuOpen=false;toggle.setAttribute('aria-expanded','false');toggle.setAttribute('aria-label','Menü öffnen');
  menuAnimation?.cancel();menuAnimation=null;nav.inert=mobile.matches;
  // Release our lock before another overlay takes ownership.
  if(previousOverflow!==null){document.body.style.overflow=previousOverflow;previousOverflow=null;}
  const finish=()=>{if(menuOpen)return;header.classList.remove('sc-menu-open');if(nav.matches(':popover-open'))nav.hidePopover();groups.forEach(d=>setGroup(d,false,true));nav.inert=false;};
  if(!immediate&&mobile.matches&&nav.matches(':popover-open'))menuAnimation=animate(nav,[{opacity:1,transform:'none'},{opacity:0,transform:'translateY(-8px)'}],finish);
  else{if(!mobile.matches&&!immediate){groups.forEach(d=>setGroup(d,false));header.classList.remove('sc-menu-open');}else finish();}
 };
 const configure=()=>{close(true);if(mobile.matches)nav.setAttribute('popover','manual');else nav.removeAttribute('popover');};
 previousOverflow=null;configure();mobile.addEventListener('change',configure);
 toggle.onclick=()=>{
  if(menuOpen){close();return;}
  const wasVisible=nav.matches(':popover-open'),opacity=wasVisible?getComputedStyle(nav).opacity:0;
  menuAnimation?.cancel();menuAnimation=null;menuOpen=true;nav.inert=false;
  if(previousOverflow===null)previousOverflow=document.body.style.overflow;
  header.classList.add('sc-menu-open');toggle.setAttribute('aria-expanded','true');toggle.setAttribute('aria-label','Menü schließen');
  if(mobile.matches){const bounds=header.getBoundingClientRect();nav.style.setProperty('--nav-top',Math.max(64,bounds.bottom)+'px');if(!wasVisible)nav.showPopover();if(!reduced.matches)menuBrand.animate([{transform:'scale(1.18)'},{transform:'scale(1)'}],{duration:240,easing:'ease-out'});document.body.style.overflow='hidden';menuAnimation=animate(nav,[{opacity,transform:'translateY(-8px)'},{opacity:1,transform:'none'}],()=>{menuAnimation=null;});}
 };
 groups.forEach(group=>{
  const summary=group.querySelector('summary');setGroup(group,false,true);
  summary.addEventListener('click',event=>{event.preventDefault();const expanded=group.dataset.expanded!=='true';groups.forEach(other=>{if(other!==group)setGroup(other,false);});setGroup(group,expanded);});
 });
 nav.addEventListener('click',e=>{if(e.target.closest('a'))close();});
 const outside=e=>{if(!header.contains(e.target)&&!nav.contains(e.target))close();};
 const keyboard=e=>{if(e.key==='Escape'&&(header.classList.contains('sc-menu-open')||nav.querySelector('details[open]'))){const active=document.activeElement;close();if(mobile.matches)toggle.focus();else active?.closest('details')?.querySelector('summary')?.focus();}if(e.key==='Tab'&&mobile.matches&&header.classList.contains('sc-menu-open')){const items=[toggle,...nav.querySelectorAll('a,summary,button')].filter(el=>el.getClientRects().length&&getComputedStyle(el).visibility!=='hidden'&&!el.closest('[inert]'));const first=items[0],last=items.at(-1);if(e.shiftKey&&document.activeElement===first){e.preventDefault();last.focus();}else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first.focus();}}};
 document.addEventListener('click',outside);document.addEventListener('keydown',keyboard);
 const dialog=document.createElement('dialog');dialog.className='sc-waitlist';dialog.setAttribute('aria-labelledby','sc-waitlist-title');
 dialog.innerHTML=`<button type="button" class="sc-waitlist-close" aria-label="Schließen">×</button><h2 id="sc-waitlist-title">PV oder Wärmepumpe: Ist das Angebot fair?</h2><p>Prüfe künftig dein Photovoltaik- oder Wärmepumpen-Angebot: Passen Preis, Auslegung und Leistungen? Trag dich ein – wir sagen Bescheid, sobald er startet.</p><form><label for="sc-waitlist-email">E-Mail-Adresse</label><input id="sc-waitlist-email" name="email" type="email" autocomplete="email" maxlength="254" required placeholder="du@beispiel.de"><div class="sc-waitlist-trap" aria-hidden="true"><label>Website<input name="website" tabindex="-1" autocomplete="off"></label></div><button type="submit">Auf die Warteliste</button><p class="sc-waitlist-consent">Mit der Anmeldung erhältst du eine Bestätigungsmail und nach deiner Bestätigung eine Nachricht zum Start. Kein Newsletter. <a href="/datenschutz">Datenschutz</a></p><p role="status" aria-live="polite"></p></form>`;
 document.body.append(dialog);dialog.querySelector('.sc-waitlist-close').onclick=()=>dialog.close();
 const form=dialog.querySelector('form'),status=form.querySelector('[role=status]');let openedAt=0;
 form.addEventListener('submit',async event=>{event.preventDefault();const button=form.querySelector('[type=submit]');button.disabled=true;status.textContent='';try{const response=await fetch('/api/warteliste/anmelden',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({email:form.elements.email.value,website:form.elements.website.value,elapsedMs:Date.now()-openedAt,consent:'offer-check-v1'})});const result=await response.json();if(!response.ok)throw new Error(result.error||'Die Anmeldung klappt gerade nicht. Bitte später erneut versuchen.');status.textContent='Bitte bestätige deine Anmeldung über den Link in deinem Postfach.';form.reset();}catch(error){status.textContent=error.message;}finally{button.disabled=false;}});
 const waitlist=nav.querySelector('[data-waitlist]');waitlist.onclick=()=>{close(true);location.href='/angebot-pruefen';};
 dialog.addEventListener('close',()=>{toggle.focus();});

 return ()=>{document.removeEventListener('click',outside);document.removeEventListener('keydown',keyboard);mobile.removeEventListener('change',configure);close(true);dialog.remove();nav.remove();toggle.remove();delete header.dataset.globalNav;};
}
