import { redirect } from "next/navigation";
import { isAdminSession } from "../../../../../lib/admin-guard";
import { ladeKonto } from "../../../../../lib/social-konten";
import { ablaufBefund } from "../../../../../lib/social-ablauf";
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
  const befund = konto ? ablaufBefund(konto, new Date()) : null;

  const karte = {
    background: v("--color-bg-muted"),
    borderRadius: v("--radius-md"),
    padding: pad("xxl", "xxl"),
  } as const;

  return (
    <div style={{ maxWidth: 900, margin: "0 auto" }}>
      <h1 style={{ fontSize: v("--font-size-h1"), marginBottom: space.sm }}>Auswertung</h1>
      <p style={{ color: v("--color-text-secondary"), marginBottom: space.huge, maxWidth: 720 }}>
        Was rausgegangen ist, und wo unsere Messung endet.
      </p>

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
        <p style={{ margin: 0, fontSize: v("--font-size-body"), color: v("--color-text-secondary") }}>
          Noch keine Ablage. Sie entsteht mit dem ersten Post, der über den Redaktionstisch rausgeht
          — vorher wäre eine leere Tabelle nur eine Behauptung über eine Funktion, die es nicht gibt.
        </p>
      </section>

      <section style={karte}>
        <h2 style={{ fontSize: v("--font-size-h3"), marginTop: 0 }}>Was wir nicht messen können</h2>
        <p style={{ fontSize: v("--font-size-body"), color: v("--color-text-secondary"), marginTop: 0 }}>
          Aufrufe, Reaktionen und Kommentare liegen bei LinkedIn. Die Leseberechtigung dafür ist dort
          beschränkt und nur für geprüfte Anwendungen zu haben; unsere Verbindung darf
          veröffentlichen, aber nicht zurücklesen. Diese Zahlen stehen also in der LinkedIn-App und
          nirgends hier.
        </p>
        <p style={{ fontSize: v("--font-size-body"), color: v("--color-text-secondary"), marginBottom: 0 }}>
          Was wir stattdessen messen können, ist die Wirkung auf unserer Seite: Zugriffe auf die
          verlinkten Seiten und woher sie kommen. Das ist die ehrlichere Zahl — sie sagt, ob jemand
          nach dem Lesen etwas getan hat, statt nur, dass etwas an ihm vorbeigescrollt ist.
        </p>
      </section>
    </div>
  );
}
