import fs from 'node:fs';
import {createHash} from 'node:crypto';
import assert from 'node:assert/strict';
const root=new URL('../dist/',import.meta.url);
const manifest=JSON.parse(fs.readFileSync(new URL('data/manifest.json',root)));
let counts={province:0,prefecture:0,district:0,directCounty:0},vertices=0;
for(const s of manifest.sources){
  const bytes=fs.readFileSync(new URL(s.file,root));
  assert.equal(createHash('sha256').update(bytes).digest('hex'),s.sha256,`Source changed: ${s.file}`);
  if(!s.file.endsWith('.json'))continue;
  const d=JSON.parse(bytes);assert.equal(d.type,'FeatureCollection');
  const seen=new Set();
  for(const f of d.features){
    const p=f.properties;
    if(p.adcode&&p.name){assert(!seen.has(p.adcode));seen.add(p.adcode);const key=p.level==='province'?'province':p.level==='district'?'district':String(p.adcode).slice(2,4)==='90'?'directCounty':'prefecture';counts[key]++;}
    function walk(x){if(typeof x[0]==='number'){assert(x.length>=2&&x.every(Number.isFinite));assert(x[0]>=-180&&x[0]<=180&&x[1]>=-90&&x[1]<=90);vertices++;}else for(const c of x)walk(c);}
    walk(f.geometry.coordinates);
  }
}
assert.deepEqual(counts,{province:34,prefecture:333,district:112,directCounty:30});
const html=fs.readFileSync(new URL('index.html',root),'utf8');
for(const match of html.matchAll(/(?:src|href)="([^"#]+)"/g)){const p=match[1];if(!/^(https?:|data:)/.test(p))assert(fs.existsSync(new URL(p,root)),`Missing ${p}`);}
console.log(JSON.stringify({counts,vertices,sourceFilesVerified:manifest.sources.length,coverageGap:'Taiwan internal divisions unavailable from provider'}));
