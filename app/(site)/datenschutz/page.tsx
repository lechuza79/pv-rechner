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
          In einigen Fällen werden dennoch Daten übermittelt: für die
          standortgenaue Ertragsprognose wird deine Postleitzahl an einen
          Berechnungsdienst gesendet (Abschnitt 8), wenn du dich freiwillig
          anmeldest, um Berechnungen zu speichern, legen wir ein Nutzerkonto an
          (Abschnitt 9), und wenn du uns schreibst, verarbeiten wir deine
          Nachricht (Abschnitt 10). Die wichtigsten Fälle sind unten einzeln
          beschrieben.
        </p>

        <h2 style={S.h2}>3. Hosting</h2>
        <p style={S.p}>
          Diese Website wird bei Vercel Inc., 340 S Lemon Ave #4133, Walnut, CA
          91789, USA gehostet. Beim Aufruf der Website werden automatisch
          technische Daten durch den Hosting-Anbieter erhoben (sog.
          Server-Logfiles):
        </p>
        <ul style={S.ul}>
          <li style={S.li}>IP-Adresse</li>
          <li style={S.li}>Datum und Uhrzeit des Zugriffs</li>
          <li style={S.li}>Aufgerufene Seite</li>
          <li style={S.li}>Browser-Typ und -Version</li>
          <li style={S.li}>Betriebssystem</li>
        </ul>
        <p style={S.p}>
          Diese Daten werden zur Sicherstellung des Betriebs erhoben. Sie
          entstehen beim Hosting-Anbieter und werden dort nach einer vom
          gebuchten Tarif abhängigen Frist automatisch gelöscht — je nach Tarif
          zwischen einer Stunde und längstens 30 Tagen. Wir werten diese
          Logfiles nicht aus und führen sie nicht mit anderen Daten zusammen.
          Rechtsgrundlage ist Art. 6 Abs. 1
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
          Abs. 2 Nr. 2 TDDDG); ein Cookie-Banner ist dafür nicht nötig.
        </p>

        <p style={S.p}>
          Zusätzlich nutzt die Website den Browser-Speicher. Öffentliche Energie- und Preisdaten werden dort nur für die Dauer deines Besuchs zwischengespeichert, damit dieselben Zahlen nicht mehrfach geladen werden müssen; schließt du den Browser-Tab, sind sie weg. Klickst du auf „Speichern", wird deine Berechnung bis zum Login vorgehalten. Diese Einträge dienen keinem Tracking und enthalten keine Kennung, mit der sich ein Gerät wiedererkennen ließe. Du kannst sie jederzeit über die Einstellungen deines Browsers löschen.
        </p>

        <p style={S.p}>
          Bist du angemeldet, merkt sich der Browser zusätzlich für die Dauer der
          Sitzung, ob dein Konto Verwaltungsrechte hat; dabei wird deine
          Konto-Kennung mitgespeichert. Dieser Eintrag entsteht nur nach einer
          Anmeldung, verschwindet beim Schließen des Browser-Tabs und dient
          allein dazu, die Verwaltungsansicht nicht bei jedem Seitenaufruf neu
          abfragen zu müssen.
        </p>

        <p style={S.p}>
          Dauerhaft — also auch bei einem späteren Besuch — merken wir uns im Browser-Speicher nur Einstellungen, die du selbst triffst: die von dir eingegebene <strong>Postleitzahl</strong>, dein gewähltes <strong>Farbschema</strong> (hell, dunkel oder automatisch) und, falls du im Solar-Atlas einen <strong>Heimatort</strong> festgelegt hast, dessen Namen samt Landkreis und Bundesland. Die Postleitzahl wird für alle Rechner und für die Sonnenanzeige gemeinsam genutzt, damit du sie nur einmal eingeben musst. Diese Werte verbleiben auf deinem Gerät, werden keinem Konto und keiner Kennung zugeordnet und fließen nicht in die Reichweitenmessung ein; die Postleitzahl wird ausschließlich für die Abfrage von Wetter- und Ertragsdaten für diesen Ort verwendet (siehe Abschnitt 8). Du kannst die Postleitzahl in der Sonnenanzeige und den Heimatort im Solar-Atlas jederzeit wieder entfernen oder den Browser-Speicher löschen. Weil es sich um Einstellungen handelt, die du für die gewünschte Funktion selbst gesetzt hast, ist für diese Speicherung auf deinem Gerät nach § 25 Abs. 2 Nr. 2 TDDDG keine Einwilligung nötig.
        </p>

        <h2 style={S.h2}>8. Standortgenaue Ertragsprognose</h2>
        <p style={S.p}>
          Für eine realistische Ertragsprognose berechnen wir den
          standortabhängigen Solarertrag. Dazu wird die von dir eingegebene
          Postleitzahl bzw. die daraus abgeleiteten Koordinaten an unseren Server
          und von dort an den Photovoltaik-Ertragsdienst PVGIS der Europäischen
          Kommission (Joint Research Centre) übermittelt. Für die
          Live-Simulation, die Sonnenanzeige, den Klimaanlagen-Rechner und die
          Hitzewellen-Vorschau werden die Koordinaten zusätzlich an den
          Wetterdienst Open-Meteo gesendet. Dabei wird technisch bedingt die IP-Adresse unseres Servers,
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
          Für Anmeldung und Speicherung nutzen wir den Dienst Supabase als
          Auftragsverarbeiter im Sinne von Art. 28 DSGVO. Vertragspartner ist die
          Supabase Pte. Ltd. mit Sitz in Singapur; die Server stehen in der EU
          (Stockholm, Schweden). Für Zugriffe aus Singapur gelten die
          Standardvertragsklauseln der EU-Kommission (Modul 2,
          Durchführungsbeschluss (EU) 2021/914; Art. 46 Abs. 2 lit. c DSGVO).
          Eine Kopie dieser Garantien erhältst du im
          Auftragsverarbeitungsvertrag von Supabase{" "}
          <a
            href="https://supabase.com/legal/customer-resources/data-processing-addendum"
            target="_blank"
            rel="noopener noreferrer"
            style={S.a}
          >
            (supabase.com/legal)
          </a>{" "}
          oder auf Anfrage bei uns. Die Daten werden ausschließlich zur Bereitstellung
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

        {/*
          DPF-Status am 16.08.2026 direkt im amtlichen Register geprüft
          (dataprivacyframework.gov/list, Teilnehmersuche):
            · Vercel Inc. — EU-U.S. DPF "Active" (auch Swiss + UK Extension)
            · Resend      — EU-U.S. DPF "Active - Re-certification under Review",
                            Non-HR Data (auch UK Extension)
          Achtung: Der Eintrag auf privacyshield.gov ist der ALTE
          Privacy-Shield-Datensatz und steht dort auf "Inactive" — wer den mit
          dem DPF-Register verwechselt, meldet einen Befund, den es nicht gibt.
          Supabase läuft NICHT über das DPF, sondern über Standardvertrags-
          klauseln (Vertragspartei Supabase Pte. Ltd., Singapur) — siehe
          Abschnitt 9 und supabase.com/legal/dpa.
        */}
        <h2 style={S.h2}>10. Kontakt per E-Mail und Kontaktformular</h2>
        <p style={S.p}>
          Wenn du uns per E-Mail kontaktierst, werden die von dir mitgeteilten
          Daten (E-Mail-Adresse, Inhalt der Nachricht) zum Zweck der Bearbeitung
          deiner Anfrage gespeichert. Diese Daten werden nicht ohne deine
          Einwilligung weitergegeben. Rechtsgrundlage ist Art. 6 Abs. 1 lit. b
          DSGVO (vorvertragliche Maßnahmen) bzw. lit. f (berechtigtes Interesse
          an der Beantwortung von Anfragen).
        </p>
        <p style={S.p}>
          Nutzt du das Kontaktformular, werden deine E-Mail-Adresse, das gewählte
          Thema, der Nachrichtentext und — falls du ihn angibst — dein Name an
          uns übermittelt. Der Name ist freiwillig; ohne ihn können wir deine
          Anfrage genauso beantworten. Wir versenden diese Angaben als E-Mail an
          unser eigenes Postfach und nutzen dafür den Versanddienst Resend
          (Plus Five Five, Inc., San Francisco, USA) als Auftragsverarbeiter nach
          Art. 28 DSGVO. Deine Nachricht wird dabei in die USA übermittelt;
          Resend ist unter dem EU-U.S. Data Privacy Framework zertifiziert
          (Stand: August 2026), für das ein Angemessenheitsbeschluss der
          EU-Kommission besteht. Ergänzend gelten die Standardvertragsklauseln
          der EU-Kommission aus dem Auftragsverarbeitungsvertrag. Deine Nachricht
          bleibt als E-Mail in unserem Postfach und wird gelöscht, sobald die
          Anfrage erledigt ist und keine gesetzlichen Aufbewahrungspflichten
          entgegenstehen. Rechtsgrundlage ist Art. 6 Abs. 1 lit. f DSGVO
          (berechtigtes Interesse an der Beantwortung von Anfragen), bei einer
          Vertragsanbahnung lit. b.
        </p>
        <p style={S.p}>
          Um massenhaft versandte Werbenachrichten abzuwehren, wird deine
          IP-Adresse beim Absenden des Formulars im Arbeitsspeicher unseres
          Servers vermerkt und dabei gezählt, wie oft von dort abgesendet wurde.
          Absendevorgänge, die länger als eine Stunde zurückliegen, werden nicht
          mehr mitgezählt; der Vermerk selbst verschwindet spätestens, wenn der
          Serverprozess endet. Er wird nicht dauerhaft gespeichert und nicht
          deiner Nachricht zugeordnet. Rechtsgrundlage ist Art. 6 Abs. 1 lit. f
          DSGVO (berechtigtes Interesse an der Abwehr von Missbrauch).
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

        <h2 style={S.h2}>13. Eingebettete Widgets auf anderen Websites</h2>
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
        <h2 style={S.h2}>14. Anschreiben an Städte und Gemeinden</h2>
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
