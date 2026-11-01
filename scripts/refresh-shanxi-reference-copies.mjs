import fs from 'node:fs';import {gzipSync,gunzipSync} from 'node:zlib';import {createHash} from 'node:crypto';import {encodeGeo} from '../dist/geo-pack.mjs';
const hash=b=>createHash('sha256').update(b).digest('hex'),file='china-context.bin',text=gunzipSync(fs.readFileSync('dist/data/'+file)).toString();
fs.writeFileSync('dist/data/compact/'+file,gzipSync(encodeGeo(JSON.parse(text),{source:hash(text)}),{level:9}));
const pin='scripts/boundary-sources/major-lake-cutouts/checks.json',checks=JSON.parse(fs.readFileSync(pin));
for(const r of checks.boundaryReference)if(r.file==='dist/data/china-mobile/province-boundaries.bin'||r.file.startsWith('dist/data/display-boundaries.')){r.sha256=hash(fs.readFileSync(r.file));r.baselineNote='Updated by the separately authorized Shanxi–Shaanxi/Henan seam repair. Retained Shanxi source, no outer land loss; lake masks remain paint-only.';}
fs.writeFileSync(pin,JSON.stringify(checks,null,2)+'\n');
