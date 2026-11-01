import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {launch} from './harness.mjs';
import {cloudflareAssetPlan} from '../cloudflare-asset-plan.mjs';
const base=process.argv[2]||'http://127.0.0.1:8787',version=execFileSync('git',['-c','safe.directory='+process.cwd(),'rev-parse','HEAD'],{encoding:'utf8'}).trim(),{redirects}=cloudflareAssetPlan('dist',version);
const source=await fetch(base+'/data/world-land.bin',{redirect:'manual'});assert.equal(source.status,302);assert.equal(source.headers.get('location'),redirects.get('data/world-land.bin'));
const alias=[...redirects].find(([from,to])=>from.startsWith('vendor/')&&to.startsWith('/'));assert(alias,'A duplicate flag URL remains available');
const redirected=await fetch(base+'/'+alias[0],{redirect:'manual'});assert.equal(redirected.status,302);assert.equal(new URL(redirected.headers.get('location'),base).pathname,alias[1]);
const image=await fetch(base+'/'+alias[0]);assert(image.ok);assert.equal(createHash('sha256').update(Buffer.from(await image.arrayBuffer())).digest('hex'),createHash('sha256').update(fs.readFileSync('dist/'+alias[0])).digest('hex'),'Redirected flag bytes are unchanged');
for(const width of [1280,390]){
 const p=await launch({width,height:960,mobile:width===390});
 try{
  await p.open(base,'#china');
  assert(p.requests.some(url=>url.includes('/data/compact/world-land.bin')),'The map loads its compact world source');
  assert(!p.requests.some(url=>new URL(url).pathname==='/data/world-land.bin'),'The runtime does not request the retained oversized source');
  for(const country of ['brazil','canada','japan']){
   assert(await p.evaluate('changeAtlas('+JSON.stringify(country)+',false)'));await p.settle();await p.waitFor('AtlasRenderPipeline.snapshot().phase==="ready"');
   assert.equal(await p.evaluate('AtlasCountryMemory.snapshot().active'),country);assert(await p.evaluate('map.queryRenderedFeatures().some(f=>f.layer.type==="fill")'));assert(await p.evaluate('mapScene.assertOrder()'));
  }
  assert(!p.requests.some(url=>url.startsWith('https://raw.githubusercontent.com/')),'Normal country rendering stays on local runtime assets');
  assert.equal(p.problems.length,0,p.problems.join('\n'));assert.equal(p.failures.length,0,p.failures.join('\n'));
  console.log('Cloudflare preview '+width+': compact world source, country fills, scoped loading and redirected flag artwork passed.');
 }finally{await p.close();}
}
