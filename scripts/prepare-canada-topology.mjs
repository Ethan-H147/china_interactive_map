import {normalizeCensusRings} from './canada-source-rings.mjs';
import fs from 'node:fs';
import {createRequire} from 'node:module';
import {createHash} from 'node:crypto';
import {load,write,fc} from './us-geography.mjs';
import {directory,provinces} from './fetch-canada-local.mjs';
const require=createRequire(import.meta.url),mapshaper=require('mapshaper');
export async function prepareCanadaTopology(){
 const output='artifacts/canada-source/national-topology',pins=load('scripts/canada-local-sources.json'),settings={city:.00015,town:.0005,rural:.003,thresholds:[20,2000],method:'dp',version:2},signature=createHash('sha256').update(JSON.stringify({files:pins.files,settings})).digest('hex');
 fs.mkdirSync(output,{recursive:true});if(fs.existsSync(output+'/ready.json')&&load(output+'/ready.json').signature===signature)return output;
 let datasets=[];const normalizedHoles=[];
 for(const pr of Object.keys(provinces)){
  let raw=load(directory+'/municipal-'+pr+'.geojson.gz');
  for(const f of raw.features){const normalized=normalizeCensusRings(f.geometry);f.geometry=normalized.geometry;if(normalized.repaired)normalizedHoles.push({code:String(f.properties.CSDUID),holes:normalized.repaired});f.properties.detailInterval=f.properties.AREA_SQKM>2000?settings.rural:f.properties.AREA_SQKM>20?settings.town:settings.city;}
  datasets.push(mapshaper.internal.importGeoJSON(raw,{}));raw=null;global.gc?.();console.log('Imported national topology',pr);
 }
 const dataset=mapshaper.internal.mergeDatasets(datasets);dataset.layers=mapshaper.cmd.mergeLayers(dataset.layers,{force:true});datasets=null;global.gc?.();
 mapshaper.internal.buildTopology(dataset);console.log('National shared topology built');global.gc?.();
 mapshaper.cmd.variableSimplify(dataset.layers,dataset,{method:'dp',planar:true,variable:true,interval:'detailInterval',keep_shapes:true});
 const exported=mapshaper.internal.exportGeoJSON(dataset,{precision:.000001}),data=JSON.parse(exported[0].content);
 if(data.features.length!==5161)throw Error('National simplification lost a local unit');
 for(const pr of Object.keys(provinces)){const features=data.features.filter(f=>String(f.properties.CSDUID).startsWith(pr));for(const f of features)delete f.properties.detailInterval;write(output+'/'+pr+'.bin',fc(features));}
 write(output+'/ready.json',{signature,settings,units:data.features.length,normalizedHoles});console.log('National topology cached; exact shared borders preserved');return output;
}
if(process.argv[1]?.endsWith('prepare-canada-topology.mjs'))await prepareCanadaTopology();
