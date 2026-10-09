import fs from 'node:fs';

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
