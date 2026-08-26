import { describe, expect, it } from "vitest";
import {
  NOETIGE_PRUEFUNGEN,
  SOCIAL_PRUEFUNG_DDL,
  textAbdruck,
  urteil,
  type Pruefung,
} from "../social-pruefung-kern";

const TEXT = "In deutschen Großstädten stehen nur halb so viele Balkonkraftwerke wie in kleinen Gemeinden.";

const p = (art: "zahlen" | "recht", text: string, bestanden = true, befund = ""): Pruefung => ({
  post_id: "test",
  text_fingerabdruck: textAbdruck(text),
  art,
  bestanden,
  befund,
  geprueft_am: "2026-08-26T10:00:00.000Z",
});

describe("Freigabe vor der Veröffentlichung", () => {
  it("verlangt beide Prüfungen", () => {
    expect(urteil(TEXT, [])).toMatchObject({ ok: false });
    expect(urteil(TEXT, [p("zahlen", TEXT)])).toMatchObject({ ok: false });
    expect(urteil(TEXT, [p("zahlen", TEXT), p("recht", TEXT)])).toEqual({ ok: true });
    expect(NOETIGE_PRUEFUNGEN).toEqual(["zahlen", "recht"]);
  });

  it("verfällt, sobald der Text sich ändert", () => {
    // Das ist der Kern: Wer nach der Prüfung umformuliert, hat eine Freigabe
    // für eine Fassung, die es nicht mehr gibt.
    const geprueft = [p("zahlen", TEXT), p("recht", TEXT)];
    const geaendert = TEXT.replace("halb so viele", "dreimal so viele");
    const u = urteil(geaendert, geprueft);
    expect(u.ok).toBe(false);
    if (!u.ok) expect(u.grund).toMatch(/nach der Prüfung geändert/);
  });

  it("unterscheidet nie-geprueft von nach-der-Pruefung-geaendert", () => {
    const u = urteil(TEXT, []);
    expect(u.ok).toBe(false);
    if (!u.ok) expect(u.grund).toMatch(/Noch nicht geprüft/);
  });

  it("lässt reine Formatierung durchgehen", () => {
    // Ein zusätzlicher Umbruch ist keine inhaltliche Änderung. Eine Sperre, die
    // auch daran anschlägt, wird zur Schikane und irgendwann umgangen.
    const geprueft = [p("zahlen", TEXT), p("recht", TEXT)];
    expect(urteil(`  ${TEXT}\n\n `, geprueft)).toEqual({ ok: true });
  });

  it("hält eine nicht bestandene Prüfung zurück und nennt den Befund", () => {
    const u = urteil(TEXT, [p("zahlen", TEXT), p("recht", TEXT, false, "Werbeaussage ohne Beleg")]);
    expect(u.ok).toBe(false);
    if (!u.ok) expect(u.grund).toContain("Werbeaussage ohne Beleg");
  });

  it("schließt die Ablage gegen die öffentlichen Rollen", () => {
    expect(SOCIAL_PRUEFUNG_DDL).toMatch(/ENABLE ROW LEVEL SECURITY/);
    expect(SOCIAL_PRUEFUNG_DDL).toMatch(/REVOKE ALL[\s\S]*anon/);
    expect(SOCIAL_PRUEFUNG_DDL).toMatch(/REVOKE ALL[\s\S]*authenticated/);
  });
});
