import { Metadata } from "next";
import Link from "next/link";
import { ErrorBoundary } from "../../../../components/ErrorBoundary";
import Faq from "../../../../components/Faq";
import RelatedLinks from "../../../../components/RelatedLinks";
import StandNote from "../../../../components/StandNote";
import { balkonFaq } from "../../../../lib/faq";
import { pageMetadata } from "../../../../lib/seo";
import { v } from "../../../../lib/theme";
import { BALKON_RECHT, BALKON_DACH_HINWEIS_KWH, DEFAULT_BALKON_CONFIG as CFG } from "../../../../lib/balkon-config";
import Balkon from "./balkon";

export const metadata: Metadata = pageMetadata({
  path: "/balkonkraftwerk/rechner",
  title: "Balkonkraftwerk-Rechner: Ertrag & Amortisation berechnen",
  description:
    "Kostenloser Balkonkraftwerk-Rechner: Ertrag, Stromersparnis und Amortisation für dein Steckersolar-Set — standortgenau, mit und ohne Speicher. Ohne Anmeldung, ohne Verkaufsanrufe.",
  ogImageTitle: "Lohnt sich ein Balkonkraftwerk?",
  ogImageSubtitle: "Ertrag, Ersparnis & Amortisation — für Miete und Eigentum.",
});

// Textabschnitte unter dem Rechner: dieselben Tokens wie die Ratgeber-Seiten.
const S = {
  wrap: { maxWidth: v("--page-max-width"), margin: "0 auto", padding: "0 16px 32px" },
  h2: {
    fontSize: v("--font-size-h2"),
    fontWeight: 700,
    color: v("--color-text-primary"),
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
  link: { color: v("--color-accent"), textDecoration: "none", fontWeight: 600 },
};

export default function BalkonPage() {
  const standard = CFG.sets.find(s => s.id === "duo")!;
  const maxSet = CFG.sets.find(s => s.id === "max")!;

  return (
    <ErrorBoundary>
      <Balkon />

      <div style={S.wrap}>
        <h2 style={S.h2}>Was der Balkonkraftwerk-Rechner berechnet</h2>
        <p style={S.p}>
          Der Rechner beantwortet die eine Frage, an der alles hängt:{" "}
          <span style={S.strong}>Wie viel von deinem Solarstrom verbrauchst du selbst?</span>{" "}
          Denn nur dieser Teil spart Geld. {BALKON_RECHT.keineVerguetung}
        </p>
        <p style={S.p}>
          Dafür wird dein Jahr Stunde für Stunde durchgerechnet — auf der einen Seite die
          Erzeugung deiner Module am eingegebenen Standort, auf der anderen der typische
          Tagesverlauf deines Haushalts. Was in derselben Stunde erzeugt und gebraucht wird,
          zählt als Ersparnis; der Rest fließt unvergütet ins Netz. Aus dieser Bilanz kommen
          Ertrag, Amortisation, Autarkie und die Frage, ob sich ein Speicher lohnt.
        </p>

        <h2 style={S.h2}>Der Winkel ist der größte Hebel</h2>
        <p style={S.p}>
          Senkrecht am Geländer bringt gut ein Viertel weniger als flach nach Süden
          aufgeständert — bei Balkon-Photovoltaik ist das der größte einzelne Unterschied,
          größer als die Wahl des Herstellers. Wer die Module auf einer Terrasse oder einem
          Flachdach aufstellen kann, holt spürbar mehr heraus als am klassischen Balkongeländer.
          Wie stark Neigung und Himmelsrichtung zusammenwirken, zeigt die{" "}
          <Link href="/photovoltaik-neigungswinkel" style={S.link}>Ertragstabelle für Neigung
          und Ausrichtung</Link>.
        </p>

        <h2 style={S.h2}>800 Watt Einspeisung, {maxSet.moduleWp.toLocaleString("de-DE")} Wp Module</h2>
        <p style={S.p}>
          Ein Balkonkraftwerk darf höchstens {standard.inverterW} Watt ins Hausnetz speisen. Die
          Module selbst dürfen zusammen bis {maxSet.moduleWp.toLocaleString("de-DE")} Wp leisten,
          also mehr als der Wechselrichter durchlässt. Das klingt widersinnig, ist aber der
          wirtschaftlichste Aufbau: Nur die Mittagsspitze wird gekappt, morgens und abends
          kommt dafür deutlich mehr an — genau in den Stunden, in denen im Haushalt Strom
          gebraucht wird. Die Leistungskurve im Rechner zeigt diesen Effekt für jede Set-Größe.
        </p>

        <h2 style={S.h2}>Anmeldung, Miete und Eigentümergemeinschaft</h2>
        <p style={S.p}>{BALKON_RECHT.anmeldung}</p>
        <p style={S.p}>{BALKON_RECHT.mieteEigentum}</p>

        <h2 style={S.h2}>Balkonkraftwerk oder Dachanlage?</h2>
        <p style={S.p}>
          Ein Balkonkraftwerk deckt die Grundlast — Kühlschrank, Router, Standby —, nicht den
          ganzen Haushalt. Die Autarkie liegt deshalb typischerweise im niedrigen zweistelligen
          Bereich. Wer ein eigenes Dach hat und mehr als rund{" "}
          {BALKON_DACH_HINWEIS_KWH.toLocaleString("de-DE")} kWh im Jahr verbraucht, holt
          mit einer{" "}
          <Link href="/photovoltaik-rechner" style={S.link}>richtigen PV-Anlage</Link> ein
          Vielfaches heraus. Steckersolar ist die Lösung für Mietwohnungen, für Balkone ohne
          eigene Dachfläche — und für alle, die klein anfangen wollen.
        </p>

        <Faq items={balkonFaq()} title="Häufige Fragen zum Balkonkraftwerk" currentPath="/balkonkraftwerk/rechner" />

        {/* Aktualisierungsstand. Zwei Daten, weil es zwei Sachen sind: die
            Marktpreise stammen aus der Config-Prüfung, die Rechtsangaben aus dem
            Tag, an dem Gesetz und Erlass zuletzt aufgeschlagen wurden. Ein
            gemeinsames Datum wäre für eines von beiden gelogen. Welche Stände
            diese Seite trägt, steht in lib/stand.ts — dieselbe Quelle, aus der
            die Sitemap ihr `lastmod` nimmt. */}
        <StandNote pfad="/balkonkraftwerk/rechner" />

        <RelatedLinks
          currentPath="/balkonkraftwerk/rechner"
          links={[
            { href: "/photovoltaik-rechner", label: "Photovoltaik-Rechner", desc: "Für das eigene Dach: Amortisation, Rendite und Eigenverbrauch — alle Annahmen transparent editierbar." },
            { href: "/photovoltaik-neigungswinkel", label: "Neigungswinkel & Ausrichtung", desc: "Wie viel Ertrag jede Kombination aus Neigung und Himmelsrichtung übrig lässt." },
            { href: "/pv-simulation", label: "PV-Simulation", desc: "Was eine Anlage an deinem Standort gerade produziert, aus aktuellen Wetterdaten." },
            { href: "/photovoltaik-foerderung", label: "Photovoltaik-Förderung", desc: "Zuschüsse in deinem Bundesland und deiner Stadt — manche Programme fördern auch Steckersolar." },
            { href: "/glossar", label: "Glossar" },
          ]}
        />
      </div>
    </ErrorBoundary>
  );
}
