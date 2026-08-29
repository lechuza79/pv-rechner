import { redirect } from "next/navigation";
import { isAdminSession } from "../../../../../lib/admin-guard";
import { ladeKonto } from "../../../../../lib/social-konten";
import { ablaufBefund } from "../../../../../lib/social-ablauf";
import { ladeVersand } from "../../../../../lib/social-versand-log";
import InfoTooltip from "../../../../../components/InfoTooltip";
import { v, space, pad } from "../../../../../lib/theme";

// Auswertung: Was ist rausgegangen, und was können wir darüber überhaupt wissen.
//
// Der zweite Teil ist der wichtigere. Reichweitenzahlen liegen bei LinkedIn, und
// die Leseberechtigung dafür ist bei ihnen ausdrücklich beschränkt und nur für
// geprüfte Anwendungen zu haben — wir können sie also nicht abrufen. Diese Seite
// zeigt deshalb, was wir selbst gesendet haben, und sagt beim Rest, dass wir es
// nicht wissen. Eine Kennzahl zu erfinden, die wir nicht messen können, wäre
// dieselbe Fehlerklasse wie ein Prüfdatum ohne Prüfung.

export const metadata = {
  title: "Redaktion – Auswertung",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

export default async function RedaktionAuswertung() {
  if (!(await isAdminSession())) redirect("/login?next=/admin/redaktion/auswertung");

  const konto = await ladeKonto("linkedin");
  const versand = await ladeVersand();
  const befund = konto ? ablaufBefund(konto, new Date()) : null;

  const karte = {
    background: v("--color-bg-muted"),
    borderRadius: v("--radius-md"),
    padding: pad("xxl", "xxl"),
  } as const;

  return (
    <div style={{ maxWidth: 900, margin: "0 auto" }}>
      <section style={{ ...karte, marginBottom: space.xxxl }}>
        <h2 style={{ fontSize: v("--font-size-h3"), marginTop: 0 }}>Zugang</h2>
        {konto && befund ? (
          <p style={{ margin: 0, fontSize: v("--font-size-body") }}>
            Verbunden als <strong>{konto.anzeigename}</strong>. Der Zugang läuft in{" "}
            <strong>{befund.tageBisAblauf} Tagen</strong> ab
            {befund.warnung ? " — Zeit, ihn zu erneuern." : "."} Vor Ablauf meldet sich der
            Gesundheitscheck von selbst, gestaffelt statt täglich.
          </p>
        ) : (
          <p style={{ margin: 0, fontSize: v("--font-size-body"), color: v("--color-text-secondary") }}>
            Kein Konto verbunden.
          </p>
        )}
      </section>

      <section style={{ ...karte, marginBottom: space.xxxl }}>
        <h2 style={{ fontSize: v("--font-size-h3"), marginTop: 0 }}>Veröffentlichte Beiträge</h2>
        {versand.length === 0 ? (
          <p style={{ margin: 0, fontSize: v("--font-size-body"), color: v("--color-text-secondary") }}>
            Noch nichts rausgegangen. Die Ablage entsteht mit dem ersten Beitrag, der über den
            Redaktionstisch gesendet wird.
          </p>
        ) : (
          <>
            {/* Nur ANHÄNGEN, nie ändern: Eine Zeile ist die Aussage „das ging an
                dem Tag mit diesem Abdruck raus". Sie zu überschreiben hieße, die
                Vergangenheit zu bearbeiten — dieselbe Regel wie beim
                Förder-Verlauf, wo gelöscht ebenfalls nie wird.

                Der ABDRUCK steht mit dabei, verkürzt. Ohne ihn wäre nicht
                rekonstruierbar, WELCHE Fassung raus ist, und der Prüfbefund
                dazu wäre kein Beweismittel, sondern der jeweils letzte Zustand. */}
            <div style={{ display: "flex", flexDirection: "column", gap: space.sm }}>
              {versand.map((x) => (
                <div
                  key={`${x.post_id}-${x.gesendet_am}`}
                  style={{
                    display: "flex",
                    gap: space.md,
                    alignItems: "baseline",
                    flexWrap: "wrap",
                    fontSize: v("--font-size-small"),
                  }}
                >
                  <span style={{ color: v("--color-text-muted"), minWidth: 130 }}>
                    {new Date(x.gesendet_am).toLocaleString("de-DE")}
                  </span>
                  <span style={{ flex: "1 1 auto" }}>{x.post_id}</span>
                  <span style={{ color: v("--color-text-muted"), fontFamily: "monospace" }}>
                    {x.fassung_fingerabdruck.slice(0, 12)}
                  </span>
                </div>
              ))}
            </div>
            <p
              style={{
                fontSize: v("--font-size-caption"),
                color: v("--color-text-muted"),
                marginBottom: 0,
                marginTop: space.md,
              }}
            >
              {versand.length} Sendung{versand.length === 1 ? "" : "en"}. Der Abdruck sagt, welche
              Fassung rausging — dieselbe Fassung ein zweites Mal weist der Sendeweg ab.
            </p>
          </>
        )}
      </section>

      <section style={karte}>
        <h2 style={{ fontSize: v("--font-size-h3"), marginTop: 0, display: "flex", alignItems: "center", gap: space.xs }}>
          Nicht messbar
          <InfoTooltip ariaLabel="Warum Reichweitenzahlen fehlen" exportNote={false}>
            Aufrufe, Reaktionen und Kommentare liegen bei LinkedIn. Die Leseberechtigung dafür ist
            dort beschränkt und nur für geprüfte Anwendungen zu haben; unsere Verbindung darf
            veröffentlichen, aber nicht zurücklesen. Messbar ist stattdessen die Wirkung auf
            unserer Seite — die ehrlichere Zahl, weil sie sagt, ob jemand nach dem Lesen etwas
            getan hat.
          </InfoTooltip>
        </h2>
        <p style={{ fontSize: v("--font-size-body"), color: v("--color-text-secondary"), margin: 0 }}>
          Reichweite steht in der LinkedIn-App, nicht hier.
        </p>
      </section>
    </div>
  );
}
