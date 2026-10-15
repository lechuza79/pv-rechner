import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { expect, it } from "vitest";
import { Pill } from "../../components/Pill";
import { Pill as CalendarPill } from "../../components/social/Pill";

it("keeps calendar labels on the same component and preserves their compact default", () => {
  expect(CalendarPill).toBe(Pill);
  const compact = renderToStaticMarkup(<CalendarPill ton="ruhig">Geplant</CalendarPill>);
  expect(compact).toContain("padding:2px 4px");
  expect(compact).toContain("var(--font-size-caption)");
  const regular = renderToStaticMarkup(<Pill ton="ruhig" size="regular">Privatpersonen</Pill>);
  expect(regular).toContain("var(--font-size-small)");
  expect(regular).not.toContain("<button");
});
