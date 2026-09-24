// One sprite with every state outline, referenced by the site footer
// (lib/site-fuss.ts) as <use href="/bundeslaender.svg#bl-<slug>">. Built from
// the generated outlines once at build time and cached like a static file —
// inlined, the sixteen paths would weigh ~30 kB on every page.
import { BUNDESLAND_UMRISS, BUNDESLAND_UMRISS_SEITE } from "../../lib/bundesland-umrisse";
import { slugify } from "../../lib/atlas-cities";

export const dynamic = "force-static";

export function GET() {
  const seite = BUNDESLAND_UMRISS_SEITE;
  const symbole = Object.entries(BUNDESLAND_UMRISS)
    .map(([name, d]) => `<symbol id="bl-${slugify(name)}" viewBox="0 0 ${seite} ${seite}"><path d="${d}"/></symbol>`)
    .join("");
  return new Response(`<svg xmlns="http://www.w3.org/2000/svg">${symbole}</svg>`, {
    headers: {
      "content-type": "image/svg+xml; charset=utf-8",
      "cache-control": "public, max-age=86400, s-maxage=31536000, stale-while-revalidate=86400",
    },
  });
}
