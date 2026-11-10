
const fields={scopeLabel:'scope_label',poolHash:'pool_hash',elapsedMs:'elapsed_ms',fullRound:'full_round',finishedAt:'finished_at'};
const columns=['id','country','level','mode','scope','scopeLabel','poolHash','total','correct','hints','reveals','elapsedMs','completed','fullRound','finishedAt'];
export const quizRow=(a,userId)=>Object.fromEntries([['user_id',userId],...columns.map(k=>[fields[k]||k,a[k]])]);
export const quizAttempt=row=>Object.fromEntries(columns.map(k=>[k,k==='finishedAt'?new Date(row.finished_at).toISOString():row[fields[k]||k]]));

// All reads and writes use bounded, account-scoped database functions.
export async function requestSupabaseQuizRecords({url,key,token,userId,method='GET',body,cursor,fetcher=fetch}){
 const rpc=async(name,args)=>{
  const endpoint=new URL(url);endpoint.pathname=endpoint.pathname.replace(/\/quiz_attempts$/,'/rpc/'+name);endpoint.search='';
  const response=await fetcher(endpoint.href,{method:'POST',cache:'no-store',signal:AbortSignal.timeout(20000),headers:{apikey:key,Authorization:'Bearer '+token,'Content-Type':'application/json'},body:JSON.stringify(args)});
  if(!response.ok){let detail;try{detail=await response.json();}catch{}const error=Error(detail?.code==='PGRST202'?'Quiz history needs its database update before syncing. Your unsynced rounds remain on this device.':detail?.message||'Quiz records could not sync');error.status=response.status;error.code=detail?.code;error.retryAfter=Math.max(1,Number(response.headers.get('Retry-After')||detail?.hint)||60);throw error;}
  return response.json();
 };
 if(method==='DELETE'){if(!/^[0-9a-f-]{36}$/i.test(body?.id||''))throw Error('Invalid round ID');return rpc('quiz_undo_v2',{p_id:body.id});}
 if(method==='POST'){
  const attempts=body?.attempts;if(!Array.isArray(attempts)||!attempts.length||attempts.length>10)throw Error('Supply up to ten quiz results');
  if(!body.streamId||!Number.isSafeInteger(body.sequence)||body.sequence<1)throw Error('Missing durable quiz upload sequence');
  const result=await rpc('quiz_submit_v2',{p_stream_id:body.streamId,p_sequence:body.sequence,p_attempts:attempts.map(a=>quizRow(a,userId))});
  if(!Array.isArray(result.accepted)||attempts.some(a=>!result.accepted.includes(a.id)))throw Error('Some saved rounds could not be verified');return result;
 }
 if(method!=='GET')throw Error('Unsupported quiz request');
 let at=null,id=null;if(cursor){const parsed=JSON.parse(cursor);if(!Array.isArray(parsed)||parsed.length!==2||!Number.isFinite(Date.parse(parsed[0]))||!/^[0-9a-f-]{36}$/i.test(parsed[1]))throw Error('Invalid history cursor');[at,id]=parsed;}
 const result=await rpc('quiz_snapshot_v2',{p_before_at:at,p_before_id:id,p_include_summary:!cursor});
 return {...result,recent:result.recent.map(quizAttempt)};
}
