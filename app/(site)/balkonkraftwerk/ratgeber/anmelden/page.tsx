import { Metadata } from "next";
import Link from "next/link";
import ArticleMeta from "../../../../../components/ArticleMeta";
import Breadcrumb from "../../../../../components/Breadcrumb";
import EditorialPage from "../../../../../components/EditorialPage";
import editorial from "../../../../../components/EditorialContent.module.css";
import Faq from "../../../../../components/Faq";
import RelatedLinks from "../../../../../components/RelatedLinks";
import { balkonAnmeldenFaq } from "../../../../../lib/faq";
import { pageMetadata } from "../../../../../lib/seo";
import { v } from "../../../../../lib/theme";
import { BALKON_RECHT } from "../../../../../lib/balkon-config";
import { ANMELDE_SCHRITTE, MASTR_KATEGORIE, SOLARPAKET_ENTFALLEN } from "../../../../../lib/balkon-anmeldung";
import Fristencheck from "./Fristencheck";

export const metadata: Metadata = pageMetadata({
  path: "/balkonkraftwerk/ratgeber/anmelden",
  title: "Balkonkraftwerk anmelden: Anleitung, Frist & Fristen-Check",
  description:
    "Balkonkraftwerk anmelden — Schritt für Schritt durchs Marktstammdatenregister, mit Fristen-Check und den Stellen, an denen das Formular kippt. Beim Netzbetreiber ist seit 2024 nichts mehr zu melden.",
  ogImageTitle: "Balkonkraftwerk anmelden",
  ogImageSubtitle: "Durchs Formular, mit Frist und Fallen.",
});

