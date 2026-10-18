import fs from 'node:fs';
import {createHash} from 'node:crypto';
import {municipalSourceRequest} from './municipal-source-request.mjs';
import {flagThumbnail} from './flag-thumbnail.mjs';
const review=JSON.parse(fs.readFileSync('scripts/canada-municipal-fotw-flag-files.json'));
fs.mkdirSync('dist/vendor/canada-municipal-flags',{recursive:true});
for(const flag of Object.values(review.flags)){
 let bytes=fs.existsSync('dist/'+flag.full)?fs.readFileSync('dist/'+flag.full):null;
 if(!bytes){const response=await municipalSourceRequest(flag.source);if(!response.ok)throw Error('Flag source '+response.status+' '+flag.name);bytes=Buffer.from(await response.arrayBuffer());await new Promise(resolve=>setTimeout(resolve,1100));}
 if(createHash('sha256').update(bytes).digest('hex')!==flag.sha256)throw Error('Reviewed original changed: '+flag.name);
 fs.writeFileSync('dist/'+flag.full,bytes);fs.writeFileSync('dist/'+flag.file,await flagThumbnail(bytes,flag));
}
fs.writeFileSync('dist/data/canada-municipal-fotw-flag-sources.json',JSON.stringify(review,null,1)+'\n');
console.log('Verified '+Object.keys(review.flags).length+' retained Canadian specialist flag originals and thumbnails.');
