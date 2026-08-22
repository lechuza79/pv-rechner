import { describe, it, expect } from "vitest";
import { FUNDING_PROGRAMS } from "../funding-programs";

// Zwei Programme, die dieselbe Amtsseite als ihre Quelle nennen, sind fast immer
// ein Lesefehler: Eines von beiden zitiert die Richtlinie einer FREMDEN
// Gemeinde. Und der Fehler ist von außen unsichtbar — die Seite lädt, der Link
// funktioniert, die Sätze passen sogar, weil Nachbargemeinden voneinander
// abschreiben.
//
// GEMESSEN AM 22.08.2026: Die Ortsgemeinde Hillscheid und die Stadt
// Höhr-Grenzhausen führen je ein eigenes Förderprogramm mit zellgleichen Sätzen,
// beide unter derselben Rubrik der Verbandsgemeinde, aber auf ZWEI Seiten.
// Unser Hillscheid-Eintrag zeigte auf die Seite der Stadt. Zwei Folgen, beide
// still:
//
//   1. Die Stadt hatte ihre Mittel für 2026 ausgeschöpft und schrieb das hin.
//      Wer dem Quellenlink des Hillscheid-Eintrags folgte, las eine Absage für
//      ein Programm, das läuft.
//   2. Der Seiten-Wächter beobachtete für Hillscheid die Bewegungen einer
//      fremden Gemeinde — jede echte Änderung in Hillscheid wäre unbemerkt
//      geblieben, jede Änderung der Stadt hätte für Hillscheid Alarm ausgelöst.
//
// Der Katalog bildet EIN Programm je Seite ab: Wo eine Gemeinde Dach-PV und
// Balkonkraftwerk auf einer Seite fördert, steht das als ein Eintrag mit
// mehreren `rates` (Gernsheim, Linsengericht). Geteilte Adressen sind damit
// nicht die Ausnahme, die man erlauben muss, sondern das Symptom.
//
// Eine Ausnahme braucht einen ausgeschriebenen Grund in der Liste unten — die
// Regel aufzuweichen ist nie die Lösung.
const GETEILTE_ADRESSE_ERLAUBT: Record<string, string> = {
  // (leer — Stand 22.08.2026 nennt jedes der 109 Programme eine eigene Adresse)
};

describe("Jedes Programm nennt seine eigene Amtsseite", () => {
  it("keine zwei Programme teilen sich eine Quelladresse", () => {
    const nachAdresse = new Map<string, string[]>();
    for (const p of Object.values(FUNDING_PROGRAMS)) {
      if (!p.url) continue;
      // Der Vergleich ignoriert nur Groß-/Kleinschreibung des Hosts und einen
      // abschließenden Schrägstrich — nicht den Pfad. Der Pfad IST hier der
      // Unterschied zwischen zwei Gemeinden.
      const schluessel = p.url.trim().replace(/\/+$/, "").toLowerCase();
      nachAdresse.set(schluessel, [...(nachAdresse.get(schluessel) ?? []), p.id]);
    }

    const doppelt = [...nachAdresse.entries()]
      .filter(([adresse, ids]) => ids.length > 1 && !GETEILTE_ADRESSE_ERLAUBT[adresse])
      .map(([adresse, ids]) => `${ids.join(" + ")} → ${adresse}`);

    expect(
      doppelt,
      "Diese Programme nennen dieselbe Amtsseite als Quelle. Mindestens eines " +
        "zitiert damit die Richtlinie einer fremden Gemeinde — der Quellenlink " +
        "führt Nutzer zur falschen Auskunft, und der Seiten-Wächter beobachtet " +
        "für dieses Programm die Bewegungen eines anderen Orts. Erst die richtige " +
        "Adresse suchen (Verbandsgemeinden führen oft je Ortsgemeinde eine eigene " +
        "Seite); nur wenn es sie wirklich nicht gibt, mit Begründung in " +
        "GETEILTE_ADRESSE_ERLAUBT eintragen.",
    ).toEqual([]);
  });

  it("die beiden Programme der Verbandsgemeinde Höhr-Grenzhausen zeigen auseinander", () => {
    // Der Anlassfall, festgenagelt: gleiche Sätze, gleicher Träger-Verbund,
    // verschiedene Gemeinden — und deshalb verschiedene Richtlinien-Seiten.
    const stadt = FUNDING_PROGRAMS["hoehr-grenzhausen-energie"];
    const ortsgemeinde = FUNDING_PROGRAMS["hillscheid-energie"];
    expect(stadt.url).not.toBe(ortsgemeinde.url);
    expect(stadt.url).toContain("stadt-hoehr-grenzhausen");
    expect(ortsgemeinde.url).toContain("ortsgemeinde-hillscheid");
  });
});
