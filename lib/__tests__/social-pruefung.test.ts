import { describe, expect, it } from "vitest";
import {
  NOETIGE_PRUEFUNGEN,
  SOCIAL_PRUEFUNG_DDL,
  fassungsText,
  urteil,
  type Fassung,
  type Pruefung,
} from "../social-pruefung-kern";
import type { PostBild } from "../social-posts";

const TEXT = "In deutschen Großstädten stehen nur halb so viele Balkonkraftwerke wie in kleinen Gemeinden.";

const BILD: PostBild = {
  art: "vergleich",
  aussage: "Balkonkraftwerke stehen auf dem Land, nicht in der Stadt",
  gemessen: "Angemeldete Steckersolargeräte je 1.000 Einwohner",
  serien: [
    { label: "Städte über 100.000 Einwohner", wert: 9.9, einheit: "je 1.000 Ew.", stellen: 1 },
    { label: "Gemeinden unter 20.000 Einwohner", wert: 22.8, einheit: "je 1.000 Ew.", stellen: 1, hervorgehoben: true },
  ],
  quelle: "Marktstammdatenregister (Bundesnetzagentur), Stand 5. August 2026. Eigene Berechnung.",
  stil: "hell",
};

const fassung = (text = TEXT, bild: PostBild | null = BILD): Fassung => ({ text, bild });

const p = (art: "zahlen" | "recht", f: Fassung, bestanden = true, befund = ""): Pruefung => ({
  post_id: "test",
  fassung_fingerabdruck: fassungsText(f),
  art,
  bestanden,
  befund,
  geprueft_am: "2026-08-26T10:00:00.000Z",
});

const beide = (f: Fassung) => [p("zahlen", f), p("recht", f)];

describe("Freigabe vor der Veröffentlichung", () => {
  it("verlangt beide Prüfungen", () => {
    expect(urteil(fassungsText(fassung()), [])).toMatchObject({ ok: false });
    expect(urteil(fassungsText(fassung()), [p("zahlen", fassung())])).toMatchObject({ ok: false });
    expect(urteil(fassungsText(fassung()), beide(fassung()))).toEqual({ ok: true });
    expect(NOETIGE_PRUEFUNGEN).toEqual(["zahlen", "recht"]);
  });

  it("verfällt, sobald der Text sich ändert", () => {
    // Wer nach der Prüfung umformuliert, hat eine Freigabe für eine Fassung,
    // die es nicht mehr gibt.
    const geaendert = fassung(TEXT.replace("halb so viele", "dreimal so viele"));
    const u = urteil(fassungsText(geaendert), beide(fassung()));
    expect(u.ok).toBe(false);
    if (!u.ok) expect(u.grund).toMatch(/nach der Prüfung geändert/);
  });

  it("unterscheidet nie-geprueft von nach-der-Pruefung-geaendert", () => {
    const u = urteil(fassungsText(fassung()), []);
    expect(u.ok).toBe(false);
    if (!u.ok) expect(u.grund).toMatch(/Noch nicht geprüft/);
  });

  it("lässt reine Formatierung durchgehen", () => {
    // Ein zusätzlicher Umbruch ist keine inhaltliche Änderung. Eine Sperre, die
    // auch daran anschlägt, wird zur Schikane und irgendwann umgangen.
    expect(urteil(fassungsText(fassung(`  ${TEXT}\n\n `)), beide(fassung()))).toEqual({ ok: true });
  });

  it("hält eine nicht bestandene Prüfung zurück und nennt den Befund", () => {
    const u = urteil(fassungsText(fassung()), [p("zahlen", fassung()), p("recht", fassung(), false, "Werbeaussage ohne Beleg")]);
    expect(u.ok).toBe(false);
    if (!u.ok) expect(u.grund).toContain("Werbeaussage ohne Beleg");
  });

  it("schließt die Ablage gegen die öffentlichen Rollen", () => {
    expect(SOCIAL_PRUEFUNG_DDL).toMatch(/ENABLE ROW LEVEL SECURITY/);
    expect(SOCIAL_PRUEFUNG_DDL).toMatch(/REVOKE ALL[\s\S]*anon/);
    expect(SOCIAL_PRUEFUNG_DDL).toMatch(/REVOKE ALL[\s\S]*authenticated/);
  });
});

