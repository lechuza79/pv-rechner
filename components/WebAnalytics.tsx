"use client";

import { Analytics } from "@vercel/analytics/next";

// ─── Reichweitenmessung — ohne den Abfrageteil der Adresse. ──────────────────
//
// DER ANLASS (27.08.2026, Legal-Gegenprüfung): Das Messskript überträgt
// `location.href` — die VOLLSTÄNDIGE Adresse einschließlich Abfrageteil. Die
// Rechner schreiben die Postleitzahl des Nutzers genau dorthin (`p.set("plz",
// …)`, damit ein Ergebnis teilbar ist). Damit erreichte jede eingegebene
// Postleitzahl die Messung, zusammen mit Ortsangabe bis zur Stadt, Gerätetyp,
// Browserversion und einer Kennung, die einen Besuch 24 Stunden lang
// zusammenfasst. Das ist die einzige Stelle im ganzen Messaufbau, an der sich
// ernsthaft eine Frage nach Personenbezug stellt.
//
// UND ES WIDERSPRACH DER EIGENEN ZUSAGE: In der Datenschutzerklärung stand,
// die Postleitzahl fließe „nicht in die Reichweitenmessung ein". Nach der
// Systematik der Legal-Checkliste (Punkt 8) ist eine absolute Zusage, die der
// eigene Quelltext widerlegt, keine Informationslücke, sondern eine falsche
// Zusage.
//
// WARUM DIE REGEL IM PROJEKT NICHT GEGRIFFEN HAT: Sie lautet „eigene
// Ereignisse tragen NIE Postleitzahl, Freitext oder Personenbezug"
// (`lib/analytics.ts`) — und sie wurde eingehalten. Der Weg lief über den
// SEITENAUFRUF, den die Regel nicht erfasst. Ein zweiter Kanal, auf den
// niemand geschaut hat, weil der erste sauber war.
//
// KEINE AUSNAHMELISTE. Der ganze Abfrageteil fällt weg, nicht einzelne
// Felder — eine Liste erlaubter Parameter wäre eine zweite Wahrheit, die beim
// nächsten neuen Parameter still veraltet. Verloren geht dabei nichts:
// Vercel fasst Seiten ohnehin ohne Abfrageteil zusammen. Auch die
// Herkunftskennung der Outreach-Briefe verschwindet hier — sie wird über ein
// eigenes Ereignis gezählt (`components/HerkunftsMelder.tsx`), das davon
// unberührt bleibt.
//
// Festgenagelt von `lib/__tests__/analytics-ohne-query.test.ts`: Wer
// `<Analytics />` künftig ohne diese Filterung einbindet, wird rot.
export function WebAnalytics() {
  return (
    <Analytics
      beforeSend={(event) => {
        try {
          const u = new URL(event.url);
          u.search = "";
          return { ...event, url: u.toString() };
        } catch {
          // Lässt sich die Adresse nicht zerlegen, wird nichts gemeldet.
          // Lieber eine fehlende Zählung als eine ungefilterte.
          return null;
        }
      }}
    />
  );
}
