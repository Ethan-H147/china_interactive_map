// Sidebar cards load 1200-pixel-wide copies; the photo viewer keeps the full-resolution originals.
import fs from 'node:fs/promises';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url);
const sharp=require(process.env.ATLAS_SHARP||'sharp');
const width=1200,file='dist/data/landmarks.json';
const gallery=JSON.parse(await fs.readFile(file));
await fs.mkdir('dist/photos/display',{recursive:true});
for(const place of gallery.landmarks){
 const src=place.photo.src.replace('photos/','photos/display/');
 const out=await sharp('dist/'+place.photo.src).resize({width,withoutEnlargement:true}).webp({quality:82,effort:5}).toFile('dist/'+src);
 place.photo.display={src,width:out.width,height:out.height};
 console.log(place.id,out.width+' × '+out.height,Math.round(out.size/1024)+' KB');
}
await fs.writeFile(file,JSON.stringify(gallery,null,2));
