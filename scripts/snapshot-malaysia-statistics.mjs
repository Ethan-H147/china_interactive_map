import fs from 'node:fs';
import {createHash} from 'node:crypto';
const dir='scripts/statistics-sources/malaysia/',hash=bytes=>createHash('sha256').update(bytes).digest('hex');
const files=[];
for(const [name,url,filter] of [
 ['population_state.csv','https://storage.dosm.gov.my/population/population_state.csv',r=>r.sex==='both'&&r.age==='overall'&&r.ethnicity==='overall'],
 ['gdp_state_real_supply.csv','https://storage.dosm.gov.my/gdp/gdp_state_real_supply.csv',r=>r.series==='abs'&&r.sector==='p0']
]){
 const original=fs.readFileSync(dir+name),[head,...lines]=original.toString().trim().split(/\r?\n/),keys=head.split(','),rows=lines.map(line=>({line,record:Object.fromEntries(line.split(',').map((v,i)=>[keys[i],v]))}));
 const latest=rows.map(r=>r.record.date).sort().at(-1),text=[head,...rows.filter(r=>r.record.date===latest&&filter(r.record)).map(r=>r.line)].join('\n')+'\n';
 fs.writeFileSync(dir+name,text);files.push({name,url,downloaded:'2026-10-08',originalSHA256:hash(original),sha256:hash(text),selection:name.startsWith('population')?'Latest year; both sexes, all ages and ethnicities':'Latest year; absolute overall GDP (p0), retaining Supra as a separate non-state record'});
}
files.push({name:'population-state-2025.csv',url:'https://storage.dosm.gov.my/population/population_state.csv',sha256:hash(fs.readFileSync(dir+'population-state-2025.csv')),selection:'2025 population; both sexes, all ages and ethnicities. GDP denominator matches the 2025 GDP year.'});
files.push({name:'exchange-rate-2015.json',url:'https://api.worldbank.org/v2/country/MYS/indicator/PA.NUS.FCRF?date=2015&format=json',sha256:hash(fs.readFileSync(dir+'exchange-rate-2015.json')),selection:'Malaysia 2015 annual-average MYR per USD, World Bank / IMF PA.NUS.FCRF. Matches real GDP reference-year prices.'});
files.push({name:'land-area.json',url:'https://www.dosm.gov.my/uploads/release-content/file_20260410164034.pdf#page=44',sha256:hash(fs.readFileSync(dir+'land-area.json')),selection:'Transcribed state land-area table 1.1, printed page 5. National total retained for validation.'});
fs.writeFileSync(dir+'manifest.json',JSON.stringify({retrieved:'2026-10-08',files},null,2)+'\n');
