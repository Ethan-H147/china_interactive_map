import assert from 'node:assert/strict';
// Assign every scenario exactly once. Unmeasured/new scenarios still run.
export function shardScenarios(scenarios,count,estimates={}){
 assert(Number.isInteger(count)&&count>0,'Positive integer shard count');
 const bins=Array.from({length:count},()=>({milliseconds:0,entries:[]}));
 if(count===1)return [{milliseconds:scenarios.reduce((n,s)=>n+(estimates[s.label]||30000),0),entries:[...scenarios]}];
 const ordered=scenarios.map((entry,index)=>({entry,index,ms:Number.isFinite(estimates[entry.label])&&estimates[entry.label]>0?estimates[entry.label]:30000})).sort((a,b)=>b.ms-a.ms||a.index-b.index);
 for(const item of ordered){let target=bins[0];for(const bin of bins)if(bin.milliseconds<target.milliseconds)target=bin;target.entries.push(item);target.milliseconds+=item.ms;}
 return bins.map(bin=>({milliseconds:bin.milliseconds,entries:bin.entries.sort((a,b)=>a.index-b.index).map(x=>x.entry)}));
}
