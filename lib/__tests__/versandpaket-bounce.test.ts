import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { darfInDenVersand } from "../outreach-wiedervorlage";
import { STATUS_BOUNCE_BEHOBEN, MAX_DAUERHAFTE_BOUNCER, dauerhafteBouncer } from "../outreach-bounce";

/**
 * Ein Brief, der nie ankam, ist kein angeschriebener Ort.
 *
 * DER ANLASS (10.09.2026): Vier Anschreiben kamen als unzustellbar zurück, drei
 * davon wegen einer toten Adresse. Der Recherche-Lauf ersetzt sie und übergibt
 * den Ort zurück an den Versand — nur konnte der ihn nicht wieder aufnehmen:
 * Seine Auswahl hängt am KONTAKTDATUM, nicht am Zustand, und das trägt jeder
 * Ort, der einmal im Versandlauf war.
 *
 * Die Fehlerklasse ist die teure: Der Zustand hätte richtig ausgesehen, die
 * Übergabe wäre ins Leere gelaufen, und der Lauf hätte grün gemeldet.
 *
 * DIE NOTIZEN SIND DIE ECHTEN, gekürzt um die zitierte Mail. Das ist der Punkt
 * dieser Datei: Die erste Fassung lief gegen ausgedachte Notizen mit je einer
 * Adresse, war grün — und sperrte Lassan in der Produktion. Eine echte
 * Zustellmeldung nennt mehr als eine Adresse, und genau daran ist die Zählung
 * gescheitert.
 */
const FAELLE = {
  // ZWEI ADRESSEN, EIN FEHLVERSUCH: Unser Empfänger info@lassan.de leitete auf
  // ein gelöschtes Personenpostfach in Wolgast weiter; der Server meldet das
  // Weiterleitungsziel, unsere Adresse steht als Original-Recipient daneben.
  lassan: {
    outreach_status: STATUS_BOUNCE_BEHOBEN,
    contacted_at: "2026-09-02T09:00:00Z",
    notes: [
      '[2026-09-02] unzustellbar aus Postfach: „Undelivered Mail Returned to Sender" (mailer-daemon@mailfwd03.agenturserver.de)',
      "    <anne.terwitte@wolgast.eu>: host wolgast.kasserver.com[85.13.164.44] said: 550",
      "        5.1.1 <anne.terwitte@wolgast.eu>: Recipient address rejected: User unknown",
      "        in virtual alias table (in reply to RCPT TO command)",
      "    Final-Recipient: rfc822; anne.terwitte@wolgast.eu",
      "    Original-Recipient: rfc822;info@lassan.de",
      "[2026-09-10] Postfach neu recherchiert: info@lassan.de → info@lassan.eu (impressum). Grund: alte Adresse info@lassan.de leitet auf ein gelöschtes Personenpostfach in Wolgast weiter.",
    ].join("\n"),
  },
  // Eigener Server weist ab, jetzt über das verwaltende Amt.
  schashagen: {
    outreach_status: STATUS_BOUNCE_BEHOBEN,
    contacted_at: "2026-09-02T09:00:00Z",
    notes: [
      '[2026-09-02] unzustellbar aus Postfach: „Undelivered Mail Returned to Sender" (mailer-daemon@dd23208.kasserver.com)',
      "    <info@schashagen.de>: Recipient address rejected: User unknown in virtual alias table",
      "    Final-Recipient: rfc822; info@schashagen.de",
      "[2026-09-10] Postfach neu recherchiert: info@schashagen.de → info@amt-ostholstein-mitte.landsh.de (verwaltung). Grund: info@schashagen.de wird vom eigenen Server abgewiesen (user unknown).",
    ].join("\n"),
  },
  dennheritz: {
    outreach_status: STATUS_BOUNCE_BEHOBEN,
    contacted_at: "2026-09-02T09:00:00Z",
    notes: [
      '[2026-09-02] unzustellbar aus Postfach: „Undelivered Mail Returned to Sender" (mailer-daemon@dd23208.kasserver.com)',
      "    <redaktion@gemeinde-dennheritz.de>: No such mailbox here by that name",
      "    Final-Recipient: rfc822; redaktion@gemeinde-dennheritz.de",
      "[2026-09-10] Postfach neu recherchiert: redaktion@gemeinde-dennheritz.de → info@dennheritz.de (impressum). Grund: alte Adresse existiert nicht mehr (No such mailbox).",
    ].join("\n"),
  },
  // POSTFACH VOLL: Die Adresse stimmt, es gibt nichts zu ersetzen, und in ein
  // paar Tagen ist es wieder leer. Der Ort bleibt deshalb auf „bounce".
  selzen: {
    outreach_status: "bounce",
    contacted_at: "2026-08-26T09:00:00Z",
    notes: [
      '[2026-08-26] unzustellbar aus Postfach: „Undelivered Mail Returned to Sender" (mailer-daemon@ivmail.innoventec.net)',
      "    <info@selzen.de>: permission denied. Command output: Quota exceeded (mailbox",
      "        for user is full)",
      "    <webmaster@selzen.de> (expanded from <info@selzen.de>): permission denied.",
      "        Command output: Quota exceeded (mailbox for user is full)",
      "    Final-Recipient: rfc822; info@selzen.de",
    ].join("\n"),
  },
} as const;

