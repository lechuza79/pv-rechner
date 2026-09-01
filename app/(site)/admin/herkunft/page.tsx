import { seitenaufrufeSeit, nachHerkunft, nachSeite } from "../../../../lib/seiten-herkunft";
import { DIREKT, INTERN } from "../../../../lib/seiten-herkunft-core";
import { v, space } from "../../../../lib/theme";
import AdminSeitenkopf from "../../../../components/admin/AdminSeitenkopf";
import InfoTooltip from "../../../../components/InfoTooltip";

export const metadata = {
  title: "Herkunft – Solar Check Admin",
  robots: { index: false, follow: false },
};

// Woher kommen die Leute? Der Guard sitzt im Admin-Layout.
//
// Die Seite beantwortet die Frage, an der die browserseitige Messung scheitert:
// Sie erfährt die Herkunft nur beim allerersten Aufruf eines Besuchs — alles
// danach sieht dort aus wie ein Direkteinstieg. Im Messzeitraum standen so 980
// Aufrufe ohne jede Erklärung da.
//
// Gezählt wird am Server, aus dem Anfrage-Kopf, ohne Kennung und ohne Uhrzeit.
// Was das darf und wo die Grenze liegt: `lib/seiten-herkunft-core.ts`.
export const dynamic = "force-dynamic";

const TAGE = 90;

function vorTagen(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString().slice(0, 10);
}

/** Beschriftung für die beiden eigenen Werte; fremde Domains stehen für sich. */
function herkunftLabel(h: string): string {
  if (h === DIREKT) return "Direkt aufgerufen";
  if (h === INTERN) return "Weiterklick bei uns";
  return h;
}

