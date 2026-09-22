# Shared footer and trust block

`mountFooter(target,{trustTarget,base,homeHref,simulationHref,atlasHref})` from footer.js replaces target; optional trustTarget places trust separately (homepage: before the person component). Returns footer, trust, dispose. Include footer.css. Module imports trust-signals.json and needs bundling (esbuild) or an equivalent JSON import adapter.

Trust copy snapshot exported from production lib/trust-signals.ts on 2026-09-08, checked against solar-check.io. Keep upstream source as authority when integrating; do not maintain two permanent copies. Source links retained. More links lead to method/data pages rather than copying the production modal and its dynamic check schedule.

IA footer groups: Rechner; Themen & Förderung; Atlas & Energiemonitor; Solar Check & Weiterverwenden. Legal links and existing disclaimer separate. Regional links lead through Atlas; when integrating production retain existing released-state guards and verify regional navigation coverage. No new URL routes. About/press are locally previewed pending content release. Future organization landing pages are not fabricated.

Homepage person host removes bottom border and section padding so the portrait flows into the footer. Shared person source unchanged. Desktop/mobile checked, including 390px overflow.
