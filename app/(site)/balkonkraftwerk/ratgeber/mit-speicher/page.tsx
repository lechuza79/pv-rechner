import { Metadata } from "next";
import Link from "next/link";
import ArticleMeta from "../../../../../components/ArticleMeta";
import Breadcrumb from "../../../../../components/Breadcrumb";
import Faq from "../../../../../components/Faq";
import GlossaryTerm from "../../../../../components/GlossaryTerm";
import RelatedLinks from "../../../../../components/RelatedLinks";
import StandNote from "../../../../../components/StandNote";
import { balkonSpeicherFaq } from "../../../../../lib/faq";
import { pageMetadata } from "../../../../../lib/seo";
import { v } from "../../../../../lib/theme";
import { calcBalkon, recommendBalkon } from "../../../../../lib/balkon";
import { DEFAULT_BALKON_CONFIG as CFG, BALKON_RECHT, STORAGE_ROUNDTRIP_KETTE } from "../../../../../lib/balkon-config";
import { PERSONEN } from "../../../../../lib/constants";

// Vierte Seite im Balkon-Cluster: die Speicher-Frage.
//
// ZIEL-KEYWORDS (DataForSEO 18.08.2026, echte Suchergebnisseiten ausgewertet —
// docs/balkon-vergleichsseite-konzept.md): „lohnt sich ein balkonkraftwerk"
// (1.600/Monat, KD 6), „balkonkraftwerk speicher test" (880, KD 0), „lohnt sich
// ein bkw mit speicher" (720, KD 6), „balkonkraftwerk mit speicher sinnvoll"
// (390, KD 0). Alle vier tragen echte Informations-Absicht: höchstens 22 % Shops
// in den Top 10, kein Produktkarussell, und Reddit rankt auf dreien davon —
// Google belohnt hier erkennbar Erfahrung statt Marketing-Prosa.
//
// AUSDRÜCKLICH NICHT „balkonkraftwerk mit speicher" (135.000/Monat): 80 % Shops
// plus drei Produktkarussellen. Dort kann ein Ratgeber nicht ranken, egal wie
// gut er ist — die Schwierigkeitszahl (29) misst Backlink-Stärke und sieht
// diesen Absichts-Konflikt nicht.
//
// „TEST" IST DAS FALSCHE WORT — und das ist keine Feinheit, sondern § 5 UWG:
// Wir messen keine Geräte. Das Keyword wird bedient, indem die Seite sagt, was
// ein Gerätetest beantwortet und was nicht; der Titel behauptet nie einen Test.
//
// ALLE ZAHLEN LIVE aus calcBalkon — kein getippter Euro-Betrag. Festgenagelt
// von lib/__tests__/balkon-speicher-seite.test.ts.

export const metadata: Metadata = pageMetadata({
  path: "/balkonkraftwerk/ratgeber/mit-speicher",
  title: "Lohnt sich ein Balkonkraftwerk mit Speicher? Ehrlich gerechnet",
  description:
    "Ein Balkonspeicher ist eine zweite Anschaffung in der Größenordnung der Module und hält deutlich kürzer. Wann er sich trägt und wann nicht — durchgerechnet für jede Haushaltsgröße, mit dem gemessenen Wirkungsgrad statt dem Datenblatt-Wert.",
  ogImageTitle: "Balkonkraftwerk mit Speicher",
  ogImageSubtitle: "Wann er sich trägt — und wann nicht.",
});

