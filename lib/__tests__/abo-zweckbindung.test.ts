import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync } from "fs";
import { resolve, join } from "path";
import { NACHWEIS_JAHRE, nachweisLoeschbarAb } from "../gemeinde-abo";

// Nach der Abmeldung ist derselbe Datensatz etwas ANDERES.
//
// Er dient dann nicht mehr dem Versand, sondern nur noch dem Nachweis der
// Einwilligung — auf anderer Rechtsgrundlage (Art. 6 Abs. 1 lit. c i. V. m.
// Art. 5 Abs. 2, Art. 7 Abs. 1 DSGVO und lit. f) und mit anderer Frist. Die DSK
// setzt genau diese Trennung voraus: nachweisen können muss man „auch nach
// einem Widerruf und der Löschung der personenbezogenen Daten aus der
// Werbe-Datenbank" (Orientierungshilfe Direktwerbung 2/2022, Ziff. 3.7).
//
// Eine Trennung, die nur im Kommentar steht, ist keine. Erwägungsgrund 67
// verlangt, dass sie „in dem System unmissverständlich" sichtbar ist — hier
// dadurch, dass es GENAU EINE Funktion gibt, die Empfänger liefert, und die
// filtert.
//
// WAS HIER NICHT GEPRÜFT WIRD: eine Sperrliste. Die gibt es bewusst nicht — in
// einem einwilligungsbasierten Verteiler hat sie keine tragfähige Grundlage
// (DSK Ziff. 5.1: eine Werbesperrdatei „kann daher letztlich nur rechtmäßig
// sein, wenn die zu verhindernde Verarbeitung … auf Art. 6 Abs. 1 UAbs. 1
// lit. f DS-GVO beruht"). Die Sorge, eine abgemeldete Adresse käme sonst
// zurück, war ein Programmfehler und keine Rechtspflicht: Eine erneute
// Anmeldung läuft immer durch eine neue Bestätigung.

const lies = (p: string) => readFileSync(resolve(process.cwd(), p), "utf8");

describe("Der Versand liest nur bestätigte Abos", () => {
  const schicht = lies("lib/gemeinde-abo.ts");

  it("hat genau eine Tür, und die filtert", () => {
    const stelle = schicht.slice(schicht.indexOf("export async function empfaengerFuerOrt"));
    const koerper = stelle.slice(0, stelle.indexOf("\n}\n"));
    expect(koerper).toMatch(/\.eq\("status",\s*"bestaetigt"\)/);
    expect(koerper).toMatch(/\.eq\("region_id",\s*regionId\)/);
  });

  it("kein zweiter Lesepfad auf die Tabelle ohne Status-Filter", () => {
    // DIE EIGENTLICHE PRÜFUNG. Ein Versandlauf, der die Tabelle selbst abfragt,
    // umgeht die Beschränkung — und das sieht man ihm nicht an, weil er
    // funktioniert. Erlaubt sind nur die Stellen unten, jede mit Grund.
    const erlaubt: Record<string, string> = {
      "lib/gemeinde-abo.ts": "die Datenschicht selbst — sie IST die Tür",
      "app/api/abo/setup/route.ts": "legt die Tabelle an",
      "app/api/abo/aufraeumen/route.ts": "ruft nur den Aufräumlauf der Datenschicht",
      "app/api/abo/bereit/route.ts":
        "Bereitschaftsmeldung: fragt EINE Zeile ab, um zu prüfen, ob die Spalten " +
        "angelegt sind — liest keine Empfänger und verschickt nichts. Der Status " +
        "ist dafür bedeutungslos, ein Filter darauf wäre irreführend.",
    };

    const treffer: string[] = [];
    const durchsuchen = (verzeichnis: string) => {
      for (const eintrag of readdirSync(resolve(process.cwd(), verzeichnis), { withFileTypes: true })) {
        // Verstecktes und Fremdes überspringen — ABER nicht stillschweigend:
        // Eine Prüfung, die an einem Punkt im Namen scheitert, meldet Grün und
        // hat nichts gesehen (gemessener Fall im Projekt, 01.09.2026).
        if (eintrag.name === "node_modules" || eintrag.name === ".next" || eintrag.name === ".next-dev") continue;
        const pfad = join(verzeichnis, eintrag.name);
        if (eintrag.isDirectory()) {
          durchsuchen(pfad);
          continue;
        }
        if (!/\.tsx?$/.test(eintrag.name)) continue;
        if (pfad.includes("__tests__")) continue;
        const inhalt = lies(pfad);
        if (!inhalt.includes('from("gemeinde_abos")')) continue;
        if (pfad in erlaubt) continue;
        treffer.push(pfad);
      }
    };
    durchsuchen("lib");
    durchsuchen("app");
    durchsuchen("components");
    durchsuchen("scripts");

    expect(
      treffer,
      `Diese Dateien fragen die Abo-Tabelle direkt ab. Nimm die Empfängerliste aus der Datenschicht, oder trag die Datei mit Grund in die Ausnahmeliste ein: ${treffer.join(", ")}`,
    ).toEqual([]);
  });

  it("findet die Aufrufe überhaupt — Gegenprobe des Wächters", () => {
    // Ein Wächter, der nichts sieht, meldet Grün. Diese Probe stellt sicher,
    // dass der Durchlauf die bekannten Stellen wirklich findet: Fände er auch
    // die Datenschicht nicht, wäre die Prüfung darüber wertlos.
    expect(lies("lib/gemeinde-abo.ts")).toContain('from("gemeinde_abos")');
  });
});

