/**
 * The shared release check decides whether an address may go into a letter.
 * It had no test at all until a night run hung on it (23.09.2026): one proof
 * page never settled, six workers waited for good, and because nothing was
 * written before the last page, 45 minutes of reads were lost.
 */
import { beforeEach, describe, expect, it, vi } from "vitest";

const fetchLive = vi.fn();
const seiteGerendert = vi.fn();

vi.mock("../../scripts/lib/kontakt-lauf", () => ({ fetchLive: (url: string) => fetchLive(url) }));
vi.mock("../../scripts/lib/kontakt-browser", async () => {
  // mitFrist stays REAL — it is the thing the deadline tests measure.
  const echt = await vi.importActual<typeof import("../../scripts/lib/kontakt-browser")>("../../scripts/lib/kontakt-browser");
  return {
    mitFrist: echt.mitFrist,
    seiteGerendert: (url: string) => seiteGerendert(url),
    browserSchliessen: async () => {},
  };
});
vi.mock("node:dns/promises", () => ({ resolveMx: async () => [{ exchange: "mx.example.org", priority: 10 }] }));

import { freigeben, type Freigabe } from "../../scripts/lib/kontakt-freigabe";
import { mitFrist } from "../../scripts/lib/kontakt-browser";

const pruefling = (email: string, url: string | null = "https://firma.de/impressum") => ({
  schluessel: email, email, belegUrl: url, domain: "firma.de",
});
const seiteMit = (email: string) => `<html><body><a href="mailto:${email}">${email}</a></body></html>`;

beforeEach(() => {
  fetchLive.mockReset();
  seiteGerendert.mockReset();
  seiteGerendert.mockResolvedValue(null);
});

describe("Freigabe eines Kontakts", () => {
  it("gibt frei, was heute noch auf seiner Fundstelle steht", async () => {
    fetchLive.mockResolvedValue({ html: seiteMit("info@firma.de") });
    const [u] = await freigeben([pruefling("info@firma.de")]);
    expect(u.grund).toBeNull();
  });

  it("sperrt eine Adresse, die von ihrer Fundstelle verschwunden ist", async () => {
    fetchLive.mockResolvedValue({ html: seiteMit("anders@firma.de") });
    const [u] = await freigeben([pruefling("info@firma.de")]);
    expect(u.grund).toBe("Adresse steht nicht mehr auf der Fundstelle");
  });

  it("nennt eine UNLESBARE Fundstelle beim Namen, statt das Verschwinden zu behaupten", async () => {
    // Die teure Verwechslung: "konnte nicht nachsehen" als "habe nachgesehen,
    // ist weg" zu melden, ist eine Aussage ueber etwas, das nie beobachtet wurde.
    fetchLive.mockResolvedValue({ error: "Seite antwortet nicht" });
    const [u] = await freigeben([pruefling("info@firma.de")]);
    expect(u.grund).toBe("Fundstelle war nicht lesbar");
  });

  it("meldet jedes Urteil sofort, nicht erst am Ende des Laufs", async () => {
    fetchLive.mockResolvedValue({ html: seiteMit("info@firma.de") });
    const gemeldet: Freigabe[] = [];
    const liste = [pruefling("info@firma.de"), pruefling("kontakt@firma.de")];
    const alle = await freigeben(liste, { parallel: 1, urteil: u => { gemeldet.push(u); } });
    expect(gemeldet.map(u => u.schluessel).sort()).toEqual(alle.map(u => u.schluessel).sort());
    expect(gemeldet).toHaveLength(2);
  });

  it("meldet auch die frueh entschiedenen Faelle sofort", async () => {
    const gemeldet: Freigabe[] = [];
    await freigeben([pruefling("info@firma.de", null)], { urteil: u => { gemeldet.push(u); } });
    expect(gemeldet).toHaveLength(1);
    expect(gemeldet[0].grund).toBe("keine Fundstelle");
  });

  it("laeuft weiter, wenn eine Seite gar nicht mehr antwortet", async () => {
    vi.useFakeTimers();
    try {
      fetchLive.mockResolvedValue({ error: "Abruf fehlgeschlagen" });
      seiteGerendert.mockImplementation(() => new Promise(() => {})); // settles never
      const lauf = freigeben([pruefling("info@firma.de")]);
      await vi.advanceTimersByTimeAsync(130_000);
      const [u] = await lauf;
      expect(u.grund).toBe("Fundstelle war nicht lesbar");
    } finally {
      vi.useRealTimers();
    }
  });
});

describe("Frist um eine Zusage", () => {
  it("gibt den Ausweichwert zurueck, wenn die Zusage nicht faellt", async () => {
    vi.useFakeTimers();
    try {
      const p = mitFrist(new Promise<string>(() => {}), 1000, "ausweich");
      await vi.advanceTimersByTimeAsync(1100);
      expect(await p).toBe("ausweich");
    } finally {
      vi.useRealTimers();
    }
  });

  it("zaehlt eine ABLEHNUNG wie die Frist, statt den Prozess zu reissen", async () => {
    expect(await mitFrist(Promise.reject(new Error("kaputt")), 1000, "ausweich")).toBe("ausweich");
  });

  it("laesst eine rechtzeitige Zusage unveraendert durch", async () => {
    expect(await mitFrist(Promise.resolve("echt"), 1000, "ausweich")).toBe("echt");
  });
});
