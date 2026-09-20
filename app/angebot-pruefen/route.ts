import { neonUnterseiteHtml, htmlAntwort } from "../../lib/neon-unterseite";
import { esc } from "../../lib/neon-seite";
import { WARTELISTE_FASSUNGEN } from "../../lib/warteliste-einwilligung";

// Home of the coming offer check (PV and heat pump). Until the check exists
// the page carries only its waitlist and stays out of the index: a page that
// holds nothing but a sign-up form is thin content, and the address is meant
// to rank once the check itself lives here.
//
// The waitlist card is the design package's own (".sc-waitlist" in nav.css,
// built for the menu dialog), placed on the page instead of in a dialog. The
// wording comes from the consent archive, never typed here: what a person
// reads is exactly what their entry stores as consent.
export const dynamic = "force-static";

const FASSUNG = WARTELISTE_FASSUNGEN[WARTELISTE_FASSUNGEN.length - 1];

const INHALT = `
<div class="intro"><p class="eyebrow">Demnächst</p><h1>PV oder Wärmepumpe:<br>Ist das Angebot fair?</h1><p>${esc(FASSUNG.einleitung)}</p></div>
<section class="sc-waitlist" style="margin:0" aria-labelledby="wl-titel">
  <div data-wl-formular>
    <h2 id="wl-titel">Auf die Warteliste</h2>
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

export function GET() {
  return htmlAntwort(
    neonUnterseiteHtml({
      titel: "Angebot prüfen: Photovoltaik oder Wärmepumpe – Solar Check",
      beschreibung:
        "Bald prüfst du hier dein Photovoltaik- oder Wärmepumpen-Angebot: Preis, Auslegung und Leistungen. Trag dich ein, wir sagen Bescheid, sobald es losgeht.",
      pfad: "/angebot-pruefen",
      krume: "Angebot prüfen",
      inhalt: INHALT,
      index: false,
      skript: SKRIPT,
    }),
  );
}
