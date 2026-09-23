/**
 * Die Kontakt-Box der Startseite — Bild, Satz, Signatur, „Über Solar Check"
 * und der Kontakt-Knopf.
 *
 * WARUM ALS BAUSTEIN (Betreiber, 23.09.2026, mehrfach beanstandet): Die
 * Ortsseite hatte eine eigene, handgeschriebene Fassung. Deren Stil war eine
 * Kurzfassung der 106 Regeln, die diese Box auf der Startseite trägt — sie sah
 * deshalb „fast" so aus und holte es durch Nachbessern nie ein. Markup UND
 * Stil kommen jetzt aus einer Quelle: das Markup von hier, die Regeln aus dem
 * Startseiten-Paket (scripts/person-box-stil.ts erzeugt sie, siehe dort).
 *
 * Die Klassennamen sind die des Pakets und dürfen nicht umbenannt werden —
 * an ihnen hängt der Stil.
 */
const NACHRICHT_ICON = (
  <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
    <path d="M4 5h16v12H9l-5 4V5Z" />
    <path d="M8 9h8M8 13h5" />
  </svg>
);

const HAENDE_ICON = (
  <svg width="28" height="28" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256" fill="currentColor">
    <path d="M254.3,107.91,228.78,56.85a16,16,0,0,0-21.47-7.15L182.44,62.13,130.05,48.27a8.14,8.14,0,0,0-4.1,0L73.56,62.13,48.69,49.7a16,16,0,0,0-21.47,7.15L1.7,107.9a16,16,0,0,0,7.15,21.47l27,13.51,55.49,39.63a8.06,8.06,0,0,0,2.71,1.25l64,16a8,8,0,0,0,7.6-2.1l55.07-55.08,26.42-13.21a16,16,0,0,0,7.15-21.46Zm-54.89,33.37L165,113.72a8,8,0,0,0-10.68.61C136.51,132.27,116.66,130,104,122L147.24,80h31.81l27.21,54.41ZM41.53,64,62,74.22,36.43,125.27,16,115.06Zm116,119.13L99.42,168.61l-49.2-35.14,28-56L128,64.28l9.8,2.59-45,43.68-.08.09a16,16,0,0,0,2.72,24.81c20.56,13.13,45.37,11,64.91-5L188,152.66Zm62-57.87-25.52-51L214.47,64,240,115.06Zm-87.75,92.67a8,8,0,0,1-7.75,6.06,8.13,8.13,0,0,1-1.95-.24L80.41,213.33a7.89,7.89,0,0,1-2.71-1.25L51.35,193.26a8,8,0,0,1,9.3-13l25.11,17.94L126,208.24A8,8,0,0,1,131.82,217.94Z" />
  </svg>
);

// „homepage-study" ist KEIN Ort, sondern der Schalter für die letzte
// Ausbaustufe dieser Box im Paket: 15 ihrer Regeln hängen daran, und sie
// stehen als NACHFAHREN-Regeln da (".homepage-study .hs-person-section").
// Deshalb eine eigene Hülle darum — auf demselben Element greifen sie nicht.
export default function PersonBox() {
  return (
    <div className="homepage-study">
    <section className="hs-section hs-person-section">
      <div className="hs-wrap">
        <section className="sc-person" aria-label="Ihr Kontakt bei Solar Check">
          <picture className="sc-person-picture">
            <source media="(max-width: 700px)" srcSet="/shared-person/sebastian-portrait.webp" />
            <img src="/shared-person/sebastian-portrait.webp" alt="Sebastian Schäder" loading="lazy" />
          </picture>
          <div className="sc-person-body">
            <p className="sc-person-text">
              Wir machen erneuerbare Energien <strong>verständlich und berechenbar</strong>. Mit kostenlosen Rechnern und aktuellen
              Energiedaten.
            </p>
            <p className="sc-person-signature">
              <strong>Sebastian Schäder</strong> · Solar Check
            </p>
            {/* Kontakt ist der Hauptweg, „Über Solar Check" ist weg
                (Betreiber, 23.09.2026): Der Kasten zeigt eine Person und lädt
                ein, ihr zu schreiben — zwei Knöpfe nebeneinander teilen genau
                diese Einladung auf, und der zweite führte auf eine Seite, die
                dasselbe noch einmal erzählt. */}
            <div className="sc-person-actions">
              <a href="/kontakt" className="sc-person-primary hs-person-message" title="Kontakt">
                {NACHRICHT_ICON}
                <span>Kontakt</span>
              </a>
            </div>
          </div>
          <p className="hs-person-reassurance">
            {HAENDE_ICON}
            <span>Ohne Anmeldung und ohne Verkaufsanrufe.</span>
          </p>
        </section>
      </div>
    </section>
    </div>
  );
}
