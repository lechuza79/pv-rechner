import Link from "next/link";
import { v, space, pad } from "../../lib/theme";
import { wattProKopfTeile, fmtWattProKopf, regionDisplayName } from "../../lib/atlas-format";
import { peerHref, type PeerRow } from "../../lib/atlas";

/**
 * Größenklassen-Vergleich direkt unter dem Intro.
 *
 * Beantwortet die Frage, mit der jemand auf die Seite kommt: „Stehen wir gut
 * da?" — und zwar gegen Gemeinden ähnlicher Größe, weil ein Vergleich gegen
 * alle 10.943 Gemeinden nur die Einwohnerzahl misst (die Begründung steht
 * ausführlich an `peerBand` in lib/atlas.ts).
 *
 * Zwei Paare: der eigene Platz (bundesweit / im eigenen Land) und wer die Klasse
 * jeweils anführt. Der eigene Platz allein wäre eine Zahl ohne Maßstab, der
 * Spitzenwert allein eine Zahl ohne Bezug — erst zusammen ordnen sie ein.
 *
 * Gerankt nach DACH-Leistung je Einwohner, Freiflächen-Parks zählen nicht mit:
 * sonst führt fast jede Klasse eine Gemeinde mit einem einzigen Solarpark an
 * (Faktor 30+ über dem Klassen-Median), und der Maßstab sagt nichts mehr über
 * das aus, was eine Gemeinde selbst bewegen kann. Die Grenze zieht schon die
 * Speicherdichte an anderer Stelle der Seite.
 */
export default function GemeindePeerTiles({
  rows,
  blName,
  band,
}: {
  rows: PeerRow[];
  blName: string;
  band: { min: number; max: number };
}) {
  const pick = (kind: "leader" | "self", scope: "de" | "bl") =>
    rows.find((r) => r.kind === kind && r.scope === scope) ?? null;

  const selfDe = pick("self", "de");
  const selfBl = pick("self", "bl");
  const leadDe = pick("leader", "de");
  const leadBl = pick("leader", "bl");

  // Ohne eigene Platzierung fehlt der Kacheln der Bezugspunkt — dann lieber
  // nichts zeigen als vier Spitzenwerte ohne Einordnung. Tritt auf, wenn die
  // Gemeinde (noch) keine gemeldete Solarleistung hat.
  if (!selfDe && !selfBl) return null;

  // Führt die Gemeinde ihre Klasse selbst an, liefert die Abfrage sie NUR als
  // eigene Zeile (Platz 1) — eine separate Spitzenreiter-Zeile gibt es dann
  // nicht. Der Selbst-Führt-Fall hängt deshalb am eigenen Rang, nicht an einer
  // Anführer-Zeile. Die Spitze-Kachel zeigt dann sich selbst mit „Das sind Sie.".
  const fuehrtDe = selfDe?.rang === 1;
  const fuehrtBl = selfBl?.rang === 1;

  const nf = (n: number) => n.toLocaleString("de-DE");

  return (
    <section style={S.wrap} aria-label="Vergleich mit Gemeinden ähnlicher Größe">
      <div style={S.caption}>
        Verglichen mit Gemeinden ähnlicher Größe — {nf(band.min)} bis {nf(band.max)} Einwohner —
        nach Solarleistung auf Dächern je Einwohner. Freiflächen-Solarparks bleiben außen
        vor, damit der Vergleich das misst, was eine Gemeinde selbst beeinflusst.
      </div>

      <div className="kpi-reihe" style={{ "--kpi-cols": 4 } as React.CSSProperties}>
        <PlatzKachel label="Ihr Platz bundesweit" row={selfDe} />
        <PlatzKachel label={`Ihr Platz in ${blName}`} row={selfBl} />
        <SpitzeKachel label="Spitze bundesweit" row={fuehrtDe ? selfDe : leadDe} selbst={fuehrtDe} />
        <SpitzeKachel label={`Spitze in ${blName}`} row={fuehrtBl ? selfBl : leadBl} selbst={fuehrtBl} />
      </div>
    </section>
  );
}

function PlatzKachel({ label, row }: { label: string; row: PeerRow | null }) {
  return (
    <div className="kpi-kachel" style={S.kachel}>
      <div style={S.label}>{label}</div>
      {row ? (
        <>
          <div style={S.value}>
            {row.rang.toLocaleString("de-DE")}
            <span style={S.unit}> von {row.total.toLocaleString("de-DE")}</span>
          </div>
          {/* Fließtext-Zeile, keine gesetzte Zahl → fmt… statt …Teile(). */}
          <div style={S.sub}>{fmtWattProKopf(row.w_per_capita)} je Einwohner</div>
        </>
      ) : (
        <div style={S.leer}>Keine Angabe</div>
      )}
    </div>
  );
}

function SpitzeKachel({ label, row, selbst }: { label: string; row: PeerRow | null; selbst: boolean }) {
  const teile = row ? wattProKopfTeile(row.w_per_capita) : null;
  const href = row ? peerHref(row) : null;
  const name = row ? regionDisplayName(row.name) : null;

  return (
    <div className="kpi-kachel" style={S.kachel}>
      <div style={S.label}>{label}</div>
      {row && teile ? (
        <>
          <div style={S.value}>
            {teile.value}
            <span style={S.unit}> {teile.unit}</span>
          </div>
          <div style={S.sub}>
            {selbst ? (
              // Die eigene Gemeinde führt — das ist die Aussage, nicht ein Link
              // auf sich selbst.
              <strong style={S.selbst}>Das sind Sie.</strong>
            ) : href ? (
              <Link href={href} style={S.link}>
                {name}
              </Link>
            ) : (
              name
            )}
          </div>
        </>
      ) : (
        <div style={S.leer}>Keine Angabe</div>
      )}
    </div>
  );
}

const S: Record<string, React.CSSProperties> = {
  wrap: { margin: `0 0 ${space.lg}px` },
  caption: {
    fontSize: v("--font-size-body"),
    color: v("--color-text-secondary"),
    margin: `0 ${space.xxs}px ${space.sm}px`,
    lineHeight: 1.5,
  },
  // Gleiche Kachel-Optik wie die Kennzahlen-Reihe darunter: dieselben Tokens,
  // damit beide Reihen als eine Familie lesen.
  kachel: { background: v("--color-bg-muted"), borderRadius: v("--radius-md"), padding: pad("lg") },
  label: { fontSize: 12, color: v("--color-text-secondary"), marginBottom: space.xs },
  value: { fontFamily: v("--font-mono"), fontSize: 22, fontWeight: 700 },
  unit: { fontSize: v("--font-size-small"), fontWeight: 600, color: v("--color-text-secondary") },
  sub: { fontSize: 12, color: v("--color-text-muted"), marginTop: space.xxs, lineHeight: 1.4 },
  selbst: { color: v("--color-text-secondary"), fontWeight: 600 },
  link: { color: v("--color-accent"), textDecoration: "none", fontWeight: 600 },
  leer: { fontSize: v("--font-size-small"), color: v("--color-text-muted"), marginTop: space.xxs },
};
