import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { FEHLERTEXT, PASSWORT_MIN, fehlerAusMeldung, istEmail, passwortOk } from "../auth-regeln";
import { nurFuerDieSitzung, bleibenGilt, bleibenGewuenscht } from "../auth-cookies";
import { AKTUELLE_BLEIBEN_FASSUNG, BLEIBEN_FASSUNGEN, BLEIBEN_TAGE } from "../auth-einwilligung";

/**
 * Wächter für die Anmeldung.
 *
 * Die Anmeldung ist die einzige Stelle des Projekts, an der ein Fehler nicht
 * eine Zahl verfälscht, sondern jemanden aussperrt — und ein Ausgesperrter
 * meldet sich nicht, er geht. Gemessen (02.09.2026): Von 18 Konten hatten 12
 * ihren Anmeldelink nie eingelöst.
 *
 * Geprüft wird die VERWENDUNG, nicht das Vorhandensein: dass die Routen ihre
 * Bremse wirklich aufrufen, nicht dass das Wort irgendwo vorkommt.
 */

const ROOT = join(__dirname, "..", "..");
const ROUTEN = ["app/api/auth/signin/route.ts", "app/api/auth/signup/route.ts", "app/api/auth/reset/route.ts"];

function lies(rel: string): string {
  return readFileSync(join(ROOT, rel), "utf8");
}

describe("Anmelderegeln", () => {
  it("erkennt Adressen und Mindestlänge", () => {
    expect(istEmail("du@beispiel.de")).toBe(true);
    expect(istEmail("beispiel.de")).toBe(false);
    expect(istEmail("du@beispiel")).toBe(false);
    expect(istEmail("  du@beispiel.de  ")).toBe(true);
    expect(passwortOk("x".repeat(PASSWORT_MIN))).toBe(true);
    expect(passwortOk("x".repeat(PASSWORT_MIN - 1))).toBe(false);
  });

  it("übersetzt die Meldungen des Dienstes in unsere Fälle", () => {
    expect(fehlerAusMeldung("Invalid login credentials")).toBe("falsche_zugangsdaten");
    // Ein nicht bestätigtes Konto darf sich nicht von einem falschen Passwort
    // unterscheiden — sonst verrät das Formular, welche Adressen es hier gibt.
    expect(fehlerAusMeldung("Email not confirmed")).toBe("falsche_zugangsdaten");
    expect(fehlerAusMeldung("User already registered")).toBe("email_vergeben");
    expect(fehlerAusMeldung("Password should be at least 8 characters")).toBe("passwort_zu_kurz");
    expect(fehlerAusMeldung("For security purposes… rate limit exceeded")).toBe("zu_viele_versuche");
    expect(fehlerAusMeldung("irgendetwas Unbekanntes")).toBe("fehlgeschlagen");
  });

  it("nennt für jeden Fall einen Satz in Klartext", () => {
    for (const [fall, text] of Object.entries(FEHLERTEXT)) {
      expect(text.length, fall).toBeGreaterThan(20);
      // Keine englische Fachsprache und keine Kennung in der sichtbaren Meldung.
      expect(text, fall).not.toMatch(/[a-z]+_[a-z]+|error|invalid|failed/i);
    }
  });

  it("verrät im Anmeldefehler nicht, ob es die Adresse gibt", () => {
    expect(FEHLERTEXT.falsche_zugangsdaten).not.toMatch(/kein Konto|unbekannt|nicht registriert|gibt es nicht/i);
  });
});

