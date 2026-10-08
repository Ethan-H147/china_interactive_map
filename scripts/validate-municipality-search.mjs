import assert from 'node:assert/strict';
import fs from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {filterMunicipalities,renderMunicipalityList} from '../dist/municipality-list.mjs';
import {createPlaceSearch} from '../dist/place-search.mjs';
const brazil=JSON.parse(gunzipSync(fs.readFileSync('dist/data/south-america/brazil-local/index.bin'))).records;
const children=brazil.filter(r=>r.parent==='BR-17');assert.equal(children.length,139);
assert.equal(filterMunicipalities(children,'p')[0].en,'Palmas');
assert.equal(filterMunicipalities(children,'  Paraiso do Tocantins  ')[0].en,'Paraíso do Tocantins');
assert.equal(filterMunicipalities(children,'paraíso')[0].en,'Paraíso do Tocantins');
assert.equal(filterMunicipalities(children,'1721000')[0].en,'Palmas');
assert.equal(filterMunicipalities(children,'not-a-municipality').length,0);
assert.equal(filterMunicipalities(children,'').length,139);
assert.equal(createPlaceSearch(brazil)('Palmas Tocantins')[0].id,'BR-1721000');
class Element{
 constructor(tag){this.tag=tag;this.children=[];this.textContent='';this.value='';}
 append(...children){this.children.push(...children);}replaceChildren(...children){this.children=children;}setAttribute(){}
 querySelector(tag){return this.children.find(c=>c.tag===tag);}
 click(){this.onclick?.();}
}
globalThis.document={createElement:tag=>new Element(tag)};const details=new Element('section');let selected;
renderMunicipalityList(details,children,null,r=>selected=r);
const [heading,input,list]=details.children;assert.equal(heading.children[0].textContent,'139');assert.equal(list.children.length,21);
list.children.at(-1).onclick();assert.equal(list.children.length,41,'Show more paginates the full list');
input.value=' p ';input.oninput();assert.equal(list.children[0].textContent,'Palmas');assert.equal(list.children.length,21,'Filtering resets pagination');
input.onkeydown({key:'Enter'});assert.equal(selected.en,'Palmas');input.onkeydown({key:'Escape'});assert.equal(input.value,'');assert.equal(list.children.length,21);
input.value='xyz-no-match';input.oninput();assert.equal(list.children[0].textContent,'No matching municipalities.');input.value='paraíso';input.oninput();assert.equal(list.children[0].textContent,'Paraíso do Tocantins');
console.log('Municipality search: prefix priority, accents, whitespace, codes, qualified global search, pagination, clearing and Enter selection passed.');
