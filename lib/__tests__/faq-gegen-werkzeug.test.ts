import { describe, it, expect } from "vitest";
import { pvSpeicherFaq, homeFaq } from "../faq";
import { recommend } from "../recommend";

/**
 * Wo Text und Rechnung auseinandergehen, weicht der Text.
 *
 * Entscheidung des Betreibers am 25.08.2026, im Wortlaut: „das werkzeug muss
 * immer führend sein". Anlass war ein Widerspruch, den die Inhalts-Inventur
 * gefunden hat und den ein Leser mit zwei Klicks selbst erlebt: Die FAQ nannte
 * „für ein Einfamilienhaus sind 5–10 kWh typisch" und verlinkte dann auf die
 * Empfehlung — die demselben Haushalt gar keinen Speicher gibt.
 *
 * Der Grund ist keine Panne, sondern Absicht im Rechenkern: Die Empfehlung
 * koppelt die Speichergröße an den Jahresverbrauch. Ohne Wärmepumpe und ohne
 * E-Auto erreicht ein Haushalt die erste Stufe erst ab vier Personen. Die
 * Faustregel stammte aus der allgemeinen Literatur und ist nie gegen den
 * eigenen Rechner gehalten worden.
 *
 * Dieser Test prüft nicht Formulierungen, sondern die Aussage: Eine FAQ-Antwort
 * über die Speichergröße darf keine Größe als typisch nennen, die das Werkzeug
 * für denselben Fall nicht empfiehlt. Ein Wortlaut-Test wäre hier wertlos — das
 * Projekt hat genau damit schon einmal eine Falschaussage durchgelassen, weil
 * vier eingeschobene Wörter das Muster verfehlten.
 */

/** Was die Empfehlung einem Haushalt ohne Großverbraucher wirklich gibt. */
function empfehlungOhneGrossverbraucher(personen: number): number {
  return recommend({
    personen,
    nutzung: 1,
    wp: "nein",
    ea: "nein",
    eaKm: 15000,
    haustyp: 0,
    dachart: 0,
    budgetLimit: null,
  }).speicherKwh;
}

describe("FAQ gegen Werkzeug — das Werkzeug führt", () => {
  it("nennt keine Speichergröße als typisch, die die Empfehlung nicht gibt", () => {
    // Nur Antworten auf die FRAGE nach der Größe. Preisangaben ("ein
    // 10-kWh-Speicher kostet rund 4.000 €") müssen eine Größe nennen, sonst
    // können sie keinen Preis nennen — sie sind kein Widerspruch zum Werkzeug.
    // Die erste Fassung dieses Tests fing sie mit und meldete einen Befund, den
    // es nicht gab; die Grenze steht hier, damit sie später nicht aus Versehen
    // wieder aufgeweicht wird.
    const antworten = [...pvSpeicherFaq(), ...homeFaq()]
      .filter((e) => /wie groß|welche größe|größe.*speicher|speicher.*größe/i.test(e.q))
      .map((e) => e.a);

    // Alle kWh-Angaben aus den Speicher-Antworten einsammeln.
    const genannt = new Set<number>();
    for (const a of antworten) {
      for (const m of a.matchAll(/(\d+(?:[.,]\d+)?)\s*(?:–|-|bis)?\s*(\d+(?:[.,]\d+)?)?\s*kWh/g)) {
        for (const roh of [m[1], m[2]]) {
          if (roh) genannt.add(Number(roh.replace(",", ".")));
        }
      }
    }

    // Was das Werkzeug über die Haushaltsgrößen hinweg überhaupt vergibt.
    const moeglich = new Set([0, 1, 2, 3].map(empfehlungOhneGrossverbraucher));

    const widerspruch = [...genannt].filter((kwh) => kwh > 0 && !moeglich.has(kwh));

    expect(
      widerspruch,
      `Die FAQ nennt ${widerspruch.join(", ")} kWh als typisch. Die Empfehlung vergibt für ` +
        `einen Haushalt ohne Wärmepumpe und ohne E-Auto aber nur ${[...moeglich].sort((a, b) => a - b).join(", ")} kWh.\n` +
        `Ein Leser, der dem Link folgt, bekommt etwas anderes zu sehen, als der Text ihm ` +
        `angekündigt hat.\n\n` +
        `Wo Text und Rechnung auseinandergehen, weicht der Text — nicht die Rechnung ` +
        `(Betreiber-Entscheidung 25.08.2026). Entweder den Text an die Empfehlung anpassen ` +
        `oder, wenn die Empfehlung wirklich falsch liegt, sie ändern und diesen Test ` +
        `mit Begründung nachziehen.`,
    ).toEqual([]);
  });

  it("empfiehlt einem kleinen Haushalt ohne Großverbraucher wirklich keinen Speicher", () => {
    // Der Anker unter dem Test darüber: Ändert sich die Kopplung im Rechenkern,
    // ist die Grundlage dieser Regel weg und muss neu betrachtet werden — dann
    // soll hier etwas rot werden und nicht still weitergelten.
    expect(empfehlungOhneGrossverbraucher(0)).toBe(0);
    expect(empfehlungOhneGrossverbraucher(1)).toBe(0);
    expect(empfehlungOhneGrossverbraucher(2)).toBe(0);
    // Ab vier Personen springt sie an.
    expect(empfehlungOhneGrossverbraucher(3)).toBeGreaterThan(0);
  });
});
