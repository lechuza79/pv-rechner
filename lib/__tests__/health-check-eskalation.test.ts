import { describe, it, expect } from "vitest";
import { ESKALATION_AB_LAEUFEN, eskalationNoetig } from "../../scripts/health-check";

// Ein roter Lauf ist eine Aufgabe für die Autofix-Action, keine Nachricht an den
// Betreiber. Erst wenn die Automatik mehrere Läufe hintereinander an derselben
// Stelle nicht weiterkommt, wird daraus eine Frage an ihn. Diese Tests nageln
// beide Enden fest — sowohl das Schweigen als auch das Eskalieren.

describe("Eskalation an den Betreiber", () => {
  it("schweigt beim ersten roten Lauf", () => {
    expect(eskalationNoetig(["success", "success", "success"])).toBe(false);
  });

  it("schweigt auch beim zweiten", () => {
    // Vorlauf rot, aktueller Lauf rot = 2 in Folge, Schwelle ist 3.
    expect(eskalationNoetig(["failure", "success", "success"])).toBe(false);
  });

  it("meldet sich, wenn es beim dritten Mal immer noch klemmt", () => {
    expect(eskalationNoetig(["failure", "failure", "success"])).toBe(true);
  });

  it("schweigt ohne Lauf-Historie — im Zweifel keine Mail", () => {
    // Lokaler Lauf ohne GitHub-Token: die Historie ist leer. Daraus darf nie
    // eine Eskalation werden, sonst mailt jeder Testlauf.
    expect(eskalationNoetig([])).toBe(false);
  });

  it("bricht die Kette, sobald ein Lauf dazwischen grün war", () => {
    expect(eskalationNoetig(["success", "failure", "failure"])).toBe(false);
  });

  it("hält die Schwelle bei drei — Absenken macht die Mail wieder zum Rauschen", () => {
    expect(ESKALATION_AB_LAEUFEN).toBe(3);
  });
});
