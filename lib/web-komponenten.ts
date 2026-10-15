/**
 * Content that a web component carries in an ATTRIBUTE and renders only in
 * the browser, inside its own shadow root: E.DIS writes its whole imprint as
 * `<eon-ui-rte-renderer content="&lt;h5&gt;E.DIS Netz GmbH&lt;/h5&gt;…">`.
 * Neither a plain fetch nor page.content() shows it as text, so the imprint
 * read as 313 characters of shell (wind operators, 06.10.2026).
 *
 * Expanded: escaped HTML in a content-like attribute of a custom element
 * (a tag with a hyphen) becomes a child of that element. Nothing else is
 * touched; ordinary attributes and ordinary elements stay as they are.
 */
const ATTRIBUT = /(<([a-z][a-z0-9]*-[a-z0-9-]+)\b[^>]*?\b(?:content|html|text|richtext|body)=)(["'])([\s\S]*?)\3([^>]*>)/gi;

function entschluesseln(s: string): string {
  return s
    .replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&#39;|&#x27;|&apos;/g, "'")
    .replace(/&amp;/g, "&");
}

export function webKomponentenAusklappen(html: string): string {
  return html.replace(ATTRIBUT, (ganz, kopf: string, _tag: string, q: string, wert: string, rest: string) => {
    if (!/&lt;[a-z]/i.test(wert)) return ganz;
    return `${kopf}${q}${q}${rest}<div data-web-komponente>${entschluesseln(wert)}</div>`;
  });
}
