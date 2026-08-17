import { Metadata } from "next";
import Link from "next/link";
import ArticleMeta from "../../../components/ArticleMeta";
import Breadcrumb from "../../../components/Breadcrumb";
import Faq from "../../../components/Faq";
import RelatedLinks from "../../../components/RelatedLinks";
import { balkonAnmeldenFaq } from "../../../lib/faq";
import { pageMetadata } from "../../../lib/seo";
import { v } from "../../../lib/theme";
import { BALKON_RECHT } from "../../../lib/balkon-config";
import { ANMELDE_SCHRITTE, MASTR_KATEGORIE, SOLARPAKET_ENTFALLEN } from "../../../lib/balkon-anmeldung";
import Fristencheck from "./Fristencheck";

export const metadata: Metadata = pageMetadata({
  path: "/balkonkraftwerk-anmelden",
  title: "Balkonkraftwerk anmelden: Anleitung, Frist & Fristen-Check",
  description:
    "Balkonkraftwerk anmelden — Schritt für Schritt durchs Marktstammdatenregister, mit Fristen-Check und den Stellen, an denen das Formular kippt. Beim Netzbetreiber ist seit 2024 nichts mehr zu melden.",
  ogImageTitle: "Balkonkraftwerk anmelden",
  ogImageSubtitle: "Durchs Formular, mit Frist und Fallen.",
});

const S = {
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
    lineHeight: 1.25,
    marginBottom: 10,
  },
  subtitle: {
    fontSize: v("--font-size-lead"),
    color: v("--color-text-muted"),
    marginBottom: 24,
    lineHeight: 1.6,
  },
  h2: {
    fontSize: v("--font-size-h2"),
    fontWeight: 700,
    marginTop: 32,
    marginBottom: 10,
  },
  p: {
    fontSize: v("--font-size-body"),
    color: v("--color-text-muted"),
    lineHeight: 1.7,
    marginBottom: 12,
  },
  strong: { fontWeight: 700, color: v("--color-text-primary") },
  hero: {
    background: v("--color-bg-accent"),
    borderRadius: v("--radius-lg"),
    padding: "16px 18px",
    marginBottom: 20,
    fontSize: v("--font-size-body"),
    color: v("--color-text-primary"),
    lineHeight: 1.7,
  },
  link: { color: v("--color-accent"), textDecoration: "none", fontWeight: 600 },
  small: { fontSize: v("--font-size-small"), color: v("--color-text-muted"), lineHeight: 1.6 },
  schrittNr: {
    flexShrink: 0,
    width: 26,
    height: 26,
    borderRadius: "50%",
    background: v("--color-accent"),
    color: v("--color-text-on-accent"),
    fontFamily: v("--font-mono"),
    fontSize: v("--font-size-caption"),
    fontWeight: 700,
    display: "flex" as const,
    alignItems: "center" as const,
    justifyContent: "center" as const,
  },
};

