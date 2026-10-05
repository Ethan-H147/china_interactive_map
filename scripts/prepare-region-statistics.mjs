import fs from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {readData} from './read-data.mjs';
const root=new URL('../',import.meta.url),sourcesRoot=new URL('./statistics-sources/',import.meta.url);
const read=n=>JSON.parse(fs.readFileSync(new URL(n,sourcesRoot),'utf8'));
const table=(n,i=0)=>read(n+'.tables.json')[i];
const clean=s=>String(s||'').replace(/\[[^\]]*\]/g,'').replace(/[*†‡]/g,'').trim();
const norm=s=>clean(s).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/macau/g,'macao').replace(/city$| municipality$| province$| special administrative region$/g,'').replace(/[^a-z0-9]/g,'');
const number=s=>{const m=clean(s).replace(/,/g,'').match(/[\d]+(?:\.\d+)?/);return m?Number(m[0]):null;};
const names=JSON.parse(fs.readFileSync(new URL('dist/data/region-names.json',root))).regions;
const articles=JSON.parse(fs.readFileSync(new URL('dist/data/region-articles.json',root))).regions;
const english=Object.fromEntries([...fs.readFileSync(new URL('dist/app.js',root),'utf8').match(/const english=\{([^\n]+)\};/)[1].matchAll(/(\d{6}):'([^']+)'/g)].map(m=>[m[1],m[2]]));
const cn=readData('display-boundaries.json');
const countries=Object.fromEntries(['korea','mongolia'].map(n=>[n,JSON.parse(gunzipSync(fs.readFileSync(new URL('dist/data/'+n+'-boundaries.bin',root))))]));
const records={},sources=read('manifest.json'),unmatched=[];
sources['map-area']={title:'Atlas boundary geometry',url:'data/statistics-methodology.html',method:'Spherical polygon area, Earth radius 6371008.8 m; holes subtracted. Display boundaries may differ from official administrative or land area.'};
sources['worldbank-fx']={title:'World Bank / IMF IFS: annual average exchange rate',url:'https://data.worldbank.org/indicator/PA.NUS.FCRF',indicator:'PA.NUS.FCRF',retrieved:'2026-10-05'};
function sphericalArea(g){
 const ring=r=>Math.abs(r.reduce((sum,p,i)=>{const q=r[(i+1)%r.length];return sum+(q[0]-p[0])*Math.PI/180*(2+Math.sin(p[1]*Math.PI/180)+Math.sin(q[1]*Math.PI/180));},0))*6371.0088**2/2;
 if(!g)return 0;
 if(g.type==='GeometryCollection')return g.geometries.reduce((s,g)=>s+sphericalArea(g),0);
 const polygons=g.type==='Polygon'?[g.coordinates]:g.type==='MultiPolygon'?g.coordinates:[];
 return polygons.reduce((sum,p)=>sum+ring(p[0])-p.slice(1).reduce((s,r)=>s+ring(r),0),0);
}
function add(country,f,level){const p=f.properties,key=country+':'+(p.adcode||p.id);records[key]={name:p.en||english[p.adcode]||names[p.adcode]?.en||p.name,country:p.country||'CN',level,parent:p.provinceCode||p.parent?.adcode||p.parent||null,area:{value:Math.round(sphericalArea(f.geometry)*10)/10,unit:'km²',source:'map-area',method:'mapped',note:'Approximate area of the mapped boundary; not an official land-area statistic.'}};}
for(const f of cn.provinces.features)add('china',f,1);
for(const f of cn.subdivisions.features)add('china',f,2);
const districts=JSON.parse(gunzipSync(fs.readFileSync(new URL('dist/data/city-districts.bin',root))));
for(const f of districts.features||[])add('china',f,3);
for(const [country,d] of Object.entries(countries))for(const k of ['first','second'])for(const f of d[k].features)add(country,f,k==='first'?1:2);
const fx={};for(const r of read('exchange-rates.json')[1])if(r.value)fx[( {CHN:'CNY',KOR:'KRW',MNG:'MNT',HKG:'HKD',MAC:'MOP'}[r.countryiso3code])+':'+r.date]=r.value;
function money(key,metric,value,currency,year,source,note){
 if(!records[key]||!Number.isFinite(value)||value<=0||!Number.isInteger(year)||year>2025)return;
 if(records[key][metric]?.year>=year)return;
 const rate=fx[currency+':'+year];
 records[key][metric]={value,currency,year,source,...(note?{note}:{}),...(rate?{usd:value/rate,exchangeRate:rate,exchangeSource:'worldbank-fx'}:{})};
}
function findProvince(name){const candidates=Object.entries(records).filter(([k,r])=>k.startsWith('china:')&&r.level===1&&norm(r.name)===norm(name));return candidates.length===1?candidates[0][0]:null;}
function findCity(name,province){const parent=findProvince(province)?.split(':')[1],raw=norm(clean(name).split(',')[0]),n=({qamdo:'chamdo',lhoka:'shannan',xigaze:'shigatse',tarbagatay:'tacheng',deqen:'diqing'}[raw]||raw);let candidates=Object.entries(records).filter(([k,r])=>k.startsWith('china:')&&r.level===2&&String(r.parent)===parent);let exact=candidates.filter(([k,r])=>norm(r.name)===n||norm(articles[k.split(':')[1]]?.en?.title?.split(',')[0])===n);if(exact.length===1)return exact[0][0];exact=candidates.filter(([k,r])=>norm(r.name).startsWith(n)&&n.length>=3);return exact.length===1?exact[0][0]:null;}
for(const row of table('china-provinces',2).rows){const k=findProvince(row[0]);if(k&&Number(k.split(':')[1])<710000)money(k,'gdp',number(row[1])*1e6,'CNY',2025,'china-provinces','Preliminary; compiled from provincial releases.');}
for(const row of table('china-per-capita',2).rows){const k=findProvince(row[0]);if(k&&Number(k.split(':')[1])<710000)money(k,'gdpPerCapita',number(row[1]),'CNY',2025,'china-per-capita','Preliminary; compiled from provincial releases.');}
for(const row of table('china-prefectures').rows){const k=findCity(row[0],row[1]),year=number(row[7]);if(!k){unmatched.push({source:'china-prefectures',name:row[0],province:row[1]});continue;}money(k,'gdp',number(row[3])*1e9,'CNY',year,'china-prefectures');money(k,'gdpPerCapita',number(row[5]),'CNY',year,'china-prefectures');}
for(const row of table('china-top-cities').rows){const k=findCity(row[1],row[3]);if(k)money(k,'gdp',number(row[4])*1e6,'CNY',2024,'china-top-cities');}
for(const row of table('china-top-per-capita').rows){const k=findCity(row[1],row[3]);if(k){money(k,'gdpPerCapita',number(row[4]),'CNY',2024,'china-top-per-capita');money(k,'gdp',number(row[6])*1e6,'CNY',2024,'china-top-per-capita');}}
// Area claims are entity-scoped, never urban/metro components. Ambiguous claims are omitted.
const entities=read('china-entities.json');
for(const [code,article] of Object.entries(articles)){
 const key='china:'+code;if(!records[key]||code==='710000')continue;
 let claims=(entities[article.wikidata]?.claims?.P2046||[]).filter(c=>c.rank!=='deprecated'&&!c.qualifiers?.P518&&c.mainsnak?.datavalue?.value?.unit?.endsWith('/Q712226'));
 if(claims.some(c=>c.rank==='preferred'))claims=claims.filter(c=>c.rank==='preferred');
 const year=c=>Number(c.qualifiers?.P585?.[0]?.datavalue?.value?.time?.slice(1,5))||0;
 claims.sort((a,b)=>year(b)-year(a));
 if(!claims.length)continue;
 if(claims.length>1&&year(claims[0])===year(claims[1])&&claims[0].mainsnak.datavalue.value.amount!==claims[1].mainsnak.datavalue.value.amount)continue;
 const c=claims[0],value=Number(c.mainsnak.datavalue.value.amount);if(value<=0)continue;
 const source='wikidata-'+article.wikidata;sources[source]={title:'Wikidata: reported area (CC0)',url:'https://www.wikidata.org/wiki/'+article.wikidata+'#P2046',retrieved:'2026-10-05',statement:c.id};
 records[key].area={value,unit:'km²',source,method:'reported',...(year(c)?{year:year(c)}:{}),note:'Reported entity area; source definitions and boundary dates may differ.'};
}
const ke=read('korea-entities.json');
for(const [id,q] of Object.entries(ke.mapping)){
 const key='korea:'+id;if(!records[key])continue;
 let claims=(ke.entities[q]?.claims?.P2046||[]).filter(c=>c.rank!=='deprecated'&&!c.qualifiers?.P518&&c.mainsnak?.datavalue?.value?.unit?.endsWith('/Q712226'));
 if(claims.some(c=>c.rank==='preferred'))claims=claims.filter(c=>c.rank==='preferred');
 const year=c=>Number(c.qualifiers?.P585?.[0]?.datavalue?.value?.time?.slice(1,5))||0;
 claims.sort((a,b)=>year(b)-year(a));const c=claims[0];
 if(!c||claims.some(x=>year(x)===year(c)&&x.mainsnak.datavalue.value.amount!==c.mainsnak.datavalue.value.amount))continue;
 const value=Number(c.mainsnak.datavalue.value.amount);if(value<=0)continue;
 const source='wikidata-'+q;sources[source]={title:'Wikidata: reported area (CC0)',url:'https://www.wikidata.org/wiki/'+q+'#P2046',retrieved:'2026-10-05',statement:c.id};
 records[key].area={value,unit:'km²',source,method:'reported',...(year(c)?{year:year(c)}:{}),note:'Reported entity area; source definitions and boundary dates may differ.'};
}
for(const row of table('mongolia-area',2).rows){const n=norm(row[0].replace(/\(.*\)/,''));const k=Object.keys(records).find(k=>k.startsWith('mongolia:')&&records[k].level===1&&norm(records[k].name)===n);if(k&&number(row[3]))records[k].area={value:number(row[3]),unit:'km²',source:'mongolia-area',method:'reported'};}
const mnAliases={bayanulgii:'bayanolgii',uvurkhangai:'ovorkhangai',khuvsgul:'khovsgol',umnugovi:'omnogovi',tuv:'tov'};
for(const [metric,file,multiplier] of [['gdp','gdp',1e6],['gdpPerCapita','per-capita',1e3]]){
 const d=read('mongolia-'+file+'.json'),[regionId,yearId]=d.id,regions=d.dimension[regionId].category,years=d.dimension[yearId].category;
 const source='mongolia-'+file;sources[source]={title:'National Statistics Office of Mongolia',url:'https://data.1212.mn/pxweb/en/NSO/NSO__Economy%2C%20environment__National%20Accounts/'+(metric==='gdp'?'DT_NSO_0500_007V1':'DT_NSO_0500_011V1')+'.px/',updated:d.updated,retrieved:'2026-10-05',unit:d.dimension.ContentsCode.category.unit.EliminatedValue.base};
 for(const [code,i] of Object.entries(regions.index)){if(code.length!==3)continue;const raw=norm(regions.label[code]),n=mnAliases[raw]||raw;const key=Object.keys(records).find(k=>k.startsWith('mongolia:')&&records[k].level===1&&norm(records[k].name)===n);if(!key)throw Error('Unmatched Mongolia '+raw);for(const [yc,j] of Object.entries(years.index)){const value=d.value[i*d.size[1]+j];if(value!=null)money(key,metric,value*multiplier,'MNT',Number(years.label[yc]),source);}}
}
const overrides=read('verified-records.json');Object.assign(sources,overrides.sources);
for(const [key,r] of Object.entries(overrides.records)){for(const metric of ['gdp','gdpPerCapita'])if(r[metric]){delete records[key][metric];const m=r[metric];money(key,metric,m.value,m.currency,m.year,m.source,m.note);if(m.usd)Object.assign(records[key][metric],{usd:m.usd,exchangeRate:m.value/m.usd,exchangeSource:m.source});}if(r.area)records[key].area=r.area;if(r.note)records[key].note=r.note;}
// Each GDP infobox block supplies its own year; population dates are never reused.
const details=read('china-details.json');
for(const [code,d] of Object.entries(details)){
 const key='china:'+code;if(!records[key]||Number(code)>=710000)continue;
 let year=0,inGDP=false;
 for(const row of d.rows||[]){const heading=clean(row[0]);if(/^GDP\b/i.test(heading)){year=Number(heading.match(/20\d{2}/)?.[0]||row[1]?.match(/^20\d{2}$/)?.[0]);inGDP=!!year;continue;}if(!inGDP)continue;
 if(row.length===1||(!/^[•\-]|total|per capita|prefecture|municipality/i.test(heading)&&!/GDP/i.test(heading))){inGDP=false;continue;}
 if(/urban|metro|PPP/i.test(row.join(' ')))continue;
 const metric=/per capita/i.test(heading)?'gdpPerCapita':'gdp';
 const m=clean(row[1]).match(/(?:CN¥|CNY|RMB|¥)\s*([\d,.]+)\s*(trillion|billion|million)?/i);if(!m)continue;
 const value=Number(m[1].replace(/,/g,''))*({trillion:1e12,billion:1e9,million:1e6}[m[2]?.toLowerCase()]||1);
 if(metric==='gdp'&&value<1e8||metric==='gdpPerCapita'&&value>1e7)continue;
 const source='article-'+code;sources[source]={title:'Wikipedia: '+records[key].name,url:d.url,retrieved:'2026-10-05',license:'CC BY-SA 4.0'};
 money(key,metric,value,'CNY',year,source,'Reported for the administrative region; see source for revisions.');
 }
}
for(const [key,r] of Object.entries(records)){
 if(r.country==='KP')r.note='No verified regional GDP series was found for this North Korean division.';
 if(!r.gdp&&!r.note)r.note='No verified GDP figure is available in this dataset for this division. A parent-region figure is not a substitute.';
}
const coverage={};for(const [key,r] of Object.entries(records)){const k=key.split(':')[0],c=coverage[k]??={regions:0,reportedArea:0,mappedArea:0,gdp:0,gdpPerCapita:0};c.regions++;c[r.area.method==='mapped'?'mappedArea':'reportedArea']++;if(r.gdp)c.gdp++;if(r.gdpPerCapita)c.gdpPerCapita++;}
const output={schemaVersion:1,checked:'2026-10-05',policy:'Latest verified annual value in the retained sources for each metric; availability and years vary. Nominal GDP/GRDP at current prices. USD uses same-year annual average exchange rates, not PPP. Missing values are never zero.',coverage,sources,regions:records};
fs.writeFileSync(new URL('dist/data/region-statistics.json',root),JSON.stringify(output));
fs.writeFileSync(new URL('statistics-unmatched.json',sourcesRoot),JSON.stringify(unmatched,null,2));
console.log(JSON.stringify(coverage,null,2));console.log('Unmatched prefecture rows:',unmatched.length);
