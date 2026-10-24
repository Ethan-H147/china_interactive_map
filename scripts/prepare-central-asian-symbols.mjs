import fs from 'node:fs';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url),{DOMParser,XMLSerializer}=require('@xmldom/xmldom');
const serialize=new XMLSerializer(),vendor=new URL('../dist/vendor/',import.meta.url);
const children=node=>Array.from(node.childNodes).filter(n=>n.nodeType===1);
const read=code=>new DOMParser().parseFromString(fs.readFileSync(new URL('flag-'+code+'.svg',vendor),'utf8'),'image/svg+xml').documentElement;
const xml=node=>serialize.serializeToString(node);

const kz=read('kz'),gold=children(kz)[1],[sun,eagle]=children(gold),[disk,...rays]=children(sun);
if(disk.tagName!=='circle'||disk.getAttribute('r')!=='134.55'||children(eagle).filter(n=>n.tagName==='path').length!==3)throw Error('Kazakhstan flag changed; inspect its sun and eagle before extraction.');
const eagleCopy=eagle.cloneNode(true);
for(const node of children(eagleCopy))if(node.getAttribute('id')==='D'||node.tagName==='use')eagleCopy.removeChild(node);
// Preserve the flag's sun placement and eagle paths, omitting its hoist ornament.
let kazakh='<svg class="country-symbol kazakh-emblem" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" viewBox="340 85 400 320" aria-hidden="true"><g fill="'+gold.getAttribute('fill')+'"><g transform="'+sun.getAttribute('transform')+'">'+xml(disk)+'<g class="symbol-rotor" data-emblem-part="rays">'+rays.map(xml).join('')+'</g></g><g data-emblem-part="eagle">'+xml(eagleCopy)+'</g></g></svg>';
kazakh=kazakh.replace(/id="([ABC])"/g,'id="__atlas_symbol__$1"').replace(/href="#([ABC])"/g,'href="#__atlas_symbol__$1"');

const kg=read('kg'),design=children(kg)[1],d=design.getAttribute('d');
if(design.getAttribute('fill-rule')!=='evenodd'||!d.includes('61.4007')||!d.includes('54.0401'))throw Error('Kyrgyzstan flag changed; inspect its sun and tunduk before extraction.');
// The original compound path contains both the sun and the tunduk. Reuse it
// through complementary masks so only the interior turns, with no red square.
const cx=275.2343335,cy=165.1406,r=54.04;
const kyrgyz='<svg class="country-symbol kyrgyz-emblem" xmlns="http://www.w3.org/2000/svg" viewBox="165.2343335 55.1406 220 220" aria-hidden="true"><defs><path id="__atlas_symbol__design" fill="'+design.getAttribute('fill')+'" fill-rule="evenodd" d="'+d+'"/><mask id="__atlas_symbol__outside" maskUnits="userSpaceOnUse" x="165" y="55" width="221" height="221"><rect x="165" y="55" width="221" height="221" fill="white"/><circle cx="'+cx+'" cy="'+cy+'" r="'+r+'" fill="black"/></mask><clipPath id="__atlas_symbol__inside"><circle cx="'+cx+'" cy="'+cy+'" r="'+r+'"/></clipPath></defs><g data-emblem-part="sun"><use href="#__atlas_symbol__design" mask="url(#__atlas_symbol__outside)"/></g><g transform="translate('+cx+' '+cy+')"><g class="symbol-rotor" data-emblem-part="tunduk"><circle r="'+r+'" fill="red"/><g transform="translate('+(-cx)+' '+(-cy)+')"><use href="#__atlas_symbol__design" clip-path="url(#__atlas_symbol__inside)"/></g></g></g></svg>';

const generated='// BEGIN GENERATED CENTRAL ASIAN SYMBOLS\nconst centralAsianSymbols='+JSON.stringify({'kazakh-sun-eagle':kazakh,'kyrgyz-tunduk':kyrgyz})+';\n// END GENERATED CENTRAL ASIAN SYMBOLS';
const file=new URL('../dist/country-symbols.js',import.meta.url),source=fs.readFileSync(file,'utf8');
fs.writeFileSync(file,source.includes('// BEGIN GENERATED CENTRAL ASIAN SYMBOLS')?source.replace(/\/\/ BEGIN GENERATED CENTRAL ASIAN SYMBOLS[\s\S]*?\/\/ END GENERATED CENTRAL ASIAN SYMBOLS/,()=>generated):source.replace('window.AtlasSymbols=',()=>generated+'\nwindow.AtlasSymbols='));
console.log('Extracted Kazakhstan’s sun/eagle and Kyrgyzstan’s sun/tunduk into inline loading artwork.');
