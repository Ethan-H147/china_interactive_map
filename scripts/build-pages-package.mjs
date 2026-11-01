// Publish compact runtime data without altering the retained build/source tree.
import fs from 'node:fs';import path from 'node:path';import assert from 'node:assert/strict';
import {gzipSync,gunzipSync} from 'node:zlib';import {createHash} from 'node:crypto';
import {encodeGeo,decodeGeo} from '../dist/geo-pack.mjs';import {assertNearGeo} from './geo-compare.mjs';
import {publishedAssetPolicy} from './published-asset-policy.mjs';
const root=path.resolve('dist'),out=path.resolve('artifacts/pages'),report={files:0,sourceBytes:0,publishedBytes:0,packed:[],omitted:[]};
assert(out.startsWith(path.resolve('artifacts')+path.sep)&&out!==root);
const {omitted,buildOnly}=publishedAssetPolicy();
const sha=b=>createHash('sha256').update(b).digest('hex');
function walk(dir){for(const e of fs.readdirSync(dir,{withFileTypes:true})){const source=path.join(dir,e.name);if(e.isDirectory()){walk(source);continue;}const rel=path.relative(root,source).replaceAll('\\','/'),bytes=fs.readFileSync(source);report.sourceBytes+=bytes.length;
 if(omitted.has(rel)){report.omitted.push({file:rel,bytes:bytes.length,reason:buildOnly.has(rel)?'Retained build input; runtime uses scoped sources':rel.endsWith('/all.bin')?'Configuration loads first.bin and per-parent chunks instead':'Configuration loads this level from all.bin instead'});continue;}
 let payload=bytes;
 if(rel.startsWith('data/europe/')&&rel.endsWith('.bin')){const raw=gunzipSync(bytes);if(raw[0]===123){const value=JSON.parse(raw),packed=encodeGeo(value),compressed=gzipSync(packed,{level:9});if(compressed.length<bytes.length){assertNearGeo(decodeGeo(packed),value,rel);payload=compressed;report.packed.push({file:rel,sourceSha256:sha(bytes),publishedSha256:sha(payload),sourceBytes:bytes.length,publishedBytes:payload.length});}}}
 const target=path.join(out,rel);fs.mkdirSync(path.dirname(target),{recursive:true});fs.writeFileSync(target,payload);report.files++;report.publishedBytes+=payload.length;
 if(e.name==='catalogue.bin')console.log(rel,Math.round(report.publishedBytes/1048576)+' MiB written');
}}
// Remove only the dedicated generated package; never mutate dist or retained source caches.
if(fs.existsSync(out))fs.rmSync(out,{recursive:true,force:true});walk(root);
fs.writeFileSync('artifacts/pages-package-report.json',JSON.stringify(report,null,2)+'\n');
assert(report.publishedBytes<1_000_000_000,'Pages package must stay below the 1 GB published-site limit: '+report.publishedBytes);
console.log('Pages package:',report.files,'files,',Math.round(report.sourceBytes/1048576),'→',Math.round(report.publishedBytes/1048576),'MiB;',report.packed.length,'verified compact files,',report.omitted.length,'duplicate bundle inputs omitted.');
