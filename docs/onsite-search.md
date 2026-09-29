# OnsiteSearch

Shared component: `components/OnsiteSearch.tsx`, registered in `lib/bausteine-registry.ts`
and demonstrated in `/admin/komponenten`. Reuse it for in-page search and suggestions.
`RegionSearch` is only an Atlas data/routing adapter; `RegionNavigation` uses the
same component with already loaded items. No network request for local filtering.

## Local filtering

```tsx
<OnsiteSearch
  items={items} // stable array of {id, label, description?}
  ariaLabel="Gemeinde suchen"
  placeholder="Gemeinde suchen …"
  onQueryChange={setFilter}
/>
```

Typing and selecting a suggestion call `onQueryChange`. The consumer filters its
content; selecting does not navigate unless `onPick(item)` does so. Clearing the
field restores all items. Labels match case-insensitively, including umlauts and ß.
Pass a stable/memoized items array. Text, data, filtering result layout and routing
belong to the consumer, not this component.

## Async adapter

Omit `items`, provide `loadItems(query, signal)` and `onPick(item)`. This uses the
compact expandable variant. Requests start after two characters, are debounced
and aborted when the query changes. The adapter maps its data to the same item
contract. See `components/atlas/RegionSearch.tsx`.

## Accepted behavior

Local mode has a full-width dark field and matching-width flyout. Focus hides the
search icon and uses only an accent glow. Arrow keys select suggestions, Enter
picks, Escape/outside click dismiss. The input retains focus while selecting with
the keyboard. Suggestions have distinct IDs and combobox/listbox semantics.
The flyout fades in/out; reduced motion disables transitions. Theme tokens supply
colors and typography. Page-specific placeholders must name the actual scope.

Verify local filtering, keyboard selection, clearing, async stale-response
cancellation and mobile overflow when changing the shared interaction. Keep the
Atlas adapter and in-page consumer on this implementation.
