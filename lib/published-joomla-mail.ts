import { load } from "cheerio";

/** Read Joomla's literal mail-link template as data. Never execute source code.
 * Only assignments, string concatenation and the three link writes are accepted.
 */
export function publishedJoomlaMail(source: string): string | null {
  if (source.length > 8000) return null;
  const input = source.trim().replace(/^<!--\s*/, "").replace(/\/\/-->[\s\\n]*$/, "");
  const tokens: { value: string; literal: boolean }[] = [];
  const token = /\s+|'(?:[^'\\\r\n]|\\['"\\/])*'|"(?:[^"\\\r\n]|\\['"\\/])*"|[A-Za-z_]\w*|[=+;().]/gy;
  while (token.lastIndex < input.length) {
    const found = token.exec(input);
    if (!found) return null;
    if (/^\s+$/.test(found[0])) continue;
    const literal = /^["']/.test(found[0]);
    tokens.push({ literal, value: literal ? found[0].slice(1, -1).replace(/\\(['"\\/])/g, "$1") : found[0] });
    if (tokens.length > 250) return null;
  }
  let position = 0;
  const values = new Map<string, string>();
  const writes: string[] = [];
  const take = (value: string) => {
    if (tokens[position]?.literal || tokens[position]?.value !== value) throw Error("Unsupported template");
    position++;
  };
  const atom = (): string => {
    const next = tokens[position++];
    if (!next) throw Error("Missing value");
    if (next.literal) return next.value;
    const value = values.get(next.value);
    if (value === undefined) throw Error("Unknown value");
    return value;
  };
  const expression = () => {
    let value = atom();
    while (!tokens[position]?.literal && tokens[position]?.value === "+") { position++; value += atom(); }
    if (value.length > 2048) throw Error("Oversized value");
    return value;
  };
  try {
    while (position < tokens.length) {
      if (tokens[position].value === "document" && !tokens[position].literal) {
        take("document"); take("."); take("write"); take("(");
        writes.push(expression()); take(")"); take(";");
      } else {
        if (tokens[position].value === "var" && !tokens[position].literal) take("var");
        const name = tokens[position++];
        if (!name || name.literal || !/^(?:prefix|path|addy(?:_text)?\d+)$/.test(name.value)) return null;
        take("="); values.set(name.value, expression()); take(";");
      }
    }
    if (writes.length !== 3 || !values.has("prefix") || !values.has("path") || ![...values.keys()].some(key => /^addy\d+$/.test(key))) return null;
    const $ = load(writes.join(""));
    const anchor = $("body > a");
    if (anchor.length !== 1 || $("body").contents().length !== 1 || Object.keys(anchor[0].attribs).some(key => key !== "href")) return null;
    const href = anchor.attr("href") ?? "";
    return /^mailto:[\w.+%-]+@[\w-]+(?:\.[\w-]+)+$/i.test(href) ? href.slice(7).toLowerCase() : null;
  } catch { return null; }
}
