import { neonSeiteHtml } from "../lib/neon-seite";

// The homepage is the approved design document (see lib/neon-seite.ts),
// prerendered at build and revalidated daily (the FAQ carries the year).
export const dynamic = "force-static";
export const revalidate = 86400;

export function GET() {
  return new Response(neonSeiteHtml("startseite"), { headers: { "Content-Type": "text/html; charset=utf-8" } });
}
