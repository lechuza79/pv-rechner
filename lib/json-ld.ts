/**
 * Serialize an object for embedding inside a
 * <script type="application/ld+json"> block.
 *
 * Escapes "<" to its JSON unicode form so a "</script>" (or "<!--") sequence
 * inside any string value — e.g. a funding-program name or FAQ text pulled from
 * the database — cannot break out of the script tag and inject markup. JSON
 * semantics are unchanged (parsers read < as "<").
 */
export function jsonLdHtml(data: unknown): string {
  return JSON.stringify(data).replace(/</g, "\\u003c");
}

/**
 * BreadcrumbList schema built from an existing breadcrumb trail. The last item
 * (the current page) may omit its path — Google treats the final crumb as the
 * page itself. Paths are resolved to absolute URLs against `baseUrl`.
 */
export function breadcrumbJsonLd(
  items: { name: string; path?: string }[],
  baseUrl: string,
): Record<string, unknown> {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((it, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: it.name,
      ...(it.path ? { item: `${baseUrl}${it.path}` } : {}),
    })),
  };
}

/**
 * Dataset schema für die Solar-Atlas-Seiten (Übersicht + Gemeinde). Die
 * konstanten, rechtlich relevanten Felder (Lizenz dl-de/by-2-0, creator, isBasedOn)
 * leben hier an EINER Stelle — die Seiten geben nur Name/Beschreibung/URL/Ort und
 * ihre Messgrößen. So driften Lizenz-/Attributions-Angaben zwischen den Seiten nicht.
 */
export function atlasDatasetJsonLd(opts: {
  name: string;
  description: string;
  url: string;
  dateModified: string;
  placeName: string;
  containedInPlace?: string;
  variables: { name: string; value: number; unitText?: string }[];
  baseUrl: string;
}): Record<string, unknown> {
  return {
    "@context": "https://schema.org",
    "@type": "Dataset",
    name: opts.name,
    description: opts.description,
    url: opts.url,
    license: "https://www.govdata.de/dl-de/by-2-0",
    creator: { "@type": "Organization", name: "Solar Check", url: opts.baseUrl },
    isBasedOn: "https://www.marktstammdatenregister.de",
    dateModified: opts.dateModified,
    spatialCoverage: {
      "@type": "Place",
      name: opts.placeName,
      ...(opts.containedInPlace
        ? { containedInPlace: { "@type": "Place", name: opts.containedInPlace } }
        : {}),
    },
    variableMeasured: opts.variables.map((vv) => ({
      "@type": "PropertyValue",
      name: vv.name,
      value: vv.value,
      ...(vv.unitText ? { unitText: vv.unitText } : {}),
    })),
  };
}
