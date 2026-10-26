import fs from 'node:fs';
import {unzipSync} from 'fflate';
import {createRequire} from 'node:module';
import {source} from './fetch-east-south-africa.mjs';
const require=createRequire(import.meta.url),mapshaper=require('mapshaper');
for(const level of [1,2]){
 const zip=unzipSync(source('tza-'+level+'.zip')),key=Object.keys(zip).find(k=>k.endsWith('.shp')),files=Object.fromEntries(['shp','shx','dbf','prj'].filter(ext=>zip[key.replace(/shp$/,ext)]).map(ext=>['in.'+ext,Buffer.from(zip[key.replace(/shp$/,ext)])]));
 const out=await mapshaper.applyCommands('-i in.shp -proj wgs84 -o out.json format=geojson precision=.000001',files),j=JSON.parse(out['out.json']);
 console.log('TZA',level,j.features.length,j.features.slice(0,2).map(f=>f.properties));fs.writeFileSync('artifacts/tza-level-'+level+'.json',JSON.stringify(j));
}
