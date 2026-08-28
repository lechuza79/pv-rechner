import Logo from "../Logo";
import { v, space } from "../../lib/theme";
import { kartenTokens, serienFarben } from "../../lib/social-karten-stil";
import { aufteilungsStellen, ranglistenStellen, restVon } from "../../lib/social-bildformen";
import { BUNDESLAND_UMRISS, BUNDESLAND_UMRISS_SEITE } from "../../lib/bundesland-umrisse";
import { umrissBox } from "../../lib/bundesland-umriss-box";
import type { BildSerie, PostBild } from "../../lib/social-posts";

// Das Bildformat für den Feed. Hochkant (4:5), höchstens drei Serien,
// Beschriftungen direkt an den Balken.
//
// Bewusst NICHT der vorhandene Widget-Export: Der ist für ein eingebettetes
// Chart auf einer Seite gebaut und bringt Legende, Hilfetexte und eine
// senkrechte Quellenkante mit. Im Feed sieht man davon auf einem Telefon
// praktisch nichts — die Aussage muss im Vorschaubild ohne Antippen lesbar
// sein, und dafür bleibt Platz für genau eine Aussage und zwei bis drei Zahlen.
//
// Die Quellenzeile ist Pflicht und steht IM Bild, nicht im Beitragstext: Beim
// Weiterteilen reist der Text nicht mit, das Bild schon. Für das
// Anlagenregister verlangt die Lizenz die Namensnennung, für den
// KfW-Förderreport die Erlaubnis, auf die wir uns stützen.

const BREITE = 1080;
const HOEHE = 1350; // 4:5

/**
 * Wie schwach die Referenzfläche steht — die Spur unter einem Ring, der
 * ungefüllte Teil eines Umrisses, die Bahn hinter einem Ranglisten-Balken.
 *
 * Eine Zahl für alle drei, weil es in allen drei dieselbe Sache ist: nicht der
 * Wert, sondern das, woran er gemessen wird. Standen sie einzeln, sah dieselbe
 * Referenz je nach Bildform anders aus — der Umriss trug 0,3, der Ring 0,14
 * (Betreiber, 28.08.2026).
 *
 * Schwach halten ist die eigentliche Regel: Bei einem kleinen Anteil ist die
 * Referenz fast die ganze Fläche, und zu kräftig gesetzt liest sich der KLEINE
 * Wert als große Fläche — genau umgekehrt zur Aussage.
 */
const SPUR_DECKKRAFT = 0.14;

/**
 * Schriftgrößen je Stufe — ABSOLUT, nicht skaliert.
 *
 * Das ist der eigentliche Mechanismus. Die volle Karte ist 1080 breit und
 * rechnet ihre Größen mit dem Maßstab hoch; eine Teaser-Karte von 240 Pixeln
 * bekäme daraus 13-Pixel-Überschriften und 5-Pixel-Beschriftungen. Die kleine
 * Stufe setzt ihre Größen deshalb selbst und bleibt damit lesbar, statt eine
 * verkleinerte Fassung derselben Anordnung zu sein.
 *
 * Auch das Seitenverhältnis gilt nur oben: Ein Teaser braucht keine 4:5-Fläche,
 * er hört auf, wo sein Inhalt endet.
 */
const GROESSEN = {
  voll: { aussage: 58, untertitel: 30, wert: 96, einheit: 30, label: 30, balken: 30, polster: 72 },
  teaser: { aussage: 17, untertitel: 0, wert: 40, einheit: 14, label: 13, balken: 10, polster: 16 },
} as const;

/**
 * Größenstufen. Der Unterschied ist NICHT der Maßstab.
 *
 * Eine 1080er Karte auf 240 Pixel herunterzurechnen macht die Quellenzeile
 * fünf Pixel groß — lesbar ist sie damit nirgends, sie kostet nur Platz. Eine
 * kleine Fassung lässt deshalb weg, statt zu schrumpfen: In der Teaser-Stufe
 * bleiben die Aussage und die eine Zahl, auf die es ankommt.
 *
 * Die Quellenangabe fällt nur dort weg, wo sie nicht gebraucht wird: Im Teaser
 * ist die Karte Seiteninhalt, und die Seite nennt ihre Quellen ohnehin. Sobald
 * daraus ein Bild wird, das die Seite verlässt, gilt wieder die volle Stufe —
 * dort ist die Nennung Lizenzpflicht.
 */
export type KartenStufe = "voll" | "teaser";

/**
 * Wie lang ein Wert als Balken wird — die Normierungsregel an EINER Stelle.
 *
 * Wo es ein `ganzes` gibt, wird daran gemessen und nicht am größten der
 * gezeigten Werte. Das war im Bestand falsch: Die drei Solarsegmente sind
 * Anteile, trugen aber kein Ganzes — das private Dach mit 28 Prozent bekam
 * dadurch 81 Prozent der Länge, weil die Freifläche mit 35 die volle bekam. Die
 * Überschrift sagte „nur gut ein Viertel", der Balken zeigte vier Fünftel.
 *
 * Gemessen wird IMMER ab null. Reihen mit einem anderen Bezugspunkt (`nullpunkt`,
 * etwa Wachstumsfaktoren ab 1) bekommen deshalb gar keine Balkenform — die
 * Begründung steht am Feld.
 */
function laenge(wert: number, bild: PostBild, max: number): number {
  const oben = bild.ganzes ?? max;
  if (oben <= 0) return 0;
  return Math.max(0, Math.min(Math.abs(wert) / oben, 1));
}

