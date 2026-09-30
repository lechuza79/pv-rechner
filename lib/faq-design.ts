// One FAQ design for the static homepage and React pages.
export const FAQ_CSS = `
.sc-faq{--faq-muted:#a7bcbb;--faq-hover:#d4ff24;background:#08191c;color:#e8eee9;padding:var(--sc-space-section,72px) var(--sc-page-inset,max(24px,5vw)) 88px;font-family:var(--font-text,'DM Sans'),sans-serif}
.sc-faq-wrap{max-width:var(--sc-layout-content,1120px);margin:0 auto}
.sc-faq h2{font-family:var(--font-heading,Montserrat),sans-serif;font-size:var(--sc-type-secondary-label-size,13px);line-height:1.5;font-weight:500;letter-spacing:.08em;text-transform:uppercase;color:var(--faq-muted);margin:0 0 16px}
.sc-faq details{border-bottom:1px solid #aec4bd30}
.sc-faq details:last-child{border-bottom:0}
.sc-faq summary{cursor:pointer;list-style:none;display:flex;align-items:center;justify-content:space-between;gap:24px;min-height:92px;box-sizing:border-box;padding:28px 0;font-size:var(--sc-type-title-size,20px);line-height:1.4;font-weight:500;transition:color 180ms ease}
.sc-faq summary:hover{color:var(--faq-hover)}
.sc-faq summary::-webkit-details-marker{display:none}
.sc-faq summary::after{content:"";width:10px;height:10px;margin-right:4px;flex:none;border-right:1.5px solid currentColor;border-bottom:1.5px solid currentColor;transform:rotate(45deg);transition:transform 240ms ease}
.sc-faq details[open]:not([data-closing]) summary::after{transform:rotate(225deg)}
.sc-faq summary:focus-visible{outline:2px solid var(--faq-hover);outline-offset:4px}
.sc-faq-answer{overflow:hidden}
.sc-faq p{font-size:var(--sc-type-body-size,16px);line-height:var(--sc-type-body-leading,1.6);color:var(--faq-muted);margin:0 0 24px;max-width:680px}
.sc-faq a{color:inherit;font-weight:600;text-decoration:underline;text-underline-offset:.2em;text-decoration-thickness:1px;text-decoration-color:color-mix(in srgb,currentColor 40%,transparent)}
.sc-faq a:hover{text-decoration-color:currentColor}
.sc-faq[data-theme="light"] a{color:var(--color-accent)}
.sc-faq .sc-faq-cta{display:inline-block;margin:0 0 28px;font-size:var(--sc-type-action-size,14px);font-weight:500}
@media(prefers-reduced-motion:reduce){.sc-faq summary,.sc-faq summary::after{transition:none}}
.sc-live{background:var(--sc-surface-light);padding:var(--sc-space-section,72px) var(--sc-page-inset,max(24px,5vw)) 0;font-family:var(--font-text,'DM Sans'),sans-serif;color:var(--ink)}
.sc-live-wrap{max-width:var(--sc-layout-widget,760px);margin:0 auto}
.sc-live h2{font-family:var(--font-heading,Montserrat),sans-serif;font-size:var(--sc-type-section-compact-size,clamp(26px,3vw,38px));line-height:1.25;margin:0 0 12px}
.sc-live p{font-size:var(--sc-type-body-size,16px);line-height:1.6;margin:0 0 24px}
.sc-live iframe{display:block;width:100%;border:0;min-height:560px}
.sc-live .sc-stand{font-size:var(--sc-type-eyebrow-size);line-height:1.7;margin:32px 0 0;padding:24px 0 0;border-top:1px solid color-mix(in srgb,var(--ink) 18%,transparent)}
.sc-live .sc-stand a{color:inherit}

.sc-faq[data-theme="light"]{--faq-muted:var(--color-text-muted);--faq-hover:var(--color-accent);background:transparent;color:var(--color-text-primary)}
.sc-faq[data-theme="light"] details{border-color:var(--color-border)}
.sc-faq[data-layout="inline"]{padding:0}
.sc-faq[data-layout="inline"] h2{font-size:var(--font-size-caption)}
.sc-faq[data-layout="inline"] summary{font-size:var(--font-size-h3)}
.sc-faq[data-layout="inline"] p{font-size:var(--font-size-body)}
`;
