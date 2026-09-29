import { seiteFuerKennung } from "../../../../lib/fachbetrieb-seite";
import { holeFremdbild } from "../../../../lib/fremdbild";
import { aufloesen, oeffnen } from "../../../../lib/fremdbild-netz";

/**
 * The installer's logo on his partner page, served through OUR server.
 *
 * Loaded directly from his server, the <img> would send every visitor's IP
 * address to a third party before they clicked anything (Legal checklist 2).
 *
 * This route is NOT an open proxy: it takes only the page ID and resolves the
 * image URL from our database, through the same resolver the page itself uses
 * (so the operator's LOGO_VOR_ZUSAGE switch applies here too). All network
 * rules — public addresses only, pinned connection, redirect limit, size cap,
 * raster formats by magic bytes, no SVG — live in `lib/fremdbild.ts`.
 *
 * Any failure answers 404: the page then simply shows no logo.
 */

export const runtime = "nodejs";

// A logo changes rarely; the CDN holds it for a week and keeps serving the old
// one while it refreshes. The 404 is cached briefly so a broken favicon does
// not trigger a server-side fetch on every page view.
const CACHE_OK = "public, max-age=86400, s-maxage=604800, stale-while-revalidate=604800";
const CACHE_FEHLT = "public, max-age=300, s-maxage=3600";

function fehlt(): Response {
  return new Response(null, {
    status: 404,
    headers: { "Cache-Control": CACHE_FEHLT, "X-Content-Type-Options": "nosniff" },
  });
}

export async function GET(_req: Request, props: { params: Promise<{ kennung: string }> }): Promise<Response> {
  const { kennung } = await props.params;
  const seite = await seiteFuerKennung(kennung).catch(() => null);
  if (!seite?.logoUrl) return fehlt();

  const bild = await holeFremdbild(seite.logoUrl, { aufloesen, oeffnen }).catch(() => null);
  if (!bild) return fehlt();

  return new Response(Buffer.from(bild.bytes), {
    status: 200,
    headers: {
      "Content-Type": bild.typ,
      "Content-Length": String(bild.bytes.length),
      "Cache-Control": CACHE_OK,
      "X-Content-Type-Options": "nosniff",
      // Defence in depth: even if something slipped through, a document served
      // from this path may not run anything.
      "Content-Security-Policy": "default-src 'none'; sandbox",
    },
  });
}
