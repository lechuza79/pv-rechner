import { describe, it, expect, beforeAll } from "vitest";
import { readFileSync, readdirSync } from "fs";
import { resolve, join } from "path";
import {
  abmeldeToken,
  einstellungenToken,
  einstellungenLink,
  pruefeAbmeldung,
  pruefeBestaetigung,
  pruefeEinstellungen,
} from "../abo-token";
import { aboBestaetigungsMail, aboMeldungsMail, fehlendeAboPflichtangaben } from "../abo-mail";

// Wer abonniert hat, kann seine Einstellungen sehen und ändern.
//
// DER ANLASS (Betreiber, 02.09.2026): Das Abo kannte genau eine Änderung — die
// endgültige. Was jemand abonniert hat, stand nirgends.
//
// WARUM NICHT IM ANMELDEFORMULAR: Eine Maske, die auf eine eingetippte Adresse
// hin „schon abonniert" antwortet, ist ein Abfragedienst für fremde Abos. Die
// Anmeldung antwortet deshalb immer gleich, und die Einstellungen hängen an
// einem signierten Link aus der Mail.

const lies = (p: string) => readFileSync(resolve(process.cwd(), p), "utf8");

beforeAll(() => {
  // Ein Platzhalter, als solcher erkennbar — ein realistisch aussehendes
  // Geheimnis löst beim Push den Geheimnis-Scanner aus (gemessener Fehlalarm,
  // 01.09.2026).
  process.env.ABO_HMAC_SECRET = "BEISPIEL-KEIN-ECHTES-GEHEIMNIS";
});

describe("Die Zwecke bleiben getrennt", () => {
  const id = "11111111-2222-3333-4444-555555555555";

  it("erkennt das eigene Token", () => {
    const b = pruefeEinstellungen(einstellungenToken(id));
    expect(b.ok && b.aboId).toBe(id);
  });

  it("lässt ein Einstellungs-Token NICHT abmelden", () => {
    // DER TEURE FALL: Postfächer und Sicherheitsscanner rufen Links in Mails
    // von sich aus auf. Wären beide Zwecke dasselbe Token, meldete ein solcher
    // Vorabruf jemanden ab, der nur nachsehen wollte.
    expect(pruefeAbmeldung(einstellungenToken(id)).ok).toBe(false);
  });

  it("lässt ein Abmelde-Token nicht auf die Einstellungen", () => {
    expect(pruefeEinstellungen(abmeldeToken(id)).ok).toBe(false);
  });

  it("lässt ein Einstellungs-Token nichts bestätigen", () => {
    // Sonst käme ein Abo ohne den Klick zustande, den die Einwilligung braucht.
    expect(pruefeBestaetigung(einstellungenToken(id), Date.now()).ok).toBe(false);
  });

  it("weist ein verändertes Token ab", () => {
    const echt = einstellungenToken(id);
    expect(pruefeEinstellungen(echt.replace(/.$/, "0")).ok || pruefeEinstellungen(echt.slice(0, -1)).ok).toBe(
      false,
    );
    expect(pruefeEinstellungen(`${id}.prefs.deadbeef`).ok).toBe(false);
    expect(pruefeEinstellungen("").ok).toBe(false);
  });

  it("läuft nicht ab", () => {
    // Ein Link, der abläuft, schickt jemanden mit einer Frage zu seinen
    // Einstellungen in eine Fehlermeldung.
    const quelle = lies("lib/abo-token.ts");
    const stelle = quelle.slice(quelle.indexOf("function pruefeMitZweck"));
    expect(stelle.slice(0, stelle.indexOf("\n}\n"))).not.toMatch(/jetztMs|ablauf/);
  });
});

