import Logo from "../Logo";
import { v, space } from "../../lib/theme";
import { kartenTokens } from "../../lib/social-karten-stil";
import { BUNDESLAND_UMRISS, BUNDESLAND_UMRISS_SEITE } from "../../lib/bundesland-umrisse";
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
      {!klein && (
        <div style={{ fontSize: px(g.untertitel), color: v("--color-text-muted"), marginBottom: px(64) }}>
          {bild.gemessen}
        </div>
      )}

      {donut ? (
        <DonutTeil bild={bild} max={max} skala={skala} />
      ) : saeule ? (
        <SaeulenTeil bild={bild} skala={skala} />
      ) : (
      <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "space-evenly" }}>
        {serien.map((s) => {
          const anteil = Math.abs(s.wert) / max;
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
                    width: `${Math.max(anteil * 100, 4)}%`,
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
 * Der Umriss eines Bundeslands, schwach hinter dem Wert.
 *
 * Er ordnet zu, ohne zu erklären — auf einem Bild, das ohne Bildunterschrift
 * durch fremde Feeds reist, ist die Form das Einzige, was ohne Lesen ankommt.
 * Er sitzt hinter der ZAHL, nicht neben der Bezeichnung: Die Zahl ist groß und
 * dunkel und steht klar davor, ein Ländername in Fließtextgröße nicht.
 *
 * Ein eigenes Bauteil, weil ihn beide Bildformen tragen. Als Kopie im Ringteil
 * blieb er in der Säule stumm liegen: Das Feld war gesetzt, gezeichnet wurde
 * nichts, und auffallen konnte das nur dem, der es vermisst.
 */
function UmrissZeichen({ name, skala }: { name?: string; skala: number }) {
  const pfad = name ? BUNDESLAND_UMRISS[name] : undefined;
  if (!pfad) return null;
  return (
    <svg
      viewBox={`0 0 ${BUNDESLAND_UMRISS_SEITE} ${BUNDESLAND_UMRISS_SEITE}`}
      width={132 * skala}
      height={132 * skala}
      aria-hidden="true"
      style={{ position: "absolute", right: 0, bottom: 0, opacity: 0.1, pointerEvents: "none" }}
    >
      <path d={pfad} fill={v("--color-text-primary")} />
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
  const winkel = (bis / umfang) * 2 * Math.PI - Math.PI / 2;
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

  const farbe = (s: BildSerie) => (s.hervorgehoben ? v("--color-accent") : v("--color-text-primary"));

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
                  stroke={v("--color-text-primary")}
                  strokeOpacity={0.12}
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
      <div style={{ display: "flex", gap: 40 * skala }}>
        {bild.serien.map((s) => (
          <div key={s.label} style={{ flex: 1, minWidth: 0, position: "relative" }}>
            <UmrissZeichen name={s.umriss} skala={skala} />
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
                  marginLeft: 40 * skala,
                }}
              >
                {s.zusatz}
              </div>
            )}
            <div
              style={{
                display: "flex",
                alignItems: "baseline",
                gap: 12 * skala,
                marginTop: 16 * skala,
                marginLeft: 40 * skala,
                whiteSpace: "nowrap",
              }}
            >
              <span style={{ fontSize: 84 * skala, fontWeight: 700, lineHeight: 1, color: v("--color-text-primary") }}>
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

  // Die Maße folgen den VERHÄLTNISSEN der Vorlage, nicht ihren Pixeln: Sie ist
  // bei knapp halber Kartenbreite gezeichnet, und ihre Zahlen eins zu eins
  // übernommen ergäben ein Element, das in dieser Fläche verloren geht.
  //
  // Das Verhältnis von Breite zu Höhe ist dabei das Entscheidende. Eine erste
  // Fassung war fast doppelt so schlank wie die Vorlage — dieselbe Rechnung,
  // dasselbe Segmentverhältnis, und trotzdem wirkte sie wie ein Diagrammrest
  // statt wie ein Körper, an dem man Höhe abliest.
  const BREITE = 280;
  const HOEHE = Math.round(BREITE * 2.22);
  // Der Ausleger neben dem Sockel trägt dessen Höhe nach rechts, damit die
  // Kante auch dort ablesbar ist, wo die Beschriftung steht.
  const AUSLEGER = Math.round(BREITE * 0.31);
  const ABSTAND = Math.round(BREITE * 0.3);
  const sockel = Math.max(0, Math.min(Math.abs(klein.wert) / Math.abs(gross.wert), 1)) * HOEHE;
  const ecke = Math.round(BREITE * 0.09) * skala;

  const wert = (s: BildSerie) =>
    s.wert.toLocaleString("de-DE", {
      minimumFractionDigits: s.stellen ?? 0,
      maximumFractionDigits: s.stellen ?? 0,
    });

  const block = (s: BildSerie, gruppe: boolean) => (
    <div style={{ position: "relative" }}>
      <UmrissZeichen name={s.umriss} skala={skala} />
      <div style={{ fontSize: 30 * skala, color: v("--color-text-muted"), lineHeight: 1.3 }}>
        {s.zusatz ?? s.label}
      </div>
      <div style={{ display: "flex", alignItems: "baseline", gap: 12 * skala, whiteSpace: "nowrap" }}>
        <span
          style={{
            fontSize: (gruppe ? 88 : 60) * skala,
            // Halbfett statt fett: In der Vorlage stehen die Werte im mittleren
            // Schnitt, und daneben wirkt die volle Fettung wie ein Ausrufezeichen
            // an einer Zahl, die für sich spricht.
            fontWeight: 600,
            lineHeight: 1.1,
            color: v("--color-text-primary"),
          }}
        >
          {wert(s)}
        </span>
        {zeigeEinheit && <span style={{ fontSize: 28 * skala, color: v("--color-text-muted") }}>{s.einheit}</span>}
      </div>
      {s.delta && (
        <div style={{ fontSize: 32 * skala, fontWeight: 600, color: v("--color-accent"), marginTop: 4 * skala }}>
          {s.delta}
        </div>
      )}
    </div>
  );

  return (
    <div style={{ flex: 1, display: "flex", alignItems: "center" }}>
      <div style={{ position: "relative", height: HOEHE * skala, width: "100%" }}>
        {/* Grundlinie: Ohne sie schwebt die Säule, und eine schwebende Säule
            lässt sich in der Höhe nicht vergleichen. */}
        <div
          style={{
            position: "absolute",
            left: 0,
            bottom: 0,
            width: (BREITE + AUSLEGER + ABSTAND / 2) * skala,
            height: Math.max(1, 2 * skala),
            background: v("--color-border"),
          }}
        />

        {/* Die volle Säule ist der größere Wert. */}
        <div
          style={{
            position: "absolute",
            left: 0,
            bottom: Math.max(1, 2 * skala),
            width: BREITE * skala,
            height: HOEHE * skala,
            background: v("--color-accent"),
            borderRadius: `${ecke}px ${ecke}px 0 0`,
          }}
        />
        {/* Der Sockel ist der kleinere. Die helle Fuge darüber trennt die beiden
            Flächen, ohne eine dritte Farbe einzuführen. */}
        <div
          style={{
            position: "absolute",
            left: 0,
            bottom: Math.max(1, 2 * skala),
            width: BREITE * skala,
            height: sockel * skala,
            background: v("--color-text-primary"),
            borderTop: `${Math.max(1, 3 * skala)}px solid ${v("--color-bg")}`,
            boxSizing: "border-box",
          }}
        />
        <div
          style={{
            position: "absolute",
            left: BREITE * skala,
            bottom: Math.max(1, 2 * skala),
            width: AUSLEGER * skala,
            height: sockel * skala,
            background: v("--color-text-primary"),
            opacity: 0.3,
            borderRadius: `0 ${ecke}px 0 0`,
          }}
        />

        {/* Beschriftungen auf Segmenthöhe. */}
        <div
          style={{
            position: "absolute",
            left: (BREITE + AUSLEGER + ABSTAND) * skala,
            top: 0,
            right: 0,
          }}
        >
          {block(gross, true)}
        </div>
        <div
          style={{
            position: "absolute",
            left: (BREITE + AUSLEGER + ABSTAND) * skala,
            bottom: 0,
            right: 0,
            height: sockel * skala,
          }}
        >
          {block(klein, false)}
        </div>
      </div>
    </div>
  );
}

export const SOCIAL_KARTE_MASSE = { breite: BREITE, hoehe: HOEHE };
