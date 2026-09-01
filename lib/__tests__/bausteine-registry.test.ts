import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { BAUSTEINE, GRUPPEN, NOCH_NICHT_EINGEORDNET, verwendetVon } from "../bausteine-registry";

/**
 * Wächter für das Bausteine-Register.
 *
 * Das Register selbst ist eine Behauptung. Dieser Test prüft sie gegen den
 * Code — sonst wäre die Übersichtsseite eine Vitrine, und genau daran ist die
 * Schriftgrößen-Migration im Juli 2026 gescheitert: Die Tokens standen da, die
 * Seite zeigte sie, und der Bestand handgetippter Größen wuchs trotzdem um
 * 35 %, weil nichts sie erzwang.
 *
 * Vier Prüfungen, jede gegen einen anderen Weg, auf dem das Register still
 * falsch wird:
 *   1. Ein Eintrag zeigt auf eine Datei, die es nicht (mehr) gibt.
 *   2. „Besteht aus“ stimmt nicht mit den echten Importen überein.
 *   3. Ein verbindlicher Baustein wird irgendwo von Hand nachgebaut.
 *   4. Ein neuer geteilter Baustein taucht auf und niemand ordnet ihn ein.
 */

const ROOT = join(__dirname, "..", "..");

function lies(rel: string): string {
  return readFileSync(join(ROOT, rel), "utf8");
}

/** Alle Quelldateien unter app/ und components/, ohne Tests. */
function alleQuellen(): string[] {
  const out: string[] = [];
  const lauf = (p: string) => {
    for (const eintrag of readdirSync(p)) {
      if (eintrag === "node_modules" || eintrag === "__tests__") continue;
      const voll = join(p, eintrag);
      if (statSync(voll).isDirectory()) lauf(voll);
      else if (/\.tsx?$/.test(eintrag) && !eintrag.includes(".test.")) out.push(voll);
    }
  };
  lauf(join(ROOT, "app"));
  lauf(join(ROOT, "components"));
  return out;
}

