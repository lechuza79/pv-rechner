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
