# Widget completion inventory — 2026-10-12

This is the acceptance record, not a second widget registry. Sources and presentations below are derived from `widgetInventory(curatedGalleryEntries(place))` for Nidda. Changes to that inventory are covered by the inventory tests and the browser suite.

## Scope

- 42 existing gallery widget identities, 82 existing configured views; no new visual variants.
- 10 publishable municipal story templates, full and reduced detail, use `MunicipalWidgetVisual` in dashboard, reader, teaser and export.
- 33 approved homepage story snapshots retain their original data and use the same renderer. Editorial drafts remain explicit drafts and are not silently published.
- Registered applications `simulation`, `foerder-check`, and calculator `rechner` remain applications, not chart variants. Their original entry points remain intact; the funding check already reuses its shared component.

## Completion gates

- [x] Derive the inventory from the actual catalog and gallery; account for applications and drafts separately.
- [x] Render existing dashboard and story views through their shared implementations, preserving presentation and controls.
- [x] Keep supplied live observations visible while refreshing, including hero trade previews.
- [x] Use the same reference-data service in a standalone embed and a dashboard.
- [x] Persist built local preview dashboards locally; never write test configurations into the live database.
- [x] Reopen immutable saved configurations in a real filesystem round trip; reject invalid configurations and retain admin protection.
- [x] Avoid whole-page failure when a responsive host becomes narrower than a preferred widget width.
- [x] Give bare dashboard previews a surface matching their selected palette; preserve standalone transparency.
- [x] Replace obsolete iframe tests with coverage derived from all existing direct dashboard views.
- [x] Browser acceptance of all 82 views at narrow and wide sizes, including interactions and existing export paths (80 render data; two show the expected missing-story state).
- [x] Full production build; the containing commit is gated by the required TypeScript check and full unit suite.
- [x] Save the verified local state in the containing commit (no public app deployment).
- [x] Apply hosted storage migration through the existing privileged setup RPC; verify insert/read, deny anonymous direct access, and remove only the disposable acceptance record.
- [ ] Production release gate: verify the authenticated save button after deploying this app version. The local browser was not signed in; database verification does not imply a logged-in UI test.

## Actual views

`Ready` means shared rendering is implemented. Browser acceptance is recorded separately below; an implementation row alone is not proof of visual correctness.

