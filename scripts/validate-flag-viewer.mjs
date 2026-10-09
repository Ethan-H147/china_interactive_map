import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createHash} from 'node:crypto';
import {nationalFlagImages} from '../dist/national-flags.mjs';
import {flagImageSize,createFlagViewer} from '../dist/flag-viewer.mjs';

for(const [w,h] of [[3,2],[2,1],[1,1],[1,2]])for(const [vw,vh] of [[1280,720],[390,844],[844,390]]){
 const size=flagImageSize(w,h,vw,vh);assert(Math.abs(size.width/size.height-w/h)<1e-8);assert(size.width+2*size.frame<vw);assert(size.height+2*size.frame<vh);
}
class Element{
 constructor(tag){this.tag=tag;this.dataset={};this.attrs={};this.nodes=[];this.handlers={};this.style={setProperty(){}};}
 append(node){if(node.parent)node.parent.nodes=node.parent.nodes.filter(n=>n!==node);node.parent=this;this.nodes.push(node);}
 set innerHTML(value){if(value.includes('flag-viewer-close')){this.append(new Element('button'));const img=new Element('img');img.id='flag-viewer-image';this.append(img);this.append(new Element('p'));}}
 setAttribute(k,v){this.attrs[k]=v;}getAttribute(k){return k==='src'?this.src:this.attrs[k];}hasAttribute(k){return k in this.attrs;}removeAttribute(k){delete this.attrs[k];if(k==='src')this.src=undefined;}
 matches(s){if(s==='img'||s==='a')return this.tag===s;if(s.includes('img[alt'))return this.tag==='img'&&((this.alt||'').startsWith('Flag of')||['selection-flag','k-selection-flag'].includes(this.id));return false;}
 closest(s){for(let n=this;n;n=n.parent){if(s==='#flag-viewer'&&n.id==='flag-viewer')return n;if(s==='a'&&n.tag==='a')return n;if(s==='[data-flag-trigger]'&&'flagTrigger' in n.dataset)return n;}return null;}
 querySelector(s){return this.nodes.find(n=>n.tag===s);}querySelectorAll(s){return this.nodes.flatMap(n=>[...(n.matches(s)?[n]:[]),...n.querySelectorAll(s)]);}
 addEventListener(type,fn){this.handlers[type]=fn;}focus(){focused=this;}showModal(){this.open=true;}close(){this.open=false;this.handlers.close();}getBoundingClientRect(){return {left:100,top:100,right:1000,bottom:600};}
}
let focused,mutations,requests=0;
const body=new Element('body'),listeners={},probes=[];
const national=new Element('img');national.alt='Flag of China';national.src='vendor/flag-prc.svg';national.naturalWidth=640;national.naturalHeight=480;body.append(national);
const link=new Element('a'),city=new Element('img');city.alt='Flag of Tyumen';city.src='vendor/city.webp';city.naturalWidth=330;city.naturalHeight=220;link.attrs.href='https://commons.wikimedia.org/city';link.title='Official flag · Public domain';link.append(city);body.append(link);
globalThis.location={origin:'https://example.test'};globalThis.innerWidth=1280;globalThis.innerHeight=720;
globalThis.document={body,baseURI:'https://example.test/#russia',createElement:t=>new Element(t),addEventListener:(type,fn)=>listeners[type]=fn};
globalThis.window={addEventListener(){}};
globalThis.MutationObserver=class{constructor(fn){mutations=fn;}observe(){}};
globalThis.Image=class{constructor(){probes.push(this);this.naturalWidth=1500;this.naturalHeight=1000;}decode(){return new Promise((resolve,reject)=>{this.resolve=resolve;this.reject=reject;});}};
globalThis.fetch=async()=>{requests++;return {ok:true,json:async()=>({'vendor/city.webp':{full:'vendor/city-original.svg',credit:'City government',license:'Public domain'}})};};
const viewer=createFlagViewer(),image=viewer.dialog.querySelector('img');
assert.equal(requests,0,'Full flag catalogue loads only when a flag is opened');
assert.equal(national.attrs.role,'button');assert.equal(link.attrs.role,'button');assert(!link.hasAttribute('href'),'Flag sources cannot navigate');
const event=target=>({target,detail:1,preventDefault(){this.prevented=true;},stopImmediatePropagation(){this.stopped=true;}});
const click=event(city);listeners.click(click);assert(click.prevented&&click.stopped);assert(viewer.dialog.open);assert.equal(image.src,city.src);assert.equal(focused.tag,'button');
const flush=()=>new Promise(r=>setImmediate(r));await flush();assert.equal(probes.length,1);probes[0].resolve();await flush();assert.equal(image.src,'vendor/city-original.svg');
viewer.close();assert.equal(focused,link);assert(!viewer.dialog.open);
listeners.click(event(city));await flush();const delayed=probes.at(-1);viewer.close();listeners.click(event(national));delayed.resolve();await flush();assert.equal(image.src,nationalFlagImages[national.src].full,'A late original cannot replace another flag');
assert.equal(national.src,'vendor/flag-prc.svg','The original viewer does not replace the thumbnail');
assert(Math.abs(parseFloat(image.style.width)/parseFloat(image.style.height)-1.5)<1e-8,'A 4:3 thumbnail expands to the original 3:2 flag');
const escape={...event(viewer.dialog),key:'Escape'};listeners.keydown(escape);assert(!viewer.dialog.open&&escape.stopped);assert.equal(focused,national);
link.attrs.href='https://commons.wikimedia.org/another';mutations([{type:'attributes',target:link}]);assert(!link.hasAttribute('href'),'Adapter updates cannot restore external flag navigation');
const newFlag=new Element('img');newFlag.alt='Flag of a new country';newFlag.src='new.svg';body.append(newFlag);mutations([{type:'childList',addedNodes:[newFlag]}]);assert.equal(newFlag.attrs.role,'button','Future country flags share the viewer');
listeners.keydown({...event(newFlag),key:'Enter'});assert(viewer.dialog.open);assert.equal(viewer.dialog.dataset.keyboard,'true');
viewer.dialog.handlers.click({target:viewer.dialog,clientX:150,clientY:150});assert(viewer.dialog.open,'Clicking the thick frame leaves the flag open');
viewer.dialog.handlers.click({target:viewer.dialog,clientX:40,clientY:40});assert(!viewer.dialog.open,'Clicking outside closes the viewer');
listeners.click(event(city));await flush();probes.at(-1).reject(Error('offline'));await flush();assert.equal(image.src,city.src,'The cached official flag survives an unavailable original');viewer.close();
assert.equal(requests,1,'Repeated flag views reuse the source catalogue');
const catalogue=JSON.parse(fs.readFileSync('dist/data/flag-images.json'));
const nationalAssets=fs.readdirSync('dist/vendor').filter(name=>/^flag-.*\.(svg|webp)$/.test(name));
for(const name of nationalAssets){
 const src='vendor/'+name,record=nationalFlagImages[src];assert(record,'Every national thumbnail has an original: '+name);
 const bytes=fs.readFileSync('dist/'+record.full);assert.equal(createHash('sha256').update(bytes).digest('hex'),record.sha256,'National artwork is unmodified');
 assert.deepEqual(catalogue[src],record,'Catalogue generation preserves the original mapping');
 const flag=new Element('img');flag.alt='Flag of '+name;flag.src=src;flag.naturalWidth=40;flag.naturalHeight=30;body.append(flag);
 listeners.click(event(flag));assert.equal(image.src,record.full,'First frame uses the original, never the thumbnail');
 assert(Math.abs(parseFloat(image.style.width)/parseFloat(image.style.height)-record.width/record.height)<1e-8,'Original dimensions control the viewer');viewer.close();
}
assert.equal(requests,1,'National originals open without a catalogue request');
for(const country of ['brazil','argentina']){
 const flags=JSON.parse(fs.readFileSync('dist/data/'+country+'-flag-sources.json')).flags;
 for(const flag of Object.values(flags))assert(fs.readFileSync('dist/'+catalogue[flag.file].full).equals(fs.readFileSync(flag.originalFile)),'Local full-size flags preserve the exact source artwork');
}
for(const file of ['dist/gpu-loader.js','dist/index.html'])assert.match(fs.readFileSync(file,'utf8'),/flag-viewer/);
console.log('Shared flag viewer: dynamic national/local flags, no navigation, full-size originals, stale loads, offline fallback, keyboard/focus, backdrop dismissal and responsive proportions passed.');
