# Investment assumptions in alternative building states

Checked 2026-09-14 against the current result-design working tree.

## Finding and decision

The heat pump investment model depends on capacity; the fossil replacement
investment is a fixed reference amount. That asymmetry does not alone prove an
arithmetic error. The result is conditional on those different assumptions.
Three independent reviewers agreed that an invented fossil capacity curve would
not correct the evidence gap. No investment coefficients change in this fix.

An entered heat pump net investment overrides the capacity estimate in every
building variant. An entered fossil investment also applies across variants;
zero means continued operation without replacement. The explanation must follow
these actual inputs, including zero, rather than implying a quote was separately
obtained for each building state.

## Integration into the pending result design

Import `components/HeatPumpInvestmentAssumptions.tsx` and render immediately
after the result summary, conditional on `activeWeg?.sanierung`:

```tsx
<HeatPumpInvestmentAssumptions
  wpInvestment={sel.investNetto}
  referenceInvestment={sel.gasInvest}
  referenceLabel={referenceDevice}
  wpInvestmentEntered={oInvest !== null}
  referenceInvestmentEntered={oFossilInvest !== null}
  onWpInvestmentChange={setOInvest}
  onReferenceInvestmentChange={setOFossilInvest}
/>
```

The values must come from the same displayed result as savings and payback.
Existing edit callbacks recompute the result and preserve shared-link state.
The component uses the existing `InlineEdit` control and result-note class.
Do not merge unrelated pending result-design files as part of this patch.

## Verification

- Component rendering covers default estimates, entered prices, oil labels,
  zero investment and the continued-operation reference.
- Browser interaction checks edit both amounts at 390 and 1280 px and verify
  that zero changes the description to continued operation without overflow.
- Integration must additionally be checked in the actual calculator by the
  result-design task; isolated component checks do not establish that it is
  displayed there.

## Scope

This makes the existing conditional comparison explicit and editable. It does
not validate a property-specific installation price or include insulation costs.
The earlier oil patch is present in the pending design working tree; it was not
in `origin/main` when checked. Its 105 oil/fossil/heat-pump tests passed again.