describe("Die Freigabe deckt das BILD mit ab", () => {
  // Die Lücke, um die es hier geht: Der Abdruck hing allein am Text. Wer den
  // Kartentyp, eine Serie, die Rundung oder das Farbschema änderte, behielt eine
  // Freigabe für ein Bild, das so nie geprüft wurde — und das Bild ist der Teil,
  // der beim Weiterteilen mitreist.
  const geprueft = beide(fassung());

  const bleibtGesperrt = (bild: PostBild) => {
    const u = urteil(fassungsText(fassung(TEXT, bild)), geprueft);
    expect(u.ok).toBe(false);
    if (!u.ok) expect(u.grund).toMatch(/nach der Prüfung geändert/);
  };

  it("der Kartentyp", () => {
    bleibtGesperrt({ ...BILD, art: "kennzahl" });
  });

  it("die Bildaussage", () => {
    bleibtGesperrt({ ...BILD, aussage: "Balkonkraftwerke stehen in der Stadt, nicht auf dem Land" });
  });

  it("ein Wert in einer Serie", () => {
    bleibtGesperrt({ ...BILD, serien: [{ ...BILD.serien[0], wert: 12.4 }, BILD.serien[1]] });
  });

  it("die Rundung — auch wenn der Wert derselbe bleibt", () => {
    // Genau der Fall, der schon einmal live war: Der Text sagt „8 Prozent", das
    // Bild zeigt „8,1" aus derselben Zahl.
    bleibtGesperrt({ ...BILD, serien: [{ ...BILD.serien[0], stellen: 0 }, BILD.serien[1]] });
  });

  it("welche Serie hervorgehoben ist", () => {
    bleibtGesperrt({
      ...BILD,
      serien: [
        { ...BILD.serien[0], hervorgehoben: true },
        { ...BILD.serien[1], hervorgehoben: false },
      ],
    });
  });

  it("die Reihenfolge der Serien", () => {
    bleibtGesperrt({ ...BILD, serien: [BILD.serien[1], BILD.serien[0]] });
  });

  it("die Quellenzeile", () => {
    bleibtGesperrt({ ...BILD, quelle: "Irgendwas anderes." });
  });

  it("das FARBSCHEMA — es wandert beim Posten mit", () => {
    // Der Punkt, an dem das Werkzeug sonst etwas anderes zeigt, als rausgeht:
    // Ein Umschalter, der nur die Vorschau umfärbt, wäre keine Änderung an der
    // Karte. Er ist eine.
    bleibtGesperrt({ ...BILD, stil: "highlight" });
    bleibtGesperrt({ ...BILD, stil: "dunkel" });
  });

  it("ein Feld, das es heute noch gar nicht gibt", () => {
    // Der Abdruck läuft über ALLE Felder des Bildes, nicht über eine Aufzählung
    // der heute bekannten. Eine Aufzählung müsste jemand pflegen und würde beim
    // nächsten Feld vergessen — dann hinge die Freigabe wieder an weniger, als
    // das Bild zeigt, ohne dass irgendwo etwas rot wird.
    const mitNeuemFeld = { ...BILD, bildunterschrift: "später einmal" } as unknown as PostBild;
    bleibtGesperrt(mitNeuemFeld);
  });

  it("ein Beitrag ohne Bild ist etwas anderes als derselbe Text mit Bild", () => {
    const u = urteil(fassungsText(fassung(TEXT, null)), geprueft);
    expect(u.ok).toBe(false);
  });
});
