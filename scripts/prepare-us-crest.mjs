import fs from 'node:fs';
import crypto from 'node:crypto';

const source=fs.readFileSync(new URL('symbol-sources/us-great-seal.svg',import.meta.url),'utf8');
// This retained, public-domain drawing is also the artwork in the reference.
// Select the crest group itself, rather than hiding the eagle behind a crop.
function element(id){
 const opening=new RegExp(`<([\\w:-]+)\\b[^>]*\\bid="${id}"[^>]*>`).exec(source);
 if(!opening)throw Error('Missing Great Seal element: '+id);
 if(opening[0].endsWith('/>'))return opening[0];
 const tags=new RegExp(`</?${opening[1]}\\b[^>]*>`,'g');
 tags.lastIndex=opening.index;
 let depth=0;
 for(let tag;tag=tags.exec(source);){
  if(tag[0].startsWith('</'))depth--;else if(!tag[0].endsWith('/>'))depth++;
  if(!depth)return source.slice(opening.index,tags.lastIndex);
 }
 throw Error('Unclosed Great Seal element: '+id);
}
const crest=element('g308').replace(/ transform="[^"]*"/,'');
const definitions=new Map();
function references(xml){
 for(const match of xml.matchAll(/(?:url\(#|(?:xlink:)?href="#)([\w-]+)/g)){
  const id=match[1];
  if(definitions.has(id))continue;
  const definition=element(id);
  definitions.set(id,definition);
  references(definition);
 }
}
references(crest);
const svg='<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" viewBox="-85 -637 147 147" width="147" height="147"><title>Thirteen-star crest from the Great Seal of the United States</title><defs>'+[...definitions.values()].join('')+'</defs>'+crest+'</svg>\n';
fs.writeFileSync(new URL('../dist/vendor/us-crest.svg',import.meta.url),svg);
console.log('Extracted the US star, ray and cloud crest: '+Buffer.byteLength(svg)+' bytes; source SHA-256 '+crypto.createHash('sha256').update(source).digest('hex'));
