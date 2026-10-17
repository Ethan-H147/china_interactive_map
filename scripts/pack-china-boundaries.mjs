import fs from 'node:fs';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {gzipSync,gunzipSync} from 'node:zlib';
import {readDataText} from './read-data.mjs';
import {encodePack,decodePack} from '../dist/china-pack.mjs';
import {describeChina,describeRegion} from '../dist/china-sources.mjs';
import {borderIndex,hiddenSegments} from '../dist/adaptive-lines.mjs';
import {chinaShore} from './china-shore.mjs';
import {assertNearGeo} from './geo-compare.mjs';
import {OVERVIEW_SCALE} from '../dist/china-sources.mjs';

// The gzip JSON files remain the build inputs. Visitors download this packed copy,
// which shares each coordinate between provinces, subdivisions, lines and districts,
// rounded to 1e-7 degrees (dist/china-pack.mjs).
const texts={
 display:readDataText('display-boundaries.json'),
 districts:gunzipSync(fs.readFileSync('dist/data/city-districts.bin')).toString('utf8'),
 fragments:gunzipSync(fs.readFileSync('dist/data/fill-fragments.bin')).toString('utf8')
};
const sha=text=>createHash('sha256').update(text).digest('hex');
// Outline segments that must not be stroked: those on an international line drawn
// by its own layer, province coasts (china-shore.mjs), and those already drawn once in the same layer.
// China's land frontiers with its other neighbours are drawn by the shared frontier layer
// (atlas-frontiers.bin) as long continuous lines, so the province outline leaves them too: cut into
// short pieces, each fading in by its own length, it drew them unevenly.
const borderFiles=['shared-context-borders.bin','russia/international.bin'],borderText=borderFiles.map(f=>gunzipSync(fs.readFileSync('dist/data/'+f)).toString('utf8'));
borderText.push(JSON.stringify({type:'FeatureCollection',features:JSON.parse(gunzipSync(fs.readFileSync('dist/data/atlas-frontiers.bin'))).features.filter(f=>(' '+f.properties.countries+' ').includes(' china '))}));
const inputs=Object.fromEntries(Object.entries(texts).map(([key,text])=>[key,JSON.parse(text)]));
const borders=borderIndex({features:borderText.flatMap(t=>JSON.parse(t).features)});
const lineOmissions={...Object.fromEntries(Object.entries(inputs.display.boundaries).map(([name,geometry])=>[name,hiddenSegments(geometry,name==='province'?{borders,hide:chinaShore(inputs.display)}:{})])),districts:hiddenSegments(inputs.districts.boundaries)};
const sources={...Object.fromEntries(Object.entries(texts).map(([key,text])=>[key,sha(text)])),borders:sha(borderText.join('\n'))};
const packed=gzipSync(encodePack({...inputs,lineOmissions,sources}),{level:9});
const decoded=decodePack(gunzipSync(packed));
const worst=Math.max(...Object.keys(texts).map(key=>assertNearGeo(decoded[key],inputs[key],'Packed '+key)));
assert.deepEqual(decoded.lineOmissions,lineOmissions);
fs.writeFileSync('dist/data/china-boundaries.pack.bin',packed);
// China's first view draws from the same geometry rounded to 1e-4 degrees (at most 5.6 m, a
// small fraction of a pixel at the zooms it is used for) while the full pack loads.
const overview=gzipSync(encodePack({...inputs,lineOmissions,sources},{scale:OVERVIEW_SCALE}),{level:9});
assertNearGeo(decodePack(gunzipSync(overview)).display,inputs.display,'Overview display',0.5/OVERVIEW_SCALE*(1+1e-9));
fs.writeFileSync('dist/data/china-overview.pack.bin',overview);
// Names, bounds and part counts let the page work without the geometry; taken from the source geometry.
fs.writeFileSync('dist/data/china-regions.json',JSON.stringify(describeChina(inputs)));
const before=JSON.parse(fs.readFileSync('dist/data/display-boundaries.parts.json')).compressedBytes+fs.statSync('dist/data/city-districts.bin').size+fs.statSync('dist/data/fill-fragments.bin').size;
console.log(`Region index: ${(fs.statSync('dist/data/china-regions.json').size/1024).toFixed(0)} KB. Packed China boundaries: ${(packed.length/1048576).toFixed(2)} MB (from ${(before/1048576).toFixed(2)} MB; overview ${(overview.length/1048576).toFixed(2)} MB), every coordinate within ${(worst*111320*1000).toFixed(1)} mm after decoding. Hidden outline segments: ${Object.entries(lineOmissions).map(([k,r])=>k+' '+r.reduce((n,x)=>n+x[2],0)).join(', ')}.`);

// Developer mode: every county-level division of mainland China (prepare-china-counties.mjs), as a
// pack of its own loaded after China's map is ready; it replaces the five-city district overlay.
if(fs.existsSync('dist/data/china-counties.bin')){
 const countiesText=gunzipSync(fs.readFileSync('dist/data/china-counties.bin')).toString('utf8'),counties=JSON.parse(countiesText);
 const empty={type:'FeatureCollection',features:[]};
 const countyPack=gzipSync(encodePack({display:{provinces:empty,subdivisions:empty,boundaries:{}},districts:counties,fragments:{},lineOmissions:{districts:hiddenSegments(counties.boundaries)},sources:{districts:sha(countiesText)}}),{level:9});
 const countyDecoded=decodePack(gunzipSync(countyPack));
 assertNearGeo(countyDecoded.districts,counties,'Packed counties');
 fs.writeFileSync('dist/data/china-counties.pack.bin',countyPack);
 fs.writeFileSync('dist/data/china-counties-regions.json',JSON.stringify({districts:counties.regions.features.map(describeRegion)}));
 for(const old of ['china-boundaries-dev.pack.bin','china-regions-dev.json'])fs.rmSync('dist/data/'+old,{force:true});
 console.log(`County pack with ${counties.regions.features.length} counties: ${(countyPack.length/1048576).toFixed(2)} MB; index ${(fs.statSync('dist/data/china-counties-regions.json').size/1024).toFixed(0)} KB.`);
}
