import fs from 'node:fs';
import {definitions} from './west-asia-definitions.mjs';
let registry=fs.readFileSync('dist/countries.js','utf8');
for(const d of definitions){
 const map={countryStatistics:d.iso,countryProfile:false,firstLabel:d.levels[0],...(d.levels[1]?{secondLabel:d.levels[1]}:{}),...(d.levels[2]?{thirdLabel:d.levels[2]}:{}),statistics:true,deferOutlines:true,parallelDetails:true,dedicatedFrontier:true,searchLabel:d.country==='iran'?'Find a province, county or code':d.country==='iraq'?'Find a governorate, district or subdistrict':'Find a region or governorate',labelLanguages:d.languages,center:d.center,zoom:d.zoom,bounds:d.bounds,fill:d.fill,selected:d.selected,line:d.line,boundaryCredit:d.country==='iraq'?'OCHA HDX COD-AB · CC BY-IGO; Halabja split © OpenStreetMap contributors, ODbL 1.0':'OCHA HDX COD-AB · dated administrative reference, CC BY-IGO'};
 const entry=JSON.stringify(d.country)+':{en:'+JSON.stringify(d.en)+',local:'+JSON.stringify(d.local)+',lang:'+JSON.stringify(d.lang)+',labelCenter:'+JSON.stringify(d.center)+',background:'+JSON.stringify(d.background)+',quiz:{level:1},...regional(\'europe\','+JSON.stringify(d.prefix)+','+JSON.stringify(map)+','+JSON.stringify({colors:{levels:d.levels[0],economy:false},levelNames:d.levels,naturalEarth:d.iso})+')},';
 const existing=new RegExp('^  '+JSON.stringify(d.country)+':\\{.*\\},\\r?$','m');
 registry=existing.test(registry)?registry.replace(existing,'  '+entry):registry.replace(' const countries={',' const countries={\n  '+entry);
}
registry=registry.replace(/("Asia": ")([^"]*)"/,(_,prefix,countries)=>prefix+[...new Set([...definitions.map(d=>d.country),...countries.split(' ')])].join(' ')+'"');
fs.writeFileSync('dist/countries.js',registry);
let css=fs.readFileSync('dist/atlas-theme.css','utf8');
for(const d of definitions)if(!css.includes('[data-atlas='+d.country+']'))css+='\n:root[data-atlas='+d.country+'],body[data-atlas='+d.country+'],.country-option[data-atlas='+d.country+']{--red:'+d.line+';--red-dark:'+d.line+';--ink:#293a36;--muted:#71817a;--gold:#ad893e;--line:#dce5df;--paper:#fcfdfa;--map:'+d.background+';--surface-soft:'+d.fill+';--accent-soft:'+d.selected+';--header-stripe:'+d.stripe+'}\n';
fs.writeFileSync('dist/atlas-theme.css',css);
const history=JSON.parse(fs.readFileSync('dist/data/country-history.json'));
for(const d of definitions)if(!history.entries.some(e=>e.country===d.country))history.entries.push({country:d.country,name:d.en,addedOn:'2026-10-27',basis:'local-implementation',evidence:{note:'Added regional maps and sourced subdivision statistics locally; country overview remains hidden.',paths:['dist/countries.js','scripts/build-west-asia.mjs']}});
fs.writeFileSync('dist/data/country-history.json',JSON.stringify(history,null,2)+'\n');
const pkg=JSON.parse(fs.readFileSync('package.json'));
Object.assign(pkg.scripts,{'fetch:west-asia':'node scripts/fetch-west-asia.mjs','build:west-asia':'node scripts/register-west-asia.mjs && node --max-old-space-size=10000 scripts/build-west-asia.mjs && node --max-old-space-size=10000 scripts/build-west-asia-depth.mjs && node scripts/prepare-region-colors.mjs iran iraq saudi-arabia && node --max-old-space-size=10000 scripts/build-west-asia-assets.mjs && npm run build:khor-al-adaid','build:west-asia-depth':'node scripts/register-west-asia.mjs && node --max-old-space-size=10000 scripts/build-west-asia-depth.mjs && node scripts/prepare-region-colors.mjs iran iraq saudi-arabia && npm run build:khor-al-adaid','test:west-asia':'node scripts/validate-west-asia.mjs && node scripts/validate-west-asia-depth.mjs && node scripts/browser/run.mjs west-asia'});
fs.writeFileSync('package.json',JSON.stringify(pkg,null,2)+'\n');
