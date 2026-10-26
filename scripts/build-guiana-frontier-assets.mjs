import fs from 'node:fs';
import {gzipSync,gunzipSync} from 'node:zlib';
import {createHash} from 'node:crypto';
import {encodeGeo} from '../dist/geo-pack.mjs';
import {build as buildCoverage} from './build-context-coverage.mjs';
for(const file of ['atlas-frontiers.bin','europe/france/international.bin']){const text=gunzipSync(fs.readFileSync('dist/data/'+file)).toString();fs.writeFileSync('dist/data/compact/'+file,gzipSync(encodeGeo(JSON.parse(text),{source:createHash('sha256').update(text).digest('hex')}),{level:9}));}
await buildCoverage();await import('./build-globe-overview.mjs');await import('./build-border-previews.mjs');
