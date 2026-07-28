import { Metadata } from "next";
import Link from "next/link";
import Breadcrumb from "../../../components/Breadcrumb";
import ContactPerson from "../../../components/ContactPerson";
import DataSourceList from "../../../components/DataSourceList";
import ObfuscatedEmail from "../../../components/ObfuscatedEmail";
import { v, space } from "../../../lib/theme";
import { pageMetadata } from "../../../lib/seo";
import { OWN_WORK_LICENSE } from "../../../lib/license";

export const metadata: Metadata = pageMetadata({
  path: "/ueber",
  title: "Über Solar Check – wer dahintersteht und wie gerechnet wird",
  description:
    "Wer Solar Check betreibt, wie die Rechner rechnen, welche Datenquellen dahinterstehen und wie du uns erreichst.",
  ogImageTitle: "Über Solar Check",
  ogImageSubtitle: "Wer dahintersteht und wie gerechnet wird.",
});

const S: Record<string, React.CSSProperties> = {
  page: {
    background: v("--color-bg"),
    fontFamily: v("--font-text"),
    color: v("--color-text-primary"),
    minHeight: "100vh",
    padding: "0 16px 20px",
  },
  wrap: { maxWidth: v("--content-max-width"), margin: "0 auto", paddingTop: "var(--content-lede-top)" },
  h1: {
    fontSize: v("--font-size-h1"),
    fontWeight: 800,
    letterSpacing: "-0.02em",
    color: v("--color-text-primary"),
    lineHeight: 1.2,
    marginBottom: space.xxl,
  },
  h2: {
    fontSize: v("--font-size-h2"),
    fontWeight: 700,
    color: v("--color-text-primary"),
    marginTop: space.xxxl,
    marginBottom: space.md,
  },
  p: {
    fontSize: v("--font-size-body"),
    color: v("--color-text-muted"),
    lineHeight: 1.7,
    marginBottom: space.lg,
  },
  lead: {
    fontSize: v("--font-size-lead"),
    color: v("--color-text-secondary"),
    lineHeight: 1.65,
    marginBottom: space.xxl,
  },
  a: { color: v("--color-accent"), textDecoration: "none" },
  person: { margin: `${space.xl}px 0 ${space.xxl}px` },
  liste: { margin: `0 0 ${space.lg}px`, paddingLeft: space.xxl },
  li: {
    fontSize: v("--font-size-body"),
    color: v("--color-text-muted"),
    lineHeight: 1.7,
    marginBottom: space.sm,
  },
};

export default function UeberPage() {
  return (
    <div style={S.page}>
      <div style={S.wrap}>
        <Breadcrumb items={[{ label: "Start", href: "/" }, { label: "Über Solar Check" }]} jsonLd />

        <h1 style={S.h1}>Über Solar Check</h1>

        <p style={S.lead}>
          Solar Check rechnet aus, ob sich eine Photovoltaikanlage, ein Balkonkraftwerk, eine
          Wärmepumpe oder eine Klimaanlage im eigenen Haushalt lohnt, und stellt Daten zur
          Stromerzeugung in Deutschland dar. Das Ergebnis erscheint sofort, ohne Registrierung und
          ohne dass wir dafür Kontaktdaten abfragen.
        </p>

        <h2 style={S.h2}>Verantwortlich</h2>
        <p style={S.p}>
          Solar Check wird von Sebastian Schäder betrieben. Er ist auch verantwortlich für den
          Inhalt nach § 18 Absatz 2 des Medienstaatsvertrags; die vollständige Anbieterkennzeichnung
          steht im{" "}
          <Link href="/impressum" style={S.a}>
            Impressum
          </Link>
          .
        </p>
        <div style={S.person}>
          <ContactPerson note="Für Rückfragen, Korrekturen und Auswertungen ist eine Person zuständig — ich beantworte Anfragen selbst." />
        </div>
        <p style={S.p}>
          Direkter Kontakt:{" "}
          <ObfuscatedEmail user="hey" domain="solar-check.io" style={{ ...S.a, fontWeight: 600 }} />{" "}
          oder über das{" "}
          <Link href="/kontakt" style={S.a}>
            Kontaktformular
          </Link>
          .
        </p>

        <h2 style={S.h2}>Wie gerechnet wird</h2>
        <p style={S.p}>
          Alle Rechner arbeiten auf derselben Grundlage: dasselbe Verbrauchsmodell, derselbe
          Strompreispfad, dieselbe Ertragsprognose für den jeweiligen Standort. Die Annahmen sind im
          Ergebnis sichtbar und lassen sich überschreiben, wenn du eigene Werte hast. Wie jede Größe
          hergeleitet wird, welche Studien dahinterstehen und wo die Modelle an ihre Grenzen stoßen,
          steht ausführlich auf der{" "}
          <Link href="/methodik" style={S.a}>
            Methodik-Seite
          </Link>
          .
        </p>
        <p style={S.p}>
          Preise, Fördersätze und Vergütungen ändern sich laufend. Jeder dieser Werte hat deshalb
          ein Stand-Datum und eine Quelle, beides nachzulesen auf der Seite{" "}
          <Link href="/datenstand" style={S.a}>
            Datenstand
          </Link>
          . Ergebnisse sind Näherungswerte und keine Rechts-, Steuer- oder Anlageberatung.
        </p>

        <h2 style={S.h2}>Woher die Daten kommen</h2>
        <p style={S.p}>
          Die dargestellten Daten stammen aus öffentlichen Quellen. Wir bereiten sie auf und fassen
          sie zusammen; wo wir das tun, steht es im Quellenhinweis. Jede Quelle wird an der Stelle
          genannt, an der ihre Daten zu sehen sind — auch in einem heruntergeladenen Bild und in
          einem eingebetteten Widget.
        </p>
        <DataSourceList />

        <h2 style={S.h2}>Weiterverwenden und zitieren</h2>
        <p style={S.p}>
          Unsere Darstellungen, Berechnungen und Texte stehen unter {OWN_WORK_LICENSE.code} und
          dürfen redaktionell wie gewerblich genutzt werden. Was das genau bedeutet und wie die
          Namensnennung aussieht, steht auf der{" "}
          <Link href={OWN_WORK_LICENSE.page} style={S.a}>
            Lizenzseite
          </Link>
          . Eine Übersicht aller Charts für die Weiterverwendung gibt es unter{" "}
          <Link href="/presse" style={S.a}>
            Presse und Redaktionen
          </Link>
          .
        </p>

        <h2 style={S.h2}>Fehler melden</h2>
        <p style={S.p}>
          Wenn eine Zahl nicht stimmt oder eine Annahme fragwürdig ist, schreib uns. Wir prüfen das
          gegen die Primärquelle und korrigieren es — Hinweise auf falsche Werte sind uns
          willkommen, weil die Rechner nur so viel wert sind wie die Zahlen darin.
        </p>
        <ul style={S.liste}>
          <li style={S.li}>
            Fehler oder Anregung:{" "}
            <Link href="/kontakt" style={S.a}>
              Kontaktformular
            </Link>
          </li>
          <li style={S.li}>
            Presseanfrage oder Sonderauswertung:{" "}
            <Link href="/presse" style={S.a}>
              Presse und Redaktionen
            </Link>
          </li>
          <li style={S.li}>
            Umgang mit deinen Daten:{" "}
            <Link href="/datenschutz" style={S.a}>
              Datenschutzerklärung
            </Link>
          </li>
        </ul>
      </div>
    </div>
  );
}
