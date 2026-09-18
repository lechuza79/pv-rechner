import { it, expect } from "vitest";
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createHash } from "node:crypto";
import { reviewContactSupported } from "../../scripts/lib/municipal-review-evidence";

it("requires original supplemental bytes and an exclusive contact card, never a supplied role", () => {
  const directory = mkdtempSync(join(tmpdir(), "municipal-evidence-"));
  const html = '<section>Pressestelle Frau Beispiel <a href="mailto:presse@example.de">E-Mail</a></section><section>Gebäudetechnik <a href="mailto:bau@example.de">E-Mail</a></section>';
  const digest = createHash("sha256").update(html).digest("hex");
  const contact = { email: "presse@example.de", url: "https://example.de/kontakt", quote: "Pressestelle Frau Beispiel", sourceHtmlDigest: digest };
  const metadata = { finalUrl: contact.url, observedAt: "2026-09-15T12:00:00Z", htmlDigest: digest };
  const sourceDir = join(directory, "supplemental", "123");
  mkdirSync(sourceDir, { recursive: true });
  const stem = join(sourceDir, digest);
  const check = (changes = {}) => reviewContactSupported(directory, "123", [], { ...contact, ...changes });
  try {
    writeFileSync(`${stem}.html`, html);
    writeFileSync(`${stem}.json`, JSON.stringify(metadata));
    expect(check()).toBe(true);
    expect(check({ email: "bau@example.de" })).toBe(false);
    expect(check({ quote: "Freigegeben ohne Beleg" })).toBe(false);
    expect(check({ url: "https://other.example/kontakt" })).toBe(false);
    expect(check({ sourceHtmlDigest: "../../outside" })).toBe(false);
    expect(reviewContactSupported(directory, "456", [], contact)).toBe(false);
    writeFileSync(`${stem}.html`, html.replace("Pressestelle", "Bauverwaltung"));
    expect(check()).toBe(false);
    writeFileSync(`${stem}.html`, html);
    writeFileSync(`${stem}.json`, JSON.stringify({ ...metadata, observedAt: "not-a-date" }));
    expect(check()).toBe(false);
    writeFileSync(`${stem}.json`, JSON.stringify({ ...metadata, candidates: [{ email: "bau@example.de", roleEvidence: { text: contact.quote } }] }));
    expect(check({ email: "bau@example.de" })).toBe(false);
  } finally { rmSync(directory, { recursive: true, force: true }); }
});
