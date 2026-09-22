import { supabase } from './supabase-server';
import { tokenHash, validWaitlistToken } from './offer-waitlist';

// GET only presents a button: mail-link scanners must not confirm or delete entries.
export async function waitlistAction(req: Request, remove: boolean) {
 const token = new URL(req.url).searchParams.get('t') || '';
 const headers = {'Content-Type':'text/html; charset=utf-8','Cache-Control':'no-store','Referrer-Policy':'no-referrer','X-Robots-Tag':'noindex'};
 const page = (text: string, form = '', status = 200) => new Response(`<!doctype html><html lang="de"><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>Angebotscheck · Warteliste</title><body style="font:18px system-ui;background:#edf3ef;color:#153740;margin:10vh auto;max-width:480px;padding:24px"><h1>Angebotscheck</h1><p>${text}</p>${form}<p><a href="https://solar-check.io">Zur Startseite</a></p></body></html>`,{status,headers});
 if(!validWaitlistToken(token)) return page('Dieser Link ist ungültig.', '', 400);
 if(req.method === 'GET') return page(remove?'Den Eintrag aus der Warteliste löschen?':'Die Anmeldung zur Warteliste bestätigen?',`<form method="post"><button style="padding:14px 24px;border:0;border-radius:30px;background:#d4ff24;color:#132527;font:inherit">${remove?'Eintrag löschen':'Anmeldung bestätigen'}</button></form>`);
 const origin=req.headers.get('origin');if(origin && origin!==new URL(req.url).origin)return page('Ungültige Anfrage.','',403);
 if(!supabase || process.env.OFFER_WAITLIST_ENABLED!=='true')return page('Die Warteliste ist noch nicht freigeschaltet.','',503);
 const query = remove ? supabase.from('offer_waitlist').delete().eq('cancel_hash',tokenHash(token)) : supabase.from('offer_waitlist').update({confirmed_at:new Date().toISOString()}).eq('token_hash',tokenHash(token)).is('confirmed_at',null).gt('expires_at',new Date().toISOString());
 const {data,error}=await query.select('id');
 if(error)return page('Das hat gerade nicht geklappt. Bitte später erneut versuchen.','',503);
 return page(remove?'Der Eintrag ist gelöscht.':data?.length?'Du stehst auf der Warteliste. Wir melden uns zum Start.':'Dieser Link ist abgelaufen oder wurde bereits bestätigt.');
}
