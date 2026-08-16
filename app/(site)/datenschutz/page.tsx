import { Metadata } from "next";
import Breadcrumb from "../../../components/Breadcrumb";
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
    padding: "0 16px 20px",
  },
  wrap: { maxWidth: v('--content-max-width'), margin: "0 auto", paddingTop: "var(--content-lede-top)" },
  back: {
    fontSize: v('--font-size-small'),
    color: v('--color-text-secondary'),
    textDecoration: "none",
    display: "inline-block",
    marginBottom: 24,
  },
  h1: {
    fontSize: v('--font-size-h1'),
    fontWeight: 800,
    letterSpacing: "-0.02em",
    color: v('--color-text-primary'),
    lineHeight: 1.2,
    marginBottom: 24,
  },
  h2: {
    fontSize: v('--font-size-h2'),
    fontWeight: 700,
    color: v('--color-text-primary'),
    marginTop: 28,
    marginBottom: 10,
  },
  p: {
    fontSize: v('--font-size-body'),
    color: v('--color-text-muted'),
    lineHeight: 1.7,
    marginBottom: 12,
  },
  ul: {
    fontSize: v('--font-size-body'),
    color: v('--color-text-muted'),
    lineHeight: 1.7,
    marginBottom: 12,
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
    fontSize: v('--font-size-small'),
  },
  footerLink: {
    color: v('--color-text-muted'),
    textDecoration: "none",
  },
  muted: {
    fontSize: v('--font-size-small'),
    color: v('--color-text-faint'),
    fontStyle: "italic" as const,
    marginTop: 28,
  },
};

