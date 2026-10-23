import fs from 'node:fs';
import {additions} from './balkans-config.mjs';
import {applyEuropeCountryPalettes} from './apply-europe-country-palettes.mjs';
let registry=fs.readFileSync('dist/countries.js','utf8');
for(const [country,c]of Object.entries(additions)){
 if(registry.includes("  '"+country+"':"))continue;
 const stats=JSON.parse(fs.readFileSync('dist/data/europe/'+country+'/statistics.json')),economy=Object.values(stats.regions).some(r=>r.level===1&&r.gdp&&r.gdpPerCapita);
 const map={firstLabel:c.levels[0],...(c.levels[1]?{secondLabel:c.levels[1]}:{}),deferOutlines:true,parallelDetails:true,statistics:true,dedicatedFrontier:true,searchLabel:c.levels.length===1?'Find a municipality':'Find a region or local area',center:c.center,zoom:c.zoom,bounds:c.bounds,fill:'#e3e7f1',selected:'#bbc9e5',line:'#46669a',labelLanguages:[['en','English'],[c.lang,'Local names'],['both','English & local names']],boundaryCredit:c.credit};
 const entry="  '"+country+"':{"+JSON.stringify({en:c.en,local:c.local,lang:c.lang,labelCenter:c.center,background:'#f1f0f6',quiz:{level:1}}).slice(1,-1)+",...regional('europe','"+c.prefix+"',"+JSON.stringify(map)+','+JSON.stringify({colors:{levels:c.levels[0],economy},levelNames:c.levels,naturalEarth:c.iso})+")},\n";
 registry=registry.replace(' const countries={',' const countries={\n'+entry);
 registry=registry.replace('"Europe": "','"Europe": "'+country+' ');
}
fs.writeFileSync('dist/countries.js',registry);
applyEuropeCountryPalettes(Object.keys(additions));
const file='dist/data/country-history.json',history=JSON.parse(fs.readFileSync(file));for(const [country,c]of Object.entries(additions))if(!history.entries.some(e=>e.country===country))history.entries.push({country,name:c.en,addedOn:'2026-10-23',basis:'local-implementation',evidence:{note:'Added locally at the user’s request; no commit or deployment performed.'}});fs.writeFileSync(file,JSON.stringify(history,null,2)+'\n');
