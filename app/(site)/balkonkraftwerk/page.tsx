import { Metadata } from "next";
import Link from "next/link";
import Breadcrumb from "../../../components/Breadcrumb";
import StandNote from "../../../components/StandNote";
import RelatedLinks from "../../../components/RelatedLinks";
import { getFundingPrograms } from "../../../lib/funding-data";
import { programmeFuerTechnik } from "../../../lib/funding-programs";
import { publishedBundeslaender } from "../../../lib/atlas-cities";
import GlossaryTerm from "../../../components/GlossaryTerm";
import { pageMetadata } from "../../../lib/seo";
import { v } from "../../../lib/theme";
import { DEFAULT_BALKON_CONFIG as CFG, BALKON_RECHT } from "../../../lib/balkon-config";
import { calcBalkon } from "../../../lib/balkon";
import { PERSONEN } from "../../../lib/constants";
import { ANMELDE_FRIST_MONATE } from "../../../lib/balkon-anmeldung";

// Themen-Einstieg für den Balkon-Cluster.
//
// ZIELT BEWUSST AUF KEIN KEYWORD. „balkonkraftwerk" hat zwar 301.000 Suchen im
// Monat, aber die Suchergebnisseite besteht zu zwei Dritteln aus Shops plus drei
// Produktkarussellen (gemessen 18.08.2026, siehe docs/balkon-vergleichsseite-konzept.md).
// Dort gewinnt, wer verkauft — nicht, wer erklärt. Diese Seite ist deshalb
// Orientierung und Verteiler, kein Ranking-Versuch.
//
// UND SIE IST KEINE DÜNNE HÜLLE: Jede der drei Kernfragen bekommt hier eine
// echte, gerechnete Kurzantwort. Ein Hub, der nur Kacheln zeigt, ist genau der
// Thin Content, der im Projekt ohnehin als offener Punkt geführt wird.

export const metadata: Metadata = pageMetadata({
  path: "/balkonkraftwerk",
  title: "Balkonkraftwerk: Ertrag, Kosten und Anmeldung im Überblick",
  description:
    "Was ein Balkonkraftwerk wirklich bringt, was es kostet und wie es angemeldet wird — mit Rechner für deinen Haushalt und Anleitung fürs Marktstammdatenregister. Ohne Anmeldung, ohne Verkaufsanrufe.",
  ogImageTitle: "Balkonkraftwerk: der Überblick",
  ogImageSubtitle: "Ertrag, Kosten, Anmeldung — ehrlich gerechnet.",
});

