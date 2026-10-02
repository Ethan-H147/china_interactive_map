export function candidates(layers,{scope='',includeTaiwan=true}={}){
  return layers.filter(layer=>{
    const {properties:p,geometry}=layer.feature;
    const prefecture=p.level==='city'&&String(p.adcode).slice(2,4)!=='90';
    if(!geometry||!(prefecture||p.level==='taiwan-region'))return false;
    return scope?String(p.provinceCode)===String(scope):includeTaiwan||p.provinceCode!==710000;
  });
}
export function createRound(pool,count=10,random=Math.random){
  if(!pool.length)throw new Error('This scope has no mapped prefecture-level places.');
  const questions=[...pool];
  for(let i=questions.length-1;i>0;i--){const j=Math.floor(random()*(i+1));[questions[i],questions[j]]=[questions[j],questions[i]];}
  const limit=count==='all'?pool.length:Math.min(pool.length,Math.max(1,Number(count)||10));
  return {questions:questions.slice(0,limit),eligible:new Set(pool.map(l=>l.feature.properties.adcode)),index:0,results:[],complete:false};
}
export function answer(round,code=null){
  if(round.complete||round.results[round.index])return null;
  if(code!==null&&!round.eligible.has(code))return null;
  const expected=round.questions[round.index].feature.properties.adcode;
  const result={expected,chosen:code,status:code===null?'skipped':code===expected?'correct':'incorrect'};
  round.results.push(result);return result;
}
export function advance(round){
  if(round.complete||!round.results[round.index])return false;
  if(round.index+1===round.questions.length)round.complete=true;else round.index++;
  return true;
}
export function score(round){
  return {correct:round.results.filter(r=>r.status==='correct').length,incorrect:round.results.filter(r=>r.status==='incorrect').length,skipped:round.results.filter(r=>r.status==='skipped').length,total:round.questions.length,answered:round.results.length};
}
