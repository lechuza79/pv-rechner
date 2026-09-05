import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import { resolve } from "path";
import {
  AKTUELLE_EINWILLIGUNG,
  EINWILLIGUNGS_FASSUNGEN,
  einwilligungsFassung,
} from "../abo-einwilligung";

// Der Nachweis der Einwilligung umfasst den WORTLAUT, nicht nur den Zeitpunkt.
//
// Zwei Fundstellen, am 01.09.2026 im Volltext gelesen (Council, Legal-Judge):
// EDSA-Leitlinien 05/2020 Rn. 108 — festzuhalten ist, „welche Informationen der
// betroffenen Person mitgeteilt wurden", und ausdrücklich: „Es wäre nicht
// ausreichend, nur auf eine korrekte Konfiguration der Website hinzuweisen."
// DSK, Orientierungshilfe Direktwerbung (2/2022), Ziff. 2.1 S. 9: „revisionsfeste
// Dokumentation der tatsächlich genutzten Texte mit Versionsnummer."
//
// Genau das war die Lücke: Der Einwilligungstext stand als Konstante im Code
// der Oberfläche und ändert sich mit dem nächsten Commit. Die gespeicherte
// Version zeigte dann auf einen Wortlaut, den niemand mehr rekonstruieren kann
// — ein Nachweis, der schlechter ist als keiner, weil er Genauigkeit behauptet.

const lies = (p: string) => readFileSync(resolve(process.cwd(), p), "utf8");

describe("Das Archiv der Einwilligungstexte", () => {
  it("hat eindeutige, datierte Fassungen", () => {
    const versionen = EINWILLIGUNGS_FASSUNGEN.map((f) => f.version);
    expect(new Set(versionen).size).toBe(versionen.length);
    for (const f of EINWILLIGUNGS_FASSUNGEN) {
      expect(f.seit).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(f.gemeinde.length).toBeGreaterThan(40);
      expect(f.foerderung.length).toBeGreaterThan(40);
      expect(f.zusage.length).toBeGreaterThan(20);
    }
  });

  it("lässt sich zu einer gespeicherten Version nachschlagen", () => {
    expect(einwilligungsFassung(AKTUELLE_EINWILLIGUNG.version)).toEqual(AKTUELLE_EINWILLIGUNG);
    // Eine unbekannte Kennung darf NICHT auf irgendetwas zeigen — lieber keine
    // Auskunft als eine falsche.
    expect(einwilligungsFassung("gibt-es-nicht")).toBeNull();
    expect(einwilligungsFassung(null)).toBeNull();
  });

  it("wird nie überschrieben, sondern ergänzt", () => {
    // Die Fassungen stehen in der Reihenfolge ihres Gültigwerdens; die letzte
    // ist die aktuelle. Wer eine ältere ändert, macht aus einem Nachweis eine
    // Behauptung.
    const daten = EINWILLIGUNGS_FASSUNGEN.map((f) => f.seit);
    expect([...daten].sort()).toEqual(daten);
    expect(AKTUELLE_EINWILLIGUNG).toBe(EINWILLIGUNGS_FASSUNGEN[EINWILLIGUNGS_FASSUNGEN.length - 1]);

    // BEI EINER EINZIGEN FASSUNG sagt die Sortierung oben nichts — jede Liste
    // mit einem Element ist sortiert. In der Gegenprobe ließ sich das Datum auf
    // 2099 setzen, ohne dass der Test anschlug. Geprüft wird deshalb zusätzlich
    // die Eigenschaft, die auch bei einer Fassung gilt: Sie ist die jüngste,
    // und keine Fassung liegt in der Zukunft — ein Text, der erst morgen gilt,
    // kann heute niemandem vorgelegen haben.
    const heute = new Date().toISOString().slice(0, 10);
    for (const f of EINWILLIGUNGS_FASSUNGEN) {
      // Als Wahrheitswert, nicht als Zahlenvergleich: `toBeLessThanOrEqual`
      // nimmt keine Zeichenketten, und der Test war dadurch DAUERHAFT rot —
      // die Gegenprobe darüber maß eine Weile lang nur diesen Fehler.
      expect(f.seit <= heute, `Fassung ${f.version} gilt angeblich ab ${f.seit} — in der Zukunft`).toBe(true);
    }
    expect(AKTUELLE_EINWILLIGUNG.seit).toBe(daten[daten.length - 1]);
  });
});

