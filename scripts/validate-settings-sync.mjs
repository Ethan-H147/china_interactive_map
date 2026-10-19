import assert from 'node:assert/strict';
import {defaults} from '../dist/settings.mjs';
import {createSettingsSync,encodeAccountSettings,decodeAccountSettings} from '../dist/settings-sync-core.mjs';
const clone=value=>structuredClone(value),cloud=new Map(),caches=new Map();let offline=false,hold=null,writes=0;
function device(guest={...defaults}){
 const state={local:clone(guest),guest:clone(guest),status:'guest',owner:null};
 const sync=createSettingsSync({guest,apply:value=>{state.local=clone(value);},status:value=>{state.status=value;},owner:id=>{state.owner=id;},writeGuest:value=>{state.guest=clone(value);},readCache:id=>clone(caches.get(id)),writeCache:(id,value)=>caches.set(id,clone(value)),readRemote:async id=>{if(offline)throw Error('Offline');return clone(cloud.get(id)||{});},writeRemote:async(id,data)=>{writes++;if(offline)throw Error('Offline');if(hold)await hold;cloud.set(id,{...cloud.get(id),...data});return clone(cloud.get(id));}});
 return {state,sync,edit:patch=>{state.local={...state.local,...patch};sync.changed(state.local);}};
}
cloud.set('A',{display_name:'Atlas A',...encodeAccountSettings({...defaults,placeHeadingSize:44,projection:'globe'})});
const a=device({...defaults,countryLanguage:'local'});await a.sync.connect('A');assert.equal(a.state.local.placeHeadingSize,44);assert.equal(a.state.local.projection,'globe');assert.equal(writes,0,'Existing cloud settings are not overwritten on sign-in');
a.edit({placeNames:false});await a.sync.flush();assert.equal(decodeAccountSettings(cloud.get('A')).placeNames,false);assert.equal(cloud.get('A').display_name,'Atlas A','Preference writes preserve the account name');
const b=device();await b.sync.connect('A');assert.equal(b.state.local.placeNames,false,'A different device loads saved settings');assert.equal(b.state.status,'synced');
await a.sync.connect(null);assert.equal(a.state.local.countryLanguage,'local','Signing out restores guest preferences');assert.equal(a.state.local.placeNames,true);
await a.sync.connect('new');assert.equal(decodeAccountSettings(cloud.get('new')).countryLanguage,'local','A first sign-in adopts guest settings');
await a.sync.connect('A');offline=true;a.edit({placeHeadingSize:47,countryNames:false});await a.sync.flush();assert.equal(a.state.status,'offline');assert.equal(caches.get('A').pending.placeHeadingSize,47);a.sync.disconnect();
const resumed=device();await resumed.sync.connect('A');assert.equal(resumed.state.local.placeHeadingSize,47,'Offline queue survives reload');offline=false;await resumed.sync.retry();assert.equal(decodeAccountSettings(cloud.get('A')).placeHeadingSize,47);assert.deepEqual(caches.get('A').pending,{});
let release;hold=new Promise(resolve=>{release=resolve;});resumed.edit({motion:'reduce'});const inFlight=resumed.sync.flush();await new Promise(resolve=>setTimeout(resolve,0));resumed.edit({motion:'system',labelSize:'large'});release();hold=null;await inFlight;assert.equal(resumed.state.local.motion,'system','Old acknowledgement cannot replace a newer edit');await resumed.sync.flush();assert.equal(decodeAccountSettings(cloud.get('A')).labelSize,'large');
// Independent preference keys are merged by Supabase, without a read/replace
// of the entire settings object that could erase another device's changes.
b.edit({legacyStyling:true});await b.sync.flush();assert.equal(decodeAccountSettings(cloud.get('A')).labelSize,'large');assert.equal(decodeAccountSettings(cloud.get('A')).legacyStyling,true);
cloud.set('B',{display_name:'Atlas B',...encodeAccountSettings({...defaults,countryLanguage:'en'})});hold=new Promise(resolve=>{release=resolve;});resumed.edit({placeHeadingSize:24});const oldSave=resumed.sync.flush();await new Promise(resolve=>setTimeout(resolve,0));await resumed.sync.connect('B');release();hold=null;await oldSave;assert.equal(resumed.state.local.placeHeadingSize,36,'Late responses from A do not change B');assert.equal(decodeAccountSettings(cloud.get('B')).placeHeadingSize,36);assert.equal(resumed.state.local.countryLanguage,'en');
assert.equal(decodeAccountSettings({atlas_setting_placeHeadingSize:900,atlas_setting_motion:'bad'}).placeHeadingSize,48);assert.equal(decodeAccountSettings({atlas_setting_motion:'bad'}).motion,'system');
for(const d of [a,b,resumed])d.sync.disconnect();console.log('Account settings: remote restore, first sign-in, guest/account isolation, offline reload/retry, in-flight edits, disjoint device updates and metadata validation passed.');
