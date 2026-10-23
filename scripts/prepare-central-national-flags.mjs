import fs from 'node:fs';
import {load} from './geo-index.mjs';
import {source,root} from './fetch-central-europe.mjs';
export function prepareCentralNationalFlags(){
 const manifest=load(root+'manifest.json'),flags=load('dist/data/europe/flag-sources.json'),prefix='export const nationalFlagImages=',text=fs.readFileSync('dist/national-flags.mjs','utf8'),national=JSON.parse(text.slice(text.indexOf(prefix)+prefix.length).trim().replace(/;$/,'')),images=load('dist/data/flag-images.json');
 for(const[country,code,width,height]of [['austria','at',900,600],['hungary','hu',1200,600],['slovenia','si',1200,600]]){const name='flag-'+code+'.svg',file='vendor/'+name;fs.writeFileSync('dist/'+file,source(name));const flag={file,full:file,width,height,page:'https://commons.wikimedia.org/wiki/File:Flag_of_'+({austria:'Austria',hungary:'Hungary',slovenia:'Slovenia'})[country]+'.svg',source:manifest.files[name].url,credit:'Wikimedia Commons · national flag artwork',license:'Public domain',sha256:manifest.files[name].sha256};flags.flags[country]=flag;national[file]=flag;images[file]=flag;}
 fs.writeFileSync('dist/data/europe/flag-sources.json',JSON.stringify(flags,null,2)+'\n');fs.writeFileSync('dist/national-flags.mjs','// Original national artwork and dimensions, independent of thumbnail proportions.\n'+prefix+JSON.stringify(national)+';\n');fs.writeFileSync('dist/data/flag-images.json',JSON.stringify(images));
 const file='dist/data/europe/austria/statistics.json';if(fs.existsSync(file)){const stats=load(file);stats.sources.eurostatGdp={...stats.sources.eurostatGdp,title:'Eurostat · GDP at current market prices by NUTS 2 region',url:'https://ec.europa.eu/eurostat/databrowser/view/nama_10r_2gdp/default/table'};fs.writeFileSync(file,JSON.stringify(stats));}
}
if(process.argv[1]?.endsWith('prepare-central-national-flags.mjs'))prepareCentralNationalFlags();
