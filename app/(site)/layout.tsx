import { Metadata } from "next";
import { DM_Sans, JetBrains_Mono } from "next/font/google";
import { getCssVariables, getThemeOverrides, globalStyles } from "../../lib/theme";
import { getOverrideCss } from "../../lib/theme-overrides";
import { getSavedThemeOverrides } from "../../lib/theme-overrides-data";
import { jsonLdHtml } from "../../lib/json-ld";
import { GlossaryProvider } from "../../components/GlossaryTerm";
import Header from "../../components/Header";
import Footer from "../../components/Footer";
import { Analytics } from "@vercel/analytics/next";

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || "https://solar-check.io";

// No-flash boot: resolve and apply the theme before first paint. Inlines a
// compact copy of lib/theme-schedule.ts (it cannot import modules this early).
// "auto" tracks the sun over central Germany — keep this formula in sync with
// the module. Reads/writes the same localStorage key as ThemeController.
const themeBootScript = `(function(){try{
var p=localStorage.getItem('sc-theme-pref');
if(p!=='light'&&p!=='dark')p='auto';
var r;
if(p==='light')r='s6';else if(p==='dark')r='s0';else{
// No weather yet: pick the stage from the sun's elevation alone (below the
// horizon -> night/dusk, up -> a neutral daylight stage). The controller
// refines the daytime brightness once the live reading lands.
var d=new Date(),lat=51.16,lon=10.45,
s=Date.UTC(d.getFullYear(),0,0),
doy=Math.floor((Date.UTC(d.getFullYear(),d.getMonth(),d.getDate())-s)/864e5),
dec=0.4093*Math.sin(2*Math.PI/365*(doy-81)),
la=lat*Math.PI/180,
uh=d.getUTCHours()+d.getUTCMinutes()/60,
H=(uh+lon/15-12)*15*Math.PI/180,
el=Math.asin(Math.max(-1,Math.min(1,Math.sin(la)*Math.sin(dec)+Math.cos(la)*Math.cos(dec)*Math.cos(H))))*180/Math.PI;
r=el<-6?'s0':el<0?'s1':el<6?'s2':'s5';
}
var e=document.documentElement;
e.setAttribute('data-theme',r);
e.setAttribute('data-theme-pref',p);
}catch(_){}})();`;

// Self-hosted fonts (next/font downloads them at build time and serves them
// from our own domain). No runtime request to Google -> DSGVO-konform und
// schneller (kein render-blocking external CSS). Exposed as CSS variables so
// the inline-style tokens in lib/theme.ts can reference them.
const dmSans = DM_Sans({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-dm-sans",
});
const jetBrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-jetbrains-mono",
});

export const metadata: Metadata = {
  metadataBase: new URL(BASE_URL),
  title: "Solar Check – Lohnt sich Photovoltaik? Ehrlich berechnet.",
  description:
    "Kostenloser PV-Rentabilitätsrechner mit direktem Ergebnis — ohne Anmeldung, ohne Verkaufsanrufe. Amortisation, Rendite und Szenarien für deine Photovoltaikanlage mit oder ohne Speicher.",
  keywords: [
    "PV Rechner",
    "Photovoltaik Rentabilität",
    "PV Amortisation berechnen",
    "Lohnt sich Photovoltaik",
    "Solaranlage Rechner",
    "PV Rendite",
    "Photovoltaik Rechner ohne Anmeldung",
  ],
  openGraph: {
    title: "Solar Check – Lohnt sich Photovoltaik?",
    description: "Direktes Ergebnis. Ohne Anmeldung, ohne Verkaufsanrufe.",
    type: "website",
    url: BASE_URL,
    siteName: "Solar Check",
    images: [{ url: `${BASE_URL}/api/og`, width: 1200, height: 630 }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Solar Check – Lohnt sich Photovoltaik?",
    description: "Direktes Ergebnis. Ohne Anmeldung, ohne Verkaufsanrufe.",
    images: [`${BASE_URL}/api/og`],
  },
  other: {
    "theme-color": "#FFFFFF",
  },
};

const organizationJsonLd = {
  "@context": "https://schema.org",
  "@type": "Organization",
  name: "Solar Check",
  url: BASE_URL,
  logo: `${BASE_URL}/logo.png`,
  description:
    "Kostenlose Energie-Rechner — ohne Anmeldung, ohne Verkaufsanrufe: Photovoltaik-Rentabilität, Wärmepumpe und Live-Energiedaten für Deutschland.",
};

const softwareAppJsonLd = {
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  name: "Solar Check",
  description:
    "Kostenloser PV-Rentabilitätsrechner: Amortisation, Rendite und Szenarien für Photovoltaikanlagen mit oder ohne Speicher.",
  url: BASE_URL,
  applicationCategory: "UtilityApplication",
  operatingSystem: "Web",
  offers: { "@type": "Offer", price: "0", priceCurrency: "EUR" },
  inLanguage: "de",
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Admin theming overlay (per-stage green overrides), injected after the base
  // + stage CSS so it wins by source order. Cached read → no DB hit per request.
  const overrideCss = getOverrideCss(await getSavedThemeOverrides());
  return (
    <html lang="de" className={`${dmSans.variable} ${jetBrainsMono.variable}`} suppressHydrationWarning>
      {/* suppressHydrationWarning: the theme boot script sets data-theme /
          data-theme-pref on <html> before hydration (no-flash), which React
          would otherwise flag as a server/client attribute mismatch. */}
      <head>
        <meta name="google-site-verification" content="OdndfgILkY22LlMHqIT8_ASdidCYTyqksv6LC9zw67o" />
        <script dangerouslySetInnerHTML={{ __html: themeBootScript }} />
        <style dangerouslySetInnerHTML={{ __html: getCssVariables() + getThemeOverrides() + overrideCss + globalStyles }} />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: jsonLdHtml(organizationJsonLd) }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: jsonLdHtml(softwareAppJsonLd) }}
        />
      </head>
      <body
        style={{
          margin: 0,
          padding: 0,
          background: "var(--color-bg)",
          minHeight: "100vh",
          fontFamily: "var(--font-text)",
        }}
      >
        <GlossaryProvider>
          {/* Header zentral: früher band ihn jede Seite selbst ein — zehn hatten
              es vergessen (u. a. /kontakt, /methodik, /glossar und die
              Ratgeber-Flaggschiffseite), was Sackgassen ohne Navigation ergab.
              Hier kann ihn keine Seite mehr vergessen. Den aktiven Menüpunkt
              erkennt er selbst am Pfad. */}
          {/* Außenabstand zentral: früher lieferte ihn der jeweilige
              Seiten-Container ("20px 16px"), in dem der Header mit drinsteckte.
              Jetzt sitzt er im Layout und bringt seinen Rahmen selbst mit —
              analog zum Footer darunter. */}
          <div style={{ padding: "20px 16px 0" }}><Header /></div>
          {children}
          <div style={{ padding: "0 16px" }}><Footer /></div>
        </GlossaryProvider>
        {/* Cookieless Web Analytics (aggregiert, keine personenbezogenen
            Daten, kein Consent-Banner nötig — §25 TDDDG greift nicht, da
            nichts auf dem Gerät gespeichert wird). Nur im (site)-Layout,
            nicht in den Embed-Widgets. Siehe /datenschutz. */}
        <Analytics />
      </body>
    </html>
  );
}
