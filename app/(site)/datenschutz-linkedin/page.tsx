import { Metadata } from "next";
import Breadcrumb from "../../../components/Breadcrumb";
import { v } from "../../../lib/theme";

// Eigene Seite statt eines Abschnitts in der allgemeinen Datenschutzerklärung.
// Der Grund ist die Adressatenfrage: Betroffen sind die Besucher unserer
// LinkedIn-Seite, nicht die Besucher von solar-check.io — für die gilt hier
// kein Wort. Die allgemeine Erklärung beschreibt, wie wenig auf DIESER Website
// passiert; ein LinkedIn-Abschnitt darin vermischt zwei getrennte
// Verantwortungsbereiche und verlängert sie für alle, die er nichts angeht.
//
// Erreichbar gemacht wird die Seite über den "Über uns"-Text der
// LinkedIn-Unternehmensseite (neben dem Impressum-Link) — LinkedIn hat kein
// eigenes Feld für Datenschutzangaben des Seitenbetreibers.
//
// KEIN Suchergebnis: ein Rechtstext für LinkedIn-Besucher, der in der Suche
// nichts zu suchen hat. Deshalb nicht indexiert und nicht in der Sitemap.
export const metadata: Metadata = {
  title: "Datenschutz für unsere LinkedIn-Seite – Solar Check",
  description:
    "Angaben nach Art. 26 DSGVO zur gemeinsamen Verantwortlichkeit mit LinkedIn für die Statistiken unserer Unternehmensseite.",
  robots: { index: false, follow: false },
};

const S = {
  page: {
    background: v("--color-bg"),
    fontFamily: v("--font-text"),
    color: v("--color-text-primary"),
    minHeight: "100vh",
    padding: "0 16px 20px",
  },
  wrap: {
    maxWidth: v("--content-max-width"),
    margin: "0 auto",
    paddingTop: "var(--content-lede-top)",
  },
  h1: {
    fontSize: v("--font-size-h1"),
    fontWeight: 800,
    letterSpacing: "-0.02em",
    color: v("--color-text-primary"),
    lineHeight: 1.2,
    marginBottom: 24,
  },
  h2: {
    fontSize: v("--font-size-h2"),
    fontWeight: 700,
    color: v("--color-text-primary"),
    marginTop: 28,
    marginBottom: 10,
  },
  p: {
    fontSize: v("--font-size-body"),
    color: v("--color-text-muted"),
    lineHeight: 1.7,
    marginBottom: 12,
  },
  a: { color: v("--color-accent"), textDecoration: "none" },
  strong: { color: v("--color-text-secondary"), fontWeight: 700 },
  muted: {
    fontSize: v("--font-size-small"),
    color: v("--color-text-faint"),
    fontStyle: "italic" as const,
    marginTop: 28,
  },
};

