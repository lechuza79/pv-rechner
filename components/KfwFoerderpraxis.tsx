import { v, space } from "../lib/theme";
import { fmtEuro, fmtEuroVoll, prozentGerundet } from "../lib/atlas-format";
import { kfwQuellenzeile, type HeizungsfoerderungBund } from "../lib/kfw-format";
// Die Präposition hängt am Ortsnamen und ist nicht raten: „im Landkreis
// Böblingen", aber „in Kiel" und „in der Städteregion Aachen". Es gibt dafür
// im Projekt genau eine Ableitung — eine zweite hier wäre derselbe Fehler wie
// ein zweiter Formatter für eine Einheit.
import { ortPraeposition } from "../lib/atlas-orte";

/**
 * Was aus der Bundes-Heizungsförderung wirklich geworden ist.
 *
 * Der Förder-Ratgeber und das Rechner-Ergebnis erklären beide das REGELWERK:
 * welche Sätze es gibt, welche Boni möglich sind, was maximal herauskommt. Was
 * beiden fehlte, ist die Frage, mit der die meisten überhaupt herkommen — nicht
 * „was ist möglich", sondern „bekomme ich das auch". Darauf antwortet diese
 * Karte mit dem, was das Amt selbst gezählt hat.
 *
 * EINE Karte für beide Stellen. Getrennt geschrieben wären es zwei Fassungen
 * derselben Aussage, und die driften — gemerkt an der, die jemand vergessen hat.
 *
 * KEIN eigener Datenabruf: Die Zahlen kommen als Eigenschaft herein. Der
 * Ratgeber holt sie auf dem Server, der Rechner bekommt sie von seiner
 * Seitenkomponente durchgereicht. So bleibt beides statisch, und die Tabellen
 * bleiben hinter dem Dienstschlüssel — sie dürfen nach der Erlaubnis der KfW
 * gerade nicht offen abrufbar sein.
 */

export type KfwFoerderpraxisProps = {
  daten: HeizungsfoerderungBund;
  /**
   * Zahl der Zusagen im Landkreis des Nutzers, falls bekannt. `zusagen: null`
   * heißt: Die KfW hat sie unterdrückt — dann steht das da, statt einer Lücke.
   */
  kreis?: { name: string; zusagen: number | null } | null;
  /** Ohne Rahmen und Überschrift — für die Verwendung in einem Ergebnis-Abschnitt. */
  nackt?: boolean;
};

/** Kurzfassung für die eingeklappte Kopfzeile eines Ergebnis-Abschnitts. */
export function kfwPraxisZusammenfassung(d: HeizungsfoerderungBund): string {
  return `${d.jahr}: ${d.zusagen.toLocaleString("de-DE")} Zusagen · im Schnitt ${fmtEuroVoll(d.schnittJeZusage)}`;
}

/** „im" → „Im" — die Präposition steht hier am Satzanfang. */
function grossGeschrieben(p: string): string {
  return p.charAt(0).toUpperCase() + p.slice(1);
}

function Balken({ anteil }: { anteil: number }) {
  return (
    <div style={{ height: 6, borderRadius: 3, background: v("--color-border"), overflow: "hidden" }}>
      <div
        style={{
          width: `${Math.min(100, Math.round(anteil * 100))}%`,
          height: "100%",
          background: v("--color-accent"),
        }}
      />
    </div>
  );
}

