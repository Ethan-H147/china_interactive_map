import fs from 'node:fs';import assert from 'node:assert/strict';import {gzipSync} from 'node:zlib';import {createHash} from 'node:crypto';import {decodeData,encodeGeo} from '../dist/geo-pack.mjs';
const files=['dist/data/europe/united-states/first.bin','dist/data/europe/united-states/history/borders.bin'],[modern,history]=await Promise.all(files.map(async f=>decodeData(fs.readFileSync(f))));
const alaska=modern.regions.features.find(f=>f.properties.id==='US-AK');assert(alaska);
const last=history.configs[history.years[2000].config],faces=last.face.flatMap((u,f)=>u===last.partOf['US-AK']?[f]:[]),ids=new Set(faces),face=faces[0];assert(faces.length);
for(const c of history.configs)for(const f of faces)assert.equal(c.face[f],c.partOf['US-AK'],'Alaska faces share the full dated ownership timeline');
const affected={faces,edges:history.arcs.features.filter(f=>ids.has(f.properties.l)||ids.has(f.properties.r)).map(f=>f.properties.a),borders:history.borders.features.filter(f=>ids.has(f.properties.face)).map(f=>f.properties.b)};
// Outer-border features may omit face metadata; identify their owning coastal
// arc by geographic bounds, confined to Alaska and the Aleutians.
for(const f of history.borders.features){const paths=f.geometry.type==='LineString'?[f.geometry.coordinates]:f.geometry.coordinates;if(paths.flat().every(p=>p[1]>50&&p[0]<-129)&&!affected.borders.includes(f.properties.b))affected.borders.push(f.properties.b);}
const inputs=Object.fromEntries(files.map(f=>[f,createHash('sha256').update(fs.readFileSync(f)).digest('hex')]));
const data={version:1,inputs,historySource:history.source.sha256,face,affected,land:{type:'FeatureCollection',features:[{type:'Feature',properties:{f:face},geometry:alaska.geometry}]},source:{method:'Alaska uses exactly the current-day US-AK land geometry in every historical configuration. Historical ownership and status remain dated; old source coast fragments are not rendered.'}};
fs.writeFileSync('dist/data/europe/united-states/history/alaska.bin',gzipSync(encodeGeo(data),{level:9}));fs.writeFileSync('dist/data/europe/united-states/history/alaska-sources.json',JSON.stringify({inputs,...data.source},null,2)+'\n');console.log('Alaska: current land replaces',faces.length,'historical faces; all',history.configs.length,'ownership configurations verified.');