export function SocialKarte({
  bild,
  skala = 1,
  stufe = "voll",
}: {
  bild: PostBild;
  skala?: number;
  stufe?: KartenStufe;
}) {
  const max = Math.max(...bild.serien.map((s) => Math.abs(s.wert)), 1);
  const kennzahl = bild.art === "kennzahl";
  const klein = stufe === "teaser";
  // Die Ringfassung braucht Fläche und genau zwei Werte. Im Teaser fällt sie
  // auf die Balken zurück — zwei Ringe auf 240 Pixeln wären zwei graue Kringel.
  const donut = bild.art === "donut" && !klein && bild.serien.length === 2;
  const saeule = bild.art === "saeule" && !klein && bild.serien.length === 2;
  const umriss = bild.art === "umriss" && !klein;
  // Die drei neuen Formen brauchen alle Fläche und fallen im Teaser auf die
  // Balken zurück — dieselbe Entscheidung wie beim Ringpaar: Sechzehn Zeilen,
  // vier Segmente oder fünfundzwanzig Jahrgänge auf 240 Pixeln sind ein Muster,
  // keine Aussage.
  const rangliste = bild.art === "rangliste" && !klein && (bild.reihe?.length ?? 0) >= 3;
  const aufteilung = bild.art === "aufteilung" && !klein && bild.serien.length >= 3;
  const verlauf = bild.art === "verlauf" && !klein && (bild.achse?.length ?? 0) >= 3;
  // Die Einheit steht an der Zahl, außer der Untertitel trägt sie schon.
  const zeigeEinheit = bild.einheitAmWert !== false;
  const g = GROESSEN[stufe];
  // In der kleinen Stufe zählen die Größen absolut, oben werden sie mit dem
  // Maßstab hochgerechnet.
  const px = (wert: number) => (klein ? wert : wert * skala);
  // Im Teaser trägt nur die hervorgehobene Zahl; die Vergleichszahl daneben
  // wäre auf dieser Fläche zwei unlesbare Zeilen.
  const serien = klein ? bild.serien.filter((s) => s.hervorgehoben).slice(0, 1) : bild.serien;

  return (
    <div
      data-social-karte
      style={{
        // Die Karte bringt ihr Farbschema selbst mit, statt es von der Seite zu
        // erben. Vorher hing das an der Vorschau — wer die Karte woanders
        // rendert (oder als Bild aufnimmt), bekam die Tagesstufe der Seite und
        // damit eine Karte, die es so nie geben sollte.
        ...(kartenTokens(bild.stil) as React.CSSProperties),
        width: BREITE * skala,
        // Der Teaser hört auf, wo sein Inhalt endet — eine erzwungene
        // 4:5-Fläche wäre hier zur Hälfte leer.
        height: klein ? undefined : HOEHE * skala,
        background: v("--color-bg"),
        color: v("--color-text-primary"),
        display: "flex",
        flexDirection: "column",
        padding: klein ? g.polster : `${72 * skala}px ${64 * skala}px`,
        boxSizing: "border-box",
        fontFamily: v("--font-text"),
        overflow: "hidden",
      }}
    >
      {/* Die Aussage, nicht die Achsenbeschriftung. Ein Bild ohne Aussage ist
          im Feed eine Zahlentafel, die niemand entziffert.
          Im Teaser ist es umgekehrt: Dort steht die Aussage als Text unter der
          Karte, und das Bild zeigt nur die Zahlen. Zweimal derselbe Satz auf
          240 Pixeln wäre die Hälfte der Fläche für nichts. */}
      {!klein && (
      <div
        style={{
          fontSize: px(g.aussage),
          lineHeight: 1.2,
          fontWeight: 700,
          letterSpacing: "-0.02em",
          marginBottom: px(klein ? 12 : 20),
        }}
      >
        {bild.aussage}
      </div>
      )}
      {!klein && bild.gemessen && (
        <div style={{ fontSize: px(g.untertitel), color: v("--color-text-muted"), marginBottom: px(64) }}>
          {bild.gemessen}
        </div>
      )}

      {donut ? (
        <DonutTeil bild={bild} max={max} skala={skala} />
      ) : saeule ? (
        <SaeulenTeil bild={bild} skala={skala} />
      ) : umriss ? (
        <UmrissTeil bild={bild} skala={skala} />
      ) : rangliste ? (
        <RanglistenTeil bild={bild} skala={skala} />
      ) : aufteilung ? (
        <AufteilungsTeil bild={bild} skala={skala} />
      ) : verlauf ? (
        <VerlaufsTeil bild={bild} skala={skala} />
      ) : (
      <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "space-evenly" }}>
        {serien.map((s) => {
          const anteil = laenge(s.wert, bild, max);
          return (
            <div key={s.label}>
              <div
                style={{
                  display: "flex",
                  alignItems: "baseline",
                  gap: klein ? 4 : space.md * skala,
                  marginBottom: px(klein ? 6 : 14),
                  // Zahl und Einheit gehören in eine Zeile: bricht die Einheit
                  // um, liest sie sich so groß wie der Wert.
                  whiteSpace: "nowrap",
                }}
              >
                <span
                  style={{
                    fontSize: klein ? g.wert : (kennzahl ? 190 : 96) * skala,
                    fontWeight: 700,
                    lineHeight: 1,
                    color: s.hervorgehoben ? v("--color-accent") : v("--color-text-primary"),
                  }}
                >
                  {s.wert.toLocaleString("de-DE", { minimumFractionDigits: s.stellen ?? 0, maximumFractionDigits: s.stellen ?? 0 })}
                </span>
                {zeigeEinheit && (
                  <span style={{ fontSize: klein ? g.einheit : (kennzahl ? 44 : 30) * skala, color: v("--color-text-muted") }}>
                    {s.einheit}
                  </span>
                )}
              </div>
              {/* Bei einer einzelnen Kennzahl gibt es nichts zu vergleichen —
                  ein Balken über die volle Breite wäre reine Dekoration. */}
              {!kennzahl && (
                <div
                  style={{
                    height: px(g.balken),
                    width: `${Math.max(anteil * 100, 2)}%`,
                    background: s.hervorgehoben ? v("--color-accent") : v("--color-border"),
                    borderRadius: v("--radius-sm"),
                    marginBottom: px(klein ? 6 : 14),
                  }}
                />
              )}
              <div
                style={{
                  fontSize: klein ? g.label : (kennzahl ? 36 : 30) * skala,
                  color: v("--color-text-secondary"),
                  lineHeight: 1.35,
                  maxWidth: kennzahl ? "90%" : undefined,
                }}
              >
                {s.label}
              </div>
            </div>
          );
        })}
      </div>
      )}

      {!klein && (
      <div
        style={{
          marginTop: 48 * skala,
          paddingTop: 28 * skala,
          borderTop: `${Math.max(1, 2 * skala)}px solid ${v("--color-border")}`,
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-end",
          gap: space.lg * skala,
        }}
      >
        <div style={{ fontSize: 24 * skala, color: v("--color-text-muted"), lineHeight: 1.35, maxWidth: "72%" }}>
          {bild.quelle}
        </div>
        {/* Die Marke als Logo, nicht als getippter Name: Im geteilten Bild ist
            sie das Einzige, was die Herkunft zeigt — einen Knopf, der darauf
            führt, gibt es hier nicht mehr. Das Logo führt seine Farben als
            Token, folgt also demselben Farbschema wie die Karte. */}
        <div style={{ flexShrink: 0 }}>
          <Logo width={200 * skala} />
        </div>
      </div>
      )}
    </div>
  );
}

/**
 * Der Umriss eines Bundeslands, linksbündig HINTER dem Wert.
 *
 * Er ordnet zu, ohne zu erklären — auf einem Bild, das ohne Bildunterschrift
 * durch fremde Feeds reist, ist die Form das Einzige, was ohne Lesen ankommt.
 *
 * Er liegt hinter dem ganzen Block und darf die Bezeichnung überlagern
 * (Betreiber, 27.08.2026) — bei dieser Deckkraft bleibt der Text lesbar, und ein
 * Zeichen, das man an der Form erkennen soll, braucht Fläche.
 *
 * Ein eigenes Bauteil, weil ihn beide Bildformen tragen. Als Kopie im Ringteil
 * blieb er in der Säule stumm liegen: Das Feld war gesetzt, gezeichnet wurde
 * nichts, und auffallen konnte das nur dem, der es vermisst.
 */