export default function KfwFoerderpraxis({ daten, kreis, nackt }: KfwFoerderpraxisProps) {
  const d = daten;
  const inhalt = (
    <>
      <p style={{ fontSize: v("--font-size-body"), lineHeight: 1.7, margin: `0 0 ${space.lg}px` }}>
        Der Bund hat {d.jahr} für {d.zusagen.toLocaleString("de-DE")} Heizungen einen Zuschuss zugesagt und dafür{" "}
        {fmtEuro(d.volumenMio * 1_000_000)} bewilligt. Auf eine Zusage entfielen damit im Schnitt{" "}
        <strong>{fmtEuroVoll(d.schnittJeZusage)}</strong>.
      </p>

      {d.boni.length > 0 && (
        <>
          <p style={{ fontSize: v("--font-size-body"), lineHeight: 1.7, margin: `0 0 ${space.md}px`, color: v("--color-text-muted") }}>
            So oft kamen die Boni zum Tragen, jeweils bezogen auf die{" "}
            {d.basisMassnahmen.toLocaleString("de-DE")} geförderten Heizungen mit Grundförderung:
          </p>
          <div style={{ display: "grid", gap: space.md, marginBottom: space.lg }}>
            {d.boni.map((b) => (
              <div key={b.name}>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: v("--font-size-small"), marginBottom: 4 }}>
                  <span>{b.name}</span>
                  <span style={{ fontFamily: v("--font-mono"), fontWeight: 700 }}>
                    {prozentGerundet(b.anteil)} %
                  </span>
                </div>
                <Balken anteil={b.anteil} />
                <div style={{ fontSize: v("--font-size-caption"), color: v("--color-text-muted"), marginTop: 3 }}>
                  {b.massnahmen.toLocaleString("de-DE")} Heizungen
                </div>
              </div>
            ))}
          </div>
          {/* Der Satz, ohne den die Prozentzahl die falsche Frage beantwortet.
              Auf dem Förder-Ratgeber steht diese Karte unmittelbar neben den
              ANSPRUCHSVORAUSSETZUNGEN, und nebeneinander liest sich eine
              Beobachtung leicht wie eine Quote: „68 %" klingt nach „so
              wahrscheinlich ist es bei mir". Das ist es nicht — gemessen wurde,
              wer den Bonus bekommen HAT, und diese Menge hat mit dem einzelnen
              Leser nichts zu tun. Eine Zahl ohne ihre Bedingung ist dieselbe
              Fehlerklasse wie eine Beschriftung, die etwas anderes sagt als die
              Zahl misst. */}
          <p style={{ fontSize: v("--font-size-small"), lineHeight: 1.65, margin: `0 0 ${space.lg}px`, color: v("--color-text-muted") }}>
            Das ist eine Beobachtung, keine Wahrscheinlichkeit. Ob ein Bonus bei dir greift, hängt an deiner alten
            Heizung, an deinem Einkommen und daran, ob du selbst dort wohnst — nicht daran, wie oft ihn andere
            bekommen haben.
          </p>
        </>
      )}

      {/* Der Kreisbezug ist eine Einordnung, kein Rechenwert: Er sagt, ob man
          mit dem Vorhaben allein dasteht oder in einer Nachbarschaft, in der
          Hunderte dasselbe getan haben. Eine Bezugsgröße steht bewusst NICHT
          daneben — bei einer Zahl je Einwohner ließe sich die Ausgangszahl
          zurückrechnen, und genau davor schützt die Schwelle der KfW. */}
      {kreis && (
        <p style={{ fontSize: v("--font-size-body"), lineHeight: 1.7, margin: `0 0 ${space.lg}px` }}>
          {kreis.zusagen === null ? (
            <>
              Für {kreis.name} weist der Bericht keine Zahl aus: Bei weniger als zehn Zusagen lässt die KfW die
              Angabe aus Datenschutzgründen weg.
            </>
          ) : (
            // Kein Singular-Zweig: Unter zehn gibt es hier keine Zahl, die
            // kleinste mögliche ist zehn. Ein „war es 1 Zusage" könnte gar nicht
            // vorkommen — und es hinzuschreiben behauptete, es könnte.
            <>
              {grossGeschrieben(ortPraeposition(kreis.name))} {kreis.name} waren es{" "}
              {kreis.zusagen.toLocaleString("de-DE")} Zusagen.
            </>
          )}
        </p>
      )}

      <div
        style={{
          fontSize: v("--font-size-caption"),
          lineHeight: 1.65,
          color: v("--color-text-muted"),
          borderTop: `1px solid ${v("--color-border")}`,
          paddingTop: space.md,
        }}
      >
        <p style={{ margin: `0 0 ${space.sm}px` }}>
          Der Durchschnitt gilt allen Heiztechniken dieser Förderung, nicht nur Wärmepumpen. Bei
          Wohnungseigentümergemeinschaften und Mehrfamilienhäusern zählt die KfW Zusatzanträge als eigene Zusage —
          je Haushalt liegt der Betrag also eher darüber.
          {d.effizienzbonus && (
            <>
              {" "}
              Und die Regeln haben sich seitdem geändert: {d.jahr} gab es zusätzlich einen Effizienzbonus, den{" "}
              {prozentGerundet(d.effizienzbonus.anteil)} % der geförderten Heizungen bekommen haben. Seit der
              Neufassung der Förderrichtlinie im Juli 2026 gibt es ihn nicht mehr, heute fällt der Zuschuss also
              eher niedriger aus.
            </>
          )}
        </p>
        <p style={{ margin: `0 0 ${space.sm}px` }}>
          Der Bericht nennt den Klimageschwindigkeits-Bonus kurz „Klimabonus“.
        </p>
        <p style={{ margin: 0 }}>{kfwQuellenzeile(d.jahr, d.stichtagIso)}</p>
      </div>
    </>
  );

  if (nackt) return inhalt;

  return (
    <section
      style={{
        background: v("--color-bg"),
        border: `1px solid ${v("--color-border")}`,
        borderRadius: v("--radius-md"),
        padding: `${space.xl}px ${space.xl}px`,
        margin: `${space.xxl}px 0`,
      }}
    >
      <h2 style={{ fontSize: v("--font-size-h2"), margin: `0 0 ${space.md}px` }}>Wer bekommt die Förderung wirklich?</h2>
      {inhalt}
    </section>
  );
}
