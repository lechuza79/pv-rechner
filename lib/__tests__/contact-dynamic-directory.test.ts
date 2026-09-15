import { expect, it } from "vitest";
import { contactContentGap, contactLinks } from "../contact-discovery";
import { crawlContacts } from "../../scripts/lib/contact-crawl";

const shell = `<article>${'Municipal climate information. '.repeat(100)}</article><div><integration-bim id="staff" result-url="/klima/employee-list.html?i4xpath=published&amp;h=3"></integration-bim><div id="staff-result"></div><div id="staff-loading" class="loading is-active">Suchergebnisse werden geladen</div><div class="no-results">Keine Mitarbeitende gefunden.</div></div>`;
it("recognizes an incomplete staff component even within a long readable page", () => {
  expect(contactContentGap(shell)).toBe('dynamic-directory');
  expect(contactLinks(shell,'https://ort.de/klima/','ort.de','kommunen')).toContainEqual({url:'https://ort.de/klima/employee-list.html?h=3&i4xpath=published',priority:150});
  expect(contactLinks(shell.replace('/klima/employee-list.html','https://foreign.de/employee-list.html'),'https://ort.de/','ort.de','kommunen')).toEqual([]);
});
it("does not treat an unrelated component or an already populated staff list as incomplete", () => {
  expect(contactContentGap(shell.replace('employee-list.html','news-list.html'))).toBe(null);
  const populated=shell.replace('<div id="staff-result"></div>','<div id="staff-result"><p>Climate manager contact@ort.de</p></div>').replace('loading is-active','loading');
  expect(contactContentGap(populated)).toBe(null);
});
it("the shared crawler reads the published staff fragment without executing scripts", async () => {
  const result=await crawlContacts({website:'https://ort.de/',dataset:'kommunen',pageBudget:2,fetcher:async input=>new Response(String(input).includes('employee-list.html')?'<p>Klimaschutzmanagerin Anna Beispiel, klima@ort.de</p>':shell,{headers:{'content-type':'text/html'}})});
  expect(result.pages.map(p=>p.status)).toEqual(['needs-rendering','read']);
  expect(result.candidates.map(c=>c.email)).toContain('klima@ort.de');
  expect(result.status).toBe('partial');
});
