const normalize=value=>String(value||'').normalize('NFD').replace(/\p{M}/gu,'').trim().toLowerCase().replace(/\s+/g,' ');
export function createPlaceSearch(records,{compare=()=>0}={}){
 // Normalize once when a country is opened, rather than thousands of island
 // aliases on every keystroke. The index stores names, never coordinates.
 const entries=records.map(record=>({record,names:[...new Set([record.en,record.local,...(record.aliases||[]),...(record.parentName?[record.en+' '+record.parentName,record.parentName+' '+record.en]:[])].map(normalize).filter(Boolean))]}));
 return query=>{const q=normalize(query);if(!q)return [];return entries.filter(entry=>entry.names.some(name=>name.includes(q))).map(entry=>({record:entry.record,rank:entry.names.includes(q)?0:entry.names.some(name=>name.startsWith(q))?1:2})).sort((a,b)=>a.rank-b.rank||Number(a.record.level===0)-Number(b.record.level===0)||a.record.level-b.record.level||compare(a.record,b.record)||a.record.en.localeCompare(b.record.en)).slice(0,20).map(item=>item.record);};
}