export default function DatenschutzPage() {
  return (
    <div style={S.page}>
      <div style={S.wrap}>
        <Breadcrumb items={[{ label: "Start", href: "/" }, { label: "Datenschutz" }]} jsonLd />

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
          In drei Fällen werden dennoch Daten übermittelt: für die
          standortgenaue Ertragsprognose wird deine Postleitzahl an einen
          Berechnungsdienst gesendet (Abschnitt 8), wenn du dich freiwillig
          anmeldest, um Berechnungen zu speichern, legen wir ein Nutzerkonto an
          (Abschnitt 9), und wenn du uns über das Kontaktformular schreibst,
          geht deine Nachricht per E-Mail an uns (Abschnitt 10). Alle drei Fälle
          sind unten transparent beschrieben.
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
          abgerufen werden, ist dafür keine Einwilligung nach § 25 TDDDG
          erforderlich und es wird kein Cookie-Banner benötigt. Rechtsgrundlage
          für die Verarbeitung ist Art. 6 Abs. 1 lit. f DSGVO (berechtigtes
          Interesse an einer datensparsamen Reichweitenmessung zur Verbesserung
          unseres Angebots). Der Erhebung kannst du jederzeit widersprechen
          (Abschnitt 12). Weitere Informationen:{" "}
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
          Abs. 2 Nr. 2 TDDDG); ein Cookie-Banner ist dafür nicht nötig.
        </p>

        <p style={S.p}>
          Zusätzlich nutzt die Website den lokalen Browser-Speicher (localStorage/sessionStorage), um öffentliche Energie- und Preisdaten zwischenzuspeichern und — wenn du auf „Speichern" klickst — deine Berechnung bis zum Login vorzuhalten. Diese Einträge enthalten keine Identifier und dienen keinem Tracking; die Speicherung ist für die gewünschte Funktion erforderlich (§ 25 Abs. 2 Nr. 2 TDDDG). Du kannst sie jederzeit über die Einstellungen deines Browsers löschen.
        </p>

        <p style={S.p}>
          Ebenfalls im lokalen Browser-Speicher merken wir uns zwei Einstellungen, die du selbst triffst: die von dir eingegebene <strong>Postleitzahl</strong> und dein gewähltes <strong>Farbschema</strong> (hell, dunkel oder automatisch). Die Postleitzahl wird für alle Rechner und für die Sonnenanzeige gemeinsam genutzt, damit du sie nur einmal eingeben musst — sie bleibt auch bei einem späteren Besuch erhalten. Beide Werte verbleiben auf deinem Gerät, werden keinem Konto und keiner Kennung zugeordnet und fließen nicht in die Reichweitenmessung ein; die Postleitzahl wird ausschließlich für die Abfrage von Wetter- und Ertragsdaten für diesen Ort verwendet (siehe Abschnitt 8). Du kannst die Postleitzahl in der Sonnenanzeige jederzeit wieder entfernen oder den Browser-Speicher löschen. Rechtsgrundlage ist deine gewünschte Funktion (§ 25 Abs. 2 Nr. 2 TDDDG).
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

        {/* Das Kontaktformular kam in dieser Erklärung bis zum 15.08.2026 gar
            nicht vor: Abschnitt „Kontakt per E-Mail" beschrieb nur die direkte
            Mail, und der Versanddienstleister (Drittland) war nirgends genannt.
            Art. 13 DSGVO verlangt Empfänger bzw. Empfängerkategorien und den
            Drittlandbezug — deshalb ein eigener Abschnitt vor der E-Mail. */}
        <h2 style={S.h2}>10. Kontaktformular</h2>
        <p style={S.p}>
          Auf der Kontaktseite und in den Kontakt-Fenstern einzelner Seiten
          kannst du uns über ein Formular schreiben. Übermittelt werden dabei
          deine <strong>E-Mail-Adresse</strong>, das gewählte{" "}
          <strong>Thema</strong>, deine <strong>Nachricht</strong> und — wenn du
          ihn angibst — dein <strong>Name</strong>. E-Mail-Adresse und Nachricht
          brauchen wir zwingend, sonst lässt sich das Formular nicht absenden;
          der Name ist freiwillig. Wir verarbeiten diese Angaben, um deine
          Anfrage zu beantworten. Rechtsgrundlage ist Art. 6 Abs. 1 lit. f DSGVO
          (berechtigtes Interesse an der Beantwortung von Anfragen), bei Anfragen
          zu einem Vertrag oder dessen Anbahnung Art. 6 Abs. 1 lit. b DSGVO.
          Beiden Verarbeitungen, die wir auf das berechtigte Interesse stützen —
          der Beantwortung und der unten beschriebenen Abwehr automatisierter
          Einsendungen —, kannst du jederzeit widersprechen (Abschnitt 12).
        </p>
        <p style={S.p}>
          Für den Versand nutzen wir den E-Mail-Dienst <strong>Resend</strong>{" "}
          (Plus Five Five, Inc., 2261 Market Street #5039, San Francisco, CA
          94114, USA) als Auftragsverarbeiter nach Art. 28 DSGVO. Deine Angaben
          werden dabei in die USA übermittelt und dort technisch bedingt im
          Versandprotokoll verarbeitet. Grundlage der Übermittlung ist der
          Angemessenheitsbeschluss der EU-Kommission vom 10. Juli 2023 zum EU-US
          Data Privacy Framework; Resend ist dort als Teilnehmer gelistet.
          Zusätzlich sind in den Auftragsverarbeitungsvertrag die
          Standardvertragsklauseln der EU-Kommission einbezogen — sie tragen die
          Übermittlung auch dann, wenn die Zertifizierung entfallen sollte.
          Weitere Informationen:{" "}
          <a
            href="https://resend.com/legal/privacy-policy"
            target="_blank"
            rel="noopener noreferrer"
            style={S.a}
          >
            resend.com/legal/privacy-policy
          </a>
        </p>
        <p style={S.p}>
          In unserer Datenbank wird <strong>nichts davon gespeichert</strong>:
          Deine Nachricht landet als E-Mail im Postfach des in Abschnitt 1
          genannten Verantwortlichen und wird dort gelöscht, sobald die Anfrage
          erledigt ist und keine gesetzlichen Aufbewahrungspflichten
          entgegenstehen.
        </p>
        <p style={S.p}>
          Um automatisierte Masseneinsendungen abzuwehren, hält unser Server die
          IP-Adresse der absendenden Verbindung im Arbeitsspeicher fest und
          wertet sie ausschließlich innerhalb eines Ein-Stunden-Zeitfensters aus
          (bis zu fünf Nachrichten je Stunde und Serverinstanz). Sie wird nicht
          dauerhaft gespeichert, nicht in die E-Mail an uns übernommen und
          spätestens mit dem Neustart der Serverinstanz verworfen.
          Rechtsgrundlage hierfür ist Art. 6 Abs. 1 lit. f DSGVO (berechtigtes
          Interesse an einem funktionsfähigen, vor automatisierten Einsendungen
          geschützten Formular).
        </p>

        {/* Dieser Abschnitt stand vor dem Kontaktformular hier und beschrieb
            dieselbe Sache mit anderen Worten: „gespeichert" ohne Löschkriterium
            und mit umgekehrter Reihenfolge der Rechtsgrundlagen. Zwei
            Begründungen für denselben Vorgang sind kein Stil-, sondern ein
            Transparenzproblem — deshalb an Abschnitt 10 angeglichen. */}
        <h2 style={S.h2}>11. Kontakt per E-Mail</h2>
        <p style={S.p}>
          Schreibst du uns direkt eine E-Mail, statt das Formular zu nutzen,
          verarbeiten wir deine E-Mail-Adresse und den Inhalt deiner Nachricht
          ausschließlich, um deine Anfrage zu beantworten. Rechtsgrundlage ist
          Art. 6 Abs. 1 lit. f DSGVO (berechtigtes Interesse an der Beantwortung
          von Anfragen), bei Anfragen zu einem Vertrag oder dessen Anbahnung
          Art. 6 Abs. 1 lit. b DSGVO; auch hier kannst du der Verarbeitung
          jederzeit widersprechen (Abschnitt 12). Deine Nachricht wird gelöscht,
          sobald die Anfrage erledigt ist und keine gesetzlichen
          Aufbewahrungspflichten entgegenstehen. Eine Weitergabe an Dritte
          erfolgt nicht, außer wir sind gesetzlich dazu verpflichtet.
        </p>

        <h2 style={S.h2}>12. Deine Rechte</h2>
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

        <h2 style={S.h2}>13. Änderungen</h2>
        <p style={S.p}>
          Diese Datenschutzerklärung kann gelegentlich aktualisiert werden, um
          Änderungen an der Website oder rechtlichen Anforderungen zu
          entsprechen.
        </p>

        <h2 style={S.h2}>14. Eingebettete Widgets auf anderen Websites</h2>
        <p style={S.p}>
          Wenn du eine fremde Website besuchst, die ein solar-check.io-Widget
          einbindet (etwa eine Strommix- oder Erzeugungs-Grafik), verarbeitet
          unser Hoster Vercel deine IP-Adresse und den Referrer in
          Server-Logfiles, um dir die Inhalte des Widgets auszuliefern. Dabei
          werden keine Cookies gesetzt, keine Daten in deinem Browser
          gespeichert, kein Tracking durchgeführt und keine Nutzerprofile
          gebildet. Rechtsgrundlage ist Art. 6 Abs. 1 lit. f DSGVO
          (berechtigtes Interesse an der Auslieferung der Widget-Inhalte). Die
          Speicherdauer der Logfiles entspricht Abschnitt 3 (Hosting).
        </p>

        {/* Der Kommunen-Outreach kam in dieser Erklärung überhaupt nicht vor,
            während das Anschreiben für „Herkunft, Zweck und Ihr
            Widerspruchsrecht" hierher verwies — der Verweis ging ins Leere. */}
        <h2 style={S.h2}>15. Anschreiben an Städte und Gemeinden</h2>
        <p style={S.p}>
          Wir schreiben Kommunen an, um ihnen die Solar-Zahlen ihres Ortes als
          fertige Meldung und als einbettbare Übersicht anzubieten. Verarbeitet
          werden dafür ausschließlich <strong>öffentlich zugängliche
          Kontaktdaten</strong> der Verwaltung — die Adresse der amtlichen
          Website, das dort genannte Kontaktformular oder Postfach und, falls
          im Impressum benannt, die Funktionsbezeichnung der zuständigen Stelle.
          Quelle sind die Websites der Kommunen selbst sowie Wikidata.
          Rechtsgrundlage ist Art. 6 Abs. 1 lit. f DSGVO (berechtigtes Interesse
          an der Ansprache der zuständigen Stelle); die Herkunftsangabe erfolgt
          nach Art. 14 DSGVO im Anschreiben selbst.
        </p>
        {/* Hier stand bis zum 31.07.2026 ein Absatz über einen zählenden
            Vorschau-Link im Anschreiben. Der Link ist aus dem Anschreiben
            entfernt worden; der Absatz beschreibt jetzt den Zustand, der
            tatsächlich gilt. Der Rest des Abschnitts bleibt — er trägt Herkunft
            und Zweck der Kontaktdaten, auf die das Anschreiben verweist. */}
        <p style={S.p}>
          Die Links im Anschreiben führen unmittelbar auf die genannten Seiten
          von solar-check.io. Sie enthalten <strong>keine Kennung des
          Empfängers</strong>; ein Aufruf lässt sich damit keiner
          angeschriebenen Kommune und keiner Person zuordnen. Es werden dabei
          keine Cookies gesetzt und nichts im Browser abgelegt.
        </p>
        <p style={S.p}>
          Die Kontaktdaten werden gelöscht, sobald das Vorhaben abgeschlossen
          ist oder du widersprichst. Ein <strong>Widerspruch</strong> genügt
          formlos an die in Abschnitt 1 genannte Adresse; danach erfolgt keine
          weitere Ansprache.
        </p>

        <p style={S.muted}>Stand: August 2026</p>
      </div>
    </div>
  );
}
