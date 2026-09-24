import { describe, expect, it } from "vitest";
import { bevorzugterFachkontakt, fachkontakteAus } from "../kommunen-fachkontakt";

const proof = (email: string, channels: string[], scope = "municipality") => ({ email, channels, scope, url: `https://www.town.de/kontakt/${email.split("@")[0]}` });

describe("Fachkontakte aus der Kontaktsuche", () => {
  it("behält alle belegten Kontakte, Klimaschutz vorn", () => {
    const k = fachkontakteAus({
      press: ["presse@town.de"], energy: ["klima@town.de", "m.muster@town.de"],
      proofs: [proof("presse@town.de", ["press"]), proof("klima@town.de", ["energy"]), proof("m.muster@town.de", ["energy"])],
    });
    expect(k.alle.map(c => c.email)).toEqual(["klima@town.de", "m.muster@town.de", "presse@town.de"]);
    expect(k.klima?.email).toBe("klima@town.de");
    expect(k.presse?.email).toBe("presse@town.de");
    expect(bevorzugterFachkontakt(k)?.kanal).toBe("klima");
  });
  it("verliert keinen belegten Kontakt jenseits der Auswahl", () => {
    const k = fachkontakteAus({
      press: ["a@town.de", "b@town.de"], energy: [],
      proofs: [proof("a@town.de", ["press"]), proof("b@town.de", ["press"]), proof("c@town.de", ["press"])],
    });
    expect(k.alle.map(c => c.email)).toEqual(["a@town.de", "b@town.de", "c@town.de"]);
  });
  it("nimmt die Presse, wenn kein Klimaschutz belegt ist", () => {
    const k = fachkontakteAus({ press: ["presse@town.de"], energy: [], proofs: [proof("presse@town.de", ["press"])] });
    expect(bevorzugterFachkontakt(k)?.email).toBe("presse@town.de");
  });
  it("nimmt keinen Kontakt ohne Beleg, aber jeden belegten — auch wenn der alte Kontakt ungeklärt ist", () => {
    expect(fachkontakteAus({ press: ["presse@town.de"], energy: [], proofs: [] }).alle).toEqual([]);
    expect(fachkontakteAus({ press: [], energy: [], proofs: [proof("klima@town.de", ["energy"])] }).klima?.email).toBe("klima@town.de");
    expect(fachkontakteAus({ press: [], energy: [], proofs: [proof("info@town.de", [])] }).alle).toEqual([]);
  });
  it("führt die Domain der gemeinsamen Verwaltung mit, wenn der Beleg von dort kommt", () => {
    const k = fachkontakteAus({ press: ["e.muster@vgv-kelberg.de"], energy: [], proofs: [proof("e.muster@vgv-kelberg.de", ["press"], "shared-administration:Kelberg")] });
    expect(k.presse?.verwaltungDomain).toBe("vgv-kelberg.de");
  });
});
