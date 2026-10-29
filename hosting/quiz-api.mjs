const quizOrigins=new Set(['https://china-boundary-atlas.hys0423.chatgpt.site','https://ethan-h147.github.io','https://china-interactive-map.huyusheng777.workers.dev']);
const quizAuthUrl='https://odenagmobrswlzkljayf.supabase.co/auth/v1/user';
const quizPublicKey='sb_publishable_P6e6nDasSVNyzSP2BgYcaw_BxX_Atsk';
function quizHeaders(origin){return {'Content-Type':'application/json','Cache-Control':'private, no-store','Vary':'Origin',...(origin?{'Access-Control-Allow-Origin':origin}:{})};}
function quizJson(value,status,origin){return new Response(JSON.stringify(value),{status,headers:quizHeaders(origin)});}
export function validateQuizAttempt(value){
 if(!value||typeof value!=='object'||Array.isArray(value))throw Error('Invalid quiz result');
 const text=(key,max,pattern)=>{const v=value[key];if(typeof v!=='string'||v.length>max||pattern&&!pattern.test(v))throw Error('Invalid '+key);return v;};
 const integer=(key,min,max)=>{const v=value[key];if(!Number.isSafeInteger(v)||v<min||v>max)throw Error('Invalid '+key);return v;};
 const id=text('id',36,/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i),country=text('country',60,/^[a-z0-9-]+$/),mode=text('mode',10,/^(find|name|identify)$/),level=integer('level',1,3),scope=text('scope',80,/^[\w-]*$/),scopeLabel=text('scopeLabel',160),poolHash=text('poolHash',32,/^[\da-f]+$/),total=integer('total',1,2000),correct=integer('correct',0,total),hints=integer('hints',0,total),reveals=integer('reveals',0,total),elapsedMs=integer('elapsedMs',0,604800000);
 if(typeof value.completed!=='boolean'||typeof value.fullRound!=='boolean')throw Error('Invalid completion');
 const at=Date.parse(value.finishedAt);if(!Number.isFinite(at)||at<Date.UTC(2020,0,1)||at>Date.now()+86400000)throw Error('Invalid result date');
 return {id,country,level,mode,scope,scopeLabel,poolHash,total,correct,hints,reveals,elapsedMs,completed:value.completed,fullRound:value.fullRound,finishedAt:new Date(at).toISOString()};
}
export async function handleQuizRequest(request,env){
 const url=new URL(request.url);if(url.pathname!=='/api/quiz-records')return null;
 const origin=request.headers.get('Origin'),allowed=!origin||quizOrigins.has(origin)||/^http:\/\/(?:127\.0\.0\.1|localhost)(?::\d{1,5})?$/.test(origin);
 if(!allowed)return quizJson({error:'Origin is not allowed'},403,null);
 if(request.method==='OPTIONS')return new Response(null,{status:204,headers:{...quizHeaders(origin),'Access-Control-Allow-Methods':'GET, POST, OPTIONS','Access-Control-Allow-Headers':'Authorization, Content-Type','Access-Control-Max-Age':'600'}});
 if(!['GET','POST'].includes(request.method))return quizJson({error:'Method not allowed'},405,origin);
 const authorization=request.headers.get('Authorization');if(!/^Bearer [\w.\-]+$/.test(authorization||'')||authorization.length>16384)return quizJson({error:'Sign in to access quiz records'},401,origin);
 let user;
 try{const auth=await fetch(quizAuthUrl,{headers:{apikey:quizPublicKey,Authorization:authorization},signal:AbortSignal.timeout(15000)});if(!auth.ok)return quizJson({error:'Your session has expired. Sign in again.'},auth.status>=500?503:401,origin);user=await auth.json();if(typeof user.id!=='string'||!user.id)return quizJson({error:'Sign in again'},401,origin);}catch{return quizJson({error:'Account service is unavailable'},503,origin);}
 if(!env.DB)return quizJson({error:'Quiz storage is unavailable'},503,origin);
 try{
  if(request.method==='POST'){
   const reader=request.body?.getReader();let bytes=0,parts=[];if(!reader)return quizJson({error:'No quiz results supplied'},400,origin);
   for(;;){const {done,value}=await reader.read();if(done)break;bytes+=value.byteLength;if(bytes>32768){await reader.cancel();return quizJson({error:'Too many quiz results in one request'},413,origin);}parts.push(value);}
   let attempts;try{const body=JSON.parse(new TextDecoder().decode(Uint8Array.from(parts.flatMap(p=>Array.from(p)))));if(!Array.isArray(body.attempts)||!body.attempts.length||body.attempts.length>10)throw Error('Supply up to ten quiz results');attempts=body.attempts.map(validateQuizAttempt);}catch(error){return quizJson({error:error.message||'Invalid quiz results'},400,origin);}
   await env.DB.batch(attempts.map(a=>env.DB.prepare('INSERT OR IGNORE INTO quiz_attempts (user_id, id, country, level, mode, scope, scope_label, pool_hash, total, correct, hints, reveals, elapsed_ms, completed, full_round, finished_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)').bind(user.id,a.id,a.country,a.level,a.mode,a.scope,a.scopeLabel,a.poolHash,a.total,a.correct,a.hints,a.reveals,a.elapsedMs,Number(a.completed),Number(a.fullRound),a.finishedAt)));
   return quizJson({accepted:attempts.map(a=>a.id)},201,origin);
  }
  let cursor;try{if(url.searchParams.has('cursor')){cursor=JSON.parse(url.searchParams.get('cursor'));if(!Array.isArray(cursor)||cursor.length!==2||typeof cursor[0]!=='string'||!Number.isFinite(Date.parse(cursor[0]))||typeof cursor[1]!=='string'||cursor[1].length>36)throw Error();}}catch{return quizJson({error:'Invalid history cursor'},400,origin);}
  const recentQuery=env.DB.prepare('SELECT id, country, level, mode, scope, scope_label AS scopeLabel, pool_hash AS poolHash, total, correct, hints, reveals, elapsed_ms AS elapsedMs, completed, full_round AS fullRound, finished_at AS finishedAt FROM quiz_attempts WHERE user_id = ?'+(cursor?' AND (finished_at < ? OR (finished_at = ? AND id < ?))':'')+' ORDER BY finished_at DESC, id DESC LIMIT 25').bind(user.id,...(cursor?[cursor[0],cursor[0],cursor[1]]:[]));
  const queries=[recentQuery];
  if(!cursor){queries.push(env.DB.prepare('SELECT COUNT(*) AS rounds, COALESCE(SUM(correct),0) AS correct, COALESCE(SUM(total),0) AS total, COALESCE(SUM(CASE WHEN completed = 1 AND correct = total AND hints = 0 AND reveals = 0 AND elapsed_ms > 0 THEN 1 ELSE 0 END),0) AS perfect, COUNT(DISTINCT country) AS countries FROM quiz_attempts WHERE user_id = ?').bind(user.id));queries.push(env.DB.prepare('SELECT country, level, mode, scope, scope_label AS scopeLabel, pool_hash AS poolHash, total, full_round AS fullRound, MAX(correct) AS bestCorrect, MAX(finished_at) AS lastPlayed, MIN(CASE WHEN completed = 1 AND correct = total AND hints = 0 AND reveals = 0 AND elapsed_ms > 0 THEN elapsed_ms END) AS fastestMs, COUNT(*) AS rounds FROM quiz_attempts WHERE user_id = ? GROUP BY country, level, mode, scope, pool_hash, total, full_round').bind(user.id));}
  const data=await env.DB.batch(queries),recent=data[0].results.map(a=>({...a,completed:!!a.completed,fullRound:!!a.fullRound})),last=recent.at(-1);
  return quizJson({recent,nextCursor:recent.length===25?JSON.stringify([last.finishedAt,last.id]):null,...(!cursor?{summary:data[1].results[0],bests:data[2].results}:{})},200,origin);
 }catch{return quizJson({error:'Quiz records could not sync. Your saved results will retry.'},503,origin);}
}