| Widget | Existing view | Presentation | Source | Implementation |
|---|---|---|---|---|
| regional-map | Wetteraukreis | full | `/embed/regional-map?ags=06440&source=page&selected=06440016` | Ready |
| gemeinde-ranking | Nidda | full | `/embed/galerie/gemeinde-ranking?ags=06440016` | Ready |
| regional-annual-growth | Nidda | full | `/embed/galerie/regional-annual-growth?ags=06440016` | Ready |
| gemeinde-solar-monat | Nidda | full | `/embed/galerie/gemeinde-solar-monat?ags=06440016` | Ready |
| regional-race | Wetteraukreis | full | `/embed/regional-race/06440` | Ready |
| regional-composition | Nidda | full | `/embed/galerie/regional-composition?ags=06440016` | Ready |
| gemeinde-anlagenraster | Nidda | full | `/embed/galerie/gemeinde-anlagenraster?ags=06440016` | Ready |
| gemeinde-energie-jahr | Nidda | full | `/embed/galerie/gemeinde-energie-jahr?ags=06440016` | Ready |
| regional-electricity-value | Nidda | full | `/embed/galerie/regional-electricity-value?ags=06440016` | Ready |
| regional-feed-in-value | Nidda | full | `/embed/galerie/regional-feed-in-value?ags=06440016` | Ready |
| regional-current-power | Nidda | full | `/embed/galerie/regional-current-power?ags=06440016` | Ready |
| pv-kostenrennen | Amortisations-Rennen | full | `/embed/pv-kostenrennen` | Ready |
| pv-kostenrennen | Amortisations-Rennen | hero | `/embed/pv-kostenrennen?presentation=hero` | Ready |
| heizkostenrennen | Heizkosten-Rennen | full | `/embed/heizkostenrennen` | Ready |
| gruengas-heizkosten | Ganzes Widget | full | `/embed/gruengas-heizkosten` | Ready |
| gruengas-heizkosten | Nur Balken | full | `/embed/gruengas-heizkosten?view=bars` | Ready |
| gruengas-heizkosten | Nur Linien | full | `/embed/gruengas-heizkosten?view=lines` | Ready |
| strommix | Strommix | full | `/embed/strommix` | Ready |
| strommix-anteil | Kernenergie-Anteil | full | `/embed/strommix-anteil` | Ready |
| strommix-anteil | Kernenergie-Anteil | hero | `/embed/strommix-anteil?variant=teaser` | Ready |
| atomstrom-tage | Detail | full | `/embed/atomstrom-tage?variant=full&metric=energy` | Ready |
| atomstrom-tage | Detail | hero | `/embed/atomstrom-tage?variant=teaser&metric=energy` | Ready |
| stromhandel | Automatisch | full | `/embed/stromhandel` | Ready |
| stromhandel | Automatisch | compact | `/embed/stromhandel?presentation=compact` | Ready |
| stromhandel | Automatisch | hero | `/embed/stromhandel?presentation=hero` | Ready |
| stromhandel | Radiale Balken | full | `/embed/stromhandel?variant=radial` | Ready |
| stromhandel | Radiale Balken | compact | `/embed/stromhandel?variant=radial&presentation=compact` | Ready |
| stromhandel | Radiale Balken | hero | `/embed/stromhandel?variant=radial&presentation=hero` | Ready |
| stromhandel | Balken | full | `/embed/stromhandel?variant=bars` | Ready |
| stromhandel | Balken | compact | `/embed/stromhandel?variant=bars&presentation=compact` | Ready |
| stromhandel | Balken | hero | `/embed/stromhandel?variant=bars&presentation=hero` | Ready |
| stromhandel | Gesamtsummen | full | `/embed/stromhandel?variant=totals` | Ready |
| laender-strommixrennen | Ländervergleich | full | `/embed/laender-strommixrennen` | Ready |
| laender-strommix-pro-kopf | Je Einwohner | full | `/embed/laender-strommix-pro-kopf` | Ready |
| welt-zubaurennen | Weltweiter Zubau | full | `/embed/welt-zubaurennen` | Ready |
| welt-stromrennen | Weltweite Stromerzeugung | full | `/embed/welt-stromrennen` | Ready |
| zubau-erneuerbare-atom | Zubau EE vs. Atom | full | `/embed/zubau-erneuerbare-atom` | Ready |
| einspeiseverguetung-verlauf | Vergütungs-Verlauf | full | `/embed/einspeiseverguetung-verlauf` | Ready |
| pv-zubau-deutschland | PV-Zubau | full | `/embed/pv-zubau-deutschland` | Ready |
| solar-trend-monat | Monatsvergleich | full | `/embed/galerie/solar-trend-monat` | Ready |
| erzeugung | Standard | full | `/embed/erzeugung` | Ready |
| erzeugung | Standard | compact | `/embed/erzeugung?presentation=compact` | Ready |
| erzeugung | Kompakt | compact | `/embed/erzeugung-mini?presentation=compact` | Ready |
| ee-ampel | EE-Ampel | full | `/embed/ee-ampel` | Ready |
| karte | Karte | full | `/embed/karte` | Ready |
| anlagenbestand-deutschland | Anlagenbestand | full | `/embed/anlagenbestand-deutschland` | Ready |
| landschaft-karte | Solar in Hatten | full | `/embed/landschaft-karte?ags=03458009` | Ready |
| landschaft-karte | Windpark in Hatten | full | `/embed/landschaft-karte?ags=03458009&stop=wind-1` | Ready |
| landschaft-karte | Solarstandort Nidda | full | `/embed/landschaft-karte?ags=06440016&stop=nidda-sewage` | Ready |
| kommunen-landschaft | Hatten | full | `/embed/kommunen-landschaft?ags=03458009` | Ready |
| kommunen-landschaft | Hatten | hero | `/embed/kommunen-landschaft?ags=03458009&presentation=hero` | Ready |
| kennzahl | Leistung | full | `/embed/kennzahl?metric=leistung` | Ready |
| kennzahl | Anlagen | full | `/embed/kennzahl?metric=anlagen` | Ready |
| gemeinde-solar | Nidda | full | `/embed/gemeinde-solar?ags=06440016` | Ready |
| gemeinde-erneuerbare | Nidda | full | `/embed/gemeinde-erneuerbare?ags=06440016` | Ready |
| gemeinde-solarleistung | Nidda | full | `/embed/gemeinde-solarleistung?ags=06440016` | Ready |
| gemeinde-meldung | Storyansicht · Nidda | full | `/embed/gemeinde-meldung?ags=06440016` | Ready |
| gemeinde-meldung | Monatlicher Zubau · Verlauf | full | `/embed/gemeinde-meldung?ags=06440016&view=single&template=verlauf` | Ready |
| gemeinde-meldung | Monatlicher Zubau · Verlauf | hero | `/embed/gemeinde-meldung?ags=06440016&view=single&template=verlauf&presentation=hero&detail=reduced&switchable=0` | Ready |
| gemeinde-meldung | Kennzahl · Stromwert | full | `/embed/gemeinde-meldung?ags=06440016&view=single&template=electricity-value` | Ready |
| gemeinde-meldung | Kennzahl · Stromwert | hero | `/embed/gemeinde-meldung?ags=06440016&view=single&template=electricity-value&presentation=hero&detail=reduced&switchable=0` | Ready |
| gemeinde-meldung | Kennzahl · Einspeisevergütung | full | `/embed/gemeinde-meldung?ags=06440016&view=single&template=feed-in-value` | Ready |
| gemeinde-meldung | Kennzahl · Einspeisevergütung | hero | `/embed/gemeinde-meldung?ags=06440016&view=single&template=feed-in-value&presentation=hero&detail=reduced&switchable=0` | Ready |
| gemeinde-meldung | Anlagenraster + Leistungsanteil | full | `/embed/gemeinde-meldung?ags=06440016&view=single&template=anlagenraster` | Ready |
| gemeinde-meldung | Anlagenraster + Leistungsanteil | hero | `/embed/gemeinde-meldung?ags=06440016&view=single&template=anlagenraster&presentation=hero&detail=reduced&switchable=0` | Ready |
| gemeinde-meldung | Säulen | full | `/embed/gemeinde-meldung?ags=06440016&view=single&template=saeule` | Ready |
| gemeinde-meldung | Säulen | hero | `/embed/gemeinde-meldung?ags=06440016&view=single&template=saeule&presentation=hero&detail=reduced&switchable=0` | Ready |
| gemeinde-meldung | Anteilsdonut | full | `/embed/gemeinde-meldung?ags=06440016&view=single&template=anteilsdonut` | Ready |
| gemeinde-meldung | Anteilsdonut | hero | `/embed/gemeinde-meldung?ags=06440016&view=single&template=anteilsdonut&presentation=hero&detail=reduced&switchable=0` | Ready |
| gemeinde-meldung | Ertragsvergleich | full | `/embed/gemeinde-meldung?ags=06440016&view=single&template=yield` | Ready |
| gemeinde-meldung | Ertragsvergleich | hero | `/embed/gemeinde-meldung?ags=06440016&view=single&template=yield&presentation=hero&detail=reduced&switchable=0` | Ready |
| gemeinde-meldung | Solar + Wind · Jahresprofil | full | `/embed/gemeinde-meldung?ags=06440016&view=single&template=energy-year` | Ready |
| gemeinde-meldung | Solar + Wind · Jahresprofil | hero | `/embed/gemeinde-meldung?ags=06440016&view=single&template=energy-year&presentation=hero&detail=reduced&switchable=0` | Ready |
| gemeinde-meldung | Solar-Monatsrecap | full | `/embed/gemeinde-meldung?ags=06440016&view=single&template=radial` | Ready |
| gemeinde-meldung | Solar-Monatsrecap | hero | `/embed/gemeinde-meldung?ags=06440016&view=single&template=radial&presentation=hero&detail=reduced&switchable=0` | Ready |
| gemeinde-meldung | Monatliche Rangübersicht | full | `/embed/gemeinde-meldung?ags=06440016&view=single&template=rank-month` | Ready |
| gemeinde-meldung | Monatliche Rangübersicht | hero | `/embed/gemeinde-meldung?ags=06440016&view=single&template=rank-month&presentation=hero&detail=reduced&switchable=0` | Ready |
| micro-solar | Nidda | full | `/embed/micro-solar?ags=06440016` | Ready |
| micro-wind | Nidda | full | `/embed/micro-wind?ags=06440016` | Ready |
| regional-basic-stats | Nidda | full | `/embed/galerie/regional-basic-stats?ags=06440016` | Ready |
| region-anlagentyp | Hessen | full | `/embed/region-anlagentyp?bl=06` | Ready |
| region-solarleistung | Hessen | full | `/embed/region-solarleistung?bl=06` | Ready |