describe("Anmelde-Routen", () => {
  it("laufen serverseitig — der Browser meldet sich nicht selbst mit Passwort an", () => {
    // Der Browser-Weg hält für die Dauer des Netzaufrufs eine Sperre auf dem
    // Anmelde-Speicher; bei mehreren offenen Tabs laufen die anderen in ein
    // Zeitlimit und melden „Anmeldung fehlgeschlagen", obwohl nichts
    // fehlgeschlagen ist. Im Schwesterprojekt live gemessen (30.04.2026).
    const quellen = alleQuellen().filter((d) => !d.includes("/api/auth/"));
    const funde = quellen.filter((d) => /supabase\.auth\.signInWithPassword\s*\(/.test(readFileSync(d, "utf8")));
    expect(funde.map((d) => d.slice(ROOT.length + 1))).toEqual([]);
  });

  it("deckeln die Versuche je Anschluss — sonst ist das Formular ein Durchprobier-Automat", () => {
    for (const rel of ROUTEN) {
      const quelle = lies(rel);
      // Nicht das Vorhandensein des Namens, sondern der AUFRUF mit einem
      // Fenster: Ein Import ohne Aufruf wäre eine Bremse, die nie greift.
      expect(quelle, rel).toMatch(/rateLimit\(\s*request\s*,\s*"auth-[a-z]+"\s*,\s*\d+\s*,/);
    }
  });

  it("lassen keine Anmelde-Antwort in einen Zwischenspeicher", () => {
    for (const rel of ROUTEN) {
      const quelle = lies(rel);
      expect(quelle, rel).toContain('"Cache-Control": "no-store"');
      // Eine Antwort mit Sitzungsschlüsseln, die eine Zwischenstation aufheben
      // darf, reicht die Sitzung an den Nächsten weiter.
      expect(quelle, rel).toContain('export const dynamic = "force-dynamic"');
    }
  });

  it("antwortet beim Passwort-Setzen immer gleich, ob es die Adresse gibt oder nicht", () => {
    const quelle = lies("app/api/auth/reset/route.ts");
    // Der Rückgabewert des Dienstes wird bewusst NICHT ausgewertet: Ein
    // „diese Adresse kennen wir nicht" wäre eine Auskunft darüber, wer hier
    // ein Konto hat.
    expect(quelle).toMatch(/await supabase\.auth\.resetPasswordForEmail\(/);
    expect(quelle).not.toMatch(/const \{[^}]*error[^}]*\} = await supabase\.auth\.resetPasswordForEmail/);
  });
});

describe("Die Anmeldung endet mit dem Browser", () => {
  // GEMESSEN am 02.09.2026 an einer echten Anmeldung: ohne diese Regel kommt
  // das Anmelde-Cookie mit 400 Tagen Lebensdauer — die fest verdrahtete
  // Voreinstellung von @supabase/ssr, die sich über die Einstellungen des
  // Bausteins NICHT ändern lässt. Die Datenschutzerklärung nennt das Cookie
  // „technisch notwendig" und kommt damit ohne Einwilligung aus; ein
  // Anmelde-Cookie über das Schließen des Browsers hinaus trägt das nicht
  // (WP194 Abschnitt 3.2). Begründung ausführlich in lib/auth-cookies.ts.

  it("schreibt kein Anmelde-Cookie ohne die gemeinsame Regel", () => {
    // Geprüft wird die VERWENDUNG an jeder Schreibstelle, nicht das
    // Vorhandensein der Funktion irgendwo — sie kommt in ihrer eigenen
    // Definition vor, und ein Test darauf belegte sich selbst.
    const funde: string[] = [];
    for (const datei of alleQuellen().concat([join(ROOT, "middleware.ts")])) {
      const rel = datei.slice(ROOT.length + 1);
      if (rel === "lib/auth-cookies.ts") continue;
      const quelle = readFileSync(datei, "utf8");
      // Jede Zeile, die ein Cookie schreibt, muss die Regel anwenden.
      for (const [i, zeile] of quelle.split("\n").entries()) {
        // Nur Schreibvorgänge MIT Einstellungen: Die Lebensdauer steckt dort.
        // Ein `set(name, value)` ohne dritten Wert bekommt ohnehin keine und
        // ist damit von selbst auf die Sitzung begrenzt (so schreibt die
        // Middleware ihre Kopie der eingehenden Anfrage).
        if (!/\.set\(name, value,/.test(zeile)) continue;
        if (!zeile.includes("nurFuerDieSitzung")) funde.push(`${rel}:${i + 1}`);
      }
    }
    expect(funde).toEqual([]);
  });

  it("baut den Browser-Client mit der eigenen Cookie-Behandlung", () => {
    // Ohne sie schreibt der Baustein die 400 Tage bei jeder Auffrischung des
    // Zugangs neu — stündlich, und damit jede serverseitige Korrektur zunichte.
    const quelle = lies("lib/supabase-browser.ts");
    expect(quelle.replace(/\n/g, " ")).toMatch(/createBrowserClient\([^)]*cookies:\s*browserCookies/);
  });

  it("nimmt einer Löschung ihre Lebensdauer NICHT", () => {
    // Der Baustein löscht ein Cookie, indem er es mit maxAge 0 überschreibt.
    // Nähme die Regel ihm das, bliebe ein abgemeldeter Nutzer angemeldet — die
    // gefährlichere Richtung.
    const name = "sb-abc-auth-token";
    expect(nurFuerDieSitzung(name, { maxAge: 0, path: "/" })).toEqual({ maxAge: 0, path: "/" });
    expect(nurFuerDieSitzung(name, { maxAge: 34560000, path: "/" })).toEqual({ path: "/" });
    expect(nurFuerDieSitzung(name, { expires: new Date(), path: "/" })).toEqual({ path: "/" });
  });

  it("lässt dem Prüfschlüssel für Mail-Links seine 24 Stunden", () => {
    // Wer sein Passwort zurücksetzt, fordert den Link am Rechner an, schließt
    // den Browser und öffnet die Mail später. Wäre dieser Schlüssel ein reines
    // Sitzungs-Cookie, führte der Link ins Leere — und zwar ohne dass
    // irgendetwas kaputt aussähe.
    const o = nurFuerDieSitzung("sb-abc-auth-token-code-verifier", { maxAge: 34560000, path: "/" });
    expect(o.maxAge).toBe(24 * 60 * 60);
    // Auch hier gilt: eine Löschung bleibt eine Löschung.
    expect(nurFuerDieSitzung("sb-abc-auth-token-code-verifier", { maxAge: 0 }).maxAge).toBe(0);
  });
});

describe("Angemeldet bleiben ist eine Einwilligung", () => {
  // Ohne Häkchen endet die Anmeldung mit dem Browser und braucht keine
  // Einwilligung. MIT Häkchen wird die Ausnahme nicht geheilt, sondern ersetzt
  // (WP194 Abschnitt 3.2 nennt genau diese Checkbox als geeignetes Mittel) —
  // und damit gelten die Anforderungen an eine Einwilligung.

  it("ist nicht vorausgewählt", () => {
    // Eine Einwilligung, die schon gesetzt ist, ist keine.
    const quelle = lies("components/AnmeldeFormular.tsx");
    expect(quelle).toMatch(/useState\(false\);\s*$/m);
    expect(quelle).toMatch(/const \[bleiben, setBleiben\] = useState\(false\)/);
  });

  it("gilt nur mit Inhalt, nicht schon bei Vorhandensein", () => {
    // Ein Löschversuch kann ein Cookie mit LEEREM Wert hinterlassen. Wer
    // „vorhanden" mit „gesetzt" verwechselt, verlängert die Anmeldung gegen
    // den ausdrücklichen Willen des Nutzers. Beim Bauen genau so gemessen.
    expect(bleibenGilt("2026-09-02")).toBe(true);
    expect(bleibenGilt("")).toBe(false);
    expect(bleibenGilt("  ")).toBe(false);
    expect(bleibenGilt(undefined)).toBe(false);
    expect(bleibenGewuenscht("sc-angemeldet-bleiben=; andere=1")).toBe(false);
    expect(bleibenGewuenscht("andere=1; sc-angemeldet-bleiben=2026-09-02")).toBe(true);
    expect(bleibenGewuenscht("")).toBe(false);
  });

  it("verlängert das Anmelde-Cookie NUR mit erteilter Einwilligung", () => {
    const name = "sb-abc-auth-token";
    expect(nurFuerDieSitzung(name, { maxAge: 34560000 }, false).maxAge).toBeUndefined();
    expect(nurFuerDieSitzung(name, { maxAge: 34560000 }, true).maxAge).toBe(BLEIBEN_TAGE * 24 * 60 * 60);
    // Eine Löschung bleibt eine Löschung, auch mit Einwilligung.
    expect(nurFuerDieSitzung(name, { maxAge: 0 }, true).maxAge).toBe(0);
  });

  it("nennt die Dauer im Einwilligungstext genau so, wie sie gilt", () => {
    // Sonst willigt jemand in 90 Tage ein und bekommt 400 — dieselbe
    // Fehlerklasse wie eine Beschriftung, die etwas anderes sagt als die Zahl.
    expect(AKTUELLE_BLEIBEN_FASSUNG.erklaerung).toContain(`${BLEIBEN_TAGE} Tage`);
    // Und der Text sagt, wie man es zurücknimmt (Art. 7 Abs. 3 DSGVO).
    expect(AKTUELLE_BLEIBEN_FASSUNG.erklaerung).toMatch(/zurück|abmeld/i);
  });

  it("hält den Wortlaut fest, statt ihn in der Oberfläche zu tippen", () => {
    // Ein Einwilligungstext als Konstante in der Oberfläche ändert sich mit dem
    // nächsten Commit; danach ist nicht mehr rekonstruierbar, wozu jemand
    // zugestimmt hat (EDSA-Leitlinien 05/2020 Rn. 108). Dieselbe Bauform wie
    // beim Gemeinde-Abo.
    const quelle = lies("components/AnmeldeFormular.tsx");
    expect(quelle).toContain("AKTUELLE_BLEIBEN_FASSUNG.label");
    expect(quelle).toContain("AKTUELLE_BLEIBEN_FASSUNG.erklaerung");
    // Fassungen tragen ein Datum und werden nie doppelt vergeben.
    const versionen = BLEIBEN_FASSUNGEN.map((f) => f.version);
    expect(new Set(versionen).size).toBe(versionen.length);
    for (const f of BLEIBEN_FASSUNGEN) expect(f.version).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it("nimmt die Einwilligung beim Abmelden zurück", () => {
    // Der Widerruf muss so einfach sein wie die Erteilung (Art. 7 Abs. 3 S. 4).
    // Erteilt wird mit einem Häkchen, zurückgenommen mit dem Abmelden — dabei
    // darf kein Merker stehen bleiben, der beim nächsten Mal still wieder greift.
    const quelle = lies("lib/auth.ts");
    expect(quelle.replace(/\n/g, " ")).toMatch(/export async function signOut\(\)[^}]*merkeBleiben\(false\)/);
  });
});

describe("Eine Quelle für Mindestlänge und Fehlertexte", () => {
  it("tippt die Mindestlänge nirgends ein zweites Mal", () => {
    const funde: string[] = [];
    for (const datei of alleQuellen()) {
      const rel = datei.slice(ROOT.length + 1);
      const quelle = readFileSync(datei, "utf8");
      if (!/passwort|password/i.test(quelle)) continue;
      // Eine getippte Zahl neben dem Wort „Zeichen" ist die zweite Fassung
      // derselben Regel — dieselbe Fehlerklasse wie zwei Formatter für eine
      // Einheit: Der Hinweis sagt dann etwas anderes, als die Prüfung verlangt.
      if (/\b\d+\s+Zeichen/.test(quelle)) funde.push(rel);
    }
    expect(funde).toEqual([]);
  });
});

/** Alle Quelldateien unter app/ und components/, ohne Tests. */
function alleQuellen(): string[] {
  const out: string[] = [];
  const lauf = (p: string) => {
    for (const eintrag of readdirSync(p)) {
      if (eintrag === "node_modules" || eintrag === "__tests__") continue;
      const voll = join(p, eintrag);
      if (statSync(voll).isDirectory()) lauf(voll);
      else if (/\.tsx?$/.test(eintrag) && !eintrag.includes(".test.")) out.push(voll);
    }
  };
  lauf(join(ROOT, "app"));
  lauf(join(ROOT, "components"));
  return out;
}
