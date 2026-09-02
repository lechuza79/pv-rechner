import { einbettungenSeit, type EinbettungsZeile } from "../../../../lib/embed-herkunft";
import { v, space } from "../../../../lib/theme";
import AdminSeitenkopf from "../../../../components/admin/AdminSeitenkopf";

export const metadata = {
  title: "Einbettungen – Solar Check Admin",
  robots: { index: false, follow: false },
};

// Wer hat unsere Widgets eingebaut? Der Guard sitzt im Admin-Layout.
//
// Die Seite beantwortet genau eine Frage — die des Kommunen-Outreach: Hat
// jemand das Angebot angenommen, ohne zu antworten? Deshalb steht die DOMAIN
// oben und nicht das Widget: Ein neuer Name in dieser Liste ist die Nachricht,
// die Zahl daneben nur die Größenordnung.
export const dynamic = "force-dynamic";

const TAGE = 90;

function vorTagen(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString().slice(0, 10);
}

function fmtTag(iso: string): string {
  return new Date(iso).toLocaleDateString("de-DE", { day: "2-digit", month: "2-digit", year: "numeric" });
}

type ProHost = {
  host: string;
  aufrufe: number;
  widgets: string[];
  zuerst: string;
  zuletzt: string;
};

/** Eine Zeile je Domain — die Tageszeilen sind das Rohmaterial, nicht die Aussage. */
function proHost(zeilen: EinbettungsZeile[]): ProHost[] {
  const map = new Map<string, ProHost>();
  for (const z of zeilen) {
    const vorhanden = map.get(z.host);
    if (!vorhanden) {
      map.set(z.host, { host: z.host, aufrufe: z.aufrufe, widgets: [z.widget], zuerst: z.tag, zuletzt: z.tag });
      continue;
    }
    vorhanden.aufrufe += z.aufrufe;
    if (!vorhanden.widgets.includes(z.widget)) vorhanden.widgets.push(z.widget);
    if (z.tag < vorhanden.zuerst) vorhanden.zuerst = z.tag;
    if (z.tag > vorhanden.zuletzt) vorhanden.zuletzt = z.tag;
  }
  return [...map.values()].sort((a, b) => b.zuletzt.localeCompare(a.zuletzt) || b.aufrufe - a.aufrufe);
}

export default async function EinbettungenPage() {
  const zeilen = await einbettungenSeit(vorTagen(TAGE));
  const hosts = proHost(zeilen);

  const zellStil: React.CSSProperties = {
    padding: `${space.sm}px ${space.md}px`,
    borderBottom: `1px solid ${v("--color-border")}`,
    fontSize: v("--font-size-small"),
    verticalAlign: "top",
  };

  return (
    <div style={{ fontFamily: v("--font-text"), color: v("--color-text-primary"), maxWidth: 760 }}>
      <AdminSeitenkopf
        titel="Einbettungen"
        hilfe={
          <>
            Fremde Seiten, auf denen unsere Widgets laufen — die letzten {TAGE} Tage.
            Gezählt werden Aufrufe, nicht Besucher: Gespeichert ist nur die Domain,
            das Widget und der Kalendertag. Eigene Seiten und die Galerie zählen nicht mit.
          </>
        }
      />

      {hosts.length === 0 ? (
        <p style={{ fontSize: v("--font-size-small"), color: v("--color-text-muted"), lineHeight: 1.6 }}>
          Noch keine fremde Einbettung gezählt. Das ist vor den ersten angenommenen
          Outreach-Angeboten der erwartete Stand — und, solange die Zählung neu ist,
          auch von „die Zählung läuft nicht" nicht zu unterscheiden. Zum Prüfen ein
          Widget auf einer fremden Seite einbetten und diese Seite neu laden.
        </p>
      ) : (
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ textAlign: "left", fontSize: v("--font-size-small"), color: v("--color-text-muted") }}>
              <th style={{ ...zellStil, fontWeight: 600 }}>Domain</th>
              <th style={{ ...zellStil, fontWeight: 600 }}>Widget</th>
              <th style={{ ...zellStil, fontWeight: 600, whiteSpace: "nowrap" }}>Aufrufe</th>
              <th style={{ ...zellStil, fontWeight: 600, whiteSpace: "nowrap" }}>Zuletzt</th>
            </tr>
          </thead>
          <tbody>
            {hosts.map(h => (
              <tr key={h.host}>
                <td style={{ ...zellStil, fontWeight: 600, overflowWrap: "anywhere" }}>
                  <a
                    href={`https://${h.host}`}
                    target="_blank"
                    rel="noopener noreferrer nofollow"
                    style={{ color: v("--color-accent"), textDecoration: "none" }}
                  >
                    {h.host}
                  </a>
                  <div style={{ fontSize: v("--font-size-caption"), fontWeight: 400, color: v("--color-text-muted"), marginTop: 2 }}>
                    seit {fmtTag(h.zuerst)}
                  </div>
                </td>
                <td style={{ ...zellStil, color: v("--color-text-secondary") }}>{h.widgets.join(", ")}</td>
                <td style={{ ...zellStil, fontFamily: v("--font-mono"), whiteSpace: "nowrap" }}>
                  {h.aufrufe.toLocaleString("de-DE")}
                </td>
                <td style={{ ...zellStil, color: v("--color-text-secondary"), whiteSpace: "nowrap" }}>
                  {fmtTag(h.zuletzt)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
