# Shared video delivery

All currently video-enabled monitor charts use the same server queue: regional
racing and monthly solar profiles on municipality, district, state and country
pages. Charts supply `videoParams`; ExportableWidgetFrame binds the shared request
adapter. No local browser export is offered as a fallback.

The central entitlement currently uses the operator/admin session. An ordinary
login grants no direct render or file access. Future plan entitlements must extend
that function, not individual charts. Anonymous users confirm their email before
queueing; existing mail and render limits, deduplication and expiry are unchanged.

Add a chart by registering parameter validation, render URL and period control in
VIDEO_WIDGETS, resolving its real source data in resolveVideo, and passing those
parameters to the existing frame. The render route must reuse the original chart.
Monthly profiles select the requested month; racing uses the complete current
history. Missing source data rejects the request rather than inventing a preview.

The worker advances the original animation at 30 fps, obtains the same export DOM
used for PNGs through prepareNodeCapture, captures native Chromium frames and
encodes them with FFmpeg as H.264. Capture speed does not change movie duration.
A server job continues independently of the visitor's tab.

Local validation: shared entitlement tests cover both registered chart types,
anonymous direct requests return 403, email confirmation creates a queued job,
and an actual Wetteraukreis race rendered to an 85.2-second 1096-square H.264 MP4.
