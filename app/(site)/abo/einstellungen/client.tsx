"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { v, space } from "../../../../lib/theme";
import { ABO_TECHNIKEN, ABO_TECHNIK_LABEL, type AboTechnik } from "../../../../lib/abo-technik";

// Die Einstellungsseite eines Abonnenten.
//
// SIE LÄDT MIT DEM TOKEN AUS DER ADRESSE, nicht mit einer Anmeldung: Wer
// abonniert hat, hat kein Konto und soll keines anlegen müssen — dieselbe
// Begründung wie beim Abmeldelink. Ohne gültiges Token gibt es nichts zu sehen.
//
// SIE ZEIGT ALLE ABOS DIESER ADRESSE, nicht nur den Ort, aus dessen Mail der
// Klick kam. Wer drei Orte abonniert hat, hat drei Einträge in der Ablage; für
// ihn ist es eine Sache.

type Abo = {
  id: string;
  ortName: string | null;
  ortPfad: string | null;
  quelle: "gemeinde" | "foerderung";
  status: string;
  techniken: AboTechnik[];
  ausVerwaltung: boolean;
};

const S: Record<string, React.CSSProperties> = {
  page: {
    background: v("--color-bg"),
    fontFamily: v("--font-text"),
    color: v("--color-text-primary"),
    minHeight: "60vh",
    padding: "0 16px 20px",
  },
  wrap: { maxWidth: v("--content-max-width"), margin: "0 auto", paddingTop: "var(--content-lede-top)" },
  h1: {
    fontSize: v("--font-size-h1"),
    fontWeight: 800,
    letterSpacing: "-0.02em",
    lineHeight: 1.2,
    marginBottom: space.sm,
  },
  lede: { fontSize: v("--font-size-body"), color: v("--color-text-muted"), lineHeight: 1.7, marginBottom: space.xxl },
  karte: {
    border: `1px solid ${v("--color-border")}`,
    borderRadius: v("--radius-lg"),
    padding: space.lg,
    marginBottom: space.lg,
    background: v("--color-bg"),
  },
  ort: { fontSize: v("--font-size-lead"), fontWeight: 700, marginBottom: space.xs },
  art: { fontSize: v("--font-size-small"), color: v("--color-text-muted"), marginBottom: space.md },
  // OBEN AUSGERICHTET, nicht mittig: Auf schmalen Schirmen bricht die
  // Beschriftung auf zwei Zeilen, und ein mittig sitzendes Kästchen steht dann
  // neben dem Zeilenzwischenraum statt neben dem ersten Wort.
  zeile: { display: "flex", alignItems: "flex-start", gap: space.sm, marginBottom: space.sm, cursor: "pointer" },
  haken: { marginTop: "0.25em", flexShrink: 0 },
  aktionen: { display: "flex", gap: space.md, alignItems: "center", flexWrap: "wrap", marginTop: space.lg },
  cta: {
    background: v("--color-accent"),
    color: v("--color-text-on-accent"),
    border: "none",
    padding: "11px 18px",
    borderRadius: v("--radius-md"),
    fontWeight: 600,
    fontSize: v("--font-size-body"),
    cursor: "pointer",
    fontFamily: "inherit",
  },
  leise: {
    background: "none",
    border: "none",
    color: v("--color-text-muted"),
    textDecoration: "underline",
    cursor: "pointer",
    fontSize: v("--font-size-small"),
    fontFamily: "inherit",
    padding: "11px 0",
  },
  hinweis: { fontSize: v("--font-size-small"), color: v("--color-text-muted"), marginTop: space.sm },
  fuss: { fontSize: v("--font-size-small"), color: v("--color-text-muted"), lineHeight: 1.7, marginTop: space.xxl },
};

const ART_LABEL: Record<Abo["quelle"], string> = {
  gemeinde: "Meldungen zum Anlagenbestand",
  foerderung: "Meldungen zu Förderprogrammen",
};

