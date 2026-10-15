import { describe, it, expect } from "vitest";
import { antwortKennungen, aussendungZuordnen, ersetztBisherige, antwortNotiz, type GesendeteAussendung } from "../aussendung-ruecklauf";

const pm = (o: Partial<GesendeteAussendung>): GesendeteAussendung => ({
  id: 1, zielgruppe: "presse", empfaenger: "redaktion@hna.de", domain: "hna.de",
  betreff: "Pressemitteilung: Heringen beim Solarausbau vorn", message_id: "<abc123@solar-check.io>",
  gesendet_am: "2026-09-30T08:00:00Z", antwort_art: null, ...o,
});
const roh = (kopf: string, text = "Danke, wir bringen das.") => `${kopf}\r\nSubject: x\r\n\r\n${text}`;
const mail = (o: { von: string; betreff?: string; roh: string; art?: any; receivedAt?: string }) => ({
  betreff: "Re: Pressemitteilung", art: "antwort" as const, receivedAt: "2026-10-01T09:00:00Z", ...o,
});

describe("Antworten auf Aussendungen zuordnen", () => {
  it("liest die Kennung unserer Mail aus dem Kopf, auch gefaltet und mit mehreren Verweisen", () => {
    const k = antwortKennungen("From: a@b.de\r\nReferences: <alt@x.de>\r\n <ABC123@solar-check.io>\r\nIn-Reply-To: <abc123@solar-check.io>\r\n\r\nText <nicht@im.kopf>");
    expect(k).toEqual(["alt@x.de", "abc123@solar-check.io"]);
  });

  it("ordnet über den Kopf zu — auch wenn die Redaktion von einer anderen Domain antwortet", () => {
    const g = [pm({}), pm({ id: 2, empfaenger: "lokal@hna.de", message_id: "<zzz@solar-check.io>" })];
    const m = mail({ von: "chef@verlag-gruppe.de", roh: roh("In-Reply-To: <abc123@solar-check.io>") });
    expect(aussendungZuordnen(m, g, new Set())?.id).toBe(1);
  });

  it("ordnet über die Absender-Domain zu, wenn der Kopf fehlt", () => {
    const m = mail({ von: "redaktion@hna.de", roh: roh("From: redaktion@hna.de") });
    expect(aussendungZuordnen(m, [pm({})], new Set())?.id).toBe(1);
  });

  it("lässt eine Domain, die auch einen Gemeinde-Brief bekam, allein dem Kopf", () => {
    // Kreisverwaltungen bekamen 30.09.2026 die Pressemitteilung UND Kreis-Briefe.
    const g = [pm({ empfaenger: "presse@lkspn.de", domain: "lkspn.de" })];
    const ohneKopf = mail({ von: "landrat@lkspn.de", roh: roh("From: landrat@lkspn.de") });
    expect(aussendungZuordnen(ohneKopf, g, new Set(["lkspn.de"]))).toBeNull();
    const mitKopf = mail({ von: "landrat@lkspn.de", roh: roh("In-Reply-To: <abc123@solar-check.io>") });
    expect(aussendungZuordnen(mitKopf, g, new Set(["lkspn.de"]))?.id).toBe(1);
  });

  it("ordnet eine Unzustellbarkeit über die zitierte Empfängeradresse zu, nicht über den Absender", () => {
    const g = [pm({}), pm({ id: 2, empfaenger: "andere@zeitung.de", domain: "zeitung.de", message_id: "<q@solar-check.io>" })];
    const bounce = mail({ von: "mailer-daemon@kasserver.com", art: "unzustellbar", roh: roh("From: mailer-daemon@kasserver.com", "Delivery to andere@zeitung.de failed") });
    expect(aussendungZuordnen(bounce, g, new Set())?.id).toBe(2);
  });

  it("ordnet nichts zu, was VOR dem Versand ankam", () => {
    const m = mail({ von: "redaktion@hna.de", receivedAt: "2026-09-29T09:00:00Z", roh: roh("From: redaktion@hna.de") });
    expect(aussendungZuordnen(m, [pm({})], new Set())).toBeNull();
  });

  it("entscheidet bei mehreren Mails an eine Domain über den Betreff — sonst gar nicht", () => {
    const g = [pm({}), pm({ id: 2, empfaenger: "sport@hna.de", betreff: "Pressemitteilung: Bebra vorn", message_id: "<b@solar-check.io>" })];
    expect(aussendungZuordnen(mail({ von: "x@hna.de", betreff: "AW: Pressemitteilung: Bebra vorn", roh: roh("From: x@hna.de") }), g, new Set())?.id).toBe(2);
    expect(aussendungZuordnen(mail({ von: "x@hna.de", betreff: "Frage", roh: roh("From: x@hna.de") }), g, new Set())).toBeNull();
  });

  it("ordnet eine fremde Mail nicht zu", () => {
    expect(aussendungZuordnen(mail({ von: "info@shop.de", roh: roh("From: info@shop.de") }), [pm({})], new Set())).toBeNull();
  });

  it("lässt eine Urlaubsnotiz eine spätere Antwort nicht verdecken — und nichts hebt einen Widerspruch auf", () => {
    expect(ersetztBisherige("antwort", "abwesenheit")).toBe(true);
    expect(ersetztBisherige("abwesenheit", "antwort")).toBe(false);
    expect(ersetztBisherige("antwort", "widerspruch")).toBe(false);
    expect(ersetztBisherige("widerspruch", "antwort")).toBe(true);
    expect(ersetztBisherige("antwort", "antwort")).toBe(false);
  });

  it("hebt nur den eigenen Text auf, nicht unsere zitierte Mitteilung", () => {
    const t = "Gerne übernehmen wir das.\n\nAm 30.09.2026 schrieb Sebastian Schäder:\n> PRESSEMITTEILUNG";
    expect(antwortNotiz(t)).not.toContain("PRESSEMITTEILUNG");
  });
});

