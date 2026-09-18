import { NextRequest } from "next/server";
import { pruefeAbmeldung } from "../../../lib/abo-token";
import { wartelisteId } from "../../../lib/warteliste-links";
import { wartelisteAbmelden } from "../../../lib/warteliste";
import { wartelisteErgebnis } from "../../../lib/warteliste-seite";

// Leaving the waitlist: no confirmation question, and always the same answer
// (even for a forged token) so this page does not reveal which ids exist.
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const id = wartelisteId(pruefeAbmeldung(req.nextUrl.searchParams.get("t") ?? ""));
  if (id) await wartelisteAbmelden(id, new Date().toISOString()).catch(() => undefined);
  return wartelisteErgebnis("/warteliste/abmelden", "Ausgetragen", [
    "Von uns kommt zu dieser Warteliste keine Mail mehr. Wir halten noch fest, dass du eingetragen warst und dich ausgetragen hast. Das brauchen wir als Nachweis deiner Einwilligung, und es wird für nichts anderes verwendet.",
  ]);
}
