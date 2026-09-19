import {navigationContent,navigationOwner} from './nav-content.js';
export function mountGlobalNav(header,{active='',homeHref='/',atlasHref='/solar-atlas',calculatorsHref='/#hs-rechner',onWaitlist,artBase='/shared-nav/illustrations'}={}){
 if(!header||header.dataset.globalNav)return ()=>{};
 header.dataset.globalNav='true';header.classList.add('sc-global-header');
 header.querySelectorAll('nav,.header-cta,.mobile-menu').forEach(n=>n.remove());
 const brand=header.querySelector('.brand');if(brand)brand.href=homeHref;
 const nav=document.createElement('nav');nav.className='sc-global-nav';nav.setAttribute('aria-label','Hauptnavigation');
 nav.innerHTML=navigationContent({atlasHref,calculatorsHref,artBase});
 // Multiple entry points share destinations, but only one section owns a page.
 const path=location.pathname.replace(/\/$/,'')||'/';
 const owner=navigationOwner(path,active);
 const owned=nav.querySelector(`[data-section="${owner}"]`);if(owned){owned.querySelector('summary').setAttribute('aria-current','true');const exact=[...owned.querySelectorAll('a')].find(a=>new URL(a.href).pathname===path&&!new URL(a.href).hash);exact?.setAttribute('aria-current','page');}
 const login=document.createElement('a');login.className='sc-nav-login';login.href='/login';login.setAttribute('aria-label','Login');login.innerHTML='<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="8" r="3.5"/><path d="M5 21v-2a7 7 0 0 1 14 0v2"/></svg>';
 const toggle=document.createElement('button');toggle.type='button';toggle.className='sc-nav-toggle';toggle.innerHTML='<span class="sc-burger" aria-hidden="true"><i></i><i></i><i></i></span>';toggle.setAttribute('aria-expanded','false');nav.id='sc-global-navigation';toggle.setAttribute('aria-controls',nav.id);header.append(nav,login,toggle);
 nav.querySelector('.sc-nav-group').classList.add('sc-nav-calculators');
 const menuHead=document.createElement('div');menuHead.className='sc-menu-head';
 const menuBrand=document.createElement('a');menuBrand.className='sc-menu-brand';menuBrand.href=homeHref;menuBrand.setAttribute('aria-label','Solar Check – Startseite');
 const logo=document.createElement('img');logo.loading='lazy';logo.decoding='async';logo.src='/shared-nav/logo-result.svg';logo.width=140;logo.height=33;logo.alt='solar-check.io';menuBrand.append(logo);
 const menuClose=document.createElement('button');menuClose.type='button';menuClose.className='sc-menu-close';menuClose.setAttribute('aria-label','Menü schließen');menuClose.innerHTML='<svg width="20" height="20" viewBox="0 0 20 20" aria-hidden="true"><path d="m3 3 14 14M17 3 3 17" fill="none" stroke="currentColor" stroke-width="1.5"/></svg>';
 nav.insertAdjacentHTML('beforeend', '<div class="sc-nav-actions"><a class="sc-nav-login" href="/login"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="8" r="3.5"/><path d="M5 21v-2a7 7 0 0 1 14 0v2"/></svg>Login</a><a class="sc-nav-contact" href="/kontakt"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="5" width="18" height="14" rx="2"/><path d="m3 6 9 7 9-7"/></svg>Kontakt</a></div>');
 menuHead.append(menuBrand,menuClose);nav.prepend(menuHead);menuClose.onclick=()=>close(false,true);
 const mobile=matchMedia('(max-width:1280px)');
 const reduced=matchMedia('(prefers-reduced-motion: reduce)');
 const groups=[...nav.querySelectorAll('details')],groupAnimations=new Map();
 nav.querySelectorAll('.sc-nav-tool').forEach(card=>{
  card.addEventListener('pointermove',event=>{
   if(reduced.matches||event.pointerType!=='mouse')return;
   const rect=card.getBoundingClientRect();
   card.style.setProperty('--art-x',((event.clientX-rect.left)/rect.width-.5)*12+'px');
   card.style.setProperty('--art-y',((event.clientY-rect.top)/rect.height-.5)*8+'px');
  });
  card.addEventListener('pointerleave',()=>{card.style.removeProperty('--art-x');card.style.removeProperty('--art-y');});
 });
 let previousOverflow='',menuOpen=false,menuAnimation;
 const animate=(element,frames,done)=>{
  if(reduced.matches){done();return null;}
  const animation=element.animate(frames,{duration:300,easing:'cubic-bezier(.16,1,.3,1)',fill:'both'});
  animation.onfinish=()=>{done();animation.cancel();};return animation;
 };
 function setGroup(group,expanded,immediate=false){
  const panel=group.querySelector('.sc-nav-panel'),summary=group.querySelector('summary');
  const wasOpen=group.open,height=wasOpen?panel.getBoundingClientRect().height:0;
  const currentStyle=wasOpen?getComputedStyle(panel):null;
  const opacity=currentStyle?.opacity??0;
  const paddingTop=currentStyle?.paddingTop??'0px',paddingBottom=currentStyle?.paddingBottom??'0px';
  groupAnimations.get(group)?.cancel();groupAnimations.delete(group);
  group.dataset.expanded=String(expanded);summary.setAttribute('aria-expanded',String(expanded));panel.inert=!expanded;
  if(immediate||reduced.matches||(!wasOpen&&!expanded)){group.open=expanded;return;}
  group.open=true;
  const target=panel.getBoundingClientRect().height,targetStyle=getComputedStyle(panel);
  const frames=mobile.matches
   ? [{height:height+'px',paddingTop,paddingBottom,opacity},{height:(expanded?target:0)+'px',paddingTop:expanded?targetStyle.paddingTop:'0px',paddingBottom:expanded?targetStyle.paddingBottom:'0px',opacity:expanded?1:0}]
   : [{opacity,transform:wasOpen?'none':'translateY(-10px) scale(.975)'},{opacity:expanded?1:0,transform:expanded?'none':'translateY(-6px) scale(.985)'}];
  const animation=animate(panel,frames,()=>{group.open=expanded;groupAnimations.delete(group);});
  if(animation)groupAnimations.set(group,animation);
 }
 const close=(immediate=false,restoreFocus=false)=>{
  menuOpen=false;toggle.setAttribute('aria-expanded','false');toggle.setAttribute('aria-label','Menü öffnen');
  menuAnimation?.cancel();menuAnimation=null;nav.inert=mobile.matches;
  // Release our lock before another overlay takes ownership.
  if(previousOverflow!==null){document.body.style.overflow=previousOverflow;previousOverflow=null;}
  const finish=()=>{if(menuOpen)return;header.classList.remove('sc-menu-open');if(nav.matches(':popover-open'))nav.hidePopover();groups.forEach(d=>setGroup(d,false,true));nav.inert=false;if(restoreFocus)toggle.focus();};
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
  if(mobile.matches){const bounds=header.getBoundingClientRect();nav.style.setProperty('--nav-top',Math.max(64,bounds.bottom)+'px');if(!wasVisible)nav.showPopover();if(!reduced.matches)menuBrand.animate([{transform:'scale(1.18)'},{transform:'scale(1)'}],{duration:240,easing:'ease-out'});document.body.style.overflow='hidden';menuClose.focus();menuAnimation=animate(nav,[{opacity,transform:'translateY(-8px)'},{opacity:1,transform:'none'}],()=>{menuAnimation=null;});}
 };
 groups.forEach(group=>{
  const summary=group.querySelector('summary');setGroup(group,false,true);
  summary.addEventListener('click',event=>{
   event.preventDefault();
   const expanded=group.dataset.expanded!=='true';
   if(mobile.matches){
    // Independent mobile sections keep earlier content and scroll position stable.
    setGroup(group,expanded);
    return;
   }
   groups.forEach(other=>{if(other!==group)setGroup(other,false);});
   setGroup(group,expanded);
  });
 });
 nav.addEventListener('click',e=>{if(e.target.closest('a'))close();});
 const outside=e=>{if(!header.contains(e.target)&&!nav.contains(e.target))close();};
 const keyboard=e=>{if(e.key==='Escape'&&(header.classList.contains('sc-menu-open')||nav.querySelector('details[open]'))){const active=document.activeElement;close(false,mobile.matches);if(!mobile.matches)active?.closest('details')?.querySelector('summary')?.focus();}if(e.key==='Tab'&&mobile.matches&&header.classList.contains('sc-menu-open')){const items=[toggle,...nav.querySelectorAll('a,summary,button')].filter(el=>el.getClientRects().length&&getComputedStyle(el).visibility!=='hidden'&&!el.closest('[inert]'));const first=items[0],last=items.at(-1);if(e.shiftKey&&document.activeElement===first){e.preventDefault();last.focus();}else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first.focus();}}};
 document.addEventListener('click',outside);document.addEventListener('keydown',keyboard);
 const waitlist=nav.querySelector('[data-waitlist]');waitlist.onclick=()=>{close(true);location.href='/angebot-pruefen';};

 return ()=>{document.removeEventListener('click',outside);document.removeEventListener('keydown',keyboard);mobile.removeEventListener('change',configure);close(true);nav.remove();login.remove();toggle.remove();delete header.dataset.globalNav;};
}
