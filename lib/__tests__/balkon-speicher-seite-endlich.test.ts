import { describe, it, expect } from "vitest";
import { calcBalkon } from "../balkon";
import { DEFAULT_BALKON_CONFIG as CFG } from "../balkon-config";
import { PERSONEN } from "../constants";

/**
 * Die Speicher-Ratgeberseite darf keine Zahl in den FLIESSTEXT setzen, die es
 * nicht gibt.
 *
 * Gefunden beim Audit am 24.08.2026: Die Seite formatiert Amortisationszeiten mit
 * einer Funktion, die bei einem Speicher, der sich nie rechnet, nichts liefert.
 * In den Tabellen ist das sauber gelöst — dort steht dann „nie", und das ist
 * sogar die Aussage (beim Ein-Modul-Set trifft es wirklich zu, live nachgesehen).
 * In den ausgeschriebenen Sätzen dagegen stünde „Speicher nach  Jahren drin",
 * also ein Satz mit einem Loch an genau der Stelle, an der die Aussage steht.
 *
 * Die Sätze deswegen umzubauen wäre der falsche Weg: Bei den Konfigurationen, die
 * sie beschreiben, tritt der Fall nicht ein, und ein Ratgeber, der überall
 * „gegebenenfalls nie" einschiebt, liest sich schlechter für einen Fall, den es
 * dort nicht gibt. Stattdessen schlägt dieser Test an, BEVOR es so weit kommt —
 * wenn jemand Speicherpreise, Sets oder den Referenzhaushalt so ändert, dass eine
 * der ausgeschriebenen Größen ins Unendliche läuft.
 *
 * Wer ihn rot sieht, hat zwei Möglichkeiten: die Konfiguration zurücknehmen oder
 * den betroffenen Satz so umschreiben, dass er ohne Zahl auskommt.
 */

// Derselbe Referenzfall wie auf der Seite: Zwei-Personen-Haushalt, Standard-Set,
// senkrecht am Südgeländer, Homeoffice-Tage.
const REF = {
  personenIndex: 1,
  setId: "duo" as const,
  orientationId: "sued_gelaender" as const,
  presenceId: "teils" as const,
};

const basis = {
  orientationId: REF.orientationId,
  presenceId: REF.presenceId,
  haushaltKwh: PERSONEN[REF.personenIndex].verbrauch,
  specificYield: CFG.specificYield,
  monthlyYield: null,
  stromPrice: CFG.stromPrice,
};

const rechne = (setId: "single" | "duo" | "max", storageId: "none" | "small" | "large") =>
  calcBalkon({ ...basis, setId, storageId });

describe("Speicher-Ratgeber: keine Löcher im Fließtext", () => {
  it("nennt für die Referenz-Anlage ohne Speicher eine echte Amortisationszeit", () => {
    // Steht als Karte UND im Fließtext („… nach X Jahren wieder drin").
    expect(Number.isFinite(rechne(REF.setId, "none").amortYears)).toBe(true);
  });

  it("nennt für den kleinen Speicher am Standard-Set eine echte Zahl", () => {
    // Steht an zwei Stellen ausgeschrieben — Karte und Absatz darüber.
    expect(Number.isFinite(rechne(REF.setId, "small").storagePayback)).toBe(true);
  });

  it("nennt für das größte Set mit großem Speicher eine echte Zahl", () => {
    // Kern des Abschnitts „Ob der größere Speicher lohnt": Am Standard-Set ist
    // der große Akku das schlechteste Geschäft, mit vier Modulen das beste. Diese
    // Umkehrung steht mit ausgeschriebener Zahl da.
    expect(Number.isFinite(rechne("max", "large").storagePayback)).toBe(true);
  });

  it("lässt die Tabellen ausdrücklich ein Nie zeigen", () => {
    // Die Gegenrichtung, damit niemand den Test als „überall muss eine Zahl
    // stehen" missversteht: Beim Ein-Modul-Set rechnet sich der Speicher wirklich
    // nie, die Tabelle schreibt das hin, und das ist richtig so. Ein Test, der
    // hier eine Zahl erzwänge, würde die ehrlichste Aussage der Seite verbieten.
    expect(Number.isFinite(rechne("single", "small").storagePayback)).toBe(false);
  });

  it("füllt die Haushalts-Matrix mehrheitlich mit echten Zahlen", () => {
    // Die Matrix Haushaltsgröße × Anwesenheit fängt unendliche Werte in ihren
    // Zellen ab — aber eine Tabelle, in der die Hälfte der Felder „nie" sagt,
    // belegt die Aussage der Seite nicht mehr.
    const zellen = PERSONEN.flatMap((_, i) =>
      CFG.presence.map(p =>
        calcBalkon({
          ...basis, haushaltKwh: PERSONEN[i].verbrauch, presenceId: p.id,
          setId: REF.setId, storageId: "small",
        }).storagePayback,
      ),
    );
    const endlich = zellen.filter(Number.isFinite).length;
    expect(endlich).toBeGreaterThanOrEqual(Math.ceil(zellen.length / 2));
  });
});
