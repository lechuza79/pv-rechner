/** Compare both inventories against the SAME current source-backed judgments. */
export function compareContactSelection(baseline:string[], selected:string[], supported:string[], complete:boolean){
 const normalized=(xs:string[])=>[...new Set(xs.map(x=>x.toLowerCase()))].sort();
 const old=normalized(baseline), next=normalized(selected), proof=new Set(normalized(supported));
 const retained=old.filter(x=>next.includes(x)&&proof.has(x));
 const gained=next.filter(x=>!old.includes(x)&&proof.has(x));
 const lost=old.filter(x=>proof.has(x)&&!next.includes(x));
 const unresolvedBaseline=old.filter(x=>!proof.has(x));
 const unsupportedSelected=next.filter(x=>!proof.has(x));
 // Missing proof is not evidence that an old address was bad.
 const verdict=lost.length?'worse':!complete||unresolvedBaseline.length||unsupportedSelected.length?'unresolved':gained.length?'better':'equivalent';
 return {verdict,retained,gained,lost,unresolvedBaseline,unsupportedSelected};
}
