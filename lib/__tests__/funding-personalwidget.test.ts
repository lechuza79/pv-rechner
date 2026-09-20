import { expect, it } from "vitest";
import { contactContentGap } from "../contact-discovery";
import { fundingContentGap } from "../../scripts/lib/funding-document";

// Das Personal-Widget einer kommunalen Seite, das beim Ausliefern noch leer ist.
const personalWidget = `<div><integration-bim id="staff" result-url="/klima/employee-list.html?i4xpath=published&amp;h=3"></integration-bim><div id="staff-result"></div><div id="staff-loading" class="loading is-active">Suchergebnisse werden geladen</div><div class="no-results">Keine Mitarbeitende gefunden.</div></div>`;
// Ein Förderprogramm, wie es serverseitig gerendert neben dem Widget steht.
const programmtext = `<article><h1>Kommunale Förderprogramme</h1><p>Die Stadt fördert Photovoltaikanlagen mit 100 Euro je Kilowatt-Peak, höchstens 1.000 Euro. Balkonkraftwerke werden mit 200 Euro bezuschusst. Anträge sind vor Baubeginn zu stellen; maßgeblich ist das Datum des Antragseingangs. Die Mittel sind begrenzt und werden in der Reihenfolge des Eingangs vergeben.</p></article>`;

it("ein leeres Personal-Widget wirft eine lesbare Förderseite nicht weg", () => {
  const seite = programmtext + personalWidget;
  // Für die Kontaktdaten IST das eine Lücke — dort misst das Widget genau das,
  // was fehlt. Diese Hälfte darf die Korrektur nicht mitnehmen.
  expect(contactContentGap(seite)).toBe("dynamic-directory");
  // Für die Förderung nicht: der Programmtext ist da.
  expect(fundingContentGap(seite)).toBe(null);
});

it("ohne Programmtext bleibt die Seite zurückgehalten statt als „keine Förderung“ zu zählen", () => {
  // Ein falscher Negativbefund ist hier die teure Richtung: Die Seite käme als
  // geprüft in die Ablage und die Kommune gälte als erledigt.
  expect(fundingContentGap(personalWidget)).toBe("dynamic-directory");
});

it("die übrigen Lücken-Urteile gelten für die Förderung unverändert", () => {
  // Rahmenseite: der Inhalt steckt in den Frames, nicht in der Seite.
  expect(fundingContentGap(`<frameset><frame src="/inhalt.html"></frameset>` + programmtext)).toBe("frameset");
  // Eingebettetes PDF: der Programmtext liegt im Dokument, nicht im HTML.
  expect(fundingContentGap(`<iframe src="/richtlinie.pdf"></iframe>` + programmtext)).toBe("embedded-document");
  // Noch ladende Seite bleibt eine Lücke, auch mit Personal-Widget daneben.
  expect(fundingContentGap(`<div id="app"></div><script>x</script>` + personalWidget)).toBe("dynamic-directory");
  expect(fundingContentGap(`<div id="app"></div><script>x</script>`)).toBe("loading-shell");
});
