import fs from 'node:fs';
import assert from 'node:assert/strict';
import {gzipSync} from 'node:zlib';
import {createHash} from 'node:crypto';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
import {load,polygons,landIndex,lineIndex} from './geo-index.mjs';
import {settlementDotZooms,nameKey} from '../dist/settlement-layer.mjs';
import {extractMexicoLocalities} from './extract-mexico-localities.mjs';
import {buildMexicoLocalityStream} from './build-mexico-locality-stream.mjs';

export function decimalDegrees(value){const parts=String(value).match(/(\d+)\D+(\d+)\D+([\d.]+)\D+([NSEW])/);assert(parts,'Valid INEGI DMS coordinate: '+value);return +((+parts[1]+ +parts[2]/60+ +parts[3]/3600)*(/[WS]/.test(parts[4])?-1:1)).toFixed(6);}
export async function prepareMexicoLocalities(){
 const source='scripts/boundary-sources/mexico-localities/',root='dist/data/europe/mexico/';
 if(!fs.existsSync(source+'localities-2020.json.gz'))await extractMexicoLocalities();
 const manifest=load(source+'manifest.json'),rows=load(source+'localities-2020.json.gz'),catalogue=load(root+'catalogue.bin'),units=new Map(catalogue.records.map(r=>[r.id,r]));
 assert.equal(createHash('sha256').update(fs.readFileSync(source+'localities-2020.json.gz')).digest('hex'),manifest.retainedSha256);
 const records=[],audit={snapshot:2020,sourceLocalities:rows.length,geographicMatches:0,changedMunicipality:[],outsideMappedLand:[],excluded:[],populationTotal:0},byState=new Map();
 for(const row of rows){const state=row.ENTIDAD;if(!byState.has(state))byState.set(state,[]);byState.get(state).push(row);}
 for(const [state,stateRows]of byState){
  const municipal=catalogue.records.filter(r=>r.level===2&&r.code.startsWith(state)),parent=municipal[0]?.parent;assert(parent,'State '+state);
  const cell=.25,grid=new Map(),shapes=load(root+catalogue.chunks[parent].file).regions.features.map(f=>{
   const rings=polygons(f.geometry).flat(),box=[Infinity,Infinity,-Infinity,-Infinity];for(const ring of rings)for(const [x,y]of ring){box[0]=Math.min(box[0],x);box[1]=Math.min(box[1],y);box[2]=Math.max(box[2],x);box[3]=Math.max(box[3],y);}return {id:f.properties.id,rings,inside:landIndex(rings),box};
  }),byId=new Map(shapes.map(s=>[s.id,s]));
  for(const shape of shapes){const b=shape.box;for(let x=Math.floor(b[0]/cell);x<=Math.floor(b[2]/cell);x++)for(let y=Math.floor(b[1]/cell);y<=Math.floor(b[3]/cell);y++){const key=x+','+y;if(!grid.has(key))grid.set(key,[]);grid.get(key).push(shape);}}
  for(const row of stateRows){
   const code=row.ENTIDAD+row.MUN+row.LOC,id='MX-LOC-'+code,population=Number(row.POBTOT);
   if(!Number.isSafeInteger(population)||population<=0){audit.excluded.push({code,name:row.NOM_LOC,reason:'No positive published locality population'});continue;}
   const center=[decimalDegrees(row.LONGITUD),decimalDegrees(row.LATITUD)],nominal='MX-MUN-'+row.ENTIDAD+row.MUN,candidates=grid.get(Math.floor(center[0]/cell)+','+Math.floor(center[1]/cell))||[];
   const shape=(byId.get(nominal)?.inside(center)?byId.get(nominal):candidates.find(s=>s.inside(center)));let parentId;
   if(shape){parentId=shape.id;audit.geographicMatches++;if(parentId!==nominal)audit.changedMunicipality.push({code,name:row.NOM_LOC,censusMunicipality:nominal,mappedMunicipality:parentId});}
   else{assert(units.has(nominal),'Census parent must exist when reference point falls outside mapped land: '+code);parentId=nominal;const original=byId.get(nominal);original.distance??=lineIndex(original.rings);const metres=original.distance(center);audit.outsideMappedLand.push({code,name:row.NOM_LOC,parentId,distanceMetres:Number.isFinite(metres)?Math.round(metres):null,method:'Retained official 2020 census municipality link; reference coordinates unchanged'});}
   const municipality=units.get(parentId),province=units.get(municipality.parent),minzoom=Math.max(4,Math.min(15,5.8+2.4*Math.log10(100000/population)));
   records.push({id,en:row.NOM_LOC,kind:population>=2500?'City / town':'Village / hamlet',center,parentId,provinceId:province.id,parentName:municipality.en,aliases:[row.NOM_LOC+' '+province.en,code],minzoom:+minzoom.toFixed(2),population:{value:population}});audit.populationTotal+=population;
  }
  console.log('Mexico localities',state,stateRows.length);
 }
 records.sort((a,b)=>b.population.value-a.population.value||a.id.localeCompare(b.id));
 // Hide an identically named administrative label only while its locality label
 // is visible. The municipality remains independently searchable/selectable.
 const replaced=new Set();for(const r of records)if(!replaced.has(r.parentId)&&nameKey(r.en)===nameKey(units.get(r.parentId).en)){r.replacesLabel=r.parentId;replaced.add(r.parentId);}
 const zooms=settlementDotZooms(records);for(const r of records)r.dotzoom=zooms.get(r.id);
 const metricDefaults={population:{year:2020,date:'2020-03-15',method:'census',source:manifest.documentation,periodLabel:'2020 census',scope:'Census locality',scopeNote:'Population of the named census locality, distinct from its municipality and metropolitan area.'}},recordDefaults={localLang:'es',provenance:{population:manifest.title,coordinates:manifest.url,coordinateMethod:'Published 2020 INEGI census locality reference point, converted from DMS to decimal degrees',municipalityMethod:'Current mapped municipality containing the reference point; official census municipality link retained for points outside mapped land',license:manifest.license}};
 const data={version:1,country:'mexico',snapshot:2020,recordDefaults,metricDefaults,records,sources:[{title:manifest.title,url:manifest.url,license:manifest.license}],coverage:{localities:records.length,excluded:audit.excluded.length,sourceLocalities:rows.length,populationTotal:audit.populationTotal},selection:'All inhabited localities in INEGI’s 2020 national ITER census extract, without a population cutoff. These are census localities, not metropolitan areas. Coordinates and population retain their 2020 scope; municipal navigation uses current mapped boundaries where available.'};
 fs.writeFileSync(root+'settlements.bin',gzipSync(JSON.stringify(data),{level:9}));buildMexicoLocalityStream(data,catalogue);if(!fs.existsSync(root+'place-names-flags.json'))fs.writeFileSync(root+'place-names-flags.json',JSON.stringify({places:{}})+'\n');fs.writeFileSync(source+'coverage-audit.json',JSON.stringify(audit,null,2)+'\n');
 const sources=load(root+'sources.json');sources.settlementCoverage=data.selection;sources.settlementSources=data.sources;sources.settlementCounts=data.coverage;fs.writeFileSync(root+'sources.json',JSON.stringify(sources,null,2)+'\n');console.log('Mexico settlement coverage',data.coverage,'changed parents',audit.changedMunicipality.length,'outside mapped land',audit.outsideMappedLand.length);return data;
}
if(process.argv[1]&&import.meta.url===pathToFileURL(path.resolve(process.argv[1])).href)await prepareMexicoLocalities();
