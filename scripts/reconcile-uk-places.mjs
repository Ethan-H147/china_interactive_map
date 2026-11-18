import assert from 'node:assert/strict';
import {metres} from './geo-index.mjs';
import {settlementDotZooms,settlementZoom} from '../dist/settlement-layer.mjs';
import {londonId} from './london-settlement.mjs';

const key=s=>String(s||'').normalize('NFD').replace(/\p{M}/gu,'').toLowerCase().replace(/&/g,'and').replace(/\bsaint\b/g,'st').replace(/[^\p{L}\p{N}]/gu,'');
const unqualified=s=>s.replace(/\s+\([^()]*\)$/,'').trim();
const unique=items=>[...new Set(items.filter(Boolean))];
const sourceKey=p=>p.source+':'+p.id;
const pointId=p=>'GB-'+p.source.toUpperCase()+'-'+p.id;
const splitNames=s=>s.split(/\s*,\s*(?:and\s+)?|\s+and\s+|\s*\/\s*/i).map(n=>n.trim()).filter(Boolean);
const kindRank=['City','Town','Town or village','Village','Hamlet','Locality','Populated place'];
const sourceRank={os:0,osni:1,geonames:2};
const roundCenter=p=>p.center.map(n=>+n.toFixed(6));
const statusSource='https://www.gov.uk/government/publications/list-of-cities/list-of-cities-html';
const niCities=new Set(['14','47','49','224','226','273']);
// These are identity-specific. Namesakes elsewhere, including Bangor in Wales, use their own sources.
const reviewedNames=new Map([
 ['osni:226',['Derry','https://build.nisra.gov.uk/en/metadata/variable?d=HOUSEHOLD&v=SETTLEMENT15']],
 ['osni:96',['Cloughey','https://www.ardsandnorthdown.gov.uk/media/1205/Cloughey-Village-Plan/pdf/75Intergrated_Village_Plan__Cloughey_v9.pdf']],
 ['osni:190',['Royal Hillsborough','https://www.gov.uk/government/news/northern-irelands-first-royal-status-awarded-to-hillsborough-village']],
 ['os:osgb4000000074542707',['St Monans','https://www.fife.gov.uk/__data/assets/pdf_file/0020/73163/List-of-all-CCs-in-Fife-19.01.26.pdf']]
]);
// Different names for the same place are matched by official area code and gazetteer ID.
// Wider geographies stay separate even when the statistical source uses a town's short name.
const equivalentAreaNames=new Map([
 ['S53000434','os:osgb4000000074541489'], // South Queensferry / Queensferry
 ['S53000007','os:osgb4000000074563335'], // Aberlour / Charlestown of Aberlour
 ['E63000876','os:osgb4000000074543386'] // Coup Green / Coupe Green
]);
const areaMembers=new Map([
 ['S53000230',['Glasgow']],['S53000485',['Alexandria']],['S53000393',['Easter Pencaitland','Wester Pencaitland']],
 ['S53000059',['Blairgowrie and Rattray']],['S53000109',['Cockenzie and Port Seton']],
 ['N11000218',['Craigavon','Aghacommon']],['N11000447',['Dunmurry']],
 ['N11000559',['Newtownabbey']],['N11000162',['Castlereagh']]
]);
const excluded=new Map([['osni:80','Carrigans, County Donegal, Ireland. The OSNI source point lies outside the UK boundary.']]);
// Reviewed OSNI / GeoNames representations of the same settlement. The original
// GeoNames positions can fall across a council boundary or beyond the local search radius.
const niEquivalents=new Map([['2642077','265'],['2650978','136'],['2651198','127'],['2642349','257'],['2642051','267'],['2653337','88']]);