function UmrissZeichen({
  name,
  skala,
  groesse,
  farbe,
}: {
  name?: string;
  skala: number;
  groesse: number;
  farbe: string;
}) {
  const pfad = name ? BUNDESLAND_UMRISS[name] : undefined;
  if (!pfad) return null;
  return (
    <svg
      viewBox={`0 0 ${BUNDESLAND_UMRISS_SEITE} ${BUNDESLAND_UMRISS_SEITE}`}
      width={groesse * skala}
      height={groesse * skala}
      aria-hidden="true"
      style={{
        position: "absolute",
        left: 0,
        top: "50%",
        transform: "translateY(-50%)",
        opacity: 0.14,
        pointerEvents: "none",
      }}
    >
      <path d={pfad} fill={farbe} />
    </svg>
  );
}

/**
 * Zwei Werte als konzentrische Ringe, darunter zwei Kacheln mit Legendenpunkt.
 *
 * Woran normiert wird, entscheidet `bild.ganzes` — und das ist der ganze Punkt.
 * Bei Anteilen gibt es ein Ganzes (100 Prozent); dort wäre ein voller Ring für
 * 70 Prozent schlicht falsch, und der leere Rest bedeutet etwas. Wo es kein
 * Ganzes gibt („9,9 gegen 22,8 je 1.000 Einwohner"), wird am größeren der beiden
 * Werte normiert; dann füllt er seinen Ring ganz und der kleinere kommt
 * anteilig dazu.
 *
 * Der größere Wert liegt AUSSEN. Andersherum wäre der innere Ring länger als der
 * äußere, und das liest sich wie ein Fehler.
 *
 * Die schwache Spur unter jedem Ring ist die Referenz — ohne sie sähe man bei
 * kleinen Werten nur ein Bogenfragment und wüsste nicht, woran es gemessen ist.
 */
/**
 * Der Bogen beginnt gerade und endet rund.
 *
 * `strokeLinecap` kennt diese Unterscheidung nicht — es gilt für beide Enden.
 * Der Bogen wird deshalb mit geraden Enden gezeichnet und bekommt am Ende einen
 * Kreis aufgesetzt. Zwölf Uhr bleibt damit eine klare Kante, an der alle Ringe
 * gemeinsam starten; nur der Verlauf hört weich auf.
 *
 * Gekürzt wird um die halbe Strichbreite, weil genau so weit die aufgesetzte
 * Kappe übersteht. Ohne diese Kürzung zeigte der Ring eine andere Zahl als die
 * Kachel darunter — bei kleinen Anteilen deutlich.
 */
function bogenEnde(r: number, anteil: number, breite: number, mitte: number) {
  const umfang = 2 * Math.PI * r;
  const kappe = breite / 2;
  // Der Winkel, an dem der gezeichnete Bogen aufhört: das Ziel minus dem Stück,
  // das die Kappe selbst ausfüllt.
  const bis = Math.max(0, umfang * anteil - kappe);
  // OHNE die Drehung auf zwölf Uhr: Die umgebende Gruppe dreht bereits. Mit ihr
  // hier ein zweites Mal saß die Kappe eine Vierteldrehung neben ihrem Bogen —
  // im Bild ein dunkler Fleck irgendwo auf dem Ring, der wie ein Datenpunkt
  // aussah und keiner war.
  const winkel = (bis / umfang) * 2 * Math.PI;
  return {
    laenge: bis,
    x: mitte + r * Math.cos(winkel),
    y: mitte + r * Math.sin(winkel),
  };
}

