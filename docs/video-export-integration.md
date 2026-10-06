# Widget video integration

Status: local integration, not deployed or activated in production.

The Nidda monthly solar widget passes its selected month to the shared video dialog. The server validates the widget, municipality and month. Visitors request a confirmation mail; entitled administrator sessions create a job and receive a direct download link in the same dialog. Login alone does not grant direct access.

The optional place subscription stays unchecked by default. Its compact displayed wording is archived as `2026-09-29-video`, independently of the standard subscription form. Only an explicit opt-in and the redeemed confirmation token activate it through the existing subscription functions. The confirmation mail mentions the selected subscription. There is no second subscription email. Local pilots only record this handoff and never change production subscriptions.

The renderer reuses the existing widget export, with private files, expiring links, queue limits and reuse of identical completed videos. Only Nidda monthly solar is enabled in the pilot allowlist.

Before production: provision the schema and private storage; configure the video secret and canonical origin; activate a bounded scheduled worker; add video processing to privacy information; verify the deployed request, mail and download path. The checked-in workflow remains manual-only. Local mail-sink and database settings must never be deployed.

Validation: video request API pilot with local PostgreSQL and mail sink (confirmation, scanner-safe GET, duplicate requests, concurrent limits and opt-in); focused video/subscription tests; TypeScript. Production email delivery and production subscription persistence are not claimed by these local checks.

End-to-end operator validation passed on 2026-09-29: Nidda July 2026 rendered in 183244 ms, H.264 MP4, 20.166667 seconds, 620 x 798, 1238626 bytes. The authenticated browser dialog displayed completion and its download saved the MP4 in the user's Downloads folder. Repeated creation reused the completed job. The original 240-second ceiling failed under higher local load; the worker now has a 600-second ceiling and a 660-second lease, closes Chromium on timeout and observes render/download failures together. No automatic worker is running locally. Production activation and real mail delivery remain pending.

The owner dialog now polls persisted renderer progress (updated every five seconds by the lease-holding worker). It offers an optional email confirmation request for the same widget/month through the existing limited public request flow, plus a close-window hint. Closing the dialog does not cancel the server job. Local mail remains sink-only.
