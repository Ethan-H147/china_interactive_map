// Runs the real-browser scenarios one browser at a time.
// Usage: node scripts/browser/run.mjs [file-or-scenario filter...]
// Each *.test.mjs exports an array of {name, options, run(page, base)}. A scenario fails
// on any assertion, page exception, console error or failed request.
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {launch,startServer} from './harness.mjs';

const dir=path.dirname(fileURLToPath(import.meta.url)),filters=process.argv.slice(2);
const files=fs.readdirSync(dir).filter(f=>f.endsWith('.test.mjs')).sort();
const server=await startServer(),results=[];
for(const file of files){
 const scenarios=(await import(pathToFileURL(path.join(dir,file)))).default;
 for(const scenario of scenarios){
  const label=file.replace('.test.mjs','')+' › '+scenario.name;
  if(filters.length&&!filters.some(f=>label.includes(f)))continue;
  const started=Date.now(),page=await launch(scenario.options);
  try{
   await scenario.run(page,server.url);
   const problems=[...page.problems,...page.failures.map(f=>'request failed: '+f)];
   if(problems.length)throw Error(problems.slice(0,5).join('\n   '));
   results.push({label,ok:true,ms:Date.now()-started});console.log('✓',label,`(${((Date.now()-started)/1000).toFixed(1)} s)`);
  }catch(error){
   let shot='';try{shot=await page.screenshot(label);}catch{}
   const context=[...page.problems,...page.failures.map(f=>'request failed: '+f)].filter(p=>!error.message.includes(p)).slice(0,5);
   results.push({label,ok:false});console.log('✗',label,'\n  ',error.message,context.length?'\n   page: '+context.join('\n   page: '):'',shot?'\n   screenshot: '+shot:'');
  }finally{await page.close();}
 }
}
await server.close();
const failed=results.filter(r=>!r.ok);
console.log(`\nBrowser scenarios: ${results.length-failed.length}/${results.length} passed.`);
process.exit(failed.length||!results.length?1:0);
