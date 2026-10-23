import fs from 'node:fs';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {gzipSync} from 'node:zlib';
import {source,root} from './fetch-nigeria.mjs';
import {load,linesOf} from './geo-index.mjs';
import {buildRegionalDataset,command,fc} from './build-regional-dataset.mjs';
import {joinReferencePaths,selectFrontierArc} from './frontier-arcs.mjs';
import {lineData} from '../dist/adaptive-lines.mjs';
const require=createRequire(import.meta.url),{unzipSync}=createRequire(require.resolve('mapshaper'))('fflate');
const zip=unzipSync(source('boundaries.zip')),layer=name=>JSON.parse(Buffer.from(zip[name])),manifest=load(root+'manifest.json');
const states=layer('nga_admin1.geojson'),local=layer('nga_admin2.geojson'),units=new Map();
assert.equal(states.features.length,37);assert.equal(local.features.length,774);
const fct=states.features.find(f=>/capital|abuja/i.test(f.properties.adm1_name));assert(fct);
for(const f of states.features){const p=f.properties,id=p.adm1_pcode,isFct=id===fct.properties.adm1_pcode;units.set(id,{id,code:id,codeScheme:'OCHA COD administrative P-code',level:1,parent:null,en:isFct?'Federal Capital Territory':p.adm1_name,local:'',kind:isFct?'Federal capital territory':'State',aliases:isFct?['FCT','Abuja','FCT Abuja','Abuja Federal Capital Territory']:[p.adm1_name+' State']});}
for(const f of local.features){const p=f.properties,id=p.adm2_pcode,parent=p.adm1_pcode;assert(units.has(parent));units.set(id,{id,code:id,codeScheme:'OCHA COD administrative P-code',level:2,parent,en:p.adm2_name,local:'',kind:parent===fct.properties.adm1_pcode?'Area council':'Local government area',aliases:[p.adm2_name+' LGA',p.adm2_name+', '+units.get(parent).en]});f.properties={id,parent};}
let second=await command(local,'-clean gap-fill-area=0');
const outline=await command(second,'-dissolve'),references=load('scripts/boundary-sources/nordics/ne-borders.json.gz'),frontiers=[];
for(const neighbor of ['BEN','NER','TCD','CMR']){
 const guides=joinReferencePaths(linesOf(fc(references.features.filter(f=>['NGA',neighbor].every(code=>[f.properties.ADM0_A3_L,f.properties.ADM0_A3_R].includes(code))))));
 assert(guides.length,'Nigeria frontier reference '+neighbor);
 for(const reference of guides){const {path}=selectFrontierArc(outline,reference);frontiers.push({type:'Feature',properties:{countries:'nigeria',neighbor},geometry:{type:'LineString',coordinates:path}});}
}
const lakes=load('scripts/boundary-sources/nordics/ne-lakes.json.gz');
second=await command({'local.json':second,'lakes.json':lakes},'-erase lakes.json -clean gap-fill-area=0');
const first=await command(second,'-dissolve parent -rename-fields id=parent');
assert.equal(first.features.length,37);assert.equal(second.features.length,774);
await buildRegionalDataset({country:'nigeria',units,byLevel:{1:first,2:second},year:2019,retrieved:manifest.retrieved,levels:['States & FCT','Local government areas & area councils'],sources:manifest.files,coverage:'All 36 states and the Federal Capital Territory, with 768 local government areas and six FCT area councils (774 local units in total). OCHA COD-AB version 01, valid 17 April 2019 and reviewed 30 October 2025, from OSGOF, eHealth and UNCS. State outlines are dissolved from the same local-area geometry to keep every shared edge consistent. Inland lake water is excluded and has no shoreline stroke. The partial 714-ward layer is not offered as national coverage. Area cards are calculated from mapped land; population and economic figures are not inferred.'});
const write=(file,data)=>fs.writeFileSync('dist/data/europe/nigeria/'+file,gzipSync(JSON.stringify(data),{level:9}));
write('political.bin',first);
const waterFreeFrontiers=await command({'frontiers.json':fc(frontiers),'lakes.json':lakes},'-erase lakes.json');
write('international.bin',lineData(waterFreeFrontiers));
fs.writeFileSync('dist/vendor/flag-ng.svg',source('flag-ng.svg'));
const flags=load('dist/data/europe/flag-sources.json'),flag={file:'vendor/flag-ng.svg',full:'vendor/flag-ng.svg',width:1200,height:600,source:manifest.files['flag-ng.svg'].url,page:manifest.files['flag-ng.svg'].page,credit:'Wikimedia Commons · national flag artwork',license:'Public domain',sha256:manifest.files['flag-ng.svg'].sha256};
flags.flags.nigeria=flag;fs.writeFileSync('dist/data/europe/flag-sources.json',JSON.stringify(flags,null,2)+'\n');
// Add this original without regenerating unrelated retained flag records.
const prefix='export const nationalFlagImages=',text=fs.readFileSync('dist/national-flags.mjs','utf8'),national=JSON.parse(text.slice(text.indexOf(prefix)+prefix.length).trim().replace(/;$/,''));
national[flag.file]=flag;fs.writeFileSync('dist/national-flags.mjs','// Original national artwork and dimensions, independent of thumbnail proportions.\n'+prefix+JSON.stringify(national)+';\n');
const images=load('dist/data/flag-images.json');images[flag.file]=flag;fs.writeFileSync('dist/data/flag-images.json',JSON.stringify(images));
console.log('Nigeria built with 37 state/FCT units, 774 local units and its national flag.');
