import {getSettings,setSettings,validateSettings,setSettingsSyncState} from './settings.mjs';
import {currentAccountId,requestAccountSettings} from './account.mjs';
import {createSettingsSync} from './settings-sync-core.mjs';
import {sessionKey} from './account-config.mjs';
const ownerKey='boundary-atlas-settings-owner-v1',guestKey='boundary-atlas-guest-settings-v1',cacheKey=id=>'boundary-atlas-account-settings-v1:'+id;
function read(key){try{return JSON.parse(localStorage.getItem(key));}catch{return null;}}
function write(key,value){try{if(value===null)localStorage.removeItem(key);else localStorage.setItem(key,JSON.stringify(value));}catch{}}
let applying=false;
const storedOwner=read(ownerKey),guest=validateSettings(read(guestKey)||(!storedOwner?getSettings():null));
if(!read(guestKey))write(guestKey,guest);
const sync=createSettingsSync({guest,readCache:id=>read(cacheKey(id)),writeCache:(id,value)=>write(cacheKey(id),value),writeGuest:value=>write(guestKey,value),owner:id=>write(ownerKey,id),status:setSettingsSyncState,
 apply:values=>{applying=true;try{setSettings(values,{source:'account'});}finally{applying=false;}},
 readRemote:id=>requestAccountSettings(id),writeRemote:(id,values)=>requestAccountSettings(id,values)
});
globalThis.addEventListener('atlas-settings-change',event=>{if(applying||event.detail?.source==='account'||event.detail?.source==='storage')return;sync.changed(getSettings());});
globalThis.addEventListener('atlas-account-change',event=>void sync.connect(event.detail.userId));
globalThis.addEventListener('online',()=>void sync.retry());
globalThis.addEventListener('focus',()=>void sync.retry());
document.addEventListener('visibilitychange',()=>{if(!document.hidden)void sync.retry();});
document.getElementById('settings-open').addEventListener('click',()=>void sync.retry());
if(currentAccountId())void sync.connect(currentAccountId());
else if(!read(sessionKey))void sync.connect(null);
