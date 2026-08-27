import { redirect } from "next/navigation";
import { isAdminSession } from "../../../../../lib/admin-guard";
import {
  offeneVorhaben,
  verworfeneVorhaben,
  volumenGesamt,
  istLive,
  aeltesteMessung,
  ZUSTAND_LABEL,
  type ArtikelVorhaben,
} from "../../../../../lib/artikelplan";
import { v, space, pad } from "../../../../../lib/theme";

// Der Artikelteil der Redaktion — Schwester der Social-Ansicht, aber eine
// eigene Seite, weil die Achsen andere sind: ein Post hat einen Wochentag und
// eine Bildform, ein Artikel eine Suchfrage und eine Indexierung.
//
// Die Ansicht LIEST nur. Der Plan lebt im Code (lib/artikelplan.ts), damit ein
// Test ihn prüfen kann — dass jede Zahl ein Erhebungsdatum trägt und jedes
// verworfene Thema einen Grund. Eine Redaktionsansicht, in der man Zahlen
// eintippen kann, hätte genau diese Prüfung nicht.
//
// Der untere Teil ist der wichtigere: Was gemessen und abgelehnt wurde, samt
// Grund. Ohne ihn schlägt in ein paar Monaten jemand dieselben Themen wieder
// vor, und die Messung war umsonst.

export const metadata = {
  title: "Redaktion – Artikel",
  robots: { index: false, follow: false },
};

const ZUSTAND_FARBE = {
  geplant: "--color-text-muted",
  "in-arbeit": "--color-accent",
  live: "--color-positive",
  verworfen: "--color-text-muted",
} as const;

function Zahl({ wert, label }: { wert: string; label: string }) {
  return (
    <div>
      <div style={{ fontSize: v("--font-size-h3"), lineHeight: 1.1, whiteSpace: "nowrap" }}>{wert}</div>
      <div style={{ fontSize: v("--font-size-caption"), color: v("--color-text-muted") }}>{label}</div>
    </div>
  );
}

function Messwerte({ vorhaben }: { vorhaben: ArtikelVorhaben }) {
  const m = vorhaben.messung;
  const gesamt = volumenGesamt(vorhaben);
  return (
    <div style={{ display: "flex", gap: space.xxl, flexWrap: "wrap", alignItems: "flex-start" }}>
      <Zahl wert={gesamt.toLocaleString("de-DE")} label="Suchen je Monat" />
      <Zahl wert={String(m.schwierigkeit)} label="Schwierigkeit (0–100)" />
      <div>
        <div style={{ fontSize: v("--font-size-body") }}>{m.begriff}</div>
        <div style={{ fontSize: v("--font-size-caption"), color: v("--color-text-muted") }}>
          gemessen am {new Date(m.gemessenAm).toLocaleDateString("de-DE")}
        </div>
      </div>
    </div>
  );
}

