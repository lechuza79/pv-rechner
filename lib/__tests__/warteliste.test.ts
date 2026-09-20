import { describe, it, expect, beforeAll } from "vitest";
import { readFileSync } from "fs";
import { resolve } from "path";
import { WARTELISTE_FASSUNGEN, wartelisteFassung } from "../warteliste-einwilligung";
import { wartelisteBestaetigungsMail } from "../warteliste-mail";
import { fehlendeAboPflichtangaben } from "../abo-mail";
import { wartelisteId, wartelisteBestaetigenLink, wartelisteAbmeldeLink } from "../warteliste-links";
import { bestaetigungsToken, abmeldeToken, pruefeBestaetigung, pruefeAbmeldung } from "../abo-token";

const lies = (p: string) => readFileSync(resolve(process.cwd(), p), "utf8");
const ID = "0f8fad5b-d9cb-469f-a165-70867728950e";

beforeAll(() => {
  process.env.ABO_HMAC_SECRET = "test-geheimnis-mindestens-16-zeichen";
});

describe("Waitlist consent wording", () => {
  // The signup lives on its own page since 19.09.2026; the menu only links
  // there. The page must render AND send the latest archived version, taken
  // from the archive — never typed — so the stored version points at the text
  // the person actually saw.
  const seite = lies("app/angebot-pruefen/route.ts");
  const nav = lies("public/shared-nav/nav.js");

  it("the page renders and sends the latest archived version", () => {
    expect(seite).toMatch(/WARTELISTE_FASSUNGEN\[WARTELISTE_FASSUNGEN\.length - 1\]/);
    expect(seite).toContain("esc(FASSUNG.einleitung)");
    expect(seite).toContain("esc(FASSUNG.zusage)");
    expect(seite).toContain("consent:${JSON.stringify(FASSUNG.version)}");
  });

  it("the latest version resolves in the archive the signup route checks", () => {
    const neueste = WARTELISTE_FASSUNGEN[WARTELISTE_FASSUNGEN.length - 1];
    expect(wartelisteFassung(neueste.version)).toEqual(neueste);
  });

  it("the menu has no second signup form of its own", () => {
    expect(nav).not.toMatch(/warteliste\/anmelden/);
    expect(nav).not.toMatch(/consent:/);
  });

  it("versions are unique", () => {
    const v = WARTELISTE_FASSUNGEN.map((f) => f.version);
    expect(new Set(v).size).toBe(v.length);
  });
});

describe("Waitlist links cannot be swapped with town-subscription links", () => {
  it("accepts its own confirmation and unsubscribe tokens", () => {
    const b = new URL(wartelisteBestaetigenLink("https://x", ID, 1_000)).searchParams.get("t")!;
    expect(wartelisteId(pruefeBestaetigung(b, 2_000))).toBe(ID);
    const a = new URL(wartelisteAbmeldeLink("https://x", ID)).searchParams.get("t")!;
    expect(wartelisteId(pruefeAbmeldung(a))).toBe(ID);
  });

  it("rejects a valid town-subscription token for the same id", () => {
    expect(wartelisteId(pruefeBestaetigung(bestaetigungsToken(ID, 1_000), 2_000))).toBeNull();
    expect(wartelisteId(pruefeAbmeldung(abmeldeToken(ID)))).toBeNull();
  });

  it("an unsubscribe token does not confirm", () => {
    const a = new URL(wartelisteAbmeldeLink("https://x", ID)).searchParams.get("t")!;
    expect(wartelisteId(pruefeBestaetigung(a, 2_000))).toBeNull();
  });
});

describe("Waitlist confirmation mail", () => {
  const m = wartelisteBestaetigungsMail({
    liste: "angebotscheck",
    bestaetigenUrl: "https://solar-check.io/warteliste/bestaetigen?t=x",
    abmeldeUrl: "https://solar-check.io/warteliste/abmelden?t=y",
  });

  it("carries every mandatory item, so the send check lets it out", () => {
    expect(fehlendeAboPflichtangaben(m.html, "bestaetigung")).toEqual([]);
  });

  it("promises one launch message and no newsletter, and offers a way out", () => {
    expect(m.text).toMatch(/nur noch zum Start/);
    expect(m.text).toMatch(/Kein Newsletter/);
    expect(m.html).toContain("/warteliste/abmelden");
  });

  it("the privacy policy describes the waitlist", () => {
    expect(lies("app/(site)/datenschutz/page.tsx")).toMatch(/Warteliste für kommende Funktionen/);
  });
});
