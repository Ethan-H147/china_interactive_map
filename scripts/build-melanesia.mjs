import fs from 'node:fs';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {gzipSync} from 'node:zlib';
import {source,root} from './fetch-melanesia.mjs';
import {definitions} from './melanesia-definitions.mjs';
import {load,polygons,linesOf} from './geo-index.mjs';
import {command,fc,buildRegionalDataset} from './build-regional-dataset.mjs';
import {frontier} from './regional-coverage-tools.mjs';
import {alignArc} from './korean-frontiers.mjs';
import {joinReferencePaths} from './frontier-arcs.mjs';
import {lineData} from '../dist/adaptive-lines.mjs';
const require=createRequire(import.meta.url),mapshaper=require('mapshaper'),{unzipSync}=createRequire(require.resolve('mapshaper'))('fflate'),manifest=load(root+'manifest.json');
const csv=name=>{const rows=source(name).toString().replace(/^\uFEFF/,'').trim().split(/\r?\n/).map(s=>s.match(/(?:"(?:[^"]|"")*"|[^,]*)(?:,|$)/g).filter((v,i,a)=>i<a.length-1||v).map(v=>v.replace(/,$/,'').replace(/^"|"$/g,'').replaceAll('""','"')));const headers=rows.shift();return rows.map(r=>Object.fromEntries(headers.map((h,i)=>[h,r[i]])));};
async function layer(iso,level){
 const zip=unzipSync(source(iso==='slb'?iso+'-adm'+level+'.zip':iso+'.zip'));
 if(iso!=='slb')return JSON.parse(Buffer.from(zip[iso+'_admin'+level+'.geojson']));
 const shp=Object.keys(zip).find(k=>k.endsWith('.shp')),out=await mapshaper.applyCommands('-i '+shp+' -proj wgs84 -o out.json format=geojson precision=0.000001',Object.fromEntries(Object.entries(zip).map(([k,v])=>[k,Buffer.from(v)])));return JSON.parse(out['out.json']);
}
const write=(file,data)=>fs.writeFileSync(file,gzipSync(JSON.stringify(data),{level:9}));
for(const d of definitions){
 const iso=d.iso.toLowerCase(),units=new Map(),raw={},population={};
 for(const level of Object.keys(d.counts).map(Number)){
  raw[level]=await layer(iso,level);assert.equal(raw[level].features.length,d.counts[level]);
  const name=Object.keys(manifest.files).find(n=>n.startsWith(iso+'_admpop_adm'+level+'_')&&n.endsWith('.csv'));population[level]=new Map(csv(name).map(r=>[r['ADM'+level+'_PCODE'],r]));
  for(const f of raw[level].features){const p=Object.fromEntries(Object.entries(f.properties).map(([k,v])=>[k.toLowerCase(),v])),id=p['adm'+level+'_pcode'],parent=level>1?p['adm'+(level-1)+'_pcode']:null,original=p['adm'+level+'_name'];let en=original.replace(/ Province$/,'').replace(/ District$/,'').replace(/ (Rural|Urban) LLG$/,'');
   let kind=level===1?'Province':d.country==='papua-new-guinea'?level===2?'District':/Urban/.test(original)?'Urban local-level government':'Rural local-level government':d.country==='solomon-islands'?level===2?'Constituency':'Ward':/Port Vila|Luganville/i.test(en)?'Municipality':'Area council';
   if(d.country==='papua-new-guinea'&&level===1){if(/Bougainville/.test(en)){en='Bougainville';kind='Autonomous region';}if(/National Capital/.test(en)){en='National Capital District';kind='Capital district';}if(/Northern/.test(en))en='Northern (Oro)';}
   if(d.country==='solomon-islands'&&level===1&&en==='Honiara')kind='Capital territory';
   if(d.country==='solomon-islands'&&level===1&&id==='SB05')en='Rennell and Bellona';
   const row=population[level].get(id),value=Number(row?.T_TL);assert(row&&Number.isFinite(value)&&value>0,'Exact population join '+id);
   assert(!units.has(id));units.set(id,{id,code:id,codeScheme:'OCHA COD P-code',level,parent,en,local:'',kind,aliases:[original,...(original!==en?[en+' '+kind]:[]),...(d.country==='papua-new-guinea'&&en==='National Capital District'?['Port Moresby','NCD']:[])],population:{value,year:d.populationYear,source:'population',method:d.populationMethod,periodLabel:d.populationYear+(d.populationMethod==='census'?' census':' population estimate')},...(level>1?{note:'Boundaries retain the dated '+d.year+' reference geography; later administrative changes are not inferred.'}:{})});
   f.properties={id,...(parent?{parent}:{})};
  }
 }
 const deepest=Math.max(...Object.keys(d.counts).map(Number));let leaves=await command(raw[deepest],'-clean snap-interval=0 gap-fill-area=0'),international=fc([]),borderReport;
 if(d.country==='papua-new-guinea'){
  const guides=load('scripts/boundary-sources/nordics/ne-borders.json.gz').features.filter(f=>[f.properties.ADM0_A3_L,f.properties.ADM0_A3_R].includes('PNG')&&f.properties.TYPE==='Land'),indonesia=load('dist/data/archipelago/indonesia-context.bin'),guide=joinReferencePaths(linesOf(fc(guides)))[0],canonical=frontier(await command(indonesia,'-dissolve2'),guide);
  const options={maxDistance:15000,maxSelectionMetres:20000,maxDeviationMetres:1,coastalTrimMetres:1500};let aligned;try{aligned=await alignArc(leaves,canonical,options);}catch(error){if(!/Replacement outline follows|Every canonical bend/.test(error.message))throw error;const exposed=await alignArc(leaves,canonical,{...options,maxDeviationMetres:100});aligned=await alignArc(exposed.regions,canonical,options);}leaves=aligned.regions;
  leaves=await command({'png.json':leaves,'indonesia.json':indonesia},'-erase indonesia.json -clean gap-fill-area=0');
  international=lineData(fc([{type:'Feature',properties:{countries:['papua-new-guinea'],pair:'IDN-PNG',boundaryType:'land frontier'},geometry:{type:'LineString',coordinates:canonical}}]));borderReport={vertices:canonical.length,maxEndpointDisplacementMetres:aligned.maxEndpointDisplacementMetres};
 }
 const byLevel={[deepest]:leaves};for(let level=deepest-1;level>=1;level--){const tagged=fc(leaves.features.map(f=>{let u=units.get(f.properties.id);while(u.level>level)u=units.get(u.parent);return {...f,properties:{id:u.id,...(u.parent?{parent:u.parent}:{})}};}));byLevel[level]=await command(tagged,'-dissolve2 id'+(level>1?',parent':'')+' -clean gap-fill-area=0');}
 for(const [level,count]of Object.entries(d.counts))assert.equal(byLevel[level].features.length,count,'All source units represented '+d.country+' '+level);
 const coverage=d.country==='papua-new-guinea'?'Twenty provinces, the Autonomous Region of Bougainville and the National Capital District. The 2019 boundary snapshot has 87 districts and 326 local-level governments; later district/LLG reforms are not inferred. Population retains the matched 2011 census and its published geography.':d.country==='solomon-islands'?'Nine provinces and Honiara Capital Territory, 50 electoral constituencies and 183 wards from the 2018 SINSO/OCHA reference. Constituencies are electoral boundaries. Population uses the matched 2023 COD-PS estimates.':'Six provinces and 66 mapped area councils/municipalities from the 2017 SPC/OCHA reference. The 2020 census population table is joined by published P-code. This dated 66-area map is not presented as the later 72-area council system. Port Vila and Luganville are the two urban units in this source.';
 await buildRegionalDataset({country:d.country,units,byLevel,year:d.year,retrieved:manifest.retrieved,levels:d.levels,sources:Object.fromEntries(Object.entries(manifest.files).filter(([name])=>name.startsWith(iso)||name==='flag-'+d.prefix+'.svg')),coverage:coverage+' All parents dissolve from the same land partitions. Only shared internal edges and the Indonesia–Papua New Guinea land frontier have strokes; coasts and ocean gaps do not. Country overview pages remain hidden.',statisticsSources:{population:{title:d.en+' · HDX COD-PS '+d.populationYear+' '+d.populationMethod+' by matched P-code',url:'https://data.humdata.org/dataset/cod-ps-'+iso},worldbank:{title:'World Bank World Development Indicators · national totals only',url:manifest.files['worldbank.json'].url}}});
 const base='dist/data/europe/'+d.country+'/';write(base+'international.bin',international);write(base+'political.bin',byLevel[1]);if(borderReport)fs.writeFileSync(base+'frontier-report.json',JSON.stringify(borderReport,null,2)+'\n');
 const stats=load(base+'statistics.json'),rows=JSON.parse(source('worldbank.json'))[1].filter(r=>r.countryiso3code===d.iso),year=[2025,2024,2023,2022,2021,2020].find(y=>['SP.POP.TOTL','NY.GDP.MKTP.CD','NY.GDP.PCAP.CD'].every(code=>rows.some(r=>r.indicator.id===code&&+r.date===y&&r.value>0)));assert(year);const val=code=>rows.find(r=>r.indicator.id===code&&+r.date===year).value;
 stats.regions[d.country+':'+d.iso]={name:d.en,level:0,parent:null,area:{value:Object.values(stats.regions).filter(r=>r.level===1).reduce((n,r)=>n+r.area.value,0),year:d.year,unit:'km²',source:'boundaryArea',method:'mapped'},population:{value:val('SP.POP.TOTL'),year,source:'worldbank',method:'estimate'},gdp:{value:val('NY.GDP.MKTP.CD'),usd:val('NY.GDP.MKTP.CD'),currency:'USD',year,priceBasis:'current',source:'worldbank'},gdpPerCapita:{value:val('NY.GDP.PCAP.CD'),usd:val('NY.GDP.PCAP.CD'),currency:'USD',year,priceBasis:'current',source:'worldbank'}};fs.writeFileSync(base+'statistics.json',JSON.stringify(stats)+'\n');
 fs.writeFileSync('dist/vendor/flag-'+d.prefix+'.svg',source('flag-'+d.prefix+'.svg'));
 const svg=source('flag-'+d.prefix+'.svg').toString(),tag=svg.match(/<svg\b[^>]*>/)[0],view=tag.match(/viewBox="([^"]+)"/)?.[1].split(/[ ,]+/).map(Number),width=view?.[2]||Number(tag.match(/\bwidth="([\d.]+)/)?.[1]),height=view?.[3]||Number(tag.match(/\bheight="([\d.]+)/)?.[1]);assert(width&&height);
 const flags=load('dist/data/europe/flag-sources.json'),images=load('dist/data/flag-images.json'),prefix='export const nationalFlagImages=',text=fs.readFileSync('dist/national-flags.mjs','utf8'),national=JSON.parse(text.slice(text.indexOf(prefix)+prefix.length).trim().replace(/;$/,'')),flag={file:'vendor/flag-'+d.prefix+'.svg',full:'vendor/flag-'+d.prefix+'.svg',width,height,...manifest.files['flag-'+d.prefix+'.svg']};flags.flags[d.country]=flag;images[flag.file]=flag;national[flag.file]=flag;fs.writeFileSync('dist/data/europe/flag-sources.json',JSON.stringify(flags,null,2)+'\n');fs.writeFileSync('dist/data/flag-images.json',JSON.stringify(images));fs.writeFileSync('dist/national-flags.mjs','// Original national artwork and dimensions.\n'+prefix+JSON.stringify(national)+';\n');
}
