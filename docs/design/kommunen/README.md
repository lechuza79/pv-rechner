# Municipal landing page — release integration, 3 October 2026

## Current decision

The user approved publication of the reviewed scroll composition, plus:
- `/fuer-organisationen/kommunen`
- Title: `Energiemonitor, Energie-Checks & Datenstories für Kommunen | Solar Check`
- Main navigation: Checks & Rechner; Für Organisationen.
- Kommunen links to the offering. Versorger, Fachbetriebe and Medien & Creator are explicitly upcoming, without placeholder destination pages.
- Cross-links from Vor Ort, the homepage municipal audience teaser, municipality offer areas and footer.

## One composition

`kommunen.html`, `scroll-template.ts`, `shared.tsx` and the two client entries are the source for both review and publication. `npm run kommunen:build` renders the same shared components and bundles them under `public/kommunen/`; this output is ignored and rebuilt by prebuild. The route reads the generated HTML. Metadata/canonical are defined in `lib/kommunen-seite.ts`. No runtime parsing of a compiled JavaScript bundle and no duplicate JSX page.

Production embeds and the public package endpoint are same-origin. The production builder accepts only dependencies in this checkout; it never reads another worktree or redirects to development servers. Preview.ts retains its explicit local-only dependencies. CSS boundaries for the landscape and contact box preserve the accepted header/dropdown fixes.

The tablet now uses the embedded monitor's native scroll viewport rather than a clipped, non-interactive 2400px document with an automatic translation. Place links open a new tab. The mobile tablet intentionally extends beyond the column at 135% width; retain this approved crop.

## Release integration

The reviewed shared stage and required widget dependencies are integrated in this checkout. The production builder rejects foreign worktree dependencies. The stage owner supplied a hashed source/runtime inventory; newer mainline projection, rounding, framing and chart animation behavior was preserved during integration.

Height wind is delivered by the hourly park-weather job and the shared model store; see `docs/park-wetter-betrieb.md`. No direct external weather fallback runs in the page or its APIs. The local preview on 4386 remains available while the integrated production package is checked.

## Verification boundary

The integrated production build passes. Release verification covers the shared components, source/route inventories and the full unit suite. Browser checks and the subsequent public deployment remain separate gates; a local build is not evidence of public availability.

The original review history follows below; it is historical, not proof of the integrated release.

---

# Municipal landing page — local review

Continues the uncommitted `kommunen.html` / `kommunen.css` draft handed over from the offer-matrix worktree on 2026-09-30. The original files, matrix and its port 4381 were not modified.

## Run

From this checkout:

```sh
node --import tsx docs/design/kommunen/preview.ts 4382
```

Open http://127.0.0.1:4382/kommunen.html . Bound to loopback only. No production route, no form submission endpoint, no deployment. Uses the existing dependencies (currently a node_modules symlink to the main checkout); no environment secrets required.

## Reuse and scope

- Shared header and navigation constants from `lib/neon-unterseite.ts`.
- Existing `overview.css`, `waitlist.css`, navigation scripts and municipality illustration.
- Central tokens imported from `lib/theme.ts`; shared footer rendered by `siteFussHtml()`.
- Only municipal composition and copy live here. No charts, calculator embeds or new waitlist flow.
- Navigation redirects to the real public pages. Search uses the real read-only public search endpoints.
- Contact CTA opens the existing contact form, preselecting cooperation and an editable municipal pilot message. No message was sent during verification.
- Prices, quantities and term lengths remain open. Free entry is planned with no automatic paid conversion. Website branding, export branding and planned enhancements are distinguished.

## Verification — 2026-09-30

Compared both current public waitlist pages visually. Local preview inspected at desktop and phone sizes in the browser. Document width equals viewport width at 1440, 1280, 768, 375 and 320 px. No main-content overflow at 375 and 320 px. Main illustration loaded. Local browser console initially and after mobile interaction: no warnings/errors. Mobile menu opens and closes.

A real CTA contrast defect from the shared dark section's anchor styling was corrected and measured: both CTA labels now rgb(19,37,39) on rgb(212,255,36). Anchor navigation reaches the pilot section with the expected 32 px offset. Contact CTA actually opened the existing public form with the expected subject and editable message. Calculator and atlas link targets were loaded and verified separately. Automated offscreen link clicks were unreliable during smooth scrolling in the in-app browser; do not treat those click attempts as proof.

Screenshots: `/Users/eule/.codex/visualizations/2026/09/30/01a0f296-66f4-71e3-9238-738697b9fde0/kommunen-desktop.png`, `kommunen-mobil.png`, `kommunen-kontakt-mobil.png`.

