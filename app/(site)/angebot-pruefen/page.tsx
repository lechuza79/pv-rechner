import type { Metadata } from "next";
import { v, space } from "../../../lib/theme";
import { WARTELISTE_FASSUNGEN } from "../../../lib/warteliste-einwilligung";
import WartelisteFormular from "./WartelisteFormular";

// The home of the coming offer check (PV and heat pump). Until the check
// exists the page carries only its waitlist, so it stays out of the index:
// a page that holds nothing but a sign-up form is thin content, and the
// address is meant to rank once the check itself lives here.
//
// The wording comes from the consent archive, never typed here: what a
// person reads on this page is exactly what their entry stores as consent.
export const metadata: Metadata = {
  title: "Angebot prüfen: Photovoltaik oder Wärmepumpe – Solar Check",
  description:
    "Bald prüfst du hier dein Photovoltaik- oder Wärmepumpen-Angebot: Preis, Auslegung und Leistungen. Trag dich ein, wir sagen Bescheid, sobald es losgeht.",
  alternates: { canonical: "/angebot-pruefen" },
  robots: { index: false, follow: true },
};

const FASSUNG = WARTELISTE_FASSUNGEN[WARTELISTE_FASSUNGEN.length - 1];

const S: Record<string, React.CSSProperties> = {
  page: {
    background: v("--color-bg"),
    fontFamily: v("--font-text"),
    color: v("--color-text-primary"),
    padding: "0 16px 48px",
  },
  wrap: { maxWidth: v("--content-max-width"), margin: "0 auto", paddingTop: "var(--content-lede-top)" },
  kicker: {
    fontSize: v("--font-size-small"),
    fontWeight: 600,
    color: v("--color-accent"),
    margin: `0 0 ${space.sm}px`,
  },
  h1: {
    fontSize: v("--font-size-h1"),
    fontWeight: 800,
    letterSpacing: "-0.02em",
    lineHeight: 1.2,
    margin: `0 0 ${space.lg}px`,
  },
  p: {
    fontSize: v("--font-size-lead"),
    color: v("--color-text-muted"),
    lineHeight: 1.6,
    margin: `0 0 ${space.xxl}px`,
  },
};

export default function Seite() {
  return (
    <main style={S.page}>
      <div style={S.wrap}>
        <p style={S.kicker}>Demnächst</p>
        <h1 style={S.h1}>PV oder Wärmepumpe: Ist das Angebot fair?</h1>
        <p style={S.p}>{FASSUNG.einleitung}</p>
        <WartelisteFormular version={FASSUNG.version} zusage={FASSUNG.zusage} />
      </div>
    </main>
  );
}
