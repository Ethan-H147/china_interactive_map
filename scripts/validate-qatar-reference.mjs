import fs from 'node:fs';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {createHash} from 'node:crypto';
import {source,root} from './fetch-caucasus-gulf.mjs';
import {qatarWgs84,qatarDatum} from './qatar-reference.mjs';
import {load,polygons,lineIndex,landIndex,metres} from './geo-index.mjs';
import {command,fc,geographicBounds} from './build-regional-dataset.mjs';
const require=createRequire(import.meta.url),{unzipSync}=createRequire(require.resolve('mapshaper'))('fflate'),z=unzipSync(source('qat.zip')),raw=JSON.parse(Buffer.from(z.qat_admin0_geojson||z['qat_admin0.geojson'])),first=load('dist/data/europe/qatar/first.bin').regions,outline=await command(first,'-dissolve2'),edge=lineIndex(outline.features.flatMap(f=>polygons(f.geometry).flat())),report={datum:qatarDatum,controls:[]};
for(const[name,file,bounds]of [['West Bay','qatar-west-bay-osm.json',[51.525,25.311,51.544,25.327]],['Ras Laffan','qatar-ras-laffan-osm.json',[51.583,25.883,51.637,25.967]]]){
 const osm=JSON.parse(source(file)),nodes=new Map(osm.elements.filter(e=>e.type==='node').map(e=>[e.id,[e.lon,e.lat]])),coasts=osm.elements.filter(e=>e.type==='way'&&e.tags?.natural==='coastline').map(w=>w.nodes.map(id=>nodes.get(id)).filter(Boolean)),near=lineIndex(coasts),points=raw.features.flatMap(f=>polygons(f.geometry).flat(2)).filter(p=>p[0]>bounds[0]&&p[0]<bounds[2]&&p[1]>bounds[1]&&p[1]<bounds[3]);
 assert(points.length>100);const summary=values=>{values.sort((a,b)=>a-b);return{median:values[Math.floor(values.length*.5)],p90:values[Math.floor(values.length*.9)]};},before=summary(points.map(near)),after=summary(points.map(p=>near(qatarWgs84(p))));assert(after.median<before.median*.4);assert(after.median<(name==='West Bay'?5:20));assert(Math.max(...points.map(p=>edge(qatarWgs84(p))))<.3,'Displayed country outline uses the corrected coordinates at '+name);
 report.controls.push({name,bounds,vertices:points.length,source:load(root+'manifest.json').files[file],beforeMetres:before,afterMetres:after});console.log(name+': median shore residual '+before.median.toFixed(2)+'m → '+after.median.toFixed(2)+'m');
}
assert(metres(qatarWgs84([51.54,25.32]),[51.53924514618275,25.320702147464683])<.01,'Published seven-parameter operation');
const cat=load('dist/data/europe/qatar/catalogue.bin');assert.deepEqual(cat.counts,{1:8,2:90,3:781});assert(!cat.records.some(r=>r.id==='QAT004099'||r.en==='Zone 99'));
const zone99=JSON.parse(Buffer.from(z['qat_admin2.geojson'])).features.find(f=>f.properties.adm2_pcode==='QAT004099');assert.equal(polygons(zone99.geometry).length,3);assert(!JSON.parse(Buffer.from(z['qat_admin3.geojson'])).features.some(f=>f.properties.adm2_pcode==='QAT004099'));
const inside=landIndex(first.features.flatMap(f=>polygons(f.geometry).flat()));for(const p of polygons(zone99.geometry)){const b=geographicBounds({type:'Polygon',coordinates:p}),center=qatarWgs84([(b[0][0]+b[1][0])/2,(b[0][1]+b[1][1])/2]);assert(!inside(center),'Artificial source circles are excluded from Qatar land');}
assert.equal(load('dist/data/europe/qatar/statistics.json').regions['qatar:QAT006'].population.value,1186023);report.counts=cat.counts;report.excluded={id:'QAT004099',reason:'Three equal-sized artificial offshore circles with no district children; source/cartographic placeholder, excluded from administrative zones and land.'};
const original=load(root+'qatar-reference-controls.json');assert.equal(createHash('sha256').update(fs.readFileSync('dist/data/europe/bahrain/first.bin')).digest('hex'),original.bahrainFirstSha256,'Bahrain geometry is unchanged');
if(process.argv.includes('--write-report'))fs.writeFileSync('dist/data/europe/qatar/alignment-report.json',JSON.stringify(report,null,2)+'\n');
console.log('All Qatar levels retain their hierarchy; artificial Zone 99 removed; Bahrain unchanged.');
