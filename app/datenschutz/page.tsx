import { Metadata } from "next";
import Link from "next/link";
import { IconArrowRight } from "../../components/Icons";
import { v } from "../../lib/theme";

export const metadata: Metadata = {
  title: "Datenschutzerklärung – Solar Check",
  description:
    "Datenschutzerklärung für Solar Check. Keine Cookies, kein Tracking, alle Berechnungen lokal im Browser.",
};

const S = {
  page: {
    background: v('--color-bg'),
    fontFamily: v('--font-text'),
    color: v('--color-text-primary'),
    minHeight: "100vh",
    padding: "20px 16px",
  },
  wrap: { maxWidth: v('--page-max-width'), margin: "0 auto" },
  back: {
    fontSize: 13,
    color: v('--color-text-secondary'),
    textDecoration: "none",
    display: "inline-block",
    marginBottom: 24,
  },
  h1: {
    fontSize: 22,
    fontWeight: 800,
    letterSpacing: "-0.02em",
    color: v('--color-text-primary'),
    lineHeight: 1.2,
    marginBottom: 24,
  },
  h2: {
    fontSize: 16,
    fontWeight: 700,
    color: v('--color-text-primary'),
    marginTop: 28,
    marginBottom: 10,
  },
  p: {
    fontSize: 13,
    color: v('--color-text-muted'),
    lineHeight: 1.7,
    marginBottom: 10,
  },
  ul: {
    fontSize: 13,
    color: v('--color-text-muted'),
    lineHeight: 1.7,
    marginBottom: 10,
    paddingLeft: 20,
  },
  li: {
    marginBottom: 4,
  },
  a: {
    color: v('--color-accent'),
    textDecoration: "none",
  },
  strong: {
    color: v('--color-text-secondary'),
    fontWeight: 700,
  },
  footer: {
    marginTop: 48,
    paddingTop: 20,
    borderTop: `1px solid ${v('--color-border')}`,
    display: "flex",
    justifyContent: "center",
    gap: 20,
    fontSize: 12,
  },
  footerLink: {
    color: v('--color-text-muted'),
    textDecoration: "none",
  },
  muted: {
    fontSize: 12,
    color: v('--color-text-faint'),
    fontStyle: "italic" as const,
    marginTop: 28,
  },
};

