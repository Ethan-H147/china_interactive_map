import assert from 'node:assert/strict';
import {render} from '../dist/labels.mjs';
class Element{constructor(){this.dataset={};this.classList={toggle(){}};}append(){}getContext(){return{measureText:text=>({width:text.length*6})};}}
globalThis.document={createElement:()=>new Element()};
globalThis.window={maplibregl:{Marker:class{constructor({element}){this.element=element;}setLngLat(){return this;}addTo(){return this;}}}};
const map={getProjection:()=>({type:'mercator'}),getContainer:()=>({clientWidth:1200,clientHeight:1000}),project:([x,y])=>({x,y})};
const hidden=Array.from({length:150},(_,i)=>({id:'a'+i,en:'Hidden',center:[-1000,-1000]})),visible={id:'z',en:'Visible',center:[500,500]};
assert.deepEqual(render(map,[...hidden,visible]).map(m=>m.element.dataset.atlasPlace),['z'],'Offscreen labels cannot consume the visible label budget');
const many=Array.from({length:121},(_,i)=>({id:String(i),en:'X',center:[80+i%11*80,100+Math.floor(i/11)*60]}));assert.equal(render(map,many).length,100,'Every adapter shares the same visible-candidate budget');
console.log('Shared label budget: offscreen candidates cannot hide visible names; 100 visible candidates for every adapter.');
