import { beforeEach, describe, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { FlowFooter } from "../../components/FlowNav";

const modal = vi.hoisted(() => ({ active: false }));
vi.mock("../../components/Modal", async importOriginal => {
  const original = await importOriginal<typeof import("../../components/Modal")>();
  return { ...original, useInModal: () => modal.active };
});

describe("Flow footer ownership", () => {
  beforeEach(() => { modal.active = false; });

  it("keeps dialog actions local even when the calculator caller omits embedded", () => {
    modal.active = true;
    const html = renderToStaticMarkup(<FlowFooter><button>Continue in dialog</button></FlowFooter>);
    expect(html).toContain('<div class="wp-flow-footer"><button>Continue in dialog</button></div>');
    expect(html).not.toContain("wp-flow-footer-space");
    expect(html).not.toContain("sc-page-flow-actions");
  });

  it("keeps explicitly embedded actions in their local document", () => {
    const html = renderToStaticMarkup(<FlowFooter embedded><button>Embedded action</button></FlowFooter>);
    expect(html).toContain("Embedded action");
    expect(html).not.toContain("wp-flow-footer-space");
  });

  it("reserves a measured page footprint instead of server-rendering a guessed height", () => {
    const html = renderToStaticMarkup(<FlowFooter><button>Page action</button></FlowFooter>);
    expect(html).toContain('class="wp-flow-footer-space" style="height:0"');
    expect(html).not.toContain("Page action");
  });
});
