import Link from "next/link";
import AdminSeitenkopf from "../../../../components/admin/AdminSeitenkopf";
import KomponentenSchau from "./KomponentenSchau";
import { BAUSTEINE, GRUPPEN, NOCH_NICHT_EINGEORDNET } from "../../../../lib/bausteine-registry";
import { tokens, v, space, pad } from "../../../../lib/theme";

// ─── Das Designsystem, an einer Stelle. ──────────────────────────────────────
//
// Zwei Ebenen auf einer Seite, weil sie zusammengehören:
//
//   GRUNDLAGEN    Farben, Schriftgrößen, Abstände, Ecken, Schatten. Die eine
//                 Quelle, aus der alles andere seine Maße nimmt.
//   KOMPONENTEN   Was daraus gebaut ist — echt und bedienbar, nicht beschrieben.
//                 Jede Karte nennt zusätzlich, woraus der Baustein selbst
//                 besteht und wo er steckt.
//
// Alles hier ist eine ANSICHT auf lib/theme.ts und lib/bausteine-registry.ts.
// Keine Zahl wird getippt: Die Skala stand bis zum 01.09.2026 im alten
// Theme-Editor als handgetippte Beispielliste — acht Zeilen, von denen keine
// mehr stimmte. Ein Guide, der etwas anderes zeigt als die Seite, ist schlimmer
// als keiner, weil man danach baut.
//
// Die Signalfarben je Tagesstufe werden weiterhin unter /admin/theme
// eingestellt: Das ist ein Werkzeug mit Schreibzugriff, keine Referenz.

export const metadata = { title: "Designsystem" };

type Abschnitt = { id: string; titel: string };

const GRUNDLAGEN: Abschnitt[] = [
  { id: "farben", titel: "Farben" },
  { id: "typografie", titel: "Typografie" },
  { id: "abstaende", titel: "Abstände" },
  { id: "ecken", titel: "Ecken & Schatten" },
];

/** Alle Tokens eines Präfixes, in der Reihenfolge der Quelle. */
function tokenGruppe(...praefixe: string[]) {
  return Object.entries(tokens).filter(([k]) => praefixe.some((p) => k.startsWith(p)));
}

function istFarbe(wert: string) {
  return wert.startsWith("#") || wert.startsWith("rgb") || wert.startsWith("color-mix");
}

const karte: React.CSSProperties = {
  background: v("--color-bg"),
  border: `1px solid ${v("--color-border")}`,
  borderRadius: v("--radius-md"),
  padding: space.lg,
};

const abschnittTitel: React.CSSProperties = {
  fontSize: v("--font-size-h3"),
  fontWeight: 700,
  margin: `0 0 ${space.md}px`,
};

function Farben() {
  const farben = tokenGruppe("--color-").filter(([, w]) => istFarbe(w));
  return (
    <div style={{ ...karte, display: "grid", gap: space.sm, gridTemplateColumns: "repeat(auto-fill, minmax(190px, 1fr))" }}>
      {farben.map(([name, wert]) => (
        <div key={name} style={{ display: "flex", alignItems: "center", gap: space.sm, minWidth: 0 }}>
          <span
            style={{
              width: 26,
              height: 26,
              flexShrink: 0,
              borderRadius: v("--radius-sm"),
              background: wert,
              border: `1px solid ${v("--color-border")}`,
            }}
          />
          <span style={{ minWidth: 0 }}>
            <span
              style={{
                display: "block",
                fontSize: v("--font-size-caption"),
                fontFamily: v("--font-mono"),
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
              }}
            >
              {name.replace("--color-", "")}
            </span>
            <span
              style={{
                display: "block",
                fontSize: v("--font-size-micro"),
                fontFamily: v("--font-mono"),
                color: v("--color-text-faint"),
              }}
            >
              {wert}
            </span>
          </span>
        </div>
      ))}
    </div>
  );
}

/**
 * Die Schriftgrößen — Rolle links, Größe rechts, beides aus der Skala.
 *
 * Die Rolle steht hier und nicht der Ort: „Fließtext" gilt überall, „Body im
 * Rechner" wäre schon wieder eine zweite Wahrheit.
 */
const TEXTSTUFEN: { token: keyof typeof tokens; gewicht: number; rolle: string }[] = [
  { token: "--font-size-h1", gewicht: 800, rolle: "Seitentitel" },
  { token: "--font-size-h2", gewicht: 800, rolle: "Abschnitts-Überschrift" },
  { token: "--font-size-h3", gewicht: 700, rolle: "Kleine Überschrift" },
  { token: "--font-size-lead", gewicht: 700, rolle: "Lead, Kartentitel" },
  { token: "--font-size-body", gewicht: 400, rolle: "Fließtext, Navigation, Fußzeile, Eingabefelder" },
  { token: "--font-size-small", gewicht: 600, rolle: "Sekundärtext, Chips, Tabellenzellen" },
  { token: "--font-size-caption", gewicht: 700, rolle: "Versal-Label, Hinweis, dichte Daten" },
  { token: "--font-size-micro", gewicht: 400, rolle: "Diagramm- und Achsenbeschriftung" },
];

