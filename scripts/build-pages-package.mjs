// Publish compact runtime data without altering the retained build/source tree.
import fs from 'node:fs';import path from 'node:path';import assert from 'node:assert/strict';
import {gzipSync,gunzipSync} from 'node:zlib';import {createHash} from 'node:crypto';
import {encodeGeo,decodeGeo} from '../dist/geo-pack.mjs';import {assertNearGeo} from './geo-compare.mjs';
import {configurations} from '../dist/europe.mjs';import {load} from './geo-index.mjs';
const root=path.resolve('dist'),out=path.resolve('artifacts/pages'),omitted=new Set(),report={files:0,sourceBytes:0,publishedBytes:0,packed:[],omitted:[]};
assert(out.startsWith(path.resolve('artifacts')+path.sep)&&out!==root);
for(const [id,c] of Object.entries(configurations)){
 const base='data/europe/'+id+'/',levels=[c.firstLabel,c.secondLabel,c.thirdLabel].filter(Boolean).length,bundled=c.loadAllSubdivisions?levels:Math.min(levels,c.bundledLevels||1),cat=load('dist/'+base+'catalogue.bin');
 if(bundled>1){omitted.add(base+'first.bin');for(const [parent,ch] of Object.entries(cat.chunks)){const level=ch.level??cat.records.find(r=>r.id===parent)?.level+1;if(level<=bundled)omitted.add(base+ch.file);}}else omitted.add(base+'all.bin');
}
const sha=b=>createHash('sha256').update(b).digest('hex');
function walk(dir){for(const e of fs.readdirSync(dir,{withFileTypes:true})){const source=path.join(dir,e.name);if(e.isDirectory()){walk(source);continue;}const rel=path.relative(root,source).replaceAll('\\','/'),bytes=fs.readFileSync(source);report.sourceBytes+=bytes.length;
 if(omitted.has(rel)){report.omitted.push({file:rel,bytes:bytes.length,reason:rel.endsWith('/all.bin')?'Configuration loads first.bin and per-parent chunks instead':'Configuration loads this level from all.bin instead'});continue;}
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
