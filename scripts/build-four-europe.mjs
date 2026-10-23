import fs from 'node:fs';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {source,root} from './fetch-four-europe.mjs';
import {additions} from './four-europe-config.mjs';
import {load,polygons,landIndex} from './geo-index.mjs';
import {command,fc,buildRegionalDataset} from './build-regional-dataset.mjs';
import {save,waterFreeLines,centralWater} from './central-europe-frontiers.mjs';
import {resolveFourEurope} from './four-europe-frontiers.mjs';
import {lineData} from '../dist/adaptive-lines.mjs';
const json=n=>JSON.parse(source(n)),require=createRequire(import.meta.url),{unzipSync}=createRequire(require.resolve('mapshaper'))('fflate');
const manifest=load(root+'manifest.json'),nuts=json('nuts2024.geojson').features,lau=json('lau2024.geojson').features;
const statisticsSources={gisco:{title:'Eurostat GISCO · 1 January 2024 LAU resident population',url:'https://ec.europa.eu/eurostat/web/gisco/geodata/statistical-units/local-administrative-units'},gdp:{title:'Eurostat · nominal GDP and GDP per capita, nama_10r_3gdp',url:'https://ec.europa.eu/eurostat/databrowser/view/nama_10r_3gdp/default/table'},exchange:{title:'Eurostat · annual average USD per EUR',url:'https://ec.europa.eu/eurostat/databrowser/view/ert_bil_eur_a/default/table'},worldbank:{title:'World Bank · World Development Indicators',url:'https://data.worldbank.org/indicator'}};
function rows(d){return Object.entries(d.value).map(([k,value])=>{let i=+k;const r={value};for(let n=d.id.length-1;n>=0;n--){const dim=d.id[n],keys=Object.keys(d.dimension[dim].category.index).sort((a,b)=>d.dimension[dim].category.index[a]-d.dimension[dim].category.index[b]);r[dim]=keys[i%d.size[n]];i=Math.floor(i/d.size[n]);}return r;});}
const gdp=rows(json('gdp.json')),exchange=rows(json('exchange.json'));
async function parentsFor(children,parents){const points=await command(children,'-points inner'),indices=parents.features.map(f=>({f,inside:landIndex(polygons(f.geometry).flat())}));return points.features.map((p,i)=>{const matches=indices.filter(x=>x.inside(p.geometry.coordinates));assert.equal(matches.length,1,'Unique parent for '+JSON.stringify(children.features[i].properties));return matches[0].f;});}
const prepared=[];
for(const country of ['croatia','romania']){const c=additions[country],iso=c.prefix.toUpperCase(),units=new Map(),parents=fc(nuts.filter(f=>f.properties.CNTR_CODE===iso&&f.properties.LEVL_CODE===3));
 for(const f of parents.features){const p=f.properties,id=p.NUTS_ID,local=p.NUTS_NAME.replaceAll('ş','ș').replaceAll('ţ','ț'),en=id==='HR050'?'Zagreb':id==='RO321'?'Bucharest':local.replace(/ županija$/,'');units.set(id,{id,code:id,level:1,parent:null,en,local,localLang:c.lang,kind:['HR050','RO321'].includes(id)?'Capital city':'County',aliases:[p.NUTS_NAME],areaYear:2024});}
 const raw=fc(lau.filter(f=>f.properties.CNTR_CODE===iso)),assigned=await parentsFor(raw,parents);assert.equal(raw.features.length,country==='croatia'?556:3181);
 const bottom=fc(raw.features.map((f,i)=>{const p=f.properties,id=p.GISCO_ID,parent=assigned[i].properties.NUTS_ID,local=p.LAU_NAME.replaceAll('ş','ș').replaceAll('ţ','ț');units.set(id,{id,code:id.split('_')[1],level:2,parent,en:local,local,localLang:c.lang,kind:country==='croatia'?'City or municipality':parent==='RO321'?'Bucharest sector':'City, town or commune',areaYear:2024,...(Number.isFinite(p.POP_2024)&&p.POP_2024>=0?{population:{value:p.POP_2024,year:2024,date:'2024-01-01',source:'gisco',periodLabel:'2024 resident population'}}:{})});return {...f,properties:{id}};}));
 for(const u of units.values())if(u.level===1){const children=[...units.values()].filter(r=>r.parent===u.id);if(children.every(r=>r.population))u.population={value:children.reduce((s,r)=>s+r.population.value,0),year:2024,date:'2024-01-01',source:'gisco',method:'sum of constituent local areas',periodLabel:'2024 resident population'};}
 prepared.push({country,units,bottom:await command(bottom,'-clean gap-fill-area=0')});
}
{
 const country='bosnia-herzegovina',units=new Map(),raw=json('bih-adm3.geojson'),top=json('bih-adm1.geojson'),cantons=json('bih-adm2.geojson');
 const names={'BA-BRC':['Brčko District','Brčko distrikt'], 'BA-SRP':['Republika Srpska','Republika Srpska'], 'BA-BIH':['Federation of Bosnia and Herzegovina','Federacija Bosne i Hercegovine']};
 for(const f of top.features){const id=f.properties.shapeISO.replace('*','');f.properties.id=id;units.set(id,{id,level:1,parent:null,en:names[id][0],local:names[id][1],localLang:'bs',kind:id==='BA-BRC'?'Self-governing district':'Entity',note:additions[country].coverage});}
 const cantonShapes=fc(cantons.features.filter(f=>f.properties.shapeName.includes('Canton')));
 for(const [i,f]of cantonShapes.features.entries()){const id='BA-C-'+String(i+1).padStart(2,'0');f.properties.id=id;units.set(id,{id,level:2,parent:'BA-BIH',en:f.properties.shapeName,local:f.properties.shapeName,kind:'Canton',areaYear:2013});}
 const assigned=await parentsFor(raw,top);
 // The old ADM1 reference incorrectly covers Istočni Stari Grad. Its legal
 // entity membership is Republika Srpska (official 2013 census map).
 raw.features.forEach((f,i)=>{if(f.properties.shapeName==='Istočni Stari Grad')assigned[i]=top.features.find(f=>f.properties.id==='BA-SRP');});
 const fed=fc(raw.features.filter((f,i)=>assigned[i].properties.id==='BA-BIH')),fedParents=await parentsFor(fed,cantonShapes),cantonFor=new Map(fed.features.map((f,i)=>[f.properties.shapeID,fedParents[i].properties.id]));
 const bottom=fc(raw.features.map((f,i)=>{const entity=assigned[i].properties.id;if(entity==='BA-BRC')return {...f,properties:{id:entity}};const id='BA-M-'+f.properties.shapeID,parent=cantonFor.get(f.properties.shapeID)||entity;units.set(id,{id,level:entity==='BA-BIH'?3:2,parent,en:f.properties.shapeName,local:f.properties.shapeName,localLang:'bs',kind:'Municipality',areaYear:2013,note:'2013 municipal reference; later changes are not represented.'});return {...f,properties:{id}};}));assert.equal(bottom.features.length,142);prepared.push({country,units,bottom:await command(bottom,'-clean gap-fill-area=0')});
}
{
 const z=unzipSync(source('blr-boundaries.zip')),raw=JSON.parse(Buffer.from(z['blr_admin2.geojson'])),top=JSON.parse(Buffer.from(z['blr_admin1.geojson'])),units=new Map(),locals={Brest:'Брэсцкая вобласць',Gomel:'Гомельская вобласць',Grodno:'Гродзенская вобласць',Minsk:'Мінская вобласць',Mogilev:'Магілёўская вобласць',Vitebsk:'Віцебская вобласць'};
 const city=top.features.find(f=>/city/i.test(f.properties.adm1_name));assert(city,'Separate Minsk city');const cityId=city.properties.adm1_pcode;
 for(const f of top.features){const p=f.properties,id=p.adm1_pcode;units.set(id,{id,level:1,parent:null,en:id===cityId?'Minsk':p.adm1_name+' Region',local:id===cityId?'Мінск':locals[p.adm1_name]||p.adm1_name,localLang:'be',kind:id===cityId?'Capital city':'Region',areaYear:2019,aliases:[p.adm1_name]});}
 const bottom=fc(raw.features.map(f=>{const p=f.properties,parent=p.adm1_pcode;if(parent===cityId)return {...f,properties:{id:cityId}};const id=p.adm2_pcode;assert(units.has(parent));units.set(id,{id,code:id,level:2,parent,en:p.adm2_name,local:'',kind:'District',areaYear:2019,note:'OCHA 2019 district reference, reviewed November 2024.'});return {...f,properties:{id}};}));assert.equal(bottom.features.length,119);prepared.push({country:'belarus',units,bottom:await command(bottom,'-clean gap-fill-area=0')});
}
if(process.argv.includes('--resume'))for(const d of prepared)d.bottom=load(root+d.country+'-aligned.bin');else await resolveFourEurope(prepared);
const bosnia=prepared.find(d=>d.country==='bosnia-herzegovina');
for(const u of bosnia.units.values()){const corrected={'Kupra na Uni':'Krupa na Uni','Republika Srpska':u.level===1?'Republika Srpska':'Višegrad','Doboj East':'Doboj Istok'}[u.en];if(corrected&&corrected!==u.en){u.aliases=[u.en];u.en=u.local=corrected;}}
const census={"BA-BIH":2219220,"BA-SRP":1228423,"BA-BRC":83516,"Zenica-Doboj Canton":364433,"Posavina Canton":43453,"Bosnian-Podrinje Canton Goražde":23734,"Herzegovina-Neretva Canton":222007,"Tuzla Canton":445028,"West Herzegovina Canton":94898,"Una-Sana Canton":273261,"Canton 10":84127,"Central Bosnia Canton":254686,"Sarajevo Canton":413593};
statisticsSources.bihCensus={title:'Agency for Statistics of Bosnia and Herzegovina · Final 2013 census, printed pages 28–30',url:manifest.files['bih-census-2013.pdf'].url};
for(const u of bosnia.units.values()){const value=census[u.id]??census[u.en];if(value)u.population={value,year:2013,date:'2013-10-01',source:'bihCensus',periodLabel:'2013 census · historical',method:'official census count'};}
assert.equal([...bosnia.units.values()].filter(r=>r.kind==='Canton').reduce((s,r)=>s+r.population.value,0),2219220);
for(const d of prepared){const {country,units}=d,c=additions[country];
 d.bottom=await command({'own.json':d.bottom,'water.json':centralWater()},'-erase water.json -clean gap-fill-area=0');
 const byLevel={};for(const level of [1,2,3]){const features=d.bottom.features.flatMap(f=>{let u=units.get(f.properties.id);while(u.level>level)u=units.get(u.parent);return u.level===level?[{...f,properties:{id:u.id}}]:[];});if(features.length)byLevel[level]=await command(fc(features),'-dissolve id -clean gap-fill-area=0');}
 const statistics={};for(const u of units.values())if(u.level===1&&c.economy){const years=gdp.filter(r=>r.geo===u.id&&r.unit==='MIO_EUR'&&r.value>0).sort((a,b)=>b.time-a.time);const r=years.find(r=>gdp.some(p=>p.geo===u.id&&p.unit==='EUR_HAB'&&p.time===r.time));if(!r)continue;const per=gdp.find(p=>p.geo===u.id&&p.unit==='EUR_HAB'&&p.time===r.time),fx=exchange.find(x=>x.time===r.time&&x.currency==='USD').value,common={year:+r.time,currency:'EUR',source:'gdp',priceBasis:'current',exchangeRate:1/fx,exchangeYear:+r.time,exchangeSource:'exchange'};statistics[u.id]={gdp:{...common,value:r.value*1e6,usd:r.value*1e6*fx},gdpPerCapita:{...common,value:per.value,usd:per.value*fx}};}
 const sources=Object.fromEntries(Object.entries(manifest.files).filter(([name])=>name.startsWith(c.prefix==='ba'?'bih':c.prefix==='by'?'blr':'lau')||name==='nuts2024.geojson'));
 await buildRegionalDataset({country,units,byLevel,statistics,statisticsSources,sources,coverage:c.coverage,year:c.year,retrieved:'2026-10-23',levels:c.levels,areaLabel:'Mapped administrative area'});
 const base='dist/data/europe/'+country+'/',home=await command(byLevel[1],'-dissolve');save(base+'context.bin',fc(home.features.map(f=>({...f,properties:{country}}))));save(base+'political.bin',byLevel[1]);
 const stats=load(base+'statistics.json'),values=json('worldbank-'+c.iso+'.json')[1],facts={};for(const [metric,indicator]of [['population','SP.POP.TOTL'],['gdp','NY.GDP.MKTP.CD'],['gdpPerCapita','NY.GDP.PCAP.CD']]){const r=values.filter(r=>r.indicator.id===indicator&&r.value>0).sort((a,b)=>b.date-a.date)[0];if(r)facts[metric]={value:r.value,year:+r.date,source:'worldbank',...(metric==='population'?{periodLabel:r.date+' World Bank estimate'}:{currency:'USD',usd:r.value,priceBasis:'current'})};}stats.regions[country+':'+c.iso]={name:c.en,level:0,parent:null,area:{value:Object.values(stats.regions).filter(r=>r.level===1).reduce((s,r)=>s+r.area.value,0),unit:'km²',year:c.year,source:'boundaryArea',method:'mapped'},...facts,note:c.coverage};fs.writeFileSync(base+'statistics.json',JSON.stringify(stats));
 save(base+'international.bin',lineData(waterFreeLines(fc(load(root+'resolved.bin').features.filter(f=>f.properties.countries===country)))));
}
const flags=load('dist/data/europe/flag-sources.json');for(const [country,c]of Object.entries(additions)){const name='flag-'+c.prefix+'.svg';fs.writeFileSync('dist/vendor/'+name,source(name));flags.flags[country]={file:'vendor/'+name,full:'vendor/'+name,name:c.en+' national flag',source:manifest.files[name].url,page:'https://commons.wikimedia.org/wiki/File:Flag_of_'+(country==='bosnia-herzegovina'?'Bosnia_and_Herzegovina':c.en)+'.svg',credit:'Wikimedia Commons',license:'Public domain',sha256:manifest.files[name].sha256};}fs.writeFileSync('dist/data/europe/flag-sources.json',JSON.stringify(flags,null,2)+'\n');
console.log('Built all four European country datasets.');
