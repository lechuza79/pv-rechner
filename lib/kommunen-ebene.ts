/**
 * Welche Verwaltungsebene steckt hinter einem Schlüssel — und wer darf sie sehen.
 *
 * WARUM ES DAS GIBT (09.09.2026): Die Kontakttabelle war bis dahin eine reine
 * GEMEINDE-Tabelle; alle 11.219 Zeilen trugen einen achtstelligen Schlüssel.
 * Damit war ein Landkreis, der selbst fördert, für die Förder-Suche unsichtbar —
 * strukturell, nicht zufällig. Aufgefallen am Landkreis Oldenburg, der seit dem
 * 20.03.2026 Balkonkraftwerke mit Speicher bezuschusst und den wir nur über eine
 * fremde Liste gefunden haben.
 *
 * DIE TABELLE TRÄGT JETZT BEIDE EBENEN — und genau deshalb braucht es diese
 * Grenze. Aus derselben Tabelle speist sich der Kommunen-Outreach, und dessen
 * Anschreiben behauptet einen Platz in einer Rangliste GLEICH GROSSER GEMEINDEN.
 * An einen Landkreis geschickt wäre jeder Satz darin falsch: Er hat keinen Rang
 * unter Gemeinden, keine Einwohnerdichte im Sinne unserer Auswertung und keine
 * Ortsseite, auf die der Brief verweist.
 *
 * „Ein Kreis bekommt ohnehin keine Kampagne zugewiesen, also wird er nie
 * angeschrieben" wäre keine Sicherung, sondern eine Beobachtung über den
 * heutigen Zustand — dieselbe Sorte Zusage, die dieses Projekt schon zweimal
 * eingelöst gesehen hat, als jemand einen zweiten Schreibweg gebaut hat.
 * Deshalb eine Funktion, an der die Absicht steht, und ein Test dagegen.
 */

/** Achtstellig: eine Gemeinde. Der Regelfall der Kontakttabelle. */
export function istGemeindeSchluessel(id: string): boolean {
  return /^\d{8}$/.test(id);
}

/**
 * Fünfstellig: ein Landkreis oder eine kreisfreie Stadt.
 *
 * Kreisfreie Städte nehmen wir NICHT als Kreiszeile auf — sie stehen bereits als
 * Gemeinde in der Tabelle, mit derselben Website. Eine zweite Zeile wäre eine
 * Dublette und würde jeden Crawl doppelt fahren. Die Unterscheidung trifft der
 * Aufnahme-Lauf anhand der Zahl der Gemeinden unter dem Präfix, nicht diese
 * Funktion: Sie kennt nur die Form des Schlüssels.
 */
export function istKreisSchluessel(id: string): boolean {
  return /^\d{5}$/.test(id);
}

/**
 * Darf an diesen Schlüssel ein Kommunen-Anschreiben gehen?
 *
 * Nur an Gemeinden. Der Aufhänger des Briefes ist ein Rang unter gleich großen
 * Gemeinden; für einen Landkreis gibt es ihn nicht.
 */
export function darfOutreachEmpfangen(id: string): boolean {
  return istGemeindeSchluessel(id);
}
