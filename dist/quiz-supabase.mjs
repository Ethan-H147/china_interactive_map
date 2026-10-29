import {summarizeQuizAttempts} from './quiz-records-core.mjs';

const fields={scopeLabel:'scope_label',poolHash:'pool_hash',elapsedMs:'elapsed_ms',fullRound:'full_round',finishedAt:'finished_at'};
const columns=['id','country','level','mode','scope','scopeLabel','poolHash','total','correct','hints','reveals','elapsedMs','completed','fullRound','finishedAt'];
export const quizRow=(a,userId)=>Object.fromEntries([['user_id',userId],...columns.map(k=>[fields[k]||k,a[k]])]);
export const quizAttempt=row=>Object.fromEntries(columns.map(k=>[k,k==='finishedAt'?new Date(row.finished_at).toISOString():row[fields[k]||k]]));

// The signed-in user's token and database RLS enforce ownership independently.
// Ignore duplicate UUIDs: retries never update or delete an existing result.
export async function requestSupabaseQuizRecords({url,key,token,userId,method='GET',body,cursor,fetcher=fetch}){
 const headers={apikey:key,Authorization:'Bearer '+token};
 const request=async(query,options={})=>{
  const endpoint=new URL(url);for(const [k,v]of Object.entries(query))endpoint.searchParams.set(k,v);
  const response=await fetcher(endpoint.href,{cache:'no-store',signal:AbortSignal.timeout(20000),...options,headers:{...headers,...options.headers}});
  if(!response.ok){let detail;try{detail=await response.json();}catch{}const error=Error(detail?.message||'Quiz records could not sync');error.status=response.status;error.code=detail?.code;throw error;}
  const text=await response.text();return text?JSON.parse(text):null;
 };
 if(method==='POST'){
  const attempts=body?.attempts;if(!Array.isArray(attempts)||!attempts.length||attempts.length>10)throw Error('Supply up to ten quiz results');
  for(const a of attempts)if(!/^[0-9a-f-]{36}$/i.test(a.id))throw Error('Invalid saved round ID');
  await request({on_conflict:'user_id,id'},{method:'POST',headers:{'Content-Type':'application/json',Prefer:'resolution=ignore-duplicates,return=minimal'},body:JSON.stringify(attempts.map(a=>quizRow(a,userId)))});
  // Read back all IDs, including duplicates acknowledged by an earlier retry.
  const rows=await request({select:'id',user_id:'eq.'+userId,id:'in.('+attempts.map(a=>a.id).join(',')+')'});
  const accepted=rows.map(r=>r.id);if(attempts.some(a=>!accepted.includes(a.id)))throw Error('Some saved rounds could not be verified');
  return {accepted};
 }
 if(method!=='GET')throw Error('Unsupported quiz request');
 // Fetch bounded pages so history and medal totals include more than the API row limit.
 const all=[];let offset=0;
 for(;;){const rows=await request({select:'*',user_id:'eq.'+userId,order:'finished_at.desc,id.desc',limit:'500',offset:String(offset)});if(!rows.length)break;all.push(...rows.map(quizAttempt));offset+=rows.length;}
 const unique=[...new Map(all.map(a=>[a.id,a])).values()];
 const sorted=unique.sort((a,b)=>b.finishedAt.localeCompare(a.finishedAt)||b.id.localeCompare(a.id));
 let start=0;if(cursor){const [at,id]=JSON.parse(cursor);start=sorted.findIndex(a=>a.finishedAt<at||a.finishedAt===at&&a.id<id);if(start<0)start=sorted.length;}
 const recent=sorted.slice(start,start+25),last=recent.at(-1);
 return {...(!cursor?summarizeQuizAttempts(sorted):{}),recent,nextCursor:start+25<sorted.length?JSON.stringify([last.finishedAt,last.id]):null};
}
