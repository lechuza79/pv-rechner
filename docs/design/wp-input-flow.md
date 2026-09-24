# Heat-pump input flow — local design, 2026-09-24

Scope: the five input steps before the heat-pump result (Situation, Haus,
Dämmung, Haushalt, Heizung), not the optional solar-system modal.

Uses the current shared FlowSchritte navigation and OptionCard, with scoped
input styling and the same page palette as the existing result draft.
The existing answer validation, calculation inputs and result remain in place.
This is not a merge of all later production calculation changes.

## Illustration provenance

Provided by the existing task “Illustrationsfamilie starten”, package:
`/Users/eule/austausch-chatgpt/ausgang/solar-check-illustrations-library/wp-input-neon-v1/`.
Copied transparent WebP exports and provenance to
`public/illustrations/wp-input-neon-v1/`.

- Freistehend: house-large (not house, which includes PV).
- Doppelhaushälfte: house-semi.
- Reihenendhaus: house-row-end.
- Reihenmittelhaus: house-row-middle.
- heatpump-modern is supplied for future use, not placed against an unillustrated ground-source option.

Houses use existing cleaned neon splash compositions. Rejected generic marker
accents are removed. This is not a new illustration family or newly approved
artwork. No known standalone motifs for situation, insulation, radiators,
underfloor heating or ground-source heat pumps; those options remain text.
Roof shapes are not questions in this input flow.

The mistakenly introduced code-drawn roof illustrations were removed from
DachField, which now uses the current shared live component.

## Validation

TypeScript passed. Input-routing/share-state tests: 28 passed.
Browser: all five steps completed into the result; choices require explicit
selection, completed steps are reachable, all four house images load.
Mobile screenshots and overflow checked at 390 px; desktop checked separately.
No deployment or merge. Existing broader draft registry failures remain outside
this visual change (Footer import declaration, hand-built result controls).

## Follow-up: progressive questions and neon object details

House now asks type, then floor area through AccordionField. Heating asks
heating surfaces, then heat-pump type. Insulation folds after selection and
leaves measured annual consumption as an optional editable question. Custom
floor area is a secondary inline action, explicitly confirmed before folding.
Existing values remain editable in compact summaries.

House images now use wp-input-neon-v2 from the illustration task: original
geometry retained, separate targeted neon details on existing roof, door and
window edges. Only the active house is accented in terrace illustrations.
No new image generation. Still a local integration draft.

Verified: custom 155 m² is retained, house/insulation/heating questions fold
and reveal their successors, mobile at 390 px has no horizontal overflow.
TypeScript and 28 input/share-state tests pass.
