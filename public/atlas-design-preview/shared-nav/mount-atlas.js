import {mountGlobalNav} from './nav.js';
function mount(){const header=document.querySelector('.site-header');if(!header||!document.querySelector('.atlas-hero-local-nav')){setTimeout(mount,60);return;}mountGlobalNav(header,{active:'atlas',homeHref:'https://solar-check.io/',atlasHref:'https://solar-check.io/solar-atlas'});}mount();
