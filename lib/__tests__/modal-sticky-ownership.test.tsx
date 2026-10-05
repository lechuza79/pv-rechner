import { describe, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { ModalSticky } from "../../components/Modal";

// Supply a mounted dialog context while letting the real ownership provider
// propagate normally through the server-rendered nested controls.
vi.mock("react", async importOriginal => {
  const original = await importOriginal<typeof import("react")>();
  return {
    ...original,
    useContext: <T,>(context: import("react").Context<T>): T => {
      const value = original.useContext(context);
      return value === null ? { scrollt: true, header: null } as unknown as T : value;
    },
  };
});

describe("Dialog footer ownership", () => {
  it("renders one sticky surface when a result footer contains flow controls", () => {
    const html = renderToStaticMarkup(<ModalSticky>
      <section><ModalSticky><button>Apply changes</button></ModalSticky></section>
    </ModalSticky>);
    expect(html.match(/position:sticky/g)).toHaveLength(1);
    expect(html.match(/Apply changes/g)).toHaveLength(1);
    expect(html).toContain("<section><button>Apply changes</button></section>");
  });
});