import { ordneEin } from "../outreach-ruecklauf";

describe("Eingangsautomaten von Redaktionen", () => {
  it("erkennt den Datenschutz-Baustein eines Eingangsautomaten als maschinell (30.09.2026)", () => {
    const art = ordneEin({
      von: "redaktion@duesseldorfer-anzeiger.de",
      betreff: "Ihre Nachricht",
      text: "Vielen Dank für Ihre E-Mail. Wir verarbeiten Ihre zugesandten Daten zum Zweck der bestmöglichen Beantwortung Ihrer Anfrage.",
    });
    expect(art).not.toBe("antwort");
  });

  it("lässt eine echte Redaktionsantwort eine Antwort bleiben", () => {
    expect(ordneEin({
      von: "redaktion@nachrichten-kl.de",
      betreff: "Re: Pressemitteilung: Kaiserslautern mit Spitzenwert",
      text: "Sehr geehrter Herr Schäder, vielen Dank für die Information, diese wurden heute veröffentlicht: https://www.nachrichten-kl.de/2026/09/30/",
    })).toBe("antwort");
  });
});

import { antwortBisMesstag } from "../outreach-wirkung";

describe("Wirkung: eine Antwort zählt erst ab ihrem Tag", () => {
  it("zählt eine Antwort von Tag 5 nicht im Messpunkt Tag 3, wohl aber in Tag 7", () => {
    expect(antwortBisMesstag(true, "2026-10-04", "2026-09-29", 3)).toBe(false);
    expect(antwortBisMesstag(true, "2026-10-04", "2026-09-29", 7)).toBe(true);
    expect(antwortBisMesstag(true, "2026-10-02", "2026-09-29", 3)).toBe(true); // genau der Messtag
  });
  it("zählt keine Nicht-Antwort und behält den Altbestand ohne Datum", () => {
    expect(antwortBisMesstag(false, "2026-09-30", "2026-09-29", 28)).toBe(false);
    expect(antwortBisMesstag(true, null, "2026-09-29", 3)).toBe(true);
  });
});