describe("Die Löschuhr hängt am richtigen Ereignis", () => {
  it("startet am letzten VERSAND, nicht an der Abmeldung", () => {
    // Der Anspruch, gegen den der Nachweis schützt, entsteht mit der einzelnen
    // Mail — § 31 Abs. 3 S. 1 OWiG („sobald die Handlung beendet ist"),
    // § 199 Abs. 1 BGB (mit dem Schluss des Jahres, in dem er entstand).
    //
    // Wer sich nach drei Jahren Abo abmeldet, hätte bei einer Uhr ab Abmeldung
    // drei Jahre zu viel gespeichert.
    const versandtIm = "2026-03-15T10:00:00.000Z";
    const bestaetigtIm = "2023-01-01T10:00:00.000Z";
    expect(nachweisLoeschbarAb(versandtIm, bestaetigtIm)).toBe("2030-01-01T00:00:00.000Z");
  });

  it("nimmt die Bestätigung, wenn nie etwas versandt wurde", () => {
    // Meldet sich jemand ab, bevor die erste Meldung kam, gibt es keinen
    // Versand — dann ist die Bestätigung das Ereignis, um das im Streit
    // gestritten würde.
    expect(nachweisLoeschbarAb(null, "2026-11-30T10:00:00.000Z")).toBe("2030-01-01T00:00:00.000Z");
  });

  it("gibt keine Frist zurück, wo es kein Ereignis gibt", () => {
    // Eine nie bestätigte Eintragung braucht keinen Nachweis — sie wird nach
    // sieben Tagen gelöscht, nicht nach Jahren.
    expect(nachweisLoeschbarAb(null, null)).toBeNull();
  });

  it("rechnet die Ultimo-Regel mit, nicht taggenau", () => {
    // § 199 Abs. 1 BGB: „mit dem Schluss des Jahres". Zwei Versendungen im
    // selben Jahr verfallen deshalb am selben Tag, egal ob Januar oder
    // Dezember — taggenau gerechnet wäre die Januar-Mail elf Monate zu früh
    // gelöscht.
    const januar = nachweisLoeschbarAb("2026-01-02T00:00:00.000Z", null);
    const dezember = nachweisLoeschbarAb("2026-12-31T23:00:00.000Z", null);
    expect(januar).toBe(dezember);
  });

  it("hält drei Jahre, nicht mehr und nicht weniger", () => {
    expect(NACHWEIS_JAHRE).toBe(3);
  });

  it("lässt keinen abgemeldeten Eintrag ungelöscht liegen", () => {
    // DER FALL, DER DURCHFIEL (gefunden bei der Doku-Prüfung, 01.09.2026): Wer
    // nie bestätigt hat und dann per Abmeldelink abmeldet, steht auf
    // „abgemeldet" ohne Bestätigungs- und ohne Versanddatum. Die beiden
    // vorhandenen Zweige griffen bei ihm nicht — `NULL < stichtag` ist in
    // Postgres nicht falsch, sondern NULL, also nie wahr. Die Zeile wäre für
    // immer stehen geblieben, während die Datenschutzerklärung zusagt: „Hast
    // du deine Anmeldung nie bestätigt, löschen wir sie ohne diese Frist."
    //
    // Geprüft wird die VOLLSTÄNDIGKEIT der Zweige: Jeder abgemeldete Eintrag
    // muss in genau einen fallen. Die drei Fälle sind: mit Versand · ohne
    // Versand, aber bestätigt · weder noch.
    const schicht = lies("lib/gemeinde-abo.ts");
    const stelle = schicht.slice(schicht.indexOf("export async function aboAufraeumen"));
    const koerper = stelle.slice(0, stelle.indexOf("\n}\n"));

    expect(koerper).toMatch(/\.not\("letzte_mail_am",\s*"is",\s*null\)/); // mit Versand
    expect(koerper).toMatch(/\.is\("letzte_mail_am",\s*null\)[\s\S]{0,120}\.lt\("bestaetigt_am"/); // bestätigt
    expect(koerper).toMatch(/\.is\("bestaetigt_am",\s*null\)/); // weder noch

    // Und der dritte Zweig darf NICHT die Nachweisfrist nehmen: Ohne
    // Bestätigung gibt es keine Einwilligung, also nichts nachzuweisen.
    const dritter = koerper.slice(koerper.indexOf('.is("bestaetigt_am", null)'));
    expect(dritter.slice(0, 300)).toMatch(/UNBESTAETIGT_MAX_TAGE/);
  });
});
