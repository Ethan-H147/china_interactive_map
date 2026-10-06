const normalize=value=>String(value??'').normalize('NFD').replace(/\p{M}/gu,'').trim().toLowerCase();
export function searchRank(query,names){
 const q=normalize(query),values=names.map(normalize).filter(Boolean);
 if(!q)return 0;
 if(values.some(v=>v===q))return 0;
 if(values.some(v=>v.startsWith(q)))return 1;
 return 2;
}
