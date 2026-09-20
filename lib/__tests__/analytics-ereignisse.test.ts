import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { EVENTS } from "../analytics";

// ─── Ereignisse bleiben Zähler. ──────────────────────────────────────────────
//
// Die Messung läuft ohne Zustimmungsfenster; das hängt daran, dass sie eine
// ZÄHLUNG ist und keine Analyse. Die Datenschutzkonferenz nennt als Kipppunkt
// ausdrücklich „benutzerdefinierte Variablen" (OH digitale Dienste, 20.11.2024,
// Rn. 88) und stellt in Rn. 89 klar, dass eine einmal bejahte enge Einordnung
// verfällt, sobald „ein weiteres Auswertungsergebnis hinzukommt".
//
// Der Typ von `trackEvent` verhindert das schon zur Übersetzungszeit. Dieser
// Test hält die Hälften daneben, die der Typ NICHT sieht: dass niemand am
// Wrapper vorbei misst, dass die Liste nicht heimlich Werte in Namen
// verpackt, und dass die Datenschutzerklärung weiter beschreibt, was wirklich
// passiert.

const wurzel = process.cwd();
const lies = (p: string) => readFileSync(join(wurzel, p), "utf8");
const suche = (muster: string) =>
  // OHNE Shell (execFile statt exec): Das Muster enthält Anführungszeichen, und
  // in einer zusammengebauten Kommandozeile heben die sich gegen die äußeren
  // auf — der Suchlauf fand dann die nackten Namen statt der Zeichenketten,
  // ohne dass irgendetwas rot wurde. Beim Umbau auf EINEN Lauf (05.09.2026)
  // genau so passiert und nur aufgefallen, weil die Laufzeit sich nicht
  // besserte.
  //
  // NUR „kein Treffer" wird aufgefangen, nichts sonst.
  //
  // git grep meldet ein leeres Ergebnis mit dem Rückgabewert 1 — das ist hier
  // ein gültiges Ergebnis. Alles andere (128: Muster kaputt) ist ein Defekt und
  // MUSS durchschlagen. Ein pauschales Auffangen hätte den Nachbartest still
  // wertlos gemacht: Sein Muster enthält eine Klammer, die als erweiterter
  // Ausdruck einen Fehler wirft — der Test wäre grün geblieben und hätte
  // nichts mehr geprüft. Genau am 05.09.2026 gebaut und beim Nachmessen
  // gefunden.
  ((): string[] => {
    try {
      return execFileSync("git", ["grep", "-nE", "--untracked", muster, "--", "*.ts", "*.tsx"], {
        cwd: wurzel,
        encoding: "utf8",
      })
        .split("\n")
        .filter(Boolean)
        .filter((z) => !z.includes("__tests__"));
    } catch (e) {
      const status = (e as { status?: number }).status;
      if (status === 1) return [];
      throw e;
    }
  })();

