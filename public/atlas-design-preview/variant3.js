(async()=>{
const live='https://solar-check.io/solar-atlas/bayern/landkreis-wuerzburg/hoechberg';
const [registerResponse,rankingResponse]=await Promise.all([fetch('/atlas-design-preview/current-register.json'),fetch('/atlas-design-preview/ranking-data.json')]);
if(!registerResponse.ok||!rankingResponse.ok)throw Error('Current municipal snapshot unavailable');
const register=await registerResponse.json(),ranking=await rankingResponse.json();
const date=value=>new Intl.DateTimeFormat('de-DE',{dateStyle:'long',timeZone:'UTC'}).format(new Date(value));
const number=(value,digits=0)=>Number(value).toLocaleString('de-DE',{maximumFractionDigits:digits});
const solarCount=register.coverage.filter(row=>row.topic!=='batterie').reduce((sum,row)=>sum+row.count,0);
const solarKwp=register.chartMix.values.reduce((sum,row)=>sum+row.value,0);
const batteryCount=register.storage.find(row=>row.unit==='Einheiten').value;
const batteryKwh=register.storage.find(row=>row.unit==='kWh').value;
const own=register.register;
const peerRank=1+ranking.peers.filter(row=>row.sums.alle.count>own.sums.alle.count).length;

function mount(){
const content=document.querySelector('.atlas-content'), teasers=document.querySelector('.atlas-hero-teasers');
if(!content||!teasers||!document.querySelector('#atlas-ranking')){setTimeout(mount,100);return;}
teasers.style.display='none';
const copy=document.querySelector('.hero-copy');
const rank=document.createElement('a');rank.className='v3-rank-intro';rank.href='#atlas-ranking';rank.innerHTML='<img src="/atlas-design-preview/rank-badges/roof-2-no-banner.svg" alt="" width="80" height="80"><div><strong>Platz '+peerRank+'</strong><span>Anzahl der Solaranlagen</span><small class="v3-rank-more">Mehr ↓</small></div>';const stack=document.createElement('div');stack.className='v3-hero-stack';stack.append(rank);document.querySelector('.hero').append(stack);
const hero=document.createElement('aside');hero.className='v3-hero-card v3-monitor-card';
hero.innerHTML='<iframe title="Energiemonitor Höchberg" src="/embed/story-preview?view=hero&widget=feed-in-value"></iframe><nav aria-label="Energiekachel"><button type="button" aria-label="Einspeisevergütung" aria-pressed="true"><span></span></button><button type="button" aria-label="Solarleistung heute" aria-pressed="false"><span></span></button><button type="button" aria-label="Solarerzeugung im Tagesverlauf" aria-pressed="false"><span></span></button></nav>';stack.append(hero);
const heroWidgets=['feed-in-value','live','radial'];
hero.querySelectorAll('nav button').forEach((button,index)=>{button.onclick=()=>{hero.querySelector('iframe').src='/embed/story-preview?view=hero&widget='+heroWidgets[index];hero.querySelectorAll('nav button').forEach((item,i)=>item.setAttribute('aria-pressed',String(i===index)));};});
copy.querySelector('.hero-description').textContent='Entdecke die Energiewende in Höchberg: Insights erklären die Entwicklung, das Ranking zeigt den Vergleich mit anderen Orten und der Energiemonitor macht die Zahlen sichtbar.';
copy.querySelector('.hero-actions')?.remove();
const scrollHint=document.createElement('a');scrollHint.className='v3-scroll-indicator';scrollHint.href='#atlas-stories';scrollHint.setAttribute('aria-label','Insights entdecken');scrollHint.innerHTML='<span>Entdecken</span><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true"><path d="M12 4v16m-6-6 6 6 6-6"/></svg>';document.querySelector('.hero').append(scrollHint);
const hintTimer=setTimeout(()=>scrollHint.classList.add('is-visible'),4000);window.addEventListener('pagehide',()=>clearTimeout(hintTimer),{once:true});
const intro=document.createElement('section');intro.className='v3-intro atlas-wrap';intro.innerHTML='<nav class="v3-section-nav" aria-label="Auf dieser Seite"><a href="#atlas-stories">Insights</a><a href="#atlas-ranking">Ranking</a><a href="#atlas-data">Energiemonitor</a></nav><div class="v3-intro-grid"><div><p class="atlas-kicker">Stand '+date(register.sourceDate)+'</p><h2>So steht es um Solar<br>in Höchberg.</h2></div><div><p>'+number(solarCount)+' Solaranlagen mit '+number(solarKwp/1000,1)+' MWp Leistung sind hier in Betrieb. Dazu kommen '+number(batteryCount)+' Batteriespeicher. Entdecken Sie den Anlagenbestand und die Entwicklung im Ort.</p></div></div>';content.prepend(intro);
const sectionNav=intro.querySelector('nav');content.prepend(sectionNav);
const pageActions=document.createElement('div');pageActions.className='atlas-page-actions';
pageActions.innerHTML='<button type="button" data-page-subscribe aria-label="Höchberg abonnieren" title="Abonnieren"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9M10 21h4"/></svg></button><button type="button" data-page-copy aria-label="Link zur Seite kopieren" title="Link kopieren"></button><button type="button" data-page-share aria-label="Seite teilen" title="Seite teilen"></button><span class="atlas-page-status" role="status"></span>';
pageActions.querySelector('[data-page-subscribe]').onclick=()=>document.querySelector('.hero .secondary-cta').click();
sectionNav.append(pageActions);
const navLinks=[...sectionNav.querySelectorAll('a')];
let navFrame=0;
const updateActiveSection=()=>{
 navFrame=0;const threshold=Math.max(sectionNav.getBoundingClientRect().bottom+24,window.innerHeight*.35);
 let current=navLinks[0];
 for(const link of navLinks){const target=document.querySelector(link.hash);if(target&&target.getBoundingClientRect().top<=threshold)current=link;}
 for(const link of navLinks){if(link===current)link.setAttribute('aria-current','location');else link.removeAttribute('aria-current');}
};
const queueActiveSection=()=>{if(!navFrame)navFrame=requestAnimationFrame(updateActiveSection);};
window.addEventListener('scroll',queueActiveSection,{passive:true});window.addEventListener('resize',queueActiveSection);window.addEventListener('hashchange',queueActiveSection);
const navLayoutObserver=new ResizeObserver(queueActiveSection);navLayoutObserver.observe(content);
window.addEventListener('pagehide',()=>{navLayoutObserver.disconnect();cancelAnimationFrame(navFrame);window.removeEventListener('scroll',queueActiveSection);window.removeEventListener('resize',queueActiveSection);window.removeEventListener('hashchange',queueActiveSection);},{once:true});
queueActiveSection();
const updateNavOffset=()=>document.documentElement.style.setProperty('--v3-nav-top',(document.querySelector('.font-lab')?.getBoundingClientRect().height||0)+'px');updateNavOffset();window.addEventListener('resize',updateNavOffset);
const storyHead=document.querySelector('#atlas-stories .atlas-head');storyHead.classList.add('v3-section-divider');storyHead.innerHTML='<h2>Insights aus Höchberg</h2>';const abo=document.querySelector('.atlas-editor-note [data-abo]')||content.querySelector('[data-abo]');if(abo){const btn=abo.cloneNode(true);btn.removeAttribute('data-abo');btn.onclick=()=>abo.click();storyHead.append(btn);}

const overview=document.querySelector('#atlas-overview');overview.id='atlas-data';
overview.querySelector('.atlas-numbers').remove();
const overviewHead=overview.querySelector('.atlas-summary');
overviewHead.querySelector('.atlas-kicker').textContent='Energiemonitor';
overviewHead.querySelector('h2').textContent='Energiemonitor Höchberg';
const monitorUpdate=document.createElement('p');monitorUpdate.className='monitor-update';monitorUpdate.textContent='Letztes Update: '+new Intl.DateTimeFormat('de-DE',{day:'2-digit',month:'short',year:'numeric',timeZone:'UTC'}).format(new Date(register.sourceDate))+' · Kennzahlen bis Ende '+new Intl.DateTimeFormat('de-DE',{month:'long',year:'numeric',timeZone:'UTC'}).format(new Date(Date.UTC(Number(register.sourceDate.slice(0,4)),Number(register.sourceDate.slice(5,7))-1,0)));overviewHead.querySelector('h2').after(monitorUpdate);
overviewHead.querySelectorAll('p').forEach(p=>{if(!p.classList.contains('atlas-kicker')&&!p.hasAttribute('style')&&!p.classList.contains('monitor-update'))p.textContent='Wie wächst die erneuerbare Energie vor Ort? Wie viel Strom lässt sich erzeugen und speichern? Der Energiemonitor macht die Entwicklung in Höchberg sichtbar – mit den verfügbaren Daten zu Anlagen, Leistung und Ausbau.';});
const data=document.createElement('div');data.className='atlas-wrap v3-data';data.innerHTML='<div class="atlas-head"><div><p class="atlas-kicker">Bestand, Erzeugung & Entwicklung</p><h2>Energie in Zahlen.</h2></div><p>Die Daten hinter den Geschichten. Entdecken Sie, was bereits installiert ist und wie sich Höchberg entwickelt.</p></div><div class="v3-permanent-charts"><iframe title="Energiedaten für Höchberg" src="/embed/story-preview?view=data" loading="lazy" style="display:block;width:100%;height:1400px;border:0;background:transparent"></iframe></div><details class="v3-map"><summary>Höchberg und seine Nachbarn auf der Karte</summary><a href="'+live+'" target="_blank" rel="noopener"><img src="/atlas-design-preview/karte-bestand.png" alt="Bestehende Kartenansicht des Landkreises Würzburg mit Solarleistung und Anlagenzahlen"></a><p>Bestehende Kartenansicht als Layoutvorschau. <a href="'+live+'" target="_blank" rel="noopener">Interaktive Karte öffnen →</a></p></details>';
overview.append(data);
data.querySelector('.atlas-head').remove();
data.querySelector('.v3-map').remove();
const stand=overview.querySelector('.atlas-summary p[style]');if(stand)stand.remove();
const detailRows=overview.querySelectorAll('.atlas-detail');
if(detailRows[0]){detailRows[0].querySelectorAll('p').forEach(node=>node.remove());const paragraph=document.createElement('p');paragraph.textContent='In der Vergleichsgruppe mit '+ranking.peers.length+' Orten im Landkreis liegt Höchberg nach Anlagenzahl auf Platz '+peerRank+'. Ranglistenstand: '+date(register.rankingDate)+'. Die Filter im Vergleichsbereich ändern Gebiet, Ortsgröße und Anlagenbereich.';detailRows[0].append(paragraph);}
if(detailRows[1]){detailRows[1].querySelectorAll('p').forEach(node=>node.remove());const paragraph=document.createElement('p');paragraph.textContent=number(batteryCount)+' Batteriespeicher mit insgesamt '+number(batteryKwh/1000,1)+' MWh Kapazität: durchschnittlich '+number(batteryKwh/batteryCount,1)+' kWh je Speicher. Gebäudeanlagen werden im Register nicht automatisch als private Dächer eingeordnet. Stand: '+date(register.sourceDate)+'.';detailRows[1].append(paragraph);}
// Superseded by the monitor modules and the separate ranking section.
overview.querySelectorAll('.atlas-detail').forEach(node=>node.remove());
const heroText=document.querySelector('.hero-copy .hero-subtitle')||document.querySelector('.hero-copy p');if(heroText)heroText.textContent='Entdecke die Energiewende in Höchberg: Insights erklären die Entwicklung, das Ranking zeigt den Ortsvergleich und der Energiemonitor macht die Zahlen sichtbar.';


content.querySelector('.atlas-status').firstChild.textContent='Entwurf 03 · Strukturvariante auf Basis von Version 2. Gemeinsame Diagramme mit Datenstand je Ansicht; Karte als Vorschau. ';


const conclusion=document.createElement('section');conclusion.className='atlas-section v3-conclusion';conclusion.innerHTML='<div class="atlas-wrap"><div class="atlas-head"><div><p class="atlas-kicker">Vom Ort zum eigenen Zuhause</p><h2>Was bedeutet das für Bürgerinnen und Bürger?</h2></div><p>Die Entwicklung im Ort ist das eine. Was sich für Ihren Haushalt lohnt, zeigen drei Beispielrechnungen.</p></div><div class="v3-examples sc-feature-list">'+[
['house','Eigenes Dach','6.000 €','in fünf Jahren','Mit Solar auf dem Dach sparen Sie Stromkosten und erhalten Geld für überschüssigen Strom. Die Anschaffungskosten sind hier noch nicht abgezogen.','photovoltaik-rechner','Solar selbst durchrechnen'],
['heatpump-modern','Heizung erneuern','28.200 €','über 20 Jahre','So viel kann eine Wärmepumpe gegenüber einer neuen Gasheizung sparen – gerechnet für ein Einfamilienhaus mit 140 m².','waermepumpe-rechner','Wärmepumpe durchrechnen'],
['balcony-modern','Balkonkraftwerk','340 €','pro Jahr','Eigener Strom vom sonnigen Südbalkon senkt Ihre Stromrechnung. Ein kleiner Speicher hält einen Teil davon für den Abend bereit.','balkonkraftwerk/rechner','Balkonkraftwerk durchrechnen']].map(([visual,t,n,period,desc,url,cta],index)=>'<article class="sc-feature-card"><solar-illustration class="v3-example-art sc-feature-visual" motif="'+visual+'" label="'+t+'" circle loading="lazy"></solar-illustration><div class="v3-example-copy sc-feature-content"><p class="atlas-kicker">'+t+'</p><h3><span class="v3-result-amount sc-delta"><span class="v3-result-plus" aria-label="Plus"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" aria-hidden="true"><path d="M12 4v16M4 12h16"/></svg></span>'+n+'</span><small>'+period+'</small></h3><p>'+desc+'</p></div><a class="v3-example-cta sc-feature-action" href="https://solar-check.io/'+url+'">'+cta+' →</a></article>').join('')+'</div><p class="v3-source-note">Mit den bestehenden Rechnern am 17. September 2026 nachgerechnet. Standortertrag Höchberg: 1.099 kWh/kWp pro Jahr; Haushaltsstrom: 31,2 ct/kWh. Beträge gerundet. Ihr Ergebnis hängt von Verbrauch, Anlage, Investition und Energiepreisen ab.</p></div>';document.querySelector('#atlas-ranking').after(conclusion);
const calculationNote=conclusion.querySelector('.v3-source-note');
const calculationHelp=document.createElement('details');
calculationHelp.className='v3-calculation-help';
calculationHelp.innerHTML='<summary aria-label="Grundlagen der Beispielrechnungen" title="Grundlagen der Beispielrechnungen">?</summary><div><strong>Grundlagen der Beispielrechnungen</strong><p>'+calculationNote.textContent+'</p></div>';
conclusion.querySelector('.atlas-head').prepend(calculationHelp);
calculationNote.remove();
// Page-wide attribution; per-chart dates and calculation assumptions remain local.
const sources=document.createElement('section');
sources.id='atlas-sources';sources.className='atlas-wrap atlas-sources';
sources.setAttribute('aria-labelledby','atlas-sources-title');
sources.innerHTML='<h2 id="atlas-sources-title">Daten & Quellen</h2><p><strong>Anlagen, Leistung, Speicher und Zubau:</strong> <a href="https://www.marktstammdatenregister.de/MaStR/Datendownload" target="_blank" rel="noopener">Marktstammdatenregister der Bundesnetzagentur</a>. <strong>Einwohner und Ortsvergleiche:</strong> <a href="https://www.destatis.de/DE/Themen/Laender-Regionen/Regionales/Gemeindeverzeichnis/_inhalt.html" target="_blank" rel="noopener">Statistisches Bundesamt (Destatis), Gemeindeverzeichnis</a>. Datenlizenz: <a href="https://www.govdata.de/dl-de/by-2-0" target="_blank" rel="noopener">dl-de/by-2-0</a>. Für diese Seite durch Solar Check zusammengefasst, berechnet und grafisch aufbereitet.</p><p><strong>Wetter und modellierte Solarleistung:</strong> <a href="https://open-meteo.com/" target="_blank" rel="noopener">Open-Meteo</a> · <a href="https://creativecommons.org/licenses/by/4.0/" target="_blank" rel="noopener">CC BY 4.0</a>. Für die historischen Tages- und Jahresverläufe: ERA5, Copernicus Climate Change Service, über Open-Meteo. Eigene Modellrechnung; keine gemessene Stromerzeugung.</p><p><strong>Kartengeometrien:</strong> GeoBasis-DE / BKG, <a href="https://www.govdata.de/dl-de/by-2-0">dl-de/by-2-0</a>, vereinfacht.</p><p>Der Datenstand steht jeweils bei den Zahlen. Die Rangliste basiert auf dem Atlas-Registerstand vom '+date(register.rankingDate)+', die Bestandsdiagramme auf dem Export vom '+date(register.sourceDate)+'. Einwohnerstand: '+date(register.populationDate)+'. <a href="https://solar-check.io/datenstand">Mehr zu Datenstand und Quellen</a> · <a href="https://solar-check.io/methodik">So rechnen wir</a></p>';
const draftStatus=content.querySelector('.atlas-status');
content.append(sources);
// The weather attribution is already present at its chart and in the source list.
draftStatus.remove();

}mount();})();
