import { v, space, pad } from "../lib/theme";
import { IconExternal } from "./Icons";
import { tagMonatJahr } from "../lib/stand-format";
import { verlaufFuerSeite, LISTEN_TRENNER, type HistorieEintrag, type HistorieFeld } from "../lib/funding-history";

/**
 * Der Verlauf eines Förderprogramms auf der Kommunenseite.
 *
 * WAS DIESER ABSCHNITT DARF UND WAS NICHT (18.08.2026): Er zeigt, was WIR seit
 * dem Aufzeichnungsbeginn beobachtet haben — nicht „die Geschichte des
 * Programms". Die Vorgeschichte aus Ratsbeschlüssen und archivierten
 * Richtlinien haben wir nicht rekonstruiert; sie zu behaupten wäre eine
 * Falschaussage auf genau der Seite, die für die Ehrlichkeit unserer Zahlen
 * bürgt. Deshalb steht der Aufzeichnungsbeginn sichtbar darunter, statt
 * weggelassen zu werden: Ohne ihn liest sich „eine Änderung seit Juli" wie
 * „seit Jahren nur eine Änderung".
 *
 * Und das Datum ist der Tag UNSERER Feststellung. Zwischen dem Beschluss einer
 * Stadt und unserem Abruf können Wochen liegen — „geändert am" zu schreiben
 * behauptet eine Kenntnis, die wir nicht haben.
 */

/** Wie ein Feld in der Zeile heißt. Der Wortlaut steht hier einmal. */
const FELD_LABEL: Record<Exclude<HistorieFeld, "aufnahme" | "rechenwerte">, string> = {
  status: "Status",
  rates: "Konditionen",
  conditions: "Bedingungen",
  coveredCosts: "Was gefördert wird",
  maxFoerderung: "Höchstbetrag",
  eligibility: "Antragsberechtigt",
  capped: "Mittelbegrenzung",
};

const S = {
  liste: { display: "flex", flexDirection: "column", gap: space.sm, margin: 0, padding: 0, listStyle: "none" } as React.CSSProperties,
  eintrag: {
    background: v("--color-bg"),
    border: `1px solid ${v("--color-border")}`,
    borderRadius: v("--radius-md"),
    padding: pad("md", "lg"),
  } as React.CSSProperties,
  kopf: {
    display: "flex",
    flexWrap: "wrap",
    alignItems: "baseline",
    gap: space.sm,
    marginBottom: space.xs,
  } as React.CSSProperties,
  datum: {
    fontFamily: v("--font-mono"),
    fontSize: "var(--font-size-caption)",
    color: v("--color-text-muted"),
    whiteSpace: "nowrap",
  } as React.CSSProperties,
  feld: { fontSize: "var(--font-size-small)", fontWeight: 700, color: v("--color-text-primary") } as React.CSSProperties,
  wert: { fontSize: "var(--font-size-small)", lineHeight: 1.6, color: v("--color-text-secondary"), margin: 0 } as React.CSSProperties,
  vorher: { color: v("--color-text-muted") } as React.CSSProperties,
  fuss: { fontSize: "var(--font-size-caption)", lineHeight: 1.6, color: v("--color-text-muted"), marginTop: space.md } as React.CSSProperties,
};

/**
 * Felder, deren Wert eine Liste ist. Bei ihnen wird nur das Delta gezeigt.
 *
 * Der Grund ist die Lesbarkeit, und sie entscheidet hier über den Nutzen: Der
 * Frankfurter Klimabonus trägt sechs Bedingungen. Kommt eine siebte dazu, stünde
 * ohne diese Unterscheidung zweimal fast dieselbe sechszeilige Liste
 * untereinander — und der eine geänderte Punkt wäre genau das, was niemand
 * findet.
 */
const LISTENFELDER = new Set<HistorieFeld>(["rates", "conditions", "eligibility"]);

