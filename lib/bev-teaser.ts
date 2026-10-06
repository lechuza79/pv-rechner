export const BEV_TEASER_COPY = {
  titel: "Dein nächstes Auto fährt elektrisch?",
  text: "Passt ein Elektroauto zu deinem Alltag? Wir arbeiten an einem Check, der dir beim Einordnen hilft.",
};

/** Reuses the homepage tool card; also rendered in the no-script tool list. */
export const BEV_TEASER = `<article class="hs-tool hs-tool-service" data-bev-teaser>
<div class="hs-tool-top">06 / ELEKTROAUTO-CHECK <span class="hs-coming">Demnächst</span></div>
<div class="hs-tool-art"><img src="/homepage-study/bev-v1/bev.webp" alt="Illustration eines Elektroautos" loading="lazy" width="480" height="480"><solar-illustration motif="bev" circle label="Elektroauto"></solar-illustration></div>
<h3>${BEV_TEASER_COPY.titel}</h3>
<p>${BEV_TEASER_COPY.text}</p>
<div class="hs-tool-actions"><a href="/elektroauto-check">Mehr Info <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12h14m-6-6 6 6-6 6"/></svg></a></div>
</article>`;
