import fs from 'node:fs';
import {gzipSync} from 'node:zlib';
import {createHash} from 'node:crypto';
import {topology} from 'topojson-server';
import {mesh} from 'topojson-client';
import {readData} from './read-data.mjs';
import {correctJiamusi} from './jiamusi-correction.mjs';

const root=new URL('../dist/data/',import.meta.url);
const data=readData('display-boundaries.json');
data.subdivisions.features=correctJiamusi(data.subdivisions.features);
const top=topology({regions:data.subdivisions}),regions=top.objects.regions;
const prefecture=g=>g.properties.level==='taiwan-region'||g.properties.level==='city'&&String(g.properties.adcode).slice(2,4)!=='90';
const same=(a,b)=>a.properties.provinceCode===b.properties.provinceCode;
data.boundaries={province:mesh(top,regions,(a,b)=>a===b||!same(a,b)),prefecture:mesh(top,regions,(a,b)=>a!==b&&same(a,b)&&(prefecture(a)||prefecture(b))),other:mesh(top,regions,(a,b)=>a!==b&&same(a,b)&&!prefecture(a)&&!prefecture(b))};
// City ownership changes, but the provincial coverage remains identical.
const serialized=Buffer.from(JSON.stringify(data)),compressed=gzipSync(serialized,{level:9}),parts=[];
for(let offset=0,index=0;offset<compressed.length;offset+=4*1024*1024,index++){
  const name='display-boundaries.'+String(index).padStart(2,'0')+'.bin';parts.push(name);
  fs.writeFileSync(new URL(name,root),compressed.subarray(offset,offset+4*1024*1024));
}
fs.writeFileSync(new URL('display-boundaries.parts.json',root),JSON.stringify({compression:'gzip',parts,compressedBytes:compressed.length,uncompressedBytes:serialized.length,sha256:createHash('sha256').update(serialized).digest('hex')},null,2));
console.log('Corrected detached Jiamusi part; provincial coverage and all other subdivisions retained.');