export default function Client() {
  const [token, setToken] = useState<string | null>(null);
  const [email, setEmail] = useState<string | null>(null);
  const [abos, setAbos] = useState<Abo[] | null>(null);
  const [fehler, setFehler] = useState(false);

  // DAS TOKEN AUS DER ADRESSE, nicht über den Router-Hook: Auf einer
  // vorgerenderten Seite ist der beim ersten Durchlauf leer, und dieser Effekt
  // läuft genau einmal — dieselbe Falle, die den Wärmepumpen-Rechner einmal bei
  // Frage eins stehen ließ, obwohl alle Werte in der Adresse standen.
  useEffect(() => {
    const t = new URLSearchParams(window.location.search).get("t") ?? "";
    setToken(t);
    if (!t) {
      setFehler(true);
      return;
    }
    fetch(`/api/abo/einstellungen?t=${encodeURIComponent(t)}`)
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((d: { email: string; abos: Abo[] }) => {
        setEmail(d.email);
        setAbos(d.abos);
      })
      .catch(() => setFehler(true));
  }, []);

  if (fehler) {
    return (
      <main style={S.page}>
        <div style={S.wrap}>
          <h1 style={S.h1}>Dieser Link stimmt nicht</h1>
          <p style={S.lede}>
            Der Link ist unvollständig oder gehört zu einem Abo, das es nicht mehr gibt. Am häufigsten passiert
            das, wenn ein Mailprogramm die Adresse über zwei Zeilen umbricht — nimm dann den Link aus der
            neuesten Mail.
          </p>
          <Link href="/solar-atlas" style={{ color: v("--color-accent") }}>
            Zum Solar-Atlas
          </Link>
        </div>
      </main>
    );
  }

  if (!abos) {
    return (
      <main style={S.page}>
        <div style={S.wrap}>
          <p style={S.lede}>Einen Moment …</p>
        </div>
      </main>
    );
  }

  return (
    <main style={S.page}>
      <div style={S.wrap}>
        <h1 style={S.h1}>Deine Meldungen</h1>
        <p style={S.lede}>
          {abos.length === 0
            ? `Für ${email} ist gerade nichts abonniert.`
            : `Das ist für ${email} eingetragen. Änderungen wirken sofort.`}
        </p>

        {abos.map((a) => (
          <AboKarte
            key={a.id}
            abo={a}
            token={token ?? ""}
            onWeg={() => setAbos((alt) => (alt ?? []).filter((x) => x.id !== a.id))}
          />
        ))}

        <p style={S.fuss}>
          Wir schreiben nur, wenn es in deinem Ort etwas zu berichten gibt. Einen neuen Ort abonnierst du auf
          seiner eigenen Seite — hier lässt sich der Ort nicht wechseln, weil dafür jedes Mal eine neue
          Bestätigung gehört.
        </p>
      </div>
    </main>
  );
}

function AboKarte(o: { abo: Abo; token: string; onWeg: () => void }) {
  const [techniken, setTechniken] = useState<AboTechnik[]>(o.abo.techniken);
  const [ausVerwaltung, setAusVerwaltung] = useState(o.abo.ausVerwaltung);
  const [zustand, setZustand] = useState<"ruht" | "sendet" | "gespeichert" | "fehler">("ruht");

  const zeigtTechniken = o.abo.quelle === "foerderung";
  // KEINE LEERE AUSWAHL: Ein Abo ohne Technik bekäme nie eine Mail — die
  // Datenschicht macht daraus wieder „alle", und dann stünde nach dem Speichern
  // das Gegenteil dessen da, was jemand angeklickt hat.
  const speicherbar = !zeigtTechniken || techniken.length > 0;

  const speichern = async () => {
    setZustand("sendet");
    const r = await fetch("/api/abo/einstellungen", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ t: o.token, aboId: o.abo.id, techniken, ausVerwaltung }),
    }).catch(() => null);
    setZustand(r?.ok ? "gespeichert" : "fehler");
  };

  const abmelden = async () => {
    setZustand("sendet");
    const r = await fetch("/api/abo/einstellungen", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ t: o.token, aboId: o.abo.id, abmelden: true }),
    }).catch(() => null);
    if (r?.ok) o.onWeg();
    else setZustand("fehler");
  };

  return (
    <section style={S.karte}>
      <p style={S.ort}>
        {o.abo.ortPfad && o.abo.ortName ? (
          <Link href={o.abo.ortPfad} style={{ color: "inherit" }}>
            {o.abo.ortName}
          </Link>
        ) : (
          (o.abo.ortName ?? "Dein Ort")
        )}
      </p>
      <p style={S.art}>
        {ART_LABEL[o.abo.quelle]}
        {o.abo.status === "ausstehend" ? " · noch nicht bestätigt" : ""}
      </p>

      {zeigtTechniken && (
        <>
          {ABO_TECHNIKEN.map((t) => (
            <label key={t} style={S.zeile}>
              <input
                type="checkbox"
                style={S.haken}
                checked={techniken.includes(t)}
                onChange={(e) =>
                  setTechniken((alt) => (e.target.checked ? [...alt, t] : alt.filter((x) => x !== t)))
                }
              />
              <span>{ABO_TECHNIK_LABEL[t]}</span>
            </label>
          ))}
          {!speicherbar && <p style={S.hinweis}>Mindestens eine Technik muss angehakt bleiben.</p>}
        </>
      )}

      <label style={S.zeile}>
        <input
          type="checkbox"
          style={S.haken}
          checked={ausVerwaltung}
          onChange={(e) => setAusVerwaltung(e.target.checked)}
        />
        <span>Ich arbeite für die Stadt- oder Gemeindeverwaltung</span>
      </label>

      <div style={S.aktionen}>
        <button
          type="button"
          style={{ ...S.cta, opacity: speicherbar && zustand !== "sendet" ? 1 : 0.5 }}
          disabled={!speicherbar || zustand === "sendet"}
          onClick={speichern}
        >
          Speichern
        </button>
        <button type="button" style={S.leise} onClick={abmelden} disabled={zustand === "sendet"}>
          Diesen Ort abbestellen
        </button>
      </div>

      {zustand === "gespeichert" && <p style={S.hinweis}>Gespeichert.</p>}
      {zustand === "fehler" && <p style={S.hinweis}>Das hat gerade nicht geklappt. Bitte später erneut.</p>}
    </section>
  );
}
