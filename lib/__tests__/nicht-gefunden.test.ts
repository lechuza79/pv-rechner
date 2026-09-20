import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { NICHT_GEFUNDEN } from "../nicht-gefunden";

/**
 * WARUM ES DIESEN TEST GIBT (20.09.2026):
 *
 * Eine unbekannte Adresse antwortete mit Next' nackter Standardseite — richtiger
 * Statuscode, aber eine Sackgasse ohne Menü und ohne Fußzeile. Seitdem gibt es
 * zwei eigene 404-Seiten, weil eine falsche Adresse den Besucher auf zwei
 * Wegen erreicht:
 *
 *   - app/global-not-found.tsx für eine Adresse, auf die KEINE Route passt. Sie
 *     ist ein eigenes Dokument, weil es hier gar kein Wurzel-Layout gibt: (site),
 *     (embed) und (partner) bringen jeweils ihr eigenes mit, und ein
 *     app/not-found.tsx ohne Wurzel-Layout weist Next ab (gemessen: HTTP 500 auf
 *     jeder unbekannten Adresse).
 *   - app/(site)/not-found.tsx für eine Seite, die es gibt, hinter der aber
 *     nichts steht — ein erfundener Ort im Energie-Atlas etwa.
 *
 * Geprüft wird hier die STRUKTUR. Ob am Ende wirklich ein 404 herauskommt,
 * misst der Gesundheitscheck am lebenden System (zwei Proben: die erfundene
 * Atlas-Adresse und eine Adresse ohne jede Route) — dasselbe Verhältnis wie bei
 * lib/__tests__/atlas-soft-404.test.ts. Ein Soft-404 ist von außen unsichtbar:
 * Die Seite sieht richtig aus und sagt trotzdem 200.
 */
const WURZEL = resolve(__dirname, "..", "..");
const lies = (...teile: string[]) => readFileSync(resolve(WURZEL, ...teile), "utf8");

const GLOBAL = lies("app", "global-not-found.tsx");
const SITE = lies("app", "(site)", "not-found.tsx");
const INHALT = lies("components", "NichtGefundenInhalt.tsx");
const CSS = lies("public", "shared-404", "nicht-gefunden.css");
const CONFIG = lies("next.config.js");
const HEALTH = lies("scripts", "health-check.ts");

