import { Metadata } from "next";
import { DM_Sans, JetBrains_Mono } from "next/font/google";
import { getCssVariables, getThemeOverrides, globalStyles } from "../../lib/theme";
import { GlossaryProvider } from "../../components/GlossaryTerm";
import Footer from "../../components/Footer";
import { Analytics } from "@vercel/analytics/next";

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || "https://solar-check.io";

// No-flash boot: resolve and apply the theme before first paint. Inlines a
// compact copy of lib/theme-schedule.ts (it cannot import modules this early).
// "auto" tracks the sun over central Germany — keep this formula in sync with
// the module. Reads/writes the same localStorage key as ThemeController.
const themeBootScript = `(function(){try{
var p=localStorage.getItem('sc-theme-pref')||'auto',r;
if(p==='light')r='light';else if(p==='dusk')r='dusk';else if(p==='dark')r='dark';else{
var d=new Date(),lat=51.16,lon=10.45,
s=Date.UTC(d.getFullYear(),0,0),
doy=Math.floor((Date.UTC(d.getFullYear(),d.getMonth(),d.getDate())-s)/864e5),
dec=0.4093*Math.sin(2*Math.PI/365*(doy-81)),
la=lat*Math.PI/180,
ch=Math.max(-1,Math.min(1,-Math.tan(la)*Math.tan(dec))),
hd=Math.acos(ch)*12/Math.PI,
tz=-d.getTimezoneOffset()/60,
sn=12-lon/15,sr=sn-hd+tz,ss=sn+hd+tz,
h=d.getHours()+d.getMinutes()/60,b=50/60;
r=(h<sr-b||h>ss+b)?'dark':((h<sr+b||h>ss-b)?'dusk':'light');
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

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="de" className={`${dmSans.variable} ${jetBrainsMono.variable}`} suppressHydrationWarning>
      {/* suppressHydrationWarning: the theme boot script sets data-theme /
          data-theme-pref on <html> before hydration (no-flash), which React
          would otherwise flag as a server/client attribute mismatch. */}
      <head>
        <meta name="google-site-verification" content="OdndfgILkY22LlMHqIT8_ASdidCYTyqksv6LC9zw67o" />
        <script dangerouslySetInnerHTML={{ __html: themeBootScript }} />
        <style dangerouslySetInnerHTML={{ __html: getCssVariables() + getThemeOverrides() + globalStyles }} />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationJsonLd) }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(softwareAppJsonLd) }}
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
