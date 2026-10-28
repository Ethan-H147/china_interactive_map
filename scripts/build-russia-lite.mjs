// Lighter copies of Russia's region and district files for overview zooms. The full survey
// detail (673,000 points nationally; 207,000 in Krasnoyarsk Krai alone) is far finer than a
// screen pixel until about zoom 7, so the map opens with these copies and swaps each area to
// its full file once the camera zooms past that (regional-country.mjs, c.lite).
// Douglas–Peucker keeps every point within 150 m (about 0.002°) of the full line, under half a
// pixel at zoom 7; shared borders are rebuilt from the simplified regions so neighbours still meet.
import fs from 'node:fs';
import {gzipSync} from 'node:zlib';
import {load,polygons} from './geo-index.mjs';
import {command,sharedBorders} from './build-regional-dataset.mjs';
const base='dist/data/russia/',out=base+'lite/',files=['first.bin',...fs.readdirSync(base+'second').filter(f=>f.endsWith('.bin')).map(f=>'second/'+f)];
const count=fc=>fc.features.reduce((n,f)=>n+polygons(f.geometry).flat(2).length,0);
let before=0,after=0;
for(const file of files){
 const data=load(base+file);
 // Chukotka runs past 180°, which makes mapshaper treat a file as planar degrees: 0.002° is
 // ≈220 m north–south and under 100 m east–west at these latitudes (a zoom-7 pixel is 0.0055°).
 const planar=JSON.stringify(data.regions.features.map(f=>f.geometry)).match(/\[(1[89]\d|2\d\d)\.\d+/),interval=planar?'0.002':'150';
 const regions=await command(data.regions,`-simplify dp interval=${interval} keep-shapes`,{precision:.000001});
 assert(regions.features.length===data.regions.features.length,file+' keeps every unit');
 const lite={...data,regions,boundaries:sharedBorders(regions)};
 fs.mkdirSync(out+file.slice(0,file.lastIndexOf('/')+1),{recursive:true});fs.writeFileSync(out+file,gzipSync(JSON.stringify(lite),{level:9}));
 before+=count(data.regions);after+=count(regions);
}
function assert(ok,message){if(!ok)throw Error(message);}
console.log('Russia lite copies:',files.length,'files,',before,'->',after,'points;',(fs.statSync(base+'first.bin').size/1e6).toFixed(1),'->',(fs.statSync(out+'first.bin').size/1e6).toFixed(2),'MB first level,',(fs.statSync(base+'second/RU-KYA.bin').size/1e6).toFixed(2),'->',(fs.statSync(out+'second/RU-KYA.bin').size/1e6).toFixed(2),'MB Krasnoyarsk Krai.');
