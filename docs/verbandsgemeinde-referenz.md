# Verbandsgemeinden: Bad Breisig and Weilerbach

The user approved publication on 8 October 2026 after local acceptance.
Both pages import the existing LandkreisSeite: no duplicate page or widgets.
Existing municipality URLs and database parents stay unchanged. Breadcrumbs add
county > association > municipality. Counties count each municipality once.

## Sources and refresh

The verbatim official GV100AD records dated 31 August 2026 are bundled in
lib/verband-*-source.json, with source excerpts under docs/quellen. The existing
parseGv100 reader supplies names and members. Changes require updating the
source snapshot and its membership tests; no inference from names or proximity.
Bad Breisig has four members, Weilerbach eight. Missing register members fail.

The existing daily and monthly district publisher also builds these two groups,
using the existing aggregation and exact membership validation. Region totals
are assembled before adding associations, preventing duplicate counting. Pages
read the shared published package. Source dates and older editions stay visible.
The shared Atlas and district cache tags invalidate association data too.
A failed publisher retains the previous complete generation.

## Subscriptions and exports

The existing subscription form stores the nine-digit association key. Confirmation
and settings resolve its name and page. No update frequency or notification run
is added. Server video is not enabled for associations; existing image/browser
exports remain shared.

## Verification

Browser: map and eight-of-eight member list for Weilerbach; four-of-four for
Bad Breisig; member links, breadcrumbs and unchanged canonical municipality URLs.
The subscription dialog uses the association name and council role. A rolled-back
production database probe accepted the nine-digit key without leaving an entry
or sending mail. Route tests mock confirmation delivery. Historical packages
retain their own register dates.

Release checks: production build passed; 135 scoped tests passed, with the final
foreign-country/root regression rechecked (22 tests). Published generation
20261008T070251Z-791e37 contains both associations with no missing members and
ready monitors, plus exactly the 16 German states and Germany. The country
selector now checks the actual identifier instead of accepting another country's
root with the same level label. Production-mode browser check: Weilerbach map,
eight members, canonical, subscribe dialog, no console errors or page overflow.
