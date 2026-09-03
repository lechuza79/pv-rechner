import type { Metadata } from "next";
import { DM_Sans, JetBrains_Mono } from "next/font/google";
import { getCssVariables, getThemeOverrides, globalStyles, v, space, pad } from "../../lib/theme";
import { getOverrideCss } from "../../lib/theme-overrides";
import { getSavedThemeOverrides } from "../../lib/theme-overrides-data";

/**
 * Rahmen der betriebseigenen Rechner-Seiten.
 *
 * Eigene Route-Gruppe, weil das Site-Layout genau das mitbringt, was hier
 * schädlich ist: **unsere Navigation**. Sie stand beim ersten Bauversuch über
 * der Partnerseite und lud den Besucher des Betriebs ein, zu uns
 * weiterzuklicken — also genau das Gegenteil dessen, was wir dem Betrieb
 * versprechen. Wer eine Seite anbietet, die Kunden im eigenen Hof hält, darf
 * sie nicht mit einem Menü zum Weggehen ausliefern.
 *
 * Was bleibt: Farben, Schriften, Tagesstufen — die Seite soll aussehen wie
 * unsere, nur ohne Sog. Was geht: Kopfnavigation, Fußbereich mit allen
 * Querverweisen, Reichweitenmessung.
 *
 * **Keine Reichweitenmessung.** Sie ist auf die Nutzung UNSERER Website
 * gestützt; hier misst sie den Besucher eines Dritten, der gar nicht zu uns
 * wollte. Gezählt wird stattdessen serverseitig (Tag, Kennung, Ereignis) —
 * ohne Skript im Browser und ohne dass etwas auf dem Gerät gelesen wird.
 *
 * **Impressum und Datenschutz bleiben erreichbar.** Diensteanbieter dieser
 * Seite sind wir, nicht der Betrieb (§ 5 DDG); sein Impressum hier zu zeigen
 * wäre falsch und selbst irreführend. Der Fuß wegzulassen, damit die Seite
 * „mehr nach dem Betrieb aussieht", wäre der Fehler (Legal-Judges 01.09.2026).
 */

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || "https://solar-check.io";

const dmSans = DM_Sans({ subsets: ["latin"], display: "swap", variable: "--font-dm-sans" });
const jetBrainsMono = JetBrains_Mono({ subsets: ["latin"], display: "swap", variable: "--font-jetbrains-mono" });

export const metadata: Metadata = {
  metadataBase: new URL(BASE_URL),
  // Der Seitentitel kommt aus der Seite selbst; hier steht nur die Sperre.
  // Sie gilt für die ganze Gruppe, damit eine künftige Seite sie nicht
  // vergessen kann.
  robots: { index: false, follow: false },
};

// Dieselbe Startstufe wie im Site-Layout, aber ohne die Sonnen-Nachführung:
// Diese Seite steht auf einer fremden Kundenreise; ein Farbschema, das sich
// im Tagesverlauf ändert, wäre dort Zierde ohne Nutzen. Der Wert entspricht
// der hellsten regulären Tagesstufe.
const THEME_STUFE = "s5";

export default async function PartnerLayout({ children }: { children: React.ReactNode }) {
  const overrideCss = getOverrideCss(await getSavedThemeOverrides());
  return (
    <html lang="de" className={`${dmSans.variable} ${jetBrainsMono.variable}`} data-theme={THEME_STUFE}>
      <head>
        <style
          dangerouslySetInnerHTML={{
            __html: getCssVariables() + getThemeOverrides() + overrideCss + globalStyles,
          }}
        />
      </head>
      <body
        style={{
          margin: 0,
          padding: 0,
          background: "var(--color-bg)",
          minHeight: "100vh",
          fontFamily: "var(--font-text)",
          display: "flex",
          flexDirection: "column",
        }}
      >
        <div style={{ flex: 1 }}>{children}</div>
        <footer style={F.fuss}>
          <div style={F.inner}>
            <span>
              Rechner und Betrieb dieser Seite:{" "}
              <a href="/" style={F.link}>
                solar-check.io
              </a>
            </span>
            <span style={F.links}>
              <a href="/impressum" style={F.link}>
                Impressum
              </a>
              <a href="/datenschutz" style={F.link}>
                Datenschutz
              </a>
            </span>
          </div>
        </footer>
      </body>
    </html>
  );
}

const F = {
  fuss: {
    borderTop: `1px solid ${v("--color-border")}`,
    marginTop: space.xl,
    padding: pad("md", "lg"),
    fontSize: v("--font-size-small"),
    color: v("--color-text-muted"),
  },
  inner: {
    maxWidth: v("--content-max-width"),
    margin: "0 auto",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: space.md,
    flexWrap: "wrap" as const,
  },
  links: { display: "flex", gap: space.md },
  link: { color: v("--color-text-secondary"), textDecoration: "none" },
};