export default async function HerkunftPage() {
  const zeilen = await seitenaufrufeSeit(vorTagen(TAGE));
  const herkuenfte = nachHerkunft(zeilen);
  const seiten = nachSeite(zeilen).slice(0, 40);

  const gesamt = herkuenfte.reduce((s, h) => s + h.aufrufe, 0);
  const vonAussen = herkuenfte
    .filter((h) => h.herkunft !== DIREKT && h.herkunft !== INTERN)
    .reduce((s, h) => s + h.aufrufe, 0);

  const zellStil: React.CSSProperties = {
    padding: `${space.sm}px ${space.md}px`,
    borderBottom: `1px solid ${v("--color-border")}`,
    fontSize: v("--font-size-small"),
    verticalAlign: "top",
  };
  // Zahlenspalten sind rechtsbündig — das „?" gehört dann rechts NEBEN die
  // Beschriftung, nicht darunter.
  const spaltenKopf: React.CSSProperties = {
    display: "inline-flex",
    alignItems: "center",
    gap: 4,
  };
  const zahlStil: React.CSSProperties = {
    ...zellStil,
    fontFamily: v("--font-mono"),
    whiteSpace: "nowrap",
    textAlign: "right",
  };

  return (
    <div style={{ fontFamily: v("--font-text"), color: v("--color-text-primary"), maxWidth: 860 }}>
      <AdminSeitenkopf
        titel="Herkunft"
        hilfe={
          <>
            Woher die Aufrufe unserer eigenen Seiten kommen — die letzten {TAGE} Tage.
            Gezählt werden <strong>Aufrufe, keine Besucher</strong>: Gespeichert sind nur
            Kalendertag, Seite und verweisende Domain. Keine Kennung, keine Uhrzeit,
            kein Abfrageteil der Adresse — damit ist keine Zeile einem Menschen
            zuzuordnen, auch nicht rückwirkend. Aufrufe, die sich selbst als Maschine
            ausweisen, zählen nicht mit.
          </>
        }
      />

      {zeilen.length === 0 ? (
        <p style={{ fontSize: v("--font-size-small"), color: v("--color-text-muted"), lineHeight: 1.6 }}>
          Noch nichts gezählt. Solange die Zählung neu ist, ist dieser Stand nicht
          von „sie läuft nicht" zu unterscheiden — eine beliebige Seite aufrufen und
          hier neu laden, dann muss unter „Direkt aufgerufen" mindestens eine Zeile
          stehen.
        </p>
      ) : (
        <>
          <div style={{ display: "flex", gap: space.xl, marginBottom: space.xl, flexWrap: "wrap" }}>
            <div>
              <div style={{ fontSize: v("--font-size-display-sm"), fontWeight: 800, fontFamily: v("--font-mono") }}>
                {gesamt.toLocaleString("de-DE")}
              </div>
              <div style={{ fontSize: v("--font-size-small"), color: v("--color-text-muted") }}>Aufrufe gesamt</div>
            </div>
            <div>
              <div style={{ fontSize: v("--font-size-display-sm"), fontWeight: 800, fontFamily: v("--font-mono") }}>
                {vonAussen.toLocaleString("de-DE")}
              </div>
              <div style={{ fontSize: v("--font-size-small"), color: v("--color-text-muted") }}>davon von fremden Seiten</div>
            </div>
          </div>

          <h2 style={{ fontSize: v("--font-size-lead"), fontWeight: 700, marginBottom: space.sm }}>Woher</h2>
          {/* Eigener Scrollbereich je Tabelle: Auf schmalen Schirmen quetscht
              die Seiten-Spalte den Pfad sonst in Einzelbuchstaben. Die SEITE
              darf dabei nie seitlich scrollen, nur die Tabelle in sich. */}
          <div style={{ overflowX: "auto", marginBottom: space.xxl }}>
          <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 300 }}>
            <thead>
              <tr style={{ textAlign: "left", fontSize: v("--font-size-small"), color: v("--color-text-muted") }}>
                <th style={{ ...zellStil, fontWeight: 600 }}>Herkunft</th>
                <th style={{ ...zahlStil, fontWeight: 600 }}>Aufrufe</th>
                <th style={{ ...zahlStil, fontWeight: 600 }}>Seiten</th>
              </tr>
            </thead>
            <tbody>
              {herkuenfte.map((h) => {
                const eigen = h.herkunft === DIREKT || h.herkunft === INTERN;
                return (
                  <tr key={h.herkunft}>
                    <td style={{ ...zellStil, fontWeight: 600, overflowWrap: "anywhere" }}>
                      {eigen ? (
                        <span style={{ color: v("--color-text-secondary") }}>{herkunftLabel(h.herkunft)}</span>
                      ) : (
                        <a
                          href={`https://${h.herkunft}`}
                          target="_blank"
                          rel="noopener noreferrer nofollow"
                          style={{ color: v("--color-accent"), textDecoration: "none" }}
                        >
                          {h.herkunft}
                        </a>
                      )}
                    </td>
                    <td style={zahlStil}>{h.aufrufe.toLocaleString("de-DE")}</td>
                    <td style={{ ...zahlStil, color: v("--color-text-secondary") }}>{h.seiten.toLocaleString("de-DE")}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          </div>

          <h2 style={{ fontSize: v("--font-size-lead"), fontWeight: 700, marginBottom: space.sm }}>Welche Seite</h2>
          <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 560 }}>
            <thead>
              <tr style={{ textAlign: "left", fontSize: v("--font-size-small"), color: v("--color-text-muted") }}>
                <th style={{ ...zellStil, fontWeight: 600 }}>Seite</th>
                <th style={{ ...zahlStil, fontWeight: 600 }}>Gesamt</th>
                <th style={{ ...zahlStil, fontWeight: 600 }}>
                  <span style={spaltenKopf}>
                    Von außen
                    <InfoTooltip title="Von außen" ariaLabel="Erklärung zur Spalte Von außen" exportNote={false}>
                      Jemand kam von einer fremden Seite hierher — das ist der Eintritt
                      in unser Angebot. Die Domain dazu steht in der Tabelle darüber.
                    </InfoTooltip>
                  </span>
                </th>
                <th style={{ ...zahlStil, fontWeight: 600 }}>
                  <span style={spaltenKopf}>
                    Direkt
                    <InfoTooltip title="Direkt" ariaLabel="Erklärung zur Spalte Direkt" exportNote={false}>
                      Der Browser hat keine verweisende Seite mitgeschickt: Lesezeichen,
                      Adresszeile, ein Klick aus einer App oder eine Seite, die den
                      Verweis unterdrückt. Genau dieser Topf war in der Messung im
                      Browser unerklärt groß.
                    </InfoTooltip>
                  </span>
                </th>
                <th style={{ ...zahlStil, fontWeight: 600 }}>
                  <span style={spaltenKopf}>
                    Weiterklick
                    <InfoTooltip title="Weiterklick" ariaLabel="Erklärung zur Spalte Weiterklick" exportNote={false}>
                      Navigation innerhalb unserer eigenen Seiten. Dient als Gegenprobe:
                      Stünde hier überall null, wäre die Zählung kaputt.
                    </InfoTooltip>
                  </span>
                </th>
              </tr>
            </thead>
            <tbody>
              {seiten.map((s) => (
                <tr key={s.pfad}>
                  <td style={{ ...zellStil, whiteSpace: "nowrap" }}>
                    <a
                      href={s.pfad}
                      style={{ color: v("--color-accent"), textDecoration: "none" }}
                    >
                      {s.pfad}
                    </a>
                  </td>
                  <td style={{ ...zahlStil, fontWeight: 700 }}>{s.aufrufe.toLocaleString("de-DE")}</td>
                  <td style={zahlStil}>{s.vonAussen.toLocaleString("de-DE")}</td>
                  <td style={zahlStil}>{s.direkt.toLocaleString("de-DE")}</td>
                  <td style={{ ...zahlStil, color: v("--color-text-secondary") }}>{s.intern.toLocaleString("de-DE")}</td>
                </tr>
              ))}
            </tbody>
          </table>
          </div>
        </>
      )}
    </div>
  );
}
