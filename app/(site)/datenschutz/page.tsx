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
          {/* Bewusst NICHT "in drei Fällen … alle drei": Hosting-Logfiles
              (Abschnitt 3) und Reichweitenmessung (Abschnitt 5) sind ebenfalls
              Übermittlungen. Eine abgezählte Aufzählung, die nicht alles
              abzählt, ist genau die absolute Zusage, die diese Erklärung schon
              zweimal falsch gemacht hat. */}
          In einigen Fällen werden dennoch Daten übermittelt: für die
          standortgenaue Ertragsprognose wird deine Postleitzahl an einen
          Berechnungsdienst gesendet (Abschnitt 8), wenn du dich freiwillig
          anmeldest, um Berechnungen zu speichern, legen wir ein Nutzerkonto an
          (Abschnitt 9), und wenn du uns über das Kontaktformular schreibst,
          geht deine Nachricht per E-Mail an uns (Abschnitt 10). Die wichtigsten
          Fälle sind unten einzeln beschrieben.
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
          Logfiles nicht aus, um das Verhalten einzelner Nutzer nachzuvollziehen, und
          führen sie nicht mit anderen Daten zusammen. Für den Betrieb sehen wir uns
          Fehlermeldungen und Antwortzeiten an — dabei geht es um die Funktionsfähigkeit
          der Seite, nicht um einzelne Besucher.
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
          setzen wir Vercel Web Analytics ein, einen Dienst der Vercel Inc.
          Cookies werden dabei nicht gesetzt. Ein kleines Messskript läuft in
          deinem Browser und wird dort für eine Weile zwischengespeichert; es
          liest die Adresse der Seite, auf der du gerade bist, und die Seite,
          von der du gekommen bist, und übermittelt beides. Kamst du von einer
          anderen Seite unserer eigenen Website, wird diese Angabe verworfen.
          <strong> Die Adresse übermitteln wir ohne den Teil hinter dem
          Fragezeichen</strong> — deine Postleitzahl und alles andere, was du
          eingibst, erreichen die Messung deshalb nicht. Außerdem prüft das
          Skript an einem technischen Merkmal deines Browsers, ob der Aufruf
          automatisiert ist, und misst dann gar nicht; dieser Wert wird nicht
          übertragen. Gerätetyp, Betriebssystem, Browser und ungefährer Ort
          (bis zur Stadt) werden aus dem abgeleitet, was dein Browser bei jedem
          Seitenaufruf ohnehin mitsendet — nicht aus einer Abfrage deines
          Geräts.
        </p>
        <p style={S.p}>
          Dazu zählen wir Nutzungsereignisse: dass ein Berechnungsschritt
          erreicht, eine Berechnung abgeschlossen oder ein Ergebnis geteilt
          wurde. Das sind reine Zähler — sie tragen <strong>keine
          Begleitangaben</strong>, also weder deine Eingaben noch Eckdaten
          deiner Berechnung, keine Freitexte und keinen Bezug zu deiner Person.
        </p>
        <p style={S.p}>
          Aufrufe desselben Besuchs fasst der Dienst über eine kurzlebige
          Kennung zusammen, die aus der eingehenden Anfrage berechnet und nach
          24 Stunden verworfen wird — anders ließen sich Besuche nicht von
          Seitenaufrufen unterscheiden. Darüber hinaus wirst du nicht
          wiedererkannt: kein geräteübergreifendes Tracking, keine dauerhafte
          Kennung, keine Verfolgung über andere Websites hinweg und keine
          Profile einzelner Personen. Was wir am Ende auswerten, sind Summen.
        </p>
        <p style={S.p}>
          In Links, die wir selbst verschicken — etwa in Anschreiben an
          Kommunalverwaltungen —, steht ein fester Zusatz an der Adresse, an dem
          wir erkennen, dass ein Aufruf aus einer solchen Aktion stammt. Dieser
          Zusatz ist in jedem dieser Links derselbe und enthält keine Angabe zum
          Empfänger. Weil die verlinkte Seite jeweils einen bestimmten Ort
          betrifft, lässt sich daraus allerdings ablesen, aus welcher Gemeinde
          eine unserer Seiten geöffnet wurde — das ist eine Aussage über eine
          Verwaltung, nicht über eine einzelne Person, und sie ergäbe sich aus
          der verlinkten Adresse auch ohne diesen Zusatz. Rechtsgrundlage ist
          Art. 6 Abs. 1 lit. f DSGVO (berechtigtes Interesse daran, den Erfolg
          der eigenen Ansprache beurteilen zu können). Der Erhebung kannst du
          jederzeit widersprechen (Abschnitt 12).
        </p>
        <p style={S.p}>
          Damit das Messskript laufen kann, wird kurzzeitig etwas auf deinem
          Gerät abgelegt und von dort gelesen. Eine Einwilligung ist dafür
          trotzdem nicht nötig, weil die Messung auf das beschränkt bleibt, was
          zum Betrieb dieses Angebots nötig ist (§ 25 Abs. 2 Nr. 2 TDDDG): Wir
          verkaufen keine Werbung und keine Kontaktdaten, wir verfolgen dich
          nicht über andere Websites hinweg, die Ereignisse sind bloße Zähler
          ohne Begleitangaben, und die Kennung, die einen Besuch zusammenfasst,
          lebt einen Tag. Ein Cookie-Banner wird daher nicht benötigt.
          Rechtsgrundlage für die Verarbeitung der dabei anfallenden Daten ist
          Art. 6 Abs. 1 lit. f DSGVO (berechtigtes Interesse an einer
          datensparsamen Reichweitenmessung zur Verbesserung unseres Angebots).
          Der Erhebung kannst du jederzeit widersprechen (Abschnitt 12).
          Weitere Informationen:{" "}
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

        <h2 id="cookies" style={{ ...S.h2, scrollMarginTop: 96 }}>7. Cookies</h2>
        <p style={S.p}>
          Diese Website setzt keine Tracking- oder Werbe-Cookies. Solange du den
          Anmeldevorgang nicht startest, setzen wir überhaupt keine Cookies —
          was wir unabhängig davon auf deinem Gerät ablegen, sind Einstellungen,
          die du selbst getroffen hast; sie stehen weiter unten in diesem
          Abschnitt. Startest du den Anmeldevorgang, um Berechnungen zu
          speichern (siehe Abschnitt 9), kommen Cookies dazu. Eines sichert den
          Anmeldevorgang selbst gegen Manipulation ab; es gilt höchstens 24
          Stunden, weil ein Link aus einer Mail auch dann noch funktionieren
          soll, wenn du den Browser zwischendurch geschlossen hast. Nach
          erfolgreicher Anmeldung halten dich ein oder mehrere weitere
          angemeldet —{" "}
          <strong>
            und diese enden, wenn du den Browser schließt, sofern du beim
            Anmelden nicht „Angemeldet bleiben" angehakt hast
          </strong>{" "}
          (dazu der nächste Absatz). Beim nächsten Besuch meldest du dich dann
          also neu an. Alle diese Cookies sind für den Anmeldevorgang
          erforderlich (§ 25 Abs. 2 Nr. 2 TDDDG); ein Cookie-Banner ist dafür
          nicht nötig.
        </p>
        <p style={S.p}>
          Beim Anmelden kannst du zusätzlich <strong>„Angemeldet bleiben"</strong>{" "}
          anhaken. Dann — und nur dann — bleibt die Anmeldung auf diesem Gerät
          bis zu 90 Tage nach deinem letzten Besuch bestehen, statt mit dem
          Browserfenster zu enden: Die Anmelde-Cookies bekommen diese Laufzeit,
          und dazu kommt ein weiteres Cookie, das deine Entscheidung festhält.
          Diese Verlängerung ist <em>nicht</em> unbedingt erforderlich; sie
          beruht ausschließlich auf deiner Einwilligung — § 25 Abs. 1 TDDDG für
          das Speichern und Auslesen auf deinem Gerät, Art. 6 Abs. 1 lit. a
          DSGVO dafür, dass wir dich damit bei einem späteren Besuch
          wiedererkennen und angemeldet halten. Auf keines dieser Cookies haben
          Dritte Zugriff. Das Häkchen ist nicht vorausgewählt, und du nimmst die
          Einwilligung jederzeit mit Wirkung für die Zukunft zurück, indem du
          dich abmeldest — dann löschen wir auf diesem Gerät die Anmelde-Cookies
          und das zusätzliche Cookie. Die Rechtmäßigkeit der bis dahin erfolgten
          Verarbeitung bleibt davon unberührt. Damit wir nachweisen können, wozu
          du zugestimmt hast, hält <strong>das zusätzliche Cookie</strong> fest,
          welche Fassung des Hinweises am Häkchen dir dabei vorlag; mehr als
          diese Fassungskennung steht nicht darin — insbesondere keine Kennung
          deiner Person.
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
          Dauerhaft — also auch bei einem späteren Besuch — merken wir uns im Browser-Speicher Einstellungen, die du selbst triffst: die von dir eingegebene <strong>Postleitzahl</strong> und, falls du im Solar-Atlas einen <strong>Heimatort</strong> festgelegt hast, dessen Namen samt Landkreis und Bundesland. Dazu kommt das <strong>Farbschema</strong> (hell, dunkel oder automatisch) — dieser Eintrag entsteht bei jedem Besuch, auch wenn du nie eines ausgewählt hast, und hält dann schlicht die automatische Voreinstellung fest. Klickst du im Ergebnis auf „Speichern“, ohne angemeldet zu sein, wird die Berechnung außerdem vorgemerkt, bis du dem Anmeldelink folgst; folgst du ihm nie, bleibt sie liegen, bis du den Browser-Speicher löschst. Die Postleitzahl wird für alle Rechner und für die Sonnenanzeige gemeinsam genutzt, damit du sie nur einmal eingeben musst. Diese Werte verbleiben auf deinem Gerät, werden keinem Konto und keiner Kennung zugeordnet und fließen nicht in die Reichweitenmessung ein; die Postleitzahl wird für ortsbezogene Abfragen verwendet — Standort-Ertrag, Wetter- und Klimadaten, die Sonnenanzeige und die Suche nach Förderprogrammen für deinen Ort (siehe Abschnitt 8). Du kannst die Postleitzahl in der Sonnenanzeige und den Heimatort im Solar-Atlas jederzeit wieder entfernen oder den Browser-Speicher löschen. Weil es sich um Einstellungen handelt, die du für die gewünschte Funktion selbst gesetzt hast, ist für diese Speicherung auf deinem Gerät nach § 25 Abs. 2 Nr. 2 TDDDG keine Einwilligung nötig.
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

        {/* Die Anmeldung lief bis zum 09/2026 ausschließlich über einen Link
            in der Mail. Zwei Dinge sind daran neu und BEIDE gehören in diesen
            Abschnitt, nicht nur eines: das Passwort (eine andere Kategorie
            gespeicherter Daten) und Google (ein weiterer Empfänger in einem
            Drittland, Art. 13 Abs. 1 Buchst. e und Abs. 1 Buchst. f DSGVO).

            DPF-Status von Google LLC am 02.09.2026 im amtlichen Register
            geprüft (dataprivacyframework.gov, Teilnehmersuche „Google LLC“,
            OrganizationId 5780): EU-US Certification „Active“, Non-HR-Daten
            eingeschlossen. NICHT auf privacyshield.gov prüfen — das ist der
            alte Datensatz und meldet Fehlalarme.

            Verantwortlicher auf Googles Seite ist für Nutzer im EWR die Google
            Ireland Limited; Wortlaut und Anschrift am 02.09.2026 in Googles
            Datenschutzerklärung gelesen (policies.google.com/privacy).

            RECHTSGRUNDLAGE IST lit. b, NICHT lit. a — und das ist eine
            geprüfte Entscheidung, keine Bequemlichkeit. Zwei Legal-Judges am
            02.09.2026, der zweite mit dem Auftrag, den ersten zu widerlegen.
            Der erste hielt eine Einwilligung für richtig, weil es mit
            E-Mail+Passwort eine mildere Alternative gebe (EDSA-Leitlinien
            2/2019). Der zweite hat das gekippt: Die Erforderlichkeit fragt, ob
            DERSELBE Zweck milder erreichbar ist — der Zweck ist hier ein Konto
            über die vom Nutzer SELBST gewählte Google-Identität, und den
            erreicht die Passwortanmeldung nicht. Nach der Gegenlogik wäre jede
            wählbare Option nie erforderlich, solange irgendeine Alternative
            existiert; damit wäre lit. b für jeden Dienst mit mehr als einem Weg
            unbrauchbar. Tragend ist die ZWEITE Alternative des lit. b
            (vorvertragliche Maßnahme auf Anfrage der betroffenen Person, EDSA
            2/2019 Rn. 45/46 und Beispiel 5).

            FOLGE FÜR DEN TEXT: kein Widerrufshinweis nach Art. 7 Abs. 3 und
            kein Hinweis nach Art. 13 Abs. 2 lit. c — beide gelten nur bei einer
            Einwilligung. Wer hier später auf lit. a umstellt, muss sie
            wieder aufnehmen. Und die Angabe muss ÜBERALL dieselbe sein.

            AUCH GEPRÜFT UND VERWORFEN: „Sicherheitshalber Einwilligung
            einholen" wäre nicht die vorsichtigere Wahl, sondern eine
            Falschangabe — sie verspräche einen Widerruf, der die Anmeldung
            nicht rückgängig machen kann. */}
        <h2 id="konto" style={{ ...S.h2, scrollMarginTop: 96 }}>9. Nutzerkonto und gespeicherte Berechnungen</h2>
        <p style={S.p}>
          Du kannst die Website vollständig ohne Anmeldung nutzen. Möchtest du
          deine Berechnungen speichern und später wieder aufrufen, kannst du dir
          freiwillig ein Konto anlegen. Dafür gibt es zwei Wege, und du wählst
          frei: mit deiner E-Mail-Adresse und einem selbst gewählten Passwort —
          oder über dein Google-Konto. Ohne Google bekommst du dieselben
          Funktionen; was sich unterscheidet, steht weiter unten. Zu deinem
          Konto gehören deine E-Mail-Adresse, die von dir bewusst gespeicherten
          Berechnungen und die Zeitpunkte, zu denen das Konto angelegt wurde und
          du dich zuletzt angemeldet hast; beim Weg über Google kommt dazu, was
          Google uns mitteilt (siehe unten). Dein Passwort liegt nicht im
          Klartext, sondern nur als Prüfwert, aus dem sich das Passwort nicht
          zurückrechnen lässt.
        </p>
        <p style={S.p}>
          Der Anmeldedienst führt außerdem ein Protokoll der Anmeldevorgänge —
          also Ereignisse wie Anmeldung, Abmeldung, Kontoanlage und
          Passwortänderung, jeweils mit Zeitpunkt, deiner E-Mail-Adresse und
          einer IP-Adresse. Meldest du dich mit Passwort an, ist das die
          IP-Adresse unseres Servers, nicht deine eigene; bei der Anmeldung über
          Google und bei Aufrufen aus deinem Browser heraus ist es deine. Dieses
          Protokoll dient allein der Sicherheit deines Kontos — es zeigt, ob
          jemand anderes versucht hat, hineinzukommen. Rechtsgrundlage ist
          Art. 6 Abs. 1 lit. f DSGVO (berechtigtes Interesse an einem sicheren
          Zugang). Diese Einträge legt der Anmeldedienst selbst an; sie werden
          dort nicht von allein wieder gelöscht und verschwinden auch nicht
          zusammen mit deinem Konto. Auf Anfrage löschen wir sie. Du kannst
          dieser Verarbeitung außerdem nach Art. 21 DSGVO widersprechen; schreib
          uns dazu an{" "}
          <a href="mailto:hey@solar-check.io" style={S.a}>hey [at] solar-check.io</a>.
        </p>
        <p style={S.p}>
          Beim Anlegen eines Kontos und beim Setzen eines neuen Passworts
          schicken wir dir eine E-Mail mit einem Bestätigungslink. Diese Mails
          gehen über das E-Mail-Postfach unserer Domain bei der{" "}
          <strong>ALL-INKL.COM – Neue Medien Münnich</strong> (Friedrichroda,
          Deutschland); ein Auftragsverarbeitungsvertrag besteht. Auf diesem Weg
          bleiben die Daten bei uns und unseren Dienstleistern in der
          Europäischen Union — wohin dein eigener E-Mail-Anbieter sie danach
          weiterleitet und wie lange er sie aufbewahrt, entscheidet er, nicht
          wir.
        </p>
        <p style={S.p}>
          <strong>Wenn du dich über Google anmeldest:</strong> Dein Browser
          wird zunächst an den Anmeldedienst unseres Dienstleisters Supabase und
          von dort an eine Anmeldeseite von Google weitergeleitet. Google
          erfährt dabei, dass du dich bei Solar Check anmelden möchtest, und
          verarbeitet die dabei anfallenden Verbindungsdaten, insbesondere deine
          IP-Adresse.
        </p>
        <p style={S.p}>
          Stimmst du dort zu, übermittelt Google uns deine E-Mail-Adresse, die
          Bestätigung, dass sie dir gehört, eine Kennnummer deines Google-Kontos
          und die Angaben aus deinem öffentlichen Google-Profil — üblicherweise
          deinen angezeigten Namen, Vor- und Nachnamen, die Adresse deines
          Profilbilds und deine Spracheinstellung. Welche dieser Angaben
          tatsächlich mitkommen, entscheidet Google. Wir brauchen davon nur die
          E-Mail-Adresse; die übrigen Angaben werten wir nicht aus und löschen
          sie mit deinem Konto. Ein Passwort bekommen wir nicht, und auf deine
          E-Mails, Dateien, Kontakte oder andere Inhalte deines Google-Kontos
          haben wir keinen Zugriff.
        </p>
        <p style={S.p}>
          Empfänger auf Googles Seite ist die <strong>Google Ireland Limited</strong>{" "}
          (Gordon House, Barrow Street, Dublin 4, Irland) — sie ist nach Googles
          eigener Datenschutzerklärung für Nutzer im Europäischen
          Wirtschaftsraum der Verantwortliche. Google gibt die Daten
          anschließend konzernintern auch in die USA weiter und stützt das auf
          das EU-US Data Privacy Framework, für das die Europäische Kommission
          am 10. Juli 2023 ein angemessenes Schutzniveau festgestellt hat; die
          Zertifizierung der Google LLC haben wir am 2. September 2026 im
          amtlichen Register geprüft. Google verarbeitet die Anmeldung als
          eigener Verantwortlicher nach seinen eigenen Bedingungen — wir legen
          dafür weder Zwecke noch Mittel fest und binden keine Inhalte von
          Google in unsere Seiten ein. Näheres in{" "}
          <a
            href="https://policies.google.com/privacy"
            target="_blank"
            rel="noopener noreferrer"
            style={S.a}
          >
            Googles Datenschutzerklärung
          </a>
          .
        </p>
        <p style={S.p}>
          Rechtsgrundlage für diesen Weg ist — wie für das Konto selbst —
          Art. 6 Abs. 1 lit. b DSGVO: Du forderst die Anmeldung über Google
          selbst an, und ohne die Weiterleitung lässt sich genau dieses Konto
          nicht anlegen. Wir holen dafür keine Einwilligung ein, weil wir dir
          keine Wahl vorspielen wollen, die es nicht gibt: Wer sich über Google
          anmelden möchte, kommt an Google nicht vorbei. Die echte Wahl liegt
          davor — mit E-Mail-Adresse und Passwort steht ein vollwertiger Weg
          ohne Google offen, und du erfährst das direkt am Anmeldeknopf, nicht
          erst hier. Möchtest du die Verbindung zu Google später wieder lösen,
          schreib uns; dann stellen wir dein Konto auf E-Mail und Passwort um.
          Zusätzlich kannst du die Verbindung jederzeit in den Einstellungen
          deines Google-Kontos löschen.
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
          b DSGVO (Erfüllung des von dir gewünschten Dienstes). Wir speichern
          Konto und Berechnungen so lange, wie du das Konto behältst — es gibt
          keine automatische Löschfrist, weil gespeicherte Berechnungen genau
          dafür da sind, später wieder aufgerufen zu werden. Einzelne
          Berechnungen kannst du jederzeit selbst in deinem Bereich löschen; das
          ganze Konto samt aller Berechnungen löschen wir, wenn du dich an{" "}
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
            Drittlandbezug — deshalb ein eigener Abschnitt vor der E-Mail.

            DPF-Status am 16.08.2026 direkt im amtlichen Register geprüft
            (dataprivacyframework.gov/list, Teilnehmersuche):
              · Vercel Inc. — EU-U.S. DPF "Active" (auch Swiss + UK Extension)
              · Resend      — EU-U.S. DPF "Active - Re-certification under Review",
                              Non-HR Data (auch UK Extension), nächste
                              Zertifizierung fällig 03.03.2027
            Achtung: Der Eintrag auf privacyshield.gov ist der ALTE
            Privacy-Shield-Datensatz und steht dort auf "Inactive" — wer den mit
            dem DPF-Register verwechselt, meldet einen Befund, den es nicht gibt.
            Supabase läuft NICHT über das DPF, sondern über Standardvertrags-
            klauseln (Vertragspartei Supabase Pte. Ltd., Singapur) — siehe
            Abschnitt 9 und supabase.com/legal/dpa. */}
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
          geschützten Formular). Gegen diese Verarbeitung kannst du nach Art. 21
          DSGVO Widerspruch einlegen.
        </p>
        <p style={S.p}>
          Dieselbe Abwehr läuft auf allen Schnittstellen, über die unsere Rechner
          Daten nachladen — Standort-Ertrag, Wetter- und Klimadaten, Förderprogramme,
          Strommix und die Karten des Solar-Atlas. Auch dort merkt sich unser Server
          die IP-Adresse der anfragenden Verbindung kurzzeitig im Arbeitsspeicher,
          um die Zahl der Abrufe je Verbindung zu begrenzen. Das betrifft jeden
          Aufruf einer Seite mit nachgeladenen Daten, also auch dann, wenn du kein
          Formular abschickst. Die Adresse wird nicht dauerhaft gespeichert, nicht
          mit anderen Daten zusammengeführt und spätestens mit dem Neustart der
          Serverinstanz verworfen. Rechtsgrundlage ist ebenfalls Art. 6 Abs. 1
          lit. f DSGVO (berechtigtes Interesse am stabilen Betrieb); auch hier
          steht dir das Widerspruchsrecht nach Art. 21 DSGVO zu.
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
          gespeichert, einzelne Besucher nicht wiedererkannt und keine
          Nutzerprofile gebildet. Rechtsgrundlage ist Art. 6 Abs. 1 lit. f DSGVO
          (berechtigtes Interesse an der Auslieferung der Widget-Inhalte). Die
          Speicherdauer der Logfiles entspricht Abschnitt 3 (Hosting).
        </p>
        {/* Ergänzt am 25.08.2026 mit der Einbettungs-Zählung. Der Absatz davor
            verneinte pauschal jede Nachverfolgung — eine Absolutaussage, die
            eine reine Domain-Zählung streng gelesen widerlegt hätte, obwohl
            kein Besucher wiedererkannt wird. Deshalb steht dort jetzt, was wir
            wirklich nicht tun (wiedererkennen), statt eines Wortes, das jeder
            anders auslegt. Fehlerklasse: absolute Zusage, vom eigenen Code
            widerlegt. Ein Test verbietet die alte Formel in dieser Datei und in
            der Galerie — auch im Kommentar, deshalb steht sie hier nicht. */}
        <p style={S.p}>
          Zusätzlich zählen wir, <strong>wo</strong> unsere Widgets eingebunden
          sind. Grundlage dafür ist allein die Angabe, die dein Browser beim
          Laden des Widgets von sich aus mitschickt — welche Seite es
          eingebunden hat. Wir lesen dafür nichts von deinem Gerät und führen
          in deinem Browser keinen Code aus, der uns etwas zurückmeldet.
          Gespeichert werden ausschließlich die Domain der
          einbettenden Website, die Bezeichnung des Widgets und der
          Kalendertag — also zum Beispiel „musterstadt.de, Strommix-Grafik,
          25.08.2026". Nicht gespeichert werden deine IP-Adresse, eine Kennung,
          die aufgerufene Unterseite oder eine Uhrzeit; aus diesen Angaben ist
          eine Zuordnung zu dir auch nachträglich nicht möglich. Gezählt werden
          Aufrufe, nicht Personen. Wir nutzen die Zählung, um zu sehen, ob unser
          Angebot an Städte und Gemeinden (Abschnitt 15) angenommen wird und
          welche Widgets tatsächlich eingesetzt werden. Rechtsgrundlage ist
          Art. 6 Abs. 1 lit. f DSGVO (berechtigtes Interesse daran zu erfahren,
          auf welchen Websites unsere Widgets genutzt werden); dieser
          Verarbeitung kannst du jederzeit widersprechen (Abschnitt 12).
        </p>

        {/* Der Kommunen-Outreach kam in dieser Erklärung überhaupt nicht vor,
            während das Anschreiben für „Herkunft, Zweck und Ihr
            Widerspruchsrecht" hierher verwies — der Verweis ging ins Leere. */}
        <h2 style={S.h2}>15. Anschreiben an Städte und Gemeinden</h2>
        <p style={S.p}>
          Wir schreiben Kommunen an, um ihnen die Solar-Zahlen ihres Ortes als
          fertige Meldung und als einbettbare Übersicht anzubieten. Erhoben
          werden dafür <strong>öffentlich zugängliche Kontaktdaten</strong> der
          Verwaltung: die Adresse der amtlichen Website, das dort genannte
          Kontaktformular oder Postfach, die im Impressum genannte
          Verantwortlichen-Zeile samt Funktionsbezeichnung und, sofern dort
          angegeben, eine personenbezogene Adresse der zuständigen Stelle.
          Angeschrieben werden ausschließlich Funktionspostfächer.
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
        {/* Der Versandweg und das Antwort-Postfach kamen hier gar nicht vor,
            solange die Anschreiben von Hand verschickt wurden. Mit dem
            Mailversand ist der Hoster des Postfachs ein Empfänger jeder
            Nachricht UND jeder Antwort — dieselbe Fehlerklasse wie beim
            Kontaktformular, das im August 2026 unbemerkt an ein privates
            Google-Konto ging. */}
        <p style={S.p}>
          Die Anschreiben werden über ein E-Mail-Postfach der Domain
          solar-check.io versendet und empfangen. Betrieben wird es von unserem
          Hoster <strong>ALL-INKL.COM – Neue Medien Münnich</strong>,
          Hauptstraße 68, 02742 Friedersdorf, auf Servern in Deutschland; es
          besteht ein Auftragsverarbeitungsvertrag nach Art. 28 DSGVO. Das
          Postfach wird nicht an andere Postfächer weitergeleitet (zuletzt
          geprüft am 19. August 2026).
        </p>
        <p style={S.p}>
          <strong>Antworten und Rückläufer.</strong> Antwortet eine Verwaltung,
          verarbeiten wir die Angaben, die in der Antwort stehen — regelmäßig
          also auch den Namen der schreibenden Person. Zu jeder Rückmeldung,
          auch zu automatischen wie Unzustellbarkeits-Meldungen, halten wir
          Absenderadresse, Betreff und unsere Einordnung fest, um dieselbe
          Adresse nicht erneut anzuschreiben. Der Text der Antwort selbst wird
          nicht in unsere Datenbank übernommen; er verbleibt im Postfach.
          Gespeichert wird der Bearbeitungsstand in unserer Datenbank bei
          Supabase (Einzelheiten und Drittlandbezug in Abschnitt 9); zusätzlich
          führen wir einen Versandnachweis je Aussendung mit Empfängeradresse,
          Betreff und Zeitpunkt. Rechtsgrundlage ist Art. 6 Abs. 1 lit. f DSGVO
          (berechtigtes Interesse an der Bearbeitung der eigenen Korrespondenz
          und am Nachweis, wer wann angeschrieben wurde).
        </p>
        <p style={S.p}>
          Die Kontaktdaten werden gelöscht, sobald das Vorhaben abgeschlossen
          ist.
        </p>
        <p style={S.p}>
          <strong>Widerspruch.</strong> Ein Widerspruch gegen die Ansprache
          genügt formlos an die in Abschnitt 1 genannte Adresse oder als Antwort
          auf das Anschreiben; danach erfolgt keine weitere Ansprache. Der
          Eintrag der Kommune bleibt in diesem Fall <strong>mit einem
          Sperrvermerk bestehen</strong> und wird nicht gelöscht — nur so lässt
          sich verhindern, dass dieselbe Adresse beim nächsten Durchgang wieder
          angeschrieben wird. Rechtsgrundlage dafür ist Art. 6 Abs. 1 lit. c
          DSGVO in Verbindung mit Art. 21 Abs. 3 DSGVO — wir müssen den
          Widerspruch dauerhaft beachten können; von der Löschung ist der
          Sperrvermerk deshalb ausgenommen (Art. 17 Abs. 3 lit. b DSGVO). Zu
          einem anderen Zweck wird er nicht verwendet. Das Widerspruchsrecht
          besteht ohne Begründung und jederzeit (Art. 21 Abs. 2 DSGVO); die
          übrigen Rechte — Auskunft, Berichtigung, Löschung, Einschränkung und
          Beschwerde bei einer Aufsichtsbehörde — stehen in Abschnitt 12.
        </p>

        {/* Eigener Abschnitt, obwohl Abschnitt 15 auch von Mails an Gemeinden
            handelt: Das ist der umgekehrte Fall. Dort schreiben WIR ungefragt
            an Adressen, die wir auf Amtsseiten gefunden haben (Art. 14). Hier
            trägt jemand SEINE eigene Adresse bei uns ein (Art. 13). Rechts-
            grundlage, Herkunft, Widerspruchsweg und Löschfrist sind jeweils
            andere — sie in einen Abschnitt zu ziehen hieße, eine davon falsch
            darzustellen. */}
        <h2 style={S.h2}>16. Meldungen zu einer Gemeinde (Abo)</h2>
        <p style={S.p}>
          Auf den Gemeindeseiten im Solar-Atlas und auf den Förderseiten zu einer
          Stadt oder Gemeinde kannst du dich für Meldungen zu einem Ort
          eintragen. Wir verarbeiten dafür deine{" "}
          <strong>E-Mail-Adresse</strong> und den <strong>Ort</strong>, den du
          ausgewählt hast, dazu die Zeitpunkte deiner Eintragung, deiner
          Bestätigung, einer etwaigen Abmeldung und der zuletzt versendeten
          Meldung. Welche weiteren Angaben je nach Einstiegsseite dazukommen,
          steht in den nächsten Absätzen. Einen Namen fragen wir nicht ab.
        </p>
        <p style={S.p}>
          <strong>Deine IP-Adresse speichern wir nicht am Abo.</strong> Beim
          Absenden des Formulars hält unser Server sie kurzzeitig im
          Arbeitsspeicher, um automatisierte Masseneintragungen abzuwehren (bis
          zu fünf Versuche je Stunde und Serverinstanz). Sie wird nicht in die
          Datenbank übernommen, nicht mit deinem Abo verknüpft und spätestens
          beim Neustart der Serverinstanz verworfen. Rechtsgrundlage hierfür ist
          unser berechtigtes Interesse an einem vor automatisierten Eintragungen
          geschützten Formular (Art. 6 Abs. 1 lit. f DSGVO); du kannst dieser
          Verarbeitung nach Art. 21 DSGVO widersprechen.
        </p>
        <p style={S.p}>
          Außerdem vermerken wir, <strong>auf welcher Seite du dich eingetragen
          hast</strong> — auf der Atlas-Seite zum Ort oder auf der Förderseite —
          und ob du dabei <strong>über ein Anschreiben an die Gemeinde</strong>
          gekommen bist. Beides sagt nichts über dich aus, sondern beantwortet
          eine Frage über unsere eigene Arbeit: welcher Einstieg überhaupt
          genutzt wird. Die Kennung in den Anschreiben ist in jedem Brief
          dieselbe; sie unterscheidet keine Empfänger.
        </p>
        <p style={S.p}>
          Meldest du dich auf einer Förderseite an, speichern wir zusätzlich,{" "}
          <strong>für welche Techniken du dich interessierst</strong>
          {" "}(Solaranlage, Balkonkraftwerk, Wärmepumpe). Wir nutzen die Angabe
          ausschließlich, um dir keine Meldungen zu schicken, die dich nicht
          betreffen.
        </p>
        <p style={S.p}>
          Trägst du dich auf einer Ortsseite im Solar-Atlas ein, kannst du
          angeben, dass du{" "}
          <strong>für die Stadt- oder Gemeindeverwaltung arbeitest</strong>. Die
          Angabe ist freiwillig, wir prüfen sie nicht nach, und sie entscheidet
          über nichts außer der Formulierung: Für eine Verwaltung ist dieselbe
          Zahl eine andere Nachricht als für jemanden, der über eine eigene
          Anlage nachdenkt. Lässt du das Feld leer, bekommst du die Meldung in
          der allgemeinen Fassung.
        </p>
        <p style={S.p}>
          Zum <strong>Nachweis deiner Einwilligung</strong> halten wir zwei
          weitere Angaben fest: die <strong>Fassung des Textes</strong>, den du
          beim Eintragen gelesen hast, und die Kennung, unter der unser
          Mailserver die <strong>Bestätigungsmail angenommen</strong> hat. Die
          erste sagt, wozu genau du zugestimmt hast — der Wortlaut kann sich
          später ändern, und ohne diese Angabe ließe sich nicht mehr sagen,
          welche Fassung dir vorlag. Die zweite belegt, dass die Bestätigungsmail
          wirklich hinausging. Eine Kopie der Mail selbst legen wir nicht an; ihr
          Inhalt lässt sich aus der Fassung wortgleich wiederherstellen.
        </p>
        <p style={S.p}>
          Die Anmeldung läuft im <strong>Bestätigungsverfahren</strong>: Nach dem
          Eintragen schicken wir eine E-Mail mit einem Bestätigungslink. Erst
          wenn du ihn anklickst, bekommst du Meldungen. Klickst du nicht, wird
          die Eintragung gelöscht und es folgt keine weitere E-Mail. Rechts&shy;grundlage
          ist deine <strong>Einwilligung</strong> (Art. 6 Abs. 1 lit. a DSGVO);
          die Zeitpunkte von Eintragung und Bestätigung dienen dem Nachweis,
          dass sie vorlag.
        </p>
        <p style={S.p}>
          <strong>Du kannst dich jederzeit abmelden</strong> — mit einem Klick
          am Fuß jeder Meldung, ohne Anmeldung und ohne Angabe von Gründen.
          Der Versand endet damit sofort, und deine Adresse verlässt den
          Verteiler. Der Widerruf wirkt für die Zukunft und lässt die
          Rechtmäßigkeit der bis dahin erfolgten Verarbeitung unberührt.
        </p>
        <p style={S.p}>
          <strong>Was danach bleibt, ist der Nachweis deiner Einwilligung:</strong>{" "}
          dass und wann du dich angemeldet, bestätigt und wieder abgemeldet
          hast, für welchen Ort, und mit welchem Wortlaut. Diese Angaben werden
          ausschließlich noch dafür verwendet — nicht mehr für den Versand.
          Rechtsgrundlage ist dann nicht mehr deine Einwilligung, sondern unsere
          Rechenschaftspflicht (Art. 6 Abs. 1 lit. c in Verbindung mit Art. 5
          Abs. 1 lit. a, Art. 5 Abs. 2 und Art. 7 Abs. 1 DSGVO) sowie unser
          berechtigtes Interesse an der Abwehr von Ansprüchen und Bußgeldern
          (Art. 6 Abs. 1 lit. f DSGVO).
        </p>
        <p style={S.p}>
          <strong>Gelöscht wird der Nachweis</strong> zum 31. Dezember des
          dritten Jahres nach dem Jahr, in dem wir dir zuletzt geschrieben
          haben. Diese Frist folgt den Verjährungsfristen, innerhalb derer
          Ansprüche und Bußgelder noch geltend gemacht werden können (drei
          Jahre, § 195 BGB und § 31 Abs. 2 Nr. 1 OWiG). Hast du deine Anmeldung
          nie bestätigt, löschen wir sie ohne diese Frist. Eine vorzeitige
          Löschung des Nachweises können wir nicht anbieten, solange Ansprüche
          daraus möglich sind (Art. 17 Abs. 3 Buchst. b und e DSGVO) — schreib
          uns, dann erklären wir dir deinen Fall.
        </p>
        <p style={S.p}>
          Die Meldungen versenden wir über das E-Mail-Postfach unserer Domain
          bei der ALL-INKL.COM – Neue Medien Münnich (Friedrichroda,
          Deutschland). Ein Auftragsverarbeitungsvertrag besteht; die Daten
          verlassen dabei die Europäische Union nicht. Die Eintragungen selbst
          liegen in unserer Datenbank bei Supabase (siehe Abschnitt 9) und sind
          dort ausschließlich über einen internen Zugang lesbar.
        </p>
        <p style={S.p}>
          Die Meldungen enthalten <strong>keine Zählpixel</strong> und keine
          Links, an denen wir ablesen könnten, wer sie geöffnet hat. Wir messen
          also nicht, ob und wann du eine Meldung liest. Vollständig unsichtbar
          ist ein Öffnen dennoch nicht: Die Mail zeigt oben unser Logo, und wie
          jeder Bildabruf im Netz hinterlässt dieser eine Zeile im
          Server-Protokoll (siehe Abschnitt 3). Zuordnen lässt sich diese Zeile
          trotzdem nicht: Die Bildadresse ist für alle Empfänger dieselbe und
          trägt kein Merkmal deines Abos, und deine IP-Adresse ist am Abo nicht
          gespeichert — es gibt also nichts, womit sich das Protokoll verknüpfen
          ließe. Wer auch das vermeiden möchte, stellt sein Mailprogramm so
          ein, dass es Bilder nicht automatisch lädt; die Meldung bleibt dann
          vollständig lesbar.
        </p>

        {/* Nur ein Verweis, kein eigener Abschnitt: Die LinkedIn-Angaben
            betreffen Besucher unserer LinkedIn-Seite, nicht die dieser Website.
            Sie hier auszubreiten verlängerte die Erklärung für alle, die sie
            nichts angeht. Ohne diesen Satz wäre die Unterseite allerdings eine
            Waise — erreichbar nur über LinkedIn selbst. */}
        <h2 style={S.h2}>17. Unsere Präsenz auf LinkedIn</h2>
        <p style={S.p}>
          Wir betreiben eine Unternehmensseite auf LinkedIn. Was dort verarbeitet
          wird, findet auf den Systemen von LinkedIn statt und nicht auf dieser
          Website; die Angaben dazu — insbesondere zur gemeinsamen
          Verantwortlichkeit für die Seitenstatistiken (Art. 26 DSGVO) — stehen
          gesondert unter{" "}
          <a href="/datenschutz-linkedin" style={S.a}>
            Datenschutz für unsere LinkedIn-Seite
          </a>
          .
        </p>

        <p style={S.muted}>Stand: August 2026</p>
      </div>
    </div>
  );
}
