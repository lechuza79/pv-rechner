import { it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { contactCandidates } from "../contact-evidence";
import { publishedJoomlaMail } from "../published-joomla-mail";

const html = readFileSync(new URL("./fixtures/joomla-public-mail.html", import.meta.url), "utf8");
const script = html.match(/<script>([\s\S]*?)<\/script>/)![1];

it("reads the publisher's literal Joomla template and keeps the role beside its address", () => {
  expect(publishedJoomlaMail(script)).toBe("kulturausschuss@suederheistedt.de");
  const candidates = contactCandidates(html, "https://suederheistedt.de/impressum", "suederheistedt.de");
  const municipal = candidates.find(c => c.email === "kulturausschuss@suederheistedt.de");
  expect(municipal?.roleEvidence?.text).toContain("Vorsitzende Anke Abel");
  const provider = candidates.find(c => c.email === "info@edv-bolle.de");
  expect(provider?.roleEvidence?.text).not.toContain("Kulturausschuss");
});

it("rejects conditional, executable, unknown and malformed templates without executing them", () => {
  const clean = script.trim().replace(/^<!--\s*/, "").replace(/\/\/-->[\s\\n]*$/, "");
  for (const unsupported of [
    `if (false) { ${clean} }`,
    clean + "globalThis.joomlaExecuted = true;",
    clean.replace(/var prefix\s*=.*?;/, "var prefix = externalFunction();"),
    clean.replace(/var path\s*=.*?;/, "var path = missingVariable;"),
    clean.replace("document.write", "window.document.write"),
    clean + "@",
    "x".repeat(8001),
  ]) expect(publishedJoomlaMail(unsupported)).toBeNull();
  expect((globalThis as Record<string, unknown>).joomlaExecuted).toBeUndefined();
});

// The original imprint separates responsibility from the mail paragraph, then
// appends long legal text in that same paragraph. Extraction must not turn this
// layout into an automatically proven role.
it("recovers mail from the original split layout without inventing responsibility", () => {
  const originalLayout = `<div><p>Gemeinde Süderheistedt<br>- Die Bürgermeisterin -<br>Birgit Meier<br>Ziegeleiweg 2<br>D-25779 Süderheistedt<br><br>Verantwortlich für den Inhalt der Webseite (sofern nicht anders gekennzeichnet):<br>Kulturausschuss der Gemeinde Süderheistedt - Vorsitzende Anke Abel</p><p><script>${script}</script><br><br>Urheberrecht / Copyright<br>${"Legal notice. ".repeat(70)}</p><p>Technische Realisierung: EDV-Bolle, Süderheistedt, info[at]edv-bolle.de</p></div>`;
  const rows = contactCandidates(originalLayout, "http://www.suederheistedt.de/index.php/impressum", "suederheistedt.de");
  expect(rows.map(row => row.email)).toEqual(["kulturausschuss@suederheistedt.de", "info@edv-bolle.de"]);
  expect(rows[0].roleEvidence).toBeUndefined();
  expect(rows[0].additionalRoleEvidence).toBeUndefined();
  expect(rows[1].roleEvidence?.text).toContain("Technische Realisierung");
  expect(rows[1].roleEvidence?.text).not.toContain("Anke Abel");
});
