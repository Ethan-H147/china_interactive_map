import fs from 'node:fs';
import sharp from 'sharp';
import {fileURLToPath} from 'node:url';

const vendor=new URL('../dist/vendor/',import.meta.url);

// Extract the original flag artwork without changing its paths or colors.
// The source flags and these derived assets share vendor/flags-LICENSE.txt.
const argentina=fs.readFileSync(new URL('flag-ar.svg',vendor),'utf8');
const sun=argentina.replace(/<svg\b[^>]*>/,'<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" viewBox="328 178 144 144" width="144" height="144">').replace(/\s*<rect\b[^>]*\/>/g,'');
fs.writeFileSync(new URL('argentina-sun.svg',vendor),sun);

const brazil=fs.readFileSync(new URL('flag-br.svg',vendor),'utf8');
const backgrounds='<path d="m-2100-1470h4200v2940h-4200z" fill="#009440"/><path d="M -1743,0 0,1113 1743,0 0,-1113 Z" fill="#ffcb00"/>';
if(!brazil.includes(backgrounds))throw new Error('Brazil flag backgrounds changed; inspect the source before extracting its globe.');
const globe=brazil.replace(/<svg\b[^>]*>/,'<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" viewBox="-735 -735 1470 1470" width="1470" height="1470">').replace(backgrounds,'');
fs.writeFileSync(new URL('brazil-globe.svg',vendor),globe);

const uruguay=fs.readFileSync(new URL('flag-uy.svg',vendor),'utf8');
const uruguayBackgrounds='<path d="M-5-5h945v630H-5z" fill="#fff"/><path d="M345 65h595v70H345zm0 140h595v70H345zM-5 345h945v70H-5zm0 140h945v70H-5z" fill="#0038a8"/>';
if(!uruguay.includes(uruguayBackgrounds))throw new Error('Uruguay flag backgrounds changed; inspect the source before extracting its sun.');
const uruguaySun=uruguay.replace(/<svg\b[^>]*>/,'<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" viewBox="35 35 270 270" width="270" height="270">').replace(uruguayBackgrounds,'');
fs.writeFileSync(new URL('uruguay-sun.svg',vendor),uruguaySun);

console.log('Extracted Argentina’s and Uruguay’s suns and Brazil’s globe from the existing national flag SVGs.');

const canada=fs.readFileSync(new URL('flag-ca.svg',vendor),'utf8');
const canadaField='m2400 0h4800v4800h-4800z';
const canadaWhite=canada.match(/<path fill="#fff" d="([^"]+)"\/>/)?.[1];
if(!canadaWhite?.startsWith(canadaField))throw Error('Canada flag geometry changed; review the maple leaf extraction.');
// Retain the original subpath's starting point before its relative move.
const leaf='M2400 0'+canadaWhite.slice(canadaField.length);
fs.writeFileSync(new URL('canada-maple-leaf.svg',vendor),`<svg xmlns="http://www.w3.org/2000/svg" viewBox="2600 200 4400 4400" width="256" height="256"><title>Maple leaf from the flag of Canada</title><path fill="#f00" d="${leaf}"/></svg>\n`);

const india=fs.readFileSync(new URL('flag-in.svg',vendor),'utf8');
const chakra=india.slice(india.indexOf('<circle r="9.25"/>'),india.lastIndexOf('</svg>'));
if(!chakra.startsWith('<circle r="9.25"/>')||!chakra.includes('rotate(120)'))throw Error('India flag geometry changed; review the Ashoka Chakra extraction.');
fs.writeFileSync(new URL('india-chakra.svg',vendor),`<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" viewBox="-10 -10 20 20" width="256" height="256" fill="#07038D"><title>Ashoka Chakra from the flag of India</title>${chakra}</svg>\n`);

// Three heart-shaped leaflets and a stem, drawn for the shared loading icon.
const leaflet='M50 54C35 45 24 31 29 20c5-12 18-11 21-2 3-9 16-10 21 2 5 11-6 25-21 34Z';
fs.writeFileSync(new URL('ireland-shamrock.svg',vendor),`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="256" height="256"><title>Three-leaf shamrock</title><g fill="#169b62"><path d="M50 51c2 18-4 31-11 40l7 4c10-15 12-31 9-43Z"/>${[0,120,240].map(angle=>`<path d="${leaflet}" transform="rotate(${angle} 50 54)"/>`).join('')}</g></svg>\n`);

const stone=fs.readFileSync(new URL('symbol-sources/aztec-sun-stone.svg',import.meta.url),'utf8');
if(!stone.includes('viewBox="0 0 1456 1438"')||!stone.includes('fill="#040404"'))throw Error('Sun Stone source changed; review its viewport and ink.');
const stoneArtwork=stone.replaceAll('fill="#040404"','fill="#715021"').replace(/(<svg\b[^>]*>)/,'$1<defs><clipPath id="stone-disc"><ellipse cx="728" cy="719" rx="728" ry="719"/></clipPath></defs><g clip-path="url(#stone-disc)"><ellipse cx="728" cy="719" rx="728" ry="719" fill="#ecd5a0"/>').replace('</svg>','</g></svg>');
await sharp(Buffer.from(stoneArtwork)).resize(256,256,{fit:'contain',background:{r:0,g:0,b:0,alpha:0}}).webp({lossless:true,effort:6}).toFile(fileURLToPath(new URL('mexico-sun-stone.webp',vendor)));
console.log('Prepared Canada, India, Ireland and Mexico loading artwork. Flag paths and colors are unchanged.');
