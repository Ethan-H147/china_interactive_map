import fs from 'node:fs';
import assert from 'node:assert/strict';
import {fc} from './build-regional-dataset.mjs';
import {provinceOutline} from './western-province-seams.mjs';
import {selectFrontierArc} from './frontier-arcs.mjs';
import {replaceOutlineArc} from './replace-outline-arc.mjs';
import {polygons,lineIndex} from './geo-index.mjs';

// The retained Langfang outline supplies the shared arcs around its northern
// exclave and southern component. Beijing supplies the two connecting Tianjin
// arcs. Replace complete runs rather than switching surveys at every small gap.
export async function reconcileLangfangFeatures(features){
 const references=JSON.parse(fs.readFileSync(new URL('boundary-sources/langfang/reference-arcs.json',import.meta.url)));
 const langfang=features.find(f=>f.properties.adcode===131000),referenceDistance=lineIndex(polygons(langfang.geometry).flat());
 for(const r of references.filter(r=>r.reference===131000))assert(r.path.every(p=>referenceDistance(p)<1),'Langfang source outline changed; review retained shared arcs');
 const changed=new Map(),reports=[];
 for(const r of references){
  const own=features.filter(f=>f.properties.provinceCode===r.code).map(f=>changed.get(f.properties.adcode)||f),path=selectFrontierArc(provinceOutline(own),r.path).path;
  const result=await replaceOutlineArc(fc(own),path,r.path,2000,{precision:null});
  for(const f of result.regions.features)changed.set(f.properties.adcode,f);
  reports.push({alignedProvince:r.code,reference:r.reference,component:r.component,canonical:r.path,runs:result.runs,maxEndpointDisplacementMetres:result.maxEndpointDisplacementMetres});
 }
 return {features:features.map(f=>changed.get(f.properties.adcode)||f),reports};
}
