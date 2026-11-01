import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {assetIgnoreText,auditCloudflareAssets,maxAssetBytes} from './cloudflare-assets.mjs';
import {cloudflareAssetPlan} from './cloudflare-asset-plan.mjs';
import {createHash} from 'node:crypto';
import {compactFiles} from '../dist/compact-files.mjs';
import {compactUrl} from '../dist/geo-pack.mjs';
const version='a'.repeat(40),{omitted,retained,redirects}=cloudflareAssetPlan('dist',version),report=auditCloudflareAssets('dist',omitted);
const hash=file=>createHash('sha256').update(fs.readFileSync('dist/'+file)).digest('hex');
for(const [from,to]of redirects){assert(omitted.has(from));if(to.startsWith('/')){assert(!omitted.has(to.slice(1)));assert.equal(path.extname(from),path.extname(to));assert.equal(hash(from),hash(to.slice(1)),'Alias retains identical bytes: '+from);}else{assert(retained.has(from));assert.equal(to,'https://raw.githubusercontent.com/Ethan-H147/china_interactive_map/'+version+'/dist/'+from);}}

assert(omitted.has('data/world-land.bin'));assert(!omitted.has('data/compact/world-land.bin'));
assert.equal(compactUrl('data/world-land.bin'),'data/compact/world-land.bin');
for(const file of compactFiles){assert(omitted.has('data/'+file));assert(fs.existsSync('dist/data/compact/'+file),'Runtime compact copy retained: '+file);assert(!omitted.has('data/compact/'+file)||redirects.get('data/compact/'+file)?.startsWith('/'),'Compact URL is available directly or through an identical local asset');}
const html=fs.readFileSync('dist/index.html','utf8');for(const id of ['first-preloads','later-preloads']){const match=html.match(new RegExp('id="'+id+'">([^<]+)'));const parsed=JSON.parse(match[1]),files=Array.isArray(parsed)?parsed:Object.values(parsed).flat();for(const file of files){assert(!omitted.has(file)||redirects.get(file)?.startsWith('/'),'Preload must stay local: '+file);assert(fs.existsSync('dist/'+file));}}
assert(assetIgnoreText(omitted).includes('/data/world-land.bin\n'));assert.throws(()=>assetIgnoreText(new Set(['../outside.bin'])));
fs.mkdirSync('artifacts',{recursive:true});
const artifactRoot=fs.realpathSync('artifacts'),fixture=fs.mkdtempSync(path.join(artifactRoot,'cloudflare-asset-check-'));
try{
 const asset=path.join(fixture,'test.bin');fs.writeFileSync(asset,'');fs.truncateSync(asset,maxAssetBytes);
 assert.equal(auditCloudflareAssets(fixture,new Set()).files,1,'Exactly 25 MiB is allowed');
 fs.truncateSync(asset,maxAssetBytes+1);assert.throws(()=>auditCloudflareAssets(fixture,new Set()),/25 MiB/,'One byte over the limit fails');
 assert.equal(auditCloudflareAssets(fixture,new Set(['test.bin'])).files,0,'Retained input is not uploaded');
 fs.truncateSync(asset,1);assert.throws(()=>auditCloudflareAssets(fixture,new Set(),{maximumFiles:0}),/asset count/);
}finally{assert(path.dirname(fixture)===artifactRoot&&path.basename(fixture).startsWith('cloudflare-asset-check-'));fs.unlinkSync(path.join(fixture,'test.bin'));fs.rmdirSync(fixture);}
console.log('Cloudflare runtime assets: '+JSON.stringify(report));
