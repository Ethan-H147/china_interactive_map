import fs from 'node:fs';import {load} from './geo-index.mjs';
export function applyBalticEconomy(){
 const root='scripts/boundary-sources/baltics/',data=load(root+'ee-gdp-cap.json.gz'),meta=load(root+'ee-RAA0050-meta.json.gz'),dir='dist/data/europe/estonia/',stats=load(dir+'statistics.json'),fx=load(root+'fx.json.gz'),rate=fx.value[fx.dimension.time.category.index['2024']],norm=s=>s.normalize('NFD').replace(/\p{M}/gu,'').toLowerCase().replace(/[^a-z0-9]/g,'');
 stats.sources.gdpPerCapita={title:'Statistics Estonia · RAA0050, county GDP per capita, 2024; published mean annual population denominator',url:'https://andmed.stat.ee/api/v1/en/stat/RAA0050'};
 const m=meta.variables.find(v=>v.code==='Maakond');for(const r of Object.values(stats.regions).filter(r=>r.level===1)){const i=m.valueTexts.findIndex(n=>norm(n)===norm(r.name));if(i<0)throw Error(r.name);const code=m.values[i],pc=Number(data.data.find(r=>r.key[1]===code&&r.key[2]==='4').values[0]);r.gdpPerCapita={value:pc,currency:'EUR',year:2024,source:'gdpPerCapita',priceBasis:'current',usd:pc*rate,exchangeRate:1/rate,exchangeYear:2024,exchangeSource:'exchange'};}
 fs.writeFileSync(dir+'statistics.json',JSON.stringify(stats,null,2)+'\n');console.log('Estonia: all 15 counties have official 2024 GDP per capita.');
}
if(process.argv[1]?.endsWith('prepare-baltic-economy.mjs'))applyBalticEconomy();
