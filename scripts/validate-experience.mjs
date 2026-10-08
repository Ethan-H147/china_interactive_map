import assert from 'node:assert/strict';
import fs from 'node:fs';
import {validate,hashFor,fromHash,read,write} from '../dist/view-state.mjs';
import {labelLines,placeLabels} from '../dist/labels.mjs';
import {createZoomLock} from '../dist/zoom-lock.mjs';
const view={v:1,country:'korea',center:[129.1,35.2],zoom:9.5,selection:'KR-26',scope:'KR',mode:2,locked:true,language:'local',layers:{'k-label-layer':true,'satellite-opacity':'65','evil':true}};
for(const country of ['brazil','uruguay','argentina']){
 const preview={...view,country,center:[-57,-33],selection:null};
 assert.deepEqual(fromHash(hashFor(preview)),validate(preview),'South American views round-trip without Asian extent restrictions');
}
assert.deepEqual(fromHash(hashFor(view)),validate(view));
const cityView={...view,country:'argentina',center:[-60.65,-32.95],selection:'AR-CITY-03',scope:'cities'};
assert.deepEqual(fromHash(hashFor(cityView)),validate(cityView));assert.equal(validate(cityView).scope,'cities','Saved city views retain their boundary layer');
for(const bad of [{...view,center:[Infinity,35]},{...view,zoom:99},{...view,country:'unknown'},{...view,v:2}])assert.equal(validate(bad),null);
assert.equal(fromHash('#china/view='+encodeURIComponent(JSON.stringify(view))),null);
assert.equal(fromHash('#korea/view=%broken'),null);
assert.equal(validate(view).layers.evil,undefined);
const memory=new Map(),storage={getItem:k=>memory.get(k),setItem:(k,v)=>memory.set(k,v)};write(view,storage);assert.deepEqual(read('korea',storage),validate(view));assert.equal(read('china',storage),null);assert.doesNotThrow(()=>write(view,{setItem(){throw Error();}}));
assert.deepEqual(labelLines('Busan','부산','en'),['Busan']);assert.deepEqual(labelLines('Busan','부산','local'),['부산']);assert.deepEqual(labelLines('Busan','부산','both'),['Busan','부산']);
const overlapping=[{id:'a',x:200,y:150,w:100,h:40},{id:'b',x:210,y:150,w:100,h:40,selected:true},{id:'c',x:400,y:150,w:100,h:40},{id:'edge',x:5,y:150,w:100,h:40}];
assert.deepEqual(placeLabels(overlapping,600,400).map(p=>p.id),['b','c']);
const source=fs.readFileSync('dist/app.js','utf8');assert(source.includes("if(initialCountry==='china')await loadChina()"));assert(!source.includes('koreaAtlas.warm()'));assert(!source.includes('enabledInteractions.forEach(name=>map[name].disable())'));
console.log('View links, bounded state, country isolation, blocked storage, label languages, collision priority and country-first loading passed.');
import vm from 'node:vm';
let releasePreview,beginCalls=0,unlocks=0;const moves=[],events=new Map();
const fakeMap={stop(){events.get('moveend')?.();},getCanvas:()=>({addEventListener(){}}),cameraForBounds:b=>({center:b,zoom:6}),project:c=>({x:c[0],y:c[1]}),getContainer:()=>({clientWidth:800,clientHeight:600}),getZoom:()=>6,once:(name,fn)=>events.set(name,fn),off:(name,fn)=>{if(events.get(name)===fn)events.delete(name);},flyTo:options=>moves.push({kind:'fly',...options}),easeTo:options=>moves.push({kind:'ease',...options})};
const nav=vm.createContext({map:fakeMap,zoomLock:null,updateLabels(){},motionRenderer:{begin(){beginCalls++;return new Promise(resolve=>releasePreview=resolve);},end:async()=>{}},navigationOptions:()=>({}),reducedMotion:{matches:false},atlasStarting:false,restoringView:false,lockCamera(){},unlockCamera(){unlocks++;},saveViewSoon(){},setTimeout:()=>1,clearTimeout(){},console});
vm.runInContext('let finishNavigation;'+source.slice(source.indexOf('let navigationEpoch='),source.indexOf('function fitHome(')),nav);
const first=nav.navigateBounds([410,310]);const second=nav.navigateBounds([1600,300]);releasePreview();
assert.equal(await first,false,'A superseded selection is cancelled');await Promise.resolve();await Promise.resolve();assert.equal(beginCalls,1,'Rapid selections share preview preparation');assert.equal(moves.length,1);assert.equal(moves[0].kind,'fly');events.get('moveend')();assert.equal(await second,true);await Promise.resolve();
const third=nav.navigateBounds([420,300]);releasePreview();await new Promise(setImmediate);assert.equal(moves.at(-1).kind,'ease');assert(moves.at(-1).duration<460);events.get('moveend')();await third;assert(unlocks>=1);
console.log('Camera cancellation, shared preparation, latest-selection priority, nearby easing and distant flights passed.');
const zoomButton={setAttribute(){}};nav.zoomLock=createZoomLock(zoomButton,{getStorage:()=>null,onLock:()=>nav.cancelNavigation()});
const movingSelection=nav.navigateBounds([1500,300]);releasePreview();await new Promise(setImmediate);const movesBeforeLock=moves.length,previewsBeforeLock=beginCalls;
zoomButton.onclick();assert.equal(await movingSelection,false,'Locking interrupts an in-progress automatic flight');
assert.equal(await nav.navigateBounds([100,100]),true);assert.equal(await nav.navigateBounds([1800,100]),true);assert.equal(moves.length,movesBeforeLock,'Selection cannot pan or zoom when locked');assert.equal(beginCalls,previewsBeforeLock,'Locked clicks do not spend time preparing motion previews');
const manual=nav.navigateBounds([410,300],{manual:true});releasePreview();await new Promise(setImmediate);assert.equal(moves.length,movesBeforeLock+1,'Manual zoom remains available while locked');events.get('moveend')();await manual;
zoomButton.onclick();const unlockedSelection=nav.navigateBounds([410,300]);releasePreview();await new Promise(setImmediate);assert.equal(moves.length,movesBeforeLock+2,'Unlocking restores automatic navigation');events.get('moveend')();await unlockedSelection;
console.log('Locked selection leaves the camera unchanged, skips preview work, cancels an active flight, permits manual zoom and resumes automatic navigation on unlock.');
const parentCalls=[];
const parentView=vm.createContext({allReady:true,quiz:{active:false},atlasMode:'indonesia',selected:null,currentAtlas:()=>({viewParent:camera=>parentCalls.push(camera)}),reset:camera=>parentCalls.push(camera),fitQuizScope:(animate,camera)=>parentCalls.push(camera),regionByCode:new Map(),provinceLayers:new Map(),selectRegion:(region,code,fit,camera)=>parentCalls.push(camera)});
vm.runInContext(source.slice(source.indexOf('function viewParent(){'),source.indexOf("$('zoom-in').onclick=")),parentView);
for(const country of ['korea','mongolia','japan','philippines','indonesia','brazil','uruguay','argentina']){parentView.atlasMode=country;parentView.viewParent();assert.equal(parentCalls.at(-1).manual,true,country+' parent button requests manual navigation');}
parentView.atlasMode='china';parentView.viewParent();assert.equal(parentCalls.at(-1).manual,true,'China overview button remains manual');
parentView.selected={layer:{feature:{properties:{level:'province'}}}};parentView.viewParent();assert.equal(parentCalls.at(-1).manual,true);
const parentRegion={feature:{properties:{adcode:310000}}};parentView.selected={layer:{feature:{properties:{level:'district',provinceCode:310000}}}};parentView.provinceLayers.set(310000,parentRegion);parentView.viewParent();assert.equal(parentCalls.at(-1).manual,true,'China parent selection carries manual navigation');
parentView.quiz.active=true;parentView.viewParent();assert.equal(parentCalls.at(-1).manual,true,'Quiz scope button is manual as well');
console.log('The bottom parent/overview control requests explicit navigation in all nine countries and quizzes, without changing the zoom-lock setting.');

