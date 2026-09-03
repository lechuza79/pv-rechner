import Link from "next/link";
import AdminSeitenkopf from "../../../../components/admin/AdminSeitenkopf";
import KomponentenSchau from "./KomponentenSchau";
import { BAUSTEINE, GRUPPEN } from "../../../../lib/bausteine-registry";
import { v, space, pad } from "../../../../lib/theme";

// ─── Die Komponenten-Galerie. ────────────────────────────────────────────────
//
// Die zweite Ebene des Designsystems. Die erste — Farben, Schriften, Abstände,
// Ecken — steht unter /admin/theme; die Komponenten nehmen ihre Maße von dort
// und stehen deshalb hier getrennt, statt beides auf eine Seite zu quetschen.
//
// Was hier zu sehen ist, IST der Baustein: Jedes Beispiel importiert die echte
// Komponente. Ein nachgezeichnetes Beispiel wäre eine zweite Fassung, die beim
// ersten Umbau falsch wird — dieselbe Systematik, aus der die Beispielzahlen
// der Ratgeber live gerechnet werden statt getippt.
//
// Die Seite ist eine ANSICHT auf lib/bausteine-registry.ts. Reihenfolge,
// Gruppen, Verbindlichkeit und die Beziehungen zwischen den Bausteinen stehen
// dort und werden dort gegen den Code geprüft.

export const metadata = { title: "Komponenten – Designsystem" };

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
      aria-label="Gruppen"
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
      {GRUPPEN.map((g) => {
        const anzahl = BAUSTEINE.filter(
          (b) => b.gruppe === g.schluessel && b.ebene === "baustein",
        ).length;
        return (
          <a key={g.schluessel} href={`#gruppe-${g.schluessel}`} style={eintrag}>
            {g.titel} <span style={{ color: v("--color-text-faint") }}>{anzahl}</span>
          </a>
        );
      })}
      <a href="#gruppe-zusammensetzungen" style={eintrag}>
        Zusammensetzungen{" "}
        <span style={{ color: v("--color-text-faint") }}>
          {BAUSTEINE.filter((b) => b.ebene === "zusammensetzung").length}
        </span>
      </a>
    </nav>
  );
}

export default function KomponentenPage() {
  const bausteine = BAUSTEINE.filter((b) => b.ebene === "baustein");
  const zusammensetzungen = BAUSTEINE.filter((b) => b.ebene === "zusammensetzung");
  const verbindliche = bausteine.filter((b) => b.stand === "verbindlich").length;

  return (
    <div>
      <AdminSeitenkopf
        titel="Komponenten"
        hilfe={
          <>
            <p>
              Die zweite Ebene des Designsystems. Farben, Schriften und Abstände stehen unter
              Designsystem; die Komponenten nehmen ihre Maße von dort.
            </p>
            <p>
              Jedes Beispiel ist die echte Komponente, keine Nachzeichnung — der Schalter hier ist
              derselbe wie im Rechner. Jede Karte nennt außerdem, woraus der Baustein selbst besteht
              und wo er steckt.
            </p>
            <p>
              „Verbindlich“ heißt: Wer das braucht, nimmt diesen Baustein. Für die wichtigsten gibt es
              eine Gegenprobe, die den Testlauf rot macht, wenn jemand ihn von Hand nachbaut. Ohne sie
              wäre die Seite eine Vitrine — die Schriftgrößen-Tokens gab es seit Juli, und der Bestand
              handgetippter Größen wuchs danach trotzdem um ein Drittel.
            </p>
            <p>
              Ganz unten stehen die Zusammensetzungen: Teile, die ein Fach kennen (ein Förderprogramm,
              das Anlagenregister, einen Rechner) und deshalb nicht allgemein einsetzbar sind. Sie
              stehen im Register, damit sichtbar ist, woraus sie bestehen — aber ohne Beispiel, weil
              eines ohne echte Daten eine Attrappe wäre.
            </p>
          </>
        }
      />

      <p style={{ fontSize: v("--font-size-small"), color: v("--color-text-muted"), margin: `-${space.md}px 0 0` }}>
        {bausteine.length} Bausteine, davon {verbindliche} verbindlich · {zusammensetzungen.length}{" "}
        Zusammensetzungen · alles eingeordnet ·{" "}
        <Link href="/admin/theme" style={{ color: v("--color-accent"), textDecoration: "none" }}>
          Farben, Schriften und Abstände ansehen
        </Link>
      </p>

      <Sprungmarken />

      <KomponentenSchau />

    </div>
  );
}
