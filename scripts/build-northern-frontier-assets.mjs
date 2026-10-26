import fs from 'node:fs';
import {gzipSync,gunzipSync} from 'node:zlib';
import {createHash} from 'node:crypto';
import {encodeGeo} from '../dist/geo-pack.mjs';
import {compactFiles} from '../dist/compact-files.mjs';
import {build as buildCoverage} from './build-context-coverage.mjs';

// Refresh only this repair's derived assets. The general compact build also
// reapplies other countries' geometry repairs, which this task does not need.
const files=['world-land.bin','atlas-frontiers.bin','europe/canada/context.bin','europe/kazakhstan/context.bin','europe/united-states/international.bin'];
for(const file of files){
 if(!compactFiles.includes(file))continue;
 const text=gunzipSync(fs.readFileSync('dist/data/'+file)).toString('utf8');
 fs.writeFileSync('dist/data/compact/'+file,gzipSync(encodeGeo(JSON.parse(text),{source:createHash('sha256').update(text).digest('hex')}),{level:9}));
 console.log('Updated compact',file);
}
await buildCoverage();
await import('./build-globe-overview.mjs');
await import('./build-border-previews.mjs');
