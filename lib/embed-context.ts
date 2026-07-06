// Detects whether the current page is rendered inside an embed widget (an
// <iframe src="/embed/..."> on a third-party site). Widgets must not write to
// the visitor's browser storage there (§ 25 TDDDG) — the site that embeds the
// widget is the one responsible for cookie/storage consent, and solar-check.io
// has no relationship with that visitor to justify writing to their device.
//
// Detection is path-based (not a build-time flag) because the same client
// bundles/hooks are shared between the full site pages and the embed routes.
export function isEmbedContext(): boolean {
  return typeof window !== "undefined" && window.location.pathname.startsWith("/embed");
}
