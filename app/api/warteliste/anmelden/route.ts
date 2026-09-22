import { NextResponse } from 'next/server';
import { supabase } from '../../../../lib/supabase-server';
import { rateLimit } from '../../../../lib/rate-limit';
import { sendeAboMail } from '../../../../lib/abo-versand';
import { huelle, knopf } from '../../../../lib/mail-huelle';
import { OFFER_CONSENT_TEXT, tokenHash, waitlistInput, waitlistToken } from '../../../../lib/offer-waitlist';
export const runtime = 'nodejs';
export async function POST(req: Request) {
 const origin = req.headers.get('origin');
 if (origin && origin !== new URL(req.url).origin) return NextResponse.json({ error: 'Ungültige Anfrage.' }, { status: 403 });
 const limited = rateLimit(req, 'offer-waitlist', 5, 3600000); if (limited) return limited;
 if (Number(req.headers.get('content-length') || 0) > 4096) return new Response(null, { status: 413 });
 let input;
 try { const raw = await req.text(); if(raw.length > 4096) return new Response(null, {status:413}); input = waitlistInput(JSON.parse(raw)); } catch { input = null; }
 if (!input) return NextResponse.json({error:'Bitte eine gültige E-Mail-Adresse eintragen.'},{status:400});
 const ok = () => NextResponse.json({ok:true}, {headers:{'Cache-Control':'no-store'}});
 if (input.trap) return ok();
 // This local-first work must not quietly send real mail from a prototype.
 if (!supabase || process.env.OFFER_WAITLIST_ENABLED !== 'true') return NextResponse.json({error:'Die Warteliste ist in dieser Vorschau noch nicht für den Mailversand freigeschaltet.'},{status:503});
 const token = waitlistToken(), cancel = waitlistToken();
 const {data:id,error} = await supabase.rpc('reserve_offer_waitlist', {p_email:input.email,p_token_hash:tokenHash(token),p_cancel_hash:tokenHash(cancel),p_consent:OFFER_CONSENT_TEXT});
 if (error) return NextResponse.json({error:'Die Anmeldung klappt gerade nicht. Bitte später erneut versuchen.'},{status:503});
 if (!id) return ok();
 const base = process.env.NEXT_PUBLIC_BASE_URL || 'https://solar-check.io';
 const confirmUrl = `${base}/api/warteliste/bestaetigen?t=${token}`;
 const cancelUrl = `${base}/api/warteliste/abmelden?t=${cancel}`;
 const result = await sendeAboMail({an:input.email,art:'bestaetigung',subject:'Angebotscheck: Anmeldung bestätigen',
 html:huelle({vorschau:'Bitte bestätige deine Anmeldung zur Warteliste.',inhalt:`<h1>Beim Start dabei sein.</h1><p>Bestätige deine E-Mail-Adresse. Wir benachrichtigen dich einmal, sobald der Angebotscheck startet.</p>${knopf(confirmUrl,'Anmeldung bestätigen')}<p>Der Link gilt 48 Stunden. Wenn du dich nicht angemeldet hast, kannst du diese Nachricht ignorieren.</p><p><a href="${cancelUrl}">Eintrag löschen</a></p>`,grundzeile:'Diese E-Mail bekommst du, weil diese Adresse für die Warteliste des Angebotschecks eingetragen wurde.'}),
 text:`Anmeldung zum Angebotscheck bestätigen: ${confirmUrl}\nDer Link gilt 48 Stunden. Eine Nachricht zum Start, kein Newsletter.\nEintrag löschen: ${cancelUrl}\nDiese E-Mail bekommst du, weil diese Adresse für die Warteliste eingetragen wurde.\nhttps://solar-check.io/impressum\nhttps://solar-check.io/datenschutz`});
 if(!result.ok) return NextResponse.json({error:'Die Bestätigungsmail konnte nicht verschickt werden. Bitte morgen erneut versuchen.'},{status:503});
 const receipt = await supabase.from('offer_waitlist').update({mail_receipt:result.beleg}).eq('id',id);
 if(receipt.error) return NextResponse.json({error:'Die Anmeldung konnte nicht vollständig gespeichert werden. Bitte später erneut versuchen.'},{status:503});
 return ok();
}
