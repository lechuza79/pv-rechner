import type { WartelisteName } from "./warteliste-einwilligung";

/** Upcoming capabilities, explicitly presented as planned rather than available. */
export const WARTELISTE_VORSCHAU: Record<WartelisteName, {bild:string;alt:string;funktionen:[string,string][]}> = {
  elektroauto: {
    bild:"/homepage-study/bev-v1/bev.webp",
    alt:"Illustration eines Elektroautos",
    funktionen:[
      ["Reichweite im Alltag", "Ordne ein, welche Reichweite zu deinen täglichen Wegen und längeren Fahrten passt."],
      ["Laden zu Hause und unterwegs", "Vergleiche deine Lademöglichkeiten – auch mit eigenem Solarstrom."],
      ["Kosten im Vergleich", "Behalte Anschaffung, Strom und laufende Kosten im Blick und vergleiche mit deinem bisherigen Auto."],
    ],
  },
  angebotscheck: {
    bild:"/homepage-study/illustrations/offer-check-v20.webp",
    alt:"Illustration zur Prüfung eines Angebots",
    funktionen:[
      ["Preis besser einordnen", "Erkenne, welche Leistungen im Preis enthalten sind und wo sich Nachfragen lohnen."],
      ["Auslegung verstehen", "Prüfe, ob Anlagengröße und Annahmen zu deinem Haushalt passen – bei Photovoltaik oder Wärmepumpe."],
      ["Gezielter nachfragen", "Finde unklare Angaben und fehlende Leistungen, bevor du dich für ein Angebot entscheidest."],
    ],
  },
};
