import { describe, it, expect } from "vitest";
import { execSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { ERLAUBTE_SENDER, befundUnverfolgterSender, sendetMails } from "../versand-wache";
import { aussendungsMaengel } from "../aussendung";

/**
 * Jede Aussendung steht in der Datenbank — egal, welche Sitzung sie auslöst.
 *
 * Anlass: 138 Pressemitteilungen (29./30.09.2026) aus einem nie eingecheckten
 * Skript, dessen Protokoll in einem temporären Ordner lag und verschwand.
 * Zurückgeholt nur, weil jede Mail zufällig auch im Gesendet-Ordner lag.
 */

const WURZEL = resolve(__dirname, "..", "..");
const lies = (p: string) => readFileSync(resolve(WURZEL, p), "utf8");
const eingecheckt = execSync("git ls-files lib scripts app", { cwd: WURZEL, encoding: "utf8" })
  .split("\n")
  .filter((d) => /\.(ts|tsx|mjs|js)$/.test(d) && !d.includes("__tests__"));

describe("Versandprotokoll: kein Versand ohne Eintrag in der Datenbank", () => {
  it("jeder eingecheckte Versandweg steht in der Liste — mit seiner Tabelle", () => {
    const sender = eingecheckt.filter((d) => sendetMails(lies(d)));
    const fremd = sender.filter((d) => !ERLAUBTE_SENDER[d]);
    expect(
      fremd,
      "Diese Dateien senden über das Postfach, ohne zu sagen, wo ihre Mails nachzulesen sind. " +
        "Eintrag in lib/versand-wache.ts mit Tabelle — oder über einen bestehenden Versandlauf senden.",
    ).toEqual([]);
  });

  it("jeder Eintrag schreibt wirklich in seine Tabelle", () => {
    // Die Liste ist sonst eine Behauptung: Ein Eintrag „funding_anfragen" an
    // einem Lauf, der nie in diese Tabelle schreibt, wäre grün und falsch.
    for (const [datei, s] of Object.entries(ERLAUBTE_SENDER)) {
      const text = lies(datei);
      const schreibt = text.includes(`"${s.tabelle}"`) || text.includes(`${s.tabelle}?`) || text.includes(`from("${s.tabelle}")`);
      const ueberLib = datei === "scripts/aussendung.ts" && lies("lib/aussendung.ts").includes(`from("${s.tabelle}")`);
      const ueberAufrufer = datei === "lib/abo-versand.ts";
      expect(schreibt || ueberLib || ueberAufrufer, `${datei} schreibt nicht in ${s.tabelle}`).toBe(true);
    }
  });

  it("es gibt keinen Eintrag für eine Datei, die es nicht mehr gibt", () => {
    for (const datei of Object.keys(ERLAUBTE_SENDER)) expect(eingecheckt, datei).toContain(datei);
  });

  it("der allgemeine Versandlauf vermerkt VOR dem Senden", () => {
    const text = lies("scripts/aussendung.ts");
    const vermerk = text.indexOf("await vermerkeVorVersand(");
    const senden = text.indexOf(".sendMail(");
    expect(vermerk, "kein Vermerk vor dem Senden").toBeGreaterThan(0);
    expect(vermerk).toBeLessThan(senden);
  });

  it("die Förder-Anfrage vermerkt VOR dem Senden", () => {
    const text = lies("scripts/funding-anfrage.ts");
    expect(text.indexOf("await merkeAnfrage(")).toBeGreaterThan(0);
    expect(text.indexOf("await merkeAnfrage(")).toBeLessThan(text.lastIndexOf(".sendMail("));
  });

  it("der Entwurf für die Presse sendet selbst nicht", () => {
    // Er wurde aus dem Skript übernommen, das im September selbst verschickte.
    expect(sendetMails(lies("scripts/presse-kreise.ts"))).toBe(false);
  });
});

describe("Versandprotokoll: Skripte außerhalb des Repos", () => {
  it("erkennt ein sendendes Skript an seinem Quelltext", () => {
    expect(sendetMails("const t = nodemailer.createTransport({ host })")).toBe(true);
    expect(sendetMails("await t.sendMail({ to })")).toBe(true);
    // Gegenprobe: Wer nur das Postfach LIEST, sendet nicht.
    expect(sendetMails("const imap = new ImapFlow({}); await imap.fetch('1:*')")).toBe(false);
  });

  it("meldet nichts, wo nichts sendet", () => {
    expect(befundUnverfolgterSender("stand-a", [])).toBeNull();
  });

  it("nennt Arbeitsstand und Dateien", () => {
    const b = befundUnverfolgterSender("outreach-auswertung", ["_presse-kreise.ts"])!;
    expect(b).toContain("outreach-auswertung");
    expect(b).toContain("_presse-kreise.ts");
    expect(b).toMatch(/keiner Datenbank/);
  });

  it("ist in `npm run sessions` verdrahtet", () => {
    const s = lies("scripts/sessions.ts");
    expect(s).toMatch(/befundUnverfolgterSender\(/);
    // Gesucht wird in den NIE EINGECHECKTEN Dateien — dort, wo kein Test hinsieht.
    expect(s).toMatch(/ls-files --others --exclude-standard/);
  });
});

describe("Versandprotokoll: Pflichtangaben im allgemeinen Versandlauf", () => {
  const fuss =
    "Sebastian Schäder\n--\nIhre Adresse stammt aus dem Impressum Ihrer Website.\n" +
    "Impressum: https://solar-check.io/impressum · Datenschutz: https://solar-check.io/datenschutz";

  it("lässt den abgenommenen Presse-Fuß durch", () => {
    expect(aussendungsMaengel("Pressemitteilung: Nidda vorn", `Guten Tag,\n\n${fuss}`)).toEqual([]);
  });

  it("hält eine Mail ohne Impressum oder ohne Herkunft an", () => {
    expect(aussendungsMaengel("x", fuss.replace("solar-check.io/impressum", ""))).toContain("Impressum-Link");
    expect(aussendungsMaengel("x", fuss.replace("Ihre Adresse stammt aus dem Impressum Ihrer Website.", ""))).toContain("Herkunft der Adresse");
  });

  it("hält eine Mail mit einem Loch der Vorlage an — auch im Betreff", () => {
    expect(aussendungsMaengel("Pressemitteilung: undefined vorn", fuss).join()).toMatch(/undefined/);
    expect(aussendungsMaengel("x", `Platz NaN\n${fuss}`).join()).toMatch(/NaN/);
  });

  it("der Versandlauf prüft ALLE Mails, bevor er die Verbindung aufbaut", () => {
    const text = lies("scripts/aussendung.ts");
    expect(text.indexOf("aussendungsMaengel(")).toBeGreaterThan(0);
    expect(text.indexOf("aussendungsMaengel(")).toBeLessThan(text.indexOf("createTransport("));
    expect(text.indexOf("dkimAktiv(")).toBeLessThan(text.indexOf("createTransport("));
  });
});