export default function AnmeldenPage() {
  return (
    <div style={S.page}>
      <div style={S.wrap}>
        <Breadcrumb
          items={[
            { label: "Start", href: "/" },
            { label: "Ratgeber", href: "/ratgeber" },
            { label: "Balkonkraftwerk anmelden" },
          ]}
          jsonLd
        />
        <h1 style={S.h1}>Balkonkraftwerk anmelden: einmal Register, sonst nichts</h1>
        <p style={S.subtitle}>
          Dass man anmelden muss, schreibt jeder. Hier steht, was im Formular zu tun ist —
          welche Kategorie, welche zwei Leistungsangaben, welches Datum. Und ein Check,
          der dir deine Frist ausrechnet.
        </p>

        <ArticleMeta
          headline="Balkonkraftwerk anmelden: Anleitung, Frist und Fristen-Check"
          description="Schritt für Schritt durchs Marktstammdatenregister, mit den Stellen, an denen es real schiefgeht."
          path="/balkonkraftwerk-anmelden"
          published="2026-08-16"
          modified="2026-08-16"
        />

        <div style={S.hero}>
          <span style={S.strong}>Die kurze Antwort:</span> Eine einzige Registrierung im
          Marktstammdatenregister der Bundesnetzagentur, kostenlos, in wenigen Minuten.
          Beim Netzbetreiber ist seit Mai 2024 <span style={S.strong}>nichts</span> mehr
          zu melden — {SOLARPAKET_ENTFALLEN} ist entfallen. Zeit hast du einen Monat ab
          dem Tag, an dem die Module das erste Mal Strom liefern.
        </div>

        <h2 style={S.h2}>Wann läuft meine Frist ab?</h2>
        <p style={S.p}>
          Ein Monat ab Inbetriebnahme — aber nicht „plus 30 Tage". Die Frist endet an dem
          Tag des Folgemonats, der dieselbe Zahl trägt, und wenn es diesen Tag dort nicht
          gibt, am Monatsletzten. Wer am 31. Januar startet, hat bis zum 28. Februar Zeit,
          nicht bis zum 2. März.
        </p>
        <Fristencheck />
        <p style={{ ...S.small, marginBottom: 24 }}>
          Gerechnet nach den allgemeinen Fristenregeln des Bürgerlichen Gesetzbuchs, die
          auch für gesetzliche Fristen gelten (§§ 186 bis 188 BGB): Der Tag der
          Inbetriebnahme zählt nicht mit, die Frist endet mit Ablauf des entsprechenden
          Tages im Folgemonat. Fällt das Ende auf ein Wochenende, rechnen wir es nicht
          weiter — das Register ist rund um die Uhr erreichbar, und die knappere Rechnung
          ist die sichere.
        </p>

        <h2 style={S.h2}>Die Anmeldung, Schritt für Schritt</h2>
        <p style={S.p}>
          Fünf Schritte. Bei vier davon gibt es eine Stelle, an der es typischerweise
          hakt — die steht jeweils dabei.
        </p>
        <ol style={{ listStyle: "none", padding: 0, margin: "0 0 24px" }}>
          {ANMELDE_SCHRITTE.map((schritt, i) => (
            <li key={schritt.titel} style={{
              display: "flex",
              gap: 12,
              paddingBottom: 18,
              marginBottom: 18,
              borderBottom: i < ANMELDE_SCHRITTE.length - 1 ? `1px solid ${v("--color-border")}` : "none",
            }}>
              <span style={S.schrittNr} aria-hidden>{i + 1}</span>
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: v("--font-size-h3"), fontWeight: 700, marginBottom: 4, lineHeight: 1.35 }}>
                  {schritt.titel}
                </div>
                <div style={{ fontSize: v("--font-size-body"), color: v("--color-text-muted"), lineHeight: 1.7 }}>
                  {schritt.was}
                </div>
                {schritt.falle && (
                  <div style={{
                    marginTop: 8,
                    padding: "10px 12px",
                    borderRadius: v("--radius-md"),
                    background: v("--color-bg-muted"),
                    border: `1px solid ${v("--color-border")}`,
                    fontSize: v("--font-size-small"),
                    color: v("--color-text-secondary"),
                    lineHeight: 1.6,
                  }}>
                    <span style={{ ...S.strong, fontSize: v("--font-size-small") }}>Hier hakt es: </span>
                    {schritt.falle}
                  </div>
                )}
              </div>
            </li>
          ))}
        </ol>

        <h2 style={S.h2}>Warum „Balkonkraftwerk“ im Formular nicht vorkommt</h2>
        <p style={S.p}>
          Das Register kennt den Begriff nicht. Es führt die Geräte als{" "}
          <span style={S.strong}>{MASTR_KATEGORIE}</span> — wer nach dem umgangssprachlichen
          Wort sucht, findet nichts und legt am Ende eine gewöhnliche Solaranlage an. Das
          ist der lange Weg mit Feldern, die es für ein Balkongerät gar nicht gibt.
        </p>

        <h2 style={S.h2}>Was 2024 wegfiel — und was nicht</h2>
        <p style={S.p}>
          Das Solarpaket hat die Anmeldung im Mai 2024 spürbar verkürzt: Die Meldung beim
          Netzbetreiber ist weg, und für das Gerät selbst sind nur noch wenige Angaben
          nötig. Was <span style={S.strong}>nicht</span> wegfiel, ist die Registrierungspflicht
          im Register und ihre Frist. Beides gilt unverändert. Wer online liest, die
          Anmeldung sei abgeschafft worden, verwechselt die beiden.
        </p>

        <h2 style={S.h2}>Wenn die Frist schon abgelaufen ist</h2>
        <p style={S.p}>
          {BALKON_RECHT.anmeldeFrist} Der gesetzliche Bußgeldrahmen für diesen Verstoß liegt
          bei bis zu 50.000 Euro und halbiert sich, wenn nur Fahrlässigkeit vorliegt. Diese
          Zahl braucht aber Kontext, den die meisten Seiten weglassen: Sie ist die Obergrenze
          für <span style={S.strong}>alle</span> Verstöße dieser Kategorie, gewerbliche
          Großanlagen eingeschlossen. Die Bundesnetzagentur nennt sie selbst nirgends, und
          das Gesetz bemisst ein Bußgeld nach Bedeutung der Tat und Vorwurf.
        </p>
        <p style={S.p}>
          Wie häufig überhaupt Bußgelder verhängt werden, ist nicht öffentlich belegt — auch
          das oft zitierte „es wird nie verfolgt" lässt sich auf keine amtliche Quelle
          zurückführen. Praktisch bleibt es dabei: Die Registrierung lässt sich jederzeit
          nachholen, und das ist in jedem Fall besser als sie zu lassen.
        </p>

        <h2 style={S.h2}>Anbringen ist eine andere Frage als anmelden</h2>
        <p style={S.p}>
          Die Registrierung sagt nichts darüber, ob du das Gerät überhaupt montieren darfst.
          Dafür gilt seit 2024 eine eigene Regel: {BALKON_RECHT.mieteEigentum}
        </p>

        <Faq items={balkonAnmeldenFaq()} title="Häufige Fragen zur Anmeldung" currentPath="/balkonkraftwerk-anmelden" />

        <p style={{ ...S.small, marginTop: 28 }}>
          <span style={S.strong}>Stand:</span> Rechtliche Angaben geprüft am{" "}
          {new Date(`${BALKON_RECHT.geprueftIso}T00:00:00`).toLocaleDateString("de-DE", {
            day: "numeric", month: "long", year: "numeric",
          })}{" "}
          im Volltext von Verordnung und Gesetz. Keine Rechtsberatung — verbindlich ist die
          Auskunft der Bundesnetzagentur.
        </p>

        <RelatedLinks
          currentPath="/balkonkraftwerk-anmelden"
          links={[
            { href: "/balkonkraftwerk-rechner", label: "Balkonkraftwerk-Rechner", desc: "Was dein Set einbringt: Ertrag, Ersparnis und Amortisation — standortgenau, mit und ohne Speicher." },
            { href: "/photovoltaik-neigungswinkel", label: "Neigungswinkel & Ausrichtung", desc: "Warum der Winkel bei Balkon-Photovoltaik der größte Hebel ist." },
            { href: "/photovoltaik-rechner", label: "Photovoltaik-Rechner", desc: "Für das eigene Dach: Amortisation, Rendite und Eigenverbrauch." },
            { href: "/photovoltaik-foerderung", label: "Photovoltaik-Förderung", desc: "Zuschüsse in deinem Bundesland — manche Programme fördern auch Steckersolar." },
            { href: "/glossar", label: "Glossar" },
          ]}
        />

        <p style={{ ...S.small, marginTop: 24 }}>
          Zurück zur <Link href="/ratgeber" style={S.link}>Ratgeber-Übersicht</Link>.
        </p>
      </div>
    </div>
  );
}
