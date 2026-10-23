import fs from 'node:fs';
import assert from 'node:assert/strict';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
import {europeCountryPalettes,themeVariables} from './europe-country-palettes.mjs';
export function applyEuropeCountryPalettes(requested=Object.keys(europeCountryPalettes)){
 let registry=fs.readFileSync('dist/countries.js','utf8'),css=fs.readFileSync('dist/atlas-theme.css','utf8'),menu=fs.readFileSync('dist/country-menu.css','utf8');
 for(const country of requested){const p=europeCountryPalettes[country];assert(p,'Country palette '+country);
  const start=registry.search(new RegExp('^  (?:'+country+"|'"+country+"'):\\{",'m'));assert(start>=0,'Country declaration '+country);const tail=registry.slice(start+1),next=tail.search(/^  (?:[a-z][a-z-]*|'[^']+'):\{/m),end=next>=0?start+1+next:registry.indexOf('\n };',start);assert(end>start);let entry=registry.slice(start,end);
  for(const [key,value]of Object.entries({background:p.background,fill:p.fill,selected:p.selected,line:p.line})){const match=new RegExp('((?:"'+key+'"|'+key+')\\s*:\\s*)[\'"]#[a-fA-F0-9]{6}[\'"]','g');const hits=[...entry.matchAll(match)];assert.equal(hits.length,1,country+' declares one '+key);entry=entry.replace(match,(_,before)=>before+JSON.stringify(value));}
  registry=registry.slice(0,start)+entry+registry.slice(end);
  const selector=':root[data-atlas='+country+'],body[data-atlas='+country+'],.country-option[data-atlas='+country+']',rule=selector+'{'+Object.entries(themeVariables(p)).map(([k,v])=>k+':'+v).join(';')+'}';
  const pattern=new RegExp('^:root\\[data-atlas='+country+'\\][^\\n]*','m');css=pattern.test(css)?css.replace(pattern,rule):css.replace(/\s*$/,'')+'\n'+rule+'\n';
  // Baltic menu-only partial rules previously overrode the complete theme.
  menu=menu.replace(new RegExp('^body\\[data-atlas='+country+'\\]\\{[^\\n]*\\}\\r?\\n?','m'),'');
 }
 fs.writeFileSync('dist/countries.js',registry);fs.writeFileSync('dist/atlas-theme.css',css);fs.writeFileSync('dist/country-menu.css',menu);console.log('Applied coordinated flag palettes:',requested.join(', '));
}
if(process.argv[1]&&pathToFileURL(path.resolve(process.argv[1])).href===import.meta.url)applyEuropeCountryPalettes(process.argv.slice(2).length?process.argv.slice(2):undefined);
