import { describe, expect, it } from "vitest";
import { fundingAboMeldungen } from "../funding-abo-meldungen";
import { meldungenFuerAbo } from "../gemeinde-meldungen";
import { aboMeldungsMail } from "../abo-mail";
import { FUNDING_PROGRAMS, type FundingProgram } from "../funding-programs";
import type { HistorieEintrag } from "../funding-history";

const now = new Date("2026-10-17T10:00:00Z");
const program: FundingProgram = { ...Object.values(FUNDING_PROGRAMS)[0], id: "test-bkw", name: "Balkonzuschuss (Test)",
  level: "kommune", agsCode: "09679147", agsCodes: undefined, foerdert: ["balkon"], url: "https://example.org/foerderung" };
const entry = (changes: Partial<HistorieEintrag> = {}): HistorieEintrag => ({
  programId: program.id, feld: "aufnahme", bedeutung: "inhalt", alt: null, neu: "aktiv",
  festgestelltAm: "2026-10-16T12:00:00Z", quelle: program.url, belegtAm: "2026-10-16", ...changes,
});
const run = (entries = [entry()], programmes = [program], scope = "funding:region:09679147") =>
  fundingAboMeldungen(scope, programmes, new Map([[program.id, entries]]), now);
const subscriber = { quelle: "foerderung" as const, technikenGewaehlt: ["balkon" as const],
  bestaetigtAm: "2026-10-15T12:00:00Z", letzteMailAm: null };

describe("Funding catalogue notifications", () => {
  it("finds the first programme for a previously empty municipality without inventing a start date", () => {
    expect(run([], [])).toEqual([]);
    const messages = meldungenFuerAbo(run(), subscriber);
    expect(messages).toHaveLength(1);
    expect(messages[0].titel).toBe("Neu im Förderkatalog: Balkonzuschuss (Test)");
    expect(messages[0].text).toContain("nicht zwingend der Programmstart");
  });
  it.each(["status", "rates", "conditions", "coveredCosts", "maxFoerderung", "eligibility", "capped"] as const)("reports %s changes", feld => {
    expect(run([entry({ feld, alt: "vorher", neu: "nachher" })])[0].titel).toContain("Förderupdate");
  });
  it("groups simultaneous observations but retains their actual dates", () => {
    const result = run([entry({ feld: "rates", alt: "100", neu: "150" }), entry({ feld: "conditions", alt: "a", neu: "b" })]);
    expect(result).toHaveLength(1);
    expect(result[0].text).toContain("Fördersätze, Bedingungen");
    expect(result[0].festgestelltAm).toBe("2026-10-16T12:00:00.000Z");
  });
  it("excludes another municipality and a PV-only programme", () => {
    expect(run(undefined, [{ ...program, agsCode: "09679148" }])).toEqual([]);
    expect(meldungenFuerAbo(run(undefined, [{ ...program, foerdert: ["pv"] }]), subscriber)).toEqual([]);
  });
  it.each([
    { level: "landkreis", agsCode: "09679" },
    { level: "land", agsCode: "09" },
    { level: "bund", agsCode: undefined },
    { level: "kommune", agsCode: "09679148", agsCodes: ["09679147"] },
  ] as Partial<FundingProgram>[])("includes applicable regional coverage %j", changes => {
    expect(run(undefined, [{ ...program, ...changes }])).toHaveLength(1);
  });
  it("limits a programme subscription to that programme", () => {
    expect(run(undefined, undefined, "funding:program:other")).toEqual([]);
    expect(run(undefined, undefined, `funding:program:${program.id}`)).toHaveLength(1);
  });
  it("ignores internal, unchanged, invalid and future observations", () => {
    expect(run([
      entry({ feld: "rechenwerte", bedeutung: "intern" }),
      entry({ feld: "rates", alt: "same", neu: "same" }),
      entry({ festgestelltAm: "invalid" }), entry({ festgestelltAm: "2026-10-18T00:00:00Z" }),
    ])).toEqual([]);
  });
  it("does not resend or backfill changes from before confirmation", () => {
    expect(meldungenFuerAbo(run(), { ...subscriber, letzteMailAm: "2026-10-16T12:00:00+00:00" })).toEqual([]);
    expect(meldungenFuerAbo(run(), { ...subscriber, bestaetigtAm: "2026-10-17T00:00:00Z" })).toEqual([]);
  });
  it("renders source, settings and unsubscribe links without claiming an installation-register basis", () => {
    const mail = aboMeldungsMail({ ortName: "Testort", ortUrl: "https://example.org/uebersicht", meldungen: run(),
      foerderung: true, standLabel: "17. Oktober 2026", abmeldeUrl: "https://example.org/abmelden",
      einstellungenUrl: "https://example.org/einstellungen" });
    expect(mail.html).toContain('href="https://example.org/foerderung"');
    expect(mail.text).toContain("https://example.org/abmelden");
    expect(mail.html).toContain("https://example.org/einstellungen");
    expect(mail.text).not.toContain("Marktstammdatenregister");
    expect(mail.html).not.toContain("CO₂");
  });
});
