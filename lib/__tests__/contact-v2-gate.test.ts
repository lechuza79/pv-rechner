import { describe, expect, it } from "vitest";
import { v2Urteil, type V2Recheck, type V2Result } from "../contact-v2-gate";

const now = new Date("2026-09-19T12:00:00Z");
const result = (over: Partial<V2Result> = {}): V2Result => ({
  id: "07233207", rules: "r1", verdict: "better",
  selected: ["e.franzen@vgv-kelberg.de", "info@vgv-kelberg.de"],
  proofs: [{ email: "e.franzen@vgv-kelberg.de", channels: ["press"] }], ...over,
});
const recheck = (over: Partial<V2Recheck> = {}): V2Recheck => ({
  id: "07233207", email: "e.franzen@vgv-kelberg.de", checkedAt: "2026-09-19T10:00:00Z", ok: true, url: "https://x", reason: null, ...over,
});
const urteil = (r: V2Result | null, c: V2Recheck | null, email = "e.franzen@vgv-kelberg.de") => v2Urteil(email, r, c, "r1", now, 3);

describe("Kontaktprüfung vor dem Versand", () => {
  it("lässt einen belegten, eben nachgeprüften Fachkontakt durch", () => {
    expect(urteil(result(), recheck())).toEqual({ ok: true, belegteRolle: true });
  });
  it("lässt ein bestätigtes allgemeines Postfach durch, aber ohne Rollenbeleg", () => {
    expect(urteil(result(), recheck({ email: "info@vgv-kelberg.de" }), "info@vgv-kelberg.de")).toEqual({ ok: true, belegteRolle: false });
  });
  it("hält jeden Empfänger ohne Beleg oder mit altem Beleg auf", () => {
    expect(urteil(null, recheck()).ok).toBe(false);
    expect(urteil(result({ rules: "alt" }), recheck()).ok).toBe(false);
    expect(urteil(result({ verdict: "unresolved" }), recheck()).ok).toBe(false);
    expect(urteil(result({ verdict: "worse" }), recheck()).ok).toBe(false);
    expect(urteil(result(), recheck(), "fremd@vgv-kelberg.de").ok).toBe(false);
  });
  it("verlangt eine Nachprüfung derselben Adresse aus den letzten Tagen", () => {
    expect(urteil(result(), null).ok).toBe(false);
    expect(urteil(result(), recheck({ email: "info@vgv-kelberg.de" })).ok).toBe(false);
    expect(urteil(result(), recheck({ checkedAt: "2026-09-10T10:00:00Z" })).ok).toBe(false);
    expect(urteil(result(), recheck({ checkedAt: "2026-09-20T10:00:00Z" })).ok).toBe(false);
    expect(urteil(result(), recheck({ ok: false, reason: "Adresse steht nicht mehr auf der Seite" })).ok).toBe(false);
  });
});

describe("Kontaktprüfung im echten Versandlauf", () => {
  it("läuft vor dem Aufbau der Mailverbindung und hält jeden Brief ohne Urteil an", async () => {
    const { readFileSync } = await import("node:fs");
    const s = readFileSync("scripts/kommunen-versand.ts", "utf8");
    const lauf = s.split("async function sendenIntern")[1];
    expect(lauf.indexOf("kontaktPruefung(")).toBeGreaterThan(0);
    expect(lauf.indexOf("kontaktPruefung(")).toBeLessThan(lauf.indexOf("await baueTransport()"));
    expect(lauf).toContain("bremsen(b, p.heute, kontakt.get(b.region_id))");
    expect(s).toContain('if (!kontakt) gruende.push("keine Kontaktprüfung für diesen Empfänger")');
  });
});