describe("Analytics-Ereignisse", () => {
  it("trackEvent nimmt genau ein Argument", () => {
    // Ein zweiter Parameter wäre die Rückkehr der Eigenschaften — und die
    // Rechtsfrage ginge wieder auf, ohne dass es jemandem auffällt.
    const quelle = lies("lib/analytics.ts");
    const signatur = quelle.match(/export function trackEvent\(([^)]*)\)/);
    expect(signatur, "trackEvent nicht gefunden — umbenannt?").not.toBeNull();
    expect(signatur![1].split(",").length).toBe(1);
  });

  it("niemand misst am Wrapper vorbei", () => {
    // `track(...)` direkt aus dem Paket würde jede Grenze umgehen. Erlaubt ist
    // die eine Stelle, die den Wrapper baut.
    const direkt = suche("[^a-zA-Z]track\\(").filter(
      (z) => !z.startsWith("lib/analytics.ts:"),
    );
    expect(direkt, `Direkter track()-Aufruf außerhalb des Wrappers:\n${direkt.join("\n")}`)
      .toEqual([]);
  });

  it("kein Ereignisname verpackt einen Messwert", () => {
    // Der Name darf sagen, WAS passiert ist, nie mit welchen Werten.
    // `pv_ergebnis_10kwp` wäre die Eigenschaft durch die Hintertür.
    for (const name of EVENTS) {
      expect(name, `"${name}" enthält eine Zahl — sieht nach verpacktem Messwert aus`)
        .not.toMatch(/\d/);
      expect(name).toMatch(/^[a-z_]+$/);
    }
  });

  // 20 Sekunden statt der voreingestellten fünf: Die Prüfung durchsucht den
  // ganzen Quellbaum je Ereignisnamen. Auf einer ruhigen Maschine dauert das
  // gut eine Sekunde, unter der Last mehrerer paralleler Sitzungen (gemessen
  // 05.09.2026: Lastwert 60 auf acht Kernen) über zehn — der Lauf wurde dann
  // rot, ohne dass am Code etwas falsch war, und blockierte jeden Commit.
  // Angehoben wird die WARTEZEIT, nicht die Aussage.
  it("die Liste hat keine Karteileichen und keine Lücken", () => {
    // Beide Richtungen: ein Eintrag ohne Aufrufer ist tote Dokumentation, ein
    // Aufruf ohne Eintrag ginge gar nicht erst durch die Übersetzung — aber
    // die Prüfung hier nennt beim Umbenennen die Stelle.
    // Gesucht wird der Name als Zeichenkette irgendwo im Code, nicht nur
    // direkt im Aufruf: Die Trichter-Namen stehen in einer Liste, die
    // Brief-Namen in einer Fallunterscheidung. Ein Test, der nur
    // `trackEvent("…")` erkennt, hielte beides für unbenutzt und würde zur
    // Aufforderung, richtigen Code umzuschreiben.
    // EIN Suchlauf für alle Namen, nicht einer je Name.
    //
    // Vorher startete diese Zeile für jedes Ereignis einen eigenen
    // Suchprozess. Bei 33 Ereignissen lief der Test 4,9 Sekunden gegen ein
    // Zeitlimit von 5 — auf einer ruhigen Maschine grün, auf einer belasteten
    // rot, und zwar ohne dass sich am geprüften Code etwas geändert hätte.
    // Genau die Sorte Rot, von der man sich abgewöhnt, Rot ernst zu nehmen.
    // Gemessen am 05.09.2026 unter Last: Ausfall im Vorab-Lauf, allein mit
    // höherem Limit grün.
    //
    // DIE LISTE SELBST ZÄHLT NICHT ALS AUFRUFER. Ohne diese Zeile fand die
    // Suche jeden Namen in seiner eigenen Definition und meldete nie eine
    // Karteileiche — der Test war grün und prüfte nichts. Gemessen am
    // 05.09.2026: ein frei erfundenes Ereignis in die Liste gelegt, dieser Test
    // blieb grün (rot wurde nur der Katalog-Test daneben, aus einem anderen
    // Grund). Die Nachbarprüfung nimmt dieselbe Datei aus, dort war es von
    // Anfang an gesehen worden.
    const treffer = suche(`"(${EVENTS.join("|")})"`).filter(
      (z) => !z.startsWith("lib/analytics.ts:"),
    );
    const ohneAufrufer = EVENTS.filter((e) => !treffer.some((z) => z.includes(`"${e}"`)));
    expect(ohneAufrufer, `Ereignisse ohne Aufrufer: ${ohneAufrufer.join(", ")}`).toEqual([]);
  }, 20_000);

  it("der Ereignis-Katalog kennt jedes Ereignis", () => {
    const katalog = lies("docs/analytics-events.md");
    for (const name of EVENTS) {
      expect(katalog, `"${name}" fehlt in docs/analytics-events.md`).toContain(name);
    }
  });

  it("die Datenschutzerklärung verspricht keine Eckdaten mehr", () => {
    // Bis 27.08.2026 stand dort, wir erfassten „einzelne gewählte Eckdaten der
    // Berechnung (zum Beispiel die Anlagen- oder Speichergröße)". Das tun wir
    // nicht mehr — und eine Erklärung, die mehr Erhebung behauptet, als
    // stattfindet, ist genauso falsch wie eine, die weniger behauptet.
    const text = lies("app/(site)/datenschutz/page.tsx");
    expect(text).not.toMatch(/Eckdaten der Berechnung/);
    expect(text).not.toMatch(/Anlagen-\s*oder\s*Speichergröße/);
  });
});
