import { esc } from "./neon-seite";
import { WARTELISTE_VORSCHAU } from "./warteliste-vorschau";
import { aktuelleWartelisteFassung, type WartelisteName } from "./warteliste-einwilligung";

/** One form and submit flow for all product waitlists. */
export function wartelisteFormular(liste: WartelisteName, ueberschrift: string) {
const FASSUNG = aktuelleWartelisteFassung(liste);
const vorschau = WARTELISTE_VORSCHAU[liste];
const INHALT = `
<link rel="stylesheet" href="/homepage-study/waitlist.css">
<div class="sc-waitlist-preview">
<div class="intro"><p class="eyebrow"><span class="hs-coming">Demnächst bei Solar Check</span></p><h1>${esc(ueberschrift)}</h1><p>${esc(FASSUNG.einleitung)}</p><a class="sc-waitlist-jump" href="#wl-titel">Zum Start Bescheid bekommen <span aria-hidden="true">↓</span></a></div>
<div class="sc-waitlist-art"><img class="sc-waitlist-visual" src="${esc(vorschau.bild)}" alt="${esc(vorschau.alt)}" width="480" height="480"></div>
</div>
<section class="sc-waitlist-plan" aria-labelledby="wl-features"><h2 id="wl-features">Das ist geplant</h2><ol class="sc-waitlist-features">${vorschau.funktionen.map(([titel,text],i) => `<li><span class="sc-waitlist-number" aria-hidden="true">0${i+1}</span><h3>${esc(titel)}</h3><p>${esc(text)}</p></li>`).join("")}</ol></section>
<section class="sc-waitlist sc-waitlist-signup" aria-labelledby="wl-titel">
  <div data-wl-formular>
    <div class="sc-waitlist-signup-copy"><p class="eyebrow">Als Erstes erfahren</p><h2 id="wl-titel" tabindex="-1">Wir sagen dir Bescheid,<br>sobald es losgeht.</h2><p>Eine Nachricht zum Start.<br>Kein Newsletter.</p></div>
    <form novalidate>
      <label for="wl-email">E-Mail-Adresse</label>
      <input id="wl-email" name="email" type="email" autocomplete="email" maxlength="254" required placeholder="du@beispiel.de">
      <div class="sc-waitlist-trap" aria-hidden="true"><label>Website<input name="website" tabindex="-1" autocomplete="off"></label></div>
      <button type="submit">Auf die Warteliste</button>
      <p class="sc-waitlist-consent">${esc(FASSUNG.zusage)} <a href="/datenschutz">Datenschutz</a></p>
      <p role="status" aria-live="polite"></p>
    </form>
  </div>
  <div data-wl-fertig hidden tabindex="-1">
    <h2>Fast geschafft</h2>
    <p>Bitte bestätige deine Anmeldung über den Link in deinem Postfach. Ohne Bestätigung schreiben wir dir nicht.</p>
  </div>
</section>`;

// Plain script, no bundle: the page must work the moment it is parsed.
const SKRIPT = `(function(){
var box=document.querySelector('[data-wl-formular]'),fertig=document.querySelector('[data-wl-fertig]');
var f=box.querySelector('form'),status=f.querySelector('[role=status]'),knopf=f.querySelector('[type=submit]'),seit=Date.now();
f.addEventListener('submit',function(e){e.preventDefault();
 if(!f.elements.email.value||!f.elements.email.checkValidity()){status.textContent='Bitte gib eine gültige E-Mail-Adresse ein.';f.elements.email.focus();return;}
 knopf.disabled=true;status.textContent='';
 fetch('/api/warteliste/anmelden',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({email:f.elements.email.value,website:f.elements.website.value,elapsedMs:Date.now()-seit,consent:${JSON.stringify(FASSUNG.version)}})})
 .then(function(r){return r.json().catch(function(){return{}}).then(function(d){if(!r.ok)throw new Error(d.error||'Die Anmeldung klappt gerade nicht. Bitte später erneut versuchen.');})})
 .then(function(){box.hidden=true;fertig.hidden=false;fertig.focus();})
 .catch(function(err){status.textContent=err.message;})
 .finally(function(){knopf.disabled=false;});
});})();`;

return { inhalt: INHALT, skript: SKRIPT };
}
