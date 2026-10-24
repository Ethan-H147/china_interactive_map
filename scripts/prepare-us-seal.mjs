import fs from 'node:fs';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url),{DOMParser,XMLSerializer}=require('@xmldom/xmldom');
const source=fs.readFileSync(new URL('symbol-sources/us-great-seal.svg',import.meta.url),'utf8');
const document=new DOMParser().parseFromString(source,'image/svg+xml'),root=document.documentElement;
const elements=Array.from(root.getElementsByTagName('*'));
const crest=elements.find(e=>e.getAttribute('id')==='g308'),seal=elements.find(e=>e.getAttribute('id')==='g810');
if(!crest||!seal||crest.parentNode!==seal)throw Error('Great Seal structure changed; inspect the crest placement.');
// The static seal is rasterized once; its separately composited crest can turn
// without redrawing the eagle, ribbon or outer ring on every animation frame.
crest.parentNode.removeChild(crest);
for(const child of Array.from(root.childNodes))if(child.nodeType===1&&['namedview','metadata'].includes(child.localName))root.removeChild(child);
root.setAttribute('viewBox','0 0 600 600');root.setAttribute('width','600');root.setAttribute('height','600');
fs.writeFileSync(new URL('../dist/vendor/us-seal-base.svg',import.meta.url),new XMLSerializer().serializeToString(root).replace(/[ \t]+$/gm,'')+'\n');
console.log('Prepared the full US seal with its crest removed for a separate rotating overlay.');
