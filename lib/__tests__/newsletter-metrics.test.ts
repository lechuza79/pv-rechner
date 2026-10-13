import {describe, expect, it, vi} from "vitest";
import {matchesNewsletterEntry, newsletterContext, newsletterEventName, newsletterLink} from "../newsletter-metrics";
import {createNewsletterMeasurement} from "../newsletter-measurement";
import {prepareNewsletterMail} from "../newsletter-mail";
const context = {campaign: "september-2026", variant: "kommunal", placement: "bild"} as const;
const target = "https://solar-check.io/solar-atlas/niedersachsen/landkreis-gifhorn/meinersen?chart=solar-check-radial-test&period=2026-09&autoplay=on";
describe("newsletter counters", () => {
  it("preserves modal, month and playback while adding only shared edition labels", () => {
    const url = new URL(newsletterLink(target, context));
    expect(url.searchParams.get("chart")).toBe("solar-check-radial-test");
    expect(url.searchParams.get("period")).toBe("2026-09");
    expect(url.searchParams.get("autoplay")).toBe("on");
    expect(newsletterContext(url.search)).toEqual(context);
  });
  it("rejects arbitrary visitor values and duplicated parameters", () => {
    expect(newsletterEventName("__proto__", "kommunal", "bild")).toBeNull();
    expect(newsletterEventName("september-2026", "a@example.com", "bild")).toBeNull();
    expect(newsletterContext("?nl=september-2026&nlv=kommunal&nll=bild&nlv=allgemein")).toBeNull();
    expect(() => newsletterLink("https://other.example/solar-atlas/a", context)).toThrow();
    expect(() => newsletterLink("https://solar-check.io/abo/abmelden?t=secret", context)).toThrow();
  });
  it("stops attributing playback after navigation away from the newsletter entry", () => {
    const url = new URL(newsletterLink(target, context));
    expect(matchesNewsletterEntry(url.pathname, url.search, url.pathname, context)).toBe(true);
    expect(matchesNewsletterEntry("/solar-atlas/other", url.search, url.pathname, context)).toBe(false);
    expect(matchesNewsletterEntry(url.pathname, "", url.pathname, context)).toBe(false);
  });
  it("never measures test links", () => {
    expect(newsletterContext(new URL(newsletterLink(target, context, true)).search)).toBeNull();
  });
  it("queues startup until analytics exists and counts playback once, not each frame", () => {
    let ready = false;
    const emit = vi.fn();
    const counter = createNewsletterMeasurement(context, () => ready, emit);
    counter.started("2026-08"); counter.flush(); expect(emit).not.toHaveBeenCalled();
    counter.started("2026-09"); ready = true; counter.flush(); counter.flush();
    counter.started("2026-09"); counter.flush();
    expect(emit.mock.calls).toEqual([["bild"], ["start"]]);
  });
  it("does not attribute unrelated playback to the municipality button", () => {
    const emit = vi.fn(); const counter = createNewsletterMeasurement({...context, placement: "ort"}, () => true, emit);
    counter.started("2026-09"); counter.flush(); expect(emit.mock.calls).toEqual([["ort"]]);
  });
  it("does not rewrite the plain-text image link twice when the button shares its path", () => {
    const base = target.split("?")[0];
    const html = `<a data-newsletter-link="bild" href="${target}">Bild</a><a data-newsletter-link="ort" href="${base}">Ort</a>`;
    const result = prepareNewsletterMail(html, `${target}\n${base}`, context, false);
    const links = result.text.split("\n").map(raw => new URL(raw));
    expect(links[0].searchParams.get("chart")).toBe("solar-check-radial-test");
    expect(links[0].searchParams.get("nll")).toBe("bild");
    expect(links[1].searchParams.get("nll")).toBe("ort");
  });
  it("rewrites only explicitly marked links and excludes test sends", () => {
    const html = `<a data-newsletter-link="bild" href="${target.replace(/&/g,"&amp;")}">Image</a><a data-newsletter-link="ort" href="https://solar-check.io/solar-atlas/test">Ort</a><a href="https://solar-check.io/abo/abmelden?t=secret">Abmelden</a>`;
    const result = prepareNewsletterMail(html, target, context, true);
    expect(result.html).toContain('href="https://solar-check.io/abo/abmelden?t=secret"');
    expect(result.html).toContain("nl_test=1"); expect(result.text).toContain("nl_test=1");
    expect(result.batch).toBe("newsletter:september-2026:kommunal");
    expect(() => prepareNewsletterMail('<a href="'+target+'">Link</a>', target, context, false)).toThrow();
  });
});
