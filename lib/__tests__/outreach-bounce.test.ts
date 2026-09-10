import { describe, expect, it } from "vitest";
import {
  bounceArt,
  ersatzAdresseTaugt,
  toteAdressen,
  MAX_DAUERHAFTE_BOUNCER,
  STATUS_BOUNCE_BEHOBEN,
  dauerhafteBouncer,
} from "../outreach-bounce";

/**
 * DIE EINE UNTERSCHEIDUNG, AN DER DER GANZE AUTOFIX HÄNGT.
 *
 * Der Betreiber will, dass eine unzustellbare Mail automatisch eine neue Adresse
 * bekommt. Ohne diese Trennung ersetzt der Lauf eine RICHTIGE Adresse, weil das
 * Postfach gerade voll war — und niemand bemerkt es je, weil hinterher eine
 * Adresse dasteht und der Lauf grün meldet.
 *
 * Die Meldungen unten sind echte Zustellmeldungen aus unserem Postfach
 * (26.08. und 02.09.2026), gekürzt auf die tragende Zeile.
 */
describe("Dauerhaft oder nur gerade jetzt nicht?", () => {
  it("ein volles Postfach ist vorübergehend — auch mit 5er-Code", () => {
    // Selzen, 26.08.2026. Der Server meldet „permission denied" mit einer
    // 5.7.0 und nennt im selben Satz den echten Grund. Wer zuerst den Code
    // liest, ersetzt hier eine Adresse, die stimmt.
    const selzen = "<info@selzen.de>: permission denied. Command output: Quota exceeded (mailbox for user is full)\nStatus: 5.7.0";
    expect(bounceArt(selzen)).toBe("voruebergehend");
  });

  it("eine unbekannte Adresse ist dauerhaft", () => {
    // Dennheritz, 02.09.2026.
    const dennheritz = "<redaktion@gemeinde-dennheritz.de>: host smtpin.rzone.de said: 550 5.1.2 No such mailbox";
    expect(bounceArt(dennheritz)).toBe("dauerhaft");
  });

  it("eine unbekannte Kennung am eigenen Server ebenso", () => {
    // Schashagen, 02.09.2026.
    expect(bounceArt("<info@schashagen.de>: host mail.schashagen.de said: 550 sorry, user unknown")).toBe("dauerhaft");
  });

  it("eine abgewiesene Weiterleitung ist dauerhaft", () => {
    // Lassan, 02.09.2026 — die Adresse nahm an, ihr Ziel gibt es nicht mehr.
    const lassan = "<anne.terwitte@wolgast.eu>: Recipient address rejected: User unknown in virtual alias table";
    expect(bounceArt(lassan)).toBe("dauerhaft");
  });

  it("ein 4er-Code allein heißt vorübergehend", () => {
    expect(bounceArt("Status: 4.2.2\nThe recipient's mailbox is over its limit.")).toBe("voruebergehend");
    expect(bounceArt("451 4.7.1 Greylisted, try again later")).toBe("voruebergehend");
  });

  it("was nichts Eindeutiges sagt, bleibt unklar — und wird nicht ersetzt", () => {
    // Die vorsichtige Richtung: Eine falsch als dauerhaft eingestufte Meldung
    // kostet eine gute Adresse, eine falsch als vorübergehend nur Zeit.
    expect(bounceArt("Delivery Status Notification")).toBe("unklar");
    expect(bounceArt("")).toBe("unklar");
  });

  it("eine Hausnummer im zitierten Brief ist kein Statuscode", () => {
    // Ohne diese Schärfe machte jede „Musterstraße 550" aus einer Rückmeldung
    // eine dauerhafte Unzustellbarkeit.
    expect(bounceArt("Ihr Schreiben, Rathausplatz 550, 12345 Musterstadt")).toBe("unklar");
  });
});

