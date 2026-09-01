import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  DIREKT,
  INTERN,
  herkunftAusVerweis,
  istMaschine,
  pfadFuerZaehlung,
} from "../seiten-herkunft-core";
import { nachHerkunft, nachSeite, type SeitenZeile } from "../seiten-herkunft";

// ─── Die Zählung darf keine Besucher wiedererkennen können. ──────────────────
//
// Die Herkunftszählung läuft ohne Einwilligung. Das trägt nur, solange sie eine
// ZÄHLUNG ist: Inkremente auf (Kalendertag × Pfad × Herkunft), niemals eine
// Zeile je Aufruf. Die Datenschutzkonferenz definiert Fingerprinting
// ausdrücklich als „den Prozess der SERVERSEITIGEN Bildung eines möglichst
// eindeutigen und langlebigen (Hash-)Werts" aus Browser-Angaben
// (OH digitale Dienste, Fassung 1.2, Rn. 23) — zwischen erlaubt und
// einwilligungspflichtig liegen hier zwei Zeilen Code.
//
// Der Typ kann das nicht verhindern, also prüft dieser Test die Bauform selbst:
// dass die Ablage keine Spalte für eine Kennung hat, dass weder IP noch
// Kennungs-Kopf gespeichert werden, und dass der Abfrageteil des eigenen Pfads
// gar nicht erst ankommt.

const wurzel = process.cwd();
const lies = (p: string) => readFileSync(join(wurzel, p), "utf8");

describe("Herkunft aus dem Verweis", () => {
  it("nimmt nur die Domain, nie den Pfad", () => {
    // Der Pfad der verweisenden Seite wäre eine Aussage darüber, welche
    // Unterseite jemand gelesen hat — das ist mehr, als wir wissen wollen.
    expect(herkunftAusVerweis("https://example.de/artikel/solar-test")).toBe("example.de");
    expect(herkunftAusVerweis("https://www.google.com/search?q=pv")).toBe("www.google.com");
  });

  it("nennt den fehlenden Verweis beim Namen, statt ihn wegzuwerfen", () => {
    // Der Anlass der ganzen Zählung: 980 Aufrufe ohne jede Herkunft, und
    // niemand konnte sagen, was das war. Ein eigener Wert macht den Fall in der
    // Auswertung sichtbar; `null` ließe ihn schlicht fehlen.
    expect(herkunftAusVerweis(null)).toBe(DIREKT);
    expect(herkunftAusVerweis("")).toBe(DIREKT);
    expect(herkunftAusVerweis("   ")).toBe(DIREKT);
  });

  it("trennt die eigene Navigation von echten Eintritten", () => {
    // Sie mit fremden Verweisen in einen Topf zu werfen hieße, die eigene
    // Reichweite zu verdoppeln.
    expect(herkunftAusVerweis("https://solar-check.io/photovoltaik-rechner")).toBe(INTERN);
    expect(herkunftAusVerweis("https://www.solar-check.io/")).toBe(INTERN);
    expect(herkunftAusVerweis("http://localhost:3000/ratgeber")).toBe(INTERN);
  });

  it("lässt keinen Unsinn in die Tabelle", () => {
    // Der Kopf kommt aus einem fremden Browser, ist frei wählbar und landet in
    // einer Admin-Ansicht.
    expect(herkunftAusVerweis("<script>alert(1)</script>")).toBe(DIREKT);
    expect(herkunftAusVerweis("keine-domain")).toBe(DIREKT);
    expect(herkunftAusVerweis("a".repeat(300))).toBe(DIREKT);
  });
});

