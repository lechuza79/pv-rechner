import { redirect } from "next/navigation";
import { isAdminSession } from "../../../../../lib/admin-guard";
import { socialKennzahlen } from "../../../../../lib/social-kennzahlen";
import { baueAllePosts } from "../../../../../lib/social-posts";
import { FAMILIEN, PUFFER_VOR_START, REGELN, SLOTS } from "../../../../../lib/redaktionsplan";
import { fassungsAbdruck, ladeAllePruefungen } from "../../../../../lib/social-pruefung";
import { pruefeMechanisch } from "../../../../../lib/social-mechanik";
import { ladeVersand } from "../../../../../lib/social-versand-log";
import { ladePlaetze } from "../../../../../lib/social-plaetze";
import { RATGEBER } from "../../../../../lib/ratgeber";
import { sendbar } from "../../../../../lib/social-plan";
import { ladeFassungen } from "../../../../../lib/social-vorlagen-db";
import { planen } from "../../../../../lib/social-plan";
import { baueKalender, deckung } from "../../../../../lib/social-kalender";
import { Wochenplan } from "../../../../../components/social/Wochenplan";
import type { PlatzWahl } from "../../../../../components/social/PlatzModal";
import InfoTooltip from "../../../../../components/InfoTooltip";
import { v, space, pad } from "../../../../../lib/theme";

// Planung: Was steht bereit, was fehlt, und welche Regeln gelten vor jedem Post.
//
// Die Seite behauptet KEINEN Kalender. Ein Datum je Post wäre eine Zusage, die
// niemand einhält, sobald eine Woche voll ist — und ein Plan, der reihenweise
// verstreicht, wird nicht mehr gelesen. Stattdessen: die Kadenz, der Vorrat und
// die Regeln, die vor der Veröffentlichung stehen.

