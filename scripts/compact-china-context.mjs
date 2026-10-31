// Refresh the compact source whose China geometry changed, retaining other countries.
import fs from 'node:fs';
import {gzipSync,gunzipSync} from 'node:zlib';
import {createHash} from 'node:crypto';
import {encodeGeo} from '../dist/geo-pack.mjs';
const file='china-context.bin',text=gunzipSync(fs.readFileSync('dist/data/'+file)).toString('utf8');
fs.writeFileSync('dist/data/compact/'+file,gzipSync(encodeGeo(JSON.parse(text),{source:createHash('sha256').update(text).digest('hex')}),{level:9}));
console.log('Refreshed compact China context from repaired motion geometry.');
