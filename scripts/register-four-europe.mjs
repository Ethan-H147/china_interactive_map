import fs from 'node:fs';
import {additions} from './four-europe-config.mjs';
import {applyEuropeCountryPalettes} from './apply-europe-country-palettes.mjs';
let registry=fs.readFileSync('dist/countries.js','utf8');
for(const [country,c]of Object.entries(additions)){
 if(registry.includes("  '"+country+"':"))continue;
 const map={firstLabel:c.levels[0],secondLabel:c.levels[1],...(c.levels[2]?{thirdLabel:c.levels[2]}:{}),deferOutlines:true,parallelDetails:true,statistics:true,dedicatedFrontier:true,searchLabel:'Find a region or local area',center:c.center,zoom:c.zoom,bounds:c.bounds,fill:'#e3e7f1',selected:'#bbc9e5',line:'#46669a',labelLanguages:[['en','English'],[c.lang,'Local names'],['both','English & local names']],boundaryCredit:c.credit};
 const entry="  '"+country+"':{"+JSON.stringify({en:c.en,local:c.local,lang:c.lang,labelCenter:c.center,background:'#f1f0f6',quiz:{level:1}}).slice(1,-1)+",...regional('europe','"+c.prefix+"',"+JSON.stringify(map)+','+JSON.stringify({colors:{levels:c.levels[0],economy:c.economy},levelNames:c.levels,naturalEarth:c.iso})+")},\n";
 registry=registry.replace(' const countries={',' const countries={\n'+entry);
 registry=registry.replace('"Europe": "','"Europe": "'+country+' ');
}
registry=registry.replace("replaces:['russia','ukraine',","replaces:['russia','ukraine','belarus',");fs.writeFileSync('dist/countries.js',registry);
applyEuropeCountryPalettes(Object.keys(additions));
const file='dist/data/country-history.json',history=JSON.parse(fs.readFileSync(file));for(const [country,c]of Object.entries(additions))if(!history.entries.some(e=>e.country===country))history.entries.push({country,name:c.en,addedOn:'2026-10-23',basis:'local-implementation',evidence:{note:'Added locally at the user’s request; no commit or deployment performed.'}});fs.writeFileSync(file,JSON.stringify(history,null,2)+'\n');