// Page-specific comparison and data presentation.
const S = {
  schrittNr: {
    flexShrink: 0,
    width: 26,
    height: 26,
    borderRadius: "50%",
    background: v("--color-cta"),
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
    <EditorialPage>

        {/* Elternteil ist das THEMA, nicht die Ratgeber-Liste. Die Seite liegt
            unter /balkonkraftwerk/ — eine Krümelspur, die stattdessen „Ratgeber"
            behauptet, beschreibt eine Hierarchie, die die Adresse nicht hat.
            Google zieht bei Widerspruch die Pfad-Struktur vor, und auf einer
            Seite, deren ganzes Versprechen Ehrlichkeit ist, ist eine erfundene
            Hierarchie im strukturierten Datensatz auch inhaltlich schief.
            Der Ratgeber-Charakter geht dabei nicht verloren: Der Eintrag steht
            weiter in der Registry und damit in der Übersicht unter /ratgeber. */}
        <Breadcrumb variant="compact"
          items={[
            { label: "Start", href: "/" },
            { label: "Balkonkraftwerk", href: "/balkonkraftwerk" },
            { label: "Ratgeber", href: "/balkonkraftwerk/ratgeber" },
            { label: "Anmelden" },
          ]}
          jsonLd
        />
        <ArticleMeta
          headline="Balkonkraftwerk anmelden: Anleitung, Frist und Fristen-Check"
          description="Schritt für Schritt durchs Marktstammdatenregister, mit den Stellen, an denen es real schiefgeht."
          path="/balkonkraftwerk/ratgeber/anmelden"
          published="2026-08-16"
          modified="2026-08-16"
        />

        <h1 className={editorial.h1}>Balkonkraftwerk anmelden: einmal Register, sonst nichts</h1>
        <p className={editorial.subtitle}>
          Dass man anmelden muss, schreibt jeder. Hier steht, was im Formular zu tun ist —
          welche Kategorie, welche zwei Leistungsangaben, welches Datum. Und ein Check,
          der dir deine Frist ausrechnet.
        </p>

        <div className={editorial.hero}>
          <span className={editorial.strong}>Die kurze Antwort:</span> Eine einzige Registrierung im
          Marktstammdatenregister der Bundesnetzagentur, kostenlos, in wenigen Minuten.
          Beim Netzbetreiber ist seit Mai 2024 <span className={editorial.strong}>nichts</span> mehr
          zu melden — {SOLARPAKET_ENTFALLEN} ist entfallen. Zeit hast du einen Monat ab
          dem Tag, an dem die Module das erste Mal Strom liefern.
        </div>

        <h2 className={editorial.h2}>Wann läuft meine Frist ab?</h2>
        <p className={editorial.p}>
          Ein Monat ab Inbetriebnahme — aber nicht „plus 30 Tage". Die Frist endet an dem
          Tag des Folgemonats, der dieselbe Zahl trägt, und wenn es diesen Tag dort nicht
          gibt, am Monatsletzten. Wer am 31. Januar startet, hat bis zum 28. Februar Zeit,
          nicht bis zum 2. März.
        </p>
        <Fristencheck />
        <p className={editorial.small} style={{ marginBottom: 24 }}>
          Gerechnet nach den allgemeinen Fristenregeln des Bürgerlichen Gesetzbuchs, die
          auch für gesetzliche Fristen gelten (§§ 186 bis 188 BGB): Der Tag der
          Inbetriebnahme zählt nicht mit, die Frist endet mit Ablauf des entsprechenden
          Tages im Folgemonat. Fällt das Ende auf ein Wochenende, rechnen wir es nicht
          weiter — das Register ist rund um die Uhr erreichbar, und die knappere Rechnung
          ist die sichere.
        </p>

        <h2 className={editorial.h2}>Die Anmeldung, Schritt für Schritt</h2>
        <p className={editorial.p}>
          Fünf Schritte, und bei jedem gibt es eine Stelle, an der es typischerweise
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
                    <span className={editorial.strong} style={{ fontSize: v("--font-size-small") }}>Hier hakt es: </span>
                    {schritt.falle}
                  </div>
                )}
              </div>
            </li>
          ))}
        </ol>

        <h2 className={editorial.h2}>Wonach du im Formular suchst</h2>
        <p className={editorial.p}>
          Das Register führt die Geräte als{" "}
          <span className={editorial.strong}>{MASTR_KATEGORIE}</span> und nennt das umgangssprachliche
          Wort in derselben Zeile mit. Es gibt dafür einen eigenen, kurzen Assistenten —
          wer ihn übersieht, landet im langen Formular für Dachanlagen, mit Feldern, die
          es für ein Balkongerät gar nicht gibt.
        </p>

        <h2 className={editorial.h2}>Was 2024 wegfiel — und was nicht</h2>
        <p className={editorial.p}>
          Das Solarpaket hat die Anmeldung im Mai 2024 spürbar verkürzt: Die Meldung beim
          Netzbetreiber ist weg, und für das Gerät selbst sind nur noch wenige Angaben
          nötig. Was <span className={editorial.strong}>nicht</span> wegfiel, ist die Registrierungspflicht
          im Register und ihre Frist. Beides gilt unverändert. Wer online liest, die
          Anmeldung sei abgeschafft worden, verwechselt die beiden.
        </p>

        <h2 className={editorial.h2}>Wenn die Frist schon abgelaufen ist</h2>
        <p className={editorial.p}>
          {BALKON_RECHT.anmeldeFrist} Im Netz kursiert dazu eine hohe Bußgeld-Summe. Sie steht
          zwar im Gesetz, meint aber die Obergrenze für <span className={editorial.strong}>alle</span>
          Verstöße dieser Kategorie — gewerbliche Großanlagen eingeschlossen. Auf ein
          Balkongerät lässt sie sich nicht übertragen: Das Gesetz bemisst ein Bußgeld nach
          Bedeutung der Tat und Vorwurf, bei bloßer Fahrlässigkeit halbiert sich der Rahmen,
          und die Bundesnetzagentur nennt auf ihren Seiten zum Steckersolar selbst keine
          Summe. Wir schreiben die Zahl deshalb nicht hin.
        </p>
        <p className={editorial.p}>
          Wie häufig überhaupt Bußgelder verhängt werden, ist nicht öffentlich belegt — auch
          das oft zitierte „es wird nie verfolgt" lässt sich auf keine amtliche Quelle
          zurückführen. Praktisch bleibt es dabei: Die Registrierung lässt sich jederzeit
          nachholen, und das ist in jedem Fall besser als sie zu lassen.
        </p>

        <h2 className={editorial.h2}>Anbringen ist eine andere Frage als anmelden</h2>
        <p className={editorial.p}>
          Die Registrierung sagt nichts darüber, ob du das Gerät überhaupt montieren darfst.
          Dafür gilt seit 2024 eine eigene Regel: {BALKON_RECHT.mieteEigentum}
        </p>

        <Faq items={balkonAnmeldenFaq()} title="Häufige Fragen zur Anmeldung" currentPath="/balkonkraftwerk/ratgeber/anmelden" />

        <p className={editorial.small} style={{ marginTop: 28 }}>
          <span className={editorial.strong}>Stand:</span> Rechtliche Angaben geprüft am{" "}
          {new Date(`${BALKON_RECHT.geprueftIso}T00:00:00`).toLocaleDateString("de-DE", {
            day: "numeric", month: "long", year: "numeric",
          })}{" "}
          im Volltext von Verordnung und Gesetz. Keine Rechtsberatung — verbindlich ist die
          Auskunft der Bundesnetzagentur.
        </p>

        <RelatedLinks
          currentPath="/balkonkraftwerk/ratgeber/anmelden"
          links={[
            { href: "/balkonkraftwerk/rechner", label: "Balkonkraftwerk-Rechner", desc: "Was dein Set einbringt: Ertrag, Ersparnis und Amortisation — standortgenau, mit und ohne Speicher." },
            { href: "/photovoltaik-neigungswinkel", label: "Neigungswinkel & Ausrichtung", desc: "Warum der Winkel bei Balkon-Photovoltaik der größte Hebel ist." },
            { href: "/photovoltaik-rechner", label: "Photovoltaik-Rechner", desc: "Für das eigene Dach: Amortisation, Rendite und Eigenverbrauch." },
            { href: "/photovoltaik-foerderung", label: "Photovoltaik-Förderung", desc: "Zuschüsse in deinem Bundesland — manche Programme fördern auch Steckersolar." },
            { href: "/glossar", label: "Glossar" },
          ]}
        />

        <p className={editorial.small} style={{ marginTop: 24 }}>
          Zurück zur <Link href="/ratgeber" className={editorial.link}>Ratgeber-Übersicht</Link>.
        </p>

    </EditorialPage>
  );
}