export default function DatenschutzPage() {
  return (
    <div style={S.page}>
      <div style={S.wrap}>
        <Link href="/" style={S.back}>
<span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}><IconArrowRight size={12} style={{ transform: "rotate(180deg)" }} /> Zurück zum Rechner</span>
        </Link>

        <h1 style={S.h1}>Datenschutzerklärung</h1>

        <h2 style={S.h2}>1. Verantwortlicher</h2>
        <p style={S.p}>
          Sebastian Schäder
          <br />
          Albrecht-Dürer-Str. 57
          <br />
          97204 Höchberg
          <br />
          E-Mail: [DEINE@EMAIL.DE]
        </p>

        <h2 style={S.h2}>2. Grundsatz</h2>
        <p style={S.p}>
          Der Schutz deiner Daten ist uns wichtig. Diese Website wurde bewusst so
          gebaut, dass so wenig personenbezogene Daten wie möglich erhoben
          werden. Es gibt keine Nutzer-Accounts, keine Cookies, kein Tracking
          durch Drittanbieter und keine Werbung. Alle Berechnungen laufen
          ausschließlich in deinem Browser — es werden keine Eingabedaten an
          unsere oder fremde Server übermittelt.
        </p>

        <h2 style={S.h2}>3. Hosting</h2>
        <p style={S.p}>
          Diese Website wird bei Vercel Inc., 340 S Lemon Ave #4133, Walnut, CA
          91789, USA gehostet. Beim Aufruf der Website werden automatisch
          technische Daten durch den Hosting-Anbieter erhoben (sog.
          Server-Logfiles):
        </p>
        <ul style={S.ul}>
          <li style={S.li}>IP-Adresse (anonymisiert)</li>
          <li style={S.li}>Datum und Uhrzeit des Zugriffs</li>
          <li style={S.li}>Aufgerufene Seite</li>
          <li style={S.li}>Browser-Typ und -Version</li>
          <li style={S.li}>Betriebssystem</li>
        </ul>
        <p style={S.p}>
          Diese Daten werden zur Sicherstellung des Betriebs erhoben und nach
          kurzer Zeit automatisch gelöscht. Rechtsgrundlage ist Art. 6 Abs. 1
          lit. f DSGVO (berechtigtes Interesse an einem sicheren und stabilen
          Betrieb der Website).
        </p>
        <p style={S.p}>
          Vercel verarbeitet Daten ggf. in den USA. Es besteht ein
          Angemessenheitsbeschluss der EU-Kommission (EU-U.S. Data Privacy
          Framework). Weitere Informationen:{" "}
          <a
            href="https://vercel.com/legal/privacy-policy"
            target="_blank"
            rel="noopener noreferrer"
            style={S.a}
          >
            vercel.com/legal/privacy-policy
          </a>
        </p>

        <h2 style={S.h2}>4. Webanalyse (Umami)</h2>
        <p style={S.p}>
          Wir verwenden Umami, eine datenschutzfreundliche, selbst gehostete
          Webanalyse-Software. Umami erhebt ausschließlich anonymisierte
          Nutzungsdaten:
        </p>
        <ul style={S.ul}>
          <li style={S.li}>Seitenaufrufe (welche Seiten besucht werden)</li>
          <li style={S.li}>Referrer (woher Besucher kommen)</li>
          <li style={S.li}>
            Land (aus der IP-Adresse abgeleitet, IP wird nicht gespeichert)
          </li>
          <li style={S.li}>Gerätetyp, Browser, Betriebssystem</li>
        </ul>
        <p style={S.p}>
          Umami setzt <strong style={S.strong}>keine Cookies</strong> und
          speichert{" "}
          <strong style={S.strong}>keine IP-Adressen</strong> oder andere
          personenbezogene Daten. Es werden keine Daten an Dritte weitergegeben.
          Die Daten werden auf unserem eigenen Server in der EU verarbeitet.
        </p>
        <p style={S.p}>
          Rechtsgrundlage ist Art. 6 Abs. 1 lit. f DSGVO (berechtigtes Interesse
          an der Analyse der Website-Nutzung zur Verbesserung des Angebots).
          Aufgrund der vollständigen Anonymisierung ist kein Cookie-Banner
          erforderlich.
        </p>

        <h2 style={S.h2}>5. Google Search Console</h2>
        <p style={S.p}>
          Wir nutzen die Google Search Console, um die Sichtbarkeit der Website
          in den Google-Suchergebnissen zu analysieren. Die Search Console
          verarbeitet keine Daten auf dieser Website und setzt keine Cookies. Die
          Daten (Suchanfragen, Klicks, Impressionen) werden von Google erhoben
          und uns in aggregierter Form bereitgestellt. Weitere Informationen:{" "}
          <a
            href="https://policies.google.com/privacy"
            target="_blank"
            rel="noopener noreferrer"
            style={S.a}
          >
            policies.google.com/privacy
          </a>
        </p>

        <h2 style={S.h2}>6. Google Fonts</h2>
        <p style={S.p}>
          Diese Website nutzt Web-Fonts von Google (DM Sans, JetBrains Mono). Die
          Fonts werden beim Seitenaufruf von Google-Servern geladen, wobei deine
          IP-Adresse an Google übermittelt wird. Rechtsgrundlage ist Art. 6 Abs.
          1 lit. f DSGVO (berechtigtes Interesse an einer einheitlichen
          Darstellung). Weitere Informationen:{" "}
          <a
            href="https://policies.google.com/privacy"
            target="_blank"
            rel="noopener noreferrer"
            style={S.a}
          >
            policies.google.com/privacy
          </a>
        </p>
        <p style={S.p}>
          Alternativ können die Fonts lokal eingebunden werden, um die Verbindung
          zu Google-Servern zu vermeiden. Dies ist für eine zukünftige Version
          geplant.
        </p>

        <h2 style={S.h2}>7. Keine Cookies</h2>
        <p style={S.p}>
          Diese Website setzt keine Cookies — weder eigene noch von
          Drittanbietern. Es gibt daher keinen Cookie-Banner.
        </p>

        <h2 style={S.h2}>8. Lokale Datenspeicherung</h2>
        <p style={S.p}>
          Der PV-Rechner verarbeitet alle Eingaben ausschließlich lokal in deinem
          Browser. Es werden keine Daten an Server übermittelt, gespeichert oder
          weitergegeben. Wenn du den Browser schließt, sind alle Eingaben weg.
        </p>

        <h2 style={S.h2}>9. Kontakt per E-Mail</h2>
        <p style={S.p}>
          Wenn du uns per E-Mail kontaktierst, werden die von dir mitgeteilten
          Daten (E-Mail-Adresse, Inhalt der Nachricht) zum Zweck der Bearbeitung
          deiner Anfrage gespeichert. Diese Daten werden nicht ohne deine
          Einwilligung weitergegeben. Rechtsgrundlage ist Art. 6 Abs. 1 lit. b
          DSGVO (vorvertragliche Maßnahmen) bzw. lit. f (berechtigtes Interesse
          an der Beantwortung von Anfragen).
        </p>

        <h2 style={S.h2}>10. Deine Rechte</h2>
        <p style={S.p}>Du hast jederzeit das Recht auf:</p>
        <ul style={S.ul}>
          <li style={S.li}>
            Auskunft über deine gespeicherten Daten (Art. 15 DSGVO)
          </li>
          <li style={S.li}>
            Berichtigung unrichtiger Daten (Art. 16 DSGVO)
          </li>
          <li style={S.li}>Löschung deiner Daten (Art. 17 DSGVO)</li>
          <li style={S.li}>
            Einschränkung der Verarbeitung (Art. 18 DSGVO)
          </li>
          <li style={S.li}>
            Widerspruch gegen die Verarbeitung (Art. 21 DSGVO)
          </li>
          <li style={S.li}>Datenübertragbarkeit (Art. 20 DSGVO)</li>
        </ul>
        <p style={S.p}>
          Zur Ausübung deiner Rechte wende dich an: [DEINE@EMAIL.DE]
        </p>
        <p style={S.p}>
          Darüber hinaus hast du das Recht, dich bei einer
          Datenschutz-Aufsichtsbehörde zu beschweren (Art. 77 DSGVO).
        </p>

        <h2 style={S.h2}>11. Änderungen</h2>
        <p style={S.p}>
          Diese Datenschutzerklärung kann gelegentlich aktualisiert werden, um
          Änderungen an der Website oder rechtlichen Anforderungen zu
          entsprechen.
        </p>
        <p style={S.muted}>Stand: März 2026</p>

        <div style={S.footer}>
          <Link href="/impressum" style={S.footerLink}>
            Impressum
          </Link>
          <Link href="/" style={S.footerLink}>
            Solar Check
          </Link>
        </div>
      </div>
    </div>
  );
}
