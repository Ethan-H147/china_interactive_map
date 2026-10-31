import fs from 'node:fs';import assert from 'node:assert/strict';import {pathToFileURL} from 'node:url';
import {definitions} from './americas-completion-definitions.mjs';import {themeVariables} from './europe-country-palettes.mjs';
// Keep generated country declarations and all interface variables on the shared flag palettes.
export function applyAmericasPaletteText(registry,css){
 for(const d of definitions){
  const entry=new RegExp('^  '+JSON.stringify(d.country)+':\\{.*\\},\\r?$','m');assert(entry.test(registry),'Existing Americas country '+d.country);
  registry=registry.replace(entry,line=>{line=line.replace(/background:"#[a-f0-9]+"/,'background:'+JSON.stringify(d.background));for(const key of ['fill','selected','line'])line=line.replace(new RegExp('"'+key+'":"#[a-f0-9]+"'),'"'+key+'":'+JSON.stringify(d[key]));return line;});
  const rule=':root[data-atlas='+d.country+'],body[data-atlas='+d.country+'],.country-option[data-atlas='+d.country+']{'+Object.entries(themeVariables(d)).map(([key,value])=>key+':'+value).join(';')+'}',pattern=new RegExp('^:root\\[data-atlas='+d.country+'\\][^\\n]*','m');css=pattern.test(css)?css.replace(pattern,rule):css+'\n'+rule+'\n';
 }return{registry,css};
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){const output=applyAmericasPaletteText(fs.readFileSync('dist/countries.js','utf8'),fs.readFileSync('dist/atlas-theme.css','utf8'));fs.writeFileSync('dist/countries.js',output.registry);fs.writeFileSync('dist/atlas-theme.css',output.css);console.log('Applied full flag-based map and interface palettes to all '+definitions.length+' Americas additions.');}