const S = {
  page: { background: v("--color-bg"), fontFamily: v("--font-text"), color: v("--color-text-primary"), minHeight: "100vh", padding: "0 16px 20px" },
  wrap: { maxWidth: v("--content-max-width"), margin: "0 auto", paddingTop: "var(--content-lede-top)" },
  h1: { fontSize: v("--font-size-h1"), fontWeight: 800, letterSpacing: "-0.02em", lineHeight: 1.25, marginBottom: 10 },
  lede: { fontSize: v("--font-size-lead"), color: v("--color-text-muted"), marginBottom: 28, lineHeight: 1.6 },
  h2: { fontSize: v("--font-size-h2"), fontWeight: 700, marginTop: 30, marginBottom: 8 },
  p: { fontSize: v("--font-size-body"), color: v("--color-text-muted"), lineHeight: 1.7, marginBottom: 12 },
  strong: { fontWeight: 700, color: v("--color-text-primary") },
  link: { color: v("--color-accent"), textDecoration: "none", fontWeight: 600 },
  karte: {
    display: "block",
    background: v("--color-bg-accent"),
    border: `1px solid ${v("--color-border-accent")}`,
    borderRadius: v("--radius-lg"),
    padding: "16px 18px",
    marginBottom: 10,
    textDecoration: "none",
  },
  karteTitel: { fontSize: v("--font-size-h3"), fontWeight: 700, color: v("--color-text-primary"), marginBottom: 4 },
  karteText: { fontSize: v("--font-size-body"), color: v("--color-text-muted"), lineHeight: 1.6 },

  // Zwei Spalten ab 720 px: links der Einstiegstext, rechts der Weg. Der Weg
  // bekommt etwas weniger Breite — er ist die Beigabe, nicht die Hauptsache.
  hero: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(min(280px, 100%), 1fr))",
    gap: 28,
    alignItems: "start",
    marginBottom: 32,
  },
  schritte: {
    listStyle: "none",
    padding: "16px 18px",
    margin: 0,
    background: v("--color-bg-muted"),
    border: `1px solid ${v("--color-border")}`,
    borderRadius: v("--radius-lg"),
  },
  schrittLink: {
    display: "inline-block",
    marginTop: 4,
    fontSize: v("--font-size-small"),
    fontWeight: 700,
    color: v("--color-accent"),
    textDecoration: "none",
  },
  schritt: { display: "flex", gap: 12, marginBottom: 16, alignItems: "flex-start" },
  schrittNr: {
    flexShrink: 0,
    width: 26,
    height: 26,
    borderRadius: "50%",
    background: v("--color-accent"),
    color: v("--color-text-on-accent"),
    fontSize: v("--font-size-small"),
    fontWeight: 700,
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    fontFamily: v("--font-mono"),
  },
  // Der offene Schritt bekommt einen stillen Kreis statt des Akzents — er ist
  // Teil des Wegs, aber noch nicht begehbar.
  schrittNrOffen: { background: v("--color-bg-muted"), color: v("--color-text-muted") },
  schrittTitel: {
    fontSize: v("--font-size-body"),
    fontWeight: 700,
    color: v("--color-text-primary"),
    marginBottom: 2,
    display: "flex",
    alignItems: "center",
    gap: 8,
    flexWrap: "wrap" as const,
  },
  schrittText: { fontSize: v("--font-size-small"), color: v("--color-text-muted"), lineHeight: 1.6 },
  landListe: { listStyle: "none", padding: 0, margin: "0 0 16px" },
  landZeile: { display: "flex", alignItems: "baseline", gap: 8, padding: "6px 0", borderBottom: `1px solid ${v("--color-border")}` },
  landZahl: { fontSize: v("--font-size-small"), color: v("--color-text-muted"), fontFamily: v("--font-mono") },
  baldBadge: {
    fontSize: v("--font-size-caption"),
    fontWeight: 700,
    textTransform: "uppercase" as const,
    letterSpacing: "0.04em",
    color: v("--color-text-muted"),
    background: v("--color-bg-muted"),
    border: `1px solid ${v("--color-border")}`,
    borderRadius: v("--radius-md"),
    padding: "1px 6px",
  },
};

// Der Weg vom ersten Gedanken bis zum laufenden Gerät. Ein Schritt ohne `href`
// ist noch nicht gebaut und wird als solcher ausgewiesen — die Produktübersicht
// ist beschlossen, aber zurückgestellt (docs/balkon-vergleichsseite-konzept.md).
// Sie hier zu verschweigen wäre bequemer und würde die Lücke im Weg unsichtbar
// machen; sie zu versprechen wäre eine Zusage, die wir noch nicht halten.
// `link` ist bewusst NICHT der Titel: Als Ankertext zählt, wonach jemand sucht,
// nicht wie der Schritt in der Liste heißt. „Balkonkraftwerk berechnen" trägt
// das Keyword, „Bedarf rechnen" trägt gar nichts.
const SCHRITTE: { titel: string; text: string; link?: string; href?: string }[] = [
  {
    titel: "Bedarf rechnen",
    text: "Welche Set-Größe zu deinem Haushalt passt, ob sich ein Speicher trägt und wann die Anschaffung wieder drin ist.",
    link: "Balkonkraftwerk berechnen",
    href: "/balkonkraftwerk/rechner",
  },
  {
    titel: "Geräte vergleichen",
    text: "Welches konkrete Set und welcher Speicher sich für den errechneten Bedarf lohnen — mit echten Wirkungsgraden statt Datenblatt-Werten.",
  },
  {
    titel: "Anmelden",
    text: "Eine Registrierung im Marktstammdatenregister, ein Monat Zeit ab dem ersten erzeugten Strom.",
    link: "Balkonkraftwerk anmelden",
    href: "/balkonkraftwerk/ratgeber/anmelden",
  },
];

