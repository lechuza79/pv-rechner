import { Metadata } from "next";
import Link from "next/link";
import Breadcrumb from "../../../components/Breadcrumb";
import StandNote from "../../../components/StandNote";
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

  schritte: { listStyle: "none", padding: 0, margin: "0 0 28px" },
  schritt: { display: "flex", gap: 12, marginBottom: 14, alignItems: "flex-start" },
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
const SCHRITTE: { titel: string; text: string; href?: string }[] = [
  {
    titel: "Bedarf rechnen",
    text: "Welche Set-Größe passt zu deinem Haushalt, lohnt sich ein Speicher, und wann ist die Anschaffung wieder drin — standortgenau gerechnet.",
    href: "/balkonkraftwerk/rechner",
  },
  {
    titel: "Geräte vergleichen",
    text: "Welches konkrete Set und welcher Speicher sich für den errechneten Bedarf tragen — mit echten Wirkungsgraden statt Datenblatt-Werten.",
  },
  {
    titel: "Anmelden",
    text: "Eine Registrierung im Marktstammdatenregister, ein Monat Zeit ab dem ersten erzeugten Strom. Kostenlos, aber mit ein paar Fallen.",
    href: "/balkonkraftwerk/anmelden",
  },
];

export default function BalkonkraftwerkHub() {
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

  return (
    <div style={S.page}>
      <div style={S.wrap}>
        <Breadcrumb items={[{ label: "Start", href: "/" }, { label: "Balkonkraftwerk" }]} jsonLd />

        <h1 style={S.h1}>Balkonkraftwerk: was es bringt, was es kostet, was zu tun ist</h1>
        <p style={S.lede}>
          Ein <GlossaryTerm id="steckersolar">Steckersolargerät</GlossaryTerm> ist die einzige
          Form von Photovoltaik, die auch ohne eigenes Dach funktioniert — zur Miete, am
          Geländer, im Garten. Bis es läuft, sind es drei Schritte.
        </p>

        {/* Der Weg von der Frage bis zum laufenden Gerät. Steht ganz oben, weil
            die Seite sonst als Sammlung von Texten wirkt statt als Wegweiser —
            genau die Orientierungslosigkeit, die der Betreiber am 18.08.2026
            gemeldet hat. Der mittlere Schritt ist ehrlich als offen markiert,
            statt ihn zu verschweigen: Wer hier steht, soll wissen, dass wir die
            Produktseite planen und noch nicht haben. */}
        <ol style={S.schritte}>
          {SCHRITTE.map((s, i) => (
            <li key={s.titel} style={S.schritt}>
              <span aria-hidden style={{ ...S.schrittNr, ...(s.href ? null : S.schrittNrOffen) }}>{i + 1}</span>
              <div style={{ minWidth: 0 }}>
                <div style={S.schrittTitel}>
                  {s.href
                    ? <Link href={s.href} style={S.link}>{s.titel}</Link>
                    : <span style={{ color: v("--color-text-muted") }}>{s.titel}</span>}
                  {!s.href && <span style={S.baldBadge}>in Arbeit</span>}
                </div>
                <div style={S.schrittText}>{s.text}</div>
              </div>
            </li>
          ))}
        </ol>

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

        <h2 style={S.h2}>Was kostet es?</h2>
        <p style={S.p}>
          Zwischen {eur(CFG.sets.find(s => s.id === "single")!.price)} € für ein einzelnes Modul
          und {eur(CFG.sets.find(s => s.id === "max")!.price)} € für vier Module am selben
          800-Watt-<GlossaryTerm id="wechselrichter">Wechselrichter</GlossaryTerm>, jeweils mit
          Halterung. Ein Nachrüst-Speicher kostet zusätzlich mehr als das Set selbst — und
          rechnet sich seltener, als die Werbung nahelegt.
        </p>

        <h2 style={S.h2}>Was muss ich anmelden?</h2>
        <p style={S.p}>
          {BALKON_RECHT.anmeldung} Zeit ist ein Monat ab Inbetriebnahme, und gemeint ist der
          Tag, an dem die Module das erste Mal Strom liefern — nicht der Kauf. Die Anmeldung
          ist kostenlos und in wenigen Minuten erledigt.
        </p>

        <h2 style={S.h2}>Weiter</h2>
        <Link href="/balkonkraftwerk/rechner" style={S.karte}>
          <div style={S.karteTitel}>Für deinen Haushalt rechnen</div>
          <div style={S.karteText}>
            Ertrag am eigenen Standort, Ersparnis, Amortisation und die Frage, ob sich ein
            Speicher trägt — mit einer Empfehlung, welche Set-Größe zu dir passt.
          </div>
        </Link>
        <Link href="/balkonkraftwerk/anmelden" style={S.karte}>
          <div style={S.karteTitel}>Anmelden: Frist, Angaben und die Fallen</div>
          <div style={S.karteText}>
            Was du bereithalten musst, warum das Register das Wort „Balkonkraftwerk“ nicht
            kennt — und ein Check, der dir deine {ANMELDE_FRIST_MONATE === 1 ? "Monatsfrist" : "Frist"} ausrechnet.
          </div>
        </Link>
        <Link href="/photovoltaik-rechner" style={S.karte}>
          <div style={S.karteTitel}>Eigenes Dach? Große Anlage rechnen</div>
          <div style={S.karteText}>
            Ein Balkonkraftwerk deckt die Grundlast. Wer eine Dachfläche hat und mehr
            verbraucht, holt mit einer richtigen Anlage ein Vielfaches heraus.
          </div>
        </Link>

        {/* Stand aus der geteilten Registry, nicht handgeschrieben — sonst
            entsteht genau die Zweitkopie, die lib/__tests__/stand.test.ts
            verbietet (und die beim ersten Wächter-Lauf auseinanderliefe). */}
        <StandNote pfad="/balkonkraftwerk" style={{ marginTop: 24 }} />
      </div>
    </div>
  );
}
