import { notFound } from "next/navigation";
import KennzahlWidget from "../../client";
import { WIDGET_METADATA } from "../../meta";
import { KENNZAHL_METRICS, KENNZAHL_TRAEGER } from "../../../../../../lib/embed-pfad-weiche";

// Static twin of `/embed/kennzahl?metric=…&traeger=…`. The middleware normalises
// both values (unknown → default, exactly as the query form did), so only these
// twelve combinations exist and all of them are built at deploy time.
export const metadata = WIDGET_METADATA;
export const dynamicParams = false;

export function generateStaticParams() {
  return KENNZAHL_METRICS.flatMap((metric) => KENNZAHL_TRAEGER.map((traeger) => ({ metric, traeger })));
}

export default async function KennzahlEmbedTwin(props: { params: Promise<{ metric: string; traeger: string }> }) {
  const { metric, traeger } = await props.params;
  const m = KENNZAHL_METRICS.find((x) => x === metric);
  const t = KENNZAHL_TRAEGER.find((x) => x === traeger);
  if (!m || !t) notFound();
  return <KennzahlWidget metric={m} traeger={t} />;
}
