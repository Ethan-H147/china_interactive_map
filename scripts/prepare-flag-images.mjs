import fs from 'node:fs';
import path from 'node:path';
const read=file=>JSON.parse(fs.readFileSync(file)),images={},out='dist/vendor/flag-originals';
fs.mkdirSync(out,{recursive:true});
function add(flag){
 if(!flag?.file)return;
 let full=flag.original||flag.source||flag.url||flag.file;
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
Object.assign(images,national);
fs.writeFileSync('dist/national-flags.mjs','// Original national artwork and dimensions, independent of thumbnail proportions.\nexport const nationalFlagImages='+JSON.stringify(national)+';\n');
fs.writeFileSync('dist/data/flag-images.json',JSON.stringify(images));
console.log('Shared flag image catalogue:',Object.keys(images).length,'sourced flags.');
