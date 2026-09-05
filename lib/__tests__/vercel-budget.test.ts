import { describe, it, expect } from "vitest";
import { createHmac } from "node:crypto";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  deuteMeldung,
  pruefeSignatur,
  projektSchalterUrl,
  schalteFilmprojekt,
  zielGeprueft,
  FILMPROJEKT_ID,
  PAUSE_ZIEL,
  SOLAR_CHECK_PROJEKT_ID,
  VERCEL_TEAM_ID,
} from "../vercel-budget";

// Warum es diesen Test gibt:
//
// Die Ausgabenbremse hat zwei Eigenschaften, die im Browser und im Diff
// unsichtbar sind und sich erst im Ernstfall zeigen — also genau dann, wenn
// niemand mehr nachbessern kann:
//
//   1. Sie ist ÖFFENTLICH erreichbar. Ohne Signaturprüfung schaltet jeder, der
//      die Adresse kennt, das Filmprojekt ab. Eine durchgewinkte Anfrage sieht
//      dabei aus wie eine echte.
//   2. Sie schaltet ein Projekt ab. Steht dort je die falsche Kennung, nimmt
//      ausgerechnet die Kostenbremse solar-check.io offline — die Seite, deren
//      Schutz der ganze Grund für den gezielten statt pauschalen Weg war.
//
// Beides wird deshalb hier festgenagelt und nicht der Aufmerksamkeit überlassen.

const SECRET = "geheim-zum-testen";

function signiere(body: string, secret = SECRET): string {
  return createHmac("sha1", secret).update(body, "utf8").digest("hex");
}

describe("Ausgabenbremse: Signatur", () => {
  const body = JSON.stringify({ teamId: VERCEL_TEAM_ID, thresholdPercent: 100 });

  it("lässt eine gültig signierte Anfrage durch", () => {
    expect(pruefeSignatur(body, signiere(body), SECRET)).toEqual({ ok: true });
  });

  it("weist eine falsch signierte Anfrage ab", () => {
    expect(pruefeSignatur(body, signiere(body, "anderes-geheimnis"), SECRET).ok).toBe(false);
  });

  it("weist ab, wenn die Signatur ganz fehlt", () => {
    expect(pruefeSignatur(body, null, SECRET)).toEqual({ ok: false, grund: "Signatur fehlt" });
    expect(pruefeSignatur(body, undefined, SECRET).ok).toBe(false);
    expect(pruefeSignatur(body, "", SECRET).ok).toBe(false);
  });

  it("weist ab, wenn das Geheimnis in der Umgebung fehlt — statt durchzuwinken", () => {
    // Die bequeme Variante („ohne Geheimnis keine Prüfung") verwandelt einen
    // vergessenen Eintrag im Dashboard in einen offenen Abschalt-Knopf.
    expect(pruefeSignatur(body, signiere(body), undefined).ok).toBe(false);
    expect(pruefeSignatur(body, signiere(body), "").ok).toBe(false);
  });

  it("wirft nicht bei einer Signatur abweichender Länge", () => {
    // timingSafeEqual wirft bei ungleich langen Puffern; ohne den Längenvergleich
    // davor käme statt „abgelehnt" ein Serverfehler heraus.
    expect(() => pruefeSignatur(body, "zu-kurz", SECRET)).not.toThrow();
    expect(pruefeSignatur(body, "zu-kurz", SECRET).ok).toBe(false);
  });

  it("gilt genau diesem Text — ein geändertes Byte fällt durch", () => {
    const signatur = signiere(body);
    const manipuliert = JSON.stringify({ teamId: VERCEL_TEAM_ID, thresholdPercent: 50 });
    expect(pruefeSignatur(manipuliert, signatur, SECRET).ok).toBe(false);
  });
});

describe("Ausgabenbremse: Schwellen", () => {
  const bei = (thresholdPercent: number) =>
    deuteMeldung({ budgetAmount: 150, currentSpend: 150, teamId: VERCEL_TEAM_ID, thresholdPercent });

  it("pausiert NICHT bei 50 Prozent", () => {
    expect(bei(50).aktion).toBe("protokollieren");
  });

  it("pausiert NICHT bei 75 Prozent", () => {
    expect(bei(75).aktion).toBe("protokollieren");
  });

  it("pausiert bei 100 Prozent", () => {
    expect(bei(100).aktion).toBe("pausieren");
  });

  it("pausiert auch oberhalb von 100 Prozent", () => {
    // Sichere Richtung: Führt Vercel je eine höhere Schwelle ein, soll die
    // Bremse greifen statt zuzusehen.
    expect(bei(110).aktion).toBe("pausieren");
  });

  it("reicht Betrag und Ausgabenstand für die Meldung durch", () => {
    const e = bei(100);
    expect(e.budget).toBe(150);
    expect(e.ausgegeben).toBe(150);
    expect(e.schwelle).toBe(100);
  });

  it("entpaust am Ende des Abrechnungszeitraums", () => {
    expect(deuteMeldung({ teamId: VERCEL_TEAM_ID, type: "endOfBillingCycle" }).aktion).toBe("entpausen");
  });

  it("fasst nichts an, was es nicht einordnen kann", () => {
    expect(deuteMeldung({ teamId: VERCEL_TEAM_ID }).aktion).toBe("unklar");
    expect(deuteMeldung(null).aktion).toBe("unklar");
    expect(deuteMeldung("100%").aktion).toBe("unklar");
    expect(deuteMeldung({ teamId: VERCEL_TEAM_ID, thresholdPercent: "100" }).aktion).toBe("unklar");
  });

  it("fasst nichts an, wenn die Meldung einem fremden Team gilt", () => {
    const e = deuteMeldung({ teamId: "team_fremd", thresholdPercent: 100 });
    expect(e.aktion).toBe("unklar");
    expect(e.grund).toContain("fremden Team");
  });
});

