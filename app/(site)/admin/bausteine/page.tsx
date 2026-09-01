import Link from "next/link";
import AdminSeitenkopf from "../../../../components/admin/AdminSeitenkopf";
import {
  BAUSTEINE,
  GRUPPEN,
  NOCH_NICHT_EINGEORDNET,
  verwendetVon,
  type Baustein,
} from "../../../../lib/bausteine-registry";
import { v, space, pad } from "../../../../lib/theme";

// ─── Die zweite Ebene des Designsystems: das Baustein-Inventar. ──────────────
//
// Die Grundlagen (Farben, Schrift, Abstände) stehen unter /admin/theme. Hier
// steht, was daraus gebaut ist — und was woraus besteht: ein Aufklapp-Abschnitt
// enthält einen Schalter, ein Feld enthält ein Zahlenfeld, ein Widget enthält
// beides.
//
// Die Seite ist bewusst eine ANSICHT auf das Register, kein zweiter Datenstand.
// Sie zeigt keine Zahl und keine Beziehung, die nicht in lib/bausteine-registry.ts
// steht und dort gegen den Code geprüft wird.
//
// Die noch nicht eingeordneten Bauteile stehen im Register und werden dort
// gegen den Ordner geprüft. Sie hier zur Laufzeit auszuzählen wäre die
// naheliegende Lösung und wäre falsch: Auf der Produktion liegt der Quellordner
// gar nicht mehr vor, die Seite stürzte dort ab — und nur dort.

export const metadata = { title: "Bausteine – Designsystem" };

const karte: React.CSSProperties = {
  background: v("--color-bg"),
  border: `1px solid ${v("--color-border")}`,
  borderRadius: v("--radius-md"),
  padding: space.lg,
};

const merkmal: React.CSSProperties = {
  display: "inline-block",
  fontSize: v("--font-size-caption"),
  fontWeight: 700,
  letterSpacing: "0.04em",
  textTransform: "uppercase",
  borderRadius: v("--radius-sm"),
  padding: pad("xs", "sm"),
};

function BausteinKarte({ b }: { b: Baustein }) {
  const nutzer = verwendetVon(b.name);
  const verbindlich = b.stand === "verbindlich";
  return (
    <div style={karte}>
      <div style={{ display: "flex", alignItems: "baseline", gap: space.sm, flexWrap: "wrap" }}>
        <span style={{ fontSize: v("--font-size-lead"), fontWeight: 700 }}>{b.name}</span>
        <span
          style={{
            ...merkmal,
            color: verbindlich ? v("--color-positive-text") : v("--color-text-secondary"),
            background: verbindlich ? v("--color-bg-accent") : v("--color-bg-muted"),
          }}
        >
          {verbindlich ? "verbindlich" : "im Aufbau"}
        </span>
        {b.gegenprobe ? (
          <span style={{ ...merkmal, color: v("--color-text-muted"), background: v("--color-bg-muted") }}>
            Gegenprobe
          </span>
        ) : null}
      </div>

      <p style={{ fontSize: v("--font-size-body"), lineHeight: 1.5, color: v("--color-text-secondary"), margin: `${space.sm}px 0 0` }}>
        {b.zweck}
      </p>

      {b.bestehtAus.length > 0 ? (
        <p style={{ fontSize: v("--font-size-small"), color: v("--color-text-muted"), margin: `${space.sm}px 0 0` }}>
          Besteht aus: {b.bestehtAus.join(" · ")}
        </p>
      ) : null}

      {nutzer.length > 0 ? (
        <p style={{ fontSize: v("--font-size-small"), color: v("--color-text-muted"), margin: `${space.xs}px 0 0` }}>
          Steckt in: {nutzer.map((n) => n.name).join(" · ")}
        </p>
      ) : null}

      {b.gegenprobe ? (
        <p style={{ fontSize: v("--font-size-small"), color: v("--color-text-muted"), margin: `${space.sm}px 0 0`, lineHeight: 1.5 }}>
          {b.gegenprobe.bedeutet}
        </p>
      ) : null}
    </div>
  );
}

export default function BausteinePage() {
  const offen = NOCH_NICHT_EINGEORDNET;
  const verbindliche = BAUSTEINE.filter((b) => b.stand === "verbindlich").length;

  return (
    <div>
      <AdminSeitenkopf
        titel="Bausteine"
        hilfe={
          <>
            <p>
              Die zweite Ebene des Designsystems. Unten stehen die Grundlagen — Farben, Schriftgrößen,
              Abstände. Hier steht, was daraus gebaut ist, und was woraus besteht.
            </p>
            <p>
              „Verbindlich“ heißt: Wer das braucht, nimmt diesen Baustein. Für die meisten davon gibt es
              eine Gegenprobe — eine Prüfung, die den Testlauf rot macht, wenn jemand ihn von Hand
              nachbaut. Ohne sie wäre diese Seite eine Vitrine: Die Schriftgrößen-Tokens gab es seit
              Juli, und der Bestand handgetippter Größen wuchs danach trotzdem um ein Drittel.
            </p>
            <p>
              Die Liste ist absichtlich unvollständig und wächst schrittweise. Was noch nicht
              eingeordnet ist, steht unten und wird gegen den Ordner geprüft — verstecken kann sich nichts.
            </p>
          </>
        }
      />

      <p style={{ fontSize: v("--font-size-small"), color: v("--color-text-muted"), margin: `-${space.md}px 0 ${space.xl}px` }}>
        {BAUSTEINE.length} eingeordnet, davon {verbindliche} verbindlich · {offen.length} offen ·{" "}
        <Link href="/admin/theme" style={{ color: v("--color-accent"), textDecoration: "none" }}>
          Grundlagen ansehen
        </Link>
      </p>

      {GRUPPEN.map((g) => {
        const teile = BAUSTEINE.filter((b) => b.gruppe === g.schluessel);
        if (teile.length === 0) return null;
        return (
          <section key={g.schluessel} style={{ marginBottom: space.huge }}>
            <div style={{ display: "flex", alignItems: "baseline", gap: space.sm, marginBottom: space.md }}>
              <h2 style={{ fontSize: v("--font-size-h3"), fontWeight: 700, margin: 0 }}>{g.titel}</h2>
              <span style={{ fontSize: v("--font-size-small"), color: v("--color-text-muted") }}>{g.text}</span>
            </div>
            <div style={{ display: "grid", gap: space.md, gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))" }}>
              {teile.map((b) => (
                <BausteinKarte key={b.name} b={b} />
              ))}
            </div>
          </section>
        );
      })}

      <section>
        <div style={{ display: "flex", alignItems: "baseline", gap: space.sm, marginBottom: space.md }}>
          <h2 style={{ fontSize: v("--font-size-h3"), fontWeight: 700, margin: 0 }}>Noch nicht eingeordnet</h2>
          <span style={{ fontSize: v("--font-size-small"), color: v("--color-text-muted") }}>
            {offen.length} geteilte Bauteile ohne Eintrag — der nächste Schritt, nicht ein Fehler.
          </span>
        </div>
        <p style={{ fontSize: v("--font-size-small"), color: v("--color-text-muted"), lineHeight: 1.7, margin: 0 }}>
          {offen.join(" · ")}
        </p>
      </section>
    </div>
  );
}
