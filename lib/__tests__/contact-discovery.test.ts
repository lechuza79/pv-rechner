import { describe, it, expect } from "vitest";
import { contactBranch, contactLinks, contactLinkPriority, nextContactUrl } from "../contact-discovery";
import { fetchContactPage } from "../../scripts/lib/contact-fetch";
import { contactCandidates } from "../contact-evidence";

describe("contact discovery priorities",()=>{
  it("marks hidden mail as incomplete and reads the rendered result when available",async()=>{
    const fetcher=async()=>new Response('<span>email hidden; JavaScript is required</span>',{headers:{'content-type':'text/html'}});
    expect((await fetchContactPage('https://ort.de/',{fetcher})).observation.status).toBe('needs-rendering');
    const rendered=await fetchContactPage('https://ort.de/',{fetcher,render:async()=>'<p>Klimaschutz klima@ort.de</p>'});
    expect(rendered.observation).toMatchObject({status:'read',rendered:true,candidates:[expect.objectContaining({email:'klima@ort.de'})]});
    const failed=await fetchContactPage('https://ort.de/',{fetcher,render:async()=>{throw Error('No browser');}});
    expect(failed.observation.status).toBe('needs-rendering');
  });
  it("does not exhaust one department before trying other contact routes",()=>{
    const pending=new Map<string,number>([['https://ort.de/kontakt',110]]);
    for(let n=0;n<20;n++)pending.set(`https://ort.de/klima/themen/${n}.html`,125);
    const visits=new Map<string,number>(); const seen:string[]=[];
    for(let n=0;n<4;n++){const url=nextContactUrl(pending,visits);seen.push(url);pending.delete(url);const branch=contactBranch(url);visits.set(branch,(visits.get(branch)??0)+1);}
    expect(seen).toContain('https://ort.de/kontakt');
  });
  it("does not treat an inherited team folder or TeamTrier as a staff directory",()=>{
    expect(contactLinkPriority('https://ort.de/karriere/teamtrier-news/123.Ausbildung.html','Ausbildung','kommunen')).toBe(0);
    expect(contactLinkPriority('https://ort.de/team/news/123.Fest.html','Sommerfest','kommunen')).toBe(0);
  });
  it("visits climate and communications departments before generic directories",()=>{
    const ranked=contactLinks('<a href="/dienststellen?cat=1">Finanzen</a><a href="/dienststellen?cat=2">Stabsstelle Klima- und Umweltschutz</a><a href="/dienststellen?cat=3">Presse und Kommunikation</a>','https://ort.de/','ort.de','kommunen').sort((a,b)=>b.priority-a.priority);
    expect(ranked.map(r=>r.url)).toEqual(['https://ort.de/dienststellen?cat=2','https://ort.de/dienststellen?cat=3','https://ort.de/dienststellen?cat=1']);
  });
  it("keeps contacts for every audience and rejects external websites",()=>{
    for(const dataset of ['kommunen','fachbetriebe','presse','versorger'] as const){
      const links=contactLinks('<a href="/kontakt">Kontakt</a><a href="/team">Unser Team</a><a href="https://agentur.de/team">Agenturteam</a>','https://ort.de/','ort.de',dataset);
      expect(links).toHaveLength(2);
    }
  });
  it("does not let press articles outrank the actual press office",()=>{
    expect(contactLinkPriority('https://ort.de/aktuelles/nachrichten/123.Klimaschutz.html','Klimaschutz gestartet','kommunen')).toBeLessThan(contactLinkPriority('https://ort.de/presse','Pressestelle','kommunen'));
  });
  it("extracts obfuscated addresses with department evidence from the local text",()=>{
    const rows=contactCandidates('<p>Stabsstelle Klima- und Umweltschutz: klima [at] ort [dot] de</p><p>Redaktion redaktion @medium.de</p>','https://ort.de/kontakt','ort.de');
    expect(rows).toEqual(expect.arrayContaining([expect.objectContaining({email:'klima@ort.de',departments:['climate-environment']}),expect.objectContaining({email:'redaktion@medium.de',relation:'unconfirmed',departments:['editorial']})]));
  });
  it("does not borrow department labels from a whole-page navigation",()=>{
    const rows=contactCandidates('<div><nav>Klimaschutz</nav>'+('placeholder '.repeat(100))+'<a href="mailto:info@ort.de">Mail</a></div>','https://ort.de/','ort.de');
    expect(rows[0].departments).toEqual([]);
  });
});
