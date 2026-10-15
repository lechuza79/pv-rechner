import React, {useState} from 'react';
import {createRoot} from 'react-dom/client';
import LocationSearch from '../../components/LocationSearch';
import {tokens} from '../../lib/theme';
import {writeLocation} from '../../lib/location';

function SimulationField({form, input, locate, host, original}) {
  const [selected, setSelected] = useState(null);
  return <LocationSearch selected={selected} municipalitiesOnly onLocate={locate ? () => { host.hidden=true; original.hidden=false; original.style.removeProperty("display"); locate.click(); } : undefined}
    onClear={() => {setSelected(null); input.value=''; input.dispatchEvent(new Event('input',{bubbles:true}));}}
    onPick={place => {
      if (!place.plz) return;
      setSelected(place);
      writeLocation(place.plz);
      input.value=place.plz;
      input.dispatchEvent(new Event('input',{bubbles:true}));
      input.dispatchEvent(new KeyboardEvent("keydown",{key:"Enter",bubbles:true}));
    }}/>;
}
function mount() {
  document.querySelectorAll('.hs-location-form:not([data-location-search-mounted])').forEach(form => {
    if (form.inert) return;
    const input=form.querySelector('input[name="plz"]');
    const original=input?.parentElement;
    if (!original) return;
    form.dataset.locationSearchMounted='';
    const host=document.createElement('section');
    host.className='sc-simulation-location-search';
    for(const [name,value] of Object.entries(tokens))host.style.setProperty(name,String(value));
    host.style.setProperty('--color-text-primary', '#153740');
    host.style.setProperty('--color-text-secondary', '#506b70');
    host.style.setProperty('--color-bg', '#e8ece2');
    host.style.setProperty('--color-bg-muted', '#dce3d8');
    host.style.setProperty('--color-cta', '#d4ff24');
    host.style.setProperty('--color-cta-ink', '#153740');
    host.style.setProperty('--font-text', "'DM Sans',sans-serif");
    original.insertAdjacentElement("afterend",host);
    original.hidden=true;
    original.style.setProperty('display','none','important');
    const label=form.querySelector('label');if(label)label.hidden=true;
    createRoot(host).render(<SimulationField form={form} input={input} host={host} original={original} locate={original.querySelector('.hs-locate')}/>);
  });
}
mount();
const observer=new MutationObserver(mount);
observer.observe(document.body,{childList:true,subtree:true,attributes:true,attributeFilter:['inert']});
addEventListener('pagehide',()=>observer.disconnect(),{once:true});