describe("Der Riegel gegen fremde Abos", () => {
  const schicht = lies("lib/gemeinde-abo.ts");

  it("prüft bei jeder Änderung, dass das Abo zur selben Adresse gehört", () => {
    // Die Seite ändert auch Geschwister-Abos, und deren Kennungen stehen im
    // HTML. Ohne diese Prüfung genügte EIN gültiges Token plus eine fremde
    // Kennung, um an einem fremden Abo zu drehen.
    for (const fn of ["aboEinstellungenSetzen", "aboAbmeldenFuer"]) {
      const stelle = schicht.slice(schicht.indexOf(`export async function ${fn}`));
      expect(stelle.slice(0, stelle.indexOf("\n}\n")), fn).toMatch(/gehoertZusammen/);
    }
  });

  it("vergleicht dabei die ADRESSE, nicht die Kennung", () => {
    const stelle = schicht.slice(schicht.indexOf("async function gehoertZusammen"));
    expect(stelle.slice(0, stelle.indexOf("\n}\n"))).toMatch(/a\.email === b\.email/);
  });

  it("zeigt abgemeldete Abos nicht als einstellbar", () => {
    // Sie stehen nur noch als Nachweis in der Ablage; an ihnen gibt es nichts
    // einzustellen.
    const stelle = schicht.slice(schicht.indexOf("export async function aboEinstellungen"));
    expect(stelle.slice(0, stelle.indexOf("\n}\n"))).toMatch(/\.neq\("status",\s*"abgemeldet"\)/);
  });
});

describe("Die Route gibt nichts preis", () => {
  const route = lies("app/api/abo/einstellungen/route.ts");

  it("antwortet ohne gültiges Token immer gleich", () => {
    // „Token gefälscht" und „Abo gibt es nicht mehr" dürfen sich nicht
    // unterscheiden lassen — sonst verrät die Adresse, welche Kennungen es gibt.
    expect(route).toMatch(/const UNGUELTIG = /);
    // Jede Absage geht über dieselbe Antwort — geprüft an der Zahl der
    // Verwendungen und daran, dass keine davon einen Grund nennt.
    expect((route.match(/\bUNGUELTIG\b/g) ?? []).length).toBeGreaterThanOrEqual(5);
    expect(route).not.toMatch(/abgelaufen|unbekannt|gibt es nicht|nicht gefunden/i);
  });

  it("wird nicht zwischengespeichert", () => {
    // Eine zwischengespeicherte Fassung zeigte dem nächsten Aufrufer fremde
    // Einstellungen.
    expect(route).toMatch(/dynamic = "force-dynamic"/);
  });

  it("übernimmt keinen Freitext in die Datenbank", () => {
    expect(route).toMatch(/techniken\(payload\.techniken\)/);
    expect(route).toMatch(/payload\.ausVerwaltung === true/);
  });
});

