import {fehlendeAboPflichtangaben, aboMailKopfzeilen} from "./abo-mail";
import type {GemeindeAbo} from "./gemeinde-abo";
import type {NewsletterMail} from "./newsletter-mail";

type Mail = {an:string; betreff:string; html?:string; text:string; newsletter?:NewsletterMail; abo?:{id:string;regionId:string}; bezug?:string[]};
const SITE = "https://solar-check.io";
export type SubscriberLinks={abmeldeUrl:string;einstellungenUrl:string};
export function subscriberMailProblems(mail:Mail, links:SubscriberLinks):string[] {
  const errors = fehlendeAboPflichtangaben(mail.html ?? "", "meldung");
  if (!mail.abo || !mail.newsletter) return [...errors,"Missing subscription metadata"];
  if (!mail.bezug?.includes(mail.abo.regionId)) errors.push("Missing subscription region");
  for (const link of [links.abmeldeUrl,links.einstellungenUrl]) {
    if (!mail.html?.includes(`href="${link}"`) || !mail.text.includes(link)) errors.push("Missing signed subscription link");
  }
  if (/ungueltige-vorschau|\[TEST|PLACEHOLDER/.test(mail.betreff+mail.html+mail.text)) errors.push("Preview content in production mail");
  if (!mail.betreff.trim() || !mail.text.trim()) errors.push("Empty mail");
  return errors;
}
/** Revalidate through the canonical confirmed-subscriber reader immediately before sending. */
export function assertSubscriber(mail:Mail, eligible:GemeindeAbo[]) {
  const found=eligible.find(a=>a.id===mail.abo?.id && a.regionId===mail.abo.regionId && a.email.toLowerCase()===mail.an.trim().toLowerCase() && a.status==="bestaetigt" && a.quelle==="gemeinde");
  if (!found) throw new Error("Subscription is no longer eligible");
  if (mail.newsletter?.variant !== (found.ausVerwaltung ? "kommunal" : "allgemein")) throw new Error("Subscription audience changed");
}
export function subscriberHeaders(links:SubscriberLinks) {return aboMailKopfzeilen(links.abmeldeUrl);}

export async function resolveSubscriberLinks(abo:{id:string;regionId:string}):Promise<SubscriberLinks> {
  if (!process.env.CRON_SECRET) throw new Error("Missing newsletter operator authentication");
  const response=await fetch(`${SITE}/api/abo/versenden`,{method:"POST",headers:{authorization:`Bearer ${process.env.CRON_SECRET}`,"content-type":"application/json"},body:JSON.stringify({aktion:"links",...abo}),signal:AbortSignal.timeout(15000)});
  if (!response.ok) throw new Error(`Subscription links unavailable: ${response.status}`);
  const links=await response.json() as SubscriberLinks;
  for(const [name,pathname] of [["abmeldeUrl","/abo/abmelden"],["einstellungenUrl","/abo/einstellungen"]] as const){
    const u=new URL(links[name]);
    if(u.origin!==SITE||u.pathname!==pathname||!u.searchParams.get("t")?.startsWith(abo.id+"."))throw new Error("Invalid subscription link response");
  }
  return links;
}
