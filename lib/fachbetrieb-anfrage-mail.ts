import { huelle, SITE, C, T } from "./mail-huelle";
import { escapeHtml } from "./html-escape";

/**
 * Die Anfrage-Mail an den Fachbetrieb.
 *
 * ── Warum sie von einem MENSCHEN kommt ─────────────────────────────────────
 * Entscheidung des Betreibers (03.09.2026): Der Betrieb bekommt keinen
 * Datenauszug mit Feldern und Werten, sondern einen kurzen Brief mit Anrede
 * und Unterschrift. Grund ist der Empfänger: Ein Handwerksbetrieb bekommt
 * täglich Post von Lead-Portalen, und die sieht genau aus wie ein
 * Datenauszug. Der erste Kontakt soll erkennbar von jemandem kommen, der
 * ansprechbar ist — die Rückfrage geht dann an einen Namen, nicht an ein
 * System.
 *
 * ── Was das für die INHALTE heißt ──────────────────────────────────────────
 * Die Angaben des Interessenten stehen trotzdem sauber getrennt, nicht in
 * Fließtext gegossen: Wer eine Anfrage bearbeitet, sucht Name und Nummer, und
 * ein Brief, in dem sie zwischen Sätzen versteckt sind, kostet ihn Zeit. Der
 * Brief rahmt die Angaben, er ersetzt sie nicht.
 *
 * ── Die Anrede ────────────────────────────────────────────────────────────
 * „Hallo" plus Kurzname des Betriebs. Einen Ansprechpartner haben wir bei den
 * wenigsten (die Erhebung liest Impressen, keine Visitenkarten) — ihn zu raten
 * wäre die Sorte Fehler, die man in der ersten Zeile macht und nicht mehr
 * gutmachen kann.
 */

export type AnfrageMailDaten = {
  /** Kurzname des Betriebs, ohne Rechtsform — für die Anrede. */
  betriebKurz: string;
  name: string;
  kontakt: string;
  nachricht: string;
  /** Anschrift des Vorhabens — optional, kann ganz fehlen. */
  strasse?: string;
  plz?: string;
  ort?: string;
  /** Wie viele Bilder als Anhang mitgehen. */
  fotoAnzahl?: number;
  /** Link auf die Rechnung. Fehlt er, entfällt der Absatz. */
  ergebnisUrl: string | null;
};

/** Wer unterschreibt. Steht hier, damit Absender und Unterschrift nicht
 *  auseinanderlaufen können. */
export const ABSENDER = {
  name: "Sebastian Schäder",
  rolle: "Betreiber von solar-check.io",
  mail: "hey@solar-check.io",
};

/** Setzt die Anschrift zusammen — leer, wenn nichts angegeben wurde. */
function anschrift(d: AnfrageMailDaten): string {
  const ortZeile = [d.plz, d.ort].filter(Boolean).join(" ").trim();
  return [d.strasse?.trim(), ortZeile].filter(Boolean).join(", ");
}

export function anfrageMailBetreff(d: AnfrageMailDaten): string {
  // Steuerzeichen raus, bevor der Name in den Betreff geht — dieselbe
  // Absicherung wie im Kontaktformular.
  const sicher = d.name.replace(/[\r\n\t]+/g, " ").slice(0, 60);
  return `Anfrage über Ihren PV-Rechner – ${sicher}`;
}

export function anfrageMailHtml(d: AnfrageMailDaten): string {
  const zeile = (was: string, wert: string) =>
    `<tr>
       <td style="padding:2px 12px 2px 0;color:${C.leise};font-size:${T.fuss};white-space:nowrap;vertical-align:top">${was}</td>
       <td style="padding:2px 0;color:${C.text};font-size:${T.text}">${escapeHtml(wert)}</td>
     </tr>`;

  const inhalt = `
    <p style="margin:0 0 14px">Hallo ${escapeHtml(d.betriebKurz)},</p>

    <p style="margin:0 0 14px">
      jemand hat gerade auf der Rechner-Seite, die wir für Sie eingerichtet
      haben, eine Anlage durchgerechnet — und möchte, dass Sie das Ergebnis
      bekommen.
    </p>

    <table role="presentation" cellpadding="0" cellspacing="0" style="margin:0 0 16px;border-collapse:collapse">
      ${zeile("Name", d.name)}
      ${zeile("Kontakt", d.kontakt)}
      ${anschrift(d) ? zeile("Adresse", anschrift(d)) : ""}
    </table>

    ${
      anschrift(d)
        ? `<p style="margin:0 0 14px;color:${C.leise};font-size:${T.fuss}">
             Die Adresse hat er freiwillig angegeben, damit Sie das Dach vorab
             ansehen können.
           </p>`
        : ""
    }

    ${
      d.fotoAnzahl
        ? `<p style="margin:0 0 14px">
             <strong>${d.fotoAnzahl === 1 ? "Ein Bild" : `${d.fotoAnzahl} Bilder`}</strong> hängen dieser Mail an.
           </p>`
        : ""
    }

    ${
      d.nachricht
        ? `<p style="margin:0 0 4px;color:${C.leise};font-size:${T.fuss}">Nachricht</p>
           <p style="margin:0 0 16px;padding:12px 14px;background:${C.grund};border-radius:${C.eckeKnopf};white-space:pre-line">${escapeHtml(d.nachricht)}</p>`
        : ""
    }

    ${
      d.ergebnisUrl
        ? `<p style="margin:0 0 16px">
             <a href="${escapeHtml(d.ergebnisUrl)}" style="color:${C.akzent};font-weight:600">Die Rechnung ansehen</a><br>
             <span style="color:${C.leise};font-size:${T.fuss}">Der Link öffnet dieselbe Rechnung mit allen Annahmen — Sie können sie mit Ihren eigenen Preisen weiterdrehen.</span>
           </p>`
        : ""
    }

    <p style="margin:0 0 14px">
      Wenn Sie antworten, geht Ihre Antwort direkt an ${escapeHtml(d.name)} — nicht
      über uns. Wir vermitteln nichts weiter und geben die Anfrage an niemanden
      sonst.
    </p>

    <p style="margin:0 0 4px">Viele Grüße</p>
    <p style="margin:0 0 2px;font-weight:600;color:${C.text}">${ABSENDER.name}</p>
    <p style="margin:0;font-size:${T.fuss};color:${C.leise}">
      ${ABSENDER.rolle}<br>
      <a href="${SITE}" style="color:${C.leise}">solar-check.io</a>
      &nbsp;·&nbsp;
      <a href="mailto:${ABSENDER.mail}" style="color:${C.leise}">${ABSENDER.mail}</a>
    </p>`;

  return huelle({
    vorschau: `Anfrage von ${d.name} über Ihre Rechner-Seite`,
    inhalt,
    // Kein Abmeldelink: Das ist keine Meldung aus einem Verteiler, sondern eine
    // Anfrage an genau diesen Betrieb. Ein „abbestellen" darunter machte aus
    // einem Kundenkontakt eine Werbesendung — und genau so läse er sie dann.
    grundzeile:
      "Diese Mail kam, weil jemand über die für Sie eingerichtete Rechner-Seite eine Anfrage an Sie gestellt hat. Wenn Sie das nicht mehr möchten, genügt eine kurze Antwort.",
  });
}
