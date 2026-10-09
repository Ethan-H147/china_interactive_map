import fs from 'node:fs';
import path from 'node:path';
import {gunzipSync} from 'node:zlib';
import {createHash} from 'node:crypto';
const cache='artifacts/russia-source';
fs.mkdirSync(cache+'/flags',{recursive:true});
const manifest=JSON.parse(fs.readFileSync('dist/data/russia/sources.json'));
for(const level of [1,2]){
 const file='adm'+level+'.topojson',target=path.join(cache,file);
 if(!fs.existsSync(target)){
  const response=await fetch('https://github.com/wmgeolab/geoBoundaries/raw/'+manifest.boundaries.version+'/releaseData/gbOpen/RUS/ADM'+level+'/geoBoundaries-RUS-ADM'+level+'.topojson');
  if(!response.ok)throw Error('Russia boundary source: '+response.status);
  fs.writeFileSync(target,Buffer.from(await response.arrayBuffer()));
 }
 if(createHash('sha256').update(fs.readFileSync(target)).digest('hex')!==manifest.boundaries.sha256[file])throw Error('Pinned Russia boundary checksum changed: '+file);
}
// Keep the dated federal-city supplement and exact flag inputs reproducible.
for(const name of ['federal-cities-osm.json','zelenograd-osm.json'])fs.writeFileSync(path.join(cache,name),gunzipSync(fs.readFileSync('scripts/boundary-sources/russia/'+name+'.gz')));
for(const name of fs.readdirSync('scripts/flag-sources/russia'))fs.copyFileSync('scripts/flag-sources/russia/'+name,cache+'/flags/'+name);
console.log('Pinned Russia sources ready.');
