import { describe, expect, it } from "vitest";
import { postfachBefund } from "../outreach-mail";

// The enquiry run hands over the verified administration website as a URL.
// Compared as a plain string it never matched, so every enquiry to a shared
// administration (Mudersbach via kirchen-sieg.de) was rejected and the whole
// run aborted (21.09.2026).
describe("verified administration domain given as URL", () => {
  it("accepts the administration's postbox when the website is a full URL", () => {
    expect(postfachBefund("vg-kirchen@kirchen-sieg.de", "Mudersbach", "https://www.kirchen-sieg.de").ok).toBe(true);
    expect(postfachBefund("vg-kirchen@kirchen-sieg.de", "Mudersbach", "https://www.kirchen-sieg.de/impressum").ok).toBe(true);
    expect(postfachBefund("vg-kirchen@kirchen-sieg.de", "Mudersbach", "kirchen-sieg.de").ok).toBe(true);
  });

  it("still rejects a domain that is not the verified one", () => {
    expect(postfachBefund("poststelle@vg-bg.de", "Betzdorf", "https://www.betzdorf.de").ok).toBe(false);
    expect(postfachBefund("info@evil-kirchen-sieg.de", "Mudersbach", "https://www.kirchen-sieg.de").ok).toBe(false);
    expect(postfachBefund("vg-kirchen@kirchen-sieg.de", "Mudersbach").ok).toBe(false);
  });
});