describe("Ausgabenbremse: Ziel ist ausschließlich das Filmprojekt", () => {
  it("schaltet das Filmprojekt", () => {
    expect(PAUSE_ZIEL).toBe(FILMPROJEKT_ID);
  });

  it("darf solar-check.io NIEMALS zum Ziel haben", () => {
    expect(PAUSE_ZIEL).not.toBe(SOLAR_CHECK_PROJEKT_ID);
    expect(() => zielGeprueft(SOLAR_CHECK_PROJEKT_ID)).toThrow(/solar-check\.io/);
  });

  it("weist eine Kennung zurück, die gar kein Projekt ist", () => {
    expect(() => zielGeprueft(VERCEL_TEAM_ID)).toThrow();
    expect(() => zielGeprueft("")).toThrow();
  });

  it("baut die Adresse mit Projekt UND Team", () => {
    expect(projektSchalterUrl("pause")).toBe(
      `https://api.vercel.com/v1/projects/${FILMPROJEKT_ID}/pause?teamId=${VERCEL_TEAM_ID}`,
    );
    expect(projektSchalterUrl("unpause")).toContain(`/${FILMPROJEKT_ID}/unpause?`);
  });

  it("nennt die Kennung von solar-check.io nur als Sperre, nie als Ziel", () => {
    // Struktureller Nachweis am Quelltext: Die Kennung darf im ausgeführten Code
    // nur an der einen Stelle stehen, an der sie DEFINIERT und verboten wird.
    const quelle = readFileSync(join(__dirname, "../vercel-budget.ts"), "utf8");
    const codezeilen = quelle
      .split("\n")
      .filter(l => !l.trim().startsWith("//") && !l.trim().startsWith("*") && !l.trim().startsWith("/*"));
    const treffer = codezeilen.filter(l => l.includes(SOLAR_CHECK_PROJEKT_ID) || l.includes("SOLAR_CHECK_PROJEKT_ID"));
    expect(treffer).toHaveLength(2); // die Konstante selbst + der Vergleich in zielGeprueft
    expect(treffer.some(l => l.includes("throw") || l.includes("if ("))).toBe(true);
  });

  it("die Route hält die Kennung nicht in einer Umgebungsvariablen", () => {
    // Eine Variable ist im Diff unsichtbar und im Dashboard mit einem Tippfehler
    // gesetzt — sie stünde zwischen einer Kostenmeldung und dem Abschalten des
    // falschen Projekts.
    const route = readFileSync(join(__dirname, "../../app/api/vercel/budget/route.ts"), "utf8");
    expect(route).not.toMatch(/process\.env\.[A-Z_]*PROJECT[A-Z_]*/);
    expect(route).not.toMatch(/process\.env\.[A-Z_]*PROJEKT[A-Z_]*/);
    expect(route).toContain("PAUSE_ZIEL");
  });
});

describe("Ausgabenbremse: Schalten", () => {
  it("meldet einen Fehlschlag, statt zu werfen, wenn das Token fehlt", async () => {
    // Ein geworfener Fehler im Empfänger sähe für Vercel wie ein Serverfehler aus
    // — und niemand erführe, warum die Bremse nicht gegriffen hat.
    const r = await schalteFilmprojekt("pause", undefined);
    expect(r.ok).toBe(false);
    expect(String(r.status)).toContain("Token");
  });

  it("ruft genau die Projekt-Adresse mit dem Token auf", async () => {
    let gesehen = "";
    let kopf = "";
    const holen = (async (url: unknown, init: unknown) => {
      gesehen = String(url);
      kopf = String((init as { headers: Record<string, string> }).headers.Authorization);
      return new Response(null, { status: 200 });
    }) as unknown as typeof fetch;

    const r = await schalteFilmprojekt("pause", "token-xyz", holen);
    expect(r.ok).toBe(true);
    expect(gesehen).toContain(FILMPROJEKT_ID);
    expect(gesehen).not.toContain(SOLAR_CHECK_PROJEKT_ID);
    expect(kopf).toBe("Bearer token-xyz");
  });

  it("meldet einen abgelehnten Aufruf mit Status, statt Erfolg vorzutäuschen", async () => {
    const holen = (async () => new Response("Not authorized", { status: 403 })) as unknown as typeof fetch;
    const r = await schalteFilmprojekt("pause", "abgelaufenes-token", holen);
    expect(r.ok).toBe(false);
    expect(r.status).toBe(403);
    expect(r.detail).toContain("Not authorized");
  });
});
