// Use the supplied census workbook for approved numeric discrepancies and missing records.
import fs from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {readData} from './read-data.mjs';
export const measures=['total','towns','urbanCore'];
export const censusPath=new URL('boundary-sources/china-population/census-2020.json',import.meta.url);
export const aliasesPath=new URL('boundary-sources/china-population/census-matches.json',import.meta.url);
export const readCensus=()=>JSON.parse(fs.readFileSync(censusPath));
export function censusFeatures(){
 const d=readData('display-boundaries.json'),counties=JSON.parse(gunzipSync(fs.readFileSync(new URL('../dist/data/china-counties.bin',import.meta.url))));
 return [...new Map([...d.provinces.features,...d.subdivisions.features,...counties.regions.features].map(f=>[String(f.properties.adcode),f])).values()];
}
const prefecture=p=>p.level==='city'&&String(p.adcode).slice(2,4)!=='90';
const county=p=>p.level==='city-district'||p.level==='district'||p.level==='city'&&String(p.adcode).slice(2,4)==='90';
export function matchCensusRows(source,features,config){
 const props=features.map(f=>f.properties).filter(p=>p.adcode<710000),byCode=new Map(props.map(p=>[String(p.adcode),p])),matched=[],unmatched=[],used=new Set();
 const aggregateRows=new Set((config.aggregates||[]).flatMap(a=>a.rows.map(r=>r.row)));
 let province,parent;
 for(const row of source.rows){
  province=props.find(p=>p.level==='province'&&p.name===row.province);
  if(!province){unmatched.push({...row,reason:'National total; not a mapped subdivision'});continue;}
  if(row.name===row.province)parent=province;
  if(aggregateRows.has(row.row))continue;
  const explicit=config.aliases.find(a=>a.row===row.row);
  let p,method='Exact province and parent name match';
  if(explicit){
   p=byCode.get(String(explicit.adcode));
   if(!p||row.name!==explicit.sourceName||p.name!==explicit.mapName||province.adcode!==(p.provinceCode||p.adcode)||explicit.parent&&parent?.adcode!==explicit.parent)throw Error('Census alias needs review at row '+row.row);
   method=explicit.reason;
  }else{
   const candidates=props.filter(p=>(p.provinceCode||p.adcode)===province.adcode&&p.name===row.name&&(p.level==='province'||prefecture(p)||county(p)&&(p.parentCity===parent?.adcode||p.parent?.adcode===parent?.adcode||String(p.adcode).slice(2,4)==='90')));
   if(candidates.length>1)throw Error('Ambiguous census row '+row.row);
   p=candidates[0];
  }
  if(!p){
   const reason=/^(市辖区|县|省直辖县级行政区划|自治区直辖县级行政区划)$/.test(row.name)?'Aggregate row, not a selectable region':/开发区|园区|新城|示范区|管理区|管委会|产业园|保税区|食品区|实验区|风景名胜区|新区$/.test(row.name)?'Functional area without a separate atlas boundary':'Historical division or source label without a matching atlas boundary';
   unmatched.push({...row,parent:parent?.name,reason});
   // Do not let an unknown prefecture's children inherit the preceding parent.
   if(/自治州$|地区$|盟$/.test(row.name))parent=null;
   continue;
  }
  const adcode=String(p.adcode);
  if(used.has(adcode))throw Error('Duplicate census match '+adcode+' at row '+row.row);
  used.add(adcode);
  const level=p.level==='province'?'province':prefecture(p)?'prefecture':'county';
  matched.push({adcode,mapName:p.name,level,method,row,...(config.scopeNotes[adcode]?{scopeNote:config.scopeNotes[adcode]}:{})});
  if(level!=='county')parent=p;
 }
 for(const a of config.aggregates||[]){
  const p=byCode.get(String(a.adcode)),parts=a.rows.map(expected=>{
   const r=source.rows.find(r=>r.row===expected.row);
   if(!r||r.name!==expected.name||r.province!==a.province)throw Error('Census aggregate source changed '+a.adcode);
   return r;
  });
  if(!p||p.name!==a.mapName||p.parentCity!==a.parent||used.has(String(a.adcode)))throw Error('Census aggregate needs review '+a.adcode);
  const sum=k=>parts.every(r=>r[k]!==null)?parts.reduce((s,r)=>s+r[k],0):null;
  const row={...parts[0],name:parts.map(r=>r.name).join(' + '),...Object.fromEntries([...measures,'male','female','rural'].map(k=>[k,sum(k)]))};
  matched.push({adcode:String(a.adcode),mapName:p.name,level:'county',method:'Sum of complete predecessor areas; no estimation or partial-area allocation',row,sourceRows:parts,scopeNote:'Sum of 2020 census areas: '+parts.map(r=>r.name).join(' + ')+'.',boundarySource:a.sourceUrl});
  used.add(String(a.adcode));
 }
 const missing=props.filter(p=>!used.has(String(p.adcode))).map(p=>({adcode:String(p.adcode),name:p.name,level:p.level,reason:config.missingNotes[String(p.adcode)]||'No single matching row in the supplied workbook'}));
 return {matched,unmatched,missing};
}
const provenance=(source,row)=>({workbook:source.filename,sha256:source.sha256,sheet:source.sheet,row:row.row,record:row.record,sourceName:row.name,pdfPages:row.pdfPages,values:Object.fromEntries(measures.map(k=>[k,row[k]]))});
export function supplementCensus(regions,source,features,config,provincePopulation){
 const matches=matchCensusRows(source,features,config),differences=[],availability=[],added=[],filled=[],sourceIssues=[];
 const provinceComparisons={};
 for(const m of matches.matched){
  const {adcode,row}=m,census=provenance(source,row),existing=m.level==='province'?provincePopulation.china[adcode]:regions[adcode];
  if(m.sourceRows)census.components=m.sourceRows.map(r=>provenance(source,r));
  for(const k of measures){
   const value=row[k];
   if(value!==null&&(!Number.isSafeInteger(value)||value<0))throw Error('Invalid census population at '+source.columns[k]+row.row);
  }
  for(const r of m.sourceRows||[row])if(r.total!==r.male+r.female||r.total!==(r.towns??0)+(r.rural??0)||r.towns!==null&&r.towns>r.total||r.urbanCore!==null&&(r.urbanCore>r.total||r.towns!==null&&r.urbanCore>r.towns))sourceIssues.push({adcode,row:r.row,name:r.name,reason:'Workbook population components need review'});
  if(existing){
   census.differences=[];
   for(const field of measures){
    // Provinces display a separately sourced total only.
    if(m.level==='province'&&field!=='total')continue;
    const website=existing[field]??null,workbook=row[field];
    if(website===workbook)continue;
    const detail={adcode,name:m.mapName,level:m.level,field,website,workbook,cell:source.columns[field]+row.row,sheet:source.sheet,pdfPages:row.pdfPages,websiteDate:existing.date,workbookDate:source.date};
    if(website!==null&&workbook!==null){differences.push({...detail,resolved:true});census.appliedCorrections??=[];census.appliedCorrections.push(detail);existing[field]=workbook;existing.sourceLabel=source.sourceLabel;existing.sourceUrl=source.sourceUrl;}
    else{
     availability.push({...detail,reason:website===null?'Missing on website':'Blank in workbook'});
     if(m.level!=='province'&&website===null&&workbook!==null){existing[field]=workbook;existing.fieldSources??={};existing.fieldSources[field]={sourceLabel:source.sourceLabel,sourceUrl:source.sourceUrl,sheet:source.sheet,cell:detail.cell};filled.push(detail);}
    }
   }
   if(m.level==='province')provinceComparisons[adcode]=census;
   else existing.census=census;
  }else if(m.level!=='province'){
   regions[adcode]={name:m.mapName,total:row.total,towns:row.towns,urbanCore:row.urbanCore,date:source.date,sourceLabel:source.sourceLabel,sourceUrl:source.sourceUrl,census};
   added.push({adcode,name:m.mapName,sourceName:row.name,level:m.level,row:row.row});
  }
  if(m.level!=='province'&&m.scopeNote)regions[adcode].scopeNote=m.scopeNote;
 }
 // Verify that every approved numeric override uses the exact workbook value.
 for(const [id,r] of Object.entries(regions))for(const correction of r.census?.appliedCorrections||[])if(r[correction.field]!==correction.workbook)throw Error('Workbook correction not applied '+id);
 const summary={sourceRows:source.rows.length,matchedRows:matches.matched.reduce((n,m)=>n+(m.sourceRows?.length||1),0),matchedRegions:matches.matched.length,unmatchedRows:matches.unmatched.length,addedRegions:added.length,addedPrefectures:added.filter(r=>r.level==='prefecture').length,addedCounties:added.filter(r=>r.level==='county').length,filledFigures:filled.length,differingFigures:differences.length,differingRegions:new Set(differences.map(d=>d.adcode)).size,missingMappedRegions:matches.missing.length,sourceIssues:sourceIssues.length};
 return {summary,differences,availability,added,filled,provinceComparisons,sourceIssues,matches};
}