describe("404-Seiten", () => {
  it("der Schalter steht, ohne den Next seine eigene nackte Seite ausliefert", () => {
    // Ohne experimental.globalNotFound ignoriert Next app/global-not-found.tsx
    // vollständig — die Datei bleibt da, die Seite ist wieder die alte, und
    // nichts wird rot.
    expect(CONFIG).toMatch(/globalNotFound:\s*true/);
  });

  it("beide Seiten rendern DENSELBEN Inhalts-Baustein", () => {
    // Nicht nur denselben Text: dieselbe Zeichnung. Zweimal gebaut driften sie
    // in Wortlaut UND Aussehen, und keine der beiden sähe für sich falsch aus.
    // Geprüft wird die VERWENDUNG, nicht der Import — eine stehengebliebene
    // Import-Zeile neben eigenem JSX wäre genau der Rückfall.
    for (const [name, quelle] of [["global", GLOBAL], ["(site)", SITE]] as const) {
      expect(quelle, `die ${name}-Seite rendert den geteilten Baustein nicht`)
        .toContain("<NichtGefundenInhalt />");
      expect(quelle, `die ${name}-Seite zeichnet den Inhalt selbst statt ihn zu holen`)
        .not.toContain("NICHT_GEFUNDEN.wege");
    }
    // Und der Baustein holt seine Worte aus der einen Quelle.
    expect(INHALT).toContain("NICHT_GEFUNDEN.ueberschrift");
    expect(INHALT).toContain("NICHT_GEFUNDEN.wege");
  });

  it("das Aussehen hängt am Baustein, nicht an der einbettenden Seite", () => {
    // Der Stil reist mit dem Baustein: ein neuer Einbauort bekommt ihn, ohne
    // dass jemand an eine Stylesheet-Zeile denken muss.
    expect(INHALT, "der Baustein bringt sein Stylesheet nicht mit")
      .toMatch(/rel="stylesheet" href="\/shared-404\/nicht-gefunden\.css"/);
    // NICHT als Import: der landet im CSS-Bündel jeder React-Seite (gemessen).
    expect(INHALT, "das Stylesheet wird importiert statt verlinkt — das kostet jede Seite Bytes")
      .not.toMatch(/import ".*nicht-gefunden\.css"/);
  });

  it("das Stylesheet greift nur innerhalb des Blocks", () => {
    // Es liegt auf React-Seiten neben den globalen Stilen der ganzen Site. Eine
    // Regel auf ein nacktes Element (h1, main, a) färbte dort jede Seite ein —
    // und das fiele niemandem an der 404 auf, sondern irgendwo anders.
    const regeln = CSS
      .replace(/\/\*[\s\S]*?\*\//g, "")
      .split("}")
      .map((r) => r.split("{")[0].trim())
      .filter((r) => r && !r.startsWith("@") && !r.startsWith("src") && !r.startsWith("font"));
    for (const selektor of regeln) {
      expect(selektor, `"${selektor}" wirkt außerhalb des 404-Blocks`).toMatch(/\.sc-nf/);
    }
  });

  it("keine der beiden Seiten leitet weiter oder antwortet normal", () => {
    // Eine Weiterleitung auf die Startseite ist die verbreitete Abkürzung und
    // genau der Schaden: Google sieht dann eine gültige Seite und crawlt
    // erfundene Adressen weiter.
    for (const [name, quelle] of [["global", GLOBAL], ["(site)", SITE]] as const) {
      expect(quelle, `die ${name}-Seite leitet weiter`).not.toMatch(/\bredirect\s*\(/);
      expect(quelle, `die ${name}-Seite setzt einen eigenen Statuscode`).not.toMatch(/status:\s*200/);
    }
  });

  it("die global-Seite bringt ihr eigenes Dokument mit", () => {
    // Sie hat kein Layout über sich; fehlt html oder body, rendert Next nichts
    // Brauchbares.
    expect(GLOBAL).toMatch(/<html\b/);
    expect(GLOBAL).toMatch(/<body\b/);
  });

  it("die global-Seite nimmt den Rahmen der übrigen Dokumentseiten", () => {
    // Sonst steht der Besucher in einer zweiten, eigenen Gestaltung — und die
    // fällt niemandem auf, weil kaum jemand auf diese Seite sieht.
    expect(GLOBAL).toContain("NEON_STYLESHEETS");
    expect(GLOBAL).toContain("NEON_KOPF_INNEN");
    expect(GLOBAL).toContain("NEON_NAV_SKRIPT");
    expect(GLOBAL).toContain("siteFussHtml");
  });

  it("der Gesundheitscheck fragt BEIDE Wege ab", () => {
    // Der Atlas-Weg war schon geprüft; die Adresse ohne Route kam am
    // 20.09.2026 dazu. Fällt eine der Proben weg, ist genau ihr Weg wieder
    // unbeobachtet.
    expect(HEALTH).toContain("SOFT_404_PFAD");
    expect(HEALTH).toContain("UNBEKANNTE_ADRESSE");
    // Die Verwendung, nicht nur die Konstante — sonst steht sie da und wird nie
    // abgerufen.
    expect(HEALTH).toMatch(/probe\([^)]*UNBEKANNTE_ADRESSE\)/);
  });

  it("die Wege zeigen auf Adressen, die es gibt", () => {
    expect(NICHT_GEFUNDEN.wege.length).toBeGreaterThanOrEqual(3);
    for (const w of NICHT_GEFUNDEN.wege) {
      expect(w.href.startsWith("/"), `${w.href} ist keine interne Adresse`).toBe(true);
      expect(w.titel.length).toBeGreaterThan(0);
      expect(w.text.length).toBeGreaterThan(0);
    }
  });
});
