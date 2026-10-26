import fs from 'node:fs';
import {prepareCostaRicaPanamaStatistics} from './prepare-costa-rica-panama-statistics.mjs';
import assert from 'node:assert/strict';
import {gzipSync} from 'node:zlib';
import {source,root} from './fetch-costa-rica-panama.mjs';
import {load,linesOf} from './geo-index.mjs';
import {fc,command,buildRegionalDataset} from './build-regional-dataset.mjs';
import {joinReferencePaths,selectFrontierArc} from './frontier-arcs.mjs';
import {alignArc} from './korean-frontiers.mjs';
import {lineData} from '../dist/adaptive-lines.mjs';
const manifest=load(root+'manifest.json'),refs=load('scripts/boundary-sources/nordics/ne-borders.json.gz'),guide=pair=>{const paths=joinReferencePaths(linesOf(fc(refs.features.filter(f=>pair.every(iso=>[f.properties.ADM0_A3_L,f.properties.ADM0_A3_R].includes(iso))))));if(paths.length>1){assert(pair.includes('CRI')&&pair.includes('NIC'));paths.sort((a,b)=>b.length-a.length);const joined=paths[0].slice();for(const part of paths.slice(1)){const a=part[0],b=part.at(-1),end=joined.at(-1),distance=p=>Math.hypot(p[0]-end[0],p[1]-end[1]);assert(Math.min(distance(a),distance(b))<.03,'Adjacent delta reference parts');joined.push(...(distance(a)<distance(b)?part:part.slice().reverse()));}return joined;}return paths[0];};
const unitsCR=new Map(),cr=JSON.parse(source('cri-districts.geojson'));
for(const f of cr.features){const p=f.properties,province='CR-P-'+p.cod_prov,canton='CR-C-'+p.cod_canton,id='CR-D-'+p.cod_distr;unitsCR.set(province,{id:province,code:String(p.cod_prov),level:1,parent:null,en:p.nom_prov,local:p.nom_prov,localLang:'es',kind:'Province',aliases:[p.nom_prov+' province']});unitsCR.set(canton,{id:canton,code:String(p.cod_canton),level:2,parent:province,en:p.nom_cant,local:p.nom_cant,localLang:'es',kind:'Canton',aliases:[p.nom_cant+' canton',p.nom_cant+', '+p.nom_prov]});unitsCR.set(id,{id,code:p.cod_distr,level:3,parent:canton,en:p.nom_distr,local:p.nom_distr,localLang:'es',kind:'District',aliases:[p.nom_distr+', '+p.nom_cant],...(p.cod_distr==='60110'?{focusOnEntry:true,aliases:['Isla del Coco','Cocos Island']}:{})});f.properties={id};}
assert.equal(cr.features.length,492);assert.equal(unitsCR.size,7+84+492);
const unitsPA=new Map(),panSource=JSON.parse(source('pan-correctimientos.geojson')),pan=fc(panSource.features.filter(f=>f.properties.uso==='Tierra')),mapping=[];
for(const f of pan.features){const p=f.properties,province='PA-P-'+p.cod_prov,group='PA-D-'+p.cod_dist,isGuna=p.cod_prov==='10',isNaso=p.cod_dist==='0105',id=isNaso?group:'PA-C-'+p.cod_corr;const comarcaProvince=+p.cod_prov>=10&&+p.cod_prov<=12;
 unitsPA.set(province,{id:province,code:p.cod_prov,level:1,parent:null,en:p.nomb_prov.trim(),local:p.nomb_prov.trim(),localLang:'es',kind:comarcaProvince?'Comarca':'Province',aliases:p.cod_prov==='10'?['Guna Yala','Kuna Yala']:[]});
 // ANATI identifies the district covering Guna Yala as a cartographic placeholder.
 // Its four real corregimientos attach directly to the comarca instead.
 if(!isGuna)unitsPA.set(group,{id:group,code:p.cod_dist,level:2,parent:province,en:p.nomb_dist.trim(),local:p.nomb_dist.trim(),localLang:'es',kind:isNaso?'Comarca':'District',aliases:isNaso?['Naso Tjër Di','Naso Tjer Di']: [p.nomb_dist.trim()+', '+p.nomb_prov.trim()],...(isNaso?{note:'ANATI maps this comarca as a district-level unit. Its three internal corregimiento boundaries are not supplied because the publisher reports inconsistent limits.'}:{})});
 if(!isNaso)unitsPA.set(id,{id,code:p.cod_corr,level:isGuna?2:3,parent:isGuna?province:group,en:p.nomb_corr.trim(),local:p.nomb_corr.trim(),localLang:'es',kind:/Madugand|Wargand/i.test(p.nomb_corr)?'Comarca':'Corregimiento',aliases:[p.nomb_corr.trim()+', '+p.nomb_dist.trim(),p.nomb_corr.trim()+', '+p.nomb_prov.trim()]});
 f.properties={id};mapping.push({sourceCode:p.cod_corr,id,level:unitsPA.get(id).level});
}
assert.equal(pan.features.length,699);assert.equal(new Set(pan.features.map(f=>f.properties.id)).size,699);
let paBottom=await command(pan,'-clean gap-fill-area=0 -simplify dp interval=.00008 planar keep-shapes -clean gap-fill-area=0'),crBottom=await command(cr,'-clean gap-fill-area=0 -simplify dp interval=.00008 planar keep-shapes -clean gap-fill-area=0');
const colombia=load('dist/data/europe/colombia/context.bin'),colPan=selectFrontierArc(colombia,guide(['COL','PAN'])).path;paBottom=(await alignArc(paBottom,colPan,{maxDistance:20000,maxSelectionMetres:20000,maxDeviationMetres:12,coastalTrimMetres:2500})).regions;
const paOutline=await command(paBottom,'-dissolve2'),crPan=selectFrontierArc(paOutline,guide(['CRI','PAN'])).path;crBottom=(await alignArc(crBottom,crPan,{maxDistance:10000,maxSelectionMetres:15000,maxDeviationMetres:3,coastalTrimMetres:2000})).regions;
const crNic=selectFrontierArc(await command(crBottom,'-dissolve2'),guide(['CRI','NIC'])).path;
const save=(file,data)=>fs.writeFileSync(file,gzipSync(JSON.stringify(data),{level:9}));
for(const [country,units,bottom,coverage,levels]of [
 ['costa-rica',unitsCR,crBottom,'All 7 provinces, 84 cantons and 492 districts in the retained IGN/ARESEP geometry snapshot. The national 2026 register lists 494 districts; the newer 494-district division is not represented in this dated map. Isla del Coco remains a district of Puntarenas and has a focused island entry. Area is calculated from mapped land. Population and GDP are not inferred.',['Provinces','Cantons','Districts']],
 ['panama',unitsPA,paBottom,'All 699 land areas in the official ANATI 2025 edition, using 2024 boundaries. The source has 10 provinces and 3 province-level comarcas. Naso Tjër Di is retained as its published district-level comarca without invented internal divisions. The cartographic Guna Yala district placeholder is omitted; its four real corregimientos attach directly to their comarca. Source water polygons remain water. Area is mapped land; population and GDP are not inferred.',['Provinces & comarcas','Districts & direct corregimientos','Corregimientos']]
]){
 assert.equal(bottom.features.length,country==='panama'?699:492);
 const second=await command(fc(bottom.features.map(f=>({...f,properties:{id:units.get(f.properties.id).level===2?f.properties.id:units.get(f.properties.id).parent}}))),'-dissolve2 id'),first=await command(fc(second.features.map(f=>({...f,properties:{id:units.get(f.properties.id).parent}}))),'-dissolve2 id'),third=fc(bottom.features.filter(f=>units.get(f.properties.id).level===3));
 await buildRegionalDataset({country,units,byLevel:{1:first,2:second,3:third},sources:manifest.files,coverage,year:2024,retrieved:manifest.retrieved,levels});save('dist/data/europe/'+country+'/political.bin',first);
}
save('dist/data/europe/costa-rica/international.bin',lineData(fc([{type:'Feature',properties:{countries:['costa-rica'],pair:'CRI-NIC'},geometry:{type:'LineString',coordinates:crNic}}])));
save('dist/data/europe/panama/international.bin',lineData(fc([{type:'Feature',properties:{countries:['panama'],pair:'CRI-PAN'},geometry:{type:'LineString',coordinates:crPan}}])));
// Colombia already owns COL–PAN in its detailed international source.
assert(load('dist/data/europe/colombia/international.bin').features.some(f=>f.properties.pair==='COL-PAN'));
fs.writeFileSync(root+'display-mapping.json',JSON.stringify({panama:mapping,frontiers:{colombiaPanama:colPan,costaRicaPanama:crPan,costaRicaNicaragua:crNic}},null,2)+'\n');
const flags=load('dist/data/europe/flag-sources.json'),images=load('dist/data/flag-images.json'),prefix='export const nationalFlagImages=',text=fs.readFileSync('dist/national-flags.mjs','utf8'),national=JSON.parse(text.slice(text.indexOf(prefix)+prefix.length).trim().replace(/;$/,''));
for(const [country,code]of [['costa-rica','cr'],['panama','pa']]){const name='flag-'+code+'.svg',bytes=source(name),svg=bytes.toString(),box=svg.match(/viewBox=["']([^"']+)/)?.[1].split(/\s+/).map(Number),width=box?.[2]||+svg.match(/width=["']([\d.]+)/)?.[1],height=box?.[3]||+svg.match(/height=["']([\d.]+)/)?.[1];assert(width>0&&height>0);const pin=manifest.files[name],flag={file:'vendor/'+name,full:'vendor/'+name,width,height,source:pin.url,page:pin.url,credit:pin.provider,license:pin.license,sha256:pin.sha256};fs.writeFileSync('dist/vendor/'+name,bytes);flags.flags[country]=flag;images[flag.file]=flag;national[flag.file]=flag;}
fs.writeFileSync('dist/data/europe/flag-sources.json',JSON.stringify(flags,null,2)+'\n');fs.writeFileSync('dist/data/flag-images.json',JSON.stringify(images));fs.writeFileSync('dist/national-flags.mjs','// Original national artwork and dimensions, independent of thumbnail proportions.\n'+prefix+JSON.stringify(national)+';\n');
prepareCostaRicaPanamaStatistics();
console.log('Built Costa Rica and Panama with retained official snapshots, scoped subdivisions, Spanish names, national flags and single-owner shared borders.');