export default function DatenschutzLinkedInPage() {
  return (
    <div style={S.page}>
      <div style={S.wrap}>
        <Breadcrumb
          items={[
            { label: "Start", href: "/" },
            { label: "Datenschutz", href: "/datenschutz" },
            { label: "LinkedIn-Seite" },
          ]}
          jsonLd
        />

        <h1 style={S.h1}>Datenschutz für unsere LinkedIn-Seite</h1>

        <p style={S.p}>
          Diese Angaben gelten für unsere Unternehmensseite auf LinkedIn (
          <a
            href="https://www.linkedin.com/company/solar-check-io"
            target="_blank"
            rel="noopener noreferrer"
            style={S.a}
          >
            linkedin.com/company/solar-check-io
          </a>
          ). Die hier beschriebene Verarbeitung findet auf den Systemen von
          LinkedIn statt. Für unsere Website gilt sie nicht — was dort passiert,
          steht in der{" "}
          <a href="/datenschutz" style={S.a}>
            allgemeinen Datenschutzerklärung
          </a>
          .
        </p>

        <h2 style={S.h2}>1. Verantwortlicher für die Seite</h2>
        <p style={S.p}>
          Sebastian Schäder
          <br />
          Albrecht-Dürer-Str. 57
          <br />
          97204 Höchberg
          <br />
          E-Mail: hey [at] solar-check.io
        </p>
        <p style={S.p}>
          Rechtsgrundlage für unseren Auftritt ist Art. 6 Abs. 1 lit. f DSGVO
          (berechtigtes Interesse an Außendarstellung und Information über unser
          Angebot). Du kannst dieser Verarbeitung jederzeit widersprechen
          (Abschnitt 6).
        </p>

        {/* Am 24.08.2026 an den Primärquellen geprüft:
              · Page Insights Joint Controller Addendum, abgerufen unter
                linkedin.com/legal/l/page-joint-controller-addendum. Wörtlich:
                "LinkedIn Ireland Unlimited Company ('LinkedIn') provides Page
                Insights to You, and You and LinkedIn are joint controllers";
                "LinkedIn will, among other things, ensure that Members are
                informed about the data being processed and support Members'
                right to access and deletion"; "the lead supervisory authority
                for data processing under this Addendum is the Irish Data
                Protection Commission".
              · Vertragspartner im EWR und Anschrift: LinkedIn User Agreement
                ("If you reside in the 'Designated Countries', you are entering
                into this Contract with LinkedIn Ireland Unlimited Company") und
                linkedin.com/help/linkedin/answer/79728 (Wilton Plaza, Wilton
                Place, Dublin 2, Ireland). */}
        <h2 style={S.h2}>2. Gemeinsame Verantwortlichkeit für Seitenstatistiken</h2>
        <p style={S.p}>
          Rufst du unsere LinkedIn-Seite auf oder interagierst du mit ihr,
          erstellt LinkedIn daraus Statistiken (sogenannte Page Insights) — etwa
          wie viele Menschen die Seite gesehen haben und aus welchen Regionen,
          Branchen oder beruflichen Funktionen sie kommen. Für diese Verarbeitung
          sind wir gemeinsam mit der{" "}
          <strong style={S.strong}>
            LinkedIn Ireland Unlimited Company, Wilton Plaza, Wilton Place,
            Dublin 2, Irland
          </strong>{" "}
          verantwortlich (Art. 26 DSGVO). Grundlage ist das{" "}
          <a
            href="https://www.linkedin.com/legal/l/page-joint-controller-addendum"
            target="_blank"
            rel="noopener noreferrer"
            style={S.a}
          >
            Page Insights Joint Controller Addendum
          </a>
          .
        </p>
        <p style={S.p}>
          <strong style={S.strong}>
            Der wesentliche Inhalt dieser Vereinbarung
          </strong>{" "}
          (Art. 26 Abs. 2 Satz 2 DSGVO): LinkedIn übernimmt die vorrangige
          Verantwortung für die Verarbeitung der Statistikdaten. LinkedIn
          informiert die betroffenen Personen über diese Verarbeitung und
          bearbeitet Anträge auf Auskunft und Löschung. Federführende
          Aufsichtsbehörde ist die irische Datenschutzkommission (Data Protection
          Commission). Deine Rechte nach Art. 15 bis 22 DSGVO in Bezug auf diese
          Statistiken machst du deshalb am wirksamsten unmittelbar gegenüber
          LinkedIn geltend — du kannst dich aber ebenso an uns wenden
          (Abschnitt 1); wir leiten dein Anliegen dann weiter.
        </p>

        {/* Bewusst KEINE Zusage "wir sehen keine einzelnen Personen": Follower,
            Kommentare und Reaktionen sind dem Seitenbetreiber namentlich
            sichtbar. Eine absolute Zusage, die ein Blick ins eigene Konto
            widerlegt, ist genau die Fehlerklasse, an der die allgemeine
            Erklärung schon mehrfach falsch war ("keine Nutzer-Accounts, keine
            Cookies" — es gab beides). */}
        <h2 style={S.h2}>3. Was wir sehen — und was nicht</h2>
        <p style={S.p}>
          Die Statistiken erhalten wir ausschließlich in zusammengefasster Form;
          einzelne Besucherinnen und Besucher können wir darin nicht erkennen.
          Sichtbar sind uns dagegen die Namen und öffentlichen Profile
          derjenigen, die unserer Seite folgen oder einen Beitrag kommentieren,
          teilen oder mit einer Reaktion versehen — so ist LinkedIn aufgebaut,
          und als Seitenbetreiber können wir das nicht abschalten. Wir führen
          diese Angaben nicht mit Daten aus anderen Quellen zusammen und
          übernehmen sie nicht in unsere Datenbank.
        </p>

        <h2 style={S.h2}>4. Nachrichten und Kommentare</h2>
        <p style={S.p}>
          Schreibst du uns über LinkedIn, verarbeiten wir deine Nachricht und die
          dabei übermittelten Profilangaben ausschließlich, um dein Anliegen zu
          beantworten. Rechtsgrundlage ist Art. 6 Abs. 1 lit. f DSGVO
          (berechtigtes Interesse an der Beantwortung von Anfragen), bei Anfragen
          zu einem Vertrag oder dessen Anbahnung Art. 6 Abs. 1 lit. b DSGVO. Für
          vertrauliche Anliegen empfehlen wir den Weg über unser{" "}
          <a href="/kontakt" style={S.a}>
            Kontaktformular
          </a>{" "}
          oder eine E-Mail.
        </p>

        {/* Drittlandbezug: linkedin.com/help/linkedin/answer/a1343190 — LinkedIn
            nennt dort BEIDES, Standardvertragsklauseln und die Zertifizierung
            nach dem EU-U.S. DPF. Deshalb steht hier "nach eigenen Angaben" und
            nicht unsere eigene Feststellung: dataprivacyframework.gov war aus
            der Entwicklungsumgebung nicht abrufbar, der Registerstatus also
            NICHT selbst im amtlichen Register geprüft (Projektregel: nie die
            Selbstauskunft des Anbieters als geprüften Status ausgeben). Beim
            nächsten Lauf des Rechtstexte-Runbooks nachholen. */}
        <h2 style={S.h2}>5. Verarbeitung durch LinkedIn selbst</h2>
        <p style={S.p}>
          Beim Besuch von LinkedIn verarbeitet LinkedIn Daten auch zu eigenen
          Zwecken, setzt eigene Cookies und wertet dein Nutzungsverhalten aus —
          unabhängig davon, ob du dort ein Konto hast. Darauf haben wir keinen
          Einfluss. LinkedIn übermittelt Daten in die USA und stützt das nach
          eigenen Angaben sowohl auf die Standardvertragsklauseln der
          EU-Kommission als auch auf seine Zertifizierung nach dem EU-U.S. Data
          Privacy Framework. Einzelheiten stehen in der{" "}
          <a
            href="https://de.linkedin.com/legal/privacy-policy"
            target="_blank"
            rel="noopener noreferrer"
            style={S.a}
          >
            Datenschutzrichtlinie von LinkedIn
          </a>
          .
        </p>

        <h2 style={S.h2}>6. Deine Rechte</h2>
        <p style={S.p}>
          Dir stehen Auskunft (Art. 15 DSGVO), Berichtigung (Art. 16), Löschung
          (Art. 17), Einschränkung der Verarbeitung (Art. 18), Widerspruch
          (Art. 21) und Datenübertragbarkeit (Art. 20) zu. Für die
          Seitenstatistiken wendest du dich damit am wirksamsten direkt an
          LinkedIn (siehe Abschnitt 2), für alles Übrige an die in Abschnitt 1
          genannte Adresse. Darüber hinaus hast du das Recht, dich bei einer
          Datenschutz-Aufsichtsbehörde zu beschweren (Art. 77 DSGVO).
        </p>

        <p style={S.muted}>Stand: August 2026</p>
      </div>
    </div>
  );
}
