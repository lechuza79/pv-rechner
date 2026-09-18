/* Load trust-art.js before this script. Every instance owns an isolated SVG. */
class SolarTrustBadge extends HTMLElement {
 static get observedAttributes(){return ['motif','hide-layers','motion'];}
 connectedCallback(){if(!this.shadowRoot)this.attachShadow({mode:'open'});this.preference=matchMedia('(prefers-reduced-motion:reduce)');this.onPreference=()=>{if(this.preference.matches){this.move(0,0);this.shadowRoot.querySelectorAll('[data-layer]').forEach(e=>e.getAnimations().forEach(a=>a.cancel()))}};this.preference.addEventListener('change',this.onPreference);this.render();}
 attributeChangedCallback(){if(this.isConnected&&this.shadowRoot)this.render();}
 render(){const art=window.SolarTrustArt?.[this.getAttribute('motif')];if(!art)return;this.shadowRoot.innerHTML='<style>:host{display:block;width:48px;touch-action:pan-y}svg{display:block;width:100%;height:auto;overflow:visible}svg [hidden]{display:none}.move-layer{transition:transform .25s ease-out}@media(prefers-reduced-motion:reduce){.move-layer{transition:none}}</style>'+art;
 const hidden=new Set((this.getAttribute('hide-layers')||'').split(','));this.shadowRoot.querySelectorAll('[data-layer]').forEach(e=>e.toggleAttribute('hidden',hidden.has(e.dataset.layer)));
 this.onpointermove=e=>{if(this.getAttribute('motion')==='off'||matchMedia('(prefers-reduced-motion:reduce)').matches||e.pointerType==='touch')return;const b=this.getBoundingClientRect();this.move((e.clientX-b.left)/b.width*2-1,(e.clientY-b.top)/b.height*2-1)};this.onpointerleave=()=>this.move(0,0);}
 move(x,y){this.shadowRoot.querySelectorAll('.move-layer').forEach(e=>{const d=+e.dataset.depth;e.style.transform=`translate(${x*d*.85}px,${y*d*.65}px)`})}
 replay(){if(matchMedia('(prefers-reduced-motion:reduce)').matches)return;this.shadowRoot.querySelectorAll('[data-layer]').forEach((e,i)=>{e.getAnimations().forEach(a=>a.cancel());e.animate([{opacity:0,transform:'translateY(5px)'},{opacity:1,transform:'translateY(0)'}],{duration:400,delay:i*90,easing:'ease-out',fill:'backwards'})})}
 disconnectedCallback(){this.preference?.removeEventListener('change',this.onPreference);this.onpointermove=null;this.onpointerleave=null;}
}
if(!customElements.get('solar-trust-badge'))customElements.define('solar-trust-badge',SolarTrustBadge);
