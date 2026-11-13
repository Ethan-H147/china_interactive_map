import assert from 'node:assert/strict';
import fs from 'node:fs';
import sharp from 'sharp';
const vendor='dist/vendor/';
const image=async svg=>sharp(Buffer.from(svg)).resize(384,384).flatten({background:'#fff'}).removeAlpha().raw().toBuffer();
for(const [flag,icon,viewBox]of [['ca','canada-maple-leaf.svg','2600 200 4400 4400'],['in','india-chakra.svg','-10 -10 20 20']]){
 const original=fs.readFileSync(vendor+'flag-'+flag+'.svg','utf8').replace(/<svg\b[^>]*>/,tag=>tag.replace(/width="[^"]+"/,'width="384"').replace(/height="[^"]+"/,'height="384"').replace(/viewBox="[^"]+"/,'viewBox="'+viewBox+'"'));
 const [actual,expected]=await Promise.all([image(fs.readFileSync(vendor+icon,'utf8')),image(original)]);
 assert.equal(actual.length,expected.length);let difference=0,maximum=0;for(let i=0;i<actual.length;i++){const delta=Math.abs(actual[i]-expected[i]);difference+=delta;maximum=Math.max(maximum,delta);}
 assert(difference/actual.length<.1&&maximum<=4,flag+' loader matches the actual flag emblem, including antialiased edges');
}
const source=fs.readFileSync('scripts/symbol-sources/aztec-sun-stone.svg','utf8');assert(!/<(?:script|image|foreignObject)\b/i.test(source),'Retained Sun Stone artwork is self-contained vector geometry');
const stone=await sharp(vendor+'mexico-sun-stone.webp').metadata();assert.equal(stone.width,256);assert.equal(stone.height,256);assert(stone.hasAlpha);assert(fs.statSync(vendor+'mexico-sun-stone.webp').size<150000);
const rgba=await sharp(vendor+'mexico-sun-stone.webp').ensureAlpha().raw().toBuffer();assert.equal(rgba[3],0,'Sun Stone corners remain transparent');
console.log('Country loading artwork: Canada and India match rendered flag pixels; Sun Stone stays transparent, self-contained and compact.');