function DonutTeil({ bild, max, skala }: { bild: PostBild; max: number; skala: number }) {
  const sortiert = [...bild.serien].sort((a, b) => Math.abs(b.wert) - Math.abs(a.wert));
  const zeigeEinheit = bild.einheitAmWert !== false;
  // Gibt es ein Ganzes, wird daran normiert — dann ist kein Ring voll, außer der
  // Wert füllt es wirklich aus. Sonst am größeren der beiden Werte.
  const grund = bild.ganzes ?? max;

  const SEITE = 560;
  const RINGE = [
    { r: 232, breite: 60 },
    { r: 152, breite: 60 },
  ];

  const toene = serienFarben(bild.stil);
  const farbe = (s: BildSerie) => (s.hervorgehoben ? toene.hervorgehoben : toene.gedaempft);

  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "center", gap: 56 * skala }}>
      <svg
        viewBox={`0 0 ${SEITE} ${SEITE}`}
        width={SEITE * skala}
        height={SEITE * skala}
        style={{ alignSelf: "center", display: "block" }}
        role="presentation"
      >
        <g transform={`rotate(-90 ${SEITE / 2} ${SEITE / 2})`}>
          {sortiert.map((s, i) => {
            const { r, breite } = RINGE[i];
            const umfang = 2 * Math.PI * r;
            const anteil = Math.min(Math.abs(s.wert) / grund, 1);
            const ende = bogenEnde(r, anteil, breite, SEITE / 2);
            return (
              <g key={s.label}>
                <circle
                  cx={SEITE / 2}
                  cy={SEITE / 2}
                  r={r}
                  fill="none"
                  stroke={toene.gedaempft}
                  // Schwach halten. Die Spur ist die Referenz, nicht der Wert —
                  // bei einem kleinen Anteil ist sie fast der ganze Ring, und zu
                  // kräftig gesetzt liest sich der KLEINERE Wert als große
                  // Fläche. Genau umgekehrt zur Aussage.
                  strokeOpacity={SPUR_DECKKRAFT}
                  strokeWidth={breite}
                />
                {anteil >= 1 ? (
                  <circle
                    cx={SEITE / 2}
                    cy={SEITE / 2}
                    r={r}
                    fill="none"
                    stroke={farbe(s)}
                    strokeWidth={breite}
                  />
                ) : (
                  <>
                    <circle
                      cx={SEITE / 2}
                      cy={SEITE / 2}
                      r={r}
                      fill="none"
                      stroke={farbe(s)}
                      strokeWidth={breite}
                      strokeDasharray={`${ende.laenge} ${umfang}`}
                      strokeLinecap="butt"
                    />
                    <circle cx={ende.x} cy={ende.y} r={breite / 2} fill={farbe(s)} />
                  </>
                )}
              </g>
            );
          })}
        </g>
      </svg>

      {/* Die Zuordnung Ring → Wert läuft über den Punkt, nicht über die
          Reihenfolge: Wer die Karte quer liest, soll die Farbe wiederfinden. */}
      {/* Zentriert mit Lücke statt über die volle Breite gestreckt: Zwei Kacheln
          an den Außenkanten lesen sich als Gegensatz-Paar, das sie nicht sind —
          sie gehören beide zum Ring darüber. */}
      <div style={{ display: "flex", gap: 96 * skala, justifyContent: "center" }}>
        {bild.serien.map((s) => (
          <div key={s.label} style={{ position: "relative" }}>
            <UmrissZeichen name={s.umriss} skala={skala} groesse={250} farbe={toene.gedaempft} />
            {/* Die Farbe trägt der Punkt, nicht der Text: Zwei eingefärbte Zahlen
                nebeneinander lesen sich als Wertung, und auf dem blauen
                Farbschema sind sie ohnehin kaum zu unterscheiden. */}
            <div style={{ display: "flex", alignItems: "center", gap: 14 * skala }}>
              <span
                style={{
                  width: 26 * skala,
                  height: 26 * skala,
                  borderRadius: "50%",
                  background: farbe(s),
                  flex: "0 0 auto",
                }}
              />
              <span style={{ fontSize: 38 * skala, lineHeight: 1.2, color: v("--color-text-secondary") }}>
                {s.label}
              </span>
            </div>
            {s.zusatz && (
              <div
                style={{
                  fontSize: 27 * skala,
                  color: v("--color-text-muted"),
                  lineHeight: 1.3,
                }}
              >
                {s.zusatz}
              </div>
            )}
            <div
              style={{
                position: "relative",
                display: "flex",
                alignItems: "baseline",
                gap: 12 * skala,
                marginTop: 16 * skala,
                whiteSpace: "nowrap",
              }}
            >
              <span
                style={{
                  fontSize: 84 * skala,
                  fontFamily: v("--font-mono"),
                  fontWeight: 700,
                  lineHeight: 1,
                  color: v("--color-text-primary"),
                }}
              >
                {s.wert.toLocaleString("de-DE", {
                  minimumFractionDigits: s.stellen ?? 0,
                  maximumFractionDigits: s.stellen ?? 0,
                })}
              </span>
              {zeigeEinheit && (
                <span style={{ fontSize: 28 * skala, color: v("--color-text-muted") }}>{s.einheit}</span>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/**
 * Zwei Werte als EINE Säule: der kleinere steckt als Sockel darin, der größere
 * überragt ihn.
 *
 * Für Zahlen ohne ein Ganzes — „9,9 gegen 22,8 Steckersolargeräte je 1.000
 * Einwohner". Zwei getrennte Balken zwingen zum Abschätzen zweier Längen, ein
 * Ring behauptete einen Rest, den es nicht gibt. Hier IST der Unterschied die
 * überragende Fläche, und man liest ihn, ohne etwas anzunehmen.
 *
 * Die Beschriftungen sitzen auf der Höhe ihres Segments: oben am Kopf der Säule
 * der größere Wert, an der Sockelkante der kleinere. Eine Legende bräuchte es
 * dann nicht mehr — die Zuordnung ist die Position.
 */
function SaeulenTeil({ bild, skala }: { bild: PostBild; skala: number }) {
  const [gross, klein] = [...bild.serien].sort((a, b) => Math.abs(b.wert) - Math.abs(a.wert));
  const zeigeEinheit = bild.einheitAmWert !== false;
  const toene = serienFarben(bild.stil);

  // Die Maße folgen den VERHÄLTNISSEN der Vorlage, nicht ihren Pixeln: Sie ist
  // bei knapp halber Kartenbreite gezeichnet, und ihre Zahlen eins zu eins
  // übernommen ergäben ein Element, das in dieser Fläche verloren geht.
  //
  // Die Höhe trägt die Aussage, die Breite trägt nichts — ein breiter Balken
  // sagt nicht mehr als ein schmaler, er nimmt nur Platz, den die Zahlen
  // brauchen.
  const BREITE = 170;
  const HOEHE = 620;
  // Der Ausleger neben dem Sockel trägt dessen Höhe nach rechts, damit die
  // Kante auch dort ablesbar ist, wo die Beschriftung steht.
  const AUSLEGER = Math.round(BREITE * 0.31);
  const ABSTAND = Math.round(BREITE * 0.42);
  // Die Grundlinie ragt über die Säule hinaus, links wie rechts: Endete sie an
  // ihrer Kante, wäre sie ein Sockel der Säule statt der Boden, auf dem sie
  // steht — und eine Höhe liest man gegen einen Boden ab.
  const UEBERSTAND = Math.round(BREITE * 0.2);
  const TEXTBREITE = 400;
  const GRUNDLINIE = Math.max(2, 4 * skala);
  const sockel = Math.max(0, Math.min(Math.abs(klein.wert) / Math.abs(gross.wert), 1)) * HOEHE;
  const ecke = Math.round(BREITE * 0.1) * skala;

  const wert = (s: BildSerie) =>
    s.wert.toLocaleString("de-DE", {
      minimumFractionDigits: s.stellen ?? 0,
      maximumFractionDigits: s.stellen ?? 0,
    });

  const block = (s: BildSerie, gruppe: boolean) => (
    <div style={{ position: "relative" }}>
      <UmrissZeichen name={s.umriss} skala={skala} groesse={gruppe ? 300 : 220} farbe={toene.gedaempft} />
      <div style={{ fontSize: 30 * skala, color: v("--color-text-muted"), lineHeight: 1.25 }}>
        {s.zusatz ?? s.label}
      </div>
      <div
        style={{
          position: "relative",
          display: "flex",
          alignItems: "baseline",
          gap: 12 * skala,
          whiteSpace: "nowrap",
        }}
      >
        <span
          style={{
            fontSize: (gruppe ? 96 : 64) * skala,
            fontFamily: v("--font-mono"),
            fontWeight: 700,
            lineHeight: 1.1,
            color: v("--color-text-primary"),
          }}
        >
          {wert(s)}
        </span>
        {zeigeEinheit && <span style={{ fontSize: 28 * skala, color: v("--color-text-muted") }}>{s.einheit}</span>}
      </div>
      {s.delta && (
        <div
          style={{
            fontSize: 44 * skala,
            fontFamily: v("--font-mono"),
            fontWeight: 700,
            color: v("--color-accent"),
            // Dicht an die Zahl: Der Abstand gehört zwischen die beiden
            // Beschriftungsblöcke, nicht zwischen einen Wert und seine
            // Ergänzung — die beiden sind eine Aussage.
            marginTop: -4 * skala,
          }}
        >
          {s.delta}
        </div>
      )}
    </div>
  );

  return (
    <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center" }}>
      {/* Feste Gesamtbreite, damit die Gruppe mittig steht: Die Blöcke liegen
          absolut auf der Säulenhöhe, eine Breite „nach Inhalt" gibt es hier
          nicht. */}
      <div
        style={{
          position: "relative",
          height: (HOEHE + GRUNDLINIE / skala) * skala,
          width: (BREITE + AUSLEGER + ABSTAND + TEXTBREITE) * skala,
        }}
      >
        {/* Grundlinie: Ohne sie schwebt die Säule, und eine schwebende Säule
            lässt sich in der Höhe nicht vergleichen. */}
        <div
          style={{
            position: "absolute",
            left: -UEBERSTAND * skala,
            bottom: 0,
            width: (BREITE + AUSLEGER + 2 * UEBERSTAND) * skala,
            height: GRUNDLINIE,
            background: v("--color-border"),
          }}
        />

        {/* Die volle Säule ist der größere Wert. */}
        <div
          style={{
            position: "absolute",
            left: 0,
            bottom: GRUNDLINIE,
            width: BREITE * skala,
            height: HOEHE * skala,
            background: toene.hervorgehoben,
            borderRadius: `${ecke}px ${ecke}px 0 0`,
          }}
        />
        {/* Der Sockel ist der kleinere Wert. Keine Fuge zwischen ihm und dem
            oberen Teil: Die beiden Flächen sind EINE Säule, und eine Trennlinie
            quer hindurch machte daraus zwei gestapelte Kästen. */}
        <div
          style={{
            position: "absolute",
            left: 0,
            bottom: GRUNDLINIE,
            width: BREITE * skala,
            height: sockel * skala,
            background: toene.gedaempft,
          }}
        />
        {/* Der Ausleger ist ein eigener Körper daneben, deshalb trennt ihn eine
            senkrechte Fuge — sonst wächst er der Säule an und ihre Breite sieht
            aus, als spränge sie am Sockel. */}
        <div
          style={{
            position: "absolute",
            left: BREITE * skala,
            bottom: GRUNDLINIE,
            width: AUSLEGER * skala,
            height: sockel * skala,
            background: toene.gedaempft,
            opacity: 0.4,
            borderLeft: `${Math.max(2, 4 * skala)}px solid ${v("--color-bg")}`,
            boxSizing: "border-box",
            borderRadius: `0 ${ecke}px 0 0`,
          }}
        />

        {/* Beschriftungen auf Segmenthöhe. */}
        {/* Mittig im jeweiligen Abschnitt statt an dessen Oberkante: Die
            Beschriftung gehört zur Fläche, nicht zu ihrer Kante — oben bündig
            gesetzt zog sie den Blick auf die Trennstelle, die keine Aussage
            trägt. */}
        <div
          style={{
            position: "absolute",
            left: (BREITE + AUSLEGER + ABSTAND) * skala,
            top: 0,
            width: TEXTBREITE * skala,
            height: (HOEHE - sockel) * skala,
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
          }}
        >
          {block(gross, true)}
        </div>
        <div
          style={{
            position: "absolute",
            left: (BREITE + AUSLEGER + ABSTAND) * skala,
            bottom: GRUNDLINIE,
            width: TEXTBREITE * skala,
            height: sockel * skala,
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
          }}
        >
          {block(klein, false)}
        </div>
      </div>
    </div>
  );
}

/**
 * Bundesländer als anteilig gefüllte Umrisse.
 *
 * Die Form behauptet ein Gefäß, das sich füllt — deshalb NUR für Anteile, und
 * gefüllt wird gegen `ganzes`, nicht gegen den größeren der beiden Werte. Am
 * Maximum normiert wäre der Spitzenreiter immer randvoll, egal ob er bei 70 oder
 * bei 7 Prozent steht, und das Bild sagte etwas anderes als die Zahl darunter.
 *
 * Von UNTEN nach oben: Die Leserichtung eines Füllstands ist die eines
 * Behälters. Von oben herab gefüllt liest sich dieselbe Fläche als Rest.
 */
function UmrissTeil({ bild, skala }: { bild: PostBild; skala: number }) {
  const grund = bild.ganzes ?? 100;
  const zeigeEinheit = bild.einheitAmWert !== false;
  const toene = serienFarben(bild.stil);
  const GROESSE = bild.serien.length > 2 ? 260 : 340;

  return (
    <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center" }}>
      {/* Die Formen stehen auf EINER Grundlinie, weil sie ein Balkendiagramm
          ersetzen (Betreiber, 28.08.2026). Zentriert im Quadrat stünden sie auf
          verschiedenen Höhen, und dann vergleicht man Füllstände über einer
          Linie, die es nicht gibt. */}
      <div style={{ display: "flex", gap: 72 * skala, alignItems: "flex-start", justifyContent: "center" }}>
        {bild.serien.map((s) => {
          const pfad = s.umriss ? BUNDESLAND_UMRISS[s.umriss] : undefined;
          const anteil = Math.max(0, Math.min(Math.abs(s.wert) / grund, 1));
          const farbe = s.hervorgehoben ? toene.hervorgehoben : toene.gedaempft;
          // Die Kennung muss je Karte eindeutig sein: Zwei Umrisse mit derselben
          // Schnittmaske teilen sich sonst die erste — und die zweite Fläche
          // trüge die Form der ersten, ohne dass etwas fehlschlägt.
          const maske = `umriss-${s.umriss ?? s.label}`.replace(/[^a-zA-Z0-9-]/g, "");
          // Der Ausschnitt ist die FORM, nicht ihr Quadrat: Mecklenburg-Vorpommern
          // sitzt darin nur zwischen 15 und 85, und eine Füllung von 8 Prozent lag
          // damit vollständig unterhalb der Landform — im Bild war nichts zu
          // sehen, während die Zahl daneben einen Wert behauptete.
          const box = pfad ? umrissBox(pfad) : { x0: 0, y0: 0, breite: 100, hoehe: 100 };
          return (
            <div key={s.label} style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
              {pfad ? (
                <svg
                  viewBox={`${box.x0} ${box.y0} ${box.breite} ${box.hoehe}`}
                  // Unten bündig: Das ist die gemeinsame Grundlinie. Ohne sie
                  // schwebt eine flache Form über der Zeile, und ihr Füllstand
                  // lässt sich mit dem der Nachbarform nicht vergleichen.
                  preserveAspectRatio="xMidYMax meet"
                  width={GROESSE * skala}
                  height={GROESSE * skala}
                  role="presentation"
                  style={{ display: "block" }}
                >
                  <defs>
                    <clipPath id={maske}>
                      <path d={pfad} />
                    </clipPath>
                  </defs>
                  {/* Der ungefüllte Teil bleibt sichtbar — ohne ihn stünde da
                      eine abgeschnittene Form, die man nicht mehr erkennt.
                      Dieselbe Deckkraft wie die Spur unter einem Ring: Beide sind
                      die Referenz, gegen die gemessen wird, und sie sollen in
                      allen Formen gleich aussehen (Betreiber, 28.08.2026). */}
                  <path d={pfad} fill={toene.gedaempft} fillOpacity={SPUR_DECKKRAFT} />
                  <g clipPath={`url(#${maske})`}>
                    <rect
                      x={box.x0}
                      y={box.y0 + box.hoehe * (1 - anteil)}
                      width={box.breite}
                      height={box.hoehe * anteil}
                      fill={farbe}
                    />
                  </g>
                </svg>
              ) : (
                <div style={{ width: GROESSE * skala, height: GROESSE * skala }} />
              )}

              <div
                style={{
                  display: "flex",
                  alignItems: "baseline",
                  gap: 10 * skala,
                  marginTop: 24 * skala,
                  whiteSpace: "nowrap",
                }}
              >
                <span
                  style={{
                    fontSize: 88 * skala,
                    fontFamily: v("--font-mono"),
                    fontWeight: 700,
                    lineHeight: 1,
                    color: farbe,
                  }}
                >
                  {s.wert.toLocaleString("de-DE", {
                    minimumFractionDigits: s.stellen ?? 0,
                    maximumFractionDigits: s.stellen ?? 0,
                  })}
                </span>
                {zeigeEinheit && (
                  <span style={{ fontSize: 30 * skala, color: v("--color-text-muted") }}>{s.einheit}</span>
                )}
              </div>
              <div style={{ fontSize: 32 * skala, color: v("--color-text-secondary"), marginTop: 6 * skala }}>
                {s.label}
              </div>
              {s.zusatz && (
                <div style={{ fontSize: 26 * skala, color: v("--color-text-muted") }}>{s.zusatz}</div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

/**
 * Die ganze Ordnung als Balkenreihe.
 *
 * Wofür sie da ist: Zwei Werte sagen, WIE WEIT der Erste vom Letzten entfernt
 * ist. Die Reihe sagt zusätzlich, ob dazwischen ein Gefälle liegt oder ein
 * Bruch — beim Freiflächenanteil stehen neun Länder über dreißig Prozent und
 * vier unter zwanzig, und diese Zweiteilung ist die eigentliche Geschichte.
 *
 * Normiert wird über `laenge`, also bei Anteilen am Ganzen und bei Faktoren ab
 * ihrem Nullpunkt. Ohne das zeigte die Reihe eine Ordnung, die stimmt, mit
 * Abständen, die nicht stimmen — und Abstände sind hier der ganze Zweck.
 *
 * Der Wert steht RECHTS in einer eigenen Spur, nicht am Balkenende: Wandernde
 * Zahlen zwingen den Blick auf einen Zickzackweg, und bei kurzen Balken säße die
 * Zahl über dem Balken des Nachbarn.
 */
function RanglistenTeil({ bild, skala }: { bild: PostBild; skala: number }) {
  const roh = bild.reihe ?? [];
  const toene = serienFarben(bild.stil);
  const zeigeEinheit = bild.einheitAmWert !== false;
  // Die Zeilenhöhe folgt der Zahl der Einträge, nicht umgekehrt: Sechzehn Länder
  // müssen genauso auf die Karte wie sechs, ohne dass jemand nachrechnet.
  const eng = roh.length > 12;
  const schrift = eng ? 30 : 36;
  const balken = eng ? 22 : 30;

  /**
   * Der Balken zeigt die ANGEZEIGTE Zahl, nicht den Rohwert.
   *
   * Am Bild aufgefallen und sonst nirgends: Schleswig-Holstein (50,2) und
   * Sachsen (50,0) standen beide mit „50 %" da — mit sichtbar verschieden langen
   * Balken. Zwei gleiche Zahlen mit ungleichen Balken lesen sich als Fehler in
   * der Grafik, und im Zweifel glaubt man dem Balken. Bei zwei Werten kommt der
   * Fall nicht vor, bei sechzehn dreimal.
   */
  const stellen = ranglistenStellen(bild);
  const reihe = roh.map((s) => ({ ...s, wert: Number(s.wert.toFixed(stellen)), stellen }));
  const max = Math.max(...reihe.map((s) => Math.abs(s.wert)), 1);

  return (
    <div
      style={{
        flex: 1,
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        gap: (eng ? 14 : 22) * skala,
      }}
    >
      {reihe.map((s) => {
        const anteil = laenge(s.wert, bild, max);
        const farbe = s.hervorgehoben ? toene.hervorgehoben : toene.gedaempft;
        return (
          <div key={s.label} style={{ display: "flex", alignItems: "center", gap: 20 * skala }}>
            <div
              style={{
                // Breit genug für den längsten Namen im Bestand: Bei 30 px
                // braucht „Mecklenburg-Vorpommern" 348 Pixel und stand mit 290
                // als „Mecklenburg-Vorpo…" im Bild. Ein abgeschnittener
                // Ländername in einem Bild, das ohne Bildunterschrift durch
                // fremde Feeds reist, ist dieselbe Fehlerklasse wie ein
                // abgeschnittener Quellenvermerk. Der Zuschlag deckt die
                // Fettschrift der hervorgehobenen Zeile ab.
                width: 380 * skala,
                flex: "0 0 auto",
                fontSize: schrift * skala,
                lineHeight: 1.15,
                color: s.hervorgehoben ? v("--color-text-primary") : v("--color-text-secondary"),
                fontWeight: s.hervorgehoben ? 700 : 400,
                // Ein Ländername, der umbricht, verschiebt seine eigene Zeile
                // gegen die Nachbarn — dann liest sich die Reihe nicht mehr als
                // Raster.
                whiteSpace: "nowrap",
                overflow: "hidden",
                textOverflow: "ellipsis",
              }}
            >
              {s.label}
            </div>
            {/* Die Spur unter dem Balken ist die Referenz: Ohne sie sieht man bei
                kleinen Werten nur ein Stück Farbe und weiß nicht, woran es
                gemessen ist — dieselbe Überlegung wie beim Ring. */}
            <div
              style={{
                flex: 1,
                height: balken * skala,
                background: toene.gedaempft,
                opacity: 1,
                position: "relative",
                borderRadius: v("--radius-sm"),
                overflow: "hidden",
              }}
            >
              <div
                style={{
                  position: "absolute",
                  inset: 0,
                  background: v("--color-bg"),
                  // Die Spur bleibt schwach — sie ist der Rahmen, nicht der Wert.
                  opacity: 0.86,
                }}
              />
              <div
                style={{
                  position: "absolute",
                  left: 0,
                  top: 0,
                  bottom: 0,
                  // Ein Wert nahe null bekommt einen sichtbaren Rest, sonst sieht
                  // die Zeile aus, als fehlte die Angabe. Zwei Prozent sind bei
                  // dieser Breite gut ein Dutzend Pixel — sichtbar, aber zu klein,
                  // um eine Größe vorzutäuschen.
                  width: `${Math.max(anteil * 100, 2)}%`,
                  background: farbe,
                  borderRadius: v("--radius-sm"),
                }}
              />
            </div>
            <div
              style={{
                width: 130 * skala,
                flex: "0 0 auto",
                textAlign: "right",
                whiteSpace: "nowrap",
                fontSize: schrift * skala,
                fontFamily: v("--font-mono"),
                fontWeight: s.hervorgehoben ? 700 : 400,
                color: s.hervorgehoben ? v("--color-text-primary") : v("--color-text-secondary"),
              }}
            >
              {s.wert.toLocaleString("de-DE", {
                minimumFractionDigits: s.stellen ?? 0,
                maximumFractionDigits: s.stellen ?? 0,
              })}
              {zeigeEinheit && (
                <span style={{ fontSize: schrift * 0.7 * skala, color: v("--color-text-muted") }}>
                  {" "}
                  {s.einheit}
                </span>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

/**
 * Drei und mehr Teile eines Ganzen als EIN durchgehender Balken.
 *
 * Der Unterschied zur Balkenreihe ist die Aussage, nicht die Darstellung: Dort
 * stehen Werte nebeneinander, hier bilden sie zusammen etwas. Deshalb liegen sie
 * in einem Körper und nicht in vier — eine Reihe getrennter Balken lässt offen,
 * ob sie sich ergänzen.
 *
 * Der Rest zum Ganzen wird MITGEZEICHNET und benannt. Die drei Solarsegmente
 * ergeben 98,8 Prozent; die fehlenden 1,2 sind Steckersolar. Als Lücke gelassen
 * wäre der Balken zu kurz und niemand wüsste warum — als namenloses Segment wäre
 * es schlimmer.
 */
function AufteilungsTeil({ bild, skala }: { bild: PostBild; skala: number }) {
  const ganzes = bild.ganzes ?? 100;
  const toene = serienFarben(bild.stil);
  const zeigeEinheit = bild.einheitAmWert !== false;
  const rest = restVon(bild);
  // Der Rest zählt als Teil mit, sobald er nennenswert ist. Die Schwelle liegt
  // bei einem halben Prozent des Ganzen: Darunter ist er Rundung, darüber eine
  // eigene Größe.
  const zeigeRest = rest > ganzes * 0.005 && !!bild.restLabel;
  // Alle Teile in DERSELBEN Genauigkeit, und zwar in einer, in der sie sich zum
  // Ganzen addieren — sonst steht in der Legende eine Summe, die der Balken
  // daneben widerlegt.
  const stellen = aufteilungsStellen(bild);

  const teile = [
    ...bild.serien.map((s) => ({ serie: { ...s, stellen }, anteil: Math.abs(s.wert) / ganzes, istRest: false })),
    ...(zeigeRest
      ? [
          {
            serie: {
              label: bild.restLabel!,
              wert: rest,
              einheit: bild.serien[0]?.einheit ?? "",
              stellen,
            } as BildSerie,
            anteil: rest / ganzes,
            istRest: true,
          },
        ]
      : []),
  ];

  /**
   * Vier Teile, zwei Farben — und das JEDE Segment seinen Namen trägt, ist die
   * Auflösung dieses Widerspruchs.
   *
   * Erste Fassung: Balken oben, Legende darunter, die Teile über absteigende
   * Deckkraft unterschieden. Im hellen Schema sah das gut aus (schwarz →
   * mittelgrau → hellgrau) und war im Highlight kaputt: Auf blauem Grund wird
   * aus einer durchscheinenden Fläche wieder Blau, Freifläche und Gewerbedach
   * standen als zwei fast gleiche Töne nebeneinander, und der Rest verschwand
   * ganz. Die Regel des Farbschemas sagt genau das — im Highlight sind Flächen
   * Vollton, nie durchscheinend.
   *
   * Eine dritte Serienfarbe wäre die andere Möglichkeit gewesen und die
   * schlechtere: Kategorienfarben behaupten eine Bedeutung, die es hier nicht
   * gibt — die Segmente stehen in keiner Ordnung zueinander außer ihrer Größe.
   *
   * Ein Segment, das seinen Namen trägt, braucht die Farbe zur Unterscheidung
   * gar nicht. Damit fällt auch die Legende weg, und mit ihr die Zuordnung über
   * Farbpunkte, die im Highlight ohnehin nicht funktioniert hätte.
   */
  const farbeVon = (t: (typeof teile)[number]) =>
    t.serie.hervorgehoben ? toene.hervorgehoben : toene.gedaempft;
  // Auf der hervorgehobenen Fläche steht der Grund, auf den gedämpften der
  // Kartengrund: Beide Serientöne sind kräftig, ein Text in Textfarbe darauf
  // wäre in beiden Schemata schwer lesbar.
  const textAuf = () => v("--color-bg");
  // Unter diesem Anteil passt keine Beschriftung mehr hinein. Gemessen am
  // schmalsten benannten Fall im Bestand: „Privates Dach" mit 28,5 Prozent
  // braucht rund ein Fünftel der Breite.
  const PASST_AB = 0.14;

  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "center", gap: 64 * skala }}>
      {/* Ein hoher Balken, damit die Beschriftung darin Platz hat. */}
      <div
        style={{
          display: "flex",
          width: "100%",
          height: 300 * skala,
          borderRadius: v("--radius-md"),
          overflow: "hidden",
        }}
      >
        {teile.map((t, i) => {
          const passt = t.anteil >= PASST_AB;
          return (
            <div
              key={t.serie.label}
              style={{
                width: `${t.anteil * 100}%`,
                background: farbeVon(t),
                // Eine Fuge zwischen den Segmenten, aber keine zwischen Segment und
                // Kartenrand: Der Balken ist EIN Körper, die Fugen trennen seine
                // Teile.
                borderLeft: i > 0 ? `${Math.max(2, 5 * skala)}px solid ${v("--color-bg")}` : undefined,
                boxSizing: "border-box",
                display: "flex",
                flexDirection: "column",
                justifyContent: "flex-end",
                padding: `${20 * skala}px ${22 * skala}px`,
                color: textAuf(),
                overflow: "hidden",
              }}
            >
              {passt && (
                <>
                  <span
                    style={{
                      fontSize: 52 * skala,
                      fontFamily: v("--font-mono"),
                      fontWeight: 700,
                      lineHeight: 1,
                      whiteSpace: "nowrap",
                    }}
                  >
                    {t.serie.wert.toLocaleString("de-DE", {
                      minimumFractionDigits: t.serie.stellen ?? 0,
                      maximumFractionDigits: t.serie.stellen ?? 0,
                    })}
                    {zeigeEinheit && <span style={{ fontSize: 32 * skala }}> {t.serie.einheit}</span>}
                  </span>
                  <span style={{ fontSize: 32 * skala, lineHeight: 1.2, marginTop: 8 * skala }}>
                    {t.serie.label}
                  </span>
                </>
              )}
            </div>
          );
        })}
      </div>

      {/* Was nicht ins Segment passt, steht darunter — mit seiner Position im
          Balken benannt, nicht mit einem Farbpunkt: Die Farbe unterscheidet die
          gedämpften Teile nicht, und ein Punkt, der keine Zuordnung leistet,
          behauptet eine. */}
      {teile.some((t) => t.anteil < PASST_AB) && (
        <div style={{ display: "flex", flexDirection: "column", gap: 14 * skala }}>
          {teile
            .filter((t) => t.anteil < PASST_AB)
            .map((t) => (
              <div
                key={t.serie.label}
                style={{
                  fontSize: 32 * skala,
                  color: v("--color-text-muted"),
                  lineHeight: 1.3,
                }}
              >
                Rechts im Balken:{" "}
                {t.serie.wert.toLocaleString("de-DE", {
                  minimumFractionDigits: t.serie.stellen ?? 0,
                  maximumFractionDigits: t.serie.stellen ?? 0,
                })}
                {zeigeEinheit ? ` ${t.serie.einheit}` : ""} {t.serie.label}
              </div>
            ))}
        </div>
      )}
    </div>
  );
}

/**
 * Werte über die Zeit als Linien.
 *
 * Wofür: Zwei Stichtage sagen, wie groß ein Abstand IST. Ob er wächst oder
 * schrumpft, sagen sie nicht — und genau das behauptet ein Beitrag, der von
 * Aufholen oder Zurückfallen spricht. Beim Pro-Kopf-Vergleich liegt darin die
 * Pointe: Deutschland steht seit 2021 fast still, während der Spitzenreiter
 * weiterzieht.
 *
 * Beschriftet wird AM ENDE DER LINIE, nicht in einer Legende. Ein Bild hat kein
 * Hover; eine Legende zwingt zum Abgleich zweier Farben, das Ende der Linie
 * nicht. Zwei y-Stufen stehen im Bild, weil die Größenordnung sonst fehlt —
 * dieselbe Regel wie bei den Export-Charts.
 */
function VerlaufsTeil({ bild, skala }: { bild: PostBild; skala: number }) {
  const achse = bild.achse ?? [];
  const toene = serienFarben(bild.stil);
  const alle = bild.serien.flatMap((s) => s.verlauf ?? []);
  // Von NULL aus, nicht vom kleinsten Wert: Eine Kurve, deren Grundlinie
  // irgendwo in der Luft hängt, übertreibt jede Bewegung — bei einer Erzeugung
  // je Kopf gibt es außerdem einen echten Nullpunkt, und der gehört ins Bild.
  const max = Math.max(...alle, 1);
  // Auf eine glatte Stufe aufrunden, damit die Achsenbeschriftung eine runde
  // Zahl trägt statt des zufälligen Maximums eines Jahrgangs.
  const stufe = Math.pow(10, Math.floor(Math.log10(max)));
  const obenWert = Math.ceil(max / (stufe / 2)) * (stufe / 2);

  const B = 950;
  const H = 700;
  const LINKS = 150;
  /**
   * Platz rechts für die Beschriftung am Linienende — mit Zuschlag, nicht auf
   * Kante.
   *
   * Gemessen: „Deutschland" endet bei 30 px Schrift auf x = 926 von 950, also
   * mit 24 Pixeln Reserve. Genau in dieser Größenordnung ist im Projekt schon
   * einmal eine Kurvenbeschriftung im aufgenommenen Bild als „Erneuerba"
   * geendet: Die Bildaufnahme setzt Text breiter als die Messung auf der Seite.
   * Die Regel dafür lautet ein Viertel Zuschlag auf den gemessenen Bedarf.
   */
  const RECHTS = 260;

  const x = (i: number) => LINKS + ((B - LINKS - RECHTS) * i) / Math.max(1, achse.length - 1);
  const y = (w: number) => H - 40 - ((H - 80) * w) / obenWert;

  const marken = [obenWert, obenWert / 2];

  return (
    <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center" }}>
      <svg viewBox={`0 0 ${B} ${H}`} width={B * skala} height={H * skala} role="presentation" style={{ display: "block" }}>
        {marken.map((m) => (
          <g key={m}>
            <line
              x1={LINKS}
              x2={B - RECHTS}
              y1={y(m)}
              y2={y(m)}
              stroke={toene.gedaempft}
              strokeOpacity={0.25}
              strokeWidth={2}
            />
            <text
              x={LINKS - 16}
              y={y(m) + 10}
              textAnchor="end"
              fontSize={28}
              fill="currentColor"
              opacity={0.6}
              fontFamily="var(--font-mono)"
            >
              {m.toLocaleString("de-DE")}
            </text>
          </g>
        ))}
        {/* Grundlinie bei null: Sie sagt, wovon die Kurven aufsteigen. */}
        <line x1={LINKS} x2={B - RECHTS} y1={y(0)} y2={y(0)} stroke={toene.gedaempft} strokeOpacity={0.5} strokeWidth={2} />
        <text x={LINKS - 16} y={y(0) + 10} textAnchor="end" fontSize={28} fill="currentColor" opacity={0.6} fontFamily="var(--font-mono)">
          0
        </text>

        {/* Nur erstes und letztes Jahr: Fünfundzwanzig Jahreszahlen unter einer
            Kurve sind ein Band, keine Achse. */}
        <text x={LINKS} y={H - 4} textAnchor="start" fontSize={28} fill="currentColor" opacity={0.6} fontFamily="var(--font-mono)">
          {achse[0]}
        </text>
        <text x={B - RECHTS} y={H - 4} textAnchor="end" fontSize={28} fill="currentColor" opacity={0.6} fontFamily="var(--font-mono)">
          {achse[achse.length - 1]}
        </text>

        {bild.serien.map((s) => {
          const werte = s.verlauf ?? [];
          if (werte.length !== achse.length) return null;
          const farbe = s.hervorgehoben ? toene.hervorgehoben : toene.gedaempft;
          const d = werte.map((w, i) => `${i === 0 ? "M" : "L"} ${x(i)} ${y(w)}`).join(" ");
          const letzterWert = werte[werte.length - 1];
          return (
            <g key={s.label}>
              <path d={d} fill="none" stroke={farbe} strokeWidth={s.hervorgehoben ? 8 : 6} strokeLinejoin="round" strokeLinecap="round" />
              {/* Ein Punkt am Ende: Er bindet die Beschriftung an ihre Linie,
                  auch wenn zwei Enden dicht beieinanderliegen. */}
              <circle cx={x(werte.length - 1)} cy={y(letzterWert)} r={10} fill={farbe} />
              <text
                x={x(werte.length - 1) + 22}
                y={y(letzterWert) + 10}
                fontSize={30}
                fontWeight={s.hervorgehoben ? 700 : 400}
                fill={farbe}
              >
                {s.label}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}

export const SOCIAL_KARTE_MASSE = { breite: BREITE, hoehe: HOEHE };
