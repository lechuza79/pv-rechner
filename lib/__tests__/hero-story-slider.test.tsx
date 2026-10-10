import {describe, expect, it} from "vitest";
import {renderToStaticMarkup} from "react-dom/server";
import StorySlider from "../../components/StorySlider";

describe("hero story slider accessibility", () => {
  it("exposes one slide and disables hidden interactive content", () => {
    const html = renderToStaticMarkup(<StorySlider variant="hero" ariaLabel="Energy" labels={["Daily", "Annual"]}>{[<a key="one" href="#daily">Daily</a>, <a key="two" href="#annual">Annual</a>]}</StorySlider>);
    expect(html).toContain('aria-roledescription="Karussell"');
    expect(html).toContain('data-active="false" aria-hidden="true" inert=""');
    expect(html).toContain('aria-label="Daily" aria-pressed="true"');
    expect(html).toContain('aria-label="Annual" aria-pressed="false"');
    expect(html).not.toContain('Automatischen Wechsel pausieren');
  });
});
