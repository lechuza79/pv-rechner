/**
 * Headings are h3/h4 on purpose: the homepage colours every h2 inside its hero
 * (where the header lives) after the sky behind it, which put the group label
 * white on the light panel. Measured by e2e/suche.spec.ts.
 *
 * Markup of the site search results — ONE renderer for the header flyout
 * (browser) and the /suche page (server). Two renderers would drift the way
 * the town page's rebuilt copies did.
 *
 * Input is the JSON of /api/suche. Everything that comes from it is escaped.
 */
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const arrow = '<svg class="sc-nav-link-arrow" width="20" height="20" viewBox="0 0 16 16" fill="none" aria-hidden="true"><path d="M3.333 8h9.334m0 0L8 3.333M12.667 8 8 12.667" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>';
const pin = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 21s-7-6.2-7-11.5a7 7 0 0 1 14 0C19 14.8 12 21 12 21z"/><circle cx="12" cy="9.5" r="2.5"/></svg>';
const link = (href, titel, zusatz = '') => `<a href="${esc(href)}"><span>${esc(titel)}${zusatz ? `<small>${esc(zusatz)}</small>` : ''}</span>${arrow}</a>`;

function ortKarte(ort) {
  const meta = [ort.gattung, ort.kontext].filter(Boolean).join(' · ');
  return `<article class="sc-search-place"><h4>${pin}<span>${esc(ort.name)}${meta ? `<small>${esc(meta)}</small>` : ''}</span></h4><div class="sc-search-place-links">${ort.links.map(l => `<a href="${esc(l.href)}">${esc(l.titel)}</a>`).join('')}</div></article>`;
}

/** Results body. `q` empty → nothing; no hits → a sentence, never a blank box. */
export function searchResultsHtml(ergebnis) {
  if (!ergebnis || !String(ergebnis.q ?? '').trim()) return '';
  const orte = ergebnis.orte ?? [], seiten = ergebnis.seiten ?? [];
  const teile = [];
  if (orte.length) {
    teile.push(`<section class="sc-search-group sc-search-places" aria-label="Orte"><h3 class="sc-nav-section-title">${orte.length === 1 ? 'Ort' : 'Orte'}</h3>${orte.map(ortKarte).join('')}</section>`);
  }
  if (seiten.length) {
    teile.push(`<div class="sc-search-pages">${seiten.map(g => `<section class="sc-nav-column sc-search-group"><h3>${esc(g.titel)}</h3>${g.eintraege.map(e => link(e.href, e.titel, e.zusatz)).join('')}</section>`).join('')}</div>`);
  }
  const hinweis = ergebnis.orteNichtVerfuegbar
    ? '<p class="sc-search-note" role="status">Die Ortssuche ist gerade nicht erreichbar. Themen findest du trotzdem, Orte bitte gleich noch einmal versuchen.</p>'
    : '';
  if (!teile.length) {
    return hinweis || `<p class="sc-search-note" role="status">Zu „${esc(ergebnis.q)}“ haben wir nichts gefunden. Versuch es mit einem Ort, einer Postleitzahl oder einem Thema wie „Wärmepumpe“ oder „Förderung“.</p>`;
  }
  return hinweis + teile.join('');
}

/** The form. Works without JavaScript: it submits to /suche. */
export function searchFormHtml(q = '', id = 'sc-search-input') {
  return `<form class="sc-search-form" action="/suche" method="get" role="search"><label class="sc-search-label" for="${id}">Suche</label><div class="sc-search-field"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" aria-hidden="true"><circle cx="11" cy="11" r="6.5"/><path d="m20 20-4.2-4.2"/></svg><input id="${id}" name="q" type="search" value="${esc(q)}" placeholder="Ort, Postleitzahl oder Thema" autocomplete="off" enterkeyhint="search" maxlength="80"></div></form>`;
}
