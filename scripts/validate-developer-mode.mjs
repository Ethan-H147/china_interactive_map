import fs from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';
const source=fs.readFileSync('dist/developer-mode.js','utf8');
let eligible=false,now=1000;
const events={},stored=new Map(),nodes=[];
function node(){const children=new Map();return{dataset:{},hidden:false,open:false,setAttribute(){},append(){},focus(){this.focused=true;},showModal(){this.open=true;},close(){this.open=false;},querySelector(id){if(!children.has(id))children.set(id,node());return children.get(id);}};}
const root=node();const context={window:{addEventListener:(name,fn)=>events[name]=fn,dispatchEvent(){}},document:{documentElement:root,body:node(),querySelector:()=>node(),createElement(){const e=node();nodes.push(e);return e;}},sessionStorage:{getItem:k=>stored.get(k),setItem:(k,v)=>stored.set(k,v)},Date:{now:()=>now},CustomEvent:class{constructor(name,options){this.name=name;this.detail=options.detail;}}};
vm.runInNewContext(source,context);const dev=context.window.AtlasDev;
assert(!dev.enabled);assert(dev.allows('malaysia'));assert(dev.allows('singapore'));assert(dev.allows('argentina'),'Argentina is public without the Easter egg');assert(dev.allows('brazil')&&dev.allows('uruguay'),'Brazil and Uruguay are public without developer mode');assert(dev.allows('japan'));
for(const country of ['south-africa','eswatini','lesotho'])assert(!dev.allows(country),'New southern African countries start in developer mode');
dev.mount({eligible:()=>eligible});const dialog=nodes[0],exit=nodes[1];
function type(text,{editing=false,repeat=false,ctrl=false}={}){for(const key of text){now+=30;events.keydown({key,repeat,ctrlKey:ctrl,target:{closest:()=>editing?{}:null},preventDefault(){}});}}
type('dev mode');assert(!dialog.open,'Other districts cannot activate the Easter egg');
eligible=true;type('dev mode',{editing:true});assert(!dialog.open,'Search boxes keep ordinary text input');
type('dev mode',{ctrl:true});assert(!dialog.open,'Shortcuts do not count');
type('dev mo');eligible=false;type('d');eligible=true;type('e');assert(!dialog.open,'Leaving Changning clears partial input');
type('dev ');now+=6000;type('mode');assert(!dialog.open,'Old partial phrases expire');
type('dev mode');assert(dialog.open);assert(!dev.enabled,'Typing alone does not enable developer mode');
dialog.querySelector('[data-cancel]').onclick();assert(!dialog.open);assert(!dev.enabled);
type('dev mode');dialog.querySelector('.developer-continue').onclick();assert(dev.enabled);assert(dev.allows('malaysia'));assert(dev.allows('singapore'));assert(dev.allows('brazil'));assert(!exit.hidden);assert.equal(root.dataset.developer,'true');assert.equal(stored.get('boundary-atlas-developer-v1'),'true');
for(const country of ['south-africa','eswatini','lesotho'])assert(dev.allows(country),'Developer mode enables the new countries');
exit.onclick();assert(!dev.enabled);assert(exit.hidden);assert(!root.dataset.developer);assert(dev.allows('uruguay')&&dev.allows('brazil'),'Both countries remain public after developer mode exits');assert(dev.allows('argentina'),'Exiting developer mode keeps Argentina available');
for(const country of ['south-africa','eswatini','lesotho'])assert(!dev.allows(country),'Exiting hides the development countries');
assert(dev.allows('malaysia')&&dev.allows('singapore'),'Public maps remain available after developer mode exits');
type('dev mode');eligible=false;dialog.querySelector('.developer-continue').onclick();assert(!dev.enabled,'Selection must still qualify when Continue is clicked');
console.log('Changning-only phrase, editing exclusion, expiry, confirmation, cancellation and tab-scoped exit passed.');
