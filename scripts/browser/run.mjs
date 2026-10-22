// Runs the real-browser scenarios one browser at a time.
// Usage: node scripts/browser/run.mjs [--shard=i/n] [file-or-scenario filter...]
// --shard=i/n runs one complete partition, balanced by measured browser duration.
// New scenarios receive a default estimate and always remain in the required suite.
// Each *.test.mjs exports an array of {name, options, run(page, base)}. A scenario fails
// on any assertion, page exception, console error or failed request.
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {launch,startServer} from './harness.mjs';
import {shardScenarios} from './shard-scenarios.mjs';

const dir=path.dirname(fileURLToPath(import.meta.url)),args=process.argv.slice(2);
const shardArg=args.find(a=>a.startsWith('--shard=')),filters=args.filter(a=>a!==shardArg);
const [shard,shards]=shardArg?shardArg.slice(8).split('/').map(Number):[1,1];
if(!(shards>=1&&shard>=1&&shard<=shards))throw Error('Invalid --shard: '+shardArg);
let active=null;
const files=fs.readdirSync(dir).filter(f=>f.endsWith('.test.mjs')).sort();
const server=await startServer(),results=[];
const reportFile='artifacts/stability/browser-results-'+(filters.join('-').replace(/[^a-zA-Z0-9-]/g,'-').slice(0,120)||'all')+'-'+shard+'-of-'+shards+'.json';
function checkpoint(complete=false){fs.mkdirSync('artifacts/stability',{recursive:true});fs.writeFileSync(reportFile,JSON.stringify({at:new Date().toISOString(),filters,shard,shards,complete,active,results},null,2)+'\n');}
const scenarios=[];
for(const file of files)for(const scenario of (await import(pathToFileURL(path.join(dir,file)))).default){
 const label=file.replace('.test.mjs','')+' › '+scenario.name;
 if(!filters.length||filters.some(f=>label.includes(f)))scenarios.push({label,scenario});
}
const estimates=JSON.parse(fs.readFileSync(path.join(dir,'scenario-durations.json'))).milliseconds;
const planned=shardScenarios(scenarios,shards,estimates)[shard-1];
console.log('Assigned',planned.entries.length,'scenarios; prior estimated work',Math.round(planned.milliseconds/6000)/10,'minutes.');
for(const {label,scenario} of planned.entries){
  const started=Date.now();active={label,startedAt:new Date(started).toISOString()};checkpoint();const page=await launch(scenario.options);
  try{
   await scenario.run(page,server.url);
   const problems=[...page.problems,...page.failures.map(f=>'request failed: '+f)];
   if(problems.length)throw Error(problems.slice(0,5).join('\n   '));
   results.push({label,ok:true,ms:Date.now()-started});console.log('✓',label,`(${((Date.now()-started)/1000).toFixed(1)} s)`);
  }catch(error){
   let shot='';try{shot=await page.screenshot(label);}catch{}
   const context=[...page.problems,...page.failures.map(f=>'request failed: '+f)].filter(p=>!error.message.includes(p)).slice(0,5);
   results.push({label,ok:false,ms:Date.now()-started,error:error.message});console.log('✗',label,'\n  ',error.message,context.length?'\n   page: '+context.join('\n   page: '):'',shot?'\n   screenshot: '+shot:'');
  }finally{await page.close();active=null;checkpoint();}
}
await server.close();
checkpoint(true);
const failed=results.filter(r=>!r.ok);
console.log(`\nBrowser scenarios${shards>1?` (shard ${shard}/${shards})`:''}: ${results.length-failed.length}/${results.length} passed.`);
process.exit(failed.length||!results.length?1:0);
