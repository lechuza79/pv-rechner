import { test, expect } from "@playwright/test";

// Rechtsaussagen werden SICHTBAR geprüft, nicht im Quelltext
// (scripts/council-verify.md, BLOCKER).
//
// Hier geprüft: die Pflichtangaben zur LinkedIn-Unternehmensseite. Der Fall ist
// nicht Auftragsverarbeitung, sondern gemeinsame Verantwortlichkeit nach
// Art. 26 DSGVO — und Abs. 2 Satz 2 verlangt, dass der WESENTLICHE INHALT der
// Vereinbarung den betroffenen Personen zugänglich gemacht wird. Eine bloße
// Nennung "wir sind auf LinkedIn" erfüllt das nicht.

test.describe("LinkedIn-Seite: Angaben nach Art. 26 DSGVO stehen in der Erklärung", () => {
  test("Gemeinsame Verantwortlichkeit, Rechtsträger und wesentlicher Inhalt", async ({ page }) => {
    await page.goto("/datenschutz-linkedin");

    await expect(page.getByRole("heading", { name: /Datenschutz für unsere LinkedIn-Seite/i })).toBeVisible({
      timeout: 15_000,
    });

    const text = await page.locator("body").innerText();

    // Der Rechtsträger mit Anschrift — "LinkedIn" allein wäre als Angabe des
    // gemeinsam Verantwortlichen zu dünn (Art. 26 Abs. 1).
    expect(text).toContain("LinkedIn Ireland Unlimited Company");
    expect(text).toMatch(/Wilton Plaza/);
    expect(text).toMatch(/Dublin 2/);

    // Die Einordnung selbst, nicht bloß "Datenverarbeitung durch LinkedIn".
    expect(text).toMatch(/Art\. 26 DSGVO/);

    // Wesentlicher Inhalt (Art. 26 Abs. 2 S. 2): wer informiert, wer die
    // Betroffenenrechte bedient, welche Aufsichtsbehörde federführend ist.
    expect(text).toMatch(/wesentliche Inhalt/i);
    expect(text).toMatch(/Auskunft und Löschung/);
    expect(text).toMatch(/Data Protection Commission/);

    // Die Vereinbarung muss verlinkt und erreichbar benannt sein.
    const addendum = page.getByRole("link", { name: /Page Insights Joint Controller Addendum/i });
    await expect(addendum).toHaveAttribute("href", /linkedin\.com\/legal/);

    // Rechtsgrundlage plus Verweis aufs Widerspruchsrecht — so hält es die
    // Erklärung überall dort, wo sie auf das berechtigte Interesse stützt.
    expect(text).toMatch(/Art\. 6 Abs\. 1 lit\. f DSGVO/);
    expect(text).toMatch(/widersprechen \(Abschnitt 6\)/);

    // Drittlandbezug (Art. 13 Abs. 1 lit. f). Beide Mechanismen, weil LinkedIn
    // selbst beide nennt.
    expect(text).toMatch(/Standardvertragsklauseln/);
    expect(text).toMatch(/EU-U\.S\. Data Privacy Framework/);
  });

  test("Keine Zusage, die ein Blick ins eigene LinkedIn-Konto widerlegt", async ({ page }) => {
    await page.goto("/datenschutz-linkedin");
    await expect(page.getByRole("heading", { name: /Datenschutz für unsere LinkedIn-Seite/i })).toBeVisible({
      timeout: 15_000,
    });

    const text = await page.locator("body").innerText();
    const abschnitt = text.slice(text.indexOf("Gemeinsame Verantwortlichkeit"));

    // Follower, Kommentare und Reaktionen sind dem Seitenbetreiber NAMENTLICH
    // sichtbar. Wer hier "wir sehen keine einzelnen Personen" schreibt, macht
    // dieselbe absolute Zusage, an der diese Erklärung schon mehrfach falsch
    // war ("keine Nutzer-Accounts, keine Cookies" — es gab beides).
    expect(abschnitt).toMatch(/Namen und öffentlichen Profile/);
    expect(abschnitt).toMatch(/folgen oder einen Beitrag kommentieren/);
    expect(abschnitt).not.toMatch(/keine personenbezogenen Daten (?:erhalten|verarbeitet)/i);

    // Die Aggregat-Aussage darf nur für die STATISTIK gelten, nicht für den
    // ganzen Auftritt.
    expect(abschnitt).toMatch(/Statistiken\s+erhalten wir ausschließlich in zusammengefasster Form/);
  });
});