export default async function RedaktionArtikel() {
  if (!(await isAdminSession())) redirect("/login?next=/admin/redaktion/artikel");

  const offen = offeneVorhaben();
  const verworfen = verworfeneVorhaben();

  return (
    <div style={{ maxWidth: 1000, margin: "0 auto" }}>
      <h1 style={{ fontSize: v("--font-size-h1"), marginBottom: space.sm }}>Artikel</h1>
      <p style={{ color: v("--color-text-secondary"), marginBottom: space.huge, maxWidth: 760 }}>
        Was als Nächstes geschrieben wird, auf welche Suchfrage es zielt — und darunter, was
        gemessen und trotzdem verworfen wurde. Der zweite Teil ist der wichtigere: Er verhindert,
        dass ein hohes Suchvolumen in ein paar Monaten dieselbe Diskussion neu auslöst. Älteste
        Messung im Plan: {new Date(aeltesteMessung()).toLocaleDateString("de-DE")}.
      </p>

      <h2 style={{ fontSize: v("--font-size-h2"), marginBottom: space.lg }}>
        Vorhaben ({offen.length})
      </h2>

      <div style={{ display: "flex", flexDirection: "column", gap: space.xxl, marginBottom: space.huge }}>
        {offen.map((vh) => (
          <section
            key={vh.thema}
            style={{
              border: `1px solid ${v("--color-border-muted")}`,
              borderRadius: v("--radius-md"),
              padding: pad("lg", "lg"),
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "baseline",
                gap: space.md,
                flexWrap: "wrap",
                marginBottom: space.md,
              }}
            >
              <h3 style={{ fontSize: v("--font-size-h3"), margin: 0 }}>{vh.thema}</h3>
              <span
                style={{
                  fontSize: v("--font-size-caption"),
                  color: v(ZUSTAND_FARBE[vh.zustand]),
                }}
              >
                {ZUSTAND_LABEL[vh.zustand]}
                {istLive(vh) ? " · Seite existiert" : ""}
              </span>
            </div>

            <div style={{ marginBottom: space.lg }}>
              <Messwerte vorhaben={vh} />
            </div>

            {vh.messung.nebenbegriffe && vh.messung.nebenbegriffe.length > 0 && (
              <p
                style={{
                  fontSize: v("--font-size-caption"),
                  color: v("--color-text-muted"),
                  marginBottom: space.md,
                }}
              >
                bedient mit:{" "}
                {vh.messung.nebenbegriffe
                  .map((n) => `${n.begriff} (${n.volumen.toLocaleString("de-DE")}/Mo)`)
                  .join(" · ")}
              </p>
            )}

            <p
              style={{
                color: v("--color-text-secondary"),
                marginBottom: vh.voraussetzung ? space.md : 0,
                maxWidth: 720,
              }}
            >
              {vh.begruendung}
            </p>

            {vh.voraussetzung && (
              <p
                style={{
                  fontSize: v("--font-size-small"),
                  color: v("--color-text-secondary"),
                  borderLeft: `2px solid ${v("--color-border-muted")}`,
                  paddingLeft: space.md,
                  maxWidth: 720,
                }}
              >
                <strong style={{ fontWeight: 600 }}>Vorher nötig: </strong>
                {vh.voraussetzung}
              </p>
            )}

            {vh.slug && (
              <p
                style={{
                  fontSize: v("--font-size-caption"),
                  color: v("--color-text-muted"),
                  marginTop: space.md,
                }}
              >
                geplante Adresse: {vh.slug}
              </p>
            )}
          </section>
        ))}
      </div>

      <h2 style={{ fontSize: v("--font-size-h2"), marginBottom: space.sm }}>
        Gemessen und verworfen ({verworfen.length})
      </h2>
      <p style={{ color: v("--color-text-secondary"), marginBottom: space.lg, maxWidth: 760 }}>
        Diese Themen sind nicht vergessen, sondern entschieden. Wer eines davon wieder aufmachen
        will, braucht einen neuen Grund — nicht die alte Zahl.
      </p>

      <div style={{ display: "flex", flexDirection: "column", gap: space.lg }}>
        {verworfen.map((vh) => (
          <section
            key={vh.thema}
            style={{
              borderTop: `1px solid ${v("--color-border-muted")}`,
              paddingTop: space.lg,
              opacity: 0.85,
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "baseline",
                gap: space.md,
                flexWrap: "wrap",
                marginBottom: space.sm,
              }}
            >
              <h3 style={{ fontSize: v("--font-size-body"), fontWeight: 600, margin: 0 }}>
                {vh.thema}
              </h3>
              <span style={{ fontSize: v("--font-size-caption"), color: v("--color-text-muted") }}>
                {volumenGesamt(vh).toLocaleString("de-DE")} Suchen/Mo · Schwierigkeit{" "}
                {vh.messung.schwierigkeit} · gemessen{" "}
                {new Date(vh.messung.gemessenAm).toLocaleDateString("de-DE")}
              </span>
            </div>
            <p style={{ color: v("--color-text-secondary"), maxWidth: 720, marginBottom: space.xs }}>
              {vh.verworfenWeil}
            </p>
          </section>
        ))}
      </div>
    </div>
  );
}