describe("Die Oberfläche liefert genau diesen Wortlaut aus", () => {
  const box = lies("components/atlas/GemeindeAboBox.tsx");

  it("tippt die Erklärung nicht ein zweites Mal", () => {
    // DER KERN DES WÄCHTERS. Stünde der Text an beiden Stellen, liefe er
    // auseinander, sobald jemand nur eine ändert — und die gespeicherte Version
    // zeigte auf einen Wortlaut, den nie jemand gesehen hat. Die Oberfläche
    // muss ihn deshalb AUS dem Archiv nehmen.
    expect(box).toMatch(/intro:\s*AKTUELLE_EINWILLIGUNG\.gemeinde/);
    expect(box).toMatch(/intro:\s*AKTUELLE_EINWILLIGUNG\.foerderung/);
  });

  it("zeigt die Zusage, die im Archiv steht", () => {
    // Die Zusage über dem Absenden-Knopf steht als Fließtext im JSX (sie trägt
    // einen Link) und lässt sich deshalb nicht aus dem Archiv einsetzen.
    // Geprüft wird stattdessen, dass beide Fassungen dasselbe sagen — auf die
    // Wörter, die die Zusage tragen, nicht auf Formatierung.
    const jsx = box.replace(/\s+/g, " ");
    for (const teil of [
      "Kein Spam, jederzeit abmeldbar",
      "Adresse nicht weiter",
      "ob du die Mail öffnest",
      "Datenschutzerklärung",
    ]) {
      expect(jsx, `„${teil}" fehlt im Anmeldefenster`).toContain(teil);
      expect(
        AKTUELLE_EINWILLIGUNG.zusage,
        `„${teil}" fehlt in der archivierten Fassung`,
      ).toContain(teil);
    }
  });

  it("schickt die Version mit der Anmeldung mit", () => {
    expect(box).toMatch(/einwilligung:\s*AKTUELLE_EINWILLIGUNG\.version/);
  });
});

describe("Der Nachweis kommt am Abo an", () => {
  const route = lies("app/api/abo/anmelden/route.ts");
  const schicht = lies("lib/gemeinde-abo.ts");
  const setup = lies("app/api/abo/setup/route.ts");
  const versand = lies("lib/abo-versand.ts");

  it("übernimmt keine unbekannte Fassung ungeprüft", () => {
    // Eine Kennung aus dem Browser, die das Archiv nicht kennt, zeigte auf
    // einen Wortlaut, den es nie gab. Geprüft wird deshalb gegen das Archiv.
    expect(route).toMatch(/einwilligungsFassung\(gemeldet\)/);
  });

  it("legt beide Nachweis-Spalten an", () => {
    expect(setup).toMatch(/ADD COLUMN IF NOT EXISTS einwilligung_version text/);
    expect(setup).toMatch(/ADD COLUMN IF NOT EXISTS versand_beleg text/);
  });

  it("schreibt die Fassung an jedes neue und jedes aufgeweckte Abo", () => {
    // Zwei Schreibwege: anlegen und aufwecken. Wer nur einen bedient, hat für
    // die wiederholte Anmeldung keinen Nachweis — und das ist der Fall, in dem
    // sich jemand später nicht erinnert.
    const stellen = [...schicht.matchAll(/einwilligung_version:\s*o\.einwilligungVersion/g)];
    expect(stellen.length).toBeGreaterThanOrEqual(2);
  });

  it("hält fest, DASS eine Bestätigungsmail hinausging", () => {
    // BGH I ZR 164/09 Rn. 38 verlangt die Erklärung speicher- und ausdruckbar;
    // am Fehlen genau dieses Belegs ist ein Versender vor dem VG Düsseldorf
    // gescheitert (29 K 9714/24 Rn. 46).
    expect(versand).toMatch(/messageId/);
    // AUF DEN AUFRUF, nicht auf das Vorkommen des Namens: In der Gegenprobe
    // wurde der Aufruf entfernt und der Import blieb stehen — der Test blieb
    // grün. Dieselbe Fehlerklasse wie eine Konstante, die sich selbst belegt.
    expect(route).toMatch(/await versandBelegSetzen\(/);
  });

  it("legt KEINE Kopie der Mail an", () => {
    // Der Inhalt lässt sich aus der Fassung neu erzeugen. Eine zweite Kopie
    // jeder Mail wäre mehr Daten für denselben Nachweis und liefe der
    // Datenminimierung zuwider (EDSA 05/2020 Rn. 106).
    expect(schicht).not.toMatch(/mail_html|mail_text|mail_kopie/i);
    expect(setup).not.toMatch(/mail_html|mail_text|mail_kopie/i);
  });
});