/** „von X auf Y" — und die beiden Fälle, in denen es kein Vorher oder kein Nachher gibt. */
function Wert({ alt, neu, feld }: { alt: string | null; neu: string | null; feld: HistorieFeld }) {
  if (alt && neu && LISTENFELDER.has(feld)) {
    const vorher = alt.split(LISTEN_TRENNER);
    const nachher = neu.split(LISTEN_TRENNER);
    const dazu = nachher.filter((x) => !vorher.includes(x));
    const weg = vorher.filter((x) => !nachher.includes(x));
    // Nur wenn die Zerlegung wirklich etwas trennt. Bei einer einzeiligen Liste
    // ist „neu: … / vorher: …" dieselbe Information in zwei Zeilen — dann bleibt
    // es beim Pfeil.
    if ((dazu.length || weg.length) && vorher.length + nachher.length > 2) {
      return (
        <>
          {dazu.length > 0 && <p style={S.wert}>neu: {dazu.join(LISTEN_TRENNER)}</p>}
          {weg.length > 0 && (
            <p style={S.wert}>
              entfallen: <span style={S.vorher}>{weg.join(LISTEN_TRENNER)}</span>
            </p>
          )}
        </>
      );
    }
  }
  if (alt && neu) {
    return (
      <p style={S.wert}>
        <span style={S.vorher}>{alt}</span>
        {" → "}
        {neu}
      </p>
    );
  }
  if (neu) return <p style={S.wert}>neu: {neu}</p>;
  if (alt) return <p style={S.wert}><span style={S.vorher}>{alt}</span> — entfällt</p>;
  return null;
}

export default function FundingHistory({
  eintraege,
  programmName,
  programmUrl,
}: {
  eintraege: HistorieEintrag[];
  programmName: string;
  programmUrl: string;
}) {
  const { wechsel, beobachtetSeit } = verlaufFuerSeite(eintraege);

  // Ohne echten Wechsel gibt es nichts zu zeigen. Ein Abschnitt, der nur „seit
  // heute im Verzeichnis" meldet, ist kein Verlauf — er wäre auf 110 Stadtseiten
  // dieselbe leere Zeile.
  if (wechsel.length === 0) return null;

  return (
    <>
      <h2 style={{ fontSize: "var(--font-size-h3)", fontWeight: 700, margin: "0 0 4px" }}>
        Was sich am {programmName} geändert hat
      </h2>
      <p style={{ fontSize: "var(--font-size-small)", color: v("--color-text-muted"), margin: "0 0 14px" }}>
        {wechsel.length === 1 ? "Eine Änderung" : `${wechsel.length} Änderungen`}, die wir beim regelmäßigen Abruf der
        Programmseite festgestellt haben
      </p>

      <ul style={S.liste}>
        {wechsel.map((e) => (
          <li key={`${e.festgestelltAm}-${e.feld}`} style={S.eintrag}>
            <div style={S.kopf}>
              <span style={S.datum}>{tagMonatJahr(e.festgestelltAm.slice(0, 10))}</span>
              <span style={S.feld}>{FELD_LABEL[e.feld as keyof typeof FELD_LABEL] ?? e.feld}</span>
            </div>
            <Wert alt={e.alt} neu={e.neu} feld={e.feld} />
          </li>
        ))}
      </ul>

      <p style={S.fuss}>
        Das Datum ist der Tag, an dem wir die Änderung festgestellt haben — die Stadt kann sie früher beschlossen
        haben.
        {beobachtetSeit && (
          <> Dieses Programm verfolgen wir seit dem {tagMonatJahr(beobachtetSeit.slice(0, 10))}; was davor war, steht
          hier nicht.</>
        )}{" "}
        Verbindlich ist allein die{" "}
        <a
          href={programmUrl}
          target="_blank"
          rel="noopener noreferrer"
          style={{ color: v("--color-accent"), textDecoration: "none" }}
        >
          <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
            Programmseite des Trägers <IconExternal size={12} />
          </span>
        </a>
        .
      </p>
    </>
  );
}