describe("Pfad für die Zählung", () => {
  it("schneidet den Abfrageteil ab — BLOCKER", () => {
    // Das ist kein Vorsichtsmaß, sondern ein bereits eingetretener Fehler: Bis
    // 27.08.2026 ging die vollständige Adresse samt Abfrageteil an die
    // Reichweitenmessung, und die Rechner schreiben die Postleitzahl genau
    // dorthin.
    expect(pfadFuerZaehlung("/photovoltaik-rechner?plz=60311&kwp=10")).toBe("/photovoltaik-rechner");
    expect(pfadFuerZaehlung("/balkonkraftwerk/rechner?plz=10115")).toBe("/balkonkraftwerk/rechner");
  });

  it("lässt gewöhnliche Adressen unangetastet", () => {
    // Die erste Fassung des Zeichen-Prüfers wäre hier durchgefallen: Sie hätte
    // jeden Pfad mit Bindestrich verworfen, also praktisch alle unsere.
    expect(pfadFuerZaehlung("/photovoltaik-foerderung/hessen/frankfurt-am-main"))
      .toBe("/photovoltaik-foerderung/hessen/frankfurt-am-main");
    expect(pfadFuerZaehlung("/")).toBe("/");
    expect(pfadFuerZaehlung("/ratgeber/")).toBe("/ratgeber");
  });

  it("wehrt ab, was in einer Tabelle nichts zu suchen hat", () => {
    expect(pfadFuerZaehlung("/mit leerzeichen")).toBeNull();
    expect(pfadFuerZaehlung('/"><script>')).toBeNull();
    expect(pfadFuerZaehlung(`/${"a".repeat(200)}`)).toBeNull();
    expect(pfadFuerZaehlung("ohne-schraegstrich")).toBeNull();
  });
});

describe("Maschinen", () => {
  it("erkennt, was sich selbst als Maschine ausweist", () => {
    expect(istMaschine("Mozilla/5.0 (compatible; Googlebot/2.1)")).toBe(true);
    expect(istMaschine("curl/8.4.0")).toBe(true);
    expect(istMaschine("Mozilla/5.0 ... HeadlessChrome/120")).toBe(true);
    expect(istMaschine(null)).toBe(true);
  });

  it("zählt einen gewöhnlichen Browser als Besuch", () => {
    // Die Gegenrichtung ist die gefährlichere: Ein zu grober Filter verwirft
    // echte Besucher, und das sieht man einer gesunkenen Zahl nicht an.
    expect(
      istMaschine(
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36",
      ),
    ).toBe(false);
    expect(
      istMaschine("Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) Version/17.5 Mobile Safari/604.1"),
    ).toBe(false);
  });
});

describe("Auswertung", () => {
  const zeilen: SeitenZeile[] = [
    { tag: "2026-08-29", pfad: "/ratgeber", herkunft: "www.google.com", aufrufe: 12 },
    { tag: "2026-08-29", pfad: "/ratgeber", herkunft: DIREKT, aufrufe: 5 },
    { tag: "2026-08-29", pfad: "/ratgeber", herkunft: INTERN, aufrufe: 8 },
    { tag: "2026-08-29", pfad: "/", herkunft: "www.google.com", aufrufe: 3 },
  ];

  it("trennt die drei Fälle je Seite", () => {
    const ratgeber = nachSeite(zeilen).find((s) => s.pfad === "/ratgeber")!;
    expect(ratgeber.aufrufe).toBe(25);
    expect(ratgeber.vonAussen).toBe(12);
    expect(ratgeber.direkt).toBe(5);
    expect(ratgeber.intern).toBe(8);
  });

  it("zählt je Herkunft, wie viele verschiedene Seiten betroffen sind", () => {
    const google = nachHerkunft(zeilen).find((h) => h.herkunft === "www.google.com")!;
    expect(google.aufrufe).toBe(15);
    expect(google.seiten).toBe(2);
  });
});

