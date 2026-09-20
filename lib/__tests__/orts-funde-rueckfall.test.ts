import { describe, it, expect, vi, beforeEach } from "vitest";

/**
 * Die Ortsseite überlebt einen ausgefallenen Geschichten-Read.
 *
 * Am 10.09.2026 war die Datenbank eine Minute lang nicht erreichbar (521 vom
 * Anbieter). Der Read der vorgemerkten Funde warf dabei durch bis in den
 * Seitenaufbau, und eine Gemeindeseite antwortete mit 500 — obwohl die
 * Geschichten eine Zugabe sind und die Seite ohne sie vollständig ist.
 */

const antwort: { wert: unknown } = { wert: null };

function abfrage() {
  // Jede Kettenmethode gibt dieselbe Abfrage zurück; `then` liefert, was der
  // Test gerade vorgibt — eine Antwort, einen Fehler oder gar nichts.
  const q: Record<string, unknown> = {};
  for (const m of ["select", "order", "limit", "eq", "contains", "or"]) q[m] = () => q;
  q.then = (ok: (v: unknown) => unknown, fehl: (e: unknown) => unknown) => {
    const w = antwort.wert;
    if (w instanceof Error) return Promise.reject(w).then(ok, fehl);
    if (w === "haengt") return new Promise(() => {}).then(ok, fehl);
    return Promise.resolve(w).then(ok, fehl);
  };
  return q;
}

vi.mock("server-only", () => ({}));
vi.mock("../supabase-server", () => ({ supabase: { from: () => abfrage() } }));
vi.mock("../db-timeout", async (orig) => {
  const echt = await orig<typeof import("../db-timeout")>();
  // Das kurze Budget auf wenige Millisekunden, damit der Hänger-Fall nicht
  // drei Sekunden kostet — geprüft wird, DASS abgebrochen wird.
  return { ...echt, DB_SOFT_READ_TIMEOUT_MS: 30 };
});

import { fundeFuerOrt } from "../social-fundvorrat";

const zeile = {
  kennung: "g3-test",
  muster: "g3",
  kategorie: "G3",
  satz: "Ein Satz.",
  staerke: 2,
  werte: [],
  grundlage: "",
  orte: ["Breitenberg"],
  laender: ["Bayern"],
  evergreen: false,
  stand: "vorgemerkt",
  notiz: null,
  zuletzt_gesehen: "2026-09-10T00:00:00Z",
  erstmals_gesehen: "2026-09-01T00:00:00Z",
};

describe("Geschichten-Read auf der Ortsseite", () => {
  beforeEach(() => {
    antwort.wert = null;
  });

  it("liefert die Funde des Orts, wenn die Datenbank antwortet", async () => {
    antwort.wert = { data: [zeile], error: null };
    const funde = await fundeFuerOrt({ ort: "Breitenberg", stand: "vorgemerkt" });
    expect(funde.map((f) => f.kennung)).toEqual(["g3-test"]);
  });

  it("wirft nicht, wenn die Datenbank einen Fehler meldet — der Feed ist dann leer", async () => {
    antwort.wert = { data: null, error: { message: "521: Web server is down" } };
    await expect(fundeFuerOrt({ ort: "Breitenberg", stand: "vorgemerkt" })).resolves.toEqual([]);
  });

  it("wirft nicht, wenn die Verbindung abbricht", async () => {
    antwort.wert = new Error("fetch failed");
    await expect(fundeFuerOrt({ ort: "Breitenberg", stand: "vorgemerkt" })).resolves.toEqual([]);
  });

  it("wartet nicht auf eine hängende Datenbank", async () => {
    antwort.wert = "haengt";
    const start = Date.now();
    await expect(fundeFuerOrt({ ort: "Breitenberg", stand: "vorgemerkt" })).resolves.toEqual([]);
    expect(Date.now() - start).toBeLessThan(1000);
  });
});
