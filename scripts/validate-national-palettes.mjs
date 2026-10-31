import fs from 'node:fs';
import assert from 'node:assert/strict';
import '../dist/countries.js';
import {nationalFlagPalettes,nationalCountryPalettes} from './national-country-palettes.mjs';
const hex=value=>value.length===4?'#'+value.slice(1).split('').map(c=>c+c).join(''):value;
function hue(color){const rgb=hex(color).slice(1).match(/../g).map(c=>parseInt(c,16)/255),max=Math.max(...rgb),min=Math.min(...rgb),d=max-min;if(d<.04)return null;const [r,g,b]=rgb;return ((max===r?(g-b)/d:max===g?2+(b-r)/d:4+(r-g)/d)*60+360)%360;}
const luminance=color=>hex(color).slice(1).match(/../g).map(c=>parseInt(c,16)/255).map(c=>c<=.04045?c/12.92:((c+.055)/1.055)**2.4).reduce((s,c,i)=>s+c*[.2126,.7152,.0722][i],0);
const css=fs.readFileSync('dist/atlas-theme.css','utf8');
for(const [country,p] of Object.entries(nationalFlagPalettes)){
 const c=AtlasCountries.countries[country],svg=fs.readFileSync('dist/vendor/flag-'+c.prefix+'.svg','utf8'),colors=[...svg.matchAll(/#[\da-f]{6}\b|#[\da-f]{3}\b/gi)].map(m=>hue(m[0])).concat(/fill=["']gold["']/.test(svg)?[hue('#ffd700')]:[]).filter(n=>n!==null);
 for(const swatch of [p.primary,p.secondary,p.land||p.primary,...p.flag]){const h=hue(swatch);if(h===null)continue;assert(colors.some(v=>Math.min(Math.abs(v-h),360-Math.abs(v-h))<18),country+' color must come from its national flag: '+swatch);}
 const palette=nationalCountryPalettes[country],rule=css.split(':root[data-atlas='+country+']')[1].split('}')[0],paper=rule.match(/--paper:(#[\da-f]{6})/i)[1];for(const color of [palette.accent,palette.secondary])assert((luminance(paper)+.05)/(luminance(color)+.05)>=4.5,country+' theme text contrast');assert.equal(c.map.fill,palette.fill);assert.equal(c.map.selected,palette.selected);assert.equal(c.map.line,palette.line);assert.equal(c.background,palette.background);assert.notEqual(c.map.fill,c.map.selected);assert(css.includes('--header-stripe:'+palette.stripe),country+' flag stripe');
}
console.log('All 41 new country themes match their flag hues; interface and map colors agree.');
