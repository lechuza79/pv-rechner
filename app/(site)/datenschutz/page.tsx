import { Metadata } from "next";
import Link from "next/link";
import { IconArrowRight } from "../../../components/Icons";
import { v } from "../../../lib/theme";
import { pageMetadata } from "../../../lib/seo";

export const metadata: Metadata = pageMetadata({
  path: "/datenschutz",
  title: "Datenschutzerklärung – Solar Check",
  description:
    "Datenschutzerklärung für Solar Check. Datensparsam, ohne Verkaufsanrufe, kein Werbe-Tracking. Berechnungen laufen im Browser; nur für Standort-Ertrag und optionales Speichern werden Daten übermittelt.",
  ogImageTitle: "Datenschutz",
  ogImageSubtitle: "Datensparsam und transparent — was wir erheben und was nicht.",
});

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
          E-Mail: hey [at] solar-check.io
        </p>

        <h2 style={S.h2}>2. Grundsatz</h2>
        <p style={S.p}>
          Der Schutz deiner Daten ist uns wichtig. Diese Website wurde bewusst so
          gebaut, dass so wenig personenbezogene Daten wie möglich erhoben
          werden. Es gibt keine Verkaufsanrufe, kein Werbe-Tracking durch
          Drittanbieter und keine Werbung — du bekommst dein Ergebnis sofort,
          ohne Registrierung. Die eigentliche Berechnung läuft in deinem Browser.
          In zwei Fällen werden dennoch Daten übermittelt: für die
          standortgenaue Ertragsprognose wird deine Postleitzahl an einen
          Berechnungsdienst gesendet (Abschnitt 8), und wenn du dich freiwillig
          anmeldest, um Berechnungen zu speichern, legen wir ein Nutzerkonto an
          (Abschnitt 9). Beides ist unten transparent beschrieben.
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

        <h2 style={S.h2}>4. Google Search Console</h2>
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

        <h2 style={S.h2}>5. Reichweitenmessung (Web-Analyse)</h2>
        <p style={S.p}>
          Um zu verstehen, wie unsere Website genutzt wird — etwa welche Seiten
          aufgerufen werden und über welche Kanäle Besucher zu uns kommen —
          setzen wir Vercel Web Analytics ein, einen Dienst der Vercel Inc. Die
          Erfassung erfolgt bewusst cookiefrei: Es werden keine Cookies gesetzt
          und keine Informationen auf deinem Gerät gespeichert oder ausgelesen.
          Erhoben werden ausschließlich anonyme, aggregierte Daten wie die
          aufgerufene Seite, die ungefähre Herkunftsregion, der Gerätetyp und die
          Verweis-Quelle. Zusätzlich zählen wir anonyme Nutzungsereignisse — etwa
          dass ein Berechnungsschritt erreicht, eine Berechnung abgeschlossen oder
          ein Ergebnis geteilt wurde. In aggregierter, anonymer Form erfassen wir
          dabei einzelne gewählte Eckdaten der Berechnung (zum Beispiel die
          Anlagen- oder Speichergröße), um typische Nutzungsprofile zu verstehen.
          Diese Ereignisse enthalten keine personenbezogenen Daten, keine
          Freitext-Eingaben und keinen Bezug zu deiner Person. Es findet kein
          geräteübergreifendes Tracking statt, es werden keine Nutzerprofile
          einzelner Personen gebildet und einzelne Besucher werden nicht
          wiedererkannt.
        </p>
        <p style={S.p}>
          Da hierbei keine Informationen auf deinem Gerät gespeichert oder
          abgerufen werden, ist dafür keine Einwilligung nach § 25 TTDSG
          erforderlich und es wird kein Cookie-Banner benötigt. Rechtsgrundlage
          für die Verarbeitung ist Art. 6 Abs. 1 lit. f DSGVO (berechtigtes
          Interesse an einer datensparsamen Reichweitenmessung zur Verbesserung
          unseres Angebots). Der Erhebung kannst du jederzeit widersprechen
          (Abschnitt 11). Weitere Informationen:{" "}
          <a
            href="https://vercel.com/docs/analytics/privacy-policy"
            target="_blank"
            rel="noopener noreferrer"
            style={S.a}
          >
            vercel.com/docs/analytics/privacy-policy
          </a>
        </p>

        <h2 style={S.h2}>6. Schriftarten</h2>
        <p style={S.p}>
          Diese Website verwendet die Schriftarten DM Sans und JetBrains Mono.
          Diese werden nicht von Google-Servern geladen, sondern sind fest in die
          Website integriert und werden direkt von unserer eigenen Domain
          ausgeliefert. Es findet dabei keine Verbindung zu Google statt und es
          wird keine IP-Adresse an Google übermittelt.
        </p>

        <h2 style={S.h2}>7. Cookies</h2>
        <p style={S.p}>
          Diese Website setzt keine Tracking- oder Werbe-Cookies. Solange du dich
          nicht anmeldest, werden überhaupt keine Cookies gesetzt. Meldest du
          dich an, um Berechnungen zu speichern (siehe Abschnitt 9), wird ein
          technisch notwendiges Sitzungs-Cookie gesetzt, damit du eingeloggt
          bleibst. Dieses Cookie ist für den Anmeldevorgang erforderlich (§ 25
          Abs. 2 Nr. 2 TTDSG); ein Cookie-Banner ist dafür nicht nötig.
        </p>

        <h2 style={S.h2}>8. Standortgenaue Ertragsprognose</h2>
        <p style={S.p}>
          Für eine realistische Ertragsprognose berechnen wir den
          standortabhängigen Solarertrag. Dazu wird die von dir eingegebene
          Postleitzahl bzw. die daraus abgeleiteten Koordinaten an unseren Server
          und von dort an den Photovoltaik-Ertragsdienst PVGIS der Europäischen
          Kommission (Joint Research Centre) übermittelt. In der Live-Simulation
          werden die Koordinaten zusätzlich an den Wetterdienst Open-Meteo
          gesendet. Dabei wird technisch bedingt die IP-Adresse unseres Servers,
          nicht deine eigene, an diese Dienste übertragen. Es werden keine
          Berechnungs-Eingaben darüber hinaus weitergegeben. Rechtsgrundlage ist
          Art. 6 Abs. 1 lit. f DSGVO (berechtigtes Interesse an einer
          standortgenauen Berechnung). Abgefragte Ertragsdaten werden zur
          Beschleunigung zwischengespeichert; sie sind einem Standort, nicht
          deiner Person zugeordnet.
        </p>

        <h2 style={S.h2}>9. Nutzerkonto und gespeicherte Berechnungen</h2>
        <p style={S.p}>
          Du kannst die Website vollständig ohne Anmeldung nutzen. Möchtest du
          deine Berechnungen speichern und später wieder aufrufen, kannst du dir
          freiwillig ein Konto anlegen. Die Anmeldung erfolgt per Magic Link: Du
          gibst deine E-Mail-Adresse ein und erhältst einen Anmeldelink — ein
          Passwort ist nicht nötig. Gespeichert werden dann deine E-Mail-Adresse
          und die von dir bewusst gespeicherten Berechnungen.
        </p>
        <p style={S.p}>
          Für Anmeldung und Speicherung nutzen wir den Dienst Supabase (betrieben
          von Supabase Inc.) als Auftragsverarbeiter im Sinne von Art. 28 DSGVO.
          Die Daten werden auf einem Server innerhalb der EU (Stockholm,
          Schweden) gespeichert. Sie werden ausschließlich zur Bereitstellung
          deines Kontos und deiner gespeicherten Berechnungen verarbeitet und
          nicht zu Werbezwecken genutzt oder an Dritte verkauft. Rechtsgrundlage ist Art. 6 Abs. 1 lit.
          b DSGVO (Erfüllung des von dir gewünschten Dienstes). Du kannst dein
          Konto und alle gespeicherten Berechnungen jederzeit löschen, indem du
          dich an{" "}
          <a href="mailto:hey@solar-check.io" style={S.a}>
            hey [at] solar-check.io
          </a>{" "}
          wendest. Weitere Informationen:{" "}
          <a
            href="https://supabase.com/privacy"
            target="_blank"
            rel="noopener noreferrer"
            style={S.a}
          >
            supabase.com/privacy
          </a>
        </p>

        <h2 style={S.h2}>10. Kontakt per E-Mail</h2>
        <p style={S.p}>
          Wenn du uns per E-Mail kontaktierst, werden die von dir mitgeteilten
          Daten (E-Mail-Adresse, Inhalt der Nachricht) zum Zweck der Bearbeitung
          deiner Anfrage gespeichert. Diese Daten werden nicht ohne deine
          Einwilligung weitergegeben. Rechtsgrundlage ist Art. 6 Abs. 1 lit. b
          DSGVO (vorvertragliche Maßnahmen) bzw. lit. f (berechtigtes Interesse
          an der Beantwortung von Anfragen).
        </p>

        <h2 style={S.h2}>11. Deine Rechte</h2>
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
          Zur Ausübung deiner Rechte wende dich an: hey [at] solar-check.io
        </p>
        <p style={S.p}>
          Darüber hinaus hast du das Recht, dich bei einer
          Datenschutz-Aufsichtsbehörde zu beschweren (Art. 77 DSGVO).
        </p>

        <h2 style={S.h2}>12. Änderungen</h2>
        <p style={S.p}>
          Diese Datenschutzerklärung kann gelegentlich aktualisiert werden, um
          Änderungen an der Website oder rechtlichen Anforderungen zu
          entsprechen.
        </p>
        <p style={S.muted}>Stand: Juli 2026</p>
      </div>
    </div>
  );
}
