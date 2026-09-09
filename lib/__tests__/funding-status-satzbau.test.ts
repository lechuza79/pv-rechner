import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { FUNDING_STATUS_NOTE, type FundingStatus } from "../funding-programs";

/**
 * Die Status-Phrasen stehen in ZWEI grammatischen Formen nebeneinander, und wer
 * das übersieht, baut einen Satz, der bei genau einem Status kaputtgeht.
 *
 * GEMESSEN AM 09.09.2026: Die Balkon-Förderübersicht schrieb „Programm ist
 * {phrase}". Das passt auf vier der fünf Werte und ergibt beim fünften
 * „Programm ist nimmt aktuell Anträge an". Sichtbar wird das nur bei einem
 * aktiven, aber gerade unbestätigten Programm — also ausgerechnet bei jedem
 * frisch aufgenommenen, und live war der Satz deshalb noch nie zu sehen.
 * Grammatik ist Teil der Richtigkeit; ein Satz, der sich selbst widerspricht,
 * beschädigt dasselbe Vertrauen wie eine falsche Zahl.
 *
 * Ein zweites Register mit satzfähigen Fassungen wäre die naheliegende Lösung
 * und die falsche: zwei Listen für dieselbe Sache laufen auseinander. Der Test
 * hält stattdessen fest, WORAUF die Phrasen gebaut sind.
 */
describe("Status-Phrasen und ihr Satzbau", () => {
  const alle = Object.entries(FUNDING_STATUS_NOTE) as [FundingStatus, string][];

  it("mindestens eine Phrase ist ein Prädikat und verträgt kein „ist“ davor", () => {
    // „nimmt aktuell Anträge an" — genau der Wert, an dem der Satz zerbrach.
    // Solange es ihn gibt, darf keine Oberfläche eine Kopula davorsetzen.
    const praedikate = alle.filter(([, p]) => /^(nimmt|wird|läuft|hat)\b/.test(p));
    expect(praedikate.length, "kein Prädikat mehr im Register — dann prüfe, ob dieser Test noch stimmt").toBeGreaterThan(0);
  });

  it("keine Oberfläche setzt eine Kopula vor die Phrase", () => {
    // Geprüft wird die VERWENDUNG im Quelltext, nicht das Register: Der Fehler
    // entsteht am Verwendungsort, und dort ist er von außen unsichtbar.
    const seiten = [
      "app/(site)/balkonkraftwerk/foerderung/page.tsx",
      "app/(site)/photovoltaik-foerderung/[bundesland]/[stadt]/page.tsx",
    ];
    for (const s of seiten) {
      const quelle = readFileSync(resolve(process.cwd(), s), "utf8");
      for (const zeile of quelle.split("\n")) {
        if (!zeile.includes("FUNDING_STATUS_NOTE[")) continue;
        // Eine Kopula unmittelbar vor der Einsetzung ist nur erlaubt, wo der
        // Aufrufer den aktiven Status ausdrücklich ausschließt — die Stadtseite
        // tut das („f.status !== 'aktiv'"), und dort ist der Satz richtig.
        const kopula = /\bist\s*\{FUNDING_STATUS_NOTE\[/.test(zeile);
        if (!kopula) continue;
        expect(
          quelle.includes('status !== "aktiv"'),
          `${s}: „ist {FUNDING_STATUS_NOTE[…]}" ohne Ausschluss des aktiven Status — ergibt „ist nimmt aktuell Anträge an"`,
        ).toBe(true);
      }
    }
  });
});