/**
 * Die großen Zahlen. KEINE Textstufen: Neben jeder steht eine Einheit, und der
 * Größenunterschied zu ihr trägt die Aussage. Wer eine davon auf eine Textstufe
 * rundet, nimmt der Zahl ihren Vorrang vor der Einheit — genau der Fehler, der
 * beim Zusammenführen der Einheiten-Formatierer schon einmal passiert ist.
 */
const ZAHLENSTUFEN: { token: keyof typeof tokens; rolle: string }[] = [
  { token: "--font-size-display-xl", rolle: "Die eine große Zahl einer Seite" },
  { token: "--font-size-display-lg", rolle: "Hero-Zahl eines Rechner-Ergebnisses" },
  { token: "--font-size-display-md", rolle: "Mitte eines Rings, mittlere Kennzahl" },
  { token: "--font-size-display-sm", rolle: "Kennzahl in einer Kachel" },
];

function Typografie() {
  return (
    <div style={{ display: "grid", gap: space.md, gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))" }}>
      <div style={karte}>
        <h3 style={{ fontSize: v("--font-size-caption"), textTransform: "uppercase", letterSpacing: "0.06em", color: v("--color-text-secondary"), margin: `0 0 ${space.md}px` }}>
          Text — DM Sans
        </h3>
        <div style={{ display: "flex", flexDirection: "column", gap: space.sm }}>
          {TEXTSTUFEN.map((t) => (
            <div key={t.token} style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: space.md }}>
              <span style={{ fontSize: v(t.token), fontWeight: t.gewicht, fontFamily: v("--font-text") }}>
                Lohnt sich PV?
              </span>
              <span style={{ fontSize: v("--font-size-micro"), fontFamily: v("--font-mono"), color: v("--color-text-faint"), flexShrink: 0, textAlign: "right" }}>
                {tokens[t.token]} — {t.rolle}
              </span>
            </div>
          ))}
        </div>
      </div>

      <div style={karte}>
        <h3 style={{ fontSize: v("--font-size-caption"), textTransform: "uppercase", letterSpacing: "0.06em", color: v("--color-text-secondary"), margin: `0 0 ${space.md}px` }}>
          Zahlen — JetBrains Mono
        </h3>
        <div style={{ display: "flex", flexDirection: "column", gap: space.sm }}>
          {ZAHLENSTUFEN.map((t) => (
            <div key={t.token} style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: space.md }}>
              <span style={{ fontSize: v(t.token), fontWeight: 800, fontFamily: v("--font-mono"), color: v("--color-accent"), lineHeight: 1 }}>
                12
                <span style={{ fontSize: v("--font-size-small"), fontWeight: 600, color: v("--color-text-muted"), marginLeft: 4 }}>
                  Jahre
                </span>
              </span>
              <span style={{ fontSize: v("--font-size-micro"), fontFamily: v("--font-mono"), color: v("--color-text-faint"), flexShrink: 0, textAlign: "right" }}>
                {tokens[t.token]} — {t.rolle}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function Abstaende() {
  // Die Abstands-Skala lebt als Zahlen, nicht als CSS-Variablen — sie steht in
  // Inline-Stilen und braucht dort einen Zahlenwert. Deshalb wird hier über das
  // Objekt gelaufen und nichts abgeschrieben: Eine zweite Aufzählung wäre beim
  // nächsten Zwischenschritt falsch, und zwar unbemerkt.
  const stufen = Object.entries(space) as [string, number][];
  return (
    <div style={{ ...karte, display: "flex", flexWrap: "wrap", gap: space.lg, alignItems: "flex-end" }}>
      {stufen.map(([name, px]) => (
        <div key={name} style={{ display: "flex", flexDirection: "column", gap: space.xs, alignItems: "flex-start" }}>
          <span style={{ display: "block", width: px, height: 22, background: v("--color-accent-dim"), borderRadius: 2 }} />
          <span style={{ fontSize: v("--font-size-micro"), fontFamily: v("--font-mono"), color: v("--color-text-muted") }}>
            {name} · {px}
          </span>
        </div>
      ))}
    </div>
  );
}

function EckenUndSchatten() {
  const ecken = tokenGruppe("--radius-");
  const schatten = tokenGruppe("--shadow-");
  return (
    <div style={{ ...karte, display: "flex", flexWrap: "wrap", gap: space.xl }}>
      {ecken.map(([name, wert]) => (
        <div key={name} style={{ display: "flex", flexDirection: "column", gap: space.xs }}>
          <span style={{ width: 64, height: 44, background: v("--color-bg-muted"), border: `1px solid ${v("--color-border")}`, borderRadius: wert }} />
          <span style={{ fontSize: v("--font-size-micro"), fontFamily: v("--font-mono"), color: v("--color-text-muted") }}>
            {name.replace("--radius-", "")} · {wert}
          </span>
        </div>
      ))}
      {schatten.map(([name, wert]) => (
        <div key={name} style={{ display: "flex", flexDirection: "column", gap: space.xs }}>
          <span style={{ width: 64, height: 44, background: v("--color-bg"), borderRadius: v("--radius-md"), boxShadow: wert }} />
          <span style={{ fontSize: v("--font-size-micro"), fontFamily: v("--font-mono"), color: v("--color-text-muted") }}>
            {name.replace("--shadow-", "")}
          </span>
        </div>
      ))}
    </div>
  );
}

function Sprungmarken() {
  const eintrag: React.CSSProperties = {
    fontSize: v("--font-size-small"),
    fontWeight: 600,
    color: v("--color-text-secondary"),
    textDecoration: "none",
    padding: pad("xs", "md"),
    borderRadius: v("--radius-sm"),
    background: v("--color-bg-muted"),
    whiteSpace: "nowrap",
  };
  return (
    <nav
      aria-label="Bereiche des Designsystems"
      style={{
        position: "sticky",
        top: 0,
        zIndex: 2,
        display: "flex",
        flexWrap: "wrap",
        gap: space.xs,
        padding: `${space.sm}px 0`,
        marginBottom: space.xl,
        background: v("--color-bg-muted"),
      }}
    >
      {GRUNDLAGEN.map((a) => (
        <a key={a.id} href={`#${a.id}`} style={eintrag}>
          {a.titel}
        </a>
      ))}
      <span style={{ width: 1, background: v("--color-border"), margin: `0 ${space.xs}px` }} />
      {GRUPPEN.map((g) => (
        <a key={g.schluessel} href={`#gruppe-${g.schluessel}`} style={eintrag}>
          {g.titel}
        </a>
      ))}
    </nav>
  );
}

export default function DesignsystemPage() {
  const verbindliche = BAUSTEINE.filter((b) => b.stand === "verbindlich").length;

  return (
    <div>
      <AdminSeitenkopf
        titel="Designsystem"
        hilfe={
          <>
            <p>
              Oben die Grundlagen — Farben, Schriftgrößen, Abstände, Ecken. Darunter die Komponenten,
              echt und bedienbar: Was hier steht, IST der Baustein, keine Nachzeichnung.
            </p>
            <p>
              „Verbindlich“ heißt: Wer das braucht, nimmt diesen Baustein. Für die wichtigsten gibt es
              eine Gegenprobe, die den Testlauf rot macht, wenn jemand ihn von Hand nachbaut. Ohne sie
              wäre die Seite eine Vitrine — die Schriftgrößen-Tokens gab es seit Juli, und der Bestand
              handgetippter Größen wuchs danach trotzdem um ein Drittel.
            </p>
            <p>
              Die Komponentenliste wächst schrittweise; was noch keinen Eintrag hat, steht am Ende.
            </p>
          </>
        }
      />

      <p style={{ fontSize: v("--font-size-small"), color: v("--color-text-muted"), margin: `-${space.md}px 0 0` }}>
        {BAUSTEINE.length} Komponenten eingeordnet, davon {verbindliche} verbindlich ·{" "}
        {NOCH_NICHT_EINGEORDNET.length} offen ·{" "}
        <Link href="/admin/theme" style={{ color: v("--color-accent"), textDecoration: "none" }}>
          Signalfarben je Tagesstufe anpassen
        </Link>
      </p>

      <Sprungmarken />

      <section id="farben" style={{ marginBottom: space.huge }}>
        <h2 style={abschnittTitel}>Farben</h2>
        <Farben />
      </section>

      <section id="typografie" style={{ marginBottom: space.huge }}>
        <h2 style={abschnittTitel}>Typografie</h2>
        <Typografie />
      </section>

      <section id="abstaende" style={{ marginBottom: space.huge }}>
        <h2 style={abschnittTitel}>Abstände</h2>
        <Abstaende />
      </section>

      <section id="ecken" style={{ marginBottom: space.huge }}>
        <h2 style={abschnittTitel}>Ecken & Schatten</h2>
        <EckenUndSchatten />
      </section>

      <KomponentenSchau />

      <section>
        <div style={{ display: "flex", alignItems: "baseline", gap: space.sm, marginBottom: space.md }}>
          <h2 style={{ ...abschnittTitel, margin: 0 }}>Noch nicht eingeordnet</h2>
          <span style={{ fontSize: v("--font-size-small"), color: v("--color-text-muted") }}>
            {NOCH_NICHT_EINGEORDNET.length} geteilte Bauteile ohne Eintrag — der nächste Schritt, kein Fehler.
          </span>
        </div>
        <p style={{ fontSize: v("--font-size-small"), color: v("--color-text-muted"), lineHeight: 1.7, margin: 0 }}>
          {NOCH_NICHT_EINGEORDNET.join(" · ")}
        </p>
      </section>
    </div>
  );
}
