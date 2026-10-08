import fs from 'node:fs';
import assert from 'node:assert/strict';
import {gunzipSync} from 'node:zlib';
const dir='scripts/statistics-sources/malaysia/';
const csv=file=>{const [head,...lines]=fs.readFileSync(dir+file,'utf8').trim().split(/\r?\n/),keys=head.split(',');return lines.map(line=>Object.fromEntries(line.split(',').map((v,i)=>[keys[i],v])));};
const population=csv('population_state.csv'),gdp=csv('gdp_state_real_supply.csv'),area=JSON.parse(fs.readFileSync(dir+'land-area.json'));
const populationDate=population.map(r=>r.date).sort().at(-1),gdpDate=gdp.map(r=>r.date).sort().at(-1);
const catalogue=JSON.parse(gunzipSync(fs.readFileSync('dist/data/southeast-asia/malaysia-catalogue.bin')));
const sources={
 'dosm-population':{title:'DOSM population by state',url:'https://open.dosm.gov.my/data-catalogue/population_state',downloadURL:'https://storage.dosm.gov.my/population/population_state.csv',license:'CC BY 4.0'},
 'dosm-gdp':{title:'DOSM GDP by state, 2025',url:'https://www.dosm.gov.my/portal-main/release-content/gross-domestic-product-gdp-by-state-2025',downloadURL:'https://storage.dosm.gov.my/gdp/gdp_state_real_supply.csv',license:'CC BY 4.0'},
 'dosm-area':{title:'DOSM Statistics Yearbook 2024, table 1.1 (printed page 5)',url:area.source}
};
const regions={};
for(const record of catalogue.records.filter(r=>r.level===1)){
 const name=({'MY-04':'Melaka','MY-07':'Pulau Pinang','MY-14':'W.P. Kuala Lumpur','MY-15':'W.P. Labuan','MY-16':'W.P. Putrajaya'})[record.id]||record.en;
 const p=population.filter(r=>r.state===name&&r.date===populationDate&&r.sex==='both'&&r.age==='overall'&&r.ethnicity==='overall');
 const output=gdp.filter(r=>r.state===name&&r.date===gdpDate&&r.series==='abs'&&r.sector==='p0');
 assert.equal(p.length,1,name+' population');assert.equal(output.length,1,name+' GDP');assert(area.values[name]>0,name+' area');
 regions['malaysia:'+record.id]={name:record.en,country:'MY',level:1,
  population:{value:Math.round(Number(p[0].population)*1000),year:Number(populationDate.slice(0,4)),method:'estimate',source:'dosm-population',note:'Midyear estimate for both sexes, all ages and ethnicities, including non-citizen residents. DOSM reports thousands of people, rounded to 100 people; the annual CSV date is a year label, not 1 January.'},
  area:{value:area.values[name],year:2024,unit:'km²',method:'reported',label:'Land area',source:'dosm-area',note:'Official reported land area from JUPEM and the Sabah and Sarawak land-survey departments, published in DOSM Statistics Yearbook 2024, table 1.1.'},
  realGdp:{value:Number(output[0].value)*1e6,year:Number(gdpDate.slice(0,4)),currency:'MYR',priceBasis:'constant',baseYear:2015,source:'dosm-gdp',note:'Overall GDP (sector p0) at constant 2015 prices, converted from RM millions. Inflation-adjusted output; no current-price USD conversion is applied.'},
  note:'Population, area and economic output have separate reference years. These statistics cover the entire state or federal territory; districts do not inherit these totals.'
 };
}
fs.writeFileSync('dist/data/southeast-asia/malaysia-statistics.json',JSON.stringify({version:1,retrieved:'2026-10-08',country:'malaysia',sources,regions}));
console.log('Malaysia: '+Object.keys(regions).length+' states and federal territories, '+populationDate.slice(0,4)+' population, 2024 land area, '+gdpDate.slice(0,4)+' real GDP.');
