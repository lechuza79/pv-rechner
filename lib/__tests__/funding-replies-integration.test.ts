import { describe, expect, it, vi } from "vitest";
import { foerderAnfragenZuordnen } from "../../scripts/kommunen-ruecklauf";

const row = { program_id: "town", empfaenger: "info@town.de", betreff: "Aktueller Stand des Förderprogramms PV", gesendet_am: "2026-09-10T10:00:00Z", antwort_am: null, antwort_art: null };
const mail = { von: "info@town.de", betreff: `AW: ${row.betreff}`, roh: "", text: "Sie finden die Richtlinie unter /pv.", receivedAt: "2026-09-11T08:00:00Z" };
function database(options: { readError?: string; writeError?: string; changed?: boolean } = {}) {
  const patch = vi.fn();
  const filters: unknown[] = [];
  const write = { eq: (...args: unknown[]) => { filters.push(args); return write; }, is: (...args: unknown[]) => { filters.push(args); return write; }, select: async () => ({ data: options.changed ? [] : [{ program_id: "town" }], error: options.writeError ? { message: options.writeError } : null }) };
  const from = vi.fn((_table: string) => ({ select: async () => ({ data: [row], error: options.readError ? { message: options.readError } : null }), update: (value: unknown) => { patch(value); return write; } }));
  return { db: { from } as never, patch, filters, from };
}
describe("Funding mailbox handoff", () => {
  it("persists only a substantive reply and never changes grant data", async () => {
    const { db, patch, from, filters } = database();
    await foerderAnfragenZuordnen(db, [{ ...mail, kopf: { "auto-submitted": "auto-replied" } }, mail], true);
    expect(patch).toHaveBeenCalledTimes(1);
    expect(patch).toHaveBeenCalledWith({ antwort_am: mail.receivedAt.replace("Z", ".000Z"), antwort_art: "antwort", antwort_notiz: mail.text });
    expect(from.mock.calls.every(([table]) => table === "funding_anfragen")).toBe(true);
    expect(filters).toContainEqual(["antwort_am", null]);
  });
  it("does not write in read-only mode", async () => {
    const { db, patch } = database();
    await foerderAnfragenZuordnen(db, [mail], false);
    expect(patch).not.toHaveBeenCalled();
  });
  it.each([{ readError: "read failed" }, { writeError: "write failed" }, { changed: true }])("does not report failed or conflicting persistence as success: %j", async (options) => {
    await expect(foerderAnfragenZuordnen(database(options).db, [mail], true)).rejects.toThrow();
  });
});
