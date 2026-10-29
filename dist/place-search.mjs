import {SEARCH_LIMIT,normalizeSearch as normalize} from './interaction-policy.mjs';
export function createPlaceSearch(records,{compare=()=>0,rankGroup=()=>0}={}){
 // Search metadata contains names, never polygon coordinates.
 const entries=records.map(record=>({record,names:[...new Set([record.en,record.local,...(record.aliases||[]),...(record.parentName?[record.en+' '+record.parentName,record.parentName+' '+record.en]:[])].map(normalize).filter(Boolean))]}));
 const order=(a,b)=>a.rank-b.rank||a.group-b.group||Number(a.record.level===0)-Number(b.record.level===0)||a.record.level-b.record.level||compare(a.record,b.record)||a.record.en.localeCompare(b.record.en);
 // Retain all candidates for refinement, but rank only the twenty visible
 // results. Common queries no longer sort tens of thousands of records.
 let previous='',matches=entries;
 return query=>{
  const q=normalize(query);if(!q){previous='';matches=entries;return [];}
  matches=(q.startsWith(previous)?matches:entries).filter(entry=>entry.names.some(name=>name.includes(q)));previous=q;
  const top=[];
  for(const entry of matches){
   const row={record:entry.record,group:rankGroup(entry.record,q),rank:entry.names.includes(q)?0:entry.names.some(name=>name.startsWith(q))?1:2};
   if(top.length===SEARCH_LIMIT&&order(row,top[SEARCH_LIMIT-1])>=0)continue;
   let lo=0,hi=top.length;
   while(lo<hi){const mid=(lo+hi)>>>1;if(order(top[mid],row)<=0)lo=mid+1;else hi=mid;}
   top.splice(lo,0,row);if(top.length>SEARCH_LIMIT)top.pop();
  }
  return top.map(item=>item.record);
 };
}