const S = {
  page: { background: v("--color-bg"), fontFamily: v("--font-text"), color: v("--color-text-primary"), minHeight: "100vh", padding: "0 16px 20px" },
  wrap: { maxWidth: v("--content-max-width"), margin: "0 auto", paddingTop: "var(--content-lede-top)" },
  h1: { fontSize: v("--font-size-h1"), fontWeight: 800, letterSpacing: "-0.02em", lineHeight: 1.25, marginBottom: 10 },
  subtitle: { fontSize: v("--font-size-lead"), color: v("--color-text-muted"), marginBottom: 24, lineHeight: 1.6 },
  h2: { fontSize: v("--font-size-h2"), fontWeight: 700, marginTop: 32, marginBottom: 10 },
  p: { fontSize: v("--font-size-body"), color: v("--color-text-muted"), lineHeight: 1.7, marginBottom: 12 },
  strong: { fontWeight: 700, color: v("--color-text-primary") },
  link: { color: v("--color-accent"), textDecoration: "none", fontWeight: 600 },
  small: { fontSize: v("--font-size-small"), color: v("--color-text-muted"), lineHeight: 1.6 },
  hero: {
    background: v("--color-bg-accent"),
    borderRadius: v("--radius-lg"),
    padding: "16px 18px",
    marginBottom: 20,
    fontSize: v("--font-size-body"),
    color: v("--color-text-primary"),
    lineHeight: 1.7,
  },
  // Die drei Möglichkeiten nebeneinander — das ist die Kernaussage der Seite und
  // gehört deshalb als Vergleich hin, nicht als Fließtext.
  karten: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(min(160px, 100%), 1fr))",
    gap: 8,
    margin: "0 0 16px",
  },
  karte: {
    background: v("--color-bg-muted"),
    border: `1px solid ${v("--color-border")}`,
    borderRadius: v("--radius-lg"),
    padding: "12px 14px",
  },
  karteBest: { borderColor: v("--color-accent"), background: v("--color-bg-accent") },
  karteTitel: { fontSize: v("--font-size-small"), fontWeight: 700, color: v("--color-text-primary"), marginBottom: 6 },
  karteZahl: { fontFamily: v("--font-mono"), fontSize: v("--font-size-h2"), fontWeight: 700, lineHeight: 1.1, color: v("--color-text-primary") },
  karteEinheit: { fontFamily: v("--font-text"), fontSize: v("--font-size-small"), fontWeight: 600, color: v("--color-text-muted"), marginLeft: 4 },
  karteSub: { fontSize: v("--font-size-small"), color: v("--color-text-muted"), lineHeight: 1.5, marginTop: 6 },

  tabelleWrap: { overflowX: "auto" as const, margin: "0 0 10px" },
  tabelle: { width: "100%", borderCollapse: "collapse" as const, fontSize: v("--font-size-small") },
  // Kopfzellen duerfen umbrechen: Bei 375 px zwingt ein `nowrap` die Tabelle
  // sonst 50 px ueber ihren Rahmen und damit in den Seitwaerts-Scroll, obwohl
  // sie mit zweizeiligen Ueberschriften bequem passt. Die Zahlen darunter
  // bleiben einzeilig — ein umbrochenes „7,2 J." waere unlesbar.
  th: {
    textAlign: "left" as const,
    fontWeight: 700,
    color: v("--color-text-primary"),
    padding: "8px 6px",
    borderBottom: `1px solid ${v("--color-border")}`,
  },
  thZahl: { textAlign: "right" as const },
  td: { padding: "8px 6px", borderBottom: `1px solid ${v("--color-border")}`, color: v("--color-text-muted") },
  tdZahl: { textAlign: "right" as const, fontFamily: v("--font-mono"), whiteSpace: "nowrap" as const },
  traegt: { color: v("--color-positive"), fontWeight: 700 },
  traegtNicht: { color: v("--color-text-muted") },
};

// Referenzfall der ganzen Seite. Steht hier EINMAL und wird von jedem Absatz
// benutzt — ein zweiter Fall im Fließtext wäre eine Zahl, die niemand mehr
// nachrechnen kann. Deckungsgleich mit BALKON_SPEICHER_REFERENZ in lib/faq.ts,
// festgenagelt vom Seiten-Test.
const REF = {
  personenIndex: 1,                          // Zwei-Personen-Haushalt
  setId: "duo" as const,                     // Standard-Set, 960 Wp
  orientationId: "sued_gelaender" as const,  // senkrecht am Südgeländer
  presenceId: "teils" as const,              // Homeoffice-Tage
};

