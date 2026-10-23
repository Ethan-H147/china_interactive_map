// Refresh packed runtime assets without changing their authoritative geometry.
import fs from 'node:fs';
import path from 'node:path';
import {gzipSync,gunzipSync} from 'node:zlib';
import {createHash} from 'node:crypto';
import {compactSources} from './build-compact.mjs';
import {encodeGeo} from '../dist/geo-pack.mjs';
import {build} from './build-context-coverage.mjs';
const present=compactSources.filter(f=>fs.existsSync('dist/data/'+f)),empty=[];
await build();
for(const file of present){const text=gunzipSync(fs.readFileSync('dist/data/'+file)).toString(),data=JSON.parse(text);if(data.type==='FeatureCollection'&&!data.features.length)empty.push(file);const target='dist/data/compact/'+file;fs.mkdirSync(path.dirname(target),{recursive:true});fs.writeFileSync(target,gzipSync(encodeGeo(data,{source:createHash('sha256').update(text).digest('hex')}),{level:9}));}
fs.writeFileSync('dist/compact-files.mjs','// Generated compact geometry copies.\nexport const compactFiles='+JSON.stringify(present)+';\nexport const emptyGeometryFiles='+JSON.stringify(empty)+';\n');
await import('./build-globe-overview.mjs');
