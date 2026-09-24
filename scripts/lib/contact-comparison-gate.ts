import {storedMunicipalSelection} from '../../lib/contact-selection-comparison';
import {contactStateDigest,contactFindingsIndex} from './contact-state-digest';
import {readFileSync,existsSync} from 'node:fs';
import {resolve} from 'node:path';
import {hash} from './contact-workflow-store';
/** Reject absent, incomplete, stale or regressing comparisons before SMTP exists. */
export function requireContactComparison(workflow:string,reportPath:string,recipients:{organizationId:string;email:string}[]){
 const base=resolve(workflow,'..');const read=(p:string)=>JSON.parse(readFileSync(p,'utf8'));
 const report=read(reportPath),scopePath=resolve(workflow,'current-municipal-scope.json'),inventoryPath=resolve(base,'inventory.json');
 if(!report.approvedForUse||report.verdicts?.unresolved!==0||report.verdicts?.worse!==0||report.verdicts?.['not-evaluated']!==0||!(report.verdicts?.better>0)||report.lostProvenContacts!==0)throw Error('Kontaktvergleich belegt keine vollständig geprüfte Verbesserung');
 if(hash(readFileSync(scopePath))!==report.scopeDigest||hash(readFileSync(inventoryPath))!==report.inventoryDigest)throw Error('Kontaktvergleich gehört zu einem anderen Bestand');
 if(report.selectionBaseline?.kind!=='saved-contact-selection'||!report.selectionBaseline.path||hash(readFileSync(report.selectionBaseline.path))!==report.selectionBaseline.digest)throw Error('Ursprüngliche Kontaktauswahl fehlt oder wurde verändert');
 const selection=read(report.selectionBaseline.path);
 if(report.sentBaseline&&hash(readFileSync(report.sentBaseline.path))!==report.sentBaseline.digest)throw Error('Ursprüngliche Versandbelege wurden verändert');
 const scope=read(scopePath),inventory=read(inventoryPath),targets=new Map<string,any>(inventory.targets.map((t:any)=>[t.organization_id,t]));
 const findings=contactFindingsIndex(base);
 const rows=new Map<string,any>(report.rows.map((r:any)=>[r.municipalityId,r]));
 if(report.population!==scope.items.length||report.evaluated!==scope.items.length||rows.size!==scope.items.length||report.rows.length!==rows.size)throw Error('Kontaktvergleich ist unvollständig');
 for(const item of scope.items){const row=rows.get(item.currentMunicipalityId),target=targets.get(item.inventoryOrganizationId);
  if(!row||!target||!['better','equivalent'].includes(row.verdict)||row.lost?.length||row.unresolvedBaseline?.length||row.unsupportedSelected?.length||!row.current||!row.sourceChecksComplete)throw Error('Ungeklärter Kontaktvergleich');
  const oldSelection=storedMunicipalSelection(selection,item.inventoryOrganizationId);if(oldSelection===null||!row.baselineSelectionFound||JSON.stringify(oldSelection)!==JSON.stringify(row.baselineEmails)||row.candidateComparison?.lost?.length||row.sentComparison?.lost?.length)throw Error('Ursprüngliche Kontaktauswahl nicht vollständig verglichen');
  if(hash(readFileSync(target.audit.inputPath))!==row.baselineDigest||hash(readFileSync(row.recordPath))!==row.recordDigest)throw Error('Kontaktvergleich ist veraltet');
  if(row.originalAssessmentPath&&hash(readFileSync(row.originalAssessmentPath))!==row.originalAssessmentDigest)throw Error('Ursprüngliche Kontaktbewertung wurde verändert');
  const record=read(row.recordPath);if(record.stateDigest!==contactStateDigest(base,workflow,target,findings.get(target.organization_id)??[]))throw Error('Neue Kontaktbelege erfordern erneuten Vergleich');for(const source of record.sourceManifest)if(source.valid&&(!source.path||!existsSync(source.path)||hash(readFileSync(source.path))!==source.digest))throw Error('Kontaktquelle wurde verändert');
 }
 for(const recipient of recipients){const row=rows.get(recipient.organizationId);if(!row||![...(row.retained??[]),...(row.gained??[])].includes(recipient.email.toLowerCase()))throw Error('Empfänger ist nicht im geprüften Kontaktvergleich');}
 return report;
}
