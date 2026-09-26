import {mountFooter} from '/api/admin/design-shared/footer.js';
function mount(){
 const content=document.querySelector('.atlas-content');
 if(!content||!document.querySelector('.v3-data')){setTimeout(mount,100);return;}
 const target=document.createElement('div');content.after(target);
 mountFooter(target,{homeHref:'https://solar-check.io/',atlasHref:'https://solar-check.io/solar-atlas'});
}
mount();