describe("Taugt die neu gefundene Adresse?", () => {
  const rolle = (a: string) => /^(info|kontakt|rathaus|gemeinde|verwaltung|post)@/.test(a);

  it("dieselbe Adresse ersetzt nichts", () => {
    // Schashagens Impressum nennt die tote Adresse weiterhin. Ohne diese
    // Bedingung ersetzte der Lauf sie durch sich selbst und meldete Erfolg.
    const b = ersatzAdresseTaugt("info@schashagen.de", ["info@schashagen.de"], rolle);
    expect(b.ok).toBe(false);
    if (!b.ok) expect(b.grund).toContain("geprellt");
  });

  it("eine Person ist kein Ersatz", () => {
    const b = ersatzAdresseTaugt("anne.terwitte@wolgast.eu", ["info@lassan.de"], rolle);
    expect(b.ok).toBe(false);
    if (!b.ok) expect(b.grund).toContain("Funktionspostfach");
  });

  it("ein Funktionspostfach auf anderer Domain geht durch", () => {
    // Lassan: eigenes Postfach auf .eu statt .de — vom Impressum belegt.
    expect(ersatzAdresseTaugt("info@lassan.eu", ["info@lassan.de"], rolle).ok).toBe(true);
    // Schashagen: das verwaltende Amt.
    expect(ersatzAdresseTaugt("info@amt-ostholstein-mitte.landsh.de", ["info@schashagen.de"], rolle).ok).toBe(true);
  });

  it("was keine Adresse ist, wird nicht eingetragen", () => {
    expect(ersatzAdresseTaugt("Rathaus, Hauptstraße 1", ["info@x.de"], rolle).ok).toBe(false);
  });

  it("eine Adresse, die schon einmal geprellt hat, kommt nie zurück", () => {
    // DER FALL IST GEMESSEN (10.09.2026, erster Probelauf): Die toten Adressen
    // stehen weiterhin im Impressum. Nach der Handkorrektur hätte der Lauf
    // genau sie wieder eingetragen — und dabei Erfolg gemeldet. Geprüft wird
    // deshalb gegen die ganze Geschichte, nicht gegen die aktuelle Adresse.
    const geschichte = ["info@schashagen.de", "redaktion@gemeinde-dennheritz.de"];
    expect(ersatzAdresseTaugt("info@schashagen.de", geschichte, rolle).ok).toBe(false);
    expect(ersatzAdresseTaugt("info@amt-ostholstein-mitte.landsh.de", geschichte, rolle).ok).toBe(true);
  });

  it("liest die Geschichte aus der Notiz", () => {
    const notiz = [
      '[2026-09-02] unzustellbar aus Postfach: „Undelivered Mail Returned to Sender"',
      "    <info@schashagen.de>: host mail.schashagen.de said: 550 sorry, user unknown",
      "    Final-Recipient: rfc822; info@schashagen.de",
      "[2026-09-10] Postfach neu recherchiert: info@schashagen.de → info@amt-ostholstein-mitte.landsh.de",
    ].join("\n");
    const tote = toteAdressen(notiz);
    expect(tote).toContain("info@schashagen.de");
    // Die NEUE Adresse darf nicht in der Liste landen — sonst schließt sich der
    // Lauf selbst aus und findet nie wieder etwas.
    expect(tote).not.toContain("info@amt-ostholstein-mitte.landsh.de");
  });

  it("ohne Notiz gibt es keine Geschichte, aber auch keinen Fehler", () => {
    expect(toteAdressen(null)).toEqual([]);
  });

  it("der Zustand der Übergabe hat einen Namen, den beide Seiten importieren", () => {
    // Nicht zurück auf „offen": Dort heißt offen „nie angeschrieben", und das
    // stimmt nach einem gescheiterten Versuch nicht mehr. Getippt stünde der
    // Name auf zwei Seiten, und die eine ändert sich irgendwann ohne die
    // andere — dann bleibt die Gemeinde für immer liegen.
    expect(STATUS_BOUNCE_BEHOBEN).toBe("bounce-behoben");
  });

  it("zweimal volles Postfach gibt eine Gemeinde NICHT auf", () => {
    // GEMESSEN AM EIGENEN FEHLER (10.09.2026): Die erste Zählung nahm jede
    // Notizzeile mit dem Vermerk. Damit wäre eine Gemeinde, deren Postfach
    // zweimal volllief, endgültig aufgegeben worden — mit einer Adresse, die
    // nie falsch war. Zählt werden Fehlversuche, und zwar nur die dauerhaften.
    const zweimalVoll = [
      '[2026-08-26] unzustellbar aus Postfach: „Undelivered Mail Returned to Sender"',
      "    <info@selzen.de>: Quota exceeded (mailbox for user is full)",
      '[2026-09-02] unzustellbar aus Postfach: „Undelivered Mail Returned to Sender"',
      "    <info@selzen.de>: Quota exceeded (mailbox for user is full)",
    ].join("\n");
    expect(dauerhafteBouncer(zweimalVoll)).toBe(0);
    expect(dauerhafteBouncer(zweimalVoll) >= MAX_DAUERHAFTE_BOUNCER).toBe(false);
  });

  it("nach zwei dauerhaften Bouncern ist Schluss", () => {
    // Sonst läuft eine Gemeinde mit kaputtem Mailserver im Kreis: Jede neue
    // Adresse liefert denselben Fehler, und der Lauf sucht die nächste.
    expect(MAX_DAUERHAFTE_BOUNCER).toBe(2);
  });
});