describe("Bausteine-Register", () => {
  it("nennt für jeden Eintrag eine Datei, die es gibt, und einen Zweck in Klartext", () => {
    expect(BAUSTEINE.length).toBeGreaterThan(20);
    const namen = new Set<string>();
    for (const b of BAUSTEINE) {
      expect(() => statSync(join(ROOT, b.datei)), b.datei).not.toThrow();
      // Ein Zweck wie „Der Header“ erklärt nichts. Ein Satz oder gar keiner.
      expect(b.zweck.length, b.name).toBeGreaterThan(30);
      expect(b.datei.endsWith(`/${b.name}.tsx`), `${b.name} passt nicht zu ${b.datei}`).toBe(true);
      expect(namen.has(b.name), `${b.name} steht doppelt im Register`).toBe(false);
      namen.add(b.name);
      expect(GRUPPEN.some((g) => g.schluessel === b.gruppe), b.name).toBe(true);
      // Eine Gegenprobe ist eine Zusage. Sie gehört nur an einen Baustein, den
      // wir als einzige Lösung führen — sonst sperrt sie etwas, das gar nicht
      // entschieden ist.
      if (b.gegenprobe) expect(b.stand, `${b.name}: Gegenprobe ohne Verbindlichkeit`).toBe("verbindlich");
    }
  });

  it("hält „besteht aus“ gegen die echten Importe — in beide Richtungen", () => {
    const namen = new Set(BAUSTEINE.map((b) => b.name));
    const fehler: string[] = [];

    for (const b of BAUSTEINE) {
      const quelle = lies(b.datei);
      const wirklich = new Set<string>();
      for (const anderer of namen) {
        if (anderer === b.name) continue;
        // Relativer Import innerhalb desselben Ordners — so importieren sich
        // die geteilten Bausteine untereinander.
        if (new RegExp(`from ["']\\./${anderer}["']`).test(quelle)) wirklich.add(anderer);
      }
      for (const d of b.bestehtAus) {
        if (!namen.has(d)) fehler.push(`${b.name}: „${d}“ steht nicht im Register`);
        else if (!wirklich.has(d)) fehler.push(`${b.name}: benutzt ${d} laut Register, aber nicht im Code`);
      }
      for (const d of wirklich) {
        if (!b.bestehtAus.includes(d)) fehler.push(`${b.name}: benutzt ${d} im Code, aber nicht laut Register`);
      }
    }

    // Beim Treffer: das Register nachziehen, nicht die Prüfung lockern. Die
    // Liste beantwortet die Frage „was geht kaputt, wenn ich das ändere“ — und
    // die ist nur so viel wert, wie sie stimmt.
    expect(fehler).toEqual([]);
  });

  it("findet keinen handgebauten Nachbau eines verbindlichen Bausteins", () => {
    const quellen = alleQuellen();
    expect(quellen.length).toBeGreaterThan(200);
    const funde: string[] = [];

    for (const b of BAUSTEINE) {
      if (!b.gegenprobe) continue;
      const { muster, bedeutet, ausser } = b.gegenprobe;
      expect(bedeutet.length, `${b.name}: Gegenprobe ohne Begründung`).toBeGreaterThan(40);
      const erlaubt = new Set([b.datei, ...ausser.map((a) => a.datei)]);
      for (const a of ausser) {
        expect(a.grund.length, `${b.name} → ${a.datei}`).toBeGreaterThan(20);
        expect(() => statSync(join(ROOT, a.datei)), a.datei).not.toThrow();
      }
      const re = new RegExp(muster);
      for (const datei of quellen) {
        const rel = datei.slice(ROOT.length + 1);
        if (erlaubt.has(rel)) continue;
        readFileSync(datei, "utf8")
          .split("\n")
          .forEach((zeile, i) => {
            if (re.test(zeile)) funde.push(`${rel}:${i + 1} — ${b.name}: ${bedeutet}`);
          });
      }
    }

    // Beim Treffer: den Baustein benutzen. Geht es wirklich nicht, kommt die
    // Datei mit ausgeschriebenem Grund in die Ausnahmeliste des Bausteins —
    // das Muster aufzuweichen ist nie die Lösung.
    expect(funde).toEqual([]);
  });

  it("hält die Liste des Offenen gegen den Ordner — in beide Richtungen", () => {
    // Nur die oberste Ebene: Was in components/atlas, /social, /charts … liegt,
    // ist fachlich und gehört zur dritten Ebene (Zusammensetzungen), nicht ins
    // Baustein-Inventar. Die Grenze ist der Ordner, nicht ein Urteil.
    const imOrdner = readdirSync(join(ROOT, "components"))
      .filter((n) => n.endsWith(".tsx") && !n.includes(".test."))
      .map((n) => n.replace(".tsx", ""))
      .sort();
    const eingeordnet = new Set(BAUSTEINE.map((b) => b.name));
    const wirklichOffen = imOrdner.filter((n) => !eingeordnet.has(n));

    // Beide Richtungen: Ein neues Bauteil, das in keiner der Listen steht, wird
    // rot — sonst kommt es still dazu. Und ein eingeordnetes, das hier stehen
    // bleibt, ebenso — sonst behauptet die Seite Arbeit, die längst getan ist.
    // Das Register DARF unvollständig sein (sukzessive, Betreiber 01.09.2026);
    // es darf nur nicht unehrlich sein.
    expect(NOCH_NICHT_EINGEORDNET).toEqual(wirklichOffen);
    // Kein Name kann in beiden Listen stehen.
    expect(NOCH_NICHT_EINGEORDNET.filter((n) => eingeordnet.has(n))).toEqual([]);
  });

  it("zeigt jeden Baustein auf der Designsystem-Seite und nennt fehlende Beispiele", () => {
    // Die Seite rendert die Gruppen aus dem Register, jeder Baustein bekommt
    // also von selbst eine Karte. Was NICHT von selbst kommt, ist das lebende
    // Beispiel — und ohne Beispiel ist die Karte wieder das, wogegen der ganze
    // Umbau geht: eine Beschreibung statt der Sache.
    const schau = readFileSync(
      join(ROOT, "app/(site)/admin/komponenten/KomponentenSchau.tsx"),
      "utf8",
    );
    const ohneBeispiel = BAUSTEINE.filter((b) => !new RegExp(`\\b${b.name}:`).test(schau)).map(
      (b) => b.name,
    );

    // Die Zahl darf sinken, nicht steigen. Ein neuer Baustein ohne Beispiel ist
    // in Ordnung — er muss nur sichtbar bleiben, statt in der Liste unterzugehen.
    const OHNE_BEISPIEL_HOECHSTENS = 21;
    expect(
      ohneBeispiel.length,
      `Ohne lebendes Beispiel (${ohneBeispiel.length}): ${ohneBeispiel.join(", ")}`,
    ).toBeLessThanOrEqual(OHNE_BEISPIEL_HOECHSTENS);
  });

  it("beantwortet die Gegenrichtung: wer benutzt diesen Baustein", () => {
    expect(verwendetVon("Modal").map((b) => b.name).sort()).toEqual(["CiteModal", "FlowNav", "TrustBar"]);
    expect(verwendetVon("Switch").map((b) => b.name)).toEqual(["ResultSection"]);
  });
});