No Next production build was run: this is a local design preview, not an integrated production route. No commit, push or merge. Worktree and own preview remain active for visual review; foreign worktrees are untouched. The task is awaiting visual acceptance, not abandoned. Stop this preview process before retiring this worktree.

## Shared component correction

The own breadcrumb and municipal button rules have been removed. `shared.tsx` imports and renders the real `Breadcrumb` component; the existing direct-child rule correctly produces no breadcrumb for this page. Buttons, links, cards, card headings and labels import `EditorialContent.module.css` directly. The preview server bundles these actual CSS modules with the existing esbuild dependency; generated output stays ignored in `.generated/`. The server-only marker is removed only within this server-side preview bundle so React SSR can use the normal React runtime; no client bundle is produced. Restart the preview after shared component changes.

No new general button component was introduced. The discoverability gap for the existing editorial button/link/card classes was handed to the SEO session at the user's request. The contact area now uses the same shared light card and primary action. No copied button styling remains in the municipal stylesheet.

Rechecked 1440, 375 and 320 px: no page overflow, no content overflow at 320 px, no decorative arrows in main content, no console warnings/errors. Both primary actions use the imported common class and dark label color. Contact URL retains the verified topic and editable message. No production build, publish or merge in this correction.

## Shared previews (30 September)

- Calculator previews are selected directly from `navigationContent` (the same renderer used by the homepage tool overview), not maintained as copied markup. PV recommendation and direct calculation retain their separate destinations; balcony and heat pump are included. Decorative arrows are omitted in this composition.
- Dashboard mounts the real `components/atlas/RegionSearch`, including its actual search and routing adapter. The preview proxies only the read-only search endpoint.
- Stories mount the unchanged homepage `mountStoryCards` module and stylesheet, with its existing municipality selection and reader. Only the placement width is constrained to the card. These are dated examples, not a new live story feed.
- Widget preview selection waits for the central gallery work as requested. No separate chart renderer created.
- Contact design awaits the user's joint design choice; copy and existing contact flow stay intact.

The preview now bundles a small React client entry for the existing search component. Other preview renderers are imported from their original public modules. Restart after client/source changes.

Story appearance correction: the host now uses the original `av-stories` class and loads `homepage-study/homepage.css`, as the homepage does. No municipal palette is defined. The duplicate section frame rule was removed; only the placement constraint for the full-viewport strip remains local.

## Product preview update (1 October)

The three product sections alternate preview placement on desktop and stack on mobile. Dashboard/widgets share a dark section with the public municipality monitor inside a landscape tablet. The phone shell follows the existing LIAB reference `docs/00-assets/liab-landing-final.html`; only the presentation frame is adapted here. Calculator cards still come from the shared navigation renderer.

Stories now mount `MunicipalStoryModal` with its additive `inline` option; the existing reader, chart rendering, description, pagination and export actions are retained. The shared `RegionSearch` changes the selected place; kreisfreie city IDs are normalized to municipality IDs. The user explicitly authorized server-side reads of stored municipality stories for this local preview on 1 October. `/municipal-package` validates an eight-digit municipality ID, returns only name, ID and stories, and calls the existing package loader. Credentials are loaded only in the server process; the server is bound to loopback, responses are not cached, no database writes or publishing occur.

Browser verification: Nidda and Trier stories load; pause and next-story controls work. Desktop alternation and dark tablet preview checked. The additional Vitest checks could not start because the shared dependency installation is missing `chai`; this is not a passing test run.

### Shared widget group (1 October)

The municipal gallery now mounts `GemeindeWidgetGroup`, using the reviewed
`WidgetConfigurationGroup` and `WidgetPreviewCard` from the widget-gallery worktree.
The previous local map/ranking data adapters have been removed. The local preview
redirects `/embed/*` to the still-unreleased widget runtime at `127.0.0.1:4319`.
Keep that server running when reviewing this page. This is a local integration,
not a production release or a transfer of all renderer changes. Before release,
merge the shared renderer/routes work described in that worktree's
`docs/handoffs/widget-gallery-curation.md` and remove the local redirect.

## Integration verification, 3 October 2026

The real shared menu was checked on the local Next server 4491 at 1440px, 1281px and 390px. Removed obsolete last-child alignment rules that overrode the shared centered flyout for Organisations. The three upcoming audience cards have no misleading link targets. Screenshots: /tmp/kommunen-menu-desktop.jpg, /tmp/kommunen-menu-mobile.jpg. 46 navigation/metadata/homepage/search tests passed after the changes.

All three centrally rendered widget frames loaded on the same origin in the integration preview; switching the shared Theme from dark to light visibly updated all three. This wiring is also running on 4386. Regional scope selection, final widget settings and production takeover remain owned by the widget session; this check does not imply those are complete. The preview bundles are snapshots of directly imported source and require a rebuild after central source changes; they are not maintained component copies.
