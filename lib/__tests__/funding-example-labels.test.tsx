import { expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { ExampleCards } from "../../components/FundingProgramParts";
import { buildFundingExamples } from "../funding-examples";

it("labels an unfunded model without advertising a zero-euro grant", () => {
  const html = renderToStaticMarkup(<ExampleCards examples={buildFundingExamples(1050).slice(0, 1)} illustrated comparison />);
  expect(html).toContain("Ohne angesetzten Zuschuss");
  expect(html).not.toContain("einmaliger Zuschuss");
  expect(html).toContain("25 Jahre");
});