describe("Die drei behobenen Bouncer kommen zurück in den Versand", () => {
  for (const ort of ["lassan", "schashagen", "dennheritz"] as const) {
    it(`${ort} wird trotz Kontaktdatum aufgenommen`, () => {
      expect(darfInDenVersand(FAELLE[ort])).toEqual({ nimm: true });
    });
  }
});

describe("Ein volles Postfach ist keine falsche Adresse", () => {
  it("Selzen bleibt liegen", () => {
    const urteil = darfInDenVersand(FAELLE.selzen);
    expect(urteil.nimm).toBe(false);
  });

  it("und der Grund nennt das Kontaktdatum, nicht den Mailserver", () => {
    // Die beiden Ablehnungen bedeuten Verschiedenes: „schon angeschrieben"
    // heißt „kommt später wieder", die Obergrenze heißt „nie wieder". Wer sie
    // im Text zusammenwirft, kann sie im Protokoll nicht unterscheiden.
    const urteil = darfInDenVersand(FAELLE.selzen);
    expect(urteil.nimm === false && urteil.grund).toMatch(/schon angeschrieben am 2026-08-26/);
  });
});

describe("Gezählt werden FEHLVERSUCHE, nicht Adressen", () => {
  it("eine Meldung, die zwei Adressen nennt, ist ein Fehlversuch", () => {
    // Lassans echter Fall, und der Grund für diese ganze Umstellung: Die
    // Meldung nennt das Weiterleitungsziel UND unseren Empfänger. Nach
    // Adressen gezählt riss der Ort die Obergrenze beim ersten Fehlversuch —
    // mit frisch belegter Adresse, für immer, ohne dass etwas rot geworden
    // wäre.
    expect(dauerhafteBouncer(FAELLE.lassan.notes)).toBe(1);
  });

  it("auch eine Alias-Erweiterung bleibt ein Fehlversuch", () => {
    // Selzen: info@ und webmaster@ aus derselben Meldung. Hier zusätzlich
    // vorübergehend, also gar kein dauerhafter Fehlversuch.
    expect(dauerhafteBouncer(FAELLE.selzen.notes)).toBe(0);
  });

  it("ein volles Postfach zählt nicht als dauerhaft", () => {
    // Sonst gibt eine Gemeinde, deren Postfach zweimal volllief, den Versand
    // endgültig auf — obwohl ihre Adresse nie falsch war.
    const zweimalVoll = [
      "[2026-08-26] unzustellbar aus Postfach: Quota exceeded (mailbox for user is full)",
      "[2026-09-02] unzustellbar aus Postfach: Quota exceeded (mailbox for user is full)",
    ].join("\n");
    expect(dauerhafteBouncer(zweimalVoll)).toBe(0);
  });

  it("eine Handkorrektur ist kein Fehlversuch", () => {
    // Sie ist die REPARATUR eines Fehlversuchs, nicht ein zweiter — und sie
    // trägt die Wörter der Meldung im Grund („existiert nicht mehr (No such
    // mailbox)"). Wer sie mitzählt, baut die Verdopplung eine Zeile tiefer
    // wieder ein.
    const nurKorrektur =
      "[2026-09-10] Postfach neu recherchiert: a@x.de → b@x.de (impressum). Grund: alte Adresse existiert nicht mehr (No such mailbox).";
    expect(dauerhafteBouncer(nurKorrektur)).toBe(0);
  });
});

