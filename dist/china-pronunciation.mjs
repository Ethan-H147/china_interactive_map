import {createPlacePronunciation} from './place-pronunciation.mjs';
export {stopPlacePronunciation} from './place-pronunciation.mjs';
let controller;
export function mountChinaPronunciation(){
 controller=createPlacePronunciation({country:'china',id:'china-pronunciation',heading:document.getElementById('selection-name'),local:document.getElementById('selection-chinese'),button:document.getElementById('china-pronunciation'),status:document.getElementById('china-pronunciation-status')});
}
export function clearChinaPronunciation(){controller?.clear();}
export function setChinaPronunciation(place){
 if(['province','city','taiwan-region'].includes(place.level))controller?.set(place.adcode);else controller?.clear();
}