// Der Katalog kommt zur Laufzeit aus der Datenbank (Seed nur als Rückfallebene) —
// dieselbe Quelle, aus der die Förderseiten lesen. Deshalb ist die Liste unten
// keine zweite Wahrheit, sondern dieselbe, nur nach Bundesland verdichtet.
// `revalidate` wie auf den Förderseiten: Ein ausgelaufenes Programm verschwindet
// binnen einer Stunde, statt bis zum nächsten Deploy stehen zu bleiben.
export const revalidate = 3600;

export default async function BalkonkraftwerkHub() {
  // Referenzfall wie im Rechner-FAQ: Zwei-Personen-Haushalt, Standard-Set,
  // senkrecht am Südbalkon, deutscher Durchschnittsertrag. Live gerechnet —
  // kein getippter Euro-Betrag, sonst driftet die Seite vom Rechner weg.
  const haushaltKwh = PERSONEN[1].verbrauch;
  const standard = CFG.sets.find(s => s.id === "duo")!;
  const r = calcBalkon({
    setId: "duo", orientationId: "sued_gelaender", presenceId: "teils", storageId: "none",
    haushaltKwh, specificYield: CFG.specificYield, monthlyYield: null, stromPrice: CFG.stromPrice,
  });
  const eur = (n: number) => n.toLocaleString("de-DE");

  // Balkon-Programme nach Bundesland, aber NUR für Länder, die auch eine
  // Förderseite haben — ein Verweis ins Leere wäre schlechter als keiner.
  const programme = programmeFuerTechnik(await getFundingPrograms(), "balkon");
  const mitSeite = new Map(publishedBundeslaender().map(b => [b.name, b.slug]));
  const proLand = new Map<string, number>();
  for (const p of programme) {
    if (!p.bundesland || !mitSeite.has(p.bundesland)) continue;
    proLand.set(p.bundesland, (proLand.get(p.bundesland) ?? 0) + 1);
  }
  const laender = [...proLand.entries()]
    .map(([name, anzahl]) => ({ name, anzahl, slug: mitSeite.get(name)! }))
    .sort((a, b) => b.anzahl - a.anzahl || a.name.localeCompare(b.name, "de"));

  return (
    <div style={S.page}>
      <div style={S.wrap}>
        <Breadcrumb items={[{ label: "Start", href: "/" }, { label: "Balkonkraftwerk" }]} jsonLd />

        <h1 style={S.h1}>Balkonkraftwerk: was es bringt, was es kostet, was zu tun ist</h1>

        {/* Intro und Weg nebeneinander: Der Text sagt, worum es geht, die Liste
            daneben, was zu tun ist. Untereinander gestapelt las sich die Seite
            als Sammlung von Absätzen — genau die Orientierungslosigkeit, die der
            Betreiber gemeldet hat. Unter 720 px fällt es in eine Spalte, dann
            steht der Weg unter dem Text.

            Der mittlere Schritt ist als offen ausgewiesen statt verschwiegen:
            Die Produktübersicht ist beschlossen und zurückgestellt
            (docs/balkon-vergleichsseite-konzept.md). */}
        <div style={S.hero}>
          <div>
            <p style={S.lede}>
              Ein <GlossaryTerm id="steckersolar">Steckersolargerät</GlossaryTerm> ist die
              einzige Form von Photovoltaik, die auch ohne eigenes Dach funktioniert — zur
              Miete, am Geländer, im Garten. Ein Set kostet ein paar Hundert Euro und hat sich
              bei den meisten Haushalten in wenigen Jahren bezahlt gemacht.
            </p>
            <p style={{ ...S.lede, marginBottom: 0 }}>
              Was dabei zählt, ist nicht die Größe der Module, sondern wie viel von ihrem Strom
              du selbst verbrauchst.
            </p>
          </div>

          <ol style={S.schritte} aria-label="In drei Schritten zum eigenen Balkonkraftwerk">
            {SCHRITTE.map((s, i) => (
              <li key={s.titel} style={S.schritt}>
                <span aria-hidden style={{ ...S.schrittNr, ...(s.href ? null : S.schrittNrOffen) }}>{i + 1}</span>
                <div style={{ minWidth: 0 }}>
                  <div style={S.schrittTitel}>
                    {s.titel}
                    {!s.href && <span style={S.baldBadge}>in Arbeit</span>}
                  </div>
                  <div style={S.schrittText}>{s.text}</div>
                  {s.href && s.link && (
                    <Link href={s.href} style={S.schrittLink}>
                      {s.link} <span aria-hidden>›</span>
                    </Link>
                  )}
                </div>
              </li>
            ))}
          </ol>
        </div>

        <h2 style={S.h2}>Lohnt es sich?</h2>
        <p style={S.p}>
          Meistens ja, und schneller als eine Dachanlage — weil die Anschaffung klein ist.
          Ein Zwei-Personen-Haushalt mit {eur(haushaltKwh)} kWh Jahresverbrauch und einem
          Standard-Set senkrecht am Südbalkon spart rund{" "}
          <span style={S.strong}>{eur(r.savingPerYear)} € im Jahr</span>; bei {eur(standard.price)} €
          Anschaffung ist das nach etwa {r.amortYears.toFixed(1).replace(".", ",")} Jahren wieder
          drin. Entscheidend sind zwei Dinge: wie die Module hängen und wie viel Strom tagsüber
          im Haushalt gebraucht wird. {BALKON_RECHT.keineVerguetung}
        </p>
        <p style={S.p}>
          Die zweite Frage stellt sich meist gleich mit: Soll ein Speicher dazu? Er kostet
          noch einmal so viel wie die Module und hält kürzer — für den Beispielhaushalt und
          jede andere Größe ist das im Ratgeber{" "}
          <Link href="/balkonkraftwerk/ratgeber/mit-speicher" style={S.link}>
            Lohnt sich ein Balkonkraftwerk mit Speicher?
          </Link>{" "}
          durchgerechnet.
        </p>

        <h2 style={S.h2}>Was kostet es?</h2>
        <p style={S.p}>
          Zwischen {eur(CFG.sets.find(s => s.id === "single")!.price)} € für ein einzelnes Modul
          und {eur(CFG.sets.find(s => s.id === "max")!.price)} € für vier Module am selben
          800-Watt-<GlossaryTerm id="wechselrichter">Wechselrichter</GlossaryTerm>, jeweils mit
          Halterung. Ein Nachrüst-Speicher kostet zusätzlich mehr als das Set selbst — und
          rechnet sich seltener, als die Werbung nahelegt.
        </p>

        {/* Förderung. BEWUSST OHNE ZAHL UND OHNE PROGRAMMLISTE, obwohl der
            Katalog seit dem 19.08.2026 Balkonkraftwerke als eigene Technik führt
            (aktuell 38 Programme):
              1. Eine Zahl hier wäre eine zweite Quelle. Die Programme kommen zur
                 Laufzeit aus der Datenbank, der Seed ist nur Rückfallebene —
                 „38 Kommunen" auf einer statischen Seite driftet ab dem Tag,
                 an dem ein Programm ausläuft.
              2. Ohne Postleitzahl kann diese Seite ohnehin nicht sagen, was für
                 DICH gilt. Das kann der Rechner, sobald die Förderung dort
                 angeschlossen ist (Parallel-Session, eigene Abnahme).
            Was hier steht, sind die Größenordnungen — die ändern sich nicht mit
            einem einzelnen Programm. */}
        <h2 style={S.h2}>Gibt es Förderung?</h2>
        <p style={S.p}>
          Vom Bund nicht — dafür von immer mehr Städten und Gemeinden. Die Beträge sind
          klein gemessen an einer Dachanlage, fallen bei einem Set von wenigen Hundert Euro
          aber ins Gewicht: Üblich sind Pauschalen zwischen 50 und 200 € oder ein Anteil an
          den Kosten, häufig gedeckelt. Manche Kommunen fördern ausdrücklich auch Mieter.
        </p>
        {laender.length > 0 && (
          <>
            <p style={S.p}>
              In diesen Bundesländern kennen wir Programme, die Steckersolar ausdrücklich
              einschließen:
            </p>
            <ul style={S.landListe}>
              {laender.map(l => (
                <li key={l.slug} style={S.landZeile}>
                  <Link href={`/photovoltaik-foerderung/${l.slug}`} style={S.link}>{l.name}</Link>
                  <span style={S.landZahl}>
                    {l.anzahl} {l.anzahl === 1 ? "Programm" : "Programme"}
                  </span>
                </li>
              ))}
            </ul>
          </>
        )}
        <p style={S.p}>
          Ob für deinen Ort etwas dabei ist, zeigt die{" "}
          <Link href="/photovoltaik-foerderung" style={S.link}>Förder-Übersicht</Link> nach
          Bundesland und Stadt.
        </p>

        <h2 style={S.h2}>Was muss ich anmelden?</h2>
        <p style={S.p}>
          {BALKON_RECHT.anmeldung} Zeit ist ein Monat ab Inbetriebnahme, und gemeint ist der
          Tag, an dem die Module das erste Mal Strom liefern — nicht der Kauf. Die Anmeldung
          ist kostenlos und in wenigen Minuten erledigt.
        </p>

        <RelatedLinks
          title="Weiter"
          currentPath="/balkonkraftwerk"
          links={[
            { href: "/balkonkraftwerk/rechner", label: "Balkonkraftwerk berechnen", desc: "Ertrag am eigenen Standort, Ersparnis, Amortisation und die Frage, ob sich ein Speicher trägt — mit einer Empfehlung, welche Set-Größe zu dir passt." },
            { href: "/balkonkraftwerk/ratgeber/mit-speicher", label: "Lohnt sich ein Speicher?", desc: "Der Speicher ist eine eigene Rechnung: Er trägt sich nur, wo mittags viel Strom übrig bleibt — durchgerechnet für jede Haushaltsgröße." },
            { href: "/balkonkraftwerk/ratgeber/anmelden", label: "Balkonkraftwerk anmelden", desc: `Was du bereithalten musst, warum das Register das Wort „Balkonkraftwerk“ nicht kennt — und ein Check, der dir deine ${ANMELDE_FRIST_MONATE === 1 ? "Monatsfrist" : "Frist"} ausrechnet.` },
            { href: "/photovoltaik-rechner", label: "Photovoltaik-Rechner für das eigene Dach", desc: "Ein Balkonkraftwerk deckt die Grundlast. Wer eine Dachfläche hat und mehr verbraucht, holt mit einer richtigen Anlage ein Vielfaches heraus." },
            { href: "/photovoltaik-neigungswinkel", label: "Neigungswinkel & Ausrichtung", desc: "Wie viel Ertrag jede Kombination aus Neigung und Himmelsrichtung übrig lässt — der größte Hebel bei Balkon-PV." },
          ]}
        />

        {/* Stand aus der geteilten Registry, nicht handgeschrieben — sonst
            entsteht genau die Zweitkopie, die lib/__tests__/stand.test.ts
            verbietet (und die beim ersten Wächter-Lauf auseinanderliefe). */}
        <StandNote pfad="/balkonkraftwerk" style={{ marginTop: 24 }} />
      </div>
    </div>
  );
}