## Browser evidence

The built preview was exercised through the in-app browser, with the inventory derived from the actual gallery. All 82 configured views were opened at 390 and 1440 CSS pixels and inspected for loading failures and geometry. Viewport screenshots were inspected across chart families; full-page captures are unsuitable for these viewport-dependent charts because capture resizing can transiently reflow them.

- Six layout-reference groups: no overlapping children in the wide layout or narrow single-column arrangement.
- Variant modal: changing the first Hessen widget to light changed only that instance; its sibling remained dark.
- Landscape target dropdown: choosing the first Hatten wind site changed that stage while the neighboring hero remained on Hatten.
- Story download: a real PNG of the electricity-value story retained the figure, period, sources and attribution; the downloaded image was opened and inspected.
- Saved local dashboard: reopened and reloaded the same saved configuration; seven-day trade and Nidda annual growth retained their selections and rendered data.
- Expected data absence: Nidda currently has no published yield-comparison story. Both full and reduced views use an explicit, framed empty state; no draft or different story is substituted. The renderer itself is covered with existing real report data.
- Repairs identified during acceptance: responsive width exception, bare-preview palette mismatch, compact inline baseline overflow, missing-story framing, and clipped start-of-timeline value labels.

Geometry evidence and viewport proof images are held with this task under `work/proof`. The final production build passed. The repaired bare surface was rechecked at both widths; the existing full/line variants retain their own bounds. Start-of-timeline labels were verified inside the SVG bounds. No new browser console errors appeared during the final pass. The Playwright acceptance specification was updated, but not executed by the CLI in this run; the browser evidence above comes from direct in-app-browser checks.

## Deployment boundary

The hosted database migration was applied and verified on 2026-10-12 through the existing setup access. Anonymous direct table access is denied. The app changes remain in the local preview/work branch; an authenticated production UI save remains a release acceptance check. No production app release is implied by this local commit.

## Data and layout ownership

- A live widget receives an endpoint and, optionally, an explicitly timestamped initial observation. An unknown observation age is zero: keep the chart visible and refresh in the background. A mere empty default object is not an observation. Existing dated editorial story snapshots remain frozen by their story data contract.
- Widget family contracts own supported presentations and minimum sizes. The composition uses width minima to stack siblings, not to throw away the whole dashboard when the host shrinks. Content-sized variants retain intrinsic height; allocated renderers own their internal layout. Measured text minima are used where wrapping requires them (the race family), rather than imposing a fixed ratio on every card.
- The inventory and acceptance tests consume the gallery/catalog definitions, so adding a supported source automatically adds it to the browser acceptance set. Existing applications and unpublished editorial drafts are accounted for explicitly above.
