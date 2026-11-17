import assert from'node:assert/strict';import fs from'node:fs';import path from'node:path';import{gunzipSync}from'node:zlib';
export default [{name:'Kazakhstan every parent renders current district geography once',options:{width:1280,height:900},async run(p,base){
 const root=path.resolve(process.env.ATLAS_SOURCE_ROOT||'.'),cat=JSON.parse(gunzipSync(fs.readFileSync(root+'/dist/data/europe/kazakhstan/catalogue.bin'))),points=JSON.parse(fs.readFileSync(root+'/dist/data/europe/kazakhstan/settlements.json')).records;
 await p.open(base,'#kazakhstan');let sampled=0;
 for(const parent of cat.records.filter(r=>r.level===1&&cat.chunks[r.id])){
  await p.evaluate('currentAtlas().restore('+JSON.stringify(parent.id)+')');await p.evaluate('void map.fitBounds('+JSON.stringify(parent.bounds)+',{padding:{left:370,right:60,top:100,bottom:80},duration:0})');await p.settle();await p.waitFor('map.getLayer("kazakhstan-second-fill")&&map.queryRenderedFeatures({layers:["kazakhstan-second-fill"]}).length>0');
  const children=cat.records.filter(r=>r.parent===parent.id&&r.level===2);const result=await p.evaluate('('+function(children){const canvas=map.getCanvas(),results=[];for(const r of children){const q=map.project(r.center);if(q.x<352||q.y<100||q.x>canvas.clientWidth-10||q.y>canvas.clientHeight-10)continue;const ids=map.queryRenderedFeatures(q,{layers:['kazakhstan-second-fill']}).map(f=>f.properties.id);results.push({id:r.id,ids});}return results;}.toString()+')('+JSON.stringify(children)+')');assert(result.length>0,parent.id+' sampled fills');for(const row of result){assert(row.ids.includes(row.id),parent.id+' correct district under its land label '+JSON.stringify(row));sampled++;}
  assert.equal(await p.evaluate('map.getStyle().layers.filter(l=>l.id==="kazakhstan-second-fill").length'),1,'One active detail fill');assert(!p.requests.some(url=>/kazakhstan\/history|kazakhstan\/.*overlay/.test(url)),'No extra country overlay');
 }
 assert(sampled>160,'Broad rendered coverage');p.kzRendering={parents:20,landCenters:sampled,cityRecords:points.length};await p.screenshot('kazakhstan-all-parents-verified');
}}];
