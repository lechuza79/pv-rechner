import { Montserrat } from "next/font/google";

/**
 * The scope of the redesigned surface (homepage and PV simulation).
 *
 * Everything the neon design adds — colour roles, type roles, the button
 * family — only exists inside this wrapper (`.sc-neon` in lib/theme.ts). The
 * heading font is declared HERE and not in the site layout: next/font preloads
 * a font on every route whose layout declares it, and the calculators and
 * articles must not pay for a typeface they never show.
 */
const montserrat = Montserrat({
  subsets: ["latin"],
  weight: ["600", "700"],
  display: "swap",
  variable: "--font-montserrat",
});

export default function NeonFlaeche({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return <div className={`sc-neon ${montserrat.variable}${className ? ` ${className}` : ""}`}>{children}</div>;
}