describe("Grenze zur Wiedererkennung — BLOCKER", () => {
  const kern = lies("lib/seiten-herkunft-core.ts");
  const ablage = lies("lib/seiten-herkunft.ts");
  const mw = lies("middleware.ts");

  it("speichert weder IP noch Kennung des Aufrufers", () => {
    // Sobald aus diesen Angaben ein Wiedererkennungswert entsteht, ist die
    // Zählung einwilligungspflichtig — und zwar die ganze, nicht nur die neue
    // Spalte.
    const spalten = ablage.match(/create table if not exists seiten_herkunft[\s\S]*?\);/)![0];
    for (const verboten of ["ip", "user_agent", "useragent", "besucher", "sitzung", "session", "hash", "kennung"]) {
      expect(
        spalten.toLowerCase(),
        `Spalte „${verboten}" in der Ablage — das wäre die Wiedererkennung`,
      ).not.toContain(verboten);
    }
  });

  it("kennt keinen Zeitstempel feiner als den Kalendertag", () => {
    // Eine Uhrzeit macht aus einer Zählung eine Spur: Wer am selben Tag
    // dieselbe Seite aufruft, ist über Sekundengenauigkeit wieder
    // auseinanderzuhalten.
    const spalten = ablage.match(/create table if not exists seiten_herkunft[\s\S]*?\);/)![0];
    expect(spalten).not.toMatch(/timestamp|timestamptz|\btime\b/i);
    expect(spalten).toMatch(/tag date not null/);
  });

  it("schreibt Inkremente, keine Zeilen je Aufruf", () => {
    // Eine Einfüge-Anweisung ohne Konfliktbehandlung wäre eine Zeile je Aufruf
    // — und damit eine Ereignisliste statt eines Zählers.
    expect(ablage).toMatch(/on conflict \(tag, pfad, herkunft\)/);
    expect(ablage).toMatch(/do update set aufrufe = seiten_herkunft\.aufrufe \+ 1/);
  });

  it("gibt die Kennung des Aufrufers nicht weiter", () => {
    // Sie darf gelesen werden, um Maschinen zu verwerfen — aber sie darf die
    // Middleware nicht verlassen.
    expect(kern).not.toMatch(/p_user_agent|p_ip|userAgent:\s*ua/);
    const zaehlAufruf = mw.match(/zaehleSeitenaufruf\([^)]*\)/)![0];
    expect(zaehlAufruf).not.toMatch(/user-agent|userAgent|ip/i);
  });

  it("hält die Anmeldung von den gewöhnlichen Seiten fern", () => {
    // Seit der Matcher alle Seiten erfasst, ist diese Liste das Einzige, was
    // verhindert, dass bei jedem Besuch eine Sitzungsprüfung läuft — ein
    // Datenbank-Aufruf je Seitenaufruf, auf einer Seite, die ihre Besucher gar
    // nicht kennt.
    expect(mw).toMatch(/const AUTH_PFADE = \[/);
    const liste = mw.match(/const AUTH_PFADE = \[([^\]]*)\]/)![1];
    for (const p of ["/dashboard", "/admin", "/api/calculations", "/auth/callback"]) {
      expect(liste, `${p} fehlt in der Anmelde-Liste`).toContain(p);
    }
    // Und der Zähl-Zweig muss VOR dem Anmelde-Zweig zurückkehren.
    const zaehlStelle = mw.indexOf("zaehleSeitenaufruf");
    const authStelle = mw.indexOf("createServerClient(");
    expect(zaehlStelle).toBeGreaterThan(0);
    expect(zaehlStelle).toBeLessThan(authStelle);
  });

  it("zählt nur die echte Produktion", () => {
    // Entwicklungs-Server und Produktion teilen sich dieselbe Datenbank. Am
    // 01.09.2026, Minuten nach dem Livegang, standen 369 Aufrufe für EINE Seite
    // in der Tabelle — sämtlich aus drei lokalen Testläufen, die jede Seite und
    // jeden Frage-Weg durchklicken. Solche Zeilen sehen aus wie echter Verkehr,
    // stehen unter denselben Pfaden und lassen sich hinterher nicht mehr
    // aussortieren.
    //
    // Geprüft wird auf „production", nicht auf „nicht leer": Sonst schriebe
    // auch eine Vorschau-Auslieferung mit.
    expect(kern).toMatch(/VERCEL_ENV === "production"/);
    const fn = kern.match(/export async function zaehleSeitenaufruf[\s\S]*?\n\}/)![0];
    expect(
      fn,
      "der Produktions-Riegel steht nicht als erstes in zaehleSeitenaufruf",
    ).toMatch(/^\s*export async function zaehleSeitenaufruf[^{]*\{\s*\n\s*if \(!istProduktion\(\)\) return false;/);
  });

  it("lässt die Ablage nur über den Dienstschlüssel zu", () => {
    expect(ablage).toMatch(/alter table seiten_herkunft enable row level security/);
    expect(ablage).not.toMatch(/create policy/);
    for (const rolle of ["public", "anon", "authenticated"]) {
      expect(
        ablage,
        `Rechte für ${rolle} nicht entzogen — ein Entzug an PUBLIC allein reicht in Supabase nicht`,
      ).toContain(`from ${rolle}`);
    }
  });
});
