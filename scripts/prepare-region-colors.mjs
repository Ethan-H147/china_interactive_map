import fs from 'node:fs';
import {gunzipSync} from 'node:zlib';
import assert from 'node:assert/strict';
import {pathToFileURL} from 'node:url';
import {countryColorData,subdivisionColorLabels} from '../dist/region-color-data.mjs';
const root=new URL('../',import.meta.url);
const read=path=>{const bytes=fs.readFileSync(new URL(path,root));return JSON.parse(path.endsWith('.bin')?gunzipSync(bytes):bytes);};
const norm=s=>String(s).replace(/\s+\d+\/|\*/g,'').normalize('NFD').replace(/\p{M}/gu,'').toLowerCase().replace(/[^a-z0-9]/g,'');
const provinces=read('dist/data/province-population.json');
const supplements={
 china:()=>{const local=read('dist/data/region-population.json');return {...Object.fromEntries(Object.entries(local.regions).map(([id,r])=>[id,{population:{value:r.total,year:Number(r.date.slice(0,4)),sourceUrl:local.source.revisionUrl||local.source.url,note:local.source.measures.total}}])),...Object.fromEntries(Object.entries(provinces.china).map(([id,r])=>[id,{population:{value:r.total,year:Number(r.date.slice(0,4)),sourceUrl:r.sourceUrl,note:r.measure}}]))};},
 mongolia:records=>Object.fromEntries(records.map(r=>{const p=provinces.mongolia[r.iso]||provinces.mongolia[provinces.mongoliaAliases[norm(r.en)]];assert(p,'Mongolian population '+r.id);return[r.id,{population:{value:p.total,year:Number(p.date.slice(0,4)),sourceUrl:p.sourceUrl,note:p.measure}}];})),
 japan:()=>{const d=read('dist/data/japan-local-facts.bin');return Object.fromEntries(Object.entries(d.records).map(([id,r])=>[id,{population:{value:r.population,year:Number(d.source.date.slice(0,4)),sourceUrl:d.source.url,note:d.source.note},...(!/^JP-\d\d$/.test(id)&&r.area>0?{area:{value:r.area,sourceUrl:d.source.url}}:{})}]));},
 korea:records=>{const d=read('scripts/statistics-sources/korea-population.json');assert.equal(d.rows.reduce((s,r)=>s+r.population,0),d.national,'MOIS national cross-check');return Object.fromEntries(records.map(r=>[r.id,{population:(p=>p?{value:p.population,year:Number(d.source.date.slice(0,4)),sourceUrl:d.source.url,note:d.source.note}:null)(d.rows.find(p=>p.name===r.ko))}]));},
 philippines:records=>{
  const base='scripts/statistics-sources/archipelago/';
  const pop=read(base+'0191A6DTHP8.px.json'),land=read(base+'0221A6DLPD0.px.json'),meta=read(base+'0191A6DTHP8.px.metadata.json');
  const gdp=read(base+'0012A5FPPA0.px.json'),pc=read(base+'0092A5FPPA8.px.json'),gm=read(base+'0012A5FPPA0.px.metadata.json');
  const locations=gm.variables.find(v=>v.code==='Geolocation'),years=gm.variables.find(v=>v.code==='Year'),fx=read(base+'exchange-rates.json')[1];
  const sources=read('dist/data/archipelago/philippines-statistics.json').sources;
  const values=(table,code,param)=>Number(table.data.find(r=>r.key[0]===code&&r.key[1]===param)?.values[0]);
  const out={};
  for(const r of records){
   const regionCode=(r.id==='PH15'?'19':r.id.slice(2))+'00000000';
   const n=meta.variables[0].valueTexts[meta.variables[0].values.indexOf(regionCode)];assert(n,'PSA regional code '+r.id);
   const entry={population:{value:values(pop,regionCode,'0'),year:2024,sourceUrl:sources['psa-population'].url,note:'Entire region, including separately reported highly urbanized cities.'},area:{value:values(land,regionCode,'3'),sourceUrl:sources['psa-area'].url,note:'PSA regional land area, LMB/DENR 2019 basis.'}};
   const i=locations.valueTexts.findIndex(t=>norm(t)===norm(n));assert(i>=0,'PSA regional economic match '+n);
   for(const [key,table,scale]of [['gdp',gdp,1000],['gdpPerCapita',pc,1]]){
    const rows=table.data.filter(row=>row.key[0]===locations.values[i]&&row.key[1]==='0'&&Number(row.values[0])>0).map(row=>({value:Number(row.values[0])*scale,year:Number(years.valueTexts[years.values.indexOf(row.key[2])])})).sort((a,b)=>b.year-a.year);
    if(rows.length){const m=rows[0],rate=fx.find(f=>f.countryiso3code==='PHL'&&Number(f.date)===m.year)?.value;assert(rate>0);entry[key]={...m,currency:'PHP',usd:m.value/rate,sourceUrl:sources[key==='gdp'?'psa-gdp':'psa-per-capita'].url,exchangeSourceUrl:sources['worldbank-fx'].url,note:'Published whole-region total, including highly urbanized cities; current prices.'};}
   }
   out[r.id]=entry;
  }return out;
 }
};
export function prepareRegionColors(){
 const outputs={};
 for(const [country,c]of Object.entries(countryColorData)){
  const d=read('dist/'+c.statistics),catalogue=c.catalogue?read('dist/'+c.catalogue):null;
  const geography=[...(catalogue?.records||['first','second','third'].flatMap(k=>catalogue?.[k]?.features.map(f=>f.properties)||[])),...(c.extraCatalogue?read('dist/'+c.extraCatalogue).records:[])];
  const first=geography.filter(r=>r.level===1),extra=c.population?supplements[c.population](first):{};
  const ids=new Set([...geography.filter(r=>r.level>0).map(r=>String(r.id)),...Object.entries(d.regions).filter(([key,r])=>key.startsWith(country+':')&&r.level>0).map(([key])=>key.split(':')[1])]);
  const geographicIndex=new Map(geography.map(r=>[String(r.id),r]));
  const records=[...ids].map(id=>{const r={...d.regions[country+':'+id],...extra[id]},geo=geographicIndex.get(id),metrics={};
   for(const key of ['population','populationDensity','gdp','gdpPerCapita']){
    if((key.startsWith('gdp')&&c.economy===false)||(key==='populationDensity'&&c.density===false))continue;
    const m=key==='populationDensity'&&r.population?.value>=0&&r.area?.value>0?{value:r.population.value/r.area.value,year:r.population.year,unit:'people/km²',sourceUrl:r.population.sourceUrl||d.sources[r.population.source]?.url,areaSourceUrl:r.area.sourceUrl||d.sources[r.area.source]?.url,note:[r.population.note,r.area.note].filter(Boolean).join(' ')}:r[key]||r[{gdp:'realGdp',gdpPerCapita:'realGdpPerCapita'}[key]];
    if(!m||!Number.isFinite(m.value)||m.value<0)continue;
    // A city-only card value does not describe a wider administrative polygon.
    if(m.scopeNote==='City proper'||key==='populationDensity'&&r.population?.scopeNote==='City proper')continue;
    const economic=key.startsWith('gdp'),value=economic?(m.currency==='USD'?m.value:m.usd):m.value;
    // Never compare different currencies, exports, GDP or constant-price GVA as one measure.
    if(!Number.isFinite(value))continue;
    metrics[key]={value,year:m.year,unit:economic?'USD':m.unit||'people',...(economic?{usdEstimate:m.currency!=='USD',exchangeSourceUrl:m.exchangeSourceUrl||d.sources[m.exchangeSource]?.url}:{}),...(m.priceBasis==='constant'?{priceBasis:'constant',baseYear:m.baseYear}:{}),sourceUrl:m.sourceUrl||d.sources[m.source]?.url,areaSourceUrl:m.areaSourceUrl,note:m.note};
   }
   return {id:String(id),name:geo?.en||r.name,local:geo?.local||geo?.ko||geo?.mn||geo?.ja||'',level:geo?.level||r.level,parent:geo?.parent||r.parent?String(geo?.parent||r.parent):null,metrics};
  });
  const parents=Object.fromEntries(records.filter(r=>r.level>1&&r.parent).map(r=>[r.id,r.parent])),withChildren=new Set(Object.values(parents));
  // Metros and ordinary Japanese municipalities remain leaf units beside third-level children.
  for(const r of records)if(r.level===2&&geography.some(g=>g.level===3)&&!withChildren.has(r.id))r.leaf=true;
  const supportedLevels=new Set(records.filter(r=>Object.keys(r.metrics).length).map(r=>r.level));
  const data={version:2,country,level:c.levels,levels:subdivisionColorLabels[country]||[c.levels],records:records.filter(r=>supportedLevels.has(r.level)),parents};outputs[country]=data;
  fs.mkdirSync(new URL('dist/data/region-colors/',root),{recursive:true});fs.writeFileSync(new URL('dist/data/region-colors/'+country+'.json',root),JSON.stringify(data));
  console.log(country,Object.fromEntries([1,2,3].map(level=>[level,{regions:records.filter(r=>r.level===level).length,...Object.fromEntries(['population','populationDensity','gdp','gdpPerCapita'].map(k=>[k,records.filter(r=>r.level===level&&r.metrics[k]).length]))}])));
 }return outputs;
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href)prepareRegionColors();