describe("Der Weg dorthin steht in den Mails", () => {
  const meldung = aboMeldungsMail({
    ortName: "Höchberg",
    ortUrl: "https://solar-check.io/solar-atlas/bayern/wuerzburg/hoechberg",
    meldungen: [
      {
        schluessel: "zubau-2026",
        art: "bewegung",
        titel: "Zwölf neue Anlagen",
        text: "Im vergangenen Jahr kamen zwölf Anlagen dazu.",
        gewicht: 10,
      },
    ],
    abmeldeUrl: "https://solar-check.io/abo/abmelden?t=x",
    einstellungenUrl: "https://solar-check.io/abo/einstellungen?t=y",
    standLabel: "August 2026",
  });
  const bestaetigung = aboBestaetigungsMail({
    ortName: "Höchberg",
    bestaetigenUrl: "https://solar-check.io/abo/bestaetigen?t=x",
    einstellungenUrl: "https://solar-check.io/abo/einstellungen?t=y",
  });

  it("nennt die Einstellungen in beiden Mailarten", () => {
    // AUCH IN DER BESTÄTIGUNG: Bis zur ersten Meldung können Monate vergehen,
    // und bis dahin gäbe es sonst keinen Weg zu den eigenen Einstellungen.
    for (const m of [meldung, bestaetigung]) {
      expect(m.html).toContain("/abo/einstellungen");
      expect(m.text).toContain("/abo/einstellungen");
    }
  });

  it("macht daraus keinen zweiten Knopf in der Bestätigungsmail", () => {
    // Die Bestätigungsmail hat genau eine Handlung; eine zweite daneben kostet
    // Bestätigungen.
    const knoepfe = bestaetigung.html.match(/display:inline-block;background:/g) ?? [];
    expect(knoepfe.length).toBe(1);
  });

  it("lässt die Pflichtangaben unangetastet", () => {
    // Der Einstellungslink ist KEIN Abmeldelink — die Bestätigungsmail darf
    // weiterhin keinen tragen, sonst stufen Postfächer sie als Werbung ein.
    expect(fehlendeAboPflichtangaben(bestaetigung.html, "bestaetigung")).toEqual([]);
    expect(fehlendeAboPflichtangaben(meldung.html, "meldung")).toEqual([]);
    expect(bestaetigung.html).not.toContain("/abo/abmelden");
  });

  it("kommt aus EINER Quelle, nicht aus zusammengesetzten Pfaden", () => {
    // Vier Stellen, die denselben Pfad tippen, tragen irgendwann vier Pfade.
    expect(einstellungenLink("https://solar-check.io", "abc")).toMatch(
      /^https:\/\/solar-check\.io\/abo\/einstellungen\?t=abc\.prefs\.[0-9a-f]{64}$/,
    );
    const treffer: string[] = [];
    const durchsuchen = (verzeichnis: string) => {
      for (const e of readdirSync(resolve(process.cwd(), verzeichnis), { withFileTypes: true })) {
        // Verstecktes überspringen — aber nicht stillschweigend: Eine Prüfung,
        // die an einem Punkt im Namen scheitert, meldet Grün und hat nichts
        // gesehen (gemessener Fall, 01.09.2026).
        if (e.name === "node_modules" || e.name.startsWith(".next")) continue;
        const pfad = join(verzeichnis, e.name);
        if (e.isDirectory()) {
          durchsuchen(pfad);
          continue;
        }
        if (!/\.tsx?$/.test(e.name) || pfad.includes("__tests__")) continue;
        // Die Linkquelle selbst und die Seite, die die Adresse trägt, dürfen sie nennen.
        if (pfad === join("lib", "abo-token.ts")) continue;
        // Der API-Aufruf der Seite trägt denselben Namen und ist kein Link in
        // eine Mail — er bleibt außen vor.
        if (!/(?<!api)\/abo\/einstellungen\?t=/.test(lies(pfad))) continue;
        treffer.push(pfad);
      }
    };
    durchsuchen("lib");
    durchsuchen("app");
    durchsuchen("scripts");
    expect(treffer, `Diese Dateien bauen den Link selbst zusammen: ${treffer.join(", ")}`).toEqual([]);
  });
});

describe("Die Seite", () => {
  it("steht nicht im Index", () => {
    // Die Adresse trägt ein Token, das zu genau einem Postfach gehört.
    expect(lies("app/(site)/abo/einstellungen/page.tsx")).toMatch(/index: false/);
  });

  it("liest das Token aus der Adresse, nicht über den Router-Hook", () => {
    // Auf einer vorgerenderten Seite ist der Hook beim ersten Durchlauf leer,
    // und der Effekt läuft genau einmal — dieselbe Falle, die den
    // Wärmepumpen-Rechner bei Frage eins stehen ließ.
    const client = lies("app/(site)/abo/einstellungen/client.tsx");
    expect(client).toMatch(/window\.location\.search/);
    expect(client).not.toMatch(/useSearchParams/);
  });

  it("lässt keine leere Technik-Auswahl speichern", () => {
    // Die Datenschicht macht aus „nichts gewählt" wieder „alle" — nach dem
    // Speichern stünde sonst das Gegenteil dessen da, was jemand angeklickt hat.
    expect(lies("app/(site)/abo/einstellungen/client.tsx")).toMatch(/speicherbar/);
  });
});
