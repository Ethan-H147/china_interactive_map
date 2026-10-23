import fs from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {load} from './geo-index.mjs';
import {command,fc,sharedBorders,geographicBounds} from './build-regional-dataset.mjs';
import {geographicAreaKm2} from './geographic-area.mjs';
import {source} from './fetch-central-europe.mjs';
import {readOds} from './read-ods.mjs';
import {save} from './central-europe-frontiers.mjs';
export async function prepareCentralOptionalViews(){
 const raw=JSON.parse(source('austria-local.geojson')),regions=fc(raw.features.filter(f=>f.properties.g_id[0]==='9').map(f=>({...f,properties:{id:'AT-V-'+f.properties.g_id}}))),points=(await command(regions,'-points inner')).features,tables=readOds(source('austria-population.ods')),people=new Map(tables.Political_districts.filter(r=>r[0]===900).map(r=>[String(r[1]),r[3]]));
 const records=regions.features.map((f,i)=>{const code=f.properties.id.slice(5),original=raw.features.find(r=>r.properties.g_id===code).properties;return{id:f.properties.id,code,level:2,parent:'AT-B-9',thematic:'city-boroughs',hasStatistics:true,en:original.g_name.replace(/^Wien-/,'Vienna · '),local:original.g_name,localLang:'de',kind:'Municipal borough',kindLocal:'Gemeindebezirk',aliases:[original.g_name.replace(/^Wien-/,''),'Vienna '+(+code.slice(0,3)-900),'Wien '+(+code.slice(0,3)-900)],center:points[i].geometry.coordinates,bounds:geographicBounds(f.geometry),areaKm2:geographicAreaKm2(f.geometry),statusNote:'One of Vienna’s 23 municipal boroughs. Vienna remains one municipality, statutory city and federal state.'};});
 const base='dist/data/europe/austria/',data={regions,boundaries:sharedBorders(regions)},file='city-boroughs/AT-B-9.bin';save(base+file,data);save(base+'city-boroughs/catalogue.bin',{records,chunks:{'AT-B-9':{file,level:2,count:23,bytes:fs.statSync(base+file).size,decodedBytes:gunzipSync(fs.readFileSync(base+file)).length}}});
 fs.writeFileSync(base+'city-boroughs/sources.json',JSON.stringify({retrieved:'2026-10-22',coverage:'All 23 Vienna municipal boroughs from Statistics Austria, 1 January 2026; separate from the single city municipality.',sources:[{title:'Statistics Austria · current municipal and borough geometry',url:'https://data.statistik.gv.at/web/meta.jsp?dataset=OGDEXT_GEM_1',license:'CC BY 4.0'}]},null,2)+'\n');
 const statistics=load(base+'statistics.json');for(const r of records){const p=people.get(r.code.slice(0,3));if(!Number.isFinite(p))throw Error('Vienna borough population '+r.code);statistics.regions['austria:'+r.id]={name:r.en,parent:r.parent,population:{value:p,year:2026,date:'2026-01-01',source:'statisticsAustria',periodLabel:'2026 resident population'},area:{value:r.areaKm2,unit:'km²',year:2026,method:'mapped',label:'Mapped administrative area',source:'boundaryArea'},note:r.statusNote};}fs.writeFileSync(base+'statistics.json',JSON.stringify(statistics));console.log('Vienna optional view: 23 boroughs with official population.');
}
if(process.argv[1]?.endsWith('central-europe-optional.mjs'))await prepareCentralOptionalViews();