describe("Nach genug Fehlversuchen ist Schluss", () => {
  const mitBouncern = (n: number) => ({
    outreach_status: STATUS_BOUNCE_BEHOBEN,
    contacted_at: "2026-09-02T09:00:00Z",
    notes: Array.from(
      { length: n },
      (_, i) =>
        `[2026-09-0${i + 1}] unzustellbar aus Postfach: <tot${i}@x.de>: Recipient address rejected: User unknown`,
    ).join("\n"),
  });

  it(`unter ${MAX_DAUERHAFTE_BOUNCER} Fehlversuchen wird weiter versucht`, () => {
    expect(darfInDenVersand(mitBouncern(MAX_DAUERHAFTE_BOUNCER - 1)).nimm).toBe(true);
  });

  it(`ab ${MAX_DAUERHAFTE_BOUNCER} ist es der Mailserver, nicht die Adresse`, () => {
    const urteil = darfInDenVersand(mitBouncern(MAX_DAUERHAFTE_BOUNCER));
    expect(urteil.nimm).toBe(false);
    expect(urteil.nimm === false && urteil.grund).toMatch(/Mailserver/);
  });
});

// Die Ausnahme darf die übrigen Sperren nicht aufweichen — sie ist ein Fenster
// für einen benannten Fall, kein Generalschlüssel.
describe("Alles andere bleibt, wie es war", () => {
  it("ein nie angeschriebener Ort kommt durch", () => {
    expect(darfInDenVersand({ outreach_status: "offen", contacted_at: null, notes: null })).toEqual({ nimm: true });
  });

  it("ein angeschriebener Ort bleibt gesperrt", () => {
    expect(
      darfInDenVersand({ outreach_status: "kontaktiert", contacted_at: "2026-08-20T09:00:00Z", notes: null }).nimm,
    ).toBe(false);
  });

  it("wer geantwortet hat, bekommt keinen zweiten Brief", () => {
    expect(
      darfInDenVersand({ outreach_status: "geantwortet", contacted_at: "2026-09-09T09:00:00Z", notes: null }).nimm,
    ).toBe(false);
  });
});

describe("Die Route benutzt die Ableitung, statt sie nachzubauen", () => {
  const ROUTE = readFileSync(resolve(__dirname, "../../app/api/admin/kommunen/versandpaket/route.ts"), "utf8");

  it("ruft die Funktion auf", () => {
    expect(ROUTE).toContain("darfInDenVersand(z)");
  });

  it("prüft das Kontaktdatum nicht ein zweites Mal selbst", () => {
    // Eine zweite Fassung derselben Frage läuft auseinander — und die eine
    // Seite sperrt dann, während die andere weiterschickt.
    expect(ROUTE).not.toContain('z.outreach_status === "kontaktiert"');
    expect(ROUTE).not.toContain("schon angeschrieben am");
  });

  it("setzt das Kontaktdatum nirgends zurück", () => {
    // Die naheliegende Reparatur, und die falsche: Daran hängt die
    // Tagesmengen-Zählung des Versands, und der Zeitpunkt des ersten —
    // gescheiterten — Versuchs wäre für immer weg.
    expect(ROUTE).not.toMatch(/contacted_at:\s*null/);
  });
});
