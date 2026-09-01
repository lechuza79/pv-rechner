import { describe, it, expect, beforeAll } from "vitest";
import {
  BESTAETIGUNG_GUELTIG_MS,
  abmeldeToken,
  bestaetigungsToken,
  pruefeAbmeldung,
  pruefeBestaetigung,
} from "../abo-token";

// Was ein Token leisten muss, damit ein Abo ohne Konto funktioniert — und was
// es NICHT zulassen darf. Jeder Fall hier ist einer, der ohne Prüfung
// unbemerkt kaputtgehen würde: Ein Token, das nicht mehr abläuft, sieht genauso
// aus wie eines, das abläuft, und ein Zweck, der auf den anderen passt, fällt
// erst auf, wenn jemand ihn ausnutzt.

const JETZT = Date.UTC(2026, 7, 31, 12, 0, 0);
const ID = "3f2a91c4-0000-4000-8000-abcdefabcdef";

beforeAll(() => {
  process.env.ABO_HMAC_SECRET = "test-geheimnis-mindestens-16-zeichen";
});

describe("Bestätigungs-Token", () => {
  it("erkennt das eigene Token wieder", () => {
    const t = bestaetigungsToken(ID, JETZT);
    expect(pruefeBestaetigung(t, JETZT)).toEqual({ ok: true, aboId: ID });
  });

  it("gilt bis zur Ablaufgrenze und danach nicht mehr", () => {
    const t = bestaetigungsToken(ID, JETZT);
    // Eine Millisekunde vor Ablauf: gültig.
    expect(pruefeBestaetigung(t, JETZT + BESTAETIGUNG_GUELTIG_MS - 1).ok).toBe(true);
    // Eine Millisekunde danach: abgelaufen — und ausdrücklich mit diesem Grund,
    // damit die Seite „Link abgelaufen" von „Link falsch" unterscheiden kann.
    expect(pruefeBestaetigung(t, JETZT + BESTAETIGUNG_GUELTIG_MS + 1)).toEqual({
      ok: false,
      grund: "abgelaufen",
    });
  });

  it("weist ein verändertes Token ab", () => {
    const t = bestaetigungsToken(ID, JETZT);
    const [id, mitte, sig] = t.split(".");
    // Ablaufzeit hochgesetzt, Signatur unverändert: der naheliegende Angriff.
    const verlaengert = `${id}.${Number(mitte) + 10 * 365 * 24 * 3600_000}.${sig}`;
    expect(pruefeBestaetigung(verlaengert, JETZT)).toEqual({ ok: false, grund: "ungueltig" });
  });

  it("weist eine fremde Kennung mit gültiger Signatur ab", () => {
    const t = bestaetigungsToken(ID, JETZT);
    const [, mitte, sig] = t.split(".");
    const fremd = `00000000-0000-4000-8000-000000000000.${mitte}.${sig}`;
    expect(pruefeBestaetigung(fremd, JETZT)).toEqual({ ok: false, grund: "ungueltig" });
  });

  it("nimmt kein Abmelde-Token an", () => {
    // ZWECK-TRENNUNG. Ohne sie könnte ein dauerhaft gültiger Abmeldelink als
    // Bestätigung durchgehen — und damit ein Abo, das jemand beendet hat,
    // wieder aktivieren.
    expect(pruefeBestaetigung(abmeldeToken(ID), JETZT)).toEqual({ ok: false, grund: "ungueltig" });
  });

  it("weist Unsinn ab, statt zu werfen", () => {
    for (const müll of ["", "abc", "a.b", "a.b.c.d", "....", "a.b.zzz"]) {
      expect(pruefeBestaetigung(müll, JETZT).ok).toBe(false);
    }
  });
});

describe("Abmelde-Token", () => {
  it("erkennt das eigene Token wieder", () => {
    expect(pruefeAbmeldung(abmeldeToken(ID))).toEqual({ ok: true, aboId: ID });
  });

  it("läuft nie ab", () => {
    // Ein Abo muss auch nach Jahren kündbar sein. Ein Abmeldelink mit
    // Verfallsdatum wäre ein Verteiler, aus dem man irgendwann nicht mehr
    // herauskommt — genau das schließt die Zusage am Anmeldeknopf aus.
    const t = abmeldeToken(ID);
    expect(pruefeAbmeldung(t).ok).toBe(true);
  });

  it("nimmt kein Bestätigungs-Token an", () => {
    expect(pruefeAbmeldung(bestaetigungsToken(ID, JETZT))).toEqual({ ok: false, grund: "ungueltig" });
  });
});

describe("Geheimnis", () => {
  it("verweigert ohne gesetztes Geheimnis, statt auf einen Standardwert zu fallen", () => {
    const vorher = process.env.ABO_HMAC_SECRET;
    process.env.ABO_HMAC_SECRET = "";
    // Ein fester Ersatzwert wäre öffentlich bekannt — dann kann jeder jedes
    // Abo bestätigen und abmelden. Werfen ist hier die sichere Richtung.
    expect(() => abmeldeToken(ID)).toThrow(/ABO_HMAC_SECRET/);
    process.env.ABO_HMAC_SECRET = vorher;
  });

  it("verweigert ein zu kurzes Geheimnis", () => {
    const vorher = process.env.ABO_HMAC_SECRET;
    process.env.ABO_HMAC_SECRET = "kurz";
    expect(() => abmeldeToken(ID)).toThrow(/ABO_HMAC_SECRET/);
    process.env.ABO_HMAC_SECRET = vorher;
  });

  it("Token eines anderen Geheimnisses gelten nicht", () => {
    const t = bestaetigungsToken(ID, JETZT);
    const vorher = process.env.ABO_HMAC_SECRET;
    process.env.ABO_HMAC_SECRET = "ein-ganz-anderes-geheimnis-x";
    expect(pruefeBestaetigung(t, JETZT)).toEqual({ ok: false, grund: "ungueltig" });
    process.env.ABO_HMAC_SECRET = vorher;
  });
});