export default function BalkonSpeicherPage() {
  const haushaltKwh = PERSONEN[REF.personenIndex].verbrauch;
  const basis = {
    orientationId: REF.orientationId,
    presenceId: REF.presenceId,
    haushaltKwh,
    specificYield: CFG.specificYield,
    monthlyYield: null,
    stromPrice: CFG.stromPrice,
  };
  const rechne = (setId: "single" | "duo" | "max", storageId: "none" | "small" | "large") =>
    calcBalkon({ ...basis, setId, storageId });

  const ohne = rechne(REF.setId, "none");
  const klein = rechne(REF.setId, "small");
  const gross = rechne(REF.setId, "large");
  const speicherKlein = CFG.storage.find(s => s.id === "small")!;
  const speicherGross = CFG.storage.find(s => s.id === "large")!;

  const eur = (n: number) => n.toLocaleString("de-DE");
  const kwh = (n: number) => Math.round(n).toLocaleString("de-DE");
  const jahre = (n: number) => (isFinite(n) ? n.toFixed(1).replace(".", ",") : null);
  const proz = (n: number) => Math.round(n).toLocaleString("de-DE");

  const mehrPreis = proz((speicherGross.price / speicherKlein.price - 1) * 100);
  const mehrStrom = proz((gross.storageAddedKwh / klein.storageAddedKwh - 1) * 100);
  const mehrKapazitaet = proz((speicherGross.kwh / speicherKlein.kwh - 1) * 100);
  const verlustWh = Math.round((1 - CFG.storageRoundtrip) * 1000);
  // Was die MEHR-Kapazität des großen Speichers wirklich leistet. „Steht meist
  // leer" wäre geschätzt — wie oft sie im Jahr gefüllt wird, ist rechenbar, und
  // die Zahl ist schärfer als das Adjektiv.
  const zusatzKapazitaet = speicherGross.kwh - speicherKlein.kwh;
  const zusatzKwh = gross.storageAddedKwh - klein.storageAddedKwh;
  const zusatzLadungen = zusatzKwh / zusatzKapazitaet;
  const zusatzPreisJeKwh = (speicherGross.price - speicherKlein.price) / zusatzKwh;
  // Wirkungsgrade werden auf eine Nachkommastelle gesetzt — so nennt sie die
  // Leitquelle, und so stehen sie in der Kette in lib/balkon-config.ts.
  const pct = (anteil: number) =>
    (anteil * 100).toLocaleString("de-DE", { minimumFractionDigits: 1, maximumFractionDigits: 1 });
  const roundtripProzent = pct(CFG.storageRoundtrip);

  // Amortisation des kleinen Speichers über Haushaltsgröße × Anwesenheit.
  // Die Tabelle ist der Kern der Seite: Sie zeigt beide Richtungen des Gefälles
  // auf einen Blick, und beide laufen der verbreiteten Faustregel zuwider.
  const matrix = PERSONEN.map((person, i) => ({
    label: person.label,
    verbrauch: person.verbrauch,
    zellen: CFG.presence.map(p => ({
      id: p.id,
      payback: calcBalkon({
        ...basis, haushaltKwh: PERSONEN[i].verbrauch, presenceId: p.id, setId: REF.setId, storageId: "small",
      }).storagePayback,
    })),
  }));

  // Die beiden Randfälle der Tabelle, ausgeschrieben: der Haushalt, der die
  // Produktion fast vollständig direkt wegverbraucht, und der, der sie fast
  // vollständig ins Netz schiebt. Gerechnet statt behauptet — eine frühere
  // Fassung dieses Absatzes stellte die Aussage über die Leerlauf-Last auf, und
  // die trägt nicht: Ein 5.000-kWh-Haushalt zieht im Mittel rund 570 Watt, also
  // weniger als der Wechselrichter liefert.
  const vielVerbrauch = calcBalkon({ ...basis, haushaltKwh: PERSONEN[3].verbrauch, presenceId: "home", setId: REF.setId, storageId: "none" });
  const wenigVerbrauch = calcBalkon({ ...basis, haushaltKwh: PERSONEN[0].verbrauch, presenceId: "weg", setId: REF.setId, storageId: "none" });

  // Dasselbe Speicher-Trio am GRÖSSTEN Set. Der Vergleich ist der Kern des
  // Abschnitts „Ob der größere Speicher lohnt": Am Standard-Set ist der große
  // Akku das schlechteste Geschäft, mit vier Modulen das beste — und beides
  // folgt derselben Regel, weil erst die Modulfläche den Überschuss erzeugt,
  // von dem ein Speicher lebt.
  const maxOhne = rechne("max", "none");
  const maxKlein = rechne("max", "small");
  const maxGross = rechne("max", "large");
  // Die Empfehlung des Rechners für genau diesen Haushalt — sie MUSS zu dem
  // passen, was die Seite schreibt. Ein Ratgeber, der dem eigenen Rechner
  // widerspricht, ist schlimmer als gar keiner.
  const empfehlung = recommendBalkon(basis);
  const empfohlenesSet = CFG.sets.find(x => x.id === empfehlung.best.setId)!;
  const empfohlenerSpeicher = CFG.storage.find(x => x.id === empfehlung.best.storageId)!;

  // Set-Größe gegen Speicher-Amortisation: derselbe Speicher, derselbe Haushalt,
  // nur mehr Module. Der größte Hebel der ganzen Seite.
  const proSet = CFG.sets.map(set => ({
    label: set.label,
    moduleWp: set.moduleWp,
    ueberschuss: rechne(set.id, "none").feedInKwh,
    payback: rechne(set.id, "small").storagePayback,
  }));

  const drei = [
    { titel: "Ohne Speicher", r: ohne, sub: `${eur(ohne.invest)} € Anschaffung, nach ${jahre(ohne.amortYears)} Jahren drin.` },
    { titel: `Mit ${speicherKlein.kwh.toLocaleString("de-DE")} kWh`, r: klein, sub: `${eur(klein.invest)} € Anschaffung, Speicher nach ${jahre(klein.storagePayback)} Jahren drin.` },
    { titel: `Mit ${speicherGross.kwh.toLocaleString("de-DE")} kWh`, r: gross, sub: `${eur(gross.invest)} € Anschaffung, der Speicher trägt sich nicht mehr.` },
  ];
  const besterGewinn = Math.max(...drei.map(d => d.r.lifetimeSaving));

  return (
    <div style={S.page}>
      <div style={S.wrap}>
        {/* Elternteil ist das THEMA, nicht die Ratgeber-Liste — die Seite liegt
            unter /balkonkraftwerk/. Dieselbe Begründung wie beim Anmelde-Ratgeber:
            eine Krümelspur, die eine Hierarchie behauptet, die die Adresse nicht
            hat, ist im strukturierten Datensatz eine Falschaussage. Der
            Ratgeber-Charakter bleibt über den Registry-Eintrag erhalten. */}
        <Breadcrumb
          items={[
            { label: "Start", href: "/" },
            { label: "Balkonkraftwerk", href: "/balkonkraftwerk" },
            { label: "Ratgeber", href: "/balkonkraftwerk/ratgeber" },
            { label: "Mit Speicher" },
          ]}
          jsonLd
        />

        <h1 style={S.h1}>Lohnt sich ein Balkonkraftwerk mit Speicher?</h1>
        <p style={S.subtitle}>
          Das Balkonkraftwerk selbst rechnet sich fast immer. Der Speicher ist eine zweite,
          eigene Entscheidung: noch einmal eine Anschaffung in der Größenordnung der Module,
          aber mit deutlich kürzerer Lebensdauer. Hier steht durchgerechnet, wann er sich
          trägt und wann nicht.
        </p>

        <ArticleMeta
          headline="Lohnt sich ein Balkonkraftwerk mit Speicher?"
          description="Wann sich ein Balkonspeicher trägt und wann nicht — für jede Haushaltsgröße durchgerechnet, mit dem gemessenen Wirkungsgrad statt dem aus dem Datenblatt."
          path="/balkonkraftwerk/ratgeber/mit-speicher"
          published="2026-08-19"
          modified="2026-08-19"
        />

        <div style={S.hero}>
          <span style={S.strong}>Die kurze Antwort:</span> Manchmal — und zwar genau dann,
          wenn mittags viel Strom übrig bleibt. Ein Speicher kann nichts erzeugen, er kann
          nur verschieben. Im Beispiel unten bleiben ohne Speicher{" "}
          {kwh(ohne.feedInKwh)} kWh im Jahr ungenutzt; ein Speicher mit{" "}
          {speicherKlein.kwh.toLocaleString("de-DE")} kWh holt davon{" "}
          {kwh(klein.storageAddedKwh)} kWh zurück und ist nach{" "}
          <span style={S.strong}>{jahre(klein.storagePayback)} Jahren</span> wieder drin —
          bei rund {CFG.storageLifeYears} Jahren Lebensdauer. Das reicht — bleibt aber nur
          knapp unter unserer Empfehlungsschwelle von {CFG.storageRecommendMaxPayback} Jahren.
          In großen Haushalten, in denen tagsüber jemand da ist, spielt der Speicher seinen
          Preis gar nicht mehr ein — und an einem einzelnen Modul erst recht nicht.
        </div>

        <h2 style={S.h2}>Der Beispielfall</h2>
        <p style={S.p}>
          Alle Zahlen auf dieser Seite gelten für denselben Haushalt, damit sie
          untereinander vergleichbar bleiben: zwei Personen mit {eur(haushaltKwh)} kWh
          Jahresverbrauch, Homeoffice-Tage, ein Standard-Set mit{" "}
          {eur(CFG.sets.find(s => s.id === REF.setId)!.moduleWp)} Wp senkrecht am
          Südgeländer, gerechnet mit dem deutschen Durchschnittsertrag. Es sind dieselben
          Rechenwege wie im{" "}
          <Link href="/balkonkraftwerk/rechner" style={S.link}>Balkonkraftwerk-Rechner</Link>
          {" "}— dort lässt sich der Fall auf den eigenen Haushalt und die eigene
          Postleitzahl umstellen.
        </p>

        <div style={S.karten}>
          {drei.map(d => (
            <div key={d.titel} style={{ ...S.karte, ...(d.r.lifetimeSaving === besterGewinn ? S.karteBest : null) }}>
              <div style={S.karteTitel}>{d.titel}</div>
              <div>
                <span style={S.karteZahl}>{eur(d.r.lifetimeSaving)}</span>
                <span style={S.karteEinheit}>€</span>
              </div>
              <div style={S.karteSub}>
                Gewinn nach {CFG.lifetimeYears} Jahren. {d.sub}
              </div>
            </div>
          ))}
        </div>
        <p style={S.small}>
          Gewinn nach {CFG.lifetimeYears} Jahren heißt: alles, was der eingesparte Strom in
          dieser Zeit wert ist, abzüglich der Anschaffung. Mit steigendem Strompreis und
          nachlassender Modulleistung gerechnet. Alle drei gelten dem Standard-Set mit
          zwei Modulen — mit vier Modulen fällt der Vergleich anders aus, dazu weiter unten.
        </p>

        <h2 style={S.h2}>Zwei Entscheidungen, nicht eine</h2>
        <p style={S.p}>
          Die Module rechnen sich für sich genommen: {eur(ohne.invest)} € Anschaffung, rund{" "}
          {eur(ohne.savingPerYear)} € Ersparnis im ersten Jahr, nach etwa{" "}
          {jahre(ohne.amortYears)} Jahren wieder drin. Daraus folgt aber nicht, dass sich
          auch der Speicher rechnet — er ist eine zusätzliche Ausgabe mit einer eigenen
          Rechnung, und die geht anders aus.
        </p>
        <p style={S.p}>
          Der Unterschied liegt in der Lebensdauer. Module laufen{" "}
          {CFG.lifetimeYears} Jahre und länger, ein Akku realistisch{" "}
          {CFG.storageLifeYears}. Der Speicher muss sich also{" "}
          <span style={S.strong}>innerhalb seiner eigenen Lebensdauer</span> bezahlt machen,
          nicht innerhalb der Lebensdauer der Anlage. Darin steckt die Falle: Über{" "}
          {CFG.lifetimeYears} Jahre gerechnet geht fast jeder Speicher irgendwann auf — nur
          läuft er die {CFG.lifetimeYears} Jahre nicht.
        </p>

        <h2 style={S.h2}>Wann sich der Speicher trägt — und wann nicht</h2>
        <p style={S.p}>
          Der Speicher lebt vom Überschuss. Was tagsüber ohnehin verbraucht wird, muss er
          nicht zwischenlagern; was abends fehlt, kann er nur liefern, wenn mittags etwas
          übrig war. Deshalb hängt seine Amortisation an zwei Größen, und beide wirken
          anders herum, als man erwartet: Je{" "}
          <span style={S.strong}>kleiner</span> der Haushalt und je{" "}
          <span style={S.strong}>weniger</span> tagsüber jemand zu Hause ist, desto besser
          rechnet er sich.
        </p>
        <div style={S.tabelleWrap}>
          <table style={S.tabelle}>
            <caption style={{ ...S.small, textAlign: "left", paddingBottom: 8 }}>
              Jahre, bis sich ein {speicherKlein.kwh.toLocaleString("de-DE")}-kWh-Speicher
              für {eur(speicherKlein.price)} € selbst bezahlt hat. Grün: schafft es innerhalb
              von {CFG.storageRecommendMaxPayback} Jahren.
            </caption>
            <thead>
              <tr>
                <th style={S.th}>Haushalt</th>
                {CFG.presence.map(p => (
                  <th key={p.id} style={{ ...S.th, ...S.thZahl }}>{p.label}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {matrix.map(zeile => (
                <tr key={zeile.label}>
                  <th scope="row" style={{ ...S.th, fontWeight: 400, color: v("--color-text-muted") }}>
                    {zeile.label} {zeile.label === "1" ? "Person" : "Personen"}
                    <span style={{ ...S.small, display: "block", fontFamily: v("--font-mono") }}>
                      {eur(zeile.verbrauch)} kWh
                    </span>
                  </th>
                  {zeile.zellen.map(z => {
                    const j = jahre(z.payback);
                    const traegt = isFinite(z.payback) && z.payback <= CFG.storageRecommendMaxPayback;
                    return (
                      <td key={z.id} style={{ ...S.td, ...S.tdZahl, ...(traegt ? S.traegt : S.traegtNicht) }}>
                        {j ? `${j} J.` : "nie"}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p style={S.small}>
          „Nie" heißt: Der Speicher spielt seinen Preis innerhalb seiner Lebensdauer von{" "}
          {CFG.storageLifeYears} Jahren nicht wieder ein. Gerechnet für das Standard-Set am
          Südgeländer; eine andere Ausrichtung verschiebt die ganze Tabelle.
        </p>
        <p style={S.p}>
          Für Dachanlagen hört man die umgekehrte Faustregel — dort heißt es, ein Speicher
          lohne sich vor allem für große Haushalte. Bei Steckersolar stimmt das nicht, und
          der Grund ist der{" "}
          <GlossaryTerm id="wechselrichter">Wechselrichter</GlossaryTerm>: Er lässt
          höchstens {eur(CFG.sets.find(s => s.id === REF.setId)!.inverterW)} Watt durch, und
          gegen den Verbrauch eines vollen Haushalts ist das wenig. Ein
          Fünf-Personen-Haushalt, in dem tagsüber jemand da ist, verbraucht{" "}
          {proz(100 - vielVerbrauch.feedInKwh / vielVerbrauch.annualYield * 100)} Prozent der
          Produktion direkt in dem Moment, in dem sie anfällt — für den Speicher bleiben die
          restlichen {kwh(vielVerbrauch.feedInKwh)} kWh im Jahr übrig, und davon kann sich
          kein Akku bezahlen. Ein Ein-Personen-Haushalt, der tagsüber außer Haus ist, schiebt
          umgekehrt {proz(wenigVerbrauch.feedInKwh / wenigVerbrauch.annualYield * 100)}{" "}
          Prozent ins Netz. Der Speicher ist also nicht für die gedacht, die viel
          verbrauchen, sondern für die, die zum falschen Zeitpunkt verbrauchen.
        </p>

        <h2 style={S.h2}>Der größte Hebel ist nicht der Speicher</h2>
        <p style={S.p}>
          Wer über einen Speicher nachdenkt, sollte zuerst über Module nachdenken. Derselbe
          Haushalt, derselbe Speicher, nur eine andere Set-Größe:
        </p>
        <div style={S.tabelleWrap}>
          <table style={S.tabelle}>
            <thead>
              <tr>
                <th style={S.th}>Set</th>
                <th style={{ ...S.th, ...S.thZahl }}>Überschuss ohne Speicher</th>
                <th style={{ ...S.th, ...S.thZahl }}>Speicher drin nach</th>
              </tr>
            </thead>
            <tbody>
              {proSet.map(s => {
                const j = jahre(s.payback);
                const traegt = isFinite(s.payback) && s.payback <= CFG.storageRecommendMaxPayback;
                return (
                  <tr key={s.label}>
                    <th scope="row" style={{ ...S.th, fontWeight: 400, color: v("--color-text-muted") }}>
                      {s.label}
                      <span style={{ ...S.small, display: "block", fontFamily: v("--font-mono") }}>
                        {eur(s.moduleWp)} Wp
                      </span>
                    </th>
                    <td style={{ ...S.td, ...S.tdZahl }}>{kwh(s.ueberschuss)} kWh/Jahr</td>
                    <td style={{ ...S.td, ...S.tdZahl, ...(traegt ? S.traegt : S.traegtNicht) }}>
                      {j ? `${j} Jahren` : "nie"}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <p style={S.p}>
          Mehr Module erzeugen mehr Überschuss, und erst der macht den Speicher wirtschaftlich.
          Ein einzelnes Modul erzeugt so wenig Übrigbleibendes, dass sich daran kein Akku
          amortisiert — wer dort einen Speicher dazukauft, kauft ihn für{" "}
          {kwh(proSet[0].ueberschuss)} kWh im Jahr. Module haben zudem den längeren Atem:
          Was sie an Überschuss erzeugen, erzeugen sie {CFG.lifetimeYears} Jahre lang,
          während der Akku nach {CFG.storageLifeYears} Jahren ersetzt werden will. Die
          Reihenfolge lautet also: erst die Fläche ausreizen, dann über Speicherung reden.
        </p>

        <h2 style={S.h2}>Ob der größere Speicher lohnt, entscheidet die Modulfläche</h2>
        <p style={S.p}>
          Am Standard-Set ist er ein schlechtes Geschäft. Zwischen den beiden gängigen Größen
          liegen {mehrKapazitaet} Prozent mehr Kapazität und {mehrPreis} Prozent mehr Preis —
          aber nur <span style={S.strong}>{mehrStrom} Prozent mehr Strom</span>. Zwei Module
          erzeugen gar nicht genug Überschuss, um den größeren Akku regelmäßig zu füllen:
          Die zusätzlichen {zusatzKapazitaet.toLocaleString("de-DE", { maximumFractionDigits: 1 })} kWh
          Kapazität werden im Jahr rechnerisch {proz(zusatzLadungen)}-mal gefüllt und kosten{" "}
          {eur(speicherGross.price - speicherKlein.price)} € — das sind rund{" "}
          {zusatzPreisJeKwh.toLocaleString("de-DE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €
          für jede Kilowattstunde, die dadurch im Jahr zusätzlich im Haus bleibt. Nach{" "}
          {CFG.lifetimeYears} Jahren bleiben deshalb mit dem großen Speicher{" "}
          {eur(gross.lifetimeSaving)} € übrig, mit dem kleinen {eur(klein.lifetimeSaving)} €
          und ganz ohne {eur(ohne.lifetimeSaving)} € — er ist dort nicht nur schlechter als
          der kleine, sondern schlechter als gar keiner.
        </p>
        <p style={S.p}>
          Mit vier Modulen dreht sich das um, und zwar nach derselben Regel, nicht als
          Ausnahme von ihr: Jetzt fällt genug Überschuss an, um die größere Kapazität zu
          füllen. Der große Speicher trägt sich dann nach{" "}
          {jahre(maxGross.storagePayback)} Jahren und ist mit{" "}
          <span style={S.strong}>{eur(maxGross.lifetimeSaving)} €</span> die beste der drei
          Möglichkeiten — vor {eur(maxKlein.lifetimeSaving)} € mit dem kleinen und{" "}
          {eur(maxOhne.lifetimeSaving)} € ohne.
        </p>
        <p style={S.p}>
          Daraus folgt die Reihenfolge der Entscheidung: Die Speichergröße steht nicht am
          Anfang, sondern am Ende. Erst steht fest, wie viel Fläche du hast, daraus ergibt
          sich, wie viel Strom übrig bleibt — und erst daraus, wie groß der Akku sein darf.
          Genau so entscheidet auch unser Rechner: Für diesen Beispielhaushalt empfiehlt er{" "}
          <Link href="/balkonkraftwerk/rechner" style={S.link}>
            {empfohlenesSet.label.toLowerCase().startsWith("1") ? "ein Modul" : empfohlenesSet.label}
            {empfohlenerSpeicher.kwh > 0
              ? ` mit ${empfohlenerSpeicher.kwh.toLocaleString("de-DE")}-kWh-Speicher`
              : " ohne Speicher"}
          </Link>.
        </p>

        <h2 style={S.h2}>Der Wirkungsgrad, mit dem wir rechnen</h2>
        <p style={S.p}>
          Ein Speicher gibt weniger heraus, als er aufnimmt. Wir rechnen über den ganzen
          Umlauf mit <span style={S.strong}>{roundtripProzent} Prozent</span> — von jeder
          eingelagerten Kilowattstunde gehen {verlustWh} Wattstunden verloren, also{" "}
          {pct(1 - CFG.storageRoundtrip)} Prozent. Das ist kein Schätzwert und keine Herstellerangabe, sondern der Wert,
          den die HTW Berlin für genau diese Geräteklasse in ihrem Stecker-Solar-Simulator
          ansetzt: {pct(STORAGE_ROUNDTRIP_KETTE.laden)} Prozent beim Laden,{" "}
          {pct(STORAGE_ROUNDTRIP_KETTE.entladen)} Prozent beim Entladen und{" "}
          {pct(STORAGE_ROUNDTRIP_KETTE.batterie)} Prozent in der Batterie selbst.
        </p>
        <p style={S.p}>
          Dieser Wert ist eher zu freundlich als zu streng. Die Hochschule schreibt
          ausdrücklich, dass Standby-Verluste und Regelungsabweichungen darin{" "}
          <span style={S.strong}>nicht</span> enthalten sind — und die Elektronik eines
          Balkonspeichers läuft rund um die Uhr, auch in den vielen Stunden, in denen weder
          geladen noch entladen wird. Der reale Wirkungsgrad liegt darunter, nicht darüber.
          Wer mit einer Zahl aus einem Datenblatt rechnet, rechnet den Speicher schön.
        </p>

        <h2 style={S.h2}>Warum hier kein Gerätetest steht</h2>
        <p style={S.p}>
          Wir testen keine Geräte, und deshalb steht auf dieser Seite auch kein Test — auch
          nicht als Wort. Was ein Labor misst, ist die eine Hälfte der Frage: Kapazität,
          Wirkungsgrad, Verarbeitung, Verhalten bei Kälte. Die andere Hälfte entscheidet
          sich in deinem Haushalt, und die kann kein Prüfstand beantworten: Wie viel
          Überschuss entsteht überhaupt, und was ist er wert?
        </p>
        <p style={S.p}>
          Genau diese Hälfte rechnen wir. Für die erste sind Verbraucherorganisationen und
          Fachmedien die richtige Adresse — sie haben Messgeräte, wir haben ein Modell. Und
          ein Hinweis, der in beide Richtungen zählt, auch für diese Seite: Wer eine
          Kaufempfehlung liest, sollte als Erstes nachsehen, wer sie schreibt, was er
          verkauft und woher seine Zahlen stammen. Unsere stehen offen im{" "}
          <Link href="/datenstand" style={S.link}>Datenstand</Link>, samt Quelle und
          Prüfdatum.
        </p>

        <h2 style={S.h2}>Mehrwertsteuer: beim Speicher wird es unübersichtlich</h2>
        <p style={S.p}>{BALKON_RECHT.nullsteuer}</p>
        <p style={S.p}>
          Praktisch heißt das: Wer den Speicher gleich mit dem Set kauft, hat die Frage nicht.
          Wer ihn später einzeln nachkauft, sollte vor der Bestellung nachsehen, welcher
          Steuersatz auf der Rechnung steht — bei einem Gerät für {eur(speicherKlein.price)} €
          geht es um einen Betrag, der die Amortisation spürbar verschiebt.
        </p>

        <h2 style={S.h2}>Was der Speicher sonst noch bringt</h2>
        <p style={S.p}>
          Hier lohnt es sich, zwei Größen auseinanderzuhalten, die oft in einen Topf
          geworfen werden. Der{" "}
          <GlossaryTerm id="eigenverbrauch">Eigenverbrauch</GlossaryTerm> — der Anteil des
          erzeugten Stroms, den du selbst nutzt — steigt im Beispielfall von{" "}
          {proz(ohne.selfShare * 100)} auf {proz(klein.selfShare * 100)} Prozent. Das klingt
          nach viel. Die <GlossaryTerm id="autarkie">Autarkie</GlossaryTerm> dagegen — der
          Anteil deines Verbrauchs, den du selbst deckst — steigt nur von{" "}
          {proz(ohne.autarky * 100)} auf {proz(klein.autarky * 100)} Prozent.
        </p>
        <p style={S.p}>
          Beide Zahlen sind richtig, und der Unterschied ist der Punkt: Der Speicher holt
          fast alles heraus, was die Module liefern — die Module liefern aber nur einen
          kleinen Teil dessen, was ein Haushalt braucht. Netzunabhängig wird ein
          Balkonkraftwerk auch mit Speicher nicht, im Winter deckt es nur wenig. Wo sich der
          Speicher rechnet, bekommst du die paar Punkte Unabhängigkeit gratis dazu; wo er
          sich nicht rechnet — die grauen Zellen der Tabelle oben —, bezahlst du sie, und
          dann ist es eine Entscheidung über Unabhängigkeit und keine Geldanlage.
        </p>
        <p style={S.p}>
          Was ein Balkonspeicher in aller Regel <span style={S.strong}>nicht</span> ist: eine
          Notstromversorgung. Ob ein bestimmtes Gerät bei Stromausfall überhaupt etwas
          liefert, steht im Datenblatt des Geräts und ist keine Eigenschaft der Gattung —
          verlass dich nicht darauf, ohne es dort nachgelesen zu haben.
        </p>

        <Faq items={balkonSpeicherFaq()} title="Häufige Fragen zum Balkonspeicher" currentPath="/balkonkraftwerk/ratgeber/mit-speicher" />

        <p style={{ ...S.small, marginTop: 28 }}>
          <span style={S.strong}>Quelle des Wirkungsgrads:</span> HTW Berlin,
          Forschungsgruppe Solarspeichersysteme: „Web-App: Stecker-Solar-Simulator —
          Dokumentation der Berechnungsgrundlagen", Version 3.0, Berlin, Mai 2024,
          Kapitel 4.2. Die Ertrags- und Verbrauchsrechnung dahinter steht in unserer{" "}
          <Link href="/methodik" style={S.link}>Methodik</Link>. Keine Rechts- oder
          Steuerberatung — verbindlich ist die Auskunft deines Finanzamts.
        </p>

        <StandNote pfad="/balkonkraftwerk/ratgeber/mit-speicher" style={{ marginTop: 12 }} />

        <RelatedLinks
          currentPath="/balkonkraftwerk/ratgeber/mit-speicher"
          links={[
            { href: "/balkonkraftwerk/rechner", label: "Balkonkraftwerk-Rechner", desc: "Denselben Vergleich für deinen Haushalt und deine Postleitzahl — mit und ohne Speicher, inklusive Empfehlung, welche Set-Größe passt." },
            { href: "/balkonkraftwerk", label: "Balkonkraftwerk: der Überblick", desc: "Ertrag, Kosten, Förderung und Anmeldung auf einer Seite." },
            { href: "/balkonkraftwerk/ratgeber/anmelden", label: "Balkonkraftwerk anmelden", desc: "Eine Registrierung im Marktstammdatenregister, ein Monat Zeit — und die Stellen, an denen es hakt." },
            { href: "/ratgeber/lohnt-sich-pv-mit-speicher", label: "Lohnt sich PV mit Speicher?", desc: "Dieselbe Frage für die Dachanlage — dort fällt die Antwort anders aus als am Balkon." },
            { href: "/photovoltaik-neigungswinkel", label: "Neigungswinkel & Ausrichtung", desc: "Wie viel Ertrag jede Himmelsrichtung übrig lässt — der größte Hebel vor jedem Speicher." },
          ]}
        />

        <p style={{ ...S.small, marginTop: 24 }}>
          Zurück zur <Link href="/ratgeber" style={S.link}>Ratgeber-Übersicht</Link>.
        </p>
      </div>
    </div>
  );
}
