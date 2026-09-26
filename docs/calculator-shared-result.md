# Shared calculator result components

The BKW calculator now uses the existing `ResultSection`, `OptionCard`, `Switch`,
`Toast`, `Modal`, and `FlowNav` components rather than local equivalents.

`ResultSettings` composes the standard modal and footer for numeric assumptions:

- Opening copies the current values into a draft.
- Recalculate is disabled until a value changes.
- Cancel, Escape, and the close button discard the draft.
- Apply is the only callback that may update the calculation.
- Consumers apply only changed fields, so editing consumption does not freeze an
  automatically derived investment amount.

Use this composition for further calculator migrations. Keep calculator-specific
validation and the calculation itself in their existing modules. BKW product
comparisons use the same selected price scenario as the displayed result.

Validation: BKW calculation, product comparison, funding caps, component registry,
result editing, affiliate links, and 320/375/1280px layouts.

This is the shared-control migration; a complete visual redesign of the BKW result
or a transfer of the WP-specific race chart is outside this change.
