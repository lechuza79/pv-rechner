import { it, expect } from "vitest";
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createHash } from "node:crypto";
import { reviewContactSupported, type ReviewContact } from "../../scripts/lib/municipal-review-evidence";
import { contactCandidates } from "../contact-evidence";

it("validates separately quoted originals without turning adjacency into an automatic role", () => {
  const directory = mkdtempSync(join(tmpdir(), "municipal-split-"));
  const sourceDir = join(directory, "supplemental", "123");
  mkdirSync(sourceDir, { recursive: true });
  // Actual Dellstedt layout: role in h1, mailbox in h2, long legal text in h2.
  const role = "Die Homepage wird ehrenamtlich erstellt und bearbeitet von: Egbert Böge";
  const html = `<div><h1>Impressum:<br>${role}, E-Mail:</h1><h2>Egbert.Boege@T-Online.de</h2><h2>${"Legal notice. ".repeat(70)}</h2></div>`;
  const digest = createHash("sha256").update(html).digest("hex");
  const url = "https://www.gemeinde-dellstedt.de/Impressum/";
  const save = (body: string, sourceUrl = url) => {
    const hash = createHash("sha256").update(body).digest("hex");
    const stem = join(sourceDir, hash);
    writeFileSync(`${stem}.html`, body);
    writeFileSync(`${stem}.json`, JSON.stringify({ finalUrl: sourceUrl, observedAt: "2026-09-15T12:00:00Z", htmlDigest: hash }));
    return hash;
  };
  save(html);
  const contact: ReviewContact = {
    email: "egbert.boege@t-online.de", url, quote: "egbert.boege@t-online.de", sourceHtmlDigest: digest,
    evidenceKind: "separately-reviewed",
    roleSource: { url, sourceHtmlDigest: digest, quote: role },
    associationReason: "The imprint names the volunteer editor and immediately supplies his mailbox in the following heading; the whole source was reviewed for competing contacts.",
  };
  const check = (changes: Partial<ReviewContact> = {}) => reviewContactSupported(directory, "123", [], { ...contact, ...changes });
  try {
    expect(contactCandidates(html, url, "gemeinde-dellstedt.de")[0].roleEvidence).toBeUndefined();
    expect(check()).toBe(true);
    // Actual legacy frame pages publish an imprint in a span, not p/div.
    for (const publication of [`<span>${role}</span>`, role]) {
      expect(check({ roleSource: { url, sourceHtmlDigest: save(publication), quote: role } })).toBe(true);
    }
    expect(check({ evidenceKind: undefined })).toBe(false);
    expect(check({ roleSource: undefined })).toBe(false);
    expect(check({ associationReason: "" })).toBe(false);
    expect(check({ sourceHtmlDigest: undefined })).toBe(false);
    expect(check({ email: "guessed@t-online.de", quote: "guessed@t-online.de" })).toBe(false);
    expect(check({ quote: role })).toBe(false);
    expect(check({ roleSource: { ...contact.roleSource!, quote: "Pressestelle Frau Erfunden" } })).toBe(false);
    expect(check({ roleSource: { ...contact.roleSource!, url: "https://other.example/" } })).toBe(false);
    expect(check({ roleSource: { ...contact.roleSource!, sourceHtmlDigest: "../../outside" } })).toBe(false);
    const navigationOnly = `<nav><p>${role}</p></nav><h2>Egbert.Boege@T-Online.de</h2>`;
    expect(check({ roleSource: { url, sourceHtmlDigest: save(navigationOnly), quote: role } })).toBe(false);
    const hiddenOnly = `<div hidden><p>${role}</p></div><h2>Egbert.Boege@T-Online.de</h2>`;
    expect(check({ roleSource: { url, sourceHtmlDigest: save(hiddenOnly), quote: role } })).toBe(false);
    expect(reviewContactSupported(directory, "456", [], contact)).toBe(false);
    writeFileSync(join(sourceDir, `${digest}.html`), html.replace("Egbert Böge", "Somebody Else"));
    expect(check()).toBe(false);
  } finally { rmSync(directory, { recursive: true, force: true }); }
});