export const metadata = {
  title: "Redaktion – Planung",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

const ZUSTAND_TEXT: Record<string, string> = {
  gebaut: "gebaut",
  "daten-da": "Daten da",
  "fehlt-daten": "Daten fehlen",
  spaeter: "später",
};

export default async function RedaktionPlanung() {
  if (!(await isAdminSession())) redirect("/login?next=/admin/redaktion/planung");

  // Der Tag wird EINMAL gelesen und überall hineingereicht — die Rechenmodule
  // haben bewusst keine Uhr, sonst ließe sich die Übersicht nicht gegen einen
  // Stichtag prüfen.
  const heuteIso = new Date().toISOString().slice(0, 10);

  let fertig = 0;
  let wochen: ReturnType<typeof baueKalender> = [];
  let gedeckt = { belegt: 0, offen: 0 };
  let wahl: PlatzWahl = { posts: [], familien: [], ratgeber: [] };
  try {
    const kennzahlen = await socialKennzahlen();
    const posts = baueAllePosts(kennzahlen, await ladeFassungen());
    fertig = posts.length;

    const pruefungen = await ladeAllePruefungen();
    const versand = await ladeVersand();
    const plan = planen(
      posts.map((p) => ({
        post: p,
        abdruck: fassungsAbdruck({ text: p.text, bild: p.bild }),
        pruefungen: pruefungen[p.id] ?? [],
        befunde: pruefeMechanisch(p, kennzahlen),
      })),
      {
        gesendet: (id, abdruck) =>
          versand.some((x) => x.post_id === id && x.fassung_fingerabdruck === abdruck),
        // Noch nicht verdrahtet: Welche Gemeinden gerade ein Anschreiben
        // bekommen, steht in der Outreach-Ablage. Solange die Liste leer ist,
        // greift die Regel nicht — das ist sichtbar hier und nicht stillschweigend
        // im Rechenkern versteckt.
        orteMitAnschreiben: [],
      },
    );

    const zuweisungen = await ladePlaetze();
    const sendbare = new Set(sendbar(plan).map((e) => e.post.id));
    wahl = {
      posts: posts.map((p) => ({ id: p.id, titel: p.titel, sendbar: sendbare.has(p.id) })),
      familien: FAMILIEN.map((f) => ({
        schluessel: f.schluessel,
        name: f.name,
        zustand: f.zustand,
        bereich: f.bereich,
      })),
      ratgeber: RATGEBER.map((r) => ({ slug: r.slug, titel: r.title })),
    };

    wochen = baueKalender(
      plan,
      versand.map((x) => ({
        postId: x.post_id,
        titel: posts.find((p) => p.id === x.post_id)?.titel ?? x.post_id,
        gesendetAmIso: x.gesendet_am.slice(0, 10),
      })),
      heuteIso,
      {
        zuweisungen,
        // Beide Ereignisse je Ratgeber. „Erschienen" und „überarbeitet" am
        // selben Tag ergäbe zwei identische Zeilen — dann zählt das Erscheinen.
        artikel: RATGEBER.flatMap((r) =>
          r.live === r.updated
            ? [{ iso: r.live, slug: r.slug, titel: r.title, anlass: "live" as const }]
            : [
                { iso: r.live, slug: r.slug, titel: r.title, anlass: "live" as const },
                { iso: r.updated, slug: r.slug, titel: r.title, anlass: "ueberarbeitet" as const },
              ],
        ),
      },
    );
    gedeckt = deckung(wochen, heuteIso);
  } catch {
    fertig = 0;
  }
  const fehlend = Math.max(0, PUFFER_VOR_START - fertig);

  const karte = {
    background: v("--color-bg-muted"),
    borderRadius: v("--radius-md"),
    padding: pad("xxl", "xxl"),
  } as const;

  return (
    <div style={{ maxWidth: 900, margin: "0 auto" }}>
      {wochen.length > 0 && (
        <section style={{ marginBottom: space.xxxl }}>
          <h2 style={{ fontSize: v("--font-size-h3"), display: "flex", alignItems: "center", gap: space.xs }}>
            Kalender
            <InfoTooltip ariaLabel="Wie dieser Kalender gefüllt wird" exportNote={false}>
              Kein zugesagter Termin, sondern der Vorrat auf die Plätze gelegt: Vergangenes kommt aus
              dem Versandprotokoll, Kommendes aus der Warteschlange. Verschiebt sich etwas,
              verschiebt sich die Anzeige mit — verstreichen kann hier nichts.
            </InfoTooltip>
            <span style={{ fontSize: v("--font-size-small"), fontWeight: 400, color: v("--color-text-muted") }}>
              {gedeckt.offen > 0
                ? `${gedeckt.belegt} gedeckt, ${gedeckt.offen} offen`
                : `alle ${gedeckt.belegt} gedeckt`}
            </span>
          </h2>
          <Wochenplan wochen={wochen} heuteIso={heuteIso} wahl={wahl} />
        </section>
      )}

      <section style={{ ...karte, marginBottom: space.xxxl }}>
        <h2 style={{ fontSize: v("--font-size-h3"), marginTop: 0, display: "flex", alignItems: "center", gap: space.xs }}>
          Vorrat
          <InfoTooltip ariaLabel="Wozu der Puffer" exportNote={false}>
            Ohne Puffer bricht die Kadenz beim ersten vollen Arbeitstag — und genau dann fällt es
            auf.
          </InfoTooltip>
        </h2>
        <p style={{ fontSize: v("--font-size-body"), color: v("--color-text-secondary"), margin: 0 }}>
          {fehlend > 0
            ? `${fertig} Beiträge fertig, ${fehlend} bis zum Puffer von ${PUFFER_VOR_START}.`
            : `${fertig} Beiträge fertig — der Puffer von ${PUFFER_VOR_START} steht.`}
        </p>
      </section>

      {/* Dieselbe Liste, die in der Entwicklung die Kategorien bildet — hier mit
          dem Blick der Planung: was davon sich heute bauen ließe und was auf
          Daten wartet. Zwei Listen wären zwei Ordnungen für dieselbe Sache. */}
      <section style={{ marginBottom: space.xxxl }}>
        <h2 style={{ fontSize: v("--font-size-h3"), display: "flex", alignItems: "center", gap: space.xs }}>
          Themen
          <InfoTooltip ariaLabel="Woher diese Liste kommt" exportNote={false}>
            Dieselbe Liste, die in der Entwicklung die Kategorien bildet. Was als „Daten da" steht,
            lässt sich ohne neuen Datenbestand bauen.
          </InfoTooltip>
          <span style={{ fontSize: v("--font-size-small"), fontWeight: 400, color: v("--color-text-muted") }}>
            {FAMILIEN.length}
          </span>
        </h2>

        <div style={{ display: "flex", flexDirection: "column", gap: space.xs }}>
          {FAMILIEN.map((f) => (
            <div
              key={f.kuerzel}
              style={{
                background: v("--color-bg-muted"),
                borderRadius: v("--radius-sm"),
                padding: pad("sm", "md"),
                opacity: f.zustand === "spaeter" ? 0.6 : 1,
              }}
            >
              <div style={{ display: "flex", gap: space.sm, alignItems: "baseline" }}>
                <span style={{ fontSize: v("--font-size-body"), flex: 1 }}>{f.name}</span>
                <span
                  style={{
                    fontSize: v("--font-size-caption"),
                    color: f.zustand === "gebaut" ? v("--color-positive-text") : v("--color-text-muted"),
                    whiteSpace: "nowrap",
                  }}
                >
                  {ZUSTAND_TEXT[f.zustand]}
                </span>
              </div>
              {f.hinweis && (
                <div style={{ fontSize: v("--font-size-caption"), color: v("--color-text-muted") }}>{f.hinweis}</div>
              )}
            </div>
          ))}
        </div>
      </section>

      <section style={{ marginBottom: space.xxxl }}>
        <h2 style={{ fontSize: v("--font-size-h3") }}>Plätze</h2>
        <div style={{ display: "flex", flexDirection: "column", gap: space.md }}>
          {SLOTS.map((s) => (
            <div key={s.tag} style={{ ...karte, display: "flex", gap: space.lg, alignItems: "baseline" }}>
              <span style={{ fontWeight: 700, minWidth: 32 }}>{s.tag}</span>
              <span style={{ fontSize: v("--font-size-body") }}>{s.beschreibung}</span>
            </div>
          ))}
        </div>

      </section>

      <section>
        <h2 style={{ fontSize: v("--font-size-h3"), display: "flex", alignItems: "center", gap: space.xs }}>
          Regeln
          <InfoTooltip ariaLabel="Wo diese Regeln wirken" exportNote={false}>
            Jede Regel gehört zu einer der Prüfungen und erscheint dort als Prüfliste, wenn eine
            Freigabe erteilt wird.
          </InfoTooltip>
        </h2>
        <div style={{ display: "flex", flexDirection: "column", gap: space.md }}>
          {REGELN.map((r) => (
            <div key={r.regel} style={karte}>
              <div style={{ fontWeight: 600, marginBottom: space.xs }}>{r.regel}</div>
              <div style={{ fontSize: v("--font-size-small"), color: v("--color-text-secondary") }}>{r.grund}</div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
