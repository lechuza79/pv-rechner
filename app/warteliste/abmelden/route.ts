import { NextRequest } from "next/server";
import { pruefeAbmeldung } from "../../../lib/abo-token";
import { wartelisteId } from "../../../lib/warteliste-links";
import { wartelisteAbmelden } from "../../../lib/warteliste";
import { wartelisteErgebnis } from "../../../lib/warteliste-seite";

// Leaving the waitlist: the link (GET) shows a button, the press (POST) acts —
// mail scanners open links on their own and would unsubscribe people silently.
// The answer is the same for any token, so this page reveals no ids.
export const dynamic = "force-dynamic";
const PFAD = "/warteliste/abmelden";

export function GET(req: NextRequest) {
  return wartelisteErgebnis(
    PFAD,
    "Von der Warteliste austragen?",
    ["Ein Klick genügt, danach kommt zu dieser Warteliste keine Mail mehr von uns."],
    { label: "Austragen", token: req.nextUrl.searchParams.get("t") ?? "" },
  );
}

export async function POST(req: NextRequest) {
  const t = String((await req.formData().catch(() => null))?.get("t") ?? "");
  const id = wartelisteId(pruefeAbmeldung(t));
  if (id) await wartelisteAbmelden(id, new Date().toISOString()).catch(() => undefined);
  return wartelisteErgebnis(PFAD, "Ausgetragen", [
    "Von uns kommt zu dieser Warteliste keine Mail mehr. Wir halten noch fest, dass du eingetragen warst und dich ausgetragen hast. Das brauchen wir als Nachweis deiner Einwilligung, und es wird für nichts anderes verwendet.",
  ]);
}
