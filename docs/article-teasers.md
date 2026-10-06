# ArticleTeasers

Shared editorial cards extracted from the guide index. Consumers: `/ratgeber`
and regional Atlas reading recommendations. Registered and demonstrated in
`/admin/komponenten`; do not copy the card markup into another page.

```tsx
<ArticleTeasers title="Mehr zum Thema" currentPath="/solar-atlas" items={[
  { href: "/laendervergleich", title: "Solarenergie im Vergleich",
    teaser: "Wie steht Deutschland im internationalen Vergleich da?" },
]} />
```

Each item accepts `href`, `title`, `teaser`, optional `cta` (default: Mehr erfahren),
and optional `image: {src, alt, width, height}`. Use approved local/public image
assets or configured Next Image hosts. No image means no empty image placeholder.
`layout="list"` preserves the guide index's single-column layout; the default grid
adapts to the available width. `title` is optional, self-links are excluded by
`currentPath`, empty sets render nothing. Colors and type use shared theme tokens.

Regional editorial selections live in `lib/atlas-editorial-links.ts`, keyed by
region ID (Germany, state or district). Only populate relevant, existing pages.
`RelatedLinks` remains the slim utility-link list; use ArticleTeasers when the
reader needs an article headline and synopsis.
