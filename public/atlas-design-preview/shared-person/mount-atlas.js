import {mountPerson} from './person.js';
function mount(){
 const sources=document.querySelector('#atlas-sources');
 if(!sources){setTimeout(mount,80);return;}
 const target=document.createElement('div');
 sources.before(target);
 const contact=mountPerson(target,{variant:'homepage',portrait:'/atlas-design-preview/sebastian-portrait.png',avatar:'/atlas-design-preview/sebastian-portrait.png',role:'Solar Check',copy:{title:'',after:'. Mit kostenlosen Rechnern und aktuellen Energiedaten.',contact:'Schreib mir'}});
 contact.querySelector('h3').remove();
 contact.querySelector('.sc-person-primary').remove();
 contact.querySelector('.sc-person-actions a').classList.add('sc-person-primary');
 const reassurance=document.createElement('p');reassurance.className='atlas-contact-reassurance';reassurance.textContent='Ohne Anmeldung und ohne Verkaufsanrufe.';contact.append(reassurance);
 contact.classList.add('atlas-wrap','atlas-contact');
 contact.setAttribute('aria-label','Ihr Kontakt bei Solar Check');
}
mount();
