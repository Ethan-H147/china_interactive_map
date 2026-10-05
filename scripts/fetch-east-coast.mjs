import fs from 'node:fs';
import assert from 'node:assert/strict';
import {gzipSync} from 'node:zlib';
const endpoint='https://overpass-api.de/api/interpreter';
const queries={coast:'[out:json][timeout:180];way["natural"="coastline"](29.3,120.6,32.2,123.6);out meta geom;',dishui:'[out:json][timeout:60];nwr["name"~"滴水湖|芦潮湖|Dishui",i](30.85,121.85,30.96,121.99);out meta geom;'};
fs.mkdirSync('scripts/additional-sources/east-coast',{recursive:true});
await Promise.all(Object.entries(queries).map(async([name,query])=>{
  const response=await fetch(endpoint,{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded','User-Agent':'ChinaBoundaryAtlas/1.0'},body:new URLSearchParams({data:query}),signal:AbortSignal.timeout(230000)});
  assert(response.ok,name+' download failed: '+response.status);
  const raw=Buffer.from(await response.text()),data=JSON.parse(raw);
  assert(!data.remark&&data.elements.length>(name==='coast'?100:0),'Incomplete '+name+' source');
  fs.writeFileSync('scripts/additional-sources/east-coast/osm-'+name+'.bin',gzipSync(raw,{level:9}));
  console.log({name,query,timestamp:data.osm3s.timestamp_osm_base,elements:data.elements.length});
}));
