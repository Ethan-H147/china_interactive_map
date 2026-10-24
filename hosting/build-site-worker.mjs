import fs from 'node:fs';
import path from 'node:path';
import {execFileSync} from 'node:child_process';
const [repo,commit,output]=process.argv.slice(2);if(!path.isAbsolute(repo||'')||!/^[a-f0-9]{40}$/.test(commit||'')||!path.isAbsolute(output||''))throw Error('Supply the atlas checkout, exact tested commit, and hosting checkout.');
const git=(...args)=>execFileSync('git',['-c','safe.directory='+repo,'-C',repo,...args],{encoding:'utf8',maxBuffer:20e6}).trim();
const source=file=>git('show',commit+':'+file),files=git('ls-tree','-r','--name-only',commit,'--','dist/').split('\n').map(f=>f.slice(5)).sort();
const manifest=JSON.parse(fs.readFileSync(path.join(output,'.openai/hosting.json'),'utf8'));if(manifest.project_id!=='appgprj_6abff9c77d188191af91ea92a6326799')throw Error('Unexpected Site identity');
let worker=source('hosting/worker.mjs');if(!worker.includes('export default {async fetch(request,env,ctx){'))throw Error('Inspect the static Worker before updating it');
worker=worker.replace(/export const sourceCommit="[a-f0-9]+"/,'export const sourceCommit='+JSON.stringify(commit)).replace(/^const files=new Set\(\[.*\]\);$/m,'const files=new Set('+JSON.stringify(files)+');');
const api=source('hosting/quiz-api.mjs').replace(/^export /gm,'');worker=worker.replace('export default {async fetch(request,env,ctx){',api+'\nexport default {async fetch(request,env,ctx){\n const quizResponse=await handleQuizRequest(request,env);if(quizResponse)return quizResponse;');
fs.writeFileSync(path.join(output,'worker/index.js'),worker+'\n');
fs.writeFileSync(path.join(output,'.openai/hosting.json'),JSON.stringify({...manifest,d1:'DB',r2:manifest.r2??null},null,2)+'\n');
const migrationFiles=git('ls-tree','-r','--name-only',commit,'--','hosting/drizzle/').split('\n');for(const file of migrationFiles){const dest=path.join(output,file.replace(/^hosting\//,'')),content=source(file)+'\n';fs.mkdirSync(path.dirname(dest),{recursive:true});if(fs.existsSync(dest)&&fs.readFileSync(dest,'utf8').trim()!==content.trim())throw Error('Do not overwrite an existing migration: '+file);fs.writeFileSync(dest,content);}
const provenance=JSON.parse(fs.readFileSync(path.join(output,'.openai/upstream-source.json'),'utf8'));Object.assign(provenance,{commit,files:files.length,runtimeTree:git('rev-parse',commit+':dist'),quizRecords:'Private D1 records; Supabase Auth verifies ownership. Static assets remain pinned to the tested commit.'});fs.writeFileSync(path.join(output,'.openai/upstream-source.json'),JSON.stringify(provenance,null,2)+'\n');
console.log(JSON.stringify({commit,files:files.length,database:'DB',migrations:migrationFiles.length}));
