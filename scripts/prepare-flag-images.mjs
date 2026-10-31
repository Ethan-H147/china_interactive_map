import fs from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';
import {createHash} from 'node:crypto';
const read=file=>JSON.parse(fs.readFileSync(file)),images={},out='dist/vendor/flag-originals';
fs.mkdirSync(out,{recursive:true});
function add(flag){
 if(!flag?.file)return;
 let full=flag.full||flag.original||flag.source||flag.url||flag.file;
 if(flag.originalFile&&fs.existsSync(flag.originalFile)){
  const file=path.basename(flag.originalFile);fs.copyFileSync(flag.originalFile,out+'/'+file);full='vendor/flag-originals/'+file;
 }
 images[flag.file]={full,credit:flag.credit||flag.attribution||flag.author||'Wikimedia Commons',license:flag.license||'Official flag artwork',source:flag.page};
}
for(const country of ['brazil','argentina','malaysia'])Object.values(read('dist/data/'+country+'-flag-sources.json').flags).forEach(add);
Object.values(read('dist/data/japan-facts.json')).forEach(record=>add(record.flag));
Object.values(read('dist/data/japan-local-flags.json').flags).forEach(add);
const russia=read('dist/data/russia/sources.json');Object.values(russia.flags).forEach(add);Object.values(russia.cityFlags).forEach(add);
const national=Object.fromEntries(Object.values(read('dist/data/national-flag-sources.json').flags).map(flag=>[flag.file,flag]));
const southern=read('dist/data/southern-africa/flag-sources.json').flags;
for(const [id,flag] of Object.entries(southern))if(['south-africa','eswatini','lesotho'].includes(id))national[flag.file]=flag;else add(flag);
const newFlags=read('dist/data/botswana-namibia-flag-sources.json');
Object.values(newFlags.flags).forEach(add);Object.values(newFlags.nationalFlags).forEach(flag=>{national[flag.file]=flag;});
Object.values(read('dist/data/europe/flag-sources.json').flags).forEach(flag=>{national[flag.file]=flag;});
Object.values(read('dist/data/europe/subdivision-flag-sources.json').flags).forEach(add);
const atlantic='dist/data/atlantic-flag-sources.json';
if(fs.existsSync(atlantic))Object.values(read(atlantic).flags).forEach(add);
const oceania='dist/data/oceania-flag-sources.json';
if(fs.existsSync(oceania))Object.values(read(oceania).flags).forEach(add);
const antarctic='dist/data/antarctica/flag-sources.json';
if(fs.existsSync(antarctic))Object.values(read(antarctic).flags).forEach(add);
const mexicoStates='dist/data/mexico-state-flag-sources.json';
if(fs.existsSync(mexicoStates))Object.values(read(mexicoStates).flags).forEach(add);
const northAmerica='dist/data/north-america-flag-sources.json';
if(fs.existsSync(northAmerica))Object.values(read(northAmerica).flags).forEach(add);
for(const source of ['dist/data/canada-municipal-flag-sources.json','dist/data/canada-municipal-fotw-flag-sources.json'])if(fs.existsSync(source))Object.values(read(source).flags).forEach(add);
const municipalExtra='dist/data/us-municipal-fotw-flag-sources.json';
if(fs.existsSync(municipalExtra))Object.values(read(municipalExtra).flags).forEach(add);
const municipal='dist/data/us-municipal-flag-sources.json';
if(fs.existsSync(municipal))Object.values(read(municipal).flags).forEach(add);
const baltic='dist/data/baltic-flag-sources.json';
if(fs.existsSync(baltic))Object.values(read(baltic).flags).forEach(add);
const soviet='dist/data/soviet-flag-sources.json';
if(fs.existsSync(soviet))Object.values(read(soviet).flags).forEach(add);
const centralEurope='dist/data/central-europe-flag-sources.json';
if(fs.existsSync(centralEurope))Object.values(read(centralEurope).flags).forEach(add);
// Administration artwork remains local to its country adapter.
if(fs.existsSync('dist/horn-islands-flags.mjs')){const {hornIslandsFlags}=await import('../dist/horn-islands-flags.mjs');for(const set of Object.values(hornIslandsFlags))for(const flag of Object.values({...set.firstFlags,...set.detailFlags}))images[flag.file]=flag;}
const majorCities='dist/data/major-city-flag-sources.json';
if(fs.existsSync(majorCities))Object.values(read(majorCities).flags).forEach(add);
const regional='dist/data/regional-flag-sources.json';
if(fs.existsSync(regional))Object.values(read(regional).flags).forEach(add);
const liberia='dist/data/liberia-flag-sources.json';
if(fs.existsSync(liberia))Object.values(read(liberia).flags).forEach(add);
const expansion='dist/data/europe-expansion-flag-sources.json';
if(fs.existsSync(expansion))Object.values(read(expansion).flags).forEach(add);
// The UK thumbnail uses separate 3:5 artwork; the viewer keeps its 1:2 original.
national['vendor/flag-gb-3x5.svg']={...national['vendor/flag-gb.svg'],file:'vendor/flag-gb-3x5.svg',thumbnail:{width:1000,height:600,source:'https://commons.wikimedia.org/wiki/File:Flag_of_the_United_Kingdom_(3-5).svg',license:'Public domain',sha256:createHash('sha256').update(fs.readFileSync('dist/vendor/flag-gb-3x5.svg')).digest('hex')}};
// Custom Irish thumbnail uses equal stripes at 2:3; the viewer keeps the original.
national['vendor/flag-ie-2x3.svg']={...national['vendor/flag-ie.svg'],file:'vendor/flag-ie-2x3.svg',thumbnail:{width:900,height:600,source:national['vendor/flag-ie.svg'].page,method:'Custom 2:3 artwork with equal stripes and original colors',license:'Public domain',sha256:createHash('sha256').update(fs.readFileSync('dist/vendor/flag-ie-2x3.svg')).digest('hex')}};
// Retained SVG and WebP thumbnail variants share the same sourced original artwork.
for(const name of fs.readdirSync('dist/vendor').filter(n=>/^flag-.*\.(svg|webp)$/.test(n))){const file='vendor/'+name;if(!national[file]){const peer=file.replace(/\.(svg|webp)$/,(_,ext)=>ext==='svg'?'.webp':'.svg');if(national[peer])national[file]=national[peer];}}
// Older source manifests omit dimensions; read the retained original without altering it.
for(const flag of Object.values(national))if(!flag.width||!flag.height){const size=await sharp('dist/'+flag.full).metadata();flag.width=size.width;flag.height=size.height;}
Object.assign(images,national);
const cityNamesFile='dist/data/southern-africa/south-africa/place-names-flags.json';
if(fs.existsSync(cityNamesFile))Object.values(read(cityNamesFile).places).forEach(place=>add(place.flag));
if(fs.existsSync('dist/data/poland-flag-sources.json'))Object.entries(read('dist/data/poland-flag-sources.json').flags).forEach(([id,flag])=>{if(id==='poland')national[flag.file]=flag;else add(flag);});
fs.writeFileSync('dist/national-flags.mjs','// Original national artwork and dimensions, independent of thumbnail proportions.\nexport const nationalFlagImages='+JSON.stringify(national)+';\n');
fs.writeFileSync('dist/data/flag-images.json',JSON.stringify(images));
console.log('Shared flag image catalogue:',Object.keys(images).length,'sourced flags.');
