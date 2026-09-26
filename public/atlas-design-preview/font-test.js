(()=>{
const groups=[
{label:'Rund um Alfa Slab One',fonts:['Alfa Slab One','Ultra','Gloock','Goblin One','Ceviche One','Bevan','Bigshot One','Bowlby One']},
{label:'Neue Displayfonts',fonts:['Paytone One','Protest Riot','Bangers','Lobster','Lily Script One']},
{label:'Weitere Schriften',fonts:['Anton','Shrikhand','Bungee','Fugaz One','Manufacturing Consent','Damion','Climate Crisis','Astloch','Oi','Megrim','Gasoek One','Warnes','Questrial','Montserrat','Montserrat Bold','Montserrat Black','JetBrains Mono Bold','Poppins','Josefin Sans','Josefin Slab','Creepster']}
];
const fonts=['Original',...groups.flatMap(group=>group.fonts)];
const slug=name=>name.toLowerCase().replaceAll(' ','-');
const query=new URLSearchParams(location.search).get('displayfont')||'montserrat-bold';let index=Math.max(0,fonts.findIndex(name=>slug(name)===query));let request=0;
const panel=document.createElement('nav');panel.className='font-lab';panel.setAttribute('aria-label','Displayfonts vergleichen');panel.innerHTML='<span class="font-lab-label">DISPLAYFONT</span><button data-prev aria-label="Vorherige Schrift">←</button><select aria-label="Displayfont auswählen"></select><button data-next aria-label="Nächste Schrift">→</button><output aria-live="polite"></output><button data-original>Original</button><span class="font-lab-hint">Nur Überschriften · ← / → zum Wechseln</span>';document.body.prepend(panel);
const select=panel.querySelector('select'),status=panel.querySelector('output');select.add(new Option('Original','0'));
let optionIndex=1;
for(const group of groups){const optgroup=document.createElement('optgroup');optgroup.label=group.label;for(const name of group.fonts){optgroup.append(new Option(name==='Creepster'?'Creepster · Halloween':name,String(optionIndex++)));}select.append(optgroup);} 
async function show(next){index=(next+fonts.length)%fonts.length;const current=++request;const name=fonts[index];select.value=String(index);status.textContent='Lädt …';
try{if(index!==0){const loaded=await document.fonts.load((name==='Montserrat Black'?'900':(name==='Montserrat Bold'||name==='JetBrains Mono Bold')?'700':'400')+' 48px "'+name+'"','Höchberg');if(!loaded.length)throw new Error('Missing font');}if(current!==request)return;document.documentElement.style.setProperty('--atlas-display-font','"'+name+'"');document.documentElement.style.setProperty('--atlas-display-weight',name==='Montserrat Black'?'900':(name==='Montserrat Bold'||name==='JetBrains Mono Bold')?'700':'400');document.documentElement.classList.toggle('font-test-active',index!==0);status.textContent=index===0?'Ausgangsschrift':index+' / '+(fonts.length-1);panel.querySelector('[data-original]').setAttribute('aria-pressed',String(index===0));const url=new URL(location.href);if(index===0)url.searchParams.delete('displayfont');else url.searchParams.set('displayfont',slug(name));history.replaceState(null,'',url);}
catch{if(current===request)status.textContent='Schrift konnte nicht geladen werden';}}
panel.querySelector('[data-prev]').onclick=()=>show(index-1);panel.querySelector('[data-next]').onclick=()=>show(index+1);panel.querySelector('[data-original]').onclick=()=>show(0);select.onchange=()=>show(Number(select.value));document.addEventListener('keydown',e=>{if(e.altKey||e.ctrlKey||e.metaKey||e.shiftKey||document.querySelector('dialog[open]')||e.target.closest('input,textarea,select,button,[contenteditable="true"]'))return;if(e.key==='ArrowLeft'||e.key==='ArrowRight'){e.preventDefault();show(index+(e.key==='ArrowRight'?1:-1));}});show(index);
})();
