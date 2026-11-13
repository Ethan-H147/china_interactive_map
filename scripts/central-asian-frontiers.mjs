import {gzipSync,gunzipSync} from 'node:zlib';
import fs from 'node:fs';
import {root,countries} from './fetch-central-asian-frontiers.mjs';
// Global border rebuilds must preserve the same ownership mesh as the fills.
export function preserveCentralAsianFrontiers(){
 if(!fs.existsSync(root+'resolved.bin'))return;
 for(const c of Object.keys(countries)){
  const source=root+'international/'+c+'.bin',target='dist/data/europe/'+c+'/international.bin';
  if(c!=='kazakhstan'){fs.copyFileSync(source,target);continue;}
  const data=JSON.parse(gunzipSync(fs.readFileSync(source)));
  data.features=data.features.filter(f=>!(f.properties.countries==='kazakhstan'&&f.properties.pair==='KAZ-UZB'&&!f.properties.centralAsianReconciliation&&(f.geometry.type==='LineString'?f.geometry.coordinates:f.geometry.coordinates.flat()).every(p=>p[0]>58.5&&p[0]<59.5&&p[1]>45.4&&p[1]<46.1)));
  fs.writeFileSync(target,gzipSync(JSON.stringify(data),{level:9}));
 }
}
