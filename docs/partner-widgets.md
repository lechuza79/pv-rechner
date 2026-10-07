# Partner widget embeds

Publication approved by the owner on 7 October 2026. The existing municipality package, monitor
adapter, chart renderer, actions and PNG exporter are reused. Partner presets in
`lib/widget-brand.ts` select the municipality and trusted local assets. Never pass
arbitrary HTML, remote logos or styles from URLs or appearance messages.

## Nidda

`/embed/partner/nidda/regional-annual-growth/full`

The last path segment selects the introduction for each individual embedding:
`full` = heading and logo, `title` = heading only, `none` = neither. Omitting it
uses `full`. Chart title, controls, date, source and licenses stay independent.
The same preset applies to the existing municipality widgets listed in
`lib/municipal-widget-views.ts`; no duplicate widget registry or data aggregation.
Unknown partners/widgets/header modes return 404. This public route uses the
normal embed layout; it does not change beta authentication. Data is read from
the shared municipality package and refreshed through its daily cache.

Generate customer HTML with `partnerEmbedCode` (the shared `embedCode` generator).
It includes automatic height adjustment, scoped by frame window and origin, so
multiple widgets resize independently. Credit is inside the frame and in the PNG.
The CMS must allow the iframe and the small resize script. Without the script,
set an adequate fixed iframe height and retain scrolling.

## Asset provenance

Nidda assets were restored unchanged from the approved 29 September preview,
commit `9a6d0859`: official logo from
https://www.nidda.de/logo-nidda-oberhessen.svg?cid=lnm.3imy and self-hosted Lato
regular/bold plus Oswald medium from the city's website. Accent #0079a8 was
observed on nidda.de. The city's logo remains its asset. Data attribution uses
the shared registry; own-work attribution uses the shared license constant.

## Review

Check full/title/none at desktop and 320px, two frames on one host, copying,
forwarding fallback, selected range and PNG. Default unbranded widgets must stay
unchanged. Publish only after the local review required by CLAUDE.md.

Verified locally on 7 October 2026: desktop comparison and 320px rendering;
three cross-origin frames independently reported heights 809 / 809 / 652px;
partner PNG inspected with local fonts/logo, neutral full source/license credit,
without the repeated data table or action footer. Temporary export instrumentation
was removed. Browser download-event capture was unavailable, so the generated PNG
was inspected through a temporary local image probe. No public deployment or
production build is claimed at this review checkpoint.

Mobile follow-up: the partner name and logo share the top row; the heading spans
both columns. The shared annual-growth widget uses left-aligned controls, fewer
year labels, and a direct action row (download/copy icons, forwarding with text).
Its source rail is measured against the actual plot and ends 10px above the
baseline, including in the ordinary parent chart. The embed code explicitly
allows clipboard-write and web-share. A localhost widget in a 127.0.0.1 host
confirmed the “Link kopiert” state; the browser automation's virtual clipboard
cannot read the OS clipboard, so a separate paste verification was unavailable.

## Partner configurator

The public, noindex page at /widgets/partner/nidda previews the existing renderer.
Width presets (320, 480, 720, 960 px) are responsive maximum widths, not fixed
canvas sizes. Each copied snippet carries its own width and header choice;
changing the preview never changes previously installed embeds.
The preview uses the current origin; copied code always uses solar-check.io.

Widget-height presets (600, 720 and 840 px) set the complete frame including header,
chart and actions. The default is 720 px. The renderer measures the fixed
sections and allocates remaining height to the plot. Partner source rails
keep 10 px text, use the vertical space below the dropdown down to 10 px above
the plot baseline, wrap into additional columns and reserve matching plot space.
The partner header uses a compact 6 px name/headline gap.

Without a partner header, its measured responsive height is subtracted from the preset. The plot retains the same height as the full-header variant at the same width. The hidden measurement reuses WidgetBrandHeader and is excluded from exports and accessibility.
