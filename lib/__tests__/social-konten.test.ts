import { describe, expect, it } from "vitest";
import {
  SOCIAL_ABLAUF_WARNUNG_TAGE,
  SOCIAL_KONTEN_DDL,
  WARNSTUFEN_TAGE,
  ablaufBefund,
  sollWarnen,
  warnstufe,
  type SocialKonto,
} from "../social-ablauf";

const konto = (gueltigBis: string): SocialKonto => ({
  plattform: "linkedin",
  konto_id: "urn:li:person:x",
  anzeigename: "Test",
  access_token: "geheim",
  gueltig_bis: gueltigBis,
  scopes: ["w_member_social"],
  gewarnt_bei_stufe: null,
  aktualisiert_am: "2026-08-25T00:00:00.000Z",
});

const JETZT = new Date("2026-08-25T12:00:00.000Z");

describe("Ablauf des Social-Zugangs", () => {
  it("meldet einen frischen Zugang als unauffällig", () => {
    const b = ablaufBefund(konto("2026-10-25T12:00:00.000Z"), JETZT);
    expect(b.tageBisAblauf).toBe(61);
    expect(b.abgelaufen).toBe(false);
    expect(b.warnung).toBe(false);
  });

  it("warnt ab der Frist, bevor der Zugang tot ist", () => {
    const grenze = new Date(JETZT.getTime() + SOCIAL_ABLAUF_WARNUNG_TAGE * 86_400_000);
    const b = ablaufBefund(konto(grenze.toISOString()), JETZT);
    expect(b.warnung).toBe(true);
    expect(b.abgelaufen).toBe(false);
  });

  it("erkennt einen abgelaufenen Zugang", () => {
    const b = ablaufBefund(konto("2026-08-24T12:00:00.000Z"), JETZT);
    expect(b.abgelaufen).toBe(true);
    expect(b.tageBisAblauf).toBeLessThan(0);
  });

  // Der Zugangsschlüssel darf nur über den Service-Key erreichbar sein. Ein
  // Entzug allein an PUBLIC reicht in Supabase nicht — über die
  // Default-Privilegien stehen direkte Rechte an anon und authenticated, die ein
  // PUBLIC-Entzug nicht erreicht (gemessen am 29.07.2026 an exec_sql).
  it("entzieht die Rechte an allen drei Rollen und schaltet RLS ein", () => {
    expect(SOCIAL_KONTEN_DDL).toMatch(/ENABLE ROW LEVEL SECURITY/);
    expect(SOCIAL_KONTEN_DDL).toMatch(/REVOKE ALL[\s\S]*PUBLIC/);
    expect(SOCIAL_KONTEN_DDL).toMatch(/REVOKE ALL[\s\S]*anon/);
    expect(SOCIAL_KONTEN_DDL).toMatch(/REVOKE ALL[\s\S]*authenticated/);
    expect(SOCIAL_KONTEN_DDL).not.toMatch(/CREATE POLICY/);
  });
});

describe("Gestaffelte Warnung", () => {
  it("schweigt, solange keine Stufe erreicht ist", () => {
    expect(warnstufe(59)).toBeNull();
    expect(sollWarnen(59, null)).toBe(false);
  });

  it("meldet jede Stufe genau einmal", () => {
    // Der Gesundheitscheck läuft alle drei Stunden. Ohne diese Regel entstünden
    // über hundert Mails in zwei Wochen, und wer so viele bekommt, filtert den
    // Absender weg — dann fehlt auch die eine Meldung, die zählt.
    let gemeldet: number | null = null;
    const meldungen: number[] = [];
    for (const tag of [20, 14, 14, 13, 10, 7, 7, 5, 3, 2, 1, 1, 0, -1, -3]) {
      if (sollWarnen(tag, gemeldet)) {
        gemeldet = warnstufe(tag);
        meldungen.push(tag);
      }
    }
    expect(meldungen).toEqual([14, 7, 3, 1, 0]);
    expect(meldungen.length).toBe(WARNSTUFEN_TAGE.length);
  });

  it("meldet einen bereits abgelaufenen Zugang auf der untersten Stufe", () => {
    expect(warnstufe(-5)).toBe(0);
    expect(sollWarnen(-5, null)).toBe(true);
    // Und danach nicht endlos weiter: der Befund steht dann im Bericht, nicht
    // alle drei Stunden erneut im Postfach.
    expect(sollWarnen(-6, 0)).toBe(false);
  });

  it("beginnt nach einer Neuanmeldung von vorn", () => {
    // Ein frisches Konto trägt keine Stufe; die Kette läuft wieder ab 14 Tagen.
    expect(sollWarnen(14, null)).toBe(true);
    expect(SOCIAL_ABLAUF_WARNUNG_TAGE).toBe(Math.max(...WARNSTUFEN_TAGE));
  });
});
