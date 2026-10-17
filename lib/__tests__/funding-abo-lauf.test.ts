import { beforeEach, expect, it, vi } from "vitest";
vi.mock("../gemeinde-abo", () => ({ empfaengerFuerOrt: vi.fn(), versandVermerken: vi.fn() }));
vi.mock("../abo-region", () => ({ aboRegion: vi.fn(async () => ({ name: "Förderung · Testort" })), aboRegionPath: vi.fn(async () => "/balkonkraftwerk/foerderung") }));
vi.mock("../mastr-data", () => ({ getRegionAtlasData: vi.fn() }));
vi.mock("../atlas", () => ({ getRegionById: vi.fn(), atlasPathForRegionId: vi.fn() }));
vi.mock("../funding-data", () => ({ getFundingPrograms: vi.fn() }));
vi.mock("../funding-history", () => ({ getFundingHistory: vi.fn(), wiederOffenSeit: vi.fn() }));
vi.mock("../abo-token", () => ({ abmeldeLink: () => "http://localhost/abo/abmelden?t=test", einstellungenLink: () => "http://localhost/abo/einstellungen?t=test" }));
vi.mock("../abo-versand", () => ({ sendeAboMail: vi.fn(async () => ({ ok: true })) }));
import { aboLauf } from "../abo-lauf";
import { empfaengerFuerOrt, versandVermerken, type GemeindeAbo } from "../gemeinde-abo";
import { getFundingPrograms } from "../funding-data";
import { getFundingHistory } from "../funding-history";
import { getRegionAtlasData } from "../mastr-data";
import { sendeAboMail } from "../abo-versand";
import { FUNDING_PROGRAMS } from "../funding-programs";
const scope = "funding:region:09679147";
const options = { orte: [scope], jetzt: new Date("2026-10-17T12:00:00Z"), basisUrl: "http://localhost" };
const abo = { id: "test", regionId: scope, email: "test@example.invalid", status: "bestaetigt", quelle: "foerderung",
  technikenGewaehlt: ["balkon"], bestaetigtAm: "2026-10-15T12:00:00Z", letzteMailAm: null } as GemeindeAbo;
beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(empfaengerFuerOrt).mockResolvedValue([abo]);
  vi.mocked(versandVermerken).mockResolvedValue();
  vi.mocked(getFundingPrograms).mockResolvedValue([{ ...Object.values(FUNDING_PROGRAMS)[0], id: "test", name: "Testprogramm", level: "kommune", agsCode: "09679147", foerdert: ["balkon"] }]);
  vi.mocked(getFundingHistory).mockResolvedValue(new Map([["test", [{ programId: "test", feld: "aufnahme", bedeutung: "inhalt", alt: null, neu: "aktiv", festgestelltAm: "2026-10-16T12:00:00Z", quelle: null, belegtAm: null }]]]));
});
it("delivers a scoped funding message through the existing mail path, without requiring Atlas data", async () => {
  const result = await aboLauf(options);
  expect(result.versendet).toBe(1);
  expect(getRegionAtlasData).not.toHaveBeenCalled();
  expect(versandVermerken).toHaveBeenCalledWith("test", options.jetzt.toISOString());
  expect(vi.mocked(versandVermerken).mock.invocationCallOrder[0]).toBeLessThan(vi.mocked(sendeAboMail).mock.invocationCallOrder[0]);
  expect(sendeAboMail).toHaveBeenCalledWith(expect.objectContaining({ text: expect.stringContaining("Neu im Förderkatalog"), art: "meldung" }));
});
it("dry run neither writes nor sends", async () => {
  expect((await aboLauf({ ...options, trocken: true })).versendet).toBe(1);
  expect(versandVermerken).not.toHaveBeenCalled();
  expect(sendeAboMail).not.toHaveBeenCalled();
});
it("stays silent without history or eligible confirmed recipients", async () => {
  vi.mocked(empfaengerFuerOrt).mockResolvedValue([]);
  expect((await aboLauf(options)).versendet).toBe(0);
  vi.mocked(empfaengerFuerOrt).mockResolvedValue([abo]);
  vi.mocked(getFundingHistory).mockResolvedValue(new Map());
  expect((await aboLauf(options)).versendet).toBe(0);
  expect(sendeAboMail).not.toHaveBeenCalled();
});
it("does not send PV-only changes, past changes or a second daily notification", async () => {
  for (const changes of [{ technikenGewaehlt: ["pv"] }, { bestaetigtAm: "2026-10-17T00:00:00Z" }, { letzteMailAm: "2026-10-17T09:00:00Z" }]) {
    vi.mocked(empfaengerFuerOrt).mockResolvedValue([{ ...abo, ...changes } as GemeindeAbo]);
    expect((await aboLauf(options)).versendet).toBe(0);
  }
  expect(sendeAboMail).not.toHaveBeenCalled();
});
it("does not send after a failed delivery marker", async () => {
  vi.mocked(versandVermerken).mockRejectedValueOnce(new Error("test failure"));
  expect((await aboLauf(options)).fehlgeschlagen).toBe(1);
  expect(sendeAboMail).not.toHaveBeenCalled();
});
