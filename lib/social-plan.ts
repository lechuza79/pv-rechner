// Was als Nächstes rausgehen darf — und was die übrigen hindert.
//
// KEIN KALENDER, und das ist geprüft, nicht übernommen. Die Planungsansicht
// begründet das seit ihrem Bau so: „Ein Datum je Post wäre eine Zusage, die
// niemand einhält, sobald eine Woche voll ist — und ein Plan, dessen Termine
// reihenweise verstreichen, wird nach dem dritten Mal nicht mehr gelesen."
//
// Das Argument hält. Es richtet sich gegen TERMINE, nicht gegen Reihenfolge —
// und was der Sendeweg braucht, ist keine Zusage für den 3. September, sondern
// eine Antwort auf „was ist der nächste, der raus darf". Eine Warteschlange
// beantwortet das, ohne ein Datum zu versprechen, das jemand reißen kann. Der
// Kalender bliebe leer, die Warteschlange nicht.
//
// Sie entscheidet AUS DEM ZUSTAND, nicht aus einer gepflegten Liste: Freigaben,
// mechanische Befunde und das Versandprotokoll liegen ohnehin vor. Eine zweite
// Liste, in die jemand einträgt, wäre eine zweite Wahrheit — dieselbe
// Entscheidung wie bei der Sitzungs-Übersicht dieses Projekts: gemessen, nicht
// angemeldet.

import { sperren, type Befund } from "./social-mechanik";
import { urteil, type Pruefung } from "./social-pruefung-kern";
import type { SocialPost } from "./social-posts";

export type Hindernis =
  | "mechanik"
  | "freigabe"
  | "schon-gesendet"
  | "ort-kollision";

export type PlanEintrag = {
  post: SocialPost;
  abdruck: string;
  /** Leer heißt: darf raus. */
  hindernisse: { art: Hindernis; text: string }[];
};

export type PlanEingabe = {
  post: SocialPost;
  abdruck: string;
  pruefungen: Pruefung[];
  befunde: Befund[];
};

/**
 * Orte, die in einem Beitrag namentlich vorkommen.
 *
 * Gegen eine LISTE, nicht per Textsuche nach Ortsmustern: „Hof" und „Essen"
 * treffen sonst in jedem zweiten Satz, und „Hamburg" ist Land und Gemeinde
 * zugleich. Die Liste kommt von außen, weil sie je nach Frage eine andere ist —
 * beim Anschreiben-Abgleich die angeschriebenen Gemeinden, bei der Wiederholung
 * die zuletzt genannten.
 */
export function genannteOrte(post: SocialPost, orte: string[]): string[] {
  const heuhaufen = [post.text, post.bild?.aussage ?? "", ...(post.bild?.serien ?? []).map((s) => s.label)]
    .join(" ")
    .toLowerCase();
  return orte.filter((o) => o && heuhaufen.includes(o.toLowerCase()));
}

/**
 * Der Plan über alle Beiträge.
 *
 * Gibt ALLE zurück, auch die gesperrten, mit ihrem Hindernis. Nur die
 * sendbaren zu liefern wäre bequemer und würde die eigentliche Frage
 * verschlucken: Warum steht der Vorrat still?
 */
export function planen(
  eintraege: PlanEingabe[],
  welt: {
    /** Abdrücke, die schon rausgingen — je Beitrag. */
    gesendet: (postId: string, abdruck: string) => boolean;
    /** Orte, die im selben Zeitraum ein Anschreiben bekommen. */
    orteMitAnschreiben: string[];
  },
): PlanEintrag[] {
  return eintraege.map(({ post, abdruck, pruefungen, befunde }) => {
    const hindernisse: PlanEintrag["hindernisse"] = [];

    // Die Mechanik zuerst: Sie ist umsonst und ihr Befund ist der konkreteste.
    const gesperrt = sperren(befunde);
    if (gesperrt.length) {
      hindernisse.push({ art: "mechanik", text: gesperrt.map((b) => b.text).join(" · ") });
    }

    const stand = urteil(abdruck, pruefungen);
    if (!stand.ok) hindernisse.push({ art: "freigabe", text: stand.grund });

    if (welt.gesendet(post.id, abdruck)) {
      hindernisse.push({
        art: "schon-gesendet",
        text: "Diese Fassung ging bereits raus. Nach einer echten Überarbeitung darf sie wieder — unverändert nicht.",
      });
    }

    // „Keine Gemeinde nennen, die im selben Zeitraum ein Anschreiben bekommt" —
    // sonst liest sich der Post als Druckmittel und der Brief als Drohung.
    const kollision = genannteOrte(post, welt.orteMitAnschreiben);
    if (kollision.length) {
      hindernisse.push({
        art: "ort-kollision",
        text: `Nennt eine Gemeinde, die gerade ein Anschreiben bekommt: ${kollision.join(", ")}`,
      });
    }

    return { post, abdruck, hindernisse };
  });
}

/** Nur die, die raus dürfen — in der Reihenfolge, in der sie hereinkamen. */
export function sendbar(plan: PlanEintrag[]): PlanEintrag[] {
  return plan.filter((e) => e.hindernisse.length === 0);
}