function sourceName(p){
 const reviewed=reviewedNames.get(sourceKey(p));
 if(reviewed)return reviewed[0];
 if(p.source==='osni')return p.name.replace(/'S\b/g,"'s").replace(/\b(Of|And|The)\b/g,(word,_,offset)=>offset?word.toLowerCase():word);
 return p.alternateLanguage==='eng'?p.alternate:p.name;
}
function sourceKind(p){
 if(p.source==='osni'&&niCities.has(p.id))return 'City';
 return ({'Other Settlement':'Locality',Settlement:'Populated place'})[p.type]||p.type;
}
function preferred(a,b){
 return sourceRank[a.source]-sourceRank[b.source]||kindRank.indexOf(sourceKind(a))-kindRank.indexOf(sourceKind(b))||a.id.localeCompare(b.id);
}
const sourceNames=p=>unique([sourceName(p),p.name,p.alternate,...(p.aliases||[])]);
function languageForms(from,to){
 to.names={...from.names,...to.names};
 const forms=[...(to.regionalNames||[])];
 for(const incoming of from.regionalNames||[])if(!forms.some(n=>n.lang===incoming.lang&&n.text===incoming.text))forms.push(incoming);
 if(forms.length)to.regionalNames=forms;
 to.aliases=unique([...(to.aliases||[]),...forms.flatMap(n=>[n.text,...(n.aliases||[])])]);
}
function sourcePoint(sources,id,{parents,units,province,zoom}){
 const ordered=[...sources].sort(preferred),p=ordered[0],parentId=parents.get(sourceKey(p)),kind=sourceKind(p);
 const names={},language={cym:'cy',wel:'cy',gla:'gd',sco:'sco',eng:'en'};
 for(const s of ordered)for(const [code,name] of [[s.language,s.name],[s.alternateLanguage,s.alternate]])if(name&&language[code])names[language[code]]??={name};
 const record={id,en:sourceName(p),name:sourceName(p),local:p.source==='os'?p.name:sourceName(p),kind,names,
  aliases:unique(ordered.flatMap(sourceNames)),center:roundCenter(p),parentId,parentName:units.get(parentId).en,provinceId:province(parentId),
  minzoom:kind==='City'?6:zoom[p.type],provenance:{coordinates:{os:'OS Open Names, OSGB36 transformed to WGS84',osni:'OSNI place-name point',geonames:'GeoNames populated-place point'}[p.source],
   gazetteer:ordered.map(g=>({source:g.source,id:g.id,type:g.type}))}};
 if(reviewedNames.has(sourceKey(p)))record.provenance.name=reviewedNames.get(sourceKey(p))[1];
 if(p.source==='osni'&&niCities.has(p.id))record.provenance.cityStatus=statusSource;
 return record;
}
function areaFor(old,small){
 const code=old.provenance.code||old.provenance.census?.code;
 assert(code,'Missing census geography for '+old.id);
 const entry=small.get(code),name=entry?.name||old.en,metric={...old.population};
 const isParish=/^(Civil parish|Community)/.test(metric.scope);
 const displayName=code==='N11000218'?'Craigavon Urban Area including Aghacommon':name;
 const label=isParish?(code.startsWith('W')?'Community population':'Civil parish population'):metric.scope.startsWith('Built-up')?'Built-up area population':'Statistical settlement population';
 // The legacy importer appended this sentence when it gave a joint total to one component.
 metric.label=label;metric.scopeNote=metric.scopeNote?.replace(/\s*This count covers the whole of .+\.$/,'').replace(/;\s*/g,'. ');
 return {id:'GB-S-'+code,code,en:displayName,sourceName:old.provenance.census?.name||old.provenance.censusName||name,
  center:entry?.center||old.center,parentId:old.parentId,provinceId:old.provinceId,
  kind:isParish?(code.startsWith('W')?'Community':'Civil parish'):metric.scope.startsWith('Built-up')?'Built-up area':'Statistical settlement',
  population:metric,provenance:{population:old.provenance.population,code},members:[]};
}
function namesIndex(points,sources){
 const index=new Map();
 for(const point of points)for(const n of unique([point.en,point.local,...Object.values(point.names||{}).map(v=>v.name),...point.provenance.gazetteer.map(g=>sources.get(sourceKey(g))?.name)])){
  const k=key(n);if(!index.has(k))index.set(k,new Set());index.get(k).add(point);
 }
 return index;
}
function nearby(index,name,area,radius){
 return [...(index.get(key(unqualified(name)))||[])].filter(p=>p.provinceId===area.provinceId||p.parentId===area.parentId||metres(p.center,area.center)<3000)
  .map(p=>({p,d:metres(p.center,area.center)})).filter(v=>v.d<=radius).sort((a,b)=>a.d-b.d);
}
function choose(candidates){
 if(candidates.length===1)return candidates[0].p;
 if(candidates.length>1&&candidates[0].d*4<candidates[1].d)return candidates[0].p;
}

export function reconcileUKPlaces(data,{places,parents,container,province,units,smallCensus,review,zoom,populationZoom}){
 const original=data.records,oldZooms=settlementDotZooms(original),sources=new Map(places.map(p=>[sourceKey(p),p]));
 const oldById=new Map(original.map(r=>[r.id,r])),audits=new Map(),pointInputs=[],sourceTargets=new Map(),pointMap=new Map(),areas=[],aliases={...data.selectionAliases};
 const small=new Map([...smallCensus.settlements,...smallCensus.parishes].map(s=>[s.code,s]));
 const observations=new Map(),oldPoints=new Map(),areaForSource=new Map([['osni:198','GB-S-N11000105']]);
 const reviewedAreas=new Map(review.areaTests.map(test=>[test.code,test]));
 const areaIds=new Set();
 for(const old of original){
  const audit={id:old.id,name:old.en,targets:[],flags:[]};audits.set(old.id,audit);
  if(oldZooms.get(old.id)-settlementZoom(old)>1)audit.flags.push('label-before-dot');
  if(oldZooms.get(old.id)>21)audit.flags.push('crowded-source-coordinate');
  if(old.id===londonId){pointMap.set(old.id,old);continue;}
  const area=old.population?areaFor(old,small):null;
  if(area)observations.set(old.id,area);
  const parts=new Map();
  for(const ref of old.provenance?.gazetteer||[]){
   const k=sourceKey(ref),p=sources.get(k);assert(p,k);
   if(excluded.has(k)){audit.flags.push('outside-UK');audit.reason=excluded.get(k);continue;}
   if(areaForSource.has(k)){sourceTargets.set(k,areaForSource.get(k));continue;}
   const n=key(sourceName(p));
   if(!parts.has(n))parts.set(n,[]);parts.get(n).push(p);
  }
  const anchorGroups=[...parts.values()];
  for(const group of anchorGroups){
   group.sort(preferred);
   if(group.filter(s=>s.source==='os').length>1){
    audit.flags.push('multiple-gazetteer-anchors');
    audit.anchors=group.map(s=>({sourceId:sourceKey(s),center:roundCenter(s)}));
   }
   const matchesOld=key(unqualified(old.en))===key(sourceName(group[0]))||group.some(s=>s.source==='os'&&sourceNames(s).some(n=>key(n)===key(unqualified(old.en))));
   const keepId=group.some(s=>pointId(s)===old.id)||area&&area.id===old.id&&matchesOld&&!areaMembers.has(area.code);
   pointInputs.push({old,group,id:keepId?old.id:pointId(group[0])});
  }
 }
 // OSNI and GeoNames can both describe the same named place, including when a
 // statistical record previously stole one of the two gazetteer identities.
 const niIndex=new Map();
 for(const input of pointInputs.filter(i=>i.group.some(s=>s.source==='osni'))){
  const osni=input.group.find(s=>s.source==='osni');
  for(const n of unique([sourceName(osni),osni.name]).map(key)){
   if(!niIndex.has(n))niIndex.set(n,new Set());niIndex.get(n).add(input);
  }
 }
 const absorbed=new Map();
 for(const input of pointInputs.filter(i=>i.group.every(s=>s.source==='geonames'))){
  const s=input.group[0],osniId=niEquivalents.get(s.id);
  const matches=[...(niIndex.get(key(s.name))||[])].filter(i=>osniId?i.group.some(p=>p.source==='osni'&&p.id===osniId):parents.get(sourceKey(i.group[0]))===parents.get(sourceKey(s))&&metres(i.group[0].center,s.center)<=3000);
  if(matches.length!==1)continue;
  const target=matches[0];target.group.push(...input.group);absorbed.set(input,target);
  if(input.id.startsWith('GB-S-')&&!target.id.startsWith('GB-S-'))target.id=input.id;
 }
 for(const input of pointInputs){
  const target=absorbed.get(input)||input;
  if(!pointMap.has(target.id))pointMap.set(target.id,sourcePoint(target.group,target.id,{parents,units,province,zoom}));
  const point=pointMap.get(target.id);
  for(const p of input.group)sourceTargets.set(sourceKey(p),point.id);
  if(!oldPoints.has(input.old.id))oldPoints.set(input.old.id,new Set());oldPoints.get(input.old.id).add(point);
  if(absorbed.has(input))audits.get(input.old.id).flags.push('duplicate-gazetteer-point');
  if(key(unqualified(input.old.en))===key(point.en)||!input.old.population&&point.id===input.old.id){
   languageForms(input.old,point);point.aliases=unique([...point.aliases,...(input.old.aliases||[])]);
  }
 }
 for(const [id,detail] of Object.entries(review.namedTypes)){
  const p=pointMap.get(id);assert(p&&key(p.en)===key(detail.name),'Reviewed Northern Ireland identity '+id);
  p.kind=detail.place[0].toUpperCase()+detail.place.slice(1);
  p.provenance.placeType=detail.source;p.provenance.placeTypeVersion=detail.version;
  p.minzoom=zoom[p.kind]??zoom['Other Settlement'];
  if(detail.resolvePosition){
   p.center=detail.center;p.parentId=container(p.center,detail.source);p.provinceId=province(p.parentId);p.parentName=units.get(p.parentId).en;
   p.provenance.coordinates=detail.source;audits.get(id)?.flags.push('shared-location-resolved');
  }
 }
 const index=namesIndex([...pointMap.values()].filter(p=>p.provenance.gazetteer),sources);
 const recordsForOld=id=>[...(oldPoints.get(id)||[])];
 for(const [oldId,area] of observations){
  const old=oldById.get(oldId),audit=audits.get(oldId),base=area.id===oldId;
  const hasJointNote=/This count covers the whole of /.test(old.population.scopeNote||'');
  const radius=area.population.value>=100000?12000:area.population.value>=10000?6500:5000;
  const candidates=nearby(index,area.en,area,radius);
  const test=reviewedAreas.get(area.code),checked=test&&(pointMap.get(test.id)||recordsForOld(test.id)[0]);
  const tested=checked&&metres(checked.center,test.center)<25;
  if(tested)audit.boundaryCheck={point:checked.id,inside:test.inside};
  let direct=tested&&test.inside?checked:pointMap.get(sourceTargets.get(equivalentAreaNames.get(area.code)));
  if(!direct&&!areaMembers.has(area.code)&&!hasJointNote){
   const local=candidates.filter(c=>c.p.parentId===area.parentId);
   const qualifier=/\s+\(([^()]*)\)$/.exec(area.en)?.[1];
   direct=choose(local)||choose(candidates.filter(c=>c.d<=1000||qualifier&&key(c.p.parentName)===key(qualifier)));
   if(!direct&&!base&&splitNames(area.en).length===1)direct=recordsForOld(oldId).find(p=>key(p.en)===key(old.en));
  }
  if(tested&&!test.inside){direct=undefined;audit.flags.push('outside-statistical-footprint');}
  const explicit=areaMembers.get(area.code),components=splitNames(unqualified(area.en));
  const combined=!!explicit||hasJointNote||!direct&&components.length>1;
  if(direct&&!direct.population&&!combined){
   direct.population=area.population;direct.provenance.population=area.provenance.population;
   direct.provenance.census={code:area.code,name:area.sourceName,...(old.provenance.census?.outputAreas?{outputAreas:old.provenance.census.outputAreas}:{})};
   if(base){languageForms(old,direct);direct.aliases=unique([...direct.aliases,old.en,...(old.aliases||[])]);}
   direct.minzoom=+populationZoom(direct.population.value).toFixed(2);
   if(base&&oldId!==direct.id){aliases[oldId]=direct.id;audit.flags.push('duplicate-statistical-dot');}
   if(direct.parentId!==area.parentId)audit.flags.push('cross-boundary-name-match');
   audit.targets.push(direct.id);continue;
  }
  let members=unique([direct,...(explicit||components).map(n=>choose(nearby(index,n,area,area.population.value>=100000?30000:8000)))]);
  if(!combined&&!direct)members=[];
  const asPage=combined||!!direct||candidates.length>0;
  if(!asPage){
   const record={...old,en:unqualified(area.en),kind:area.kind,population:area.population};
   record.name=record.en;record.mapLabel=record.en+' ('+area.kind.toLowerCase()+')';record.provenance={...old.provenance,census:{code:area.code,name:area.sourceName}};record.minzoom=+populationZoom(area.population.value).toFixed(2);
   const anchor=review.placeNodes?.[oldId];
   if(anchor){
    record.center=anchor.center;record.kind=anchor.place[0].toUpperCase()+anchor.place.slice(1);delete record.mapLabel;
    record.parentId=container(anchor.center,anchor.source);record.provinceId=province(record.parentId);record.parentName=units.get(record.parentId).en;
    record.provenance.coordinates=anchor.source;
    if(anchor.version)record.provenance.placeNodeVersion=anchor.version;
    if(anchor.method)record.provenance.coordinateMethod=anchor.method;
    if(anchor.kindSource)record.provenance.placeType=anchor.kindSource;
    audit.flags.push('verified-named-location');
   }else audit.flags.push('statistical-location-labelled');
   pointMap.set(record.id,record);audit.targets.push(record.id);continue;
  }
  if(!members.length&&candidates.length&&!tested)audit.flags.push('unconfirmed-name-match');
  area.members=members.map(p=>p.id);area.aliases=unique([base&&old.en,area.sourceName]);
  if(base)languageForms(old,area);
  areas.push(area);areaIds.add(area.id);for(const p of members)(p.statisticalAreaIds??=[]).push(area.id);
  if(combined&&members.length){
   const principal=[...members].sort((a,b)=>kindRank.indexOf(a.kind)-kindRank.indexOf(b.kind))[0];
   if(principal.kind==='City')principal.minzoom=Math.min(principal.minzoom,+populationZoom(area.population.value).toFixed(2));
  }
  audit.flags.push(combined?'combined-population-separated':'distinct-census-scope');audit.targets.push(base?area.id:oldId,...area.members);
 }
 const pages=new Map(areas.map(a=>[a.code,a]));
 for(const [code,localities] of Object.entries(review.nrsLocalities)){
  const area=pages.get(code);assert(area,code);
  for(const locality of localities){
   const p=pointMap.get(locality.pointId);assert(p,locality.pointId);
   area.members=unique([...area.members,p.id]);p.statisticalAreaIds=unique([...(p.statisticalAreaIds||[]),area.id]);
   if(p.population)continue;
   p.population={label:'Locality population',value:locality.population,year:2022,periodLabel:'2022 census',scope:'Locality (NRS Census 2022)',scopeNote:'Usual residents of the '+locality.name+' census locality.',source:review.boundarySources.nrsLocalities};
   p.provenance.census={code:locality.code,name:locality.name};p.provenance.population='National Records of Scotland, 2022 Census localities';
   p.minzoom=+populationZoom(p.population.value).toFixed(2);
   audits.get(p.id)?.flags.push('census-locality-population');
  }
 }
 for(const area of areas){
  const centers=[area.center,...area.members.map(id=>pointMap.get(id).center)];
  const xs=centers.map(c=>c[0]),ys=centers.map(c=>c[1]);
  area.bounds=[[Math.min(...xs)-.04,Math.min(...ys)-.04],[Math.max(...xs)+.04,Math.max(...ys)+.04]];
 }
 for(const old of original){
  const audit=audits.get(old.id),points=recordsForOld(old.id);
  if(old.id===londonId)audit.targets.push(londonId);
  if(points.length>1)audit.flags.push('distinct-source-names-restored');
  for(const p of points){
   if(metres(old.center,p.center)>20)audit.flags.push('gazetteer-location');
   if(p.en!==old.en)audit.flags.push('gazetteer-name');
   if(p.kind!==old.kind)audit.flags.push('place-type');
   if(p.population&&p.population.label!==old.population?.label)audit.flags.push('population-scope');
   audit.targets.push(p.id);
  }
  audit.targets=unique(audit.targets);audit.flags=unique(audit.flags);
  if(!pointMap.has(old.id)&&!areaIds.has(old.id)&&audit.targets.length&&!aliases[old.id])aliases[old.id]=audit.targets[0];
  audit.status=audit.flags.includes('outside-UK')?'excluded':pointMap.has(old.id)?(audit.flags.length?'corrected':'retained'):areaIds.has(old.id)?'area-page':'merged';
 }
 for(const p of pointMap.values()){
  const parent=units.get(p.parentId);
  if(p.id!==londonId&&parent&&key(parent.en.replace(/^City of /,'').replace(/ City$/,''))===key(p.en))p.replacesLabel=parent.id;
 }
 const records=[...pointMap.values()];
 const neighboursByName=new Map();
 for(const p of records){
  const n=key(p.en),others=neighboursByName.get(n)||[];
  for(const other of others){
   if(other.parentId===p.parentId||metres(p.center,other.center)>3000)continue;
   for(const place of [p,other]){
    place.labelContext=place.parentName||units.get(place.parentId).en;
    const row=audits.get(place.id);if(row&&!row.flags.includes('nearby-namesake'))row.flags.push('nearby-namesake');
   }
  }
  others.push(p);neighboursByName.set(n,others);
 }
 const dotzooms=settlementDotZooms(records);
 for(const point of records.filter(p=>dotzooms.get(p.id)>21)){
  const neighbours=records.filter(p=>p!==point&&metres(p.center,point.center)<=3);
  for(const p of neighbours){
   point.coincidentPlaceIds=unique([...(point.coincidentPlaceIds||[]),p.id]);
   p.coincidentPlaceIds=unique([...(p.coincidentPlaceIds||[]),point.id]);
  }
  const audit=audits.get(point.id);if(audit&&!audit.flags.includes('crowded-source-coordinate'))audit.flags.push('crowded-source-coordinate');
 }
 assert.equal(new Set([...records,...areas].map(r=>r.id)).size,records.length+areas.length,'A source geography cannot be two selectable places');
 const audit=[...audits.values()];
 for(const row of audit)if(row.status==='retained'&&row.flags.length)row.status='corrected';
 return {data:{...data,records,dotzooms:Object.fromEntries(dotzooms),statisticalAreas:areas,selectionAliases:aliases,coverage:{...data.coverage,totalPoints:records.length,statisticalAreas:areas.length,
  auditedOriginalPoints:audit.length,withoutPopulation:records.filter(p=>!p.population).length}},audit,sourceResolution:sourceTargets,excluded};
}
