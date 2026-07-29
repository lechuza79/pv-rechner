import { describe, it, expect } from "vitest";
import { cacheBefundAusZustaenden } from "../../scripts/health-check";

// Warum es diesen Test gibt:
//
// Der Juli-Ausfall ist nicht an einer langsamen Seite gescheitert, sondern
// daran, dass niemand gemessen hat, OB die Seiten noch aus dem CDN kommen. Die
// Atlas-Seiten wurden live ungecacht ausgeliefert, obwohl im Code `revalidate`
// stand. Einzeln aufgerufen waren sie schnell genug, um nicht aufzufallen —
// erst unter Parallel-Last riss die Notbremse.
//
// Die Bewertung ist bewusst winzig (ein Set-Lookup), aber sie entscheidet, ob
// ein stiller Rückfall gemeldet wird oder durchrutscht. Genau deshalb steht sie
// in einer eigenen Funktion und hier unter Test: Wer das Set später erweitert,
// muss sich an diesen Fällen vorbei bewegen.
//
// Nachgestellt an der echten Seite (29.07.2026): /api/prices/health ist
// bewusst no-store und kam als MISS -> MISS zurück, /api/pvgis als HIT -> HIT.
// Die beiden Fälle unten sind genau diese Messung.

describe("Cache-Wirksamkeit: Bewertung des zweiten Abrufs", () => {
  it("wertet einen Cache-Treffer beim zweiten Abruf als gecacht", () => {
    expect(cacheBefundAusZustaenden("Startseite", "MISS", "HIT").gecacht).toBe(true);
  });

  it("erkennt eine dauerhaft ungecachte Seite — der Juli-Fall", () => {
    const b = cacheBefundAusZustaenden("Atlas-Einstieg", "MISS", "MISS");
    expect(b.gecacht).toBe(false);
    // Beide Zustände bleiben im Befund, damit die Meldung den Verlauf zeigen
    // kann statt nur das Urteil.
    expect(b.ersterAbruf).toBe("MISS");
    expect(b.zweiterAbruf).toBe("MISS");
  });

  it("akzeptiert alle Zustaende, die eine Auslieferung aus dem CDN belegen", () => {
    for (const zustand of ["HIT", "STALE", "PRERENDER", "REVALIDATED"]) {
      expect(cacheBefundAusZustaenden("x", "MISS", zustand).gecacht).toBe(true);
    }
  });

  it("liest den Zustand unabhaengig von der Schreibweise", () => {
    // Vercel schreibt gross; auf die Schreibweise zu bauen waere eine stille
    // Abhaengigkeit von einem fremden Header-Format.
    expect(cacheBefundAusZustaenden("x", "miss", "hit").gecacht).toBe(true);
  });

  it("wertet BYPASS NICHT als Treffer", () => {
    // BYPASS heisst: eine bewusste Ausnahme greift (Middleware-Matcher,
    // no-store im Code). Das ist kein Cache-Treffer, sondern ein Befund ueber
    // die Liste — der Eintrag gehoert dann mit Begruendung heraus.
    expect(cacheBefundAusZustaenden("x", "BYPASS", "BYPASS").gecacht).toBe(false);
  });

  it("meldet einen fehlgeschlagenen ersten Abruf, statt ihn als gecacht zu werten", () => {
    // Ein 500er ist ein anderer Befund (wird oben gemeldet) — er darf hier auf
    // keinen Fall als "gecacht" durchgehen und den Cache-Rueckfall verdecken.
    const b = cacheBefundAusZustaenden("Ratgeber", "MISS", "kein 200");
    expect(b.gecacht).toBe(false);
  });
});
