import { HERO_SZENE_INNER_HTML } from "../../../../components/gemeinde/hero-szene";

/** Presentation-only crop of the shared scene; no second renderer or weather model. */
export function GET() {
  return new Response(`<!doctype html><html lang="de"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex"><link rel="stylesheet" href="/gemeinde/basis.css"><link rel="stylesheet" href="/hero-system/hero.css"><style>html,body{margin:0;overflow:hidden}.solar-page .hero{height:820px;min-height:820px}.scene{position:absolute;inset:0}body{background:#dce5db}</style></head><body><div class="solar-page" data-hero-system><section class="hero"><div class="scene" aria-hidden="true">${HERO_SZENE_INNER_HTML}</div></section></div><script src="/homepage-study/hero-contrast.js"></script><script src="/shared-nav/hero-presentation.js"></script><script type="module" src="/hero-system/funding-host.js"></script></body></html>`, { headers: { "Content-Type": "text/html; charset=utf-8", "X-Robots-Tag": "noindex", "Content-Security-Policy": "frame-ancestors 'self'", "X-Frame-Options": "SAMEORIGIN" } });
}
